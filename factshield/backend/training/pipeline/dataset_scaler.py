import json
import sys
from pathlib import Path
from multiprocessing import Pool, cpu_count

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from training.augmentation.translator import translate_claim
from training.augmentation.paraphraser import generate_paraphrases

INPUT_FILE = BASE_DIR / "data" / "clean_dataset.json"
OUTPUT_DIR = BASE_DIR / "data" / "dataset_shards"

OUTPUT_DIR.mkdir(exist_ok=True)


SHARD_SIZE = 5000


def augment_sample(item):

    results = []

    claim = item["claim"]

    results.append(item)

    # paraphrases
    try:
        paras = generate_paraphrases(claim)

        for p in paras:
            results.append({
                "claim": p,
                "context": item["context"],
                "language": item["language"],
                "label": item["label"]
            })
    except:
        pass

    # translations
    try:
        translations = translate_claim(claim)

        for t in translations:
            results.append({
                "claim": t["claim"],
                "context": item["context"],
                "language": t["language"],
                "label": item["label"]
            })
    except:
        pass

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