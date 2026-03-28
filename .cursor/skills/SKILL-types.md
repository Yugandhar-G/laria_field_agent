# SKILL: Shared Types
## File to create: frontend/src/types/index.ts

## What This File Does
Single source of truth for ALL TypeScript interfaces and types used
across the project. Every component, hook, and service imports types
from here. No inline type definitions anywhere else.

## Exact Types to Define

```typescript
/** WebSocket connection lifecycle states */
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/** Visual overlay categories driven by Gemini function calls */
export type OverlayType = "highlight" | "warning" | "info" | "step";

/** 9-grid positioning system for camera feed overlays */
export type OverlayPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/** Diagnosis confidence levels */
export type Confidence = "high" | "medium" | "low";

/** A visual overlay rendered on the camera feed */
export interface Overlay {
  id: string;
  label: string;
  type: OverlayType;
  position: OverlayPosition;
  detail?: string;
  createdAt: number;
}

/** Structured diagnosis from Gemini show_diagnosis function call */
export interface Diagnosis {
  primaryCause: string;
  confidence: Confidence;
  nextStep: string;
  toolsNeeded?: string;
  safetyWarning?: string;
}

/** Service report from Gemini generate_report function call */
export interface ServiceReport {
  equipment: string;
  diagnosis: string;
  actionsTaken: string;
  partsUsed?: string;
  followUp?: string;
  generatedAt: number;
}

/** A single transcript entry (user or LARIA) */
export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

/** Complete session state for the UI */
export interface SessionState {
  connectionState: ConnectionState;
  overlays: Overlay[];
  diagnosis: Diagnosis | null;
  report: ServiceReport | null;
  safetyWarning: string | null;
  /** Structured transcript from audio transcription API */
  transcriptEntries: TranscriptEntry[];
  isAudioPlaying: boolean;
  error: string | null;
}

/** Initial session state */
export const INITIAL_SESSION_STATE: SessionState = {
  connectionState: "idle",
  overlays: [],
  diagnosis: null,
  report: null,
  safetyWarning: null,
  transcriptEntries: [],
  isAudioPlaying: false,
  error: null,
};

/** Gemini function call as received from WebSocket */
export interface GeminiFunctionCall {
  name: string;
  args: Record<string, string>;
  id: string;
}

/** Knowledge chunk returned by the backend RAG endpoint */
export interface KnowledgeChunk {
  text: string;
  source: string;
  relevanceScore: number;
}

/** Backend knowledge endpoint response */
export interface KnowledgeResponse {
  chunks: KnowledgeChunk[];
  totalFound: number;
}

/** Camera hardware configuration */
export interface CameraConfig {
  facingMode: "environment" | "user";
  width: number;
  height: number;
  frameRate: number;
  /** How often to capture and send frames to Gemini (ms) */
  captureIntervalMs: number;
  /** JPEG compression quality (0-1) */
  jpegQuality: number;
}

/** Default camera settings optimized for equipment inspection */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  facingMode: "environment",
  width: 1280,
  height: 720,
  frameRate: 30,
  captureIntervalMs: 1000,
  jpegQuality: 0.6,
};

/** Gemini WebSocket service callback signatures */
export interface GeminiSocketCallbacks {
  onAudio: (base64PcmData: string) => void;
  onFunctionCall: (call: GeminiFunctionCall) => void;
  onFunctionCallCancellation: (ids: string[]) => void;
  onTurnComplete: () => void;
  /** Transcript of user's speech from inputAudioTranscription */
  onInputTranscript: (text: string) => void;
  /** Transcript of LARIA's speech from outputAudioTranscription */
  onOutputTranscript: (text: string) => void;
  onStateChange: (state: ConnectionState) => void;
  onInterrupted: () => void;
  onError: (error: string) => void;
}

/** Gemini WebSocket service public interface */
export interface GeminiSocket {
  connect: (apiKey: string, systemPrompt: string) => Promise<void>;
  disconnect: () => void;
  sendText: (message: string) => void;
  sendFunctionResponse: (
    callId: string,
    functionName: string,
    result: Record<string, unknown>
  ) => void;
  startCameraStream: (videoElement: HTMLVideoElement) => void;
  startAudioStream: () => Promise<void>;
  stopStreams: () => void;
  getState: () => ConnectionState;
}

/** Audio player public interface */
export interface AudioPlayer {
  playChunk: (base64PcmData: string) => void;
  stop: () => void;
  setVolume: (level: number) => void;
  isPlaying: () => boolean;
}

/** CSS position mapping for overlay 9-grid */
export const POSITION_STYLES: Record<OverlayPosition, React.CSSProperties> = {
  "top-left": { top: "10%", left: "10%" },
  "top-center": { top: "10%", left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: "10%", right: "10%" },
  "center-left": { top: "50%", left: "10%", transform: "translateY(-50%)" },
  center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "center-right": { top: "50%", right: "10%", transform: "translateY(-50%)" },
  "bottom-left": { bottom: "20%", left: "10%" },
  "bottom-center": { bottom: "20%", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "20%", right: "10%" },
};

/** Color mapping for overlay types */
export const OVERLAY_COLORS: Record<OverlayType, { border: string; bg: string }> = {
  highlight: { border: "border-yellow-400", bg: "bg-yellow-400/15" },
  warning: { border: "border-red-500", bg: "bg-red-500/20" },
  info: { border: "border-blue-400", bg: "bg-blue-400/15" },
  step: { border: "border-green-400", bg: "bg-green-400/15" },
};
```

## Rules
- ALL types live in this file. No inline type definitions elsewhere.
- Use `interface` for object shapes, `type` for unions and primitives.
- Every interface field has a JSDoc comment if its purpose isn't obvious.
- Export everything. No default exports.
- Const objects (like DEFAULT_CAMERA_CONFIG) can live here too.
