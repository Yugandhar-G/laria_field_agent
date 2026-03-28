"""
Knowledge base search service.

Loads equipment knowledge from JSON and performs keyword-based search.
V1 uses simple keyword matching; upgrade to embeddings later.

Depends on: app.config
Used by: routes/knowledge.py
"""

import json
from pathlib import Path

from app.config import settings

_knowledge_entries: list[dict] = []


def load_knowledge_base() -> None:
    """Load knowledge base from JSON file on startup."""
    global _knowledge_entries
    kb_path = Path(settings.knowledge_base_path)
    if not kb_path.exists():
        _knowledge_entries = []
        return

    with open(kb_path, encoding="utf-8") as f:
        data = json.load(f)

    _knowledge_entries = data if isinstance(data, list) else data.get("entries", [])


def search_knowledge(
    query: str,
    equipment_type: str = "",
    max_results: int = 5,
) -> list[dict]:
    """
    Search knowledge base with keyword matching.

    Scores entries by counting query term occurrences in entry text.
    Optionally filters by equipment type from metadata.
    """
    query_terms = query.lower().split()
    if not query_terms:
        return []

    scored: list[tuple[int, dict]] = []

    for entry in _knowledge_entries:
        text = entry.get("text", "").lower()
        metadata = entry.get("metadata", {})

        if equipment_type:
            entry_equipment = metadata.get("equipment", "").lower()
            if equipment_type.lower() not in entry_equipment:
                continue

        score = sum(1 for term in query_terms if term in text)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, entry in scored[:max_results]:
        results.append({
            "text": entry["text"],
            "source": entry.get("metadata", {}).get("source", "unknown"),
            "relevance_score": score,
        })

    return results
