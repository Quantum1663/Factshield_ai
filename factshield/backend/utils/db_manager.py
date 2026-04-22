import sqlite3
import json
import logging
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
