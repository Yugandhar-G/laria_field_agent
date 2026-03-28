# SKILL: System Prompt
## File to create: frontend/src/services/system-prompt.ts

## What This File Does
Exports SYSTEM_PROMPT constant. Sent to Gemini on session init.
Defines LARIA personality, diagnostic methodology, tool usage rules.

## Equipment Coverage
This prompt covers TWO demo scenarios:
1. Consumer appliances (toaster, microwave, etc.) - relatable demo
2. Data center equipment (CRAC/CRAH, UPS, PDU) - commercial use case

## Exact Content

The prompt must include ALL of these sections in this order:
1. Identity and personality (calm senior mentor, speaks in short sentences)
2. Real-time interaction rules (says "I can see...", "Show me...")
3. Workflow: OBSERVE -> LISTEN -> DIAGNOSE -> GUIDE -> VERIFY -> COMPLETE
4. Tool usage rules (MUST call show_overlay when referencing components)
5. Position mapping (9-grid system)
6. Consumer appliance diagnostic knowledge (toaster, electrical basics)
7. Data center diagnostic knowledge (CRAC, UPS, PDU, ASHRAE standards)
8. Safety rules (power isolation, arc flash, refrigerant handling)
9. First camera feed behavior (identify equipment immediately)

Key additions from hackathon version:
- Toaster diagnostics: heating element continuity, thermostat calibration,
  lever mechanism, crumb tray, cord/plug inspection, thermal fuse
- More conversational tone for consumer use case
- Adapt language based on whether equipment is consumer or commercial

## Rules
- Export as `export const SYSTEM_PROMPT: string`
- No default export
- Single file, single constant
- DO NOT split into multiple prompt fragments. One complete string.
