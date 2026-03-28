"""
Semantic procedure store backed by ChromaDB.

Uses ChromaDB's bundled default embedding model (all-MiniLM-L6-v2) for all
vector operations. This avoids extra API keys, embedding mismatches between
Gemini and persisted data, and startup failures when GEMINI_API_KEY varies.

Gemini is reserved for the browser Live session and optional ingest structuring
(script), not for procedure retrieval.

Depends on: chromadb, app.models.schemas
Used by: routes/procedures.py, ingestion upsert (optional)
"""

import json
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.models.schemas import RepairProcedure

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None

PROCEDURES_DIR = Path("app/knowledge/procedures")
CHROMA_DIR = Path("app/knowledge/chroma_db")


def init_procedure_store() -> None:
    """Initialize ChromaDB collection and load procedures from disk."""
    global _client, _collection

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    PROCEDURES_DIR.mkdir(parents=True, exist_ok=True)

    _client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    existing_names = {c.name for c in _client.list_collections()}
    if "repair_procedures" in existing_names:
        _collection = _client.get_collection(name="repair_procedures")
        print("[ProcedureStore] Opened existing ChromaDB index (all-MiniLM-L6-v2)")
    else:
        _collection = _client.create_collection(
            name="repair_procedures",
            metadata={"hnsw:space": "cosine"},
        )
        print("[ProcedureStore] Created ChromaDB index (all-MiniLM-L6-v2)")

    _load_procedures_from_disk()

    if _collection.count() == 0 and list(PROCEDURES_DIR.glob("*.json")):
        print("[ProcedureStore] Index empty after load; recreating collection...")
        _client.delete_collection("repair_procedures")
        _collection = _client.create_collection(
            name="repair_procedures",
            metadata={"hnsw:space": "cosine"},
        )
        _load_procedures_from_disk()


def _load_procedures_from_disk() -> None:
    """Load all procedure JSON files and upsert into ChromaDB."""
    if _collection is None:
        return

    for json_path in PROCEDURES_DIR.glob("*.json"):
        try:
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)

            procedures = data if isinstance(data, list) else [data]
            for proc_data in procedures:
                upsert_procedure(RepairProcedure.model_validate(proc_data))
        except Exception as exc:
            print(f"[ProcedureStore] Failed to load {json_path.name}: {exc}")


def _procedure_to_document(proc: RepairProcedure) -> str:
    """Convert a procedure into a searchable text document."""
    parts = [
        f"Equipment: {proc.equipment.type}",
        f"Models: {', '.join(proc.equipment.models)}",
        f"Symptom: {proc.symptom}",
        f"Difficulty: {proc.difficulty}",
        f"Tools: {', '.join(proc.tools_required)}",
    ]

    for step in proc.steps:
        parts.append(f"Step {step.order}: {step.action}")
        parts.append(f"  Look for: {step.what_to_look_for}")
        parts.append(f"  Confirm: {step.visual_confirmation}")
        if step.if_issue_found:
            parts.append(f"  If issue: {step.if_issue_found}")

    return "\n".join(parts)


def upsert_procedure(proc: RepairProcedure) -> None:
    """Add or update a procedure in the vector store."""
    if _collection is None:
        return

    doc_text = _procedure_to_document(proc)

    _collection.upsert(
        ids=[proc.id],
        documents=[doc_text],
        metadatas=[{
            "equipment_type": proc.equipment.type,
            "symptom": proc.symptom,
            "difficulty": proc.difficulty,
            "json": proc.model_dump_json(),
        }],
    )


def search_procedures(
    query: str,
    equipment_type: str = "",
    max_results: int = 3,
) -> list[RepairProcedure]:
    """Semantic search for procedures matching a symptom description."""
    if _collection is None or _collection.count() == 0:
        return []

    where_filter = None
    if equipment_type:
        where_filter = {"equipment_type": {"$eq": equipment_type}}

    results = _collection.query(
        query_texts=[query],
        n_results=min(max_results, _collection.count()),
        where=where_filter if where_filter else None,
    )

    procedures: list[RepairProcedure] = []
    metadatas = results.get("metadatas")
    if metadatas:
        for meta_list in metadatas:
            for meta in meta_list:
                json_str = meta.get("json", "")
                if json_str:
                    try:
                        procedures.append(
                            RepairProcedure.model_validate_json(json_str)
                        )
                    except Exception:
                        continue

    return procedures


def get_all_procedures() -> list[RepairProcedure]:
    """Return all stored procedures."""
    if _collection is None or _collection.count() == 0:
        return []

    results = _collection.get(include=["metadatas"])
    procedures: list[RepairProcedure] = []
    if results.get("metadatas"):
        for meta in results["metadatas"]:
            json_str = meta.get("json", "")
            if json_str:
                try:
                    procedures.append(
                        RepairProcedure.model_validate_json(json_str)
                    )
                except Exception:
                    continue
    return procedures
