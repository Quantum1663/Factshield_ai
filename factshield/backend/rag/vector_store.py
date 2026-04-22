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


def reload_store():
    global index, metadata

    if INDEX_PATH.exists():
        index = faiss.read_index(str(INDEX_PATH))
    else:
        index = faiss.IndexFlatL2(dimension)

    if META_PATH.exists():
        with open(META_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        metadata = []

    return {"vector_count": index.ntotal, "metadata_count": len(metadata)}


def add_vector(embedding, meta):

    if meta is None:
        return

    # Extract text to process
    text = meta if isinstance(meta, str) else meta.get("text", "")
    text = text.strip()

    if len(text) < 50:
        return

    # Backwards compatible duplicate check
    existing_texts = [m if isinstance(m, str) else m.get("text", "") for m in metadata]
    if text in existing_texts:
        return

    vector = np.array([embedding]).astype("float32")
    if vector.ndim == 1:
        vector = np.expand_dims(vector, axis=0)
    
    # Normalize for Cosine Similarity via IndexFlatL2
    faiss.normalize_L2(vector)

    index.add(vector)

    metadata.append(meta)

    faiss.write_index(index, str(INDEX_PATH))

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def search(embedding, k=5):
    """
    Search similar vectors in FAISS
    """

    vector = np.array([embedding]).astype("float32")
    if vector.ndim == 1:
        vector = np.expand_dims(vector, axis=0)
    
    # Normalize for consistent search against the normalized index
    faiss.normalize_L2(vector)

    if index.ntotal == 0 or not metadata:
        return []

    # The FAISS index can get ahead of metadata if a previous ingestion/rebuild
    # was interrupted. Over-fetch so valid metadata-backed hits are still returned.
    search_k = min(index.ntotal, max(k, min(index.ntotal, k * 10)))
    if index.ntotal != len(metadata):
        search_k = index.ntotal

    distances, indices = index.search(vector, search_k)

    results = []

    seen = set()
    for idx in indices[0]:
        if idx >= 0 and idx < len(metadata):
            if idx in seen:
                continue
            seen.add(idx)
            results.append(metadata[idx])
            if len(results) >= k:
                break

    return results
