# LLM Routing Intelligence

## When to Use This Skill
When making decisions about model selection, understanding why Gemini Live
API was chosen, or considering fallback strategies.

## Core Insight

Routing intelligence, not model capability, is the primary driver of system accuracy.
LARIA's accuracy jumped from 78% to 95% not by upgrading the model but by building
smarter routing and better context injection (RAG).

## This Project's Routing Decision

**Single model: Gemini 2.5 Flash via Live API**

Why:
- Real-time multimodal (camera + audio + text simultaneously)
- WebSocket-based continuous streaming (no request/response latency)
- Function calling support for overlay/diagnosis/report tools
- Fast enough for conversational latency (< 800ms first token)
- Cost-effective for continuous streaming sessions

## Why Not Other Models

- GPT-4o: no equivalent of Live API's continuous WebSocket streaming
- Claude: no real-time multimodal streaming API
- Gemini Pro: unnecessary capability for equipment inspection, higher cost
- Local models: can't match multimodal quality needed for visual equipment ID

## Latency Requirements

- First response after camera starts: < 2 seconds
- Conversational turn response: < 800ms first audio token
- Function call (overlay appears): < 500ms after Gemini sends it
- Knowledge injection (background): no hard limit, best-effort

## Fallback Strategy (v1)

If Gemini WebSocket fails:
1. Attempt reconnect (3 retries, 2s delay)
2. If all retries fail: show error state with retry button
3. No alternative model fallback for v1 (Live API has no equivalent)

## Post-Hackathon Considerations

- Add Gemini Pro as fallback for complex diagnostic reasoning
- Consider Claude for report generation (better structured output)
- Add routing based on equipment complexity (consumer vs industrial)
- Log routing decisions for optimization
