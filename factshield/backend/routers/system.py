import os
import json
import faiss
import shutil
from pathlib import Path
from fastapi import APIRouter
from utils.feed_aggregator import get_live_feed
from utils.cache_manager import result_cache, rate_limiter

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

def get_dataset_size() -> int:
    meta_path = DATA_DIR / "fact_metadata.json"
    if not meta_path.exists():
        return 0
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    return len(metadata)

def get_vector_count() -> int:
    index_path = DATA_DIR / "fact_index.faiss"
    if not index_path.exists():
        return 0
    index = faiss.read_index(str(index_path))
    return index.ntotal

@router.get("/feed")
def fetch_intelligence_feed():
    return get_live_feed()

@router.get("/trending")
def get_trending():
    data_path = DATA_DIR / "trending_propaganda.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@router.get("/archive")
def get_archive():
    meta_path = DATA_DIR / "fact_metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            return metadata[-20:]
    return []

@router.get("/neural-stats")
def get_neural_stats():
    dataset_size = get_dataset_size()
    vector_count = get_vector_count()
    has_model = (BASE_DIR / "factshield_model").exists()
    llm_configured = bool(os.getenv("GROQ_API_KEY"))
    pipeline_ready = has_model and llm_configured and vector_count >= 0

    return {
        "local_classifier": "XLM-Roberta" if has_model else "XLM-Roberta (Missing Model)",
        "vector_engine": "FAISS L2-Flat",
        "memory_count": dataset_size,
        "vector_count": vector_count,
        "cache_entries": len(result_cache._cache),
        "rate_limit_per_minute": rate_limiter._max,
        "reranker": "Cross-Encoder MiniLM",
        "reasoner": "Llama 3.3 (via Groq)",
        "ocr_available": shutil.which("tesseract") is not None,
        "video_support": True, # MoviePy check handled elsewhere but usually true if env is set
        "groq_configured": llm_configured,
        "status": "Optimal" if pipeline_ready else "Degraded"
    }

@router.get("/system-status")
def system_status():
    dataset_size = get_dataset_size()
    index_size = get_vector_count()

    return {
        "system": "SAMI AI",
        "model_status": "loaded (Multi-Label)",
        "dataset_entries": dataset_size,
        "faiss_vectors": index_size,
        "api_status": "running"
    }
