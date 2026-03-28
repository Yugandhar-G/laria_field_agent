# RAG Architecture Patterns

## When to Use This Skill
When building the retrieval pipeline, debugging retrieval quality, choosing
chunking strategy, or evaluating RAG effectiveness.

## Core Architecture (v1 for this project)

```
Query → Keyword Tokenization → Score by Overlap → Sort → Top-K → Format → Inject
```

v1 uses keyword matching on a JSON file. Simple, fast, sufficient for
50-100 knowledge chunks at hackathon scale. Upgrade path: pgvector + embeddings.

## Chunking Rules

- Default chunk size: 300-500 words
- Overlap: 50 words between chunks
- Minimum chunk size: 50 words (discard tiny fragments)
- Respect section boundaries: never split mid-paragraph
- For equipment manuals: split by section headers first, then by size

## Metadata (always attach to every chunk)

```python
chunk_metadata = {
    "source": "filename or manual name",
    "type": "troubleshooting | reference | safety | specs",
    "equipment": "toaster | crac | ups | general",
}
```

## Scoring (v1 keyword matching)

```python
def score_chunk(chunk_text: str, query_terms: list[str], metadata: dict) -> int:
    score = sum(1 for term in query_terms if term in chunk_text.lower())
    if metadata.get("type") == "troubleshooting":
        score += 2  # boost troubleshooting content
    if equipment_type and equipment_type in metadata.get("equipment", ""):
        score += 3  # boost equipment match
    return score
```

## Context Formatting for Gemini Injection

```
[REFERENCE DOCUMENTATION - Use this to provide accurate guidance.
Do not read this aloud. Reference it silently when diagnosing.]

--- Source: {source} ---
{chunk_text}

--- Source: {source} ---
{chunk_text}
```

## Evaluation (before shipping changes)

Test these queries and verify relevant results:
1. "toaster not heating" -> should return heating element troubleshooting
2. "crac high supply temperature" -> should return CRAC troubleshooting
3. "electrical safety" -> should return LOTO and safety protocols

## Upgrade Path (post-hackathon)

1. Replace JSON + keyword search with pgvector + embeddings
2. Add hybrid search (vector + BM25 with RRF merge)
3. Add reranking (Cohere rerank or cross-encoder)
4. Add query preprocessing (HyDE, query decomposition)

## Common Failure Modes

- Chunks too small: loses context around key information
- Chunks too large: dilutes relevance signal
- No metadata: can't filter by equipment type
- Pure keyword search: misses semantic matches (acceptable for v1)
