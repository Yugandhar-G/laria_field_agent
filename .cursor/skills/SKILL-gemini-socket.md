# SKILL: Gemini Live API WebSocket Connection
## File to create: frontend/src/services/gemini-socket.service.ts

## What This File Does
Manages the persistent WebSocket connection to Gemini Live API.
Streams camera frames (JPEG, 1 FPS) and mic audio (16kHz PCM) to Gemini.
Receives audio responses (24kHz PCM) and function calls (tool calls).
Text is received via audio transcription, not as a separate modality.
Handles reconnection with session resumption, error recovery, and graceful shutdown.

## Dependencies
- Types from @/types (ConnectionState, GeminiFunctionCall, GeminiSocketCallbacks, GeminiSocket)
- No external packages. Browser-native WebSocket + Web Audio API only.

## Constants
```
WS_BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
MODEL = "models/gemini-live-2.5-flash-native-audio"
MAX_RECONNECT_ATTEMPTS = 3
RECONNECT_DELAY_MS = 2000
FRAME_CAPTURE_INTERVAL_MS = 1000
AUDIO_SAMPLE_RATE_INPUT = 16000
AUDIO_SAMPLE_RATE_OUTPUT = 24000
```

## Exported Interface

```typescript
export function createGeminiSocket(callbacks: GeminiSocketCallbacks): GeminiSocket;
```

Types GeminiSocketCallbacks and GeminiSocket are defined in @/types/index.ts.
Do NOT redefine them in this file. Import them.

## Setup Message (sent on WebSocket open)

The setup message configures the session. The native audio model ONLY
supports AUDIO response modality. Text is obtained via transcription config.

```json
{
  "setup": {
    "model": "models/gemini-live-2.5-flash-native-audio",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Kore"
          }
        }
      }
    },
    "contextWindowCompression": {
      "slidingWindow": {}
    },
    "realtimeInputConfig": {
      "activityHandling": "START_OF_ACTIVITY_INTERRUPTS"
    },
    "systemInstruction": {
      "parts": [{ "text": "<systemPrompt>" }]
    },
    "tools": [{
      "functionDeclarations": [<...tool declarations below...>]
    }],
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "sessionResumption": {}
  }
}
```

CRITICAL features:
- contextWindowCompression: REQUIRED for audio+video sessions. Without it,
  sessions die after ~2 minutes. slidingWindow auto-compresses old context.
- realtimeInputConfig.activityHandling: enables natural turn-taking
- All field names are camelCase (not snake_case)
- responseModalities is ["AUDIO"] only (native audio model constraint)
- inputAudioTranscription: {} enables "You said:" transcripts
- outputAudioTranscription: {} enables "LARIA said:" transcripts
- sessionResumption: {} enables reconnection with context preservation

## Tool Response Strategy: SILENT vs Normal

UI-only tools (show_overlay, clear_overlays, advance_step) use SILENT
scheduling to prevent Gemini from generating redundant audio about them:

```json
{
  "toolResponse": {
    "functionResponses": [{
      "id": "<call.id>",
      "name": "<call.name>",
      "response": { "success": true },
      "scheduling": "SILENT"
    }]
  }
}
```

State-feedback tools (show_diagnosis, generate_report, complete_procedure)
use normal scheduling so Gemini acknowledges them verbally.

## Tool Call Deduplication

Track processed call IDs in a Set. Skip duplicate IDs across messages
and duplicate tool names within a single batch. Clear the set on
connect/disconnect.

### Tool Declarations

```json
{
  "functionDeclarations": [
    {
      "name": "show_overlay",
      "description": "Display a visual overlay on the camera feed to highlight a component or show an instruction.",
      "parameters": {
        "type": "OBJECT",
        "properties": {
          "label": { "type": "STRING", "description": "Short text label (e.g. 'Check this valve')" },
          "type": { "type": "STRING", "enum": ["highlight", "warning", "info", "step"] },
          "position": { "type": "STRING", "enum": ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"] },
          "detail": { "type": "STRING", "description": "Longer description (1-2 sentences)" }
        },
        "required": ["label", "type", "position"]
      }
    },
    {
      "name": "clear_overlays",
      "description": "Remove all visual overlays from the camera feed.",
      "parameters": { "type": "OBJECT", "properties": {} }
    },
    {
      "name": "show_diagnosis",
      "description": "Display a structured diagnosis card with causes and next steps.",
      "parameters": {
        "type": "OBJECT",
        "properties": {
          "primary_cause": { "type": "STRING" },
          "confidence": { "type": "STRING", "enum": ["high", "medium", "low"] },
          "next_step": { "type": "STRING" },
          "tools_needed": { "type": "STRING" },
          "safety_warning": { "type": "STRING" }
        },
        "required": ["primary_cause", "confidence", "next_step"]
      }
    },
    {
      "name": "generate_report",
      "description": "Generate a service report summarizing the session.",
      "parameters": {
        "type": "OBJECT",
        "properties": {
          "equipment": { "type": "STRING" },
          "diagnosis": { "type": "STRING" },
          "actions_taken": { "type": "STRING" },
          "parts_used": { "type": "STRING" },
          "follow_up": { "type": "STRING" }
        },
        "required": ["equipment", "diagnosis", "actions_taken"]
      }
    }
  ]
}
```

