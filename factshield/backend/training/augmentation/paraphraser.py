import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "google/flan-t5-base"

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)


def generate_paraphrases(text):

    prompt = f"Paraphrase the following sentence: {text}"

    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=60,
        num_return_sequences=3,
        do_sample=True,
        top_p=0.95
    )

    results = []

    for output in outputs:
        results.append(tokenizer.decode(output, skip_special_tokens=True))

    return results