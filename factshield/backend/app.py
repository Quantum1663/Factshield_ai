import os
import time
import hashlib
from collections import OrderedDict
from dotenv import load_dotenv
from pathlib import Path
import sqlite3
import shutil
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- In-memory LRU cache for verification results ---
class ResultCache:
    def __init__(self, max_size=100, ttl_seconds=600):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _key(self, text):
        return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()

    def get(self, text):
        k = self._key(text)
        if k in self._cache:
            entry = self._cache[k]
            if time.time() - entry["ts"] < self._ttl:
                self._cache.move_to_end(k)
                logger.info("Cache HIT for claim")
                return entry["data"]
            del self._cache[k]
        return None

    def put(self, text, data):
        k = self._key(text)
        self._cache[k] = {"data": data, "ts": time.time()}
        self._cache.move_to_end(k)
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

result_cache = ResultCache(max_size=100, ttl_seconds=600)


# --- Simple in-memory rate limiter ---
class RateLimiter:
    def __init__(self, max_requests=10, window_seconds=60):
        self._requests = {}
        self._max = max_requests
        self._window = window_seconds

    def is_allowed(self, client_ip):
        now = time.time()
        if client_ip not in self._requests:
            self._requests[client_ip] = []
        self._requests[client_ip] = [t for t in self._requests[client_ip] if now - t < self._window]
        if len(self._requests[client_ip]) >= self._max:
            return False
        self._requests[client_ip].append(now)
        return True

rate_limiter = RateLimiter(max_requests=15, window_seconds=60)

# Load environment variables at the absolute start
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

# Core logic imports - MUST stay after load_dotenv
from models.classifier import classify
from models.interpretability import explain_prediction
from models.vision import analyze_image_with_vlm
from rag.retrieval import retrieve_fact
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence
from utils.c2pa_checker import verify_c2pa_metadata
from utils.claim_graph import build_claim_graph

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import faiss
import json
import pytesseract
from PIL import Image, UnidentifiedImageError
import io
import tempfile
import uuid
from faster_whisper import WhisperModel

# --- Dependency Verification ---
TESSERACT_AVAILABLE = shutil.which("tesseract") is not None
if not TESSERACT_AVAILABLE:
    logger.warning("Tesseract OCR not found in system PATH. Image/Video OCR will fail.")

try:
    from moviepy import VideoFileClip
except ImportError:
    try:
        from moviepy.editor import VideoFileClip
    except ImportError:
        logger.warning("MoviePy not found. Video verification will be disabled.")
        VideoFileClip = None

# --- Configuration ---
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
whisper_model = WhisperModel("base", device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)

DATA_DIR = BASE_DIR / "data"
TASK_DB_PATH = DATA_DIR / "tasks.db"
LEGACY_FRONTEND_DIR = BASE_DIR.parent / "frontend"
LEGACY_FRONTEND_INDEX = LEGACY_FRONTEND_DIR / "index.html"
FRONTEND_V3_DIR = BASE_DIR.parent / "frontend-v3"
FRONTEND_V3_EXPORT_DIR = FRONTEND_V3_DIR / "out"

