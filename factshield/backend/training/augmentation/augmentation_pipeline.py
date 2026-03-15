import json
from pathlib import Path

from translator import translate_claim
from paraphraser import generate_paraphrases


BASE_DIR = Path(__file__).resolve().parent.parent.parent

INPUT_FILE = BASE_DIR / "data" / "clean_dataset.json"
OUTPUT_FILE = BASE_DIR / "data" / "training_dataset.json"


def run_augmentation():

    augmented = []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:

        data = json.load(f)

    for item in data:

        claim = item["claim"]

        augmented.append(item)

        # paraphrases
        paras = generate_paraphrases(claim)

        for p in paras:

            augmented.append({
                "claim": p,
                "context": item["context"],
                "language": item["language"],
                "label": item["label"]
            })

        # translations
        translations = translate_claim(claim)

        for t in translations:

            augmented.append({
                "claim": t["claim"],
                "context": item["context"],
                "language": t["language"],
                "label": item["label"]
            })

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:

        json.dump(augmented, f, indent=2)

    print(f"Generated {len(augmented)} samples")


if __name__ == "__main__":

    run_augmentation()