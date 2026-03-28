"""
Procedure ingestion pipeline.

Extracts raw text from PDFs, YouTube transcripts, and plain text files,
then uses Gemini to structure the content into RepairProcedure JSON
and saves them to the procedures directory for ChromaDB indexing.

Usage:
    python -m scripts.ingest_procedures <source_path_or_url> [--type pdf|youtube|text]

Depends on: PyMuPDF, youtube-transcript-api, google-genai, python-dotenv
Output: app/knowledge/procedures/<id>.json
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND_ROOT / ".env")
except ImportError:
    pass

PROCEDURES_DIR = Path("app/knowledge/procedures")
PROCEDURES_DIR.mkdir(parents=True, exist_ok=True)


def extract_pdf_text(pdf_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    import fitz

    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text)
    doc.close()
    return "\n\n".join(pages)


def extract_youtube_transcript(url: str) -> str:
    """Extract transcript from a YouTube video."""
    video_id = _parse_youtube_id(url)
    if not video_id:
        raise ValueError(f"Cannot parse YouTube video ID from: {url}")

    from youtube_transcript_api import YouTubeTranscriptApi

    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

    try:
        transcript = transcript_list.find_transcript(["en"])
    except Exception:
        transcript = transcript_list.find_generated_transcript(["en"])

    entries = transcript.fetch()
    lines: list[str] = []
    for entry in entries:
        text = entry.get("text", entry.text if hasattr(entry, "text") else str(entry))
        lines.append(text)

    return " ".join(lines)


def _parse_youtube_id(url: str) -> str | None:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})",
        r"(?:embed\/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    if len(url) == 11 and re.match(r"^[a-zA-Z0-9_-]+$", url):
        return url
    return None


def extract_text_file(file_path: str) -> str:
    """Read a plain text or markdown file."""
    return Path(file_path).read_text(encoding="utf-8")


STRUCTURING_PROMPT = """You are a technical documentation analyst. Given raw text extracted from repair manuals, service guides, or tutorial transcripts, extract ONE or MORE structured repair procedures.

Each procedure must follow this EXACT JSON schema:

{
  "id": "string (lowercase-kebab-case, e.g. 'toaster-wont-heat')",
  "equipment": {
    "type": "string (e.g. 'toaster', 'crac-unit', 'ups')",
    "models": ["string (specific model names if mentioned)"],
    "identifiers": ["string (visual identifiers to recognize this equipment)"]
  },
  "symptom": "string (the problem being addressed, user-facing language)",
  "difficulty": "beginner | intermediate | advanced",
  "estimated_time_minutes": number,
  "tools_required": ["string"],
  "safety": {
    "preconditions": ["string (things that MUST be true before starting)"],
    "hazards": ["string (specific dangers)"]
  },
  "steps": [
    {
      "order": number (1-based),
      "action": "string (what to DO)",
      "what_to_look_for": "string (what the camera/user should observe)",
      "visual_confirmation": "string (how to verify this step succeeded)",
      "overlay": {
        "position": "top-left|top-center|top-right|center-left|center|center-right|bottom-left|bottom-center|bottom-right",
        "type": "highlight|warning|info|step",
        "label": "string (short label for UI overlay)"
      },
      "if_issue_found": "string (what to do if something is wrong, optional)",
      "safety_note": "string (step-specific safety concern, optional)"
    }
  ],
  "sources": ["string (where this information came from)"]
}

RULES:
1. Extract EVERY distinct repair procedure from the text. One symptom = one procedure.
2. Steps MUST be in the order a technician would perform them.
3. visual_confirmation must describe something VISUALLY observable (camera can see it).
4. overlay positions should match where on the equipment the action happens.
5. Include ALL safety preconditions — err on the side of caution.
6. If the source mentions specific model numbers, include them in equipment.models.
7. identifiers should describe visual features (color, shape, brand logo location).
8. If information is insufficient for a full procedure, still create the best one you can with clear what_to_look_for descriptions.

