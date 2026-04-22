import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from faster_whisper import WhisperModel

# --- 1. Environment & Logging Setup ---
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 2. Shared ML Models & Services ---
from services.model_loader import get_whisper_model
# Initialize whisper on startup
get_whisper_model()

# --- 3. App Initialization ---
app = FastAPI(
    title="SAMI: Social Integrity System",
    description="Advanced AI-powered fact-checking and propaganda detection platform.",
    version="2.0.0"
)

# PERMISSIVE CORS: Set to "*" for the final presentation to avoid network errors
# In a production environment, restrict this to trusted origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. Database Initialization ---
from utils.db_manager import init_task_db
init_task_db()

# --- 5. Routers ---
from routers import verify, system
app.include_router(verify.router, tags=["Verification"])
app.include_router(system.router, tags=["System Intelligence"])

# --- 6. Frontend Serving ---
LEGACY_FRONTEND_DIR = BASE_DIR.parent / "frontend"
FRONTEND_V3_DIR = BASE_DIR.parent / "frontend-v3"
FRONTEND_V3_EXPORT_DIR = FRONTEND_V3_DIR / "out"

def get_frontend_root() -> Path:
    # Prefer Next.js export if it exists, otherwise fallback to legacy
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

@app.get("/", include_in_schema=False)
def serve_frontend():
    frontend_index = resolve_frontend_asset("")
    if frontend_index is None:
        raise HTTPException(status_code=404, detail="Frontend entrypoint not found.")
    return FileResponse(frontend_index)

@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend_assets(full_path: str):
    # Skip for API docs
    if full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return None 
        
    asset_path = resolve_frontend_asset(full_path)
    if asset_path is None:
        # SPA Fallback: serve index.html for unknown routes to let React/Next handle it
        frontend_index = resolve_frontend_asset("")
        if frontend_index is None:
            raise HTTPException(status_code=404, detail="Frontend asset not found.")
        return FileResponse(frontend_index)
    return FileResponse(asset_path)
