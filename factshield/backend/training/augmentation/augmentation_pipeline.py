import json
import logging
from pathlib import Path

from translator import translate_claim
from paraphraser import generate_paraphrases

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
INPUT_FILE = BASE_DIR / "data" / "clean_dataset.json"
OUTPUT_FILE = BASE_DIR / "data" / "training_dataset.json"


def _get_text(item):
    """Handle both old ('claim') and new ('text') schema."""
    return item.get("text") or item.get("claim", "")


def _get_veracity(item):
    return item.get("veracity_label") or item.get("label", "unknown")


def _get_toxicity(item):
    return item.get("toxicity_label", "unknown")


def run_augmentation():
    augmented = []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        text = _get_text(item)
        if not text:
            continue

        normalized = {
            "text": text,
            "context": item.get("context", ""),
            "language": item.get("language", "en"),
            "veracity_label": _get_veracity(item),
            "toxicity_label": _get_toxicity(item),
        }
        augmented.append(normalized)

        try:
            paras = generate_paraphrases(text)
            for p in paras:
                augmented.append({
                    **normalized,
                    "text": p,
                })
        except Exception as e:
            logger.warning(f"Paraphrase generation failed: {e}")

        try:
            translations = translate_claim(text)
            for t in translations:
                augmented.append({
                    **normalized,
                    "text": t["claim"],
                    "language": t["language"],
                })
        except Exception as e:
            logger.warning(f"Translation failed: {e}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(augmented, f, indent=2)

    logger.info(f"Generated {len(augmented)} samples")
    print(f"Generated {len(augmented)} samples")


if __name__ == "__main__":
    run_augmentation()
