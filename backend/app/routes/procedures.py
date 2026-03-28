"""
Procedure search endpoint for semantic RAG retrieval.

POST /api/procedures/search - semantic search for repair procedures.
GET  /api/procedures        - list all stored procedures.

Depends on: app.models.schemas, app.services.procedure_store
Used by: frontend knowledge.service.ts
"""

from fastapi import APIRouter

from app.models.schemas import (
    ProcedureSearchRequest,
    ProcedureSearchResponse,
    RepairProcedure,
)
from app.services.procedure_store import get_all_procedures, search_procedures

router = APIRouter(prefix="/api/procedures", tags=["procedures"])


@router.post("/search", response_model=ProcedureSearchResponse)
async def search(request: ProcedureSearchRequest) -> ProcedureSearchResponse:
    results = search_procedures(
        query=request.query,
        equipment_type=request.equipment_type,
        max_results=request.max_results,
    )
    return ProcedureSearchResponse(
        procedures=results,
        total_found=len(results),
    )


@router.get("/", response_model=list[RepairProcedure])
async def list_procedures() -> list[RepairProcedure]:
    return get_all_procedures()
