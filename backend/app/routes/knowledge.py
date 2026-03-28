"""
Knowledge base retrieval endpoint for RAG injection.

POST /api/knowledge - returns relevant equipment doc chunks.

Depends on: app.models.schemas, app.services.knowledge_service
Used by: frontend knowledge.service.ts
"""

from fastapi import APIRouter

from app.models.schemas import KnowledgeRequest, KnowledgeResponse
from app.services.knowledge_service import search_knowledge

router = APIRouter(prefix="/api", tags=["knowledge"])


@router.post("/knowledge", response_model=KnowledgeResponse)
async def get_knowledge(request: KnowledgeRequest) -> KnowledgeResponse:
    results = search_knowledge(
        query=request.query,
        equipment_type=request.equipment_type,
        max_results=request.max_results,
    )

    return KnowledgeResponse(
        chunks=[
            {
                "text": r["text"],
                "source": r["source"],
                "relevance_score": r["relevance_score"],
            }
            for r in results
        ],
        total_found=len(results),
    )
