import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# We reuse the model from your paraphraser script for efficiency!
model_name = "google/flan-t5-base"
device = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading Reasoning Engine (Flan-T5)...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)

def generate_reason(claim, veracity_label, toxicity_label, evidence_list):
    if not evidence_list:
        return f"The system classified this post as '{veracity_label}' and '{toxicity_label}', but could not find specific external evidence to generate a detailed explanation."

    # Combine the top 2 pieces of evidence to fit within the model's token limits
    context = " ".join(evidence_list[:2])

    prompt = (
        f"Based on this evidence: '{context}', explain why the social media post '{claim}' "
        f"is classified as {veracity_label} and {toxicity_label}. Keep the explanation brief and objective."
    )

    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=100,
        temperature=0.7,
        do_sample=True
    )

    reason = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return reason