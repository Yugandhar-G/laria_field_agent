# CLAUDE.md — LARIA Field Agent

## What This Project Is

LARIA Field Agent is a production-grade web application that turns any
phone into an AI-powered field expert for skilled trades workers. A
technician opens a URL, grants camera and microphone access, and has a
continuous real-time conversation with an AI that can SEE what they see
and HEAR what they say. The AI identifies equipment, diagnoses problems,
and guides repairs with visual overlays on the camera feed.

Target demo equipment: a consumer toaster (relatable, every judge has one)
and a data center CRAC unit (real commercial use case).

## Architecture

```
Browser (React + Vite + TypeScript)
  │
  ├── Camera feed ──┐
  ├── Mic audio ────┤── WebSocket ──► Gemini Live API
  ├── Text input ───┘                    │
  │                                      │
  │   ◄── Audio responses ──────────────┘
  │   ◄── Text responses ───────────────┘
  │   ◄── Function calls (overlays) ────┘
  │
  └── HTTP ──► FastAPI Backend (Cloud Run)
                  └── /api/knowledge (RAG retrieval)
                  └── /api/sessions (session logging)
```

Core AI interaction flows through Gemini Live API WebSocket directly
from the browser. The backend exists ONLY for knowledge base retrieval
and session persistence.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite + TypeScript | Strict mode, no `any` |
| UI Components | shadcn/ui | Radix primitives |
| Styling | Tailwind CSS 3 | Mobile-first |
| Camera/Audio | Web APIs (getUserMedia, Web Audio) | No libraries |
| AI Engine | Gemini Live API | WebSocket, gemini-2.5-flash |
| Backend | FastAPI + Python 3.12 | Async handlers |
| Knowledge Base | JSON + keyword search (v1) | Upgrade to pgvector later |
| Deployment | Vercel (frontend) + Cloud Run (backend) | HTTPS required for camera |

## Code Standards

- TypeScript strict mode. No `any` types. No `@ts-ignore`.
- Every file starts with a JSDoc block: what it does, inputs, outputs, dependencies.
- Max 300 lines per file. Split if larger.
- Functions max 50 lines. Extract helpers if longer.
- All async code wrapped in try/catch with meaningful error messages.
- No console.log in production code. Use a logger utility.
- Conventional commits: feat:, fix:, refactor:, docs:, test:, chore:
- No default exports except for React components (shadcn convention).
- Handle errors at every level with user-friendly surface messages and detailed server-side logging.
- Validate all external input at system boundaries using schema-based validation (Pydantic, Zod).
- Secrets via environment variables only. Never hardcode, never log.
- API responses: consistent envelope { success, data, error }.
- Immutability by default. Return new objects. Never mutate in place unless idiomatically required.

## File Naming

- React components: kebab-case.tsx (shadcn convention)
- Hooks: use-[name].ts
- Services: [name].service.ts
- Utils: [name].utils.ts
- Types: [name].types.ts
- Python: snake_case.py

## Critical Rules

1. ALL Gemini interaction goes through WebSocket (Live API). Never REST.
2. Camera defaults to rear-facing: facingMode: "environment"
3. Audio input: 16kHz PCM mono. Audio output: 24kHz PCM mono.
4. Overlays are HTML/CSS divs positioned over video. Not canvas.
5. Mobile Chrome (Android) is the primary target device.
6. HTTPS required for camera access. Vite dev server uses self-signed cert.
7. No localStorage/sessionStorage for state.
8. Backend knowledge endpoint is best-effort. If it fails, Gemini uses its own knowledge.
9. Function call responses MUST be sent back to Gemini after handling.
10. System prompt lives in its own file and is the single source of truth for AI behavior.

## Task Approach

- Multi-file / architectural tasks: plan first with explicit phases and dependencies.
- When a first attempt fails: root cause before retrying, don't brute force.
- Parallelize independent operations where possible.
- Small files over large ones. 200-300 lines typical, 300 max.
- Feature/domain organization, not type organization.

## Team

- Yugandhar: Architecture, frontend, integration, demo
- Nithin: Backend, RAG knowledge base, document ingestion, training data

## Environment Variables

Frontend (.env):
```
VITE_GEMINI_API_KEY=<key>
VITE_BACKEND_URL=http://localhost:8080
```

Backend (.env):
```
GEMINI_API_KEY=<key>
KNOWLEDGE_BASE_PATH=app/knowledge/knowledge_base.json
```
