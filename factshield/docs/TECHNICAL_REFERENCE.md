# FactShield Technical Reference

## 1. Project Structure

```text
factshield/
  backend/
    app.py
    routers/
    services/
    models/
    rag/
    utils/
    training/
    tests/
    data/
  frontend-v3/
    app/
    components/
    lib/
    public/
  docs/
```

## 2. Backend Routes

### Verification Routes

- `POST /verify`
- `POST /verify-image`
- `POST /verify-video`
- `GET /task-status/{task_id}`

### System and Workspace Routes

Examples from the current backend include:

- `GET /feed`
- `GET /trending`
- `GET /archive`
- `GET /neural-stats`
- `GET /system-status`
- `GET /retrieval-health`
- `GET /investigations`
- `GET /reports`
- `GET /reports/{report_id}`
- `POST /reports/{report_id}/metadata`
- `GET /reports/{report_id}/export`
- `GET /workspace/team`
- `POST /workspace/team/assign`
- `GET /workspace/settings`
- `POST /workspace/settings/{setting_id}`

## 3. Important Backend Files

### `backend/routers/verify.py`

Core request entry points for verification tasks.

### `backend/routers/system.py`

Contains operational endpoints, retrieval health, reports, team, settings, and export logic.

### `backend/services/verification_service.py`

Task runner for the full verification pipeline.

### `backend/utils/db_manager.py`

Task persistence, listing, and normalization utilities.

### `backend/rag/vector_store.py`

FAISS index loading, storage, and vector operations.

### `backend/rag/retrieval.py`

Retrieval logic and evidence selection.

### `backend/models/classifier.py`

Local classifier implementation.

### `backend/models/reasoning.py`

Reasoning output generation.

### `backend/models/interpretability.py`

Explainability logic.

### `backend/models/vision.py`

Image understanding support.

## 4. Important Frontend Files

### `frontend-v3/app/page.tsx`

Main verification workspace page.

### `frontend-v3/app/reports/page.tsx`

Live reports page.

### `frontend-v3/app/team/page.tsx`

Assignment and analyst workspace page.

### `frontend-v3/app/settings/page.tsx`

Editable settings workspace page.

### `frontend-v3/components/CommandCenter.tsx`

Verification console and input actions.

### `frontend-v3/components/WorkspaceHeader.tsx`

Shared SaaS shell header.

### `frontend-v3/components/Toast.tsx`

User feedback for save and export actions.

### `frontend-v3/lib/api.ts`

Frontend API client and data interfaces.

## 5. Main Data Models

### Investigation Record

Fields include:

- `id`
- `title`
- `status`
- `updated_at`
- `verdict`
- `veracity`
- `confidence`
- `evidence_count`
- `source_mode`
- `summary`
- `assignee_id`
- `assignee_name`

### Report Record

Fields include:

- `id`
- `title`
- `status`
- `owner`
- `updated_at`
- `verdict`
- `confidence`
- `evidence_count`
- `summary`
- `audience`
- `highlights`
- `last_exported_at`
- `approval_status`
- `reviewer_notes`
- `reviewer_name`
- `approved_at`

### Settings Control

- `id`
- `title`
- `detail`
- `value`
- `status`

## 6. Workspace State Persistence

The file:

`backend/data/workspace_state.json`

stores lightweight operational state, including:

- `report_meta`
- `assignments`
- `settings_controls`
- `plan`
- `policy`

## 7. Database Notes

The SQLite database:

`backend/data/tasks.db`

stores verification tasks and task results. Completed tasks can be transformed into:

- saved investigations
- backend-backed report records

## 8. Retrieval Notes

FactShield uses FAISS as the primary vector retrieval engine. Retrieval health depends on:

- presence of metadata
- presence of vector index
- consistency between metadata count and vector count

The backend exposes retrieval-health logic so the UI can report whether FAISS is healthy, degraded, or unavailable.

## 9. Export Notes

Report export is handled through a backend route that returns a downloadable response. The export includes report-facing text such as:

- report identity
- owner
- audience
- verdict
- confidence
- evidence count
- approval fields
- reviewer notes

## 10. Testing Notes

Backend tests are available in:

`backend/tests/`

Typical validation areas:

- API structure
- retrieval logic
- classifier output
- reasoning output
- utilities and safety checks

Frontend verification during refinement was done through:

- linting
- production build
- live route checks
- UX refinement based on rendered behavior

## 11. Presentation Notes

For a live demonstration:

- use tested claims
- keep the backend running
- prefer text-first verification
- use Reports, Team, and Settings to show product maturity after the claim demo
