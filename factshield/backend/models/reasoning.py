import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "google/flan-t5-base"
device = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading Reasoning Engine (Flan-T5)...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)


def fallback_classify(claim, evidence_list):
    """Acts as a backup judge if the primary classifier fails, using strict T5 formatting."""
    context = " ".join(evidence_list[:2]) if evidence_list else "No evidence available."

    # 1. T5-Optimized Veracity Prompt
    v_prompt = f"Context: {context}\nClaim: {claim}\nQuestion: Based on the context, is the claim 'real', 'fake', or 'misleading'?\nAnswer:"
    v_inputs = tokenizer(v_prompt, return_tensors="pt", max_length=512, truncation=True).to(device)
    v_outputs = model.generate(**v_inputs, max_new_tokens=5, temperature=0.1, do_sample=False)
    v_pred = tokenizer.decode(v_outputs[0], skip_special_tokens=True).strip().lower()

    # 2. T5-Optimized Toxicity Prompt
    t_prompt = f"Claim: {claim}\nQuestion: Does this claim contain hate speech, slurs, or threats, or is it a safe observation?\nAnswer:"
    t_inputs = tokenizer(t_prompt, return_tensors="pt", max_length=512, truncation=True).to(device)
    t_outputs = model.generate(**t_inputs, max_new_tokens=5, temperature=0.1, do_sample=False)
    t_pred = tokenizer.decode(t_outputs[0], skip_special_tokens=True).strip().lower()

    # Broadened Synonym Catching
    v_label = "unknown"
    if any(word in v_pred for word in ["real", "true", "accurate", "yes"]):
        v_label = "real"
    elif any(word in v_pred for word in ["fake", "false", "lie", "no"]):
        v_label = "fake"
    elif any(word in v_pred for word in ["mislead", "partial"]):
        v_label = "misleading"

    t_label = "unknown"
    if any(word in v_pred for word in ["hate", "toxic", "threat", "slur"]):
        t_label = "hate"
    elif any(word in t_pred for word in ["safe", "observation", "no"]):
        t_label = "safe"

    print(f"DEBUG: LLM Raw Output -> Veracity: '{v_pred}', Toxicity: '{t_pred}'")

    return v_label, t_label


def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    if not evidence_list:
        return f"The system classified this post as '{veracity_label}' and '{toxicity_label}', but could not find specific external evidence to generate a detailed explanation."

    context = " ".join(evidence_list[:2])

    # T5-Optimized Reasoning Prompt
    prompt = (
        f"Context: {context}\n"
        f"Claim: {claim}\n"
        f"Question: Explain in one short sentence why the claim is {veracity_label}.\n"
        f"Answer:"
    )

    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=60,
        temperature=0.5,
        do_sample=True
    )

    reason = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Clean up if T5 just repeats the question
    if reason.lower() == claim.lower() or len(reason) < 10:
        return f"Based on live retrieved facts, the claim aligns with verified reports found in the database." if veracity_label == 'real' else f"The retrieved evidence contradicts or lacks support for this claim."

    return reason