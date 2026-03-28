/**
 * Shared type definitions for the LARIA Field Agent application.
 *
 * This is the SINGLE SOURCE OF TRUTH for all interfaces and types.
 * Every component, hook, and service imports types from here.
 *
 * Depends on: nothing
 * Used by: every file in the project
 */

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
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

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

/**
 * CSS position mapping for the overlay 9-grid.
 * Every position uses translate(-50%, -50%) so the target ring
 * is centered exactly at the anchor point. Percentages chosen to
 * avoid status bar (top), control bar (bottom), and screen edges.
 */
export const POSITION_STYLES: Record<OverlayPosition, React.CSSProperties> = {
  "top-left": {
    top: "15%", left: "18%",
    transform: "translateX(-50%)",
  },
  "top-center": {
    top: "15%", left: "50%",
    transform: "translateX(-50%)",
  },
  "top-right": {
    top: "15%", left: "82%",
    transform: "translateX(-50%)",
  },
  "center-left": {
    top: "45%", left: "18%",
    transform: "translate(-50%, -50%)",
  },
  center: {
    top: "45%", left: "50%",
    transform: "translate(-50%, -50%)",
  },
  "center-right": {
    top: "45%", left: "82%",
    transform: "translate(-50%, -50%)",
  },
  "bottom-left": {
    top: "68%", left: "18%",
    transform: "translateX(-50%)",
  },
  "bottom-center": {
    top: "68%", left: "50%",
    transform: "translateX(-50%)",
  },
  "bottom-right": {
    top: "68%", left: "82%",
    transform: "translateX(-50%)",
  },
};

/** Visual style config per overlay type, including ring and accent colors */
export const OVERLAY_COLORS: Record<
  OverlayType,
  {
    border: string;
    bg: string;
    ring: string;
    accent: string;
    glow: string;
  }
> = {
  highlight: {
    border: "border-yellow-400",
    bg: "bg-yellow-400/10",
    ring: "border-yellow-400",
    accent: "text-yellow-400",
    glow: "shadow-[0_0_20px_rgba(250,204,21,0.4)]",
  },
  warning: {
    border: "border-red-500",
    bg: "bg-red-500/15",
    ring: "border-red-500",
    accent: "text-red-500",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.5)]",
  },
  info: {
    border: "border-cyan-400",
    bg: "bg-cyan-400/10",
    ring: "border-cyan-400",
    accent: "text-cyan-400",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.35)]",
  },
  step: {
    border: "border-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "border-emerald-400",
    accent: "text-emerald-400",
    glow: "shadow-[0_0_18px_rgba(52,211,153,0.35)]",
  },
};

/** Overlay hint embedded in a procedure step */
export interface ProcedureOverlayHint {
  position: OverlayPosition;
  type: OverlayType;
  label: string;
}

/** A single step in a structured repair procedure */
export interface ProcedureStep {
  order: number;
  action: string;
  whatToLookFor: string;
  visualConfirmation: string;
  overlay?: ProcedureOverlayHint;
  ifIssueFound?: string;
  safetyNote?: string;
}

/** Safety information for a repair procedure */
export interface ProcedureSafety {
  preconditions: string[];
  hazards: string[];
}

/** Equipment identification metadata */
export interface ProcedureEquipment {
  type: string;
  models: string[];
  identifiers: string[];
}

/** Procedure completion outcome */
export type ProcedureOutcome = "resolved" | "partially_resolved" | "escalate";

/** Structured repair procedure from the knowledge base */
export interface RepairProcedure {
  id: string;
  equipment: ProcedureEquipment;
  symptom: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTimeMinutes: number;
  toolsRequired: string[];
  safety: ProcedureSafety;
  steps: ProcedureStep[];
  sources: string[];
}

/** Backend response with matched procedures */
export interface ProcedureSearchResponse {
  procedures: RepairProcedure[];
  totalFound: number;
}

/** Step tracking state for the active procedure */
export interface StepTrackingState {
  procedure: RepairProcedure | null;
  currentStep: number;
  completedSteps: number[];
  startedAt: number | null;
}
