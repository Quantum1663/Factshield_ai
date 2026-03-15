import json
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATA_FILE = DATA_DIR / "raw_dataset.json"

sys.path.append(str(BASE_DIR / "training"))

from ingestion.news_api_collector import fetch_news
from ingestion.rss_collector import fetch_rss
from ingestion.reddit_collector import fetch_reddit


def run_pipeline():

    dataset = []

    print("Collecting news from API...")
    dataset.extend(fetch_news())

    print("Collecting RSS feeds...")
    dataset.extend(fetch_rss())

    print("Collecting Reddit posts...")
    dataset.extend(fetch_reddit())

    print(f"Collected {len(dataset)} samples")

    with open(DATA_FILE, "a", encoding="utf-8") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")


if __name__ == "__main__":
    run_pipeline()