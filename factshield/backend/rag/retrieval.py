import sys
from pathlib import Path
from sentence_transformers import SentenceTransformer, CrossEncoder

# Add backend root to Python path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from rag.vector_store import search

print("Loading Embedding Model...")
embedding_model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")

print("Loading Cross-Encoder for Reranking...")
cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def retrieve_fact(query, k=3):
    expanded_query = f"""
    Verify the following claim and retrieve fact-check evidence:

    Claim: {query}
    """

    # 1. Broad Semantic Search (retrieve more candidates)
    embedding = embedding_model.encode([expanded_query])[0]
    candidates = search(embedding, k=15)

    if not candidates:
        return []

    # 2. Extract texts for reranking
    candidate_texts = []
    for cand in candidates:
        if isinstance(cand, dict):
            candidate_texts.append(cand.get("text", ""))
        else:
            candidate_texts.append(cand)

    # 3. Create pairs for the Cross-Encoder: (Claim, Evidence)
    pairs = [[query, text] for text in candidate_texts]

    # 4. Score and sort candidates
    scores = cross_encoder.predict(pairs)
    scored_candidates = list(zip(candidates, scores))
    scored_candidates.sort(key=lambda x: x[1], reverse=True)

    # 5. Extract top k candidates
    top_results = [cand for cand, score in scored_candidates[:k]]

    # Format the results to inject metadata (source reliability and temporal data)
    formatted_results = []
    for cand in top_results:
        if isinstance(cand, dict):
            source = cand.get("source", "unknown source")
            date = cand.get("date", "unknown date")
            text = cand.get("text", "")
            # Inject temporal and source data into the context string
            formatted_results.append(f"[{source} | Date: {date}] {text}")
        else:
            formatted_results.append(cand)

    return formatted_results