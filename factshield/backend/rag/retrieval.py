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


def rerank_documents(query: str, documents: list[str], top_k: int = 3) -> list[str]:
    """
    Reranks a list of documents against a query using a Cross-Encoder.
    
    Args:
        query: The user claim or question.
        documents: A list of candidate document strings.
        top_k: Number of top documents to return.
        
    Returns:
        The top_k most relevant documents.
    """
    if not documents:
        return []

    # 1. Create pairs for the Cross-Encoder: (Claim, Evidence)
    pairs = [[query, doc] for doc in documents]

    # 2. Score the pairs
    scores = cross_encoder.predict(pairs)

    # 3. Sort documents by score in descending order
    scored_docs = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)

    # 4. Return the top_k documents
    return [doc for doc, score in scored_docs[:top_k]]


def retrieve_fact(query, k=3):
    expanded_query = f"""
    Verify the following claim and retrieve fact-check evidence:

    Claim: {query}
    """

    # 1. Broad Semantic Search (retrieve more candidates)
    embedding = embedding_model.encode([expanded_query])[0]
    candidates = search(embedding, k=10) # Retrieve top 10 as requested for reranking

    if not candidates:
        return []

    # 2. Extract texts for reranking and maintain mapping to metadata
    candidate_map = {}
    candidate_texts = []
    for cand in candidates:
        text = cand.get("text", "") if isinstance(cand, dict) else str(cand)
        candidate_texts.append(text)
        candidate_map[text] = cand

    # 3. Use the new rerank_documents function
    top_texts = rerank_documents(query, candidate_texts, top_k=k)

    # 4. Format the results with metadata
    formatted_results = []
    for text in top_texts:
        cand = candidate_map.get(text)
        if isinstance(cand, dict):
            source = cand.get("source", "unknown source")
            date = cand.get("date", "unknown date")
            # Inject temporal and source data into the context string
            formatted_results.append(f"[{source} | Date: {date}] {text}")
        else:
            formatted_results.append(text)

    return formatted_results