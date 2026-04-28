import os
import json
import faiss
import shutil
import logging
import re
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from utils.feed_aggregator import get_live_feed
from utils.cache_manager import result_cache, rate_limiter
from utils.db_manager import list_tasks, normalize_task_payloads
from rag.vector_store import reload_store

try:
    from moviepy import VideoFileClip
except ImportError:
    try:
        from moviepy.editor import VideoFileClip
    except ImportError:
        VideoFileClip = None

router = APIRouter()
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
WORKSPACE_STATE_PATH = DATA_DIR / "workspace_state.json"
rebuild_state = {
    "status": "idle",
    "message": "No rebuild is running.",
    "metadata_count": None,
    "vector_count": None,
    "error": None,
}

TEAM_MEMBERS = [
    {
        "id": "lead-analyst",
        "name": "Lead Analyst",
        "role": "Admin",
        "status": "Reviewing",
        "contact": "lead@factshield.local",
        "focus": "Cross-team approvals and escalation handling.",
    },
    {
        "id": "policy-reviewer",
        "name": "Policy Reviewer",
        "role": "Reviewer",
        "status": "Available",
        "contact": "policy@factshield.local",
        "focus": "Election integrity, narrative risk, and signoff policy.",
    },
    {
        "id": "media-forensics",
        "name": "Media Forensics",
        "role": "Specialist",
        "status": "On call",
        "contact": "visuals@factshield.local",
        "focus": "Visual provenance, image checks, and video evidence.",
    },
]

SETTINGS_CONTROLS = [
    {
        "id": "api-access",
        "title": "API Access",
        "detail": "Workspace key rotation and verification webhooks.",
        "value": "Rotating every 30 days",
        "status": "active",
    },
    {
        "id": "evidence-retention",
        "title": "Evidence Retention",
        "detail": "Keep source records and audit traces for 180 days.",
        "value": "180 days",
        "status": "active",
    },
    {
        "id": "alert-routing",
        "title": "Alert Routing",
        "detail": "Send high-risk narratives to operations channels.",
        "value": "4 destinations",
        "status": "active",
    },
    {
        "id": "compliance-mode",
        "title": "Compliance Mode",
        "detail": "Require approval before exporting public reports.",
        "value": "Two-person review",
        "status": "enforced",
    },
]

DEFAULT_PLAN = {
    "name": "Pro Workspace",
    "features": ["10 analyst seats", "5k verifications / month", "Evidence audit logs", "Priority model routing"],
}

DEFAULT_POLICY = {
    "title": "Two-person review",
    "detail": "High-impact verdicts require analyst and policy reviewer approval before report export.",
}

class ReportMetadataUpdate(BaseModel):
    title: str | None = None
    owner: str | None = None
    audience: str | None = None
    approval_status: str | None = None
    reviewer_notes: str | None = None
    reviewer_name: str | None = None

class TeamAssignmentUpdate(BaseModel):
    investigation_id: str
    member_id: str | None = None

class SettingUpdate(BaseModel):
    value: str | None = None
    status: str | None = None
    detail: str | None = None

def get_dataset_size() -> int:
    return len(get_metadata())

def get_metadata() -> list:
    meta_path = DATA_DIR / "fact_metadata.json"
    if not meta_path.exists():
        return []
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_vector_count() -> int:
    index_path = DATA_DIR / "fact_index.faiss"
    if not index_path.exists():
        return 0
    index = faiss.read_index(str(index_path))
    return index.ntotal

def get_retrieval_health() -> dict:
    metadata_count = get_dataset_size()
    vector_count = get_vector_count()
    index_exists = (DATA_DIR / "fact_index.faiss").exists()
    metadata_exists = (DATA_DIR / "fact_metadata.json").exists()
    index_consistent = index_exists and metadata_exists and vector_count == metadata_count and vector_count > 0

    if index_consistent:
        status = "healthy"
        message = "Retrieval index and metadata are aligned."
    elif vector_count == 0 or metadata_count == 0:
        status = "unavailable"
        message = "Retrieval index or metadata is empty."
    else:
        status = "degraded"
        message = f"FAISS vectors ({vector_count}) and metadata records ({metadata_count}) are out of sync. Rebuild the vector database."

    return {
        "status": status,
        "message": message,
        "index_exists": index_exists,
        "metadata_exists": metadata_exists,
        "index_consistent": index_consistent,
        "metadata_count": metadata_count,
        "vector_count": vector_count,
    }

def utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

def load_workspace_state() -> dict:
    default_state = {
        "report_meta": {},
        "assignments": {},
        "settings_controls": {},
        "plan": DEFAULT_PLAN.copy(),
        "policy": DEFAULT_POLICY.copy(),
    }
    if not WORKSPACE_STATE_PATH.exists():
        return default_state
    try:
        with open(WORKSPACE_STATE_PATH, "r", encoding="utf-8") as f:
            stored = json.load(f)
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to load workspace state, using defaults.")
        return default_state

    merged = default_state
    if isinstance(stored, dict):
        for key in merged:
            value = stored.get(key)
            if isinstance(merged[key], dict) and isinstance(value, dict):
                merged[key] = value
            elif value is not None:
                merged[key] = value
    return merged

def save_workspace_state(state: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(WORKSPACE_STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

def get_member_by_id(member_id: str | None) -> dict | None:
    if not member_id:
        return None
    return next((member for member in TEAM_MEMBERS if member["id"] == member_id), None)

def get_control_defaults(setting_id: str) -> dict | None:
    return next((item for item in SETTINGS_CONTROLS if item["id"] == setting_id), None)

def summarize_text(value: str | None, limit: int = 150) -> str:
    normalized = clean_text(value)
    if not normalized:
        return ""
    return normalized if len(normalized) <= limit else f"{normalized[:limit - 3].rstrip()}..."

def clean_text(value: str | None) -> str:
    text = value or ""
    if not text:
        return ""

    repaired = text
    try:
        repaired = text.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
    except (UnicodeEncodeError, UnicodeDecodeError):
        repaired = text

    replacements = {
        "\u2011": "-",
        "\u2010": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
    }
    for old, new in replacements.items():
        repaired = repaired.replace(old, new)
    repaired = re.sub(r"\s+", " ", repaired).strip()
    return repaired

def build_investigation_record(task: dict) -> dict:
    state = load_workspace_state()
    result = task.get("result") or {}
    claim = summarize_text(result.get("claim") or "Untitled investigation", limit=96)
    verdict = result.get("verdict") or "Pending review"
    veracity = (result.get("veracity") or {}).get("prediction") or "unknown"
    confidence = (result.get("veracity") or {}).get("confidence")
    evidence = result.get("evidence") or []
    source_mode = (result.get("provenance_signals") or {}).get("source_mode") or "text"
    summary = summarize_text(result.get("generated_reason") or result.get("historical_context") or claim, limit=220)
    assignee_id = state["assignments"].get(task["task_id"])
    assignee = get_member_by_id(assignee_id)

    return {
        "id": task["task_id"],
        "title": claim,
        "status": task["status"],
        "updated_at": task["updated_at"],
        "verdict": verdict,
        "veracity": veracity,
        "confidence": confidence,
        "evidence_count": len(evidence),
        "source_mode": source_mode,
        "summary": summary,
        "assignee_id": assignee_id,
        "assignee_name": assignee["name"] if assignee else None,
    }

def build_report_record(task: dict) -> dict:
    state = load_workspace_state()
    investigation = build_investigation_record(task)
    report_meta = state["report_meta"].get(investigation["id"], {})
    role_index = len(investigation["id"]) % len(TEAM_MEMBERS)
    fallback_owner = investigation["assignee_name"] or TEAM_MEMBERS[role_index]["name"]
    return {
        "id": investigation["id"],
        "title": report_meta.get("title") or investigation["title"],
        "status": "Ready" if task["status"] == "completed" else task["status"].title(),
        "owner": report_meta.get("owner") or fallback_owner,
        "updated_at": investigation["updated_at"],
        "verdict": investigation["verdict"],
        "confidence": investigation["confidence"],
        "evidence_count": investigation["evidence_count"],
        "summary": investigation["summary"],
        "audience": report_meta.get("audience") or "Leadership and policy",
        "highlights": [
            f"Verdict: {investigation['verdict']}",
            f"Evidence items: {investigation['evidence_count']}",
            f"Source mode: {investigation['source_mode']}",
        ],
        "last_exported_at": report_meta.get("last_exported_at"),
        "approval_status": report_meta.get("approval_status") or "Draft",
        "reviewer_notes": report_meta.get("reviewer_notes") or "",
        "reviewer_name": report_meta.get("reviewer_name") or "",
        "approved_at": report_meta.get("approved_at"),
    }

def get_saved_investigations(limit: int = 20) -> list[dict]:
    return [build_investigation_record(task) for task in list_tasks(limit=limit)]

def get_report_records(limit: int = 20) -> list[dict]:
    completed_tasks = list_tasks(limit=limit, statuses=["completed"])
    return [build_report_record(task) for task in completed_tasks if task.get("result")]

def get_report_detail(report_id: str) -> dict | None:
    for task in list_tasks(limit=100, statuses=["completed"]):
        if task["task_id"] == report_id and task.get("result"):
            report = build_report_record(task)
            report["result"] = task["result"]
            return report
    return None

@router.get("/feed")
def fetch_intelligence_feed():
    return get_live_feed()

@router.get("/trending")
def get_trending():
    data_path = DATA_DIR / "trending_propaganda.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@router.get("/archive")
def get_archive():
    return get_metadata()[-20:]

@router.get("/investigations")
def investigations(limit: int = Query(default=12, ge=1, le=100)):
    return get_saved_investigations(limit=limit)

@router.get("/reports")
def reports(limit: int = Query(default=12, ge=1, le=100)):
    return get_report_records(limit=limit)

@router.get("/reports/{report_id}")
def report_detail(report_id: str):
    report = get_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report

@router.put("/reports/{report_id}/metadata")
def update_report_metadata(report_id: str, payload: ReportMetadataUpdate):
    if not get_report_detail(report_id):
        raise HTTPException(status_code=404, detail="Report not found.")

    state = load_workspace_state()
    metadata = state["report_meta"].get(report_id, {})
    for field in ("title", "owner", "audience"):
        value = getattr(payload, field)
        if value is not None:
            metadata[field] = clean_text(value)
    for field in ("approval_status", "reviewer_notes", "reviewer_name"):
        value = getattr(payload, field)
        if value is not None:
            metadata[field] = clean_text(value)
    if payload.approval_status is not None:
        metadata["approved_at"] = utc_timestamp() if clean_text(payload.approval_status) == "Approved" else None
    state["report_meta"][report_id] = metadata
    save_workspace_state(state)
    return report_detail(report_id)

@router.get("/reports/{report_id}/export")
def export_report(report_id: str):
    report = get_report_detail(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    state = load_workspace_state()
    metadata = state["report_meta"].get(report_id, {})
    metadata["last_exported_at"] = utc_timestamp()
    state["report_meta"][report_id] = metadata
    save_workspace_state(state)
    report = get_report_detail(report_id) or report

    result = report["result"]
    lines = [
        f"# {report['title']}",
        "",
        f"- Report ID: {report_id}",
        f"- Owner: {report['owner']}",
        f"- Updated At: {report['updated_at']}",
        f"- Verdict: {report['verdict']}",
        f"- Confidence: {report['confidence'] if report['confidence'] is not None else 'N/A'}",
        f"- Evidence Count: {report['evidence_count']}",
        f"- Approval Status: {report['approval_status']}",
        f"- Reviewer: {report.get('reviewer_name') or 'Not assigned'}",
        f"- Approved At: {report.get('approved_at') or 'Pending'}",
        "",
        "## Summary",
        report["summary"],
        "",
        "## Highlights",
    ]
    lines.extend(f"- {item}" for item in report["highlights"])
    lines.extend([
        "",
        "## Reviewer Notes",
        report.get("reviewer_notes") or "No reviewer notes added.",
        "",
        "## Generated Reason",
        clean_text(result.get("generated_reason")) or "No generated reason available.",
        "",
        "## Evidence",
    ])
    evidence = result.get("evidence") or []
    lines.extend(f"- {clean_text(item)}" for item in evidence[:12])
    if not evidence:
        lines.append("- No evidence returned.")

    filename = f"report-{report_id}.md"
    return Response(
        content="\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/workspace/team")
def workspace_team():
    investigations = get_saved_investigations(limit=9)
    queue_total = len(investigations)
    pending = len([item for item in investigations if item["status"] != "completed"])
    state = load_workspace_state()

    members = []
    for member in TEAM_MEMBERS:
        assigned = [item for item in investigations if item["assignee_id"] == member["id"]]
        members.append({
            **member,
            "queue": len(assigned),
            "assigned_investigations": assigned,
        })

    return {
        "summary": {
            "analysts_online": len(members),
            "cases_awaiting_approval": pending,
            "assignment_flow": "Balanced" if queue_total < 10 else "Busy" if queue_total < 20 else "Saturated",
        },
        "members": members,
        "investigations": investigations,
        "unassigned_investigations": [item for item in investigations if not item["assignee_id"]],
        "policy": state["policy"],
    }

@router.get("/workspace/team/{member_id}")
def workspace_team_member(member_id: str):
    payload = workspace_team()
    member = next((item for item in payload["members"] if item["id"] == member_id), None)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")
    return member

@router.post("/workspace/team/assign")
def assign_investigation(payload: TeamAssignmentUpdate):
    investigations = {item["id"]: item for item in get_saved_investigations(limit=100)}
    if payload.investigation_id not in investigations:
        raise HTTPException(status_code=404, detail="Investigation not found.")
    if payload.member_id is not None and not get_member_by_id(payload.member_id):
        raise HTTPException(status_code=404, detail="Team member not found.")

    state = load_workspace_state()
    if payload.member_id:
        state["assignments"][payload.investigation_id] = payload.member_id
    else:
        state["assignments"].pop(payload.investigation_id, None)
    save_workspace_state(state)
    return workspace_team()

@router.get("/workspace/settings")
def workspace_settings():
    retrieval = get_retrieval_health()
    state = load_workspace_state()
    controls = []
    for control in SETTINGS_CONTROLS:
        overrides = state["settings_controls"].get(control["id"], {})
        controls.append({
            **control,
            **overrides,
        })
    return {
        "summary": {
            "control_sets": len(controls),
            "alert_routes": 4,
            "runtime_profile": state["plan"]["name"].replace(" Workspace", ""),
        },
        "controls": controls,
        "plan": state["plan"],
        "environment": {
            "region": "Local",
            "mode": "Development",
            "audit_trail": "Enabled",
            "retrieval": retrieval["status"],
        },
    }

@router.get("/workspace/settings/{setting_id}")
def workspace_setting_detail(setting_id: str):
    settings_payload = workspace_settings()
    control = next((item for item in settings_payload["controls"] if item["id"] == setting_id), None)
    if not control:
        raise HTTPException(status_code=404, detail="Setting not found.")
    return control

@router.put("/workspace/settings/{setting_id}")
def update_workspace_setting(setting_id: str, payload: SettingUpdate):
    control = get_control_defaults(setting_id)
    if not control:
        raise HTTPException(status_code=404, detail="Setting not found.")

    state = load_workspace_state()
    overrides = state["settings_controls"].get(setting_id, {})
    for field in ("value", "status", "detail"):
        value = getattr(payload, field)
        if value is not None:
            overrides[field] = " ".join(value.split()) if isinstance(value, str) else value
    state["settings_controls"][setting_id] = overrides
    save_workspace_state(state)
    return workspace_setting_detail(setting_id)

@router.get("/neural-stats")
def get_neural_stats():
    dataset_size = get_dataset_size()
    vector_count = get_vector_count()
    retrieval_health = get_retrieval_health()
    has_model = (BASE_DIR / "factshield_model").exists()
    llm_configured = bool(os.getenv("GROQ_API_KEY"))
    pipeline_ready = has_model and llm_configured and retrieval_health["index_consistent"]

    return {
        "local_classifier": "XLM-Roberta" if has_model else "XLM-Roberta (Missing Model)",
        "vector_engine": "FAISS L2-Flat",
        "memory_count": dataset_size,
        "vector_count": vector_count,
        "cache_entries": len(result_cache._cache),
        "rate_limit_per_minute": rate_limiter._max,
        "reranker": "Cross-Encoder MiniLM",
        "reasoner": "Llama 3.3 (via Groq)",
        "ocr_available": shutil.which("tesseract") is not None,
        "video_support": VideoFileClip is not None,
        "groq_configured": llm_configured,
        "retrieval_status": retrieval_health["status"],
        "retrieval_message": retrieval_health["message"],
        "metadata_count": retrieval_health["metadata_count"],
        "index_consistent": retrieval_health["index_consistent"],
        "status": "Optimal" if pipeline_ready else "Degraded"
    }

@router.get("/system-status")
def system_status():
    dataset_size = get_dataset_size()
    index_size = get_vector_count()
    retrieval_health = get_retrieval_health()

    return {
        "system": "SAMI AI",
        "model_status": "loaded (Multi-Label)",
        "dataset_entries": dataset_size,
        "faiss_vectors": index_size,
        "retrieval_status": retrieval_health["status"],
        "retrieval_message": retrieval_health["message"],
        "index_consistent": retrieval_health["index_consistent"],
        "metadata_count": retrieval_health["metadata_count"],
        "api_status": "running"
    }

@router.get("/retrieval-health")
def retrieval_health():
    return get_retrieval_health()


def run_rebuild(limit: int | None):
    rebuild_state.update({
        "status": "running",
        "message": "Rebuilding retrieval index.",
        "metadata_count": None,
        "vector_count": None,
        "error": None,
    })
    try:
        from rebuild_db import rebuild_database

        result = rebuild_database(limit=limit)
        reload_result = reload_store()
        result_cache._cache.clear()
        rebuild_state.update({
            "status": "completed",
            "message": "Retrieval index rebuilt and in-memory store reloaded.",
            "metadata_count": reload_result["metadata_count"],
            "vector_count": reload_result["vector_count"],
            "error": None,
        })
        logger.info("Retrieval rebuild completed: %s", result)
    except Exception as exc:
        logger.exception("Retrieval rebuild failed")
        rebuild_state.update({
            "status": "failed",
            "message": "Retrieval rebuild failed.",
            "error": str(exc),
        })


@router.post("/retrieval-rebuild")
def rebuild_retrieval_index(
    background_tasks: BackgroundTasks,
    request: Request,
    limit: int = Query(default=500, ge=1, le=5000),
):
    client_host = request.client.host if request.client else ""
    if client_host not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=403, detail="Retrieval rebuild is only available from localhost.")
    if rebuild_state["status"] == "running":
        raise HTTPException(status_code=409, detail="Retrieval rebuild is already running.")

    background_tasks.add_task(run_rebuild, limit)
    rebuild_state.update({
        "status": "queued",
        "message": f"Retrieval rebuild queued for {limit} records.",
        "metadata_count": None,
        "vector_count": None,
        "error": None,
    })
    return rebuild_state


@router.get("/retrieval-rebuild-status")
def retrieval_rebuild_status():
    return rebuild_state

@router.post("/maintenance/normalize-tasks")
def normalize_tasks(request: Request):
    client_host = request.client.host if request.client else ""
    if client_host not in {"127.0.0.1", "localhost", "::1"}:
        raise HTTPException(status_code=403, detail="Task normalization is only available from localhost.")
    return normalize_task_payloads()
