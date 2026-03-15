import faiss
import json
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

INDEX_PATH = DATA_DIR / "fact_index.faiss"
META_PATH = DATA_DIR / "fact_metadata.json"

dimension = 768


# Load FAISS index
if INDEX_PATH.exists():
    index = faiss.read_index(str(INDEX_PATH))
else:
    index = faiss.IndexFlatL2(dimension)


# Load metadata
if META_PATH.exists():
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)
else:
    metadata = []


def add_vector(embedding, text):

    if text is None:
        return

    text = text.strip()

    if len(text) < 50:
        return

    if text in metadata:
        return

    vector = np.array([embedding]).astype("float32")

    index.add(vector)

    metadata.append(text)

    faiss.write_index(index, str(INDEX_PATH))

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def search(embedding, k=5):
    """
    Search similar vectors in FAISS
    """

    vector = np.array([embedding]).astype("float32")

    distances, indices = index.search(vector, k)

    results = []

    for idx in indices[0]:
        if idx >= 0 and idx < len(metadata):
            results.append(metadata[idx])

    return results