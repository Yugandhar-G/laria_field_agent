"""
LARIA Field Agent backend application.

FastAPI app with knowledge base and session logging endpoints.
Uses app factory pattern with lifespan context manager.

Depends on: fastapi, app.config, app.routes.*, app.services.*
Used by: uvicorn (entrypoint: app.main:app)
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.schemas import HealthResponse
from app.routes.knowledge import router as knowledge_router
from app.routes.procedures import router as procedures_router
from app.routes.sessions import router as sessions_router
from app.services.knowledge_service import load_knowledge_base
from app.services.procedure_store import init_procedure_store


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    load_knowledge_base()
    init_procedure_store()
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="LARIA Backend",
        version="0.1.0",
        lifespan=lifespan,
    )

    origins = settings.cors_origins.split(",")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(knowledge_router)
    application.include_router(procedures_router)
    application.include_router(sessions_router)

    @application.get("/health", response_model=HealthResponse)
    async def health_check() -> HealthResponse:
        return HealthResponse(status="ok", version="0.1.0")

    return application


app = create_app()
