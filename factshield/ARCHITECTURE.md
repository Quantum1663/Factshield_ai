# SAMI: System Architecture Document

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Overview  │  │   Feed   │  │ Trending │  │   Archive    │ │
│  └─────┬────┘  └─────┬────┘  └────┬─────┘  └──────┬───────┘ │
│        └──────────────┴────────────┴───────────────┘         │
│                          │ REST API                           │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                   FastAPI Backend                             │
│                          │                                    │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │           Verification Pipeline (Background)           │   │
│  │                                                        │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────┐  ┌──────────┐  │   │
│  │  │ Step 1  │→ │  Step 2  │→ │Step 3 │→ │  Step 4  │  │   │
│  │  │Classify │  │ Search + │  │  RAG  │  │   LLM    │  │   │
│  │  │(XLM-R)  │  │  Scrape  │  │(FAISS)│  │(Llama3.3)│  │   │
│  │  └─────────┘  └──────────┘  └───────┘  └──────────┘  │   │
│  │                                              │         │   │
│  │                                         ┌────┴─────┐   │   │
│  │                                         │  Step 5  │   │   │
│  │                                         │   XAI    │   │   │
│  │                                         │Occlusion │   │   │
│  │                                         └──────────┘   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Cache   │  │ Rate Limiter │  │  Task Queue (SQLite)    │ │
│  │(In-Mem)  │  │  (In-Mem)    │  │  Background Processing  │ │
│  └──────────┘  └──────────────┘  └─────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## 2. Verification Pipeline

### Step 1: Classification (Local XLM-Roberta)
- **Model**: Fine-tuned `xlm-roberta-base` for multi-label classification
- **Labels**: 7-class (`real`, `fake`, `misleading`, `veracity_unknown`, `hate`, `safe`, `toxicity_unknown`)
- **Loss**: BCEWithLogitsLoss (multi-label)
- **Activation**: Sigmoid (not softmax) — each label is independently scored
- **Device**: Auto-detects CUDA, falls back to CPU with float32 casting

### Step 2: Live Search & Evidence Ingestion
- **Trigger**: Activated when classifier confidence < 0.6 or label is `unknown`
- **Source**: Bing News RSS feed
- **Filtering**: Unreliable sources (infowars, breitbart, etc.) are excluded; trusted sources prioritized
- **SSRF Protection**: URL validation blocks private IPs, localhost, and non-HTTP protocols
- **Chunking**: Articles are split into 60-word overlapping chunks for vector ingestion

### Step 3: RAG (Retrieval-Augmented Generation)
- **Vector Store**: FAISS IndexFlatL2 with L2-normalized embeddings (cosine similarity approximation)
- **Embeddings**: `paraphrase-multilingual-mpnet-base-v2` (768-dim)
- **Retrieval**: Two-stage — broad FAISS search (k=10) → Cross-Encoder reranking (`cross-encoder/ms-marco-MiniLM-L-6-v2`)
- **Deduplication**: Semantic dedup via L2 distance threshold (< 0.1 = ~95% similarity)

### Step 4: LLM Reasoning (Multi-Agent Debate)
- **Model**: Llama 3.3 70B via Groq API
- **Architecture**: 3-agent sequential debate
  - **Prosecutor**: Builds case for claim being false/misleading
  - **Defense**: Argues for truth, nuance, or missing context
  - **Judge**: Weighs both sides, produces structured JSON verdict
- **Output**: Veracity, toxicity, propaganda anatomy, historical context, reasoning
- **Safety**: Input sanitization strips prompt injection patterns before LLM submission

### Step 5: Explainable AI (XAI)
- **Method**: Token-level occlusion attribution
- **Mechanism**: For each token, mask it and measure the logit change for the target class
- **Attribution Score**: `base_logit - masked_logit` (positive = token supports prediction)
- **Subword Handling**: Maps XLM-Roberta subword tokens back to whole words

## 3. Multimodal Support

| Input Type | Processing Pipeline |
|---|---|
| **Text** | Direct classification → RAG → LLM → XAI |
| **Image** | Tesseract OCR → text extraction → standard pipeline |
| **Video** | Frame sampling (every 30 frames) → OCR + Faster-Whisper transcription → combined text → standard pipeline |

## 4. Data Pipeline

```
Raw Sources                     Processing               Training
┌──────────┐                   ┌────────────┐           ┌──────────────┐
│ NewsAPI   │──┐               │ Text Clean │           │ XLM-Roberta  │
│ Reddit    │  ├──→ Ingestion──→ Dedup      ├──→ Aug ──→ Fine-tune     │
│ RSS Feeds │  │               │ Lang Detect│    │      │ (85/15 split)│
│ HuggingFace──┘               └────────────┘    │      └──────────────┘
                                                  │
                                          ┌───────┴────────┐
                                          │ Paraphrase (T5) │
                                          │ Translate (5 lang)│
                                          └────────────────┘
```

## 5. Infrastructure

| Component | Technology | Purpose |
|---|---|---|
| **Web Framework** | FastAPI | Async API with background task support |
| **Task Queue** | SQLite + BackgroundTasks | Persistent task status tracking |
| **Vector Database** | FAISS (CPU) | Semantic similarity search |
| **Result Cache** | In-memory LRU (100 entries, 10min TTL) | Avoid re-processing identical claims |
| **Rate Limiter** | In-memory (15 req/min per IP) | Prevent API abuse |
| **Frontend** | React 18 (CDN) + Tailwind CSS | Single-page application |
| **Transcription** | Faster-Whisper (base, int8) | Audio-to-text for video analysis |
| **OCR** | Tesseract | Image/video frame text extraction |

## 6. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/verify` | Submit text claim for verification (returns task_id) |
| POST | `/verify-image` | Upload image for OCR + verification |
| POST | `/verify-video` | Upload video for OCR + transcription + verification |
| GET | `/task-status/{id}` | Poll background task status |
| GET | `/feed` | Live intelligence feed (news + social alerts) |
| GET | `/trending` | Curated trending propaganda patterns |
| GET | `/archive` | Recent evidence from the knowledge base |
| GET | `/neural-stats` | Active ML model information |
| GET | `/system-status` | System health and vector store metrics |

## 7. Security Measures

- **Prompt Injection Defense**: Input sanitization strips control characters and injection patterns before LLM submission
- **SSRF Protection**: URL validation in web scraper blocks private networks, localhost, and non-HTTP protocols
- **Rate Limiting**: 15 requests per minute per client IP
- **API Key Management**: All secrets stored in `.env` (gitignored), never hardcoded
- **Input Validation**: File type and size checks on upload endpoints
- **CORS**: Configured for cross-origin access (development mode)

## 8. Testing

Tests are located in `backend/tests/` and use pytest:

```bash
cd factshield/backend
pytest tests/ -v
```

| Test Module | Coverage |
|---|---|
| `test_classifier.py` | Classifier output structure, label validity, confidence ranges, edge cases |
| `test_rag.py` | Retrieval output format, k-parameter, empty query handling |
| `test_reasoning.py` | Prompt sanitization, mocked LLM responses, error handling, output structure |
| `test_api.py` | All API endpoints, rate limiting, caching, input validation |
| `test_utils.py` | SSRF protection, source filtering logic |
