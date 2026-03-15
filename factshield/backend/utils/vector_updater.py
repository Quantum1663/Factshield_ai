import sys
import re
from pathlib import Path

# Fix absolute imports
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from models.embeddings import generate_embedding
from rag.vector_store import add_vector


def chunk_text(text, max_words=60, overlap=15):
    """Splits text into overlapping chunks so context isn't lost."""
    words = text.split()
    chunks = []
    # Create chunks that overlap by a set number of words
    for i in range(0, len(words), max_words - overlap):
        chunk = " ".join(words[i:i + max_words])
        chunks.append(chunk)
    return chunks


def add_new_evidence(text):
    if not text:
        return

    # Use our new semantic chunking
    chunks = chunk_text(text, max_words=60, overlap=15)

    # Process top chunks (extended to 10 to capture more of the article)
    for chunk in chunks[:10]:
        clean_chunk = re.sub(r'\s+', ' ', chunk).strip()

        # Only embed meaningful chunks
        if len(clean_chunk) > 40:
            embedding = generate_embedding(clean_chunk)
            add_vector(embedding, clean_chunk)
            print(f"DEBUG: Added chunk to vector DB: {clean_chunk[:50]}...")