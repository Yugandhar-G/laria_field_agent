<div align="center">

  <img src="docs/laria-logo.png" width="80" alt="LARIA Logo" />

  # LARIA Field Agent

  **Turn any phone into an AI-powered field expert.**

  [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Gemini](https://img.shields.io/badge/Gemini_Live-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
  [![License](https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge)](LICENSE)

  <br />

  Open a URL on your phone &middot; Point at equipment &middot; Get expert guidance

  [Demo](#demo) · [Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Tech Stack](#tech-stack)

</div>

---

## The Problem

Skilled trades workers — HVAC technicians, electricians, maintenance crews — face unfamiliar equipment in the field every day. Manuals are buried in trucks, senior experts are a phone call away (if they're available), and downtime costs real money.

**LARIA eliminates that gap.** A technician opens a URL, grants camera and microphone access, and starts a real-time conversation with an AI that can *see* what they see and *hear* what they say. No app install. No training. Just point and talk.

## Demo

> **Point your camera. Start talking. LARIA guides you through the repair.**

<!-- Replace with actual screenshots or video -->

| Identify Equipment | Diagnose Issues | Guided Repair |
|:---:|:---:|:---:|
| *AI identifies make, model, and components from the camera feed* | *Visual overlays highlight symptoms with a diagnosis card* | *Step-by-step walk-through with visual confirmations* |

> [!NOTE]
> Demo equipment: consumer toaster (relatable, everyone has one) and data center CRAC unit (real commercial use case).

## Features

- **Real-Time Video AI** — Continuous camera feed streamed to Gemini Live via WebSocket. The AI sees exactly what you see, live.
- **Voice Conversation** — Hands-free natural language. Speak while you work; LARIA responds with audio. 16kHz PCM in, 24kHz out.
- **Visual Overlays** — Components, symptoms, and repair targets highlighted directly on the camera feed using positioned HTML overlays on a 9-grid system.
- **Structured Diagnosis** — AI follows a strict 5-phase methodology: Identify → Assess → Diagnose → Guided Repair → Verify.
- **Procedure Engine** — RAG-powered knowledge base with structured repair procedures. Steps include overlay hints, visual confirmations, and safety preconditions.
- **Step Tracking** — Real-time progress bar with per-step completion. AI advances steps only after visual confirmation through the camera.
- **Safety First** — Automatic safety banners for power isolation, arc flash PPE, refrigerant handling, and lockout/tagout before any hands-on work.
- **Session Reports** — Complete service record generated at session end with diagnosis, steps taken, and outcome.
- **Zero Install** — Progressive web app. Open a URL, grant permissions, start working. Mobile Chrome (Android) is the primary target.

## Architecture

```
Browser (React + Vite + TypeScript)
 │
 ├── Camera feed ──┐
 ├── Mic audio ────┤── WebSocket ──► Gemini Live API
 ├── Text input ───┘                       │
 │                                         │
 │  ◄── Audio responses ──────────────────┘
 │  ◄── Text responses ───────────────────┘
 │  ◄── Function calls (overlays, diagnosis)─┘
 │
 └── HTTP ──► FastAPI Backend
              ├── POST /api/procedures/search  (semantic search)
              ├── POST /api/knowledge          (keyword search)
              ├── POST /api/sessions           (session logging)
              └── GET  /health
```

> [!IMPORTANT]
> All AI interaction flows through the **Gemini Live API WebSocket** directly from the browser. The backend never calls Gemini — it exists only for knowledge retrieval and session persistence.

### How It Works

1. **User opens the app** on their phone and optionally describes the equipment or issue.
2. **Frontend queries the backend** for matching repair procedures via semantic search (ChromaDB).
3. **Procedures are injected** into the Gemini system prompt as structured context.
4. **WebSocket opens** to Gemini Live API. Camera frames and microphone audio stream continuously.
5. **Gemini responds** with voice audio, text, and function calls (overlays, diagnosis cards, step advances).
6. **Frontend renders** overlays on the camera feed and plays audio responses in real-time.

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.12+
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com)
- **cloudflared** (optional, for mobile testing over HTTPS)

### 1. Clone

```bash
git clone https://github.com/your-org/laria-field-agent.git
cd laria-field-agent
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
```

Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_key_here
VITE_BACKEND_URL=
```

Start the dev server:

```bash
npm run dev
```

### 4. Access on Mobile

HTTPS is required for camera access. Use cloudflared to tunnel:

```bash
# Terminal 1: Backend
make backend

# Terminal 2: Frontend (HTTP mode for tunnel)
make dev-http

# Terminal 3: Tunnel
make tunnel
```

Open the `trycloudflare.com` URL on your phone. The tunnel provides HTTPS automatically.

> [!WARNING]
> A valid Gemini API key is required. Camera and microphone permissions must be granted on the device.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite + TypeScript | Strict mode, mobile-first SPA |
| **UI** | Tailwind CSS + Radix UI primitives | shadcn/ui component patterns |
| **Camera / Audio** | Web APIs (`getUserMedia`, Web Audio) | No external libraries |
| **AI Engine** | Gemini Live API (`gemini-2.5-flash`) | WebSocket, real-time multimodal |
| **Backend** | FastAPI + Python 3.12 | Async handlers, CORS |
| **Knowledge Base** | ChromaDB + JSON procedures | Semantic search over repair data |
| **Ingestion** | PyMuPDF + youtube-transcript-api | PDF manuals + video transcripts |
| **Deployment** | Vercel (frontend) + Cloud Run (backend) | HTTPS required for camera |

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── screens/          # StartScreen, SessionScreen
│   │   │   ├── overlays/         # DiagnosisCard, OverlayLayer, StatusBar, SafetyBanner
│   │   │   └── ui/              # Button, Card, Badge (shadcn-style)
│   │   ├── hooks/               # useSession, useCamera
│   │   ├── services/            # GeminiSocket, KnowledgeService, SystemPrompt
│   │   ├── utils/               # AudioPlayer
│   │   └── types/               # TypeScript type definitions
│   ├── index.html
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Pydantic settings
│   │   ├── routes/              # knowledge, procedures, sessions
│   │   ├── services/            # knowledge_service, procedure_store
│   │   ├── models/              # Pydantic schemas
│   │   └── knowledge/           # JSON knowledge base + procedures
│   ├── scripts/                 # PDF/YouTube ingestion pipelines
│   └── tests/                   # pytest async tests
│
├── CLAUDE.md                    # Architecture decisions & coding standards
├── Makefile                     # Dev workflow (backend, frontend, tunnel)
└── .gitignore
```

## Configuration

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_GEMINI_API_KEY` | Yes | Gemini API key from AI Studio |
| `VITE_BACKEND_URL` | No | Backend URL. Leave empty for Vite proxy (recommended) |

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `GEMINI_API_KEY` | No | — | Used by ingestion scripts only |
| `KNOWLEDGE_BASE_PATH` | No | `app/knowledge/knowledge_base.json` | Path to knowledge base |

## AI Function Calls

LARIA uses Gemini's function calling to trigger UI actions:

| Function | Purpose |
|----------|---------|
| `show_overlay` | Highlight a component or symptom on the camera feed |
| `clear_overlays` | Remove all active overlays |
| `show_diagnosis` | Display diagnosis card with cause, confidence, and next steps |
| `advance_step` | Mark a repair step as complete after visual confirmation |
| `complete_procedure` | End the repair with outcome status |
| `generate_report` | Create a session summary report |

## Diagnostic Methodology

LARIA follows a strict 5-phase approach for every interaction:

```
IDENTIFY ──► ASSESS ──► DIAGNOSE ──► GUIDED REPAIR ──► VERIFY
   │            │           │              │               │
   │            │           │              │               │
 Spot the    Ask about   Form a      Walk through      Test and
 equipment   symptoms    hypothesis  steps one-by-one  confirm fix
```

The AI never skips phases. It never combines multiple repair steps. Each step requires visual confirmation through the camera before advancing.

## Supported Equipment

| Category | Equipment | Coverage |
|----------|----------|----------|
| **Consumer** | Toasters (Hamilton Beach, etc.) | Full structured procedures |
| **Data Center** | CRAC/CRAH units | General diagnostics |
| **Data Center** | UPS systems | General diagnostics |
| **Data Center** | PDUs | General diagnostics |

> Adding new equipment: create a procedure JSON in `backend/app/knowledge/procedures/` and run the ingestion pipeline. See `backend/scripts/` for details.

## Roadmap

- [x] Real-time camera + Gemini Live WebSocket integration
- [x] Voice conversation (16kHz PCM input, 24kHz output)
- [x] Equipment knowledge base with semantic search
- [x] Structured repair procedures with step tracking
- [x] Visual overlay system (9-grid positioning)
- [x] Diagnosis cards and safety banners
- [x] Session report generation
- [ ] Offline mode with cached procedures
- [ ] Multi-language voice support
- [ ] Photo capture for documentation during repairs
- [ ] Session history and analytics dashboard
- [ ] AR-style overlay anchoring to detected components
- [ ] IoT sensor data integration for predictive diagnostics



## License

Distributed under the Apache License 2.0. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with Gemini Live API, React, and FastAPI</sub>
  <br />
  <a href="#laria-field-agent">Back to top</a>
</div>
