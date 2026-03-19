import json
import math
import inspect
from pathlib import Path

import numpy as np
import torch
from datasets import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainerCallback,
    TrainingArguments,
    set_seed,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "clean_dataset.json"
MODEL_DIR = BASE_DIR / "factshield_model"
MODEL_NAME = "xlm-roberta-base"
MAX_LENGTH = 128
SEED = 42
VALIDATION_SPLIT = 0.15

CLASSES = [
    "real", "fake", "misleading", "veracity_unknown",
    "hate", "safe", "toxicity_unknown",
]


class StopOnNonFiniteLoss(TrainerCallback):
    """Abort training as soon as loss becomes NaN/Inf so we do not save a poisoned checkpoint."""

    def on_log(self, args, state, control, logs=None, **kwargs):
        if not logs:
            return control
        loss = logs.get("loss")
        if loss is not None and not math.isfinite(loss):
            raise RuntimeError(f"Training loss became non-finite: {loss}")
        grad_norm = logs.get("grad_norm")
        if grad_norm is not None and not math.isfinite(grad_norm):
            raise RuntimeError(f"Gradient norm became non-finite: {grad_norm}")
        return control


def sanitize_sample(item):
    item = dict(item)

    if "claim" in item and "text" not in item:
        item["text"] = item.pop("claim")
    item["text"] = str(item.get("text", "") or "").strip()

    if "label" in item and "veracity_label" not in item:
        item["veracity_label"] = item.pop("label")

    item["veracity_label"] = str(item.get("veracity_label", "unknown") or "unknown").strip().lower()
    item["toxicity_label"] = str(item.get("toxicity_label", "unknown") or "unknown").strip().lower()

    if item["veracity_label"] == "unknown":
        item["veracity_label"] = "veracity_unknown"
    if item["toxicity_label"] == "unknown":
        item["toxicity_label"] = "toxicity_unknown"

    return item


def encode_labels(example):
    labels = [0.0] * len(CLASSES)

    v_label = example["veracity_label"]
    if v_label in CLASSES:
        labels[CLASSES.index(v_label)] = 1.0

    t_label = example["toxicity_label"]
    if t_label in CLASSES:
        labels[CLASSES.index(t_label)] = 1.0

    return {"labels": labels}


def tokenize(example):
    return tokenizer(
        example["text"],
        truncation=True,
        max_length=MAX_LENGTH,
    )


def pick_precision_mode():
    if not torch.cuda.is_available():
        return {"fp16": False, "bf16": False}

    if torch.cuda.is_bf16_supported():
        return {"fp16": False, "bf16": True}

    return {"fp16": True, "bf16": False}


set_seed(SEED)

print("Loading dataset...")
with open(DATA_FILE, "r", encoding="utf-8") as f:
    raw_samples = json.load(f)

samples = [sanitize_sample(item) for item in raw_samples]
samples = [item for item in samples if item["text"]]
print(f"Loaded {len(samples)} usable samples")

dataset = Dataset.from_list(samples)
dataset = dataset.map(encode_labels)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
dataset = dataset.map(tokenize, batched=True)

dataset = dataset.remove_columns(
    [col for col in dataset.column_names if col not in {"input_ids", "attention_mask", "labels"}]
)
dataset.set_format(type="torch")

split = dataset.train_test_split(test_size=VALIDATION_SPLIT, seed=SEED)
train_dataset = split["train"]
eval_dataset = split["test"]
print(f"Train samples: {len(train_dataset)}, Validation samples: {len(eval_dataset)}")

print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

precision = pick_precision_mode()
print(f"Precision mode -> fp16={precision['fp16']}, bf16={precision['bf16']}")

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(CLASSES),
    problem_type="multi_label_classification",
    ignore_mismatched_sizes=True,
)

training_args = TrainingArguments(
    **{
        key: value
        for key, value in {
            "output_dir": str(MODEL_DIR),
            "overwrite_output_dir": True,
            "learning_rate": 2e-5,
            "per_device_train_batch_size": 8,
            "num_train_epochs": 2,
            "eval_strategy": "steps",
            "eval_steps": 200,
            "logging_strategy": "steps",
            "logging_steps": 50,
            "save_strategy": "steps",
            "save_steps": 500,
            "save_total_limit": 2,
            "load_best_model_at_end": True,
            "metric_for_best_model": "eval_loss",
            "max_grad_norm": 1.0,
            "dataloader_pin_memory": torch.cuda.is_available(),
            "report_to": "none",
            "fp16": precision["fp16"],
            "bf16": precision["bf16"],
        }.items()
        if key in inspect.signature(TrainingArguments.__init__).parameters
    }
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=DataCollatorWithPadding(tokenizer=tokenizer, padding="longest"),
    callbacks=[StopOnNonFiniteLoss()],
)

print("Starting multi-label training...")
trainer.train()

print("Saving stable model artifacts...")
trainer.save_model(str(MODEL_DIR))
tokenizer.save_pretrained(str(MODEL_DIR))

print(f"Model training complete. Saved to {MODEL_DIR}")
