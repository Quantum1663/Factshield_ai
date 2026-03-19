import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import sys
import math
import logging

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "factshield_model"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

logger.info(f"Looking for model at: {MODEL_PATH}")
logger.info(f"Using device: {DEVICE}")

try:
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
    model = model.to(DEVICE)
    if DEVICE.type == "cpu":
        model = model.float()
        if hasattr(model, "config"):
            model.config.torch_dtype = torch.float32
    model.eval()
except Exception as e:
    logger.error(f"Could not load model from {MODEL_PATH}: {e}")
    logger.error("Make sure train_classifier.py completed successfully and the folder exists.")
    sys.exit(1)

CLASSES = [
    "real", "fake", "misleading", "veracity_unknown",
    "hate", "safe", "toxicity_unknown"
]

VERACITY_INDICES = [0, 1, 2, 3]
TOXICITY_INDICES = [4, 5, 6]


def classify(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
    inputs = {key: value.to(DEVICE) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = torch.nan_to_num(outputs.logits, nan=0.0, posinf=0.0, neginf=0.0)

    probs = torch.sigmoid(logits)[0]

    veracity_probs = probs[VERACITY_INDICES]
    v_best_idx = torch.argmax(veracity_probs).item()
    v_confidence = float(veracity_probs[v_best_idx].item())

    if math.isnan(v_confidence) or math.isinf(v_confidence):
        v_confidence = 0.0

    v_label = CLASSES[VERACITY_INDICES[v_best_idx]]

    toxicity_probs = probs[TOXICITY_INDICES]
    t_best_idx = torch.argmax(toxicity_probs).item()
    t_confidence = float(toxicity_probs[t_best_idx].item())

    if math.isnan(t_confidence) or math.isinf(t_confidence):
        t_confidence = 0.0

    t_label = CLASSES[TOXICITY_INDICES[t_best_idx]]

    if v_label == "veracity_unknown": v_label = "unknown"
    if t_label == "toxicity_unknown": t_label = "unknown"

    return {
        "veracity": {
            "label": v_label,
            "confidence": v_confidence
        },
        "toxicity": {
            "label": t_label,
            "confidence": t_confidence
        }
    }


if __name__ == "__main__":
    test_text = "I hate these people so much, they are secretly putting microchips in our water!"
    print(classify(test_text))