Return ONLY valid JSON — an array of procedure objects. No markdown, no explanation."""


def structure_with_gemini(
    raw_text: str,
    source_label: str,
    api_key: str,
) -> list[dict]:
    """Use Gemini to convert raw text into structured RepairProcedure JSON."""
    from google import genai

    client = genai.Client(api_key=api_key)

    chunks = _chunk_text(raw_text, max_chars=25000)
    all_procedures: list[dict] = []

    for i, chunk in enumerate(chunks):
        prompt = f"{STRUCTURING_PROMPT}\n\n--- SOURCE: {source_label} (chunk {i+1}/{len(chunks)}) ---\n\n{chunk}"

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                all_procedures.extend(parsed)
            elif isinstance(parsed, dict):
                all_procedures.append(parsed)
        except json.JSONDecodeError as exc:
            print(f"  [WARN] Failed to parse Gemini output for chunk {i+1}: {exc}")
            continue

        if len(chunks) > 1 and i < len(chunks) - 1:
            time.sleep(1)

    for proc in all_procedures:
        if "sources" not in proc:
            proc["sources"] = []
        if source_label not in proc["sources"]:
            proc["sources"].append(source_label)

    return all_procedures


def _chunk_text(text: str, max_chars: int = 25000) -> list[str]:
    """Split text into chunks that fit within Gemini's context window."""
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    paragraphs = text.split("\n\n")
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) > max_chars and current:
            chunks.append("\n\n".join(current))
            current = []
            current_len = 0
        current.append(para)
        current_len += len(para) + 2

    if current:
        chunks.append("\n\n".join(current))

    return chunks


def save_procedures(procedures: list[dict]) -> list[str]:
    """Validate and save procedures to disk as individual JSON files."""
    from app.models.schemas import RepairProcedure

    saved: list[str] = []
    for proc_data in procedures:
        try:
            proc = RepairProcedure.model_validate(proc_data)
            out_path = PROCEDURES_DIR / f"{proc.id}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(proc.model_dump_json(indent=2))
            saved.append(proc.id)
            print(f"  Saved: {proc.id} ({len(proc.steps)} steps)")
        except Exception as exc:
            proc_id = proc_data.get("id", "unknown")
            print(f"  [WARN] Validation failed for {proc_id}: {exc}")

    return saved


def ingest(
    source: str,
    source_type: str = "auto",
    api_key: str = "",
) -> list[str]:
    """
    Full ingestion pipeline: extract → structure → validate → save.

    Returns list of saved procedure IDs.
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY", "") or os.getenv(
        "GOOGLE_API_KEY", ""
    )
    if not api_key:
        print(
            "[ERROR] GEMINI_API_KEY or GOOGLE_API_KEY required for structuring. "
            "Set in backend/.env or pass --api-key."
        )
        return []

    if source_type == "auto":
        if source.startswith(("http://", "https://")) and (
            "youtube.com" in source or "youtu.be" in source
        ):
            source_type = "youtube"
        elif source.lower().endswith(".pdf"):
            source_type = "pdf"
        else:
            source_type = "text"

    print(f"[Ingest] Source: {source}")
    print(f"[Ingest] Type: {source_type}")

    if source_type == "pdf":
        raw_text = extract_pdf_text(source)
        source_label = Path(source).stem
    elif source_type == "youtube":
        raw_text = extract_youtube_transcript(source)
        source_label = f"youtube:{_parse_youtube_id(source) or source}"
    elif source_type == "text":
        raw_text = extract_text_file(source)
        source_label = Path(source).stem
    else:
        print(f"[ERROR] Unknown source type: {source_type}")
        return []

    print(f"[Ingest] Extracted {len(raw_text)} chars of raw text")

    if len(raw_text) < 50:
        print("[WARN] Very little text extracted — results may be poor")

    print("[Ingest] Structuring with Gemini...")
    procedures = structure_with_gemini(raw_text, source_label, api_key)
    print(f"[Ingest] Gemini produced {len(procedures)} procedure(s)")

    if not procedures:
        print("[WARN] No procedures extracted")
        return []

    saved = save_procedures(procedures)
    print(f"[Ingest] Saved {len(saved)} procedure(s) to {PROCEDURES_DIR}")

    return saved


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest source materials into structured repair procedures"
    )
    parser.add_argument("source", help="Path to PDF/text file or YouTube URL")
    parser.add_argument(
        "--type",
        choices=["pdf", "youtube", "text", "auto"],
        default="auto",
        help="Source type (default: auto-detect)",
    )
    parser.add_argument(
        "--api-key",
        default="",
        help="Gemini API key (or set GEMINI_API_KEY env var)",
    )

    args = parser.parse_args()
    saved = ingest(args.source, args.type, args.api_key)

    if saved:
        print(f"\nDone. {len(saved)} procedures ready for indexing.")
        print("Restart the backend to load them into ChromaDB.")
    else:
        print("\nNo procedures were saved.")
        sys.exit(1)


if __name__ == "__main__":
    main()
