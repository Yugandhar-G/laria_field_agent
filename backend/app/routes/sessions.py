"""
Session logging endpoint for analytics.

POST /api/sessions - logs completed service sessions.
V1 appends to a JSON file; upgrade to database later.

Depends on: app.models.schemas, app.config
Used by: frontend (end of session)
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter

from app.config import settings
from app.models.schemas import SessionLogRequest, SessionLogResponse

router = APIRouter(prefix="/api", tags=["sessions"])


@router.post("/sessions", response_model=SessionLogResponse)
async def log_session(request: SessionLogRequest) -> SessionLogResponse:
    log_path = Path(settings.sessions_log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    existing: list[dict] = []
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            existing = json.load(f)

    entry = request.model_dump()
    entry["logged_at"] = datetime.now(timezone.utc).isoformat()

    existing.append(entry)

    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)

    return SessionLogResponse(
        status="logged",
        session_id=request.session_id,
    )
