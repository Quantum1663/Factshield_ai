import os
import json
import faiss
import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from utils.feed_aggregator import get_live_feed
from utils.cache_manager import result_cache, rate_limiter
from rag.vector_store import reload_store

try:
    from moviepy import VideoFileClip
except ImportError:
    try:
        from moviepy.editor import VideoFileClip
    except ImportError:
        VideoFileClip = None

router = APIRouter()
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
rebuild_state = {
    "status": "idle",
    "message": "No rebuild is running.",
    "metadata_count": None,
    "vector_count": None,
    "error": None,
}

def get_dataset_size() -> int:
    return len(get_metadata())

def get_metadata() -> list:
    meta_path = DATA_DIR / "fact_metadata.json"
    if not meta_path.exists():
        return []
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_vector_count() -> int:
    index_path = DATA_DIR / "fact_index.faiss"
    if not index_path.exists():
        return 0
    index = faiss.read_index(str(index_path))
    return index.ntotal

def get_retrieval_health() -> dict:
    metadata_count = get_dataset_size()
    vector_count = get_vector_count()
    index_exists = (DATA_DIR / "fact_index.faiss").exists()
    metadata_exists = (DATA_DIR / "fact_metadata.json").exists()
    index_consistent = index_exists and metadata_exists and vector_count == metadata_count and vector_count > 0

    if index_consistent:
        status = "healthy"
        message = "Retrieval index and metadata are aligned."
    elif vector_count == 0 or metadata_count == 0:
        status = "unavailable"
        message = "Retrieval index or metadata is empty."
    else:
        status = "degraded"
        message = f"FAISS vectors ({vector_count}) and metadata records ({metadata_count}) are out of sync. Rebuild the vector database."

    return {
        "status": status,
        "message": message,
        "index_exists": index_exists,
        "metadata_exists": metadata_exists,
        "index_consistent": index_consistent,
        "metadata_count": metadata_count,
        "vector_count": vector_count,
    }

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
    return get_metadata()[-20:]

@router.get("/neural-stats")
def get_neural_stats():
    dataset_size = get_dataset_size()
    vector_count = get_vector_count()
    retrieval_health = get_retrieval_health()
    has_model = (BASE_DIR / "factshield_model").exists()
    llm_configured = bool(os.getenv("GROQ_API_KEY"))
    pipeline_ready = has_model and llm_configured and retrieval_health["index_consistent"]

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
        "video_support": VideoFileClip is not None,
        "groq_configured": llm_configured,
        "retrieval_status": retrieval_health["status"],
        "retrieval_message": retrieval_health["message"],
        "metadata_count": retrieval_health["metadata_count"],
        "index_consistent": retrieval_health["index_consistent"],
        "status": "Optimal" if pipeline_ready else "Degraded"
    }

@router.get("/system-status")
def system_status():
    dataset_size = get_dataset_size()
    index_size = get_vector_count()
    retrieval_health = get_retrieval_health()

    return {
        "system": "SAMI AI",
        "model_status": "loaded (Multi-Label)",
        "dataset_entries": dataset_size,
        "faiss_vectors": index_size,
        "retrieval_status": retrieval_health["status"],
        "retrieval_message": retrieval_health["message"],
        "index_consistent": retrieval_health["index_consistent"],
        "metadata_count": retrieval_health["metadata_count"],
        "api_status": "running"
    }

@router.get("/retrieval-health")
def retrieval_health():
    return get_retrieval_health()


def run_rebuild(limit: int | None):
    rebuild_state.update({
        "status": "running",
        "message": "Rebuilding retrieval index.",
        "metadata_count": None,
        "vector_count": None,
        "error": None,
    })
    try:
        from rebuild_db import rebuild_database

        result = rebuild_database(limit=limit)
        reload_result = reload_store()
        result_cache._cache.clear()
        rebuild_state.update({
            "status": "completed",
            "message": "Retrieval index rebuilt and in-memory store reloaded.",
            "metadata_count": reload_result["metadata_count"],
            "vector_count": reload_result["vector_count"],
            "error": None,
        })
        logger.info("Retrieval rebuild completed: %s", result)
    except Exception as exc:
        logger.exception("Retrieval rebuild failed")
        rebuild_state.update({
            "status": "failed",
            "message": "Retrieval rebuild failed.",
            "error": str(exc),
        })


@router.post("/retrieval-rebuild")
def rebuild_retrieval_index(
    background_tasks: BackgroundTasks,
    request: Request,
    limit: int = Query(default=500, ge=1, le=5000),
):
    client_host = request.client.host if request.client else ""
    if client_host not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=403, detail="Retrieval rebuild is only available from localhost.")
    if rebuild_state["status"] == "running":
        raise HTTPException(status_code=409, detail="Retrieval rebuild is already running.")

    background_tasks.add_task(run_rebuild, limit)
    rebuild_state.update({
        "status": "queued",
        "message": f"Retrieval rebuild queued for {limit} records.",
        "metadata_count": None,
        "vector_count": None,
        "error": None,
    })
    return rebuild_state


@router.get("/retrieval-rebuild-status")
def retrieval_rebuild_status():
    return rebuild_state
