import logging
import os
from pathlib import Path
from utils.cache_manager import result_cache
from utils.db_manager import save_task
from models.classifier import classify
from models.interpretability import explain_prediction
from rag.retrieval import retrieve_fact
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence
from utils.claim_graph import build_claim_graph

logger = logging.getLogger(__name__)

def resolve_label_and_confidence(base_prediction: dict, analysis_label):
    base_label = base_prediction["label"]
    resolved_label = analysis_label or base_label
    resolved_confidence = float(base_prediction["confidence"]) if resolved_label == base_label else None
    return resolved_label, resolved_confidence

def build_fallback_analysis(prediction: dict, evidence: list[str], analysis: dict) -> dict:
    veracity_label = prediction["veracity"]["label"]
    confidence = float(prediction["veracity"]["confidence"])
    fallback_message = analysis.get(
        "propaganda_anatomy") or "Reasoning provider unavailable. Returned local classifier and retrieval results only."

    if veracity_label == "real":
        verdict = "Supports"
    elif veracity_label in {"fake", "misleading"} and evidence:
        verdict = "Refutes"
    else:
        verdict = "Neutral"

    return {
        "llm_status": analysis.get("llm_status", "error"),
        "verdict": verdict,
        "veracity": veracity_label,
        "toxicity": prediction["toxicity"]["label"],
        "propaganda_anatomy": fallback_message,
        "detected_fallacies": [],
        "evidence_citations": [],
        "graph_relations": [],
        "reason": f"[FALLBACK] Local classifier result ({veracity_label}, {confidence:.0%} confidence). Retrieved {len(evidence)} evidence items while the reasoning provider was unavailable.",
        "historical_context": None,
        "debate_trace": {
            "bias_analyst": "",
            "prosecutor": "",
            "defense": "",
            "judge": fallback_message,
        },
    }

def process_full_verification(text, vlm_context=None, c2pa_data=None):
    logger.info(f"Step 1: Classifying text...")
    prediction = classify(text)

    logger.info(f"Step 2: Search check...")
    if prediction["veracity"]["confidence"] < 0.6 or prediction["veracity"]["label"] == "unknown":
        logger.info(f"Low confidence, triggering live search...")
        urls = search_news(text)
        for url in urls:
            art = scrape_article(url)
            if art:
                logger.info(f"Adding new evidence from {url}")
                add_new_evidence(art)

    logger.info(f"Step 3: RAG Retrieval...")
    evidence = retrieve_fact(text)

    logger.info(f"Step 4: LLM Analysis...")
    from models.reasoning import analyze_claim_with_llm
    analysis = analyze_claim_with_llm(text, evidence, vlm_context=vlm_context, c2pa_data=c2pa_data)
    if analysis.get("llm_status") != "ok":
        logger.warning("LLM reasoning unavailable; using classifier/RAG fallback response.")
        analysis = build_fallback_analysis(prediction, evidence, analysis)

    veracity_label, veracity_confidence = resolve_label_and_confidence(
        prediction["veracity"], analysis.get("veracity")
    )
    toxicity_label, toxicity_confidence = resolve_label_and_confidence(
        prediction["toxicity"], analysis.get("toxicity")
    )

    logger.info(f"Step 5: XAI Generation...")
    try:
        xai_attributions = explain_prediction(text, target_label=veracity_label)
    except Exception as e:
        logger.error(f"XAI Calculation Failed: {e}")
        xai_attributions = []

    knowledge_graph = build_claim_graph(
        text,
        evidence,
        evidence_citations=analysis.get("evidence_citations", []),
        graph_relations=analysis.get("graph_relations", []),
    )

    if vlm_context:
        summary_lines = [
            line.strip(" -*#\"'")
            for line in vlm_context.splitlines()
            if line.strip()
        ]
        display_claim = summary_lines[0] if summary_lines else text
    else:
        display_claim = text

    return {
        "claim": display_claim,
        "verdict": analysis.get("verdict", "Neutral"),
        "veracity": {
            "prediction": veracity_label,
            "confidence": veracity_confidence
        },
        "toxicity": {
            "prediction": toxicity_label,
            "confidence": toxicity_confidence
        },
        "propaganda_anatomy": analysis.get("propaganda_anatomy", "No manipulation anatomy detected."),
        "detected_fallacies": analysis.get("detected_fallacies", []),
        "c2pa_verification": c2pa_data if c2pa_data else {"is_verified": False, "details": "No C2PA checked or found."},
        "provenance_signals": {
            "has_visual_context": bool(vlm_context),
            "visual_context_excerpt": vlm_context if vlm_context else None,
            "source_mode": "multimodal" if vlm_context else "text",
            "evidence_count": len(evidence),
            "c2pa_available": bool(c2pa_data),
            "trusted_origin": bool(c2pa_data and c2pa_data.get("is_verified")),
        },
        "debate_trace": analysis.get("debate_trace", {
            "bias_analyst": "",
            "prosecutor": "",
            "defense": "",
            "judge": analysis.get("reason"),
        }),
        "evidence_citations": analysis.get("evidence_citations", []),
        "graph_relations": analysis.get("graph_relations", []),
        "generated_reason": analysis.get("reason"),
        "historical_context": analysis.get("historical_context"),
        "evidence": evidence,
        "knowledge_graph": knowledge_graph,
        "xai_attributions": xai_attributions,
        "xai_target_label": veracity_label
    }

def run_verification_task(task_id: str, text: str, vlm_context: str = None, c2pa_data: dict = None):
    """Background worker to run the heavy ML pipeline with caching."""
    logger.info(f"--- STARTING TASK {task_id} ---")
    try:
        if not vlm_context and not c2pa_data:
            cached = result_cache.get(text)
            if cached:
                save_task(task_id, "completed", result=cached)
                logger.info(f"--- TASK {task_id} served from cache ---")
                return

        save_task(task_id, "processing")
        data = process_full_verification(text, vlm_context, c2pa_data)
        if not vlm_context and not c2pa_data:
            result_cache.put(text, data)
        save_task(task_id, "completed", result=data)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logger.error(f"!!! ERROR in background task {task_id} !!!\n{error_msg}")
        save_task(task_id, "failed", error=str(e))
    logger.info(f"--- FINISHED TASK {task_id} ---")
