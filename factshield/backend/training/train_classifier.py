import json
import torch
from pathlib import Path
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# We can read directly from our clean_dataset.json now
DATA_FILE = DATA_DIR / "clean_dataset.json"

MODEL_NAME = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"

print("Loading dataset...")

with open(DATA_FILE, "r", encoding="utf-8") as f:
    samples = json.load(f)

print(f"Loaded {len(samples)} samples")

# --- ADD THIS NEW DATA SANITIZATION BLOCK ---
for item in samples:
    # 1. Convert old 'claim' keys to new 'text' keys
    if "claim" in item and "text" not in item:
        item["text"] = item.pop("claim")
    elif "text" not in item:
        item["text"] = ""

    # 2. Convert old 'label' keys to 'veracity_label'
    if "label" in item and "veracity_label" not in item:
        item["veracity_label"] = item.pop("label")

    # 3. Ensure 'toxicity_label' exists for old data
    if "toxicity_label" not in item:
        item["toxicity_label"] = "unknown"
# --------------------------------------------

dataset = Dataset.from_list(samples)

# Define our new multi-label space (7 distinct classes)
CLASSES = [
    "real", "fake", "misleading", "veracity_unknown",
    "hate", "safe", "toxicity_unknown"
]


def encode_labels(example):
    # Initialize an array of 0.0s
    labels = [0.0] * len(CLASSES)

    # Map veracity
    v_label = example.get("veracity_label", "unknown")
    if v_label == "unknown": v_label = "veracity_unknown"
    if v_label in CLASSES:
        labels[CLASSES.index(v_label)] = 1.0

    # Map toxicity
    t_label = example.get("toxicity_label", "unknown")
    if t_label == "unknown": t_label = "toxicity_unknown"
    if t_label in CLASSES:
        labels[CLASSES.index(t_label)] = 1.0

    return {"labels": labels}  # HuggingFace expects the key to be exactly "labels"


dataset = dataset.map(encode_labels)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


def tokenize(example):
    return tokenizer(
        example["text"],
        truncation=True,
        padding="max_length",
        max_length=128
    )


dataset = dataset.map(tokenize, batched=True)

# Define the model as a multi-label classifier
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(CLASSES),
    problem_type="multi_label_classification",  # THIS is the magic line that switches to Sigmoid/BCE Loss
    ignore_mismatched_sizes=True
)

training_args = TrainingArguments(
    output_dir="../factshield_model",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    num_train_epochs=2,
    logging_steps=50,
    save_steps=500,
    bf16=True  # Use mixed precision if you have a GPU
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset
)

print("Starting Multi-Label training...")
trainer.train()

trainer.save_model("./factshield_model")
tokenizer.save_pretrained("./factshield_model")

print("Model training complete. SAMI Multi-Label Model saved.")