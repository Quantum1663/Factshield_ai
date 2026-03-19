import json
import sys
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from training.augmentation.translator import translate_claim
from training.augmentation.paraphraser import generate_paraphrases

INPUT_FILE = BASE_DIR / "data" / "clean_dataset.json"
OUTPUT_DIR = BASE_DIR / "data" / "dataset_shards"

OUTPUT_DIR.mkdir(exist_ok=True)

SHARD_SIZE = 5000


def _get_text(item):
    return item.get("text") or item.get("claim", "")


def augment_sample(item):
    results = []
    text = _get_text(item)
    results.append(item)

    try:
        paras = generate_paraphrases(text)
        for p in paras:
            results.append({
                **item,
                "text": p,
            })
    except Exception as e:
        logger.warning(f"Paraphrase failed: {e}")

    try:
        translations = translate_claim(text)
        for t in translations:
            results.append({
                **item,
                "text": t["claim"],
                "language": t["language"],
            })
    except Exception as e:
        logger.warning(f"Translation failed: {e}")

    return results


def write_shards(dataset):
    shard_id = 0
    count = 0
    file = None

    for sample in dataset:
        if count % SHARD_SIZE == 0:
            if file:
                file.close()
            shard_id += 1
            file = open(
                OUTPUT_DIR / f"shard_{shard_id}.jsonl",
                "w",
                encoding="utf-8"
            )
        file.write(json.dumps(sample) + "\n")
        count += 1

    if file:
        file.close()


def run_scaler():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} samples")

    flattened = []
    for item in data:
        results = augment_sample(item)
        flattened.extend(results)

    print(f"Generated {len(flattened)} samples")
    write_shards(flattened)
    print("Dataset shards written successfully")


if __name__ == "__main__":
    run_scaler()
