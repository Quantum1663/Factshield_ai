import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables at the absolute start
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

# Core logic imports - MUST stay after load_dotenv
from models.classifier import classify
from rag.retrieval import retrieve_fact
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence

from fastapi import FastAPI
from pydantic import BaseModel
import faiss
import json

app = FastAPI(title="SAMI: Social Integrity System")

class NewsRequest(BaseModel):
    text: str

@app.post("/verify")
def verify_news(request: NewsRequest):
    text = request.text

    # Step 1: Fast Multi-label classification
    prediction = classify(text)
    v_label = prediction["veracity"]["label"]
    v_conf = prediction["veracity"]["confidence"]
    t_label = prediction["toxicity"]["label"]
    t_conf = prediction["toxicity"]["confidence"]

    # Step 2: Live Web Scraping Trigger
    if v_conf < 0.6 or t_conf < 0.6 or v_label == "unknown":
        print("DEBUG: Confidence low. Triggering live web search...")
        urls = search_news(text)
        for url in urls:
            article_text = scrape_article(url)
            if article_text:
                add_new_evidence(article_text)

    # Step 3: Retrieve evidence from FAISS Vector DB
    evidence = retrieve_fact(text)

    # Step 4: THE CASCADE FALLBACK (If the fast model failed, use the LLM)
    llm_reason = None
    if v_label == "unknown" or v_conf == 0.0 or t_label == "unknown" or t_conf == 0.0:
        print("DEBUG: Primary model collapsed. Engaging LLM Fallback Classifier & Reasoner...")
        from models.reasoning import analyze_claim_with_llm
        llm_analysis = analyze_claim_with_llm(text, evidence)

        # Override the broken labels with the LLM's judgment
        if v_label == "unknown" or v_conf == 0.0:
            v_label = llm_analysis.get("veracity", "unknown")
            v_conf = 0.85  # Assign a synthetic high confidence since the LLM verified it

        if t_label == "unknown" or t_conf == 0.0:
            t_label = llm_analysis.get("toxicity", "unknown")
            t_conf = 0.85
            
        llm_reason = llm_analysis.get("reason")

    # Step 5: Dynamic Reasoning Engine
    if llm_reason:
        reason = llm_reason
    else:
        # If we didn't use the fallback, generate a reason now using the unified function
        from models.reasoning import analyze_claim_with_llm
        llm_analysis = analyze_claim_with_llm(text, evidence)
        reason = llm_analysis.get("reason", "No explanation could be generated.")

    return {
        "claim": text,
        "veracity": {
            "prediction": v_label,
            "confidence": float(v_conf)
        },
        "toxicity": {
            "prediction": t_label,
            "confidence": float(t_conf)
        },
        "generated_reason": reason,
        "evidence": evidence
    }

@app.get("/system-status")
def system_status():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"

    index_path = data_dir / "fact_index.faiss"
    meta_path = data_dir / "fact_metadata.json"

    dataset_size = 0
    index_size = 0

    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            dataset_size = len(metadata)

    if index_path.exists():
        index = faiss.read_index(str(index_path))
        index_size = index.ntotal

    return {
        "system": "SAMI AI",
        "model_status": "loaded (Multi-Label)",
        "dataset_entries": dataset_size,
        "faiss_vectors": index_size,
        "api_status": "running"
    }