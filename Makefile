# LARIA dev — open three terminals and run one target each (order: backend → dev → tunnel).
# Prerequisites: pyenv Python 3.10+, backend/.env optional, frontend/.env.local with VITE_GEMINI_API_KEY.

.PHONY: backend dev dev-http tunnel tunnel-http help

help:
	@echo "Terminal 1: make backend    → FastAPI on :8000"
	@echo "Terminal 2: make dev-http  → Vite HTTP on :5173 (required for cloudflared; /api proxied)"
	@echo "Terminal 3: make tunnel    → public https URL → http://127.0.0.1:5173 (no TLS to Vite)"
	@echo "Optional: make dev + npm run tunnel:vite-https if you insist on local HTTPS (often flaky)."
	@echo "Open the trycloudflare.com URL — the page is still HTTPS (camera OK)."

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev:
	cd frontend && npm run dev

dev-http:
	cd frontend && npm run dev:http

tunnel:
	cd frontend && npm run tunnel

tunnel-http:
	cd frontend && npm run tunnel:http
