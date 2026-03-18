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

from fastapi import FastAPI, middleware, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import faiss
import json
import pytesseract
from PIL import Image
import io

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

@app.post("/verify")
def verify_news(request: NewsRequest):
    text = request.text
    return process_full_verification(text)

@app.post("/verify-image")
async def verify_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # Extract text using OCR
    extracted_text = pytesseract.image_to_string(image)
    print(f"DEBUG: OCR Extracted -> {extracted_text[:100]}...")
    
    if not extracted_text.strip():
        return {"error": "No text detected in image. SAMI currently requires text-based propaganda to analyze."}
        
    return process_full_verification(extracted_text)

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
async def verify_video(file: UploadFile = File(...)):
    # Save video temporarily to process frames
    temp_path = "temp_video.mp4"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())
    
    cap = cv2.VideoCapture(temp_path)
    frames_to_check = []
    count = 0
    while cap.isOpened() and len(frames_to_check) < 5:
        ret, frame = cap.read()
        if not ret: break
        # Extract a frame every 30 frames (approx 1 sec)
        if count % 30 == 0:
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            text = pytesseract.image_to_string(pil_img)
            if text.strip(): frames_to_check.append(text)
        count += 1
    cap.release()
    os.remove(temp_path)
    
    full_transcript = " ".join(frames_to_check)
    print(f"DEBUG: Video OCR Transcript -> {full_transcript[:100]}...")
    
    if not full_transcript.strip():
        return {"error": "No significant text detected in video frames. SAMI requires text or speech context to analyze."}
        
    return process_full_verification(full_transcript)

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