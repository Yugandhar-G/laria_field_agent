"""
Tests for the knowledge base API and health endpoint.

Depends on: httpx, pytest, pytest-asyncio
Used by: CI pipeline
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.knowledge_service import load_knowledge_base


@pytest.fixture(autouse=True)
def _load_kb():
    """Ensure knowledge base is loaded before tests (lifespan doesn't run in test transport)."""
    load_knowledge_base()


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_knowledge_returns_results(client: AsyncClient):
    resp = await client.post(
        "/api/knowledge",
        json={"query": "toaster not heating element", "max_results": 5},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "chunks" in data
    assert len(data["chunks"]) > 0
    assert data["total_found"] > 0


@pytest.mark.asyncio
async def test_knowledge_empty_query_rejected(client: AsyncClient):
    resp = await client.post(
        "/api/knowledge",
        json={"query": ""},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_knowledge_filters_by_equipment(client: AsyncClient):
    resp = await client.post(
        "/api/knowledge",
        json={
            "query": "troubleshooting diagnostics",
            "equipment_type": "toaster",
            "max_results": 10,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    for chunk in data["chunks"]:
        assert "toaster" in chunk["source"].lower() or "toaster" in chunk["text"].lower()


@pytest.mark.asyncio
async def test_knowledge_no_match_returns_empty(client: AsyncClient):
    resp = await client.post(
        "/api/knowledge",
        json={"query": "quantum hyperspace flux capacitor nonexistent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_found"] == 0
    assert data["chunks"] == []


@pytest.mark.asyncio
async def test_sessions_log(client: AsyncClient):
    resp = await client.post(
        "/api/sessions",
        json={
            "session_id": "test-session-001",
            "equipment_identified": "Toaster - Breville BTA720XL",
            "diagnosis": "Faulty heating element",
            "resolution": "Replaced element",
            "duration_seconds": 420,
            "steps_completed": 5,
            "rating": 4,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "logged"
    assert data["session_id"] == "test-session-001"
