import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables at the absolute start
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

# Core logic imports - MUST stay after load_dotenv
from models.classifier import classify
from rag.retrieval import retrieve_fact
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence

from fastapi import FastAPI, middleware, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import faiss
import json
import pytesseract
from PIL import Image
import io
import tempfile
import uuid
from faster_whisper import WhisperModel
try:
    from moviepy import VideoFileClip
except ImportError:
    from moviepy.editor import VideoFileClip

# Initialize Faster-Whisper
whisper_model = WhisperModel("base", device="cpu", compute_type="int8")

# In-memory task store
tasks = {}

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

def run_verification_task(task_id: str, text: str):
    """Background worker to run the heavy ML pipeline."""
    try:
        tasks[task_id] = {"status": "processing"}
        results = process_full_verification(text)
        tasks[task_id] = {
            "status": "completed",
            "results": results
        }
    except Exception as e:
        print(f"Error in background task {task_id}: {str(e)}")
        tasks[task_id] = {"status": "failed", "error": str(e)}

@app.post("/verify")
async def verify_news(request: NewsRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "pending"}
    background_tasks.add_task(run_verification_task, task_id, request.text)
    return {"task_id": task_id, "status": "processing"}

@app.post("/verify-image")
async def verify_image(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # OCR is relatively fast, but let's keep it in the main flow to get the text
    extracted_text = pytesseract.image_to_string(image).strip()
    
    if not extracted_text:
        return {"error": "No text detected in image."}
        
    task_id = str(uuid.uuid4())
    tasks[task_id] = {"status": "pending"}
    background_tasks.add_task(run_verification_task, task_id, extracted_text)
    return {"task_id": task_id, "status": "processing"}

@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        return {"error": "Task not found"}
    return tasks[task_id]

def process_full_verification(text):
    # Step 1: Fast Multi-label classification (Local BERT)
    prediction = classify(text)
    
    # Step 2: Live Search Trigger
    if prediction["veracity"]["confidence"] < 0.6 or prediction["veracity"]["label"] == "unknown":
        urls = search_news(text)
        for url in urls:
            art = scrape_article(url)
            if art: add_new_evidence(art)

    # Step 3: RAG Retrieval
    evidence = retrieve_fact(text)

    # Step 4: Llama 3.3 V3 Deconstruction
    from models.reasoning import analyze_claim_with_llm
    analysis = analyze_claim_with_llm(text, evidence)

    return {
        "claim": text,
        "veracity": {
            "prediction": analysis.get("veracity", prediction["veracity"]["label"]),
            "confidence": float(prediction["veracity"]["confidence"] if analysis.get("veracity") == prediction["veracity"]["label"] else 0.85)
        },
        "toxicity": {
            "prediction": analysis.get("toxicity", prediction["toxicity"]["label"]),
            "confidence": float(prediction["toxicity"]["confidence"])
        },
        "propaganda_anatomy": analysis.get("propaganda_anatomy", []),
        "generated_reason": analysis.get("reason"),
        "historical_context": analysis.get("historical_context"),
        "evidence": evidence
    }

import cv2
import numpy as np
from utils.feed_aggregator import get_live_feed

@app.get("/feed")
def fetch_intelligence_feed():
    return get_live_feed()

@app.post("/verify-video")
async def verify_video(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    # Create temporary file for video
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
        temp_video.write(await file.read())
        video_path = temp_video.name

    try:
        # --- Step 1: Video OCR Extraction ---
        cap = cv2.VideoCapture(video_path)
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
        audio_path = video_path.replace(".mp4", ".mp3")
        video_clip = VideoFileClip(video_path)
        
        spoken_transcript = ""
        if video_clip.audio is not None:
            print("DEBUG: Extracting audio for transcription...")
            video_clip.audio.write_audiofile(audio_path, logger=None)
            
            # Transcribe using Faster-Whisper
            segments, info = whisper_model.transcribe(audio_path, beam_size=5)
            spoken_transcript = " ".join([segment.text for segment in segments]).strip()
            
            # Cleanup audio file immediately
            if os.path.exists(audio_path):
                os.remove(audio_path)
        
        video_clip.close()

        # --- Step 3: Multimodal Context Combination ---
        full_context = f"{ocr_context} {spoken_transcript}".strip()
        print(f"DEBUG: OCR Context -> {ocr_context[:100]}...")
        print(f"DEBUG: Spoken Context -> {spoken_transcript[:100]}...")

        if not full_context:
            return {"error": "No text or speech detected in video. SAMI requires context to analyze."}

        # --- Step 4: Background Task handoff ---
        task_id = str(uuid.uuid4())
        tasks[task_id] = {"status": "pending"}
        background_tasks.add_task(run_verification_task, task_id, full_context)
        return {"task_id": task_id, "status": "processing"}

    except Exception as e:
        print(f"ERROR in /verify-video: {str(e)}")
        return {"error": f"Video processing failed: {str(e)}"}

    finally:
        # Cleanup temporary files
        if os.path.exists(video_path):
            os.remove(video_path)
        audio_path = video_path.replace(".mp4", ".mp3")
        if os.path.exists(audio_path):
            os.remove(audio_path)

@app.get("/trending")
def get_trending():
    data_path = Path(__file__).resolve().parent / "data" / "trending_propaganda.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.get("/archive")
def get_archive():
    meta_path = Path(__file__).resolve().parent / "data" / "fact_metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            # Return last 20 ingested items to show "learning"
            return metadata[-20:]
    return []

@app.get("/neural-stats")
def get_neural_stats():
    return {
        "local_classifier": "XLm-Roberta (Active)",
        "vector_engine": "FAISS L2-Flat",
        "memory_count": 0, # Will be updated in system-status
        "reranker": "Cross-Encoder MiniLM",
        "reasoner": "Llama 3.3 (via Groq)",
        "status": "Optimal"
    }

@app.get("/system-status")
def system_status():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"

    index_path = data_dir / "fact_index.faiss"
    meta_path = data_dir / "fact_metadata.json"

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