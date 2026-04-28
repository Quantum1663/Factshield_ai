# FactShield Project Report

## 1. Project Title

FactShield: An Explainable Misinformation Verification and Analyst Workflow Platform

## 2. Abstract

FactShield is a misinformation verification system designed to analyze suspicious claims, retrieve supporting or conflicting evidence, generate an explainable verdict, and operationalize the result through a modern SaaS-style workflow. The project combines machine learning, retrieval-augmented generation, multimodal input handling, explainable AI, and analyst-facing product features such as reports, assignments, settings control, and downloadable exports.

The system addresses a practical problem: misinformation review is often fragmented across multiple tools, making it difficult to move from raw claim intake to a trustworthy final decision. FactShield improves this process by unifying verification, evidence retrieval, reasoning, explainability, and review operations inside one system.

## 3. Problem Statement

Digital misinformation spreads rapidly across text posts, screenshots, edited images, and short-form video. In many real settings, analysts or reviewers must manually search for sources, compare conflicting narratives, and produce decisions that others can trust. This creates several problems:

- manual verification is slow compared to the speed of misinformation spread
- evidence gets scattered across tabs, notes, and communication tools
- model-only outputs are difficult to justify to a reviewer or supervisor
- traditional demos often stop at classification and do not support real workflow

The project therefore asks:

How can we design a system that not only predicts whether a claim is false or misleading, but also retrieves evidence, explains its reasoning, and supports the real workflow of verification teams?

## 4. Motivation

The motivation for FactShield comes from the gap between research-style misinformation detection systems and real analyst needs. A classifier alone is not enough for practical use. Decision-makers need:

- the claim being analyzed
- a clear verdict
- traceable evidence
- confidence indicators
- reasoning context
- assignment and approval flow
- exportable reporting output

FactShield was built to bridge that gap.

## 5. Objectives

The main objectives of the project are:

1. Build a system that can verify textual claims and support image and video-based verification through extracted text.
2. Combine classification, retrieval, reasoning, and explainability in a single pipeline.
3. Detect both veracity signals and toxic or hateful content.
4. Provide evidence-backed output instead of a raw label only.
5. Design a product interface that supports analysts, reviewers, and reporting workflows.
6. Persist results through reports, investigations, assignments, and settings-aware workspace features.

## 6. Scope of the Project

### Included Scope

- text claim verification
- image verification through OCR and visual language model context extraction
- video verification through OCR and speech transcription
- FAISS-backed retrieval over evidence vectors
- LLM-based structured reasoning
- explainability output
- report generation and export
- team assignment workflow
- settings persistence
- SaaS-style frontend redesign

### Out of Scope

- fully automated fact-check publishing to public platforms
- large-scale production cloud deployment
- complete multilingual UI localization
- extensive live moderation automation
- comprehensive legal or policy adjudication engine

## 7. Existing Gap

Existing verification approaches often fall into one of the following categories:

1. Manual verification workflows:
   - high effort
   - slow evidence gathering
   - poor continuity between analysts

2. Label-only machine learning models:
   - produce predictions without strong explanation
   - difficult to trust in high-impact decisions

3. Static dashboards:
   - visually informative but operationally shallow
   - often disconnected from saved investigations and reporting flow

FactShield improves on this by connecting model intelligence to a persistent analyst workflow.

## 8. Proposed Solution

FactShield is designed as an end-to-end verification platform with the following stages:

1. input ingestion
2. claim classification
3. live search and evidence retrieval
4. debate-based reasoning
5. explainability generation
6. reporting and workspace operations

The system is built so that the final artifact is not just a prediction. It is a reviewable, explainable, and exportable verification result.

## 9. System Overview

FactShield consists of two major layers:

### Frontend

A Next.js-based SaaS interface that provides:

- verification console
- live feed
- trending narratives
- archive
- reports
- team workspace
- settings workspace

### Backend

A FastAPI backend that provides:

- verification endpoints
- task processing
- retrieval health monitoring
- system status endpoints
- reports and investigations APIs
- team and settings APIs
- export functionality

## 10. High-Level Architecture

The overall architecture has the following flow:

1. User submits a claim or media artifact.
2. Backend validates the input and creates a task.
3. Verification pipeline processes the claim in the background.
4. Retrieval and reasoning generate the result.
5. Result is stored in SQLite-backed task records.
6. Frontend polls task status and renders the output.
7. Completed investigations can be surfaced as reports, team assignments, and exports.

## 11. Core Backend Modules

### 11.1 `backend/app.py`

Application entry point for the FastAPI backend.

### 11.2 `backend/routers/verify.py`

Handles:

- `POST /verify`
- `POST /verify-image`
- `POST /verify-video`
- `GET /task-status/{task_id}`

Responsibilities:

- request validation
- file content-type checks
- rate limiting
- task creation
- OCR and video preprocessing
- passing work to the verification service

### 11.3 `backend/routers/system.py`

Handles:

- feed and trending endpoints
- system status and retrieval health
- report and investigation endpoints
- team workspace endpoints
- settings workspace endpoints
- export endpoints
- normalization and rebuild utility routes

This router also contains the logic for:

- workspace state persistence
- report metadata overrides
- reviewer notes and approval status
- assignment mapping
- settings control persistence
- export text cleanup

### 11.4 `backend/services/verification_service.py`

Coordinates the full verification task pipeline and stores results.

### 11.5 `backend/models/classifier.py`

Implements the XLM-Roberta-based classifier used for veracity and toxicity-related prediction signals.

### 11.6 `backend/rag/vector_store.py` and `backend/rag/retrieval.py`

Provide vector storage and retrieval functionality using FAISS and reranking logic.

### 11.7 `backend/models/reasoning.py`

