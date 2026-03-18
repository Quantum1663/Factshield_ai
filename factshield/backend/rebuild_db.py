import json
import os
import sys
from pathlib import Path
import numpy as np
import faiss

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from rag.vector_store import INDEX_PATH, META_PATH
from utils.vector_updater import add_new_evidence

DATA_FILE = BASE_DIR / "data" / "clean_dataset.json"

def rebuild_database():
    print(f"--- REBUILDING FACTSHIELD VECTOR DATABASE ---")
    
    # 1. Clear existing index/metadata
    if INDEX_PATH.exists():
        os.remove(INDEX_PATH)
        print(f"Removed old index at {INDEX_PATH}")
    
    if META_PATH.exists():
        os.remove(META_PATH)
        print(f"Removed old metadata at {META_PATH}")

    # 2. Re-initialize empty metadata and index
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump([], f)

    # 3. Load the dataset
    print(f"Loading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        samples = json.load(f)
    
    print(f"Found {len(samples)} samples. Starting ingestion (first 500 for demo/speed)...")
    
    # We will only ingest a subset to show it works, then the user can run it fully
    # Since add_new_evidence now expects a dict:
    count = 0
    for item in samples[:500]:
        text = item.get("context", "") or item.get("claim", "")
        if len(text) < 50:
            continue
            
        # Create the metadata dict
        article_data = {
            "text": text,
            "source": "initial_dataset",
            "date": "2024-01-01T00:00:00" # Placeholder for historical data
        }
        
        # This will call generate_embedding -> add_vector (now metadata aware)
        add_new_evidence(article_data)
        count += 1
        if count % 50 == 0:
            print(f"Ingested {count} records...")

    print(f"SUCCESS: Rebuilt database with {count} records in new format.")

if __name__ == "__main__":
    rebuild_database()
