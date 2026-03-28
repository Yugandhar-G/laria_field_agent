"""
Pydantic request/response schemas for all API endpoints.

Depends on: pydantic
Used by: routes/knowledge.py, routes/sessions.py
"""

from pydantic import BaseModel, Field


class KnowledgeRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    equipment_type: str = ""
    max_results: int = Field(default=5, ge=1, le=20)


class KnowledgeChunk(BaseModel):
    text: str
    source: str
    relevance_score: int


class KnowledgeResponse(BaseModel):
    chunks: list[KnowledgeChunk]
    total_found: int


class SessionLogRequest(BaseModel):
    session_id: str
    equipment_identified: str
    diagnosis: str
    resolution: str = ""
    duration_seconds: int = 0
    steps_completed: int = 0
    rating: int = Field(default=0, ge=0, le=5)


class SessionLogResponse(BaseModel):
    status: str
    session_id: str


class HealthResponse(BaseModel):
    status: str
    version: str


class ProcedureOverlayHint(BaseModel):
    position: str
    type: str
    label: str


class ProcedureStep(BaseModel):
    order: int
    action: str
    what_to_look_for: str
    visual_confirmation: str
    overlay: ProcedureOverlayHint | None = None
    if_issue_found: str | None = None
    safety_note: str | None = None


class ProcedureSafety(BaseModel):
    preconditions: list[str] = []
    hazards: list[str] = []


class ProcedureEquipment(BaseModel):
    type: str
    models: list[str] = []
    identifiers: list[str] = []


class RepairProcedure(BaseModel):
    id: str
    equipment: ProcedureEquipment
    symptom: str
    difficulty: str = "beginner"
    estimated_time_minutes: int = 15
    tools_required: list[str] = []
    safety: ProcedureSafety
    steps: list[ProcedureStep]
    sources: list[str] = []


class ProcedureSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    equipment_type: str = ""
    max_results: int = Field(default=3, ge=1, le=10)


class ProcedureSearchResponse(BaseModel):
    procedures: list[RepairProcedure]
    total_found: int
