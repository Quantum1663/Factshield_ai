# FactShield AI (SAMI)

FactShield AI, also referred to in the codebase as SAMI (Social Integrity System), is an AI-assisted fact-checking and propaganda detection platform. It combines a local XLM-Roberta classifier, retrieval-augmented generation (RAG), Groq-hosted LLM reasoning, and explainable AI to analyze text, images, and videos.

## Repository Layout

```text
factshield/
  backend/    FastAPI API, ML pipeline, training scripts, tests
  frontend/   CDN-based React frontend
  .env        Runtime configuration for the backend
```

Additional design notes live in [factshield/ARCHITECTURE.md](/C:/Users/ansar/PycharmProjects/Majorproject_2.0/factshield/ARCHITECTURE.md) and [PROJECT_OVERVIEW.md](/C:/Users/ansar/PycharmProjects/Majorproject_2.0/PROJECT_OVERVIEW.md).

## Features

- Local multi-label claim classification with XLM-Roberta
- Evidence retrieval with FAISS and reranking
- Multi-agent LLM reasoning via Groq
- Explainable AI token attribution
- OCR support for images
- OCR plus transcription support for videos
- Background task tracking with SQLite

## Prerequisites

- Python 3.10+
- `pip`
- Tesseract OCR on your system `PATH` for image/video OCR
- FFmpeg available for video workflows recommended
- A trained classifier stored at `factshield/backend/factshield_model/`
- A Groq API key for the reasoning stage

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r factshield/requirements.txt
```

3. Create the runtime env file from the example:

```bash
cp factshield/.env.example factshield/.env
```

On Windows PowerShell:

```powershell
Copy-Item factshield\.env.example factshield\.env
```

4. Fill in `GROQ_API_KEY` in `factshield/.env`.
5. Ensure the trained classifier artifacts exist in `factshield/backend/factshield_model/`.

## Required Model Files

The backend exits during startup if the fine-tuned classifier is missing. The expected location is:

```text
factshield/backend/factshield_model/
```

This directory should contain the trained Hugging Face model artifacts such as `config.json`, tokenizer files, and model weights.

If you do not already have the model, train it first:

```bash
cd factshield/backend
python training/train_classifier.py
```

## Environment Variables

The backend reads configuration from `factshield/.env`.

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes for LLM reasoning | API key used by `models/reasoning.py` |
| `WHISPER_DEVICE` | No | Faster-Whisper device, defaults to `cpu` |
| `WHISPER_COMPUTE_TYPE` | No | Faster-Whisper compute type, defaults to `int8` |

## Running The App

Start the backend:

```bash
cd factshield/backend
uvicorn app:app --reload
```

The API serves the frontend entrypoint from `factshield/frontend/index.html`.

Once the backend is running, open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)
- [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Running Tests

```bash
cd factshield/backend
pytest tests/ -v
```

## Notes

- CORS is currently open for development.
- The in-memory cache and rate limiter reset on process restart.
- The current frontend is a single-file React prototype loaded via CDN.