# Setup app
app = FastAPI(title="SAMI: Social Integrity System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NewsRequest(BaseModel):
    text: str


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


def get_frontend_root() -> Path:
    if FRONTEND_V3_EXPORT_DIR.exists():
        return FRONTEND_V3_EXPORT_DIR
    return LEGACY_FRONTEND_DIR


def resolve_frontend_asset(request_path: str) -> Path | None:
    frontend_root = get_frontend_root()
    normalized = request_path.strip("/")

    if not normalized:
        index_path = frontend_root / "index.html"
        return index_path if index_path.exists() else None

    candidate = frontend_root / normalized
    if candidate.is_file():
        return candidate

    nested_index = candidate / "index.html"
    if nested_index.exists():
        return nested_index

    html_candidate = frontend_root / f"{normalized}.html"
    if html_candidate.exists():
        return html_candidate

    return None


def init_task_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(TASK_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                result_json TEXT,
                error TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def save_task(task_id: str, status: str, result=None, error: str | None = None):
    result_json = json.dumps(result, ensure_ascii=False) if result is not None else None
    with sqlite3.connect(TASK_DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO tasks (task_id, status, result_json, error, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(task_id) DO UPDATE SET
                status = excluded.status,
                result_json = excluded.result_json,
                error = excluded.error,
                updated_at = CURRENT_TIMESTAMP
            """,
            (task_id, status, result_json, error),
        )
        conn.commit()


def load_task(task_id: str):
    with sqlite3.connect(TASK_DB_PATH) as conn:
        row = conn.execute(
            "SELECT status, result_json, error FROM tasks WHERE task_id = ?",
            (task_id,),
        ).fetchone()

    if row is None:
        return None

    status, result_json, error = row
    payload = {"status": status}
    if result_json:
        payload["result"] = json.loads(result_json)
    if error:
        payload["error"] = error
    return payload


def validate_uploaded_file(file: UploadFile, expected_prefix: str):
    if not file.content_type or not file.content_type.startswith(expected_prefix):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported upload type. Expected a file with content type starting with '{expected_prefix}'.",
        )


def resolve_label_and_confidence(base_prediction: dict, analysis_label):
    base_label = base_prediction["label"]
    resolved_label = analysis_label or base_label
    resolved_confidence = float(base_prediction["confidence"]) if resolved_label == base_label else None
    return resolved_label, resolved_confidence


def build_fallback_analysis(prediction: dict, evidence: list[str], analysis: dict) -> dict:
    veracity_label = prediction["veracity"]["label"]
    confidence = float(prediction["veracity"]["confidence"])
    fallback_message = analysis.get("propaganda_anatomy") or "Reasoning provider unavailable. Returned local classifier and retrieval results only."

    if veracity_label == "real":
        verdict = "Supports"
    elif veracity_label in {"fake", "misleading"} and evidence:
        verdict = "Refutes"
    else:
        verdict = "Neutral"

    return {
        "llm_status": analysis.get("llm_status", "error"),
        "verdict": verdict,
        "veracity": veracity_label,
        "toxicity": prediction["toxicity"]["label"],
        "propaganda_anatomy": fallback_message,
        "detected_fallacies": [],
        "evidence_citations": [],
        "graph_relations": [],
        "reason": f"[FALLBACK] Local classifier result ({veracity_label}, {confidence:.0%} confidence). Retrieved {len(evidence)} evidence items while the reasoning provider was unavailable.",
        "historical_context": None,
        "debate_trace": {
            "bias_analyst": "",
            "prosecutor": "",
            "defense": "",
            "judge": fallback_message,
        },
    }


init_task_db()

def run_verification_task(task_id: str, text: str, vlm_context: str = None, c2pa_data: dict = None):
    """Background worker to run the heavy ML pipeline with caching."""
    logger.info(f"--- STARTING TASK {task_id} ---")
    try:
        # Cache key should incorporate vlm and c2pa if we want to be perfectly accurate,
        # but for hackathon scope, we keep it simple or just skip cache for complex multimodal
        if not vlm_context and not c2pa_data:
            cached = result_cache.get(text)
            if cached:
                save_task(task_id, "completed", result=cached)
                logger.info(f"--- TASK {task_id} served from cache ---")
                return

        save_task(task_id, "processing")
        data = process_full_verification(text, vlm_context, c2pa_data)
        if not vlm_context and not c2pa_data:
            result_cache.put(text, data)
        save_task(task_id, "completed", result=data)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logger.error(f"!!! ERROR in background task {task_id} !!!\n{error_msg}")
        save_task(task_id, "failed", error=str(e))
    logger.info(f"--- FINISHED TASK {task_id} ---")

@app.post("/verify")
async def verify_news(request: NewsRequest, background_tasks: BackgroundTasks, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait before submitting again.")
    task_id = str(uuid.uuid4())
    save_task(task_id, "pending")
    background_tasks.add_task(run_verification_task, task_id, request.text)
    return {"task_id": task_id, "status": "processing"}

@app.post("/verify-image")
async def verify_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    validate_uploaded_file(file, "image/")
    contents = await file.read()
    
    # 1. C2PA Provenance Check
    c2pa_data = verify_c2pa_metadata(contents)
    logger.info(f"C2PA Check: {c2pa_data}")

    try:
        image = Image.open(io.BytesIO(contents))
        image.verify() # Ensure it's a valid image
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc
    
    # 2. VLM Context Extraction
    try:
        vlm_context = analyze_image_with_vlm(contents)
        logger.info(f"VLM Analysis complete. Length: {len(vlm_context)}")
    except Exception as e:
        logger.error(f"VLM Analysis Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze image context.")

    if not vlm_context or "failed" in vlm_context.lower():
        raise HTTPException(status_code=400, detail="Failed to extract context from image.")
        
    task_id = str(uuid.uuid4())
    save_task(task_id, "pending")
    # For image, the VLM context serves as both the text claim and the visual context
    background_tasks.add_task(run_verification_task, task_id, vlm_context, vlm_context, c2pa_data)
    return {"task_id": task_id, "status": "processing"}

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    task = load_task(task_id)
    if task is None:
        return {"status": "failed", "error": "Task not found"}
    return task

def process_full_verification(text, vlm_context=None, c2pa_data=None):
    logger.info(f"Step 1: Classifying text...")
    prediction = classify(text)
    
    logger.info(f"Step 2: Search check...")
    if prediction["veracity"]["confidence"] < 0.6 or prediction["veracity"]["label"] == "unknown":
        logger.info(f"Low confidence, triggering live search...")
        urls = search_news(text)
        for url in urls:
            art = scrape_article(url)
            if art: 
                logger.info(f"Adding new evidence from {url}")
                add_new_evidence(art)

    logger.info(f"Step 3: RAG Retrieval...")
    evidence = retrieve_fact(text)

    logger.info(f"Step 4: LLM Analysis...")
    from models.reasoning import analyze_claim_with_llm
    analysis = analyze_claim_with_llm(text, evidence, vlm_context=vlm_context, c2pa_data=c2pa_data)
    if analysis.get("llm_status") != "ok":
        logger.warning("LLM reasoning unavailable; using classifier/RAG fallback response.")
        analysis = build_fallback_analysis(prediction, evidence, analysis)

    veracity_label, veracity_confidence = resolve_label_and_confidence(
        prediction["veracity"], analysis.get("veracity")
    )
    toxicity_label, toxicity_confidence = resolve_label_and_confidence(
        prediction["toxicity"], analysis.get("toxicity")
    )

    logger.info(f"Step 5: XAI Generation...")
    try:
        xai_attributions = explain_prediction(text, target_label=veracity_label)
    except Exception as e:
        logger.error(f"XAI Calculation Failed: {e}")
        xai_attributions = []

    knowledge_graph = build_claim_graph(
        text,
        evidence,
        evidence_citations=analysis.get("evidence_citations", []),
        graph_relations=analysis.get("graph_relations", []),
    )

    if vlm_context:
        summary_lines = [
            line.strip(" -*#\"'")
            for line in vlm_context.splitlines()
            if line.strip()
        ]
        display_claim = summary_lines[0] if summary_lines else text
    else:
        display_claim = text

    return {
        "claim": display_claim,
        "verdict": analysis.get("verdict", "Neutral"),
        "veracity": {
            "prediction": veracity_label,
            "confidence": veracity_confidence
        },
        "toxicity": {
            "prediction": toxicity_label,
            "confidence": toxicity_confidence
        },
        "propaganda_anatomy": analysis.get("propaganda_anatomy", "No manipulation anatomy detected."),
        "detected_fallacies": analysis.get("detected_fallacies", []),
        "c2pa_verification": c2pa_data if c2pa_data else {"is_verified": False, "details": "No C2PA checked or found."},
        "provenance_signals": {
            "has_visual_context": bool(vlm_context),
            "visual_context_excerpt": vlm_context if vlm_context else None,
            "source_mode": "multimodal" if vlm_context else "text",
            "evidence_count": len(evidence),
            "c2pa_available": bool(c2pa_data),
            "trusted_origin": bool(c2pa_data and c2pa_data.get("is_verified")),
        },
        "debate_trace": analysis.get("debate_trace", {
            "bias_analyst": "",
            "prosecutor": "",
            "defense": "",
            "judge": analysis.get("reason"),
        }),
        "evidence_citations": analysis.get("evidence_citations", []),
        "graph_relations": analysis.get("graph_relations", []),
        "generated_reason": analysis.get("reason"),
        "historical_context": analysis.get("historical_context"),
        "evidence": evidence,
        "knowledge_graph": knowledge_graph,
        "xai_attributions": xai_attributions,
        "xai_target_label": veracity_label
    }

import cv2
import numpy as np
from utils.feed_aggregator import get_live_feed

@app.get("/feed")
def fetch_intelligence_feed():
    return get_live_feed()

@app.post("/verify-video")
async def verify_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if VideoFileClip is None:
        raise HTTPException(status_code=503, detail="Video processing library (MoviePy) is missing on this server.")
    if not TESSERACT_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR Engine (Tesseract) is not installed on this server.")

    validate_uploaded_file(file, "video/")
    
    # 1. C2PA Provenance Check
    contents = await file.read()
    c2pa_data = verify_c2pa_metadata(contents, file_extension=".mp4")
    logger.info(f"C2PA Check (Video): {c2pa_data}")

    # Create temporary file for video
    temp_dir = Path(tempfile.gettempdir())
    video_filename = f"{uuid.uuid4()}.mp4"
    video_path = temp_dir / video_filename
    audio_path = video_path.with_suffix(".mp3")

    try:
        with open(video_path, "wb") as buffer:
            buffer.write(contents)

        # --- Step 1: Video OCR Extraction ---
        cap = cv2.VideoCapture(str(video_path))
        ocr_texts = []
        count = 0
        while cap.isOpened() and len(ocr_texts) < 10:
            ret, frame = cap.read()
            if not ret: break
            # Extract a frame every 30 frames (approx 1 sec)
            if count % 30 == 0:
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                text = pytesseract.image_to_string(pil_img).strip()
                if text and text not in ocr_texts:
                    ocr_texts.append(text)
            count += 1
        cap.release()
        ocr_context = " ".join(ocr_texts)

        # --- Step 2: Audio Extraction and Transcription ---
        video_clip = VideoFileClip(str(video_path))
        
        spoken_transcript = ""
        if video_clip and video_clip.audio is not None:
            logger.info("Extracting audio for transcription...")
            video_clip.audio.write_audiofile(str(audio_path), logger=None)
            
            # Transcribe using Faster-Whisper
            segments, info = whisper_model.transcribe(str(audio_path), beam_size=5)
            spoken_transcript = " ".join([segment.text for segment in segments]).strip()
        
        if video_clip:
            video_clip.close()

        # --- Step 3: Multimodal Context Combination ---
        full_context = f"{ocr_context} {spoken_transcript}".strip()
        logger.info(f"Context captured. Length: {len(full_context)} chars")

        if not full_context:
            return {"error": "No text or speech detected in video. SAMI requires context to analyze."}

        # --- Step 4: Background Task handoff ---
        task_id = str(uuid.uuid4())
        save_task(task_id, "pending")
        background_tasks.add_task(run_verification_task, task_id, full_context, full_context, c2pa_data)
        return {"task_id": task_id, "status": "processing"}

    except Exception as e:
        logger.error(f"ERROR in /verify-video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}") from e

    finally:
        # Cleanup temporary files
        if video_path.exists():
            video_path.unlink()
        if audio_path.exists():
            audio_path.unlink()

@app.get("/trending")
def get_trending():
    data_path = DATA_DIR / "trending_propaganda.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.get("/archive")
def get_archive():
    meta_path = DATA_DIR / "fact_metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            return metadata[-20:]
    return []

@app.get("/neural-stats")
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
        "ocr_available": TESSERACT_AVAILABLE,
        "video_support": VideoFileClip is not None,
        "groq_configured": llm_configured,
        "status": "Optimal" if pipeline_ready else "Degraded"
    }

@app.get("/system-status")
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

@app.get("/", include_in_schema=False)
def serve_frontend():
    frontend_index = resolve_frontend_asset("")
    if frontend_index is None:
        raise HTTPException(status_code=404, detail="Frontend entrypoint not found.")
    return FileResponse(frontend_index)


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_assets(full_path: str):
    asset_path = resolve_frontend_asset(full_path)
    if asset_path is None:
        frontend_index = resolve_frontend_asset("")
        if frontend_index is None:
            raise HTTPException(status_code=404, detail="Frontend asset not found.")
        return FileResponse(frontend_index)
    return FileResponse(asset_path)
