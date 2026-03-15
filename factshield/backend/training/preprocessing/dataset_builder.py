import json
from pathlib import Path
from langdetect import detect
from clean_text import clean_social_media_text # Importing your new cleaner

BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_FILE = BASE_DIR / "data" / "raw_dataset.json"
OUTPUT_FILE = BASE_DIR / "data" / "clean_dataset.json"

def detect_language(text):
    try:
        return detect(text)
    except:
        return "unknown"

def build_dataset():
    dataset = []
    seen_titles = set()

    with open(RAW_FILE, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)

            # Use the advanced social media cleaner
            title = clean_social_media_text(item.get("title", ""))
            content = clean_social_media_text(item.get("content", ""))

            if not title or title in seen_titles:
                continue

            seen_titles.add(title)
            language = detect_language(title)

            # NEW SCHEMA: Dual labels for Multi-Task Learning
            dataset.append({
                "text": title,               # Renamed 'claim' to 'text' as hate speech isn't always a claim
                "context": content,
                "language": language,
                "veracity_label": "unknown", # real, fake, misleading, unknown
                "toxicity_label": "unknown"  # hate, safe, unknown
            })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"Dataset built with {len(dataset)} dual-label samples")

if __name__ == "__main__":
    build_dataset()