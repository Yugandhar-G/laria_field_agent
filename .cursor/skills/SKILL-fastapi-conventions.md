# FastAPI Conventions & Patterns

## When to Use This Skill
When building or reviewing FastAPI endpoints, structuring the Python service,
handling async patterns, setting up GCP deployment, or designing Pydantic models.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # App factory, startup/shutdown, mount routers
│   ├── config.py            # Settings via pydantic-settings, env vars only
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic request/response models
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── knowledge.py     # Knowledge base retrieval
│   │   └── sessions.py      # Session logging
│   ├── services/
│   │   ├── __init__.py
│   │   └── knowledge_service.py  # Business logic
│   └── knowledge/
│       └── knowledge_base.json
├── scripts/
│   └── ingest_manuals.py
├── tests/
│   └── test_knowledge.py
├── requirements.txt
├── Dockerfile
└── .env
```

## Key Patterns

- App factory pattern with lifespan context manager
- Settings via pydantic-settings (env vars, no hardcoded secrets)
- Business logic in services, never in route handlers
- Pydantic models for all request/response boundaries
- Async handlers throughout
- Router-level error handling with HTTPException
- Consistent response format: `{ success, data, error }`

## Async Rules

- Use `async def` for all route handlers
- Use `asyncio.gather` for parallel independent operations
- Never use sync I/O in async context (blocks event loop)
- Use `run_in_executor` for CPU-bound work if needed

## Testing

- Test at router level with httpx AsyncClient
- Mock at service boundary, not at implementation details
- Test error paths, not just happy paths

## GCP Deployment

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Common Antipatterns to Avoid

- Business logic in routers
- Sync functions in async routers
- Missing lifespan management
- Global mutable state (use dependency injection)
- Returning raw dicts (always use Pydantic response models)
- No request validation
