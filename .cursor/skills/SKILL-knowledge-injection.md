# SKILL: Procedure-Based Knowledge Injection (System-Instruction-First RAG)
## File: frontend/src/services/knowledge.service.ts

## Architecture

Knowledge injection follows SYSTEM-INSTRUCTION-FIRST strategy:
- Procedures are fetched from the backend BEFORE WebSocket connect
- Procedure text is appended to the system prompt
- The full prompt (base + procedures) is sent in the setup message
- NO mid-session sendText injection (causes context loss + interrupts audio)

## Interface

```typescript
export interface KnowledgeService {
  searchProcedures: (query: string, equipmentType?: string) => Promise<RepairProcedure[]>;
  formatProceduresForSystemPrompt: (procedures: RepairProcedure[]) => string;
}

export function createKnowledgeService(backendUrl: string): KnowledgeService;
```

## Flow

1. User types optional equipment hint on StartScreen
2. `connect(equipmentHint)` is called in use-session
3. If hint provided: POST to `/api/procedures/search` with { query: hint }
4. Format matched procedures into system prompt appendix
5. Append to SYSTEM_PROMPT before calling `socket.connect(apiKey, fullPrompt)`
6. First matched procedure becomes the active step-tracking target

## Format for System Prompt

```
## LOADED REPAIR PROCEDURES

Follow these procedures step-by-step when the symptom matches.
Use advance_step tool after visually confirming each step is complete.
Use complete_procedure tool when all steps are done.

### Procedure: {symptom}
Equipment: {type} ({models})
Difficulty: {difficulty} | Est. time: {minutes} min
Tools needed: {tools}

Safety preconditions:
  - {precondition}

Steps:
  Step 1: {action}
    Look for: {whatToLookFor}
    Confirm: {visualConfirmation}
    Overlay: "{label}" at {position} ({type})
    If issue: {ifIssueFound}
    SAFETY: {safetyNote}
```

## DO NOT
- Do NOT inject knowledge via sendText mid-session
- Do NOT call this on every Gemini response
- Do NOT block the UI — searchProcedures is awaited in connect()
- Do NOT show raw procedure data in user-visible UI
- Do NOT load more than 3 procedures into a single prompt (context budget)
