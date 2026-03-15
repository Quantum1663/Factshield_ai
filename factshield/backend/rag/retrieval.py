import sys
from pathlib import Path
from sentence_transformers import SentenceTransformer

# Add backend root to Python path
# This ensures "rag" is treatable as a package
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

# Use Absolute Import instead of Relative
from rag.vector_store import search

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")


def retrieve_fact(query, k=3):

    expanded_query = f"""
    Verify the following claim and retrieve fact-check evidence:

    Claim: {query}
    """

    embedding = model.encode([expanded_query])[0]

    results = search(embedding, k)

    return results