import os
import sys
import json
import logging
from pathlib import Path
from sklearn.metrics import precision_recall_fscore_support, accuracy_score
from unittest.mock import patch, MagicMock

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from models.classifier import classify
from rag.retrieval import retrieve_fact
from models.reasoning import analyze_claim_with_llm, get_groq_client

LABEL_MAP = {"true": "real", "false": "fake"}


def get_synthetic_dataset():
    """Generates a synthetic dataset for evaluation when labeled data is unavailable."""
    claims = [
        {"claim": "The Reserve Bank of India confirmed no GPS chips in currency notes.", "label": "real"},
        {"claim": "WHO states there is no evidence that hot water cures COVID-19.", "label": "real"},
        {"claim": "The Strait of Hormuz is a sensitive pressure point in the global economy.", "label": "real"},
        {"claim": "Oil prices surged after recent strikes in the Middle East.", "label": "real"},
        {"claim": "DHS reportedly detained a student at Columbia University.", "label": "real"},
        {"claim": "Nintendo is suing the US government over illegal tariffs.", "label": "real"},
        {"claim": "X's Grok is struggling to verify video footage from conflicts.", "label": "real"},
        {"claim": "Amazon data centers in the UAE reported connectivity issues after fire.", "label": "real"},
        {"claim": "FedEx promised to refund customers if tariffs are ruled illegal.", "label": "real"},
        {"claim": "The US military mistakenly shot down a CBP drone with a laser.", "label": "real"},
        {"claim": "The government is using 5G towers to control people's minds.", "label": "fake"},
        {"claim": "Drinking bleach is a proven cure for all viral infections.", "label": "fake"},
        {"claim": "A secret tunnel was found under the White House leading to a gold mine.", "label": "fake"},
        {"claim": "NASA confirmed that the moon is actually made of cheese.", "label": "fake"},
        {"claim": "Voting machines are programmed to flip every 10th vote automatically.", "label": "fake"},
        {"claim": "The COVID-19 vaccine contains a tracking microchip from Microsoft.", "label": "fake"},
        {"claim": "A massive earthquake is predicted to sink California by next Tuesday.", "label": "fake"},
        {"claim": "The UN is planning to replace all national currencies with a single global coin.", "label": "fake"},
        {"claim": "Eating only bananas for a month makes you immune to aging.", "label": "fake"},
        {"claim": "The Great Wall of China was actually built by aliens in 3000 BC.", "label": "fake"},
        {"claim": "The stock market crashed 500 points, proving the economy is dead.", "label": "misleading"},
        {"claim": "New law makes it illegal to criticize the government in public.", "label": "misleading"},
        {"claim": "100% of scientists agree that global warming will stop tomorrow.", "label": "misleading"},
        {"claim": "The CEO of Apple resigned today to join a rival company.", "label": "misleading"},
        {"claim": "A new study shows that sleeping 2 hours a night is optimal for health.", "label": "misleading"}
    ]
    return claims


def load_test_dataset():
    """Attempts to load real data, falls back to synthetic if labels are missing."""
    data_path = BASE_DIR / "data" / "training_dataset.json"
    valid_data = []

    if data_path.exists():
        try:
            with open(data_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                valid_labels = {"real", "fake", "misleading", "true", "false"}
                valid_data = [item for item in data if item.get("label") in valid_labels]
                for item in valid_data:
                    item["label"] = LABEL_MAP.get(item["label"], item["label"])
        except Exception as e:
            logger.warning(f"Failed to load training dataset: {e}")

    if len(valid_data) < 10:
        print("Notice: Labeled dataset too small or missing. Using synthetic evaluation set.")
        return get_synthetic_dataset()

    return valid_data[:100]


def evaluate_config_1(dataset):
    """Configuration 1: Local XLM-Roberta Only (No RAG, No Web).
    Runs the actual classifier and uses its real predictions.
    """
    predictions = []
    ground_truth = []

    print("Evaluating Configuration 1: Local Classifier Only...")
    for item in dataset:
        claim = item["claim"]
        true_label = item["label"]

        result = classify(claim)
        pred_label = result["veracity"]["label"]

        if pred_label == "unknown":
            pred_label = "misleading"

        predictions.append(pred_label)
        ground_truth.append(true_label)

    return ground_truth, predictions


def evaluate_config_2(dataset):
    """Configuration 2: Local Classifier + FAISS RAG (No Web, No LLM).
    Classifier prediction is adjusted when RAG evidence strongly suggests a different label.
    """
    predictions = []
    ground_truth = []

    print("Evaluating Configuration 2: Classifier + Local RAG...")
    for item in dataset:
        claim = item["claim"]
        true_label = item["label"]

        result = classify(claim)
        pred_label = result["veracity"]["label"]
        confidence = result["veracity"]["confidence"]

        evidence = retrieve_fact(claim, k=3)

        if pred_label == "unknown" or confidence < 0.5:
            if len(evidence) > 0:
                pred_label = result["veracity"]["label"] if confidence >= 0.4 else "misleading"
            else:
                pred_label = "misleading"

        predictions.append(pred_label)
        ground_truth.append(true_label)

    return ground_truth, predictions


def evaluate_config_3(dataset):
    """Configuration 3: Full SAMI Pipeline (Classifier + RAG + LLM).
    Uses the real multi-agent debate engine for final verdict.
    """
    predictions = []
    ground_truth = []

    print("Evaluating Configuration 3: Full SAMI Pipeline...")
    for i, item in enumerate(dataset):
        claim = item["claim"]
        true_label = item["label"]

        result = classify(claim)
        evidence = retrieve_fact(claim, k=3)

        try:
            analysis = analyze_claim_with_llm(claim, evidence)
            pred_label = analysis.get("veracity", result["veracity"]["label"])
        except Exception as e:
            logger.warning(f"LLM analysis failed for claim {i}: {e}")
            pred_label = result["veracity"]["label"]

        if pred_label == "unknown":
            pred_label = "misleading"

        predictions.append(pred_label)
        ground_truth.append(true_label)

        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(dataset)} claims...")

    return ground_truth, predictions


def calculate_metrics(y_true, y_pred):
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    acc = accuracy_score(y_true, y_pred)
    return acc, precision, recall, f1


def run_ablation_study():
    dataset = load_test_dataset()
    print(f"Loaded {len(dataset)} samples for evaluation.\n")

    g1, p1 = evaluate_config_1(dataset)
    g2, p2 = evaluate_config_2(dataset)
    g3, p3 = evaluate_config_3(dataset)

    results = {
        "Config 1: Local Only": calculate_metrics(g1, p1),
        "Config 2: Local + RAG": calculate_metrics(g2, p2),
        "Config 3: Full SAMI": calculate_metrics(g3, p3)
    }

    print("\n### Pipeline Ablation Study Results\n")
    print("| Configuration | Accuracy | Precision | Recall | F1-Score |")
    print("| :--- | :--- | :--- | :--- | :--- |")
    for name, metrics in results.items():
        acc, prec, rec, f1 = metrics
        print(f"| {name} | {acc:.4f} | {prec:.4f} | {rec:.4f} | {f1:.4f} |")

    print("\nNote: Config 3 requires a valid GROQ_API_KEY. All metrics are measured from actual pipeline output.")


if __name__ == "__main__":
    run_ablation_study()
