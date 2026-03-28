# Agentic Pipeline Patterns

## When to Use This Skill
When working with Gemini's tool-calling (function calling) flow, designing
the function call handling pipeline, implementing guardrails, or debugging
why Gemini isn't calling tools correctly.

## Tool Calling Architecture (Gemini Live API)

In this project, Gemini calls 4 functions via the WebSocket:
- `show_overlay` - highlight equipment components on camera feed
- `clear_overlays` - remove all overlays
- `show_diagnosis` - display structured diagnosis card
- `generate_report` - create service report summary

## Tool Call Flow

```
Gemini sends top-level `toolCall` message (NOT inside serverContent)
  → toolCall.functionCalls[] contains array of { name, args, id }
  → Frontend parses each function call
  → Frontend dispatches to appropriate handler (update React state)
  → Frontend sends toolResponse back to Gemini (CRITICAL)
  → Gemini continues conversation with tool result context
```

Also handle `toolCallCancellation` messages:
```
Gemini sends top-level `toolCallCancellation` message
  → toolCallCancellation.ids[] contains array of call IDs to cancel
  → Frontend removes those pending calls from state
  → Do NOT send toolResponse for cancelled calls
```

## Critical: Function Response

EVERY function call MUST get a response sent back. Format (camelCase field names):
```json
{
  "toolResponse": {
    "functionResponses": [{
      "id": "<call.id>",
      "name": "<call.name>",
      "response": { "success": true }
    }]
  }
}
```

If you forget this, Gemini's conversation loop breaks. The model
will stop responding until it receives the tool response.

## Guardrails for This Project

Input guardrails (system prompt level):
- Safety-first: always mention power isolation before electrical work
- Never skip safety warnings for "warning" type overlays
- Adapt language for consumer vs commercial equipment

Output guardrails (function call validation):
- Validate overlay position is one of the 9 valid positions
- Validate overlay type is one of 4 valid types
- Validate confidence is one of 3 valid levels
- If validation fails: log warning, use defaults, don't crash

## Common Failure Modes

- **Gemini stops responding**: forgot to send function response
- **Wrong overlay positions**: system prompt position mapping unclear
- **Too many overlays**: no clear_overlays call between topics
- **No tool calls at all**: system prompt tool usage rules too weak
- **Tool call args missing**: function declaration schema too permissive
