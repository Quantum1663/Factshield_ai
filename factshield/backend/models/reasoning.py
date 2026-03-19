import os
import json
from groq import Groq


def get_groq_client():
    """Build a fresh client so reloads or closed transports do not poison later requests."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")
    return Groq(api_key=api_key)

def analyze_claim_with_llm(claim, evidence_list):
    """
    Multi-Agent Debate Engine: Prosecutor vs Defense vs Judge.
    Uses sequential reasoning to deconstruct complex propaganda.
    """
    context = "\n".join(evidence_list[:3]) if evidence_list else "No external evidence available."
    model_name = "llama-3.3-70b-versatile"

    try:
        client = get_groq_client()

        # --- AGENT 1: THE PROSECUTOR ---
        prosecutor_prompt = f"""
        You are 'The Prosecutor', an expert in debunking misinformation and identifying information warfare.
        Your goal: Build a strong case for why the claim below is FALSE, MISLEADING, or MALICIOUS PROPAGANDA.
        Use the provided evidence to support your argument.

        Context Evidence: {context}
        Claim to Analyze: "{claim}"
        
        Provide a sharp, evidence-based argument debunking the claim.
        """
        
        p_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prosecutor_prompt}],
            temperature=0.2,
            max_tokens=400
        )
        prosecutor_argument = p_res.choices[0].message.content

        # --- AGENT 2: THE DEFENSE ---
        defense_prompt = f"""
        You are 'The Defense', an expert in identifying nuance, satire, and missing context.
        You have read the Prosecutor's case. Your goal: Argue why the claim might be TRUE, SATIRICAL, or why the Prosecutor's interpretation is UNFAIR or MISSING CONTEXT.
        
        Prosecutor's Argument: {prosecutor_argument}
        Context Evidence: {context}
        Claim to Analyze: "{claim}"
        
        Provide a nuanced counter-argument.
        """
        
        d_res = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": defense_prompt}],
            temperature=0.2,
            max_tokens=400
        )
        defense_argument = d_res.choices[0].message.content

        # --- AGENT 3: THE JUDGE ---
        judge_prompt = f"""
        You are 'The Judge', an impartial arbiter of tactical integrity and truth. 
        You have reviewed the evidence, the Prosecutor's case for debunking, and the Defense's case for context.
        Your goal: Weigh both sides and provide the final definitive verdict.

        Context Evidence: {context}
        Claim: "{claim}"
        Prosecutor's Case: {prosecutor_argument}
        Defense's Case: {defense_argument}

        Perform the following tasks:
        1. NLI Verdict: Supports, Refutes, or Neutral.
        2. Classification: Veracity ('real', 'fake', 'misleading') and Toxicity ('hate', 'safe').
        3. Propaganda Anatomy: A detailed 2 to 3 sentence paragraph explicitly explaining how specific words in the claim execute manipulation tactics (e.g. Whataboutism, Fear Mongering).
        4. Explanation: Provide a concise, one-sentence explanation for the final verdict.

        Respond ONLY with a valid JSON object matching this schema:
        {{
          "verdict": "Supports" | "Refutes" | "Neutral",
          "veracity": "real" | "fake" | "misleading" | "unknown",
          "toxicity": "hate" | "safe",
          "propaganda_anatomy": "Detailed paragraph analyzing the claim's tactical structure...",
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
        
        # Inject NLI verdict into reason for UI impact
        nli = res.get("verdict", "Neutral")
        res["reason"] = f"[{nli.upper()}] {res.get('reason')}"
        
        return res

    except Exception as e:
        print(f"DEBUG: Multi-Agent Debate Error - {e}")
        return {
            "verdict": "Neutral",
            "veracity": "unknown",
            "toxicity": "unknown",
            "propaganda_anatomy": "Error: Debate pipeline failed to reach a verdict.",
            "reason": "[ERROR] Pipeline Failure.",
            "historical_context": None
        }

# Legacy stubs for compatibility
def fallback_classify(claim, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("veracity", "unknown"), res.get("toxicity", "unknown")

def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    res = analyze_claim_with_llm(claim, evidence_list)
    return res.get("reason", "No reason generated.")
