import os
from dotenv import load_dotenv
from pathlib import Path
import sqlite3
import shutil
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables at the absolute start
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

# Core logic imports - MUST stay after load_dotenv
from models.classifier import classify
from models.interpretability import explain_prediction
from rag.retrieval import retrieve_fact
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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


init_task_db()

def run_verification_task(task_id: str, text: str):
    """Background worker to run the heavy ML pipeline."""
    logger.info(f"--- STARTING TASK {task_id} ---")
    try:
        save_task(task_id, "processing")
        data = process_full_verification(text)
        save_task(task_id, "completed", result=data)
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logger.error(f"!!! ERROR in background task {task_id} !!!\n{error_msg}")
        save_task(task_id, "failed", error=str(e))
    logger.info(f"--- FINISHED TASK {task_id} ---")

@app.post("/verify")
async def verify_news(request: NewsRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    save_task(task_id, "pending")
    background_tasks.add_task(run_verification_task, task_id, request.text)
    return {"task_id": task_id, "status": "processing"}

@app.post("/verify-image")
async def verify_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not TESSERACT_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR Engine (Tesseract) is not installed on this server.")

    validate_uploaded_file(file, "image/")
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc
    
    try:
        extracted_text = pytesseract.image_to_string(image).strip()
    except Exception as e:
        logger.error(f"OCR Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract text from image.")

    if not extracted_text:
        raise HTTPException(status_code=400, detail="No text detected in image.")
        
    task_id = str(uuid.uuid4())
    save_task(task_id, "pending")
    background_tasks.add_task(run_verification_task, task_id, extracted_text)
    return {"task_id": task_id, "status": "processing"}

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    task = load_task(task_id)
    if task is None:
        return {"status": "failed", "error": "Task not found"}
    return task

def process_full_verification(text):
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
    analysis = analyze_claim_with_llm(text, evidence)

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

    return {
        "claim": text,
        "veracity": {
            "prediction": veracity_label,
            "confidence": veracity_confidence
        },
        "toxicity": {
            "prediction": toxicity_label,
            "confidence": toxicity_confidence
        },
        "propaganda_anatomy": analysis.get("propaganda_anatomy", "No manipulation anatomy detected."),
        "generated_reason": analysis.get("reason"),
        "historical_context": analysis.get("historical_context"),
        "evidence": evidence,
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
    
    # Create temporary file for video
    temp_dir = Path(tempfile.gettempdir())
    video_filename = f"{uuid.uuid4()}.mp4"
    video_path = temp_dir / video_filename
    audio_path = temp_dir / video_filename.with_suffix(".mp3").name

    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

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
        background_tasks.add_task(run_verification_task, task_id, full_context)
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
    return {
        "local_classifier": "XLm-Roberta (Active)",
        "vector_engine": "FAISS L2-Flat",
        "memory_count": 0,
        "reranker": "Cross-Encoder MiniLM",
        "reasoner": "Llama 3.3 (via Groq)",
        "status": "Optimal"
    }

@app.get("/system-status")
def system_status():
    index_path = DATA_DIR / "fact_index.faiss"
    meta_path = DATA_DIR / "fact_metadata.json"

    dataset_size = 0
    index_size = 0

    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            dataset_size = len(metadata)

    if index_path.exists():
        index = faiss.read_index(str(index_path))
        index_size = index.ntotal

    return {
        "system": "SAMI AI",
        "model_status": "loaded (Multi-Label)",
        "dataset_entries": dataset_size,
        "faiss_vectors": index_size,
        "api_status": "running"
    }
