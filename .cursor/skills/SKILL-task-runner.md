# TASK RUNNER — Build Sequence

## Dependency Graph

```
YUGANDHAR (frontend + config):
  Y1: Project scaffold (package.json, tsconfig, tailwind, vite)  → blocks all
  Y2: shadcn/ui setup + cn utility                               → blocks Y5
  Y3: Shared types (types/index.ts)                               → blocks Y4,Y5,Y6
  Y4: Audio player (utils/audio-player.ts)                        → blocks Y6
  Y5: Gemini socket service (services/gemini-socket.service.ts)   → blocks Y6
  Y6: System prompt (services/system-prompt.ts)                   → blocks Y7
  Y7: Camera hook (hooks/use-camera.ts)                           → blocks Y8
  Y8: Session hook (hooks/use-session.ts)                         → blocks Y9
  Y9: Overlay components (overlays/*.tsx)                         → blocks Y10
  Y10: Screens (start-screen.tsx, session-screen.tsx)             → blocks Y11
  Y11: App.tsx assembly                                           → blocks Y12
  Y12: Knowledge service (services/knowledge.service.ts)          → needs backend URL
  Y13: Deploy to Vercel                                           → final

NITHIN (backend):
  N1: Backend scaffold (main.py, config.py, schemas.py)           → blocks N2
  N2: Knowledge base JSON content (10+ entries)                   → blocks N3
  N3: Knowledge endpoint + service                                → blocks N4
  N4: Session logging endpoint                                    → blocks N5
  N5: Manual ingestion script                                     → optional
  N6: Tests                                                       → blocks N7
  N7: Deploy to Cloud Run                                         → gives URL to Y12
```

## Cursor Prompt (paste this at start of every task)

```
Read these files before writing any code:
1. /CLAUDE.md (project architecture and rules)
2. /skills/SKILL-[relevant].md (exact specification)

Follow the skill file as the spec. Do not add packages not in CLAUDE.md.
Do not invent function signatures. Do not use 'any' types. Do not leave
TODO comments. Implement everything fully. Every file needs a JSDoc header.
```

## Quick Commands

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload --port 8080

# Tests
cd backend && pytest tests/ -v
```
