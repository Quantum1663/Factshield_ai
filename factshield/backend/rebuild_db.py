import json
import os
import sys
from pathlib import Path

import faiss
import numpy as np

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from models.embeddings import generate_embedding
import rag.vector_store as vector_store
from rag.vector_store import INDEX_PATH, META_PATH, dimension
from utils.vector_updater import chunk_text

DATA_FILE = BASE_DIR / "data" / "clean_dataset.json"


def extract_record_text(item: dict) -> str:
    return (
        item.get("context")
        or item.get("claim")
        or item.get("text")
        or item.get("content")
        or item.get("title")
        or ""
    ).strip()


def build_records(samples: list[dict], limit: int | None) -> list[dict]:
    records = []
    for item in samples:
        text = extract_record_text(item)
        if len(text) < 50:
            continue

        source = item.get("source") or item.get("label") or "initial_dataset"
        date = item.get("date") or item.get("published") or "2024-01-01T00:00:00"

        for chunk in chunk_text(text, max_words=60, overlap=15)[:10]:
            clean_chunk = " ".join(chunk.split())
            if len(clean_chunk) < 50:
                continue
            records.append({
                "text": clean_chunk,
                "source": source,
                "date": date,
            })
            if limit and len(records) >= limit:
                return records
    return records


def rebuild_database(limit: int | None = 500):
    print("--- REBUILDING FACTSHIELD VECTOR DATABASE ---")
    print(f"Loading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        samples = json.load(f)

    records = build_records(samples, limit)
    print(f"Prepared {len(records)} metadata records.")
    if not records:
        raise RuntimeError("No valid records found; refusing to replace existing vector database.")

    vectors = []
    for index, record in enumerate(records, start=1):
        embedding = generate_embedding(record["text"])
        vectors.append(embedding)
        if index % 50 == 0:
            print(f"Embedded {index}/{len(records)} records...")

    matrix = np.array(vectors).astype("float32")
    if matrix.ndim != 2 or matrix.shape[1] != dimension:
        raise RuntimeError(f"Embedding shape {matrix.shape} does not match expected dimension {dimension}.")

    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatL2(dimension)
    index.add(matrix)

    temp_index_path = INDEX_PATH.with_suffix(".faiss.tmp")
    temp_meta_path = META_PATH.with_suffix(".json.tmp")

    faiss.write_index(index, str(temp_index_path))
    with open(temp_meta_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    os.replace(temp_index_path, INDEX_PATH)
    os.replace(temp_meta_path, META_PATH)
    vector_store.index = index
    vector_store.metadata = records

    print(f"SUCCESS: Rebuilt database with {index.ntotal} vectors and {len(records)} metadata records.")
    return {"vector_count": index.ntotal, "metadata_count": len(records)}


if __name__ == "__main__":
    raw_limit = os.getenv("FACTSHIELD_REBUILD_LIMIT", "500").strip().lower()
    rebuild_limit = None if raw_limit in {"", "none", "all", "0"} else int(raw_limit)
    rebuild_database(rebuild_limit)
