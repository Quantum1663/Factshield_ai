import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import sys
import math

# Get the absolute path to the project root (Majorproject_2.0)
# classifier.py is inside factshield/backend/models/
# Go up TWO levels: from models -> to backend
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "factshield_model"

print(f"Looking for model at: {MODEL_PATH}")

try:
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
except Exception as e:
    print(f"Error: {e}")
    print(f"\nWarning: Could not load model from {MODEL_PATH}.")
    print("Make sure train_classifier.py completed successfully and the folder exists.")
    sys.exit(1)  # Stop execution here to prevent the NameError

# Must match the training script exactly
CLASSES = [
    "real", "fake", "misleading", "veracity_unknown",
    "hate", "safe", "toxicity_unknown"
]

VERACITY_INDICES = [0, 1, 2, 3]
TOXICITY_INDICES = [4, 5, 6]


def classify(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)

    with torch.no_grad():
        outputs = model(**inputs)

    # Use Sigmoid instead of Softmax for multi-label!
    probs = torch.sigmoid(outputs.logits)[0]

    # Extract Veracity Prediction
    veracity_probs = probs[VERACITY_INDICES]
    v_best_idx = torch.argmax(veracity_probs).item()
    v_confidence = float(veracity_probs[v_best_idx].item())

    # SAFETY CHECK: Catch NaN or Infinity
    if math.isnan(v_confidence) or math.isinf(v_confidence):
        v_confidence = 0.0

    v_label = CLASSES[VERACITY_INDICES[v_best_idx]]

    # Extract Toxicity Prediction
    toxicity_probs = probs[TOXICITY_INDICES]
    t_best_idx = torch.argmax(toxicity_probs).item()
    t_confidence = float(toxicity_probs[t_best_idx].item())

    # SAFETY CHECK: Catch NaN or Infinity
    if math.isnan(t_confidence) or math.isinf(t_confidence):
        t_confidence = 0.0

    t_label = CLASSES[TOXICITY_INDICES[t_best_idx]]

    # Cleanup unknown tags for the API
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


# Test block
if __name__ == "__main__":
    test_text = "I hate these people so much, they are secretly putting microchips in our water!"
    print(classify(test_text))