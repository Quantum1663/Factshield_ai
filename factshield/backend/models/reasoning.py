import os
import re
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)


def get_groq_client():
    """Build a fresh client so reloads or closed transports do not poison later requests."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    return Groq(api_key=api_key)


def _sanitize_for_prompt(text):
    """Strip control characters and common prompt injection patterns from user input."""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    injection_patterns = [
        r'(?i)ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)',
        r'(?i)you\s+are\s+now\s+',
        r'(?i)system\s*:\s*',
        r'(?i)forget\s+(everything|all)',
    ]
    for pattern in injection_patterns:
        text = re.sub(pattern, '[FILTERED]', text)
    return text.strip()


def analyze_claim_with_llm(claim, evidence_list, vlm_context=None, c2pa_data=None):
    """
    Multi-Agent Consensus Engine: Bias Analyst -> Prosecutor vs Defense -> Judge.
    Uses sequential reasoning to deconstruct complex propaganda with a focus on logical fallacies.
    """
    safe_claim = _sanitize_for_prompt(claim)
    safe_evidence = [_sanitize_for_prompt(str(e)) for e in (evidence_list[:3] if evidence_list else [])]
    
    # Construct enhanced context including VLM and C2PA data
    context_parts = []
    if c2pa_data:
        context_parts.append(f"[C2PA Provenance Data]: {json.dumps(c2pa_data)}")
    if vlm_context:
        context_parts.append(f"[Visual Context Analysis]: {vlm_context}")
    if safe_evidence:
        context_parts.append("[Textual Evidence]:\n" + "\n".join(safe_evidence))
        
    context = "\n\n".join(context_parts) if context_parts else "No external evidence or context available."
    model_name = "llama-3.3-70b-versatile"

    try:
        client = get_groq_client()

        # --- AGENT 1: THE BIAS ANALYST ---
        bias_prompt = f"""
        You are 'The Bias Analyst', an expert in cognitive biases, logical fallacies, and psychological manipulation.
        Your goal: Analyze the claim and context to identify any manipulative tactics (e.g., Strawman, Ad Hominem, Fear Mongering, False Dilemma).
        
        Context Evidence: {context}
        Claim to Analyze: "{safe_claim}"
        
        Provide a concise report listing any detected fallacies and how they are used in the claim. If none, state 'None detected'.
        """
        b_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": bias_prompt}],
            temperature=0.2,
            max_tokens=300
        )
        bias_report = b_res.choices[0].message.content

        # --- AGENT 2: THE PROSECUTOR ---
        prosecutor_prompt = f"""
        You are 'The Prosecutor', an expert in debunking misinformation and identifying information warfare.
        Your goal: Build a strong case for why the claim below is FALSE, MISLEADING, or MALICIOUS PROPAGANDA.
        Use the provided evidence and the Bias Analyst's report to support your argument.

        Context Evidence: {context}
        Bias Analyst Report: {bias_report}
        Claim to Analyze: "{safe_claim}"
        
        Provide a sharp, evidence-based argument debunking the claim.
        """

        p_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prosecutor_prompt}],
            temperature=0.2,
            max_tokens=400
        )
        prosecutor_argument = p_res.choices[0].message.content

        # --- AGENT 3: THE DEFENSE ---
        defense_prompt = f"""
        You are 'The Defense', an expert in identifying nuance, satire, and missing context.
        You have read the Prosecutor's case and the Bias Analyst's report. 
        Your goal: Argue why the claim might be TRUE, SATIRICAL, or why the Prosecutor's interpretation is UNFAIR or MISSING CONTEXT.
        
        Prosecutor's Argument: {prosecutor_argument}
        Bias Analyst Report: {bias_report}
        Context Evidence: {context}
        Claim to Analyze: "{safe_claim}"
        
        Provide a nuanced counter-argument.
        """

        d_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": defense_prompt}],
            temperature=0.2,
            max_tokens=400
        )
        defense_argument = d_res.choices[0].message.content

        # --- AGENT 4: THE JUDGE ---
        judge_prompt = f"""
        You are 'The Judge', an impartial arbiter of tactical integrity and truth. 
        You have reviewed the evidence, the Bias Analyst's report, the Prosecutor's case, and the Defense's case.
        Your goal: Weigh all sides and provide the final definitive consensus verdict.

        Context Evidence: {context}
        Claim: "{safe_claim}"
        Bias Analyst Report: {bias_report}
        Prosecutor's Case: {prosecutor_argument}
        Defense's Case: {defense_argument}

        Perform the following tasks:
        1. NLI Verdict: Supports, Refutes, or Neutral.
        2. Classification: Veracity ('real', 'fake', 'misleading') and Toxicity ('hate', 'safe').
        3. Propaganda Anatomy: A detailed paragraph explicitly explaining how specific words in the claim execute manipulation tactics.
        4. Detected Fallacies: Extract a list of the main logical fallacies identified (e.g., ["Strawman", "Appeal to Emotion"]).
        5. Evidence Citations: Select up to 3 strongest evidence items by index from the textual evidence list and label each as supports, refutes, or mentions with a confidence from 0.0 to 1.0.
        6. Graph Relations: List up to 6 graph hints using ONLY these exact formats:
           - "Claim supports Evidence[0]"
           - "Claim refutes Evidence[1]"
           - "Claim mentions Evidence[2]"
           - "Entity: Amit Shah supports Evidence[0]"
           - "Entity: Amit Shah refutes Evidence[1]"
           - "Entity: Amit Shah mentions Evidence[2]"
           Do not mention prosecutors, judges, arguments, or any source other than Claim / Entity and Evidence[index].
        7. Explanation: Provide a concise, one-sentence explanation for the final verdict.

        Respond ONLY with a valid JSON object matching this schema:
        {{
          "verdict": "Supports" | "Refutes" | "Neutral",
          "veracity": "real" | "fake" | "misleading" | "unknown",
          "toxicity": "hate" | "safe",
          "propaganda_anatomy": "Detailed paragraph analyzing the claim's tactical structure...",
          "detected_fallacies": ["Fallacy1", "Fallacy2"],
          "evidence_citations": [
            {{"index": 0, "relation": "supports" | "refutes" | "mentions", "confidence": 0.0}}
          ],
          "graph_relations": ["Claim refutes Evidence[1]"],
          "reason": "One sentence final decision...",
          "historical_context": "10-word fact contrast if historical, else null"
        }}
        """

        j_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": judge_prompt}],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        output = j_res.choices[0].message.content
        res = json.loads(output)

        nli = res.get("verdict", "Neutral")
        res["reason"] = f"[{nli.upper()}] {res.get('reason')}"
        if "detected_fallacies" not in res:
            res["detected_fallacies"] = []
        if "evidence_citations" not in res:
            res["evidence_citations"] = []
        if "graph_relations" not in res:
            res["graph_relations"] = []
        res["debate_trace"] = {
            "bias_analyst": bias_report,
            "prosecutor": prosecutor_argument,
            "defense": defense_argument,
            "judge": res.get("reason", ""),
        }
        res["context_summary"] = {
            "has_visual_context": bool(vlm_context),
            "has_c2pa_data": bool(c2pa_data),
            "evidence_count": len(safe_evidence),
        }

        return res

    except Exception as e:
        logger.error(f"Multi-Agent Consensus Error: {e}")
        return {
            "verdict": "Neutral",
            "veracity": "unknown",
            "toxicity": "unknown",
            "propaganda_anatomy": "Error: Consensus pipeline failed to reach a verdict.",
            "detected_fallacies": [],
            "evidence_citations": [],
            "graph_relations": [],
            "reason": "[ERROR] Pipeline Failure.",
            "historical_context": None,
            "debate_trace": {
                "bias_analyst": "",
                "prosecutor": "",
                "defense": "",
                "judge": "[ERROR] Pipeline Failure.",
            },
            "context_summary": {
                "has_visual_context": bool(vlm_context),
                "has_c2pa_data": bool(c2pa_data),
                "evidence_count": len(safe_evidence),
            }
        }


# Legacy stubs for compatibility
def fallback_classify(claim, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("veracity", "unknown"), res.get("toxicity", "unknown")


def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("reason", "No reason generated.")