Runs the multi-agent reasoning stage and produces structured verdict output.

### 11.8 `backend/models/interpretability.py`

Generates explainability output using token-level attribution methods.

### 11.9 `backend/models/vision.py`

Supports image analysis and visual context extraction for multimodal verification.

### 11.10 `backend/utils/db_manager.py`

Stores and retrieves task records, supports listing completed tasks, and includes normalization helpers used during project refinement.

## 12. Verification Pipeline

### Step 1: Classification

The system first normalizes the text and runs classification using a fine-tuned XLM-Roberta model. The model predicts:

- veracity-related labels
- toxicity-related labels

This stage provides an initial signal for downstream verification.

### Step 2: Search and Evidence Ingestion

If confidence is weak or additional context is needed, the system performs live search and source collection. Evidence candidates are filtered and chunked for retrieval.

### Step 3: Retrieval-Augmented Generation

Evidence chunks are embedded and compared using a FAISS vector index. The system performs:

- broad semantic retrieval
- reranking
- duplicate filtering

This helps the system gather the most relevant evidence before reasoning.

### Step 4: Multi-Agent Reasoning

The reasoning stage is debate-based:

- prosecutor argues why the claim may be false or misleading
- defense argues why it may be true or nuanced
- judge synthesizes the final structured decision

This produces:

- verdict
- generated reason
- historical context
- evidence summary

### Step 5: Explainability

Explainability output is generated using token occlusion logic. This helps show which input words had the strongest influence on a prediction.

## 13. Multimodal Support

### Text Input

Directly sent through the verification pipeline.

### Image Input

Processing includes:

- upload validation
- C2PA provenance check
- image verification
- VLM-based context extraction
- pipeline verification using extracted context

### Video Input

Processing includes:

- upload validation
- frame sampling
- OCR on frames
- audio extraction
- transcription using Whisper
- combined text verification

## 14. Frontend Design and SaaS Redesign

The original frontend experience was upgraded into a more complete SaaS-style workspace. The frontend now includes:

- a shared shell and workspace header
- a command-style verification console
- a review queue
- reports page backed by live backend data
- team page with assignment flows
- settings page with persisted workspace controls
- archive, feed, and trending pages aligned to the same design language

Key frontend files include:

- `frontend-v3/app/page.tsx`
- `frontend-v3/app/reports/page.tsx`
- `frontend-v3/app/team/page.tsx`
- `frontend-v3/app/settings/page.tsx`
- `frontend-v3/lib/api.ts`
- `frontend-v3/components/CommandCenter.tsx`
- `frontend-v3/components/WorkspaceHeader.tsx`
- `frontend-v3/components/Toast.tsx`

## 15. Reports and Workflow Features Added

During project refinement, FactShield gained several important workflow features:

### Reports

- backend-backed report records
- report detail views
- metadata editing for title, owner, and audience
- reviewer notes
- approval status
- reviewer name
- approval timestamp
- real export endpoint returning downloadable markdown reports

### Team Workspace

- live team summary
- investigation list
- assignee selection
- persisted assignment mapping

### Settings Workspace

- editable control cards
- persisted values, status, and details
- workspace plan and environment summary

## 16. Data and Persistence

The project stores and uses multiple data assets, including:

- `fact_checks.json`
- `fact_metadata.json`
- `tasks.db`
- `workspace_state.json`
- training dataset files
- trending narrative data

SQLite is used for task persistence, while a JSON file is used for lightweight workspace state such as:

- report metadata
- assignments
- control overrides
- plan and policy information

## 17. Security and Validation

The backend includes several safety and validation measures:

- request rate limiting
- minimum claim length validation
- content-type validation for uploads
- SSRF protection in source retrieval logic
- prompt-injection sanitization
- C2PA verification hooks for media provenance

## 18. Testing and Verification

The project includes backend tests in `backend/tests/`, such as:

- classifier tests
- RAG tests
- reasoning tests
- utility tests
- API tests

During the recent refinement phase, we also performed live functional checks, including:

- reports endpoint verification
- team workspace verification
- settings workspace verification
- report export verification
- persistence verification for metadata, assignments, and controls

## 19. Scenario Testing Before Presentation

To prepare for presentation, the system was tested with controlled scenarios:

1. Factual claim:
   - supported verdict
   - real veracity prediction
   - safe toxicity

2. Misleading political claim:
   - refuted verdict
   - fake veracity prediction

3. Toxic claim:
   - refuted or misleading classification path
   - hate-related toxicity output

4. Invalid tiny input:
   - rejected with validation error

This helped identify which live demo paths are strongest.

## 20. Strengths of the Project

- combines multiple verification stages in one system
- moves beyond label-only outputs
- supports multimodal inputs
- offers evidence-backed reasoning
- includes explainability
- provides operational SaaS workflow features
- supports persistence and export
- presentation-ready interface

## 21. Limitations

- vague claims can still receive stronger verdicts than ideal
- image and video workflows need broader real-world validation
- retrieval quality still depends on source availability
- uncertainty handling for weak claims can be improved
- production deployment hardening is still future work

## 22. Future Enhancements

Future work can include:

- stronger uncertainty estimation
- better ambiguity handling
- expanded multilingual support
- deeper multimodal provenance checks
- richer reviewer audit history
- role-based access control
- cloud deployment and scalability work
- stronger report export formats such as PDF and DOCX

## 23. Conclusion

FactShield demonstrates that misinformation verification should be treated as both a technical and operational problem. The project successfully combines machine learning, retrieval, reasoning, explainability, persistence, and product workflow into one cohesive platform. Its strongest contribution is not a single model, but the complete path from suspicious claim to evidence-backed, reviewable, and exportable decision.
