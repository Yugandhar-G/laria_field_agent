# SKILL: Backend API
## Files to create:
## - backend/app/__init__.py
## - backend/app/main.py
## - backend/app/config.py
## - backend/app/models/schemas.py
## - backend/app/routes/__init__.py
## - backend/app/routes/knowledge.py
## - backend/app/routes/sessions.py
## - backend/app/services/__init__.py
## - backend/app/services/knowledge_service.py
## - backend/app/knowledge/knowledge_base.json
## - backend/scripts/ingest_manuals.py
## - backend/requirements.txt
## - backend/Dockerfile
## - backend/tests/test_knowledge.py

## Scope
Backend does TWO things:
1. POST /api/knowledge - returns relevant equipment doc chunks for RAG
2. POST /api/sessions - logs completed sessions (for analytics)

Backend does NOT call Gemini. All AI is in the frontend WebSocket.

## POST /api/knowledge

Request:
```json
{ "query": "toaster not heating element", "equipment_type": "", "max_results": 5 }
```

Response:
```json
{
  "chunks": [
    { "text": "...", "source": "toaster_troubleshooting", "relevance_score": 4 }
  ],
  "total_found": 1
}
```

## POST /api/sessions

Request:
```json
{
  "session_id": "uuid",
  "equipment_identified": "Toaster - Breville BTA720XL",
  "diagnosis": "Faulty heating element",
  "resolution": "Replaced element",
  "duration_seconds": 420,
  "steps_completed": 5,
  "rating": 4
}
```

Response:
```json
{ "status": "logged", "session_id": "uuid" }
```

Sessions are appended to a JSON file for v1. Upgrade to DB later.

## Knowledge Base Content (MINIMUM for demo)

The knowledge_base.json MUST include entries for:
1. Toaster troubleshooting (not heating, uneven toasting, stuck lever, burning smell, tripping breaker)
2. Toaster internals (heating element, thermostat, solenoid, timer, crumb tray, thermal fuse, power cord)
3. Data center CRAC unit troubleshooting (high supply temp, humidity out of range, alarm codes, refrigerant)
4. CRAC unit internals (compressor, condenser, evaporator, expansion valve, humidifier, air filters, control board)
5. General electrical safety (LOTO, multimeter usage, continuity testing)
6. ASHRAE TC 9.9 data center environmental standards

Each entry: { "text": "...", "metadata": { "source": "...", "type": "...", "equipment": "..." } }

## App Factory Pattern

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load knowledge base
    yield
    # Shutdown: cleanup

def create_app() -> FastAPI:
    app = FastAPI(title="LARIA Backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    app.include_router(knowledge_router)
    app.include_router(sessions_router)
    return app

app = create_app()
```

## Settings Pattern

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    gemini_api_key: str = ""
    knowledge_base_path: str = "app/knowledge/knowledge_base.json"

settings = Settings()
```

## Testing

```python
def test_health():
    # GET /health returns 200

def test_knowledge_returns_results():
    # POST /api/knowledge with "toaster not heating"
    # Assert chunks is non-empty

def test_knowledge_empty_query():
    # POST /api/knowledge with ""
    # Assert graceful empty response

def test_knowledge_filters_by_equipment():
    # POST /api/knowledge with equipment_type="toaster"
    # Assert all results are toaster-related
```

## Requirements
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.4
pydantic-settings==2.7.1
PyMuPDF==1.25.3
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.25.0
```

## DO NOT
- Do NOT add Gemini SDK to backend
- Do NOT add SQLAlchemy/database for v1
- Do NOT add WebSocket endpoints
- Do NOT add file upload endpoints
- Do NOT add authentication for v1
