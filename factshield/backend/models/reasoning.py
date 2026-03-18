import os
import json
from groq import Groq

# Ensure GROQ_API_KEY is loaded in environment
client = Groq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key_to_prevent_crash_if_not_set"))

def analyze_claim_with_llm(claim, evidence_list):
    """
    Unified function to perform NLI, fallback classification, and reasoning generation
    using Llama 3 (via Groq API).
    """
    context = "\n".join(evidence_list[:3]) if evidence_list else "No external evidence available."
    
    prompt = f"""
You are an expert fact-checker and content moderator. Analyze the following claim against the provided evidence.

Context Evidence:
{context}

Claim to Analyze:
"{claim}"

Perform the following tasks:
1. Determine if the evidence Supports, Refutes, or is Neutral to the claim (NLI Verdict).
2. Classify the veracity of the claim as 'real', 'fake', or 'misleading'. If no evidence exists and it's not common knowledge, classify as 'unknown'.
3. Classify the toxicity of the claim as 'hate' or 'safe'.
4. Write a concise, one-sentence explanation for your classification based on the NLI verdict and the evidence.

Respond ONLY with a valid JSON object matching this schema:
{{
  "verdict": "Supports" | "Refutes" | "Neutral",
  "veracity": "real" | "fake" | "misleading" | "unknown",
  "toxicity": "hate" | "safe",
  "reason": "One sentence explanation..."
}}
"""
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
            response_format={"type": "json_object"}
        )
        
        output = completion.choices[0].message.content
        res = json.loads(output)
        
        # Format the reason to include the NLI verdict for better social impact and explainability
        nli_verdict = res.get("verdict", "Neutral")
        base_reason = res.get("reason", "Could not generate an explanation.")
        final_reason = f"[{nli_verdict.upper()}] {base_reason}"
        
        res["reason"] = final_reason
        return res

    except Exception as e:
        print(f"DEBUG: Llama API Error - {e}")
        return {
            "verdict": "Neutral",
            "veracity": "unknown",
            "toxicity": "unknown",
            "reason": "[ERROR] Failed to analyze claim via Llama API."
        }

# Keep legacy stubs to avoid breaking imports elsewhere temporarily, though app.py will be updated
def fallback_classify(claim, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("veracity", "unknown"), res.get("toxicity", "unknown")

def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("reason", "No reason generated.")