import json
from pathlib import Path
from datasets import load_dataset
import sys

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "training" / "preprocessing"))

from clean_text import clean_social_media_text

CLEAN_DATASET_FILE = BASE_DIR / "data" / "clean_dataset.json"


def ingest_hate_speech():
    print("Downloading Hate Speech dataset from HuggingFace...")
    # Loading the 'tweet_eval' dataset, specifically the hate speech configuration
    dataset = load_dataset("tweet_eval", "hate", split="train")

    new_samples = []

    for item in dataset:
        clean_text = clean_social_media_text(item["text"])

        # 0 is non-hate (safe), 1 is hate
        toxicity = "hate" if item["label"] == 1 else "safe"

        new_samples.append({
            "text": clean_text,
            "context": "",  # Social media posts often lack extended context
            "language": "en",
            "veracity_label": "unknown",  # We don't know if the tweet is factually true/false
            "toxicity_label": toxicity
        })

    # Load existing data, append new data, and save
    if CLEAN_DATASET_FILE.exists():
        with open(CLEAN_DATASET_FILE, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    else:
        existing_data = []

    combined_data = existing_data + new_samples

    with open(CLEAN_DATASET_FILE, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, indent=2)

    print(f"Successfully added {len(new_samples)} hate speech samples.")
    print(f"Total dataset size is now: {len(combined_data)}")


if __name__ == "__main__":
    ingest_hate_speech()