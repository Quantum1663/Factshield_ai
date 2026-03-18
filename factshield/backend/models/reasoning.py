import os
import json
from groq import Groq

# Ensure GROQ_API_KEY is loaded in environment
client = Groq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key_to_prevent_crash_if_not_set"))

def analyze_claim_with_llm(claim, evidence_list):
    """
    V3: Advanced Propaganda Deconstruction Engine.
    Detects NLI verdicts, veracity, toxicity, and logical fallacies.
    """
    context = "\n".join(evidence_list[:3]) if evidence_list else "No external evidence available."
    
    prompt = f"""
You are an expert in information warfare and propaganda deconstruction. 
Analyze the following claim against the provided evidence, specifically looking for manipulation tactics used in the Indian social media landscape.

Context Evidence:
{context}

Claim to Analyze:
"{claim}"

Perform the following tasks:
1. NLI Verdict: Determine if the evidence Supports, Refutes, or is Neutral to the claim.
2. Classification: Veracity ('real', 'fake', 'misleading') and Toxicity ('hate', 'safe').
3. Propaganda Anatomy: Identify if any manipulation tactics (e.g., Whataboutism, Fear Mongering, Selective Context, Appeal to Emotion, Ad Hominem) are present. For the propaganda_anatomy field, you MUST provide a detailed, 2 to 3 sentence paragraph. Do not just list the names of the logical fallacies or emotional manipulations; you must explicitly explain how the specific words in the user's claim execute these manipulations.
4. Explanation: Provide a concise, one-sentence explanation for the verdict.

Respond ONLY with a valid JSON object matching this schema:
{{
  "verdict": "Supports" | "Refutes" | "Neutral",
  "veracity": "real" | "fake" | "misleading" | "unknown",
  "toxicity": "hate" | "safe",
  "propaganda_anatomy": "A detailed 2 to 3 sentence paragraph explaining manipulation tactics and specific execution via the claim's wording.",
  "reason": "One sentence explanation...",
  "historical_context": "If this is a historical claim (e.g. Gandhi ji, Partition), provide a 10-word fact contrast. Else null."
}}
"""
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=300,
            response_format={"type": "json_object"}
        )
        
        output = completion.choices[0].message.content
        res = json.loads(output)
        
        # Inject NLI verdict into reason for UI impact
        nli = res.get("verdict", "Neutral")
        res["reason"] = f"[{nli.upper()}] {res.get('reason')}"
        
        return res

    except Exception as e:
        print(f"DEBUG: Llama API Error - {e}")
        return {
            "verdict": "Neutral",
            "veracity": "unknown",
            "toxicity": "unknown",
            "propaganda_anatomy": "Error: Failed to deconstruct claim anatomy.",
            "reason": "[ERROR] Failed to deconstruct claim.",
            "historical_context": None
        }

# Legacy stubs for compatibility
def fallback_classify(claim, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("veracity", "unknown"), res.get("toxicity", "unknown")

def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("reason", "No reason generated.")