## Camera Frame Sending

Every FRAME_CAPTURE_INTERVAL_MS (1000ms):
1. Draw video frame to hidden canvas
2. Export as JPEG base64 at 0.6 quality
3. Strip `data:image/jpeg;base64,` prefix
4. Send as `realtimeInput.video`

```json
{ "realtimeInput": { "video": { "mimeType": "image/jpeg", "data": "<base64>" } } }
```

NOTE: The old `mediaChunks` field is DEPRECATED. Use separate `audio` and `video` fields.

## Audio Sending

Continuous mic stream at 16kHz mono PCM:
1. getUserMedia with audio constraints
2. AudioContext at 16000 Hz
3. MediaStreamSource -> ScriptProcessorNode (bufferSize 4096)
4. Convert Float32 to Int16 (multiply by 32767, clamp -32768..32767)
5. Encode Int16Array to base64
6. Send as `realtimeInput.audio`

```json
{ "realtimeInput": { "audio": { "mimeType": "audio/pcm;rate=16000", "data": "<base64>" } } }
```

When mic is paused/stopped, send: `{ "realtimeInput": { "audioStreamEnd": true } }`

## Incoming Message Parsing

WebSocket messages are top-level union types. Each message has EXACTLY ONE of:

- `setupComplete`: session ready, resolve connect() promise
- `serverContent`: model-generated content, contains:
  - `serverContent.modelTurn.parts[]`: each part can be:
    - `{ inlineData: { mimeType: "audio/pcm;rate=24000", data: string } }` -> dispatch to onAudio
  - `serverContent.turnComplete: true` -> model done, dispatch to onTurnComplete
  - `serverContent.interrupted: true` -> user interrupted, stop audio playback
  - `serverContent.inputTranscription.text` -> "You said:" text, dispatch to onInputTranscript
  - `serverContent.outputTranscription.text` -> "LARIA said:" text, dispatch to onOutputTranscript
- `toolCall`: function call request (TOP-LEVEL, not inside serverContent)
  - `toolCall.functionCalls[]`: array of { name, args, id }
  - Dispatch each to onFunctionCall
- `toolCallCancellation`: cancel previously issued tool calls
  - `toolCallCancellation.ids[]`: array of call IDs to cancel
  - Remove pending tool calls from state
- `sessionResumptionUpdate`: session handle for reconnection
  - `sessionResumptionUpdate.newHandle`: store this for reconnection
  - `sessionResumptionUpdate.resumable`: whether current state can be resumed
- `goAway`: server will disconnect soon
  - `goAway.timeLeft`: remaining time before disconnect
  - Trigger proactive reconnection

IMPORTANT: Native audio model does NOT send `{ text: string }` parts in
modelTurn. Text comes exclusively via `outputTranscription` messages.

## Function Response (CRITICAL)

After handling a function call, MUST send response back:
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

NOTE: Field names are camelCase (toolResponse, functionResponses), not
snake_case. This changed from the older API format.

## Reconnection Logic

### With Session Resumption (preferred)
- Store the latest `sessionResumptionUpdate.newHandle` throughout the session
- On unexpected close: reconnect with handle in setup message:
  `{ "setup": { ...sameConfig, "sessionResumption": { "handle": "<stored_handle>" } } }`
- This preserves conversation context across reconnections
- Handle may be `null` early in session or during generation; fall back to fresh setup

### Without Session Handle (fallback)
- On unexpected close: wait RECONNECT_DELAY_MS, retry up to MAX_RECONNECT_ATTEMPTS
- Re-send full setup message (context is lost)
- Restart camera/audio streams

### State Transitions
- connected -> reconnecting -> connected (or error after max attempts)

## Cleanup

disconnect() must:
1. Stop frame capture interval
2. Stop AudioContext and mic stream
3. Close WebSocket with code 1000
4. Set state to "idle"
5. Release all media tracks

## DO NOT
- Do NOT use socket.io or any WebSocket library. Use native WebSocket.
- Do NOT buffer outgoing frames. Send immediately.
- Do NOT send frames faster than 1 FPS.
- Do NOT close the socket on function call errors. Log and continue.
- Do NOT store message history. Gemini Live API is stateful.
- Do NOT use `mediaChunks` in realtimeInput. It is deprecated. Use `audio` and `video` fields.
- Do NOT set responseModalities to ["AUDIO", "TEXT"]. Native audio model only supports ["AUDIO"].
