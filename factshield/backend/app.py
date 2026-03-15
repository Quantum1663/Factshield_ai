from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load secure environment variables
load_dotenv()

from rag.retrieval import retrieve_fact
from models.classifier import classify
from models.reasoning import generate_reason
from utils.live_search import search_news
from utils.web_scraper import scrape_article
from utils.vector_updater import add_new_evidence

from pathlib import Path
import faiss
import json

app = FastAPI(title="SAMI: Social Integrity System")

class NewsRequest(BaseModel):
    text: str

@app.post("/verify")
def verify_news(request: NewsRequest):
    text = request.text

    # Step 1: Multi-label classification
    prediction = classify(text)
    v_label = prediction["veracity"]["label"]
    v_conf = prediction["veracity"]["confidence"]
    t_label = prediction["toxicity"]["label"]
    t_conf = prediction["toxicity"]["confidence"]

    print(f"DEBUG: Veracity: {v_label} ({v_conf:.2f}), Toxicity: {t_label} ({t_conf:.2f})")

    # Step 2: Low confidence trigger (if EITHER is low, trigger live scraping)
    if v_conf < 0.6 or t_conf < 0.6:
        print("DEBUG: Confidence low. Triggering live search...")
        urls = search_news(text)
        for url in urls:
            article_text = scrape_article(url)
            if article_text:
                add_new_evidence(article_text)

    # Step 3: Retrieve evidence from Vector DB
    evidence = retrieve_fact(text)

    # Step 4: Dynamic Reasoning (Explainable AI)
    reason = generate_reason(text, v_label, t_label, evidence)

    # Step 5: Enhanced Response
    return {
        "claim": text,
        "veracity": {
            "prediction": v_label,
            "confidence": float(v_conf)
        },
        "toxicity": {
            "prediction": t_label,
            "confidence": float(t_conf)
        },
        "generated_reason": reason,
        "evidence": evidence
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