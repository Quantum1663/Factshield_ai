import sys
import re
import logging
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from models.embeddings import generate_embedding
from rag.vector_store import add_vector, index, metadata, dimension
import numpy as np
import faiss

logger = logging.getLogger(__name__)


def chunk_text(text, max_words=60, overlap=15):
    """Splits text into overlapping chunks so context isn't lost."""
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_words - overlap):
        chunk = " ".join(words[i:i + max_words])
        chunks.append(chunk)
    return chunks


def add_new_evidence(article_data):
    """
    Adds new news evidence to the vector database with semantic deduplication.
    Uses L2 distance on normalized vectors to approximate Cosine Similarity.
    Threshold of 0.1 corresponds to ~95% similarity.
    """
    if not article_data or not isinstance(article_data, dict) or not article_data.get("text"):
        return "Invalid article data"

    text = article_data["text"]
    source = article_data.get("source", "unknown")
    date = article_data.get("date")

    chunks = chunk_text(text, max_words=60, overlap=15)

    added_count = 0
    duplicate_count = 0

    for chunk in chunks[:10]:
        clean_chunk = re.sub(r'\s+', ' ', chunk).strip()

        if len(clean_chunk) > 40:
            embedding = generate_embedding(clean_chunk)

            vector = np.array([embedding]).astype("float32")
            if vector.ndim == 1:
                vector = np.expand_dims(vector, axis=0)

            faiss.normalize_L2(vector)

            if index.ntotal > 0:
                distances, indices = index.search(vector, 1)
                if distances[0][0] < 0.1:
                    duplicate_count += 1
                    continue

            meta = {
                "text": clean_chunk,
                "source": source,
                "date": date
            }
            add_vector(embedding, meta)
            added_count += 1

    if added_count == 0 and duplicate_count > 0:
        return "Duplicate found, not added"

    return f"Successfully added {added_count} chunks to the database."
