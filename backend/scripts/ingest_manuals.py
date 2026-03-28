"""
Manual ingestion script for adding equipment documentation to the knowledge base.

Reads PDF files from a specified directory, extracts text using PyMuPDF,
splits into chunks, and appends to knowledge_base.json.

Usage: python -m scripts.ingest_manuals --input-dir ./manuals --equipment toaster

Depends on: PyMuPDF (fitz)
Used by: developers (manual execution)
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)

DEFAULT_KB_PATH = Path("app/knowledge/knowledge_base.json")
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF file."""
    doc = fitz.open(str(pdf_path))
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks by word boundary."""
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap

    return chunks


def ingest(
    input_dir: Path,
    equipment: str,
    source_prefix: str,
    kb_path: Path,
) -> int:
    """Ingest all PDFs in input_dir into the knowledge base."""
    existing: list[dict] = []
    if kb_path.exists():
        with open(kb_path, encoding="utf-8") as f:
            existing = json.load(f)

    pdf_files = sorted(input_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {input_dir}")
        return 0

    added = 0
    for pdf_path in pdf_files:
        print(f"Processing: {pdf_path.name}")
        text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)

        for chunk in chunks:
            entry = {
                "text": chunk,
                "metadata": {
                    "source": f"{source_prefix}_{pdf_path.stem}",
                    "type": "manual",
                    "equipment": equipment,
                },
            }
            existing.append(entry)
            added += 1

    kb_path.parent.mkdir(parents=True, exist_ok=True)
    with open(kb_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)

    print(f"Added {added} chunks from {len(pdf_files)} files")
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest equipment manuals into knowledge base")
    parser.add_argument("--input-dir", type=Path, required=True, help="Directory containing PDF manuals")
    parser.add_argument("--equipment", type=str, required=True, help="Equipment type (e.g., toaster, crac)")
    parser.add_argument("--source", type=str, default="manual", help="Source prefix for metadata")
    parser.add_argument("--kb-path", type=Path, default=DEFAULT_KB_PATH, help="Knowledge base JSON path")
    args = parser.parse_args()

    if not args.input_dir.exists():
        print(f"Input directory not found: {args.input_dir}")
        sys.exit(1)

    ingest(args.input_dir, args.equipment, args.source, args.kb_path)


if __name__ == "__main__":
    main()
