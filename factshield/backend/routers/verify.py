import logging
import uuid
import io
import tempfile
import shutil
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError
import cv2
import pytesseract

from utils.cache_manager import rate_limiter
from utils.db_manager import save_task, load_task
from utils.c2pa_checker import verify_c2pa_metadata
from models.vision import analyze_image_with_vlm
from services.verification_service import run_verification_task

# Try to import MoviePy
try:
    from moviepy import VideoFileClip
except ImportError:
    try:
        from moviepy.editor import VideoFileClip
    except ImportError:
        VideoFileClip = None

# OCR Availability check
TESSERACT_AVAILABLE = shutil.which("tesseract") is not None

logger = logging.getLogger(__name__)

router = APIRouter()

class NewsRequest(BaseModel):
    text: str

def validate_uploaded_file(file: UploadFile, expected_prefix: str):
    if not file.content_type or not file.content_type.startswith(expected_prefix):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported upload type. Expected a file with content type starting with '{expected_prefix}'.",
        )

@router.post("/verify")
async def verify_news(request: NewsRequest, background_tasks: BackgroundTasks, req: Request):
    client_ip = req.client.host if req.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait before submitting again.")
    task_id = str(uuid.uuid4())
    save_task(task_id, "pending")
    background_tasks.add_task(run_verification_task, task_id, request.text)
    return {"task_id": task_id, "status": "processing"}

@router.post("/verify-image")
async def verify_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    validate_uploaded_file(file, "image/")
    
    # IMPROVEMENT: Use a temporary file for large image processing
    temp_dir = Path(tempfile.gettempdir())
    temp_path = temp_dir / f"{uuid.uuid4()}.img"
    
    try:
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
            
        # 1. C2PA Provenance Check
        c2pa_data = verify_c2pa_metadata(contents)
        logger.info(f"C2PA Check: {c2pa_data}")

        try:
            image = Image.open(temp_path)
            image.verify()
        except UnidentifiedImageError as exc:
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc

        # 2. VLM Context Extraction
        try:
            # Re-open for reading since verify() can close it or mess with the pointer
            with open(temp_path, "rb") as f:
                img_bytes = f.read()
            vlm_context = analyze_image_with_vlm(img_bytes)
            logger.info(f"VLM Analysis complete. Length: {len(vlm_context)}")
        except Exception as e:
            logger.error(f"VLM Analysis Failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to analyze image context.")

        if not vlm_context or "failed" in vlm_context.lower():
            raise HTTPException(status_code=400, detail="Failed to extract context from image.")

        task_id = str(uuid.uuid4())
        save_task(task_id, "pending")
        background_tasks.add_task(run_verification_task, task_id, vlm_context, vlm_context, c2pa_data)
        return {"task_id": task_id, "status": "processing"}
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.post("/verify-video")
async def verify_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    from services.model_loader import get_whisper_model
    whisper_model = get_whisper_model()
    
    if VideoFileClip is None:
        raise HTTPException(status_code=503, detail="Video processing library (MoviePy) is missing on this server.")
    if not TESSERACT_AVAILABLE:
        raise HTTPException(status_code=503, detail="OCR Engine (Tesseract) is not installed on this server.")

    validate_uploaded_file(file, "video/")

    contents = await file.read()
    c2pa_data = verify_c2pa_metadata(contents, file_extension=".mp4")
    
    temp_dir = Path(tempfile.gettempdir())
    video_filename = f"{uuid.uuid4()}.mp4"
    video_path = temp_dir / video_filename
    audio_path = temp_dir / Path(video_filename).with_suffix(".mp3").name

    try:
        with open(video_path, "wb") as buffer:
            buffer.write(contents)

        cap = cv2.VideoCapture(str(video_path))
        ocr_texts = []
        count = 0
        while cap.isOpened() and len(ocr_texts) < 10:
            ret, frame = cap.read()
            if not ret: break
            if count % 30 == 0:
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                text = pytesseract.image_to_string(pil_img).strip()
                if text and text not in ocr_texts:
                    ocr_texts.append(text)
            count += 1
        cap.release()
        ocr_context = " ".join(ocr_texts)

        video_clip = VideoFileClip(str(video_path))
        spoken_transcript = ""
        if video_clip and video_clip.audio is not None:
            video_clip.audio.write_audiofile(str(audio_path), logger=None)
            segments, info = whisper_model.transcribe(str(audio_path), beam_size=5)
            spoken_transcript = " ".join([segment.text for segment in segments]).strip()

        if video_clip:
            video_clip.close()

        full_context = f"{ocr_context} {spoken_transcript}".strip()
        if not full_context:
            return {"error": "No text or speech detected in video. SAMI requires context to analyze."}

        task_id = str(uuid.uuid4())
        save_task(task_id, "pending")
        background_tasks.add_task(run_verification_task, task_id, full_context, None, c2pa_data)
        return {"task_id": task_id, "status": "processing"}

    except Exception as e:
        logger.error(f"ERROR in /verify-video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}") from e
    finally:
        if video_path.exists(): video_path.unlink()
        if audio_path.exists(): audio_path.unlink()

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    task = load_task(task_id)
    if task is None:
        return {"status": "failed", "error": "Task not found"}
    return task
