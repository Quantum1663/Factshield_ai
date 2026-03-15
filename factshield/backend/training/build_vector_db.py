import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

data_path = BASE_DIR / "data" / "fact_checks.json"
index_path = BASE_DIR / "data" / "fact_index.faiss"

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

with open(data_path) as f:
    data = json.load(f)

claims = [item["claim"] for item in data]

embeddings = model.encode(claims)

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)

index.add(np.array(embeddings).astype("float32"))

faiss.write_index(index, str(index_path))