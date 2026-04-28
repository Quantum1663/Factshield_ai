import sqlite3
import json
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
TASK_DB_PATH = DATA_DIR / "tasks.db"

def init_task_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(TASK_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                task_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                result_json TEXT,
                error TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()

def save_task(task_id: str, status: str, result=None, error: str | None = None):
    result_json = json.dumps(result, ensure_ascii=False) if result is not None else None
    with sqlite3.connect(TASK_DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO tasks (task_id, status, result_json, error, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(task_id) DO UPDATE SET
                status = excluded.status,
                result_json = excluded.result_json,
                error = excluded.error,
                updated_at = CURRENT_TIMESTAMP
            """,
            (task_id, status, result_json, error),
        )
        conn.commit()

def load_task(task_id: str):
    with sqlite3.connect(TASK_DB_PATH) as conn:
        row = conn.execute(
            "SELECT status, result_json, error FROM tasks WHERE task_id = ?",
            (task_id,),
        ).fetchone()

    if row is None:
        return None

    status, result_json, error = row
    payload = {"status": status}
    if result_json:
        payload["result"] = json.loads(result_json)
    if error:
        payload["error"] = error
    return payload

def clean_text_value(value):
    if isinstance(value, str):
        repaired = value
        try:
            repaired = value.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
        except (UnicodeEncodeError, UnicodeDecodeError):
            repaired = value
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
    if isinstance(value, list):
        return [clean_text_value(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_text_value(item) for key, item in value.items()}
    return value

def normalize_task_payloads():
    updated_rows = 0
    with sqlite3.connect(TASK_DB_PATH) as conn:
        rows = conn.execute("SELECT task_id, result_json, error FROM tasks").fetchall()
        for task_id, result_json, error in rows:
            new_result_json = result_json
            new_error = error
            changed = False

            if result_json:
                payload = json.loads(result_json)
                cleaned_payload = clean_text_value(payload)
                serialized = json.dumps(cleaned_payload, ensure_ascii=False)
                if serialized != result_json:
                    new_result_json = serialized
                    changed = True

            if error:
                cleaned_error = clean_text_value(error)
                if cleaned_error != error:
                    new_error = cleaned_error
                    changed = True

            if changed:
                conn.execute(
                    "UPDATE tasks SET result_json = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE task_id = ?",
                    (new_result_json, new_error, task_id),
                )
                updated_rows += 1
        conn.commit()
    return {"updated_rows": updated_rows}

def list_tasks(limit: int = 20, statuses: list[str] | None = None):
    query = "SELECT task_id, status, result_json, error, updated_at FROM tasks"
    params: list[object] = []

    if statuses:
        placeholders = ",".join("?" for _ in statuses)
        query += f" WHERE status IN ({placeholders})"
        params.extend(statuses)

    query += " ORDER BY updated_at DESC LIMIT ?"
    params.append(limit)

    with sqlite3.connect(TASK_DB_PATH) as conn:
        rows = conn.execute(query, params).fetchall()

    items = []
    for task_id, status, result_json, error, updated_at in rows:
        items.append({
            "task_id": task_id,
            "status": status,
            "result": json.loads(result_json) if result_json else None,
            "error": error,
            "updated_at": updated_at,
        })
    return items
