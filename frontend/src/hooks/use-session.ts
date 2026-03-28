/**
 * Session management hook for LARIA Field Agent.
 *
 * Creates and manages the Gemini WebSocket connection and audio player.
 * Implements system-instruction-first RAG: fetches procedures BEFORE
 * connecting and embeds them in the system prompt. Handles step tracking,
 * all function calls, and transcript management.
 *
 * Depends on: @/types, @/services/gemini-socket.service, @/utils/audio-player,
 *             @/services/system-prompt, @/services/knowledge.service
 * Used by: App.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { createGeminiSocket } from "@/services/gemini-socket.service";
import { createKnowledgeService } from "@/services/knowledge.service";
import { SYSTEM_PROMPT } from "@/services/system-prompt";
import type {
  AudioPlayer,
  Diagnosis,
  GeminiFunctionCall,
  GeminiSocket,
  Overlay,
  ProcedureOutcome,
  RepairProcedure,
  ServiceReport,
  SessionState,
  StepTrackingState,
  TranscriptEntry,
} from "@/types";
import { INITIAL_SESSION_STATE } from "@/types";
import { createAudioPlayer } from "@/utils/audio-player";

interface UseSessionReturn {
  state: SessionState;
  stepTracking: StepTrackingState;
  connect: (equipmentHint?: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  startStreams: (videoElement: HTMLVideoElement) => Promise<void>;
  clearOverlays: () => void;
  dismissDiagnosis: () => void;
  dismissReport: () => void;
}

const INITIAL_STEP_TRACKING: StepTrackingState = {
  procedure: null,
  currentStep: 0,
  completedSteps: [],
  startedAt: null,
};

const OVERLAY_TTL_MS = 10_000;
const MAX_VISIBLE_OVERLAYS = 2;

export function useSession(
  apiKey: string,
  backendUrl: string
): UseSessionReturn {
  const [state, setState] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [stepTracking, setStepTracking] =
    useState<StepTrackingState>(INITIAL_STEP_TRACKING);

  const socketRef = useRef<GeminiSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const overlayCounterRef = useRef(0);
  const stateRef = useRef(state);
  const audioDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  stateRef.current = state;

  useEffect(() => {
    const expireTimer = setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        const fresh = prev.overlays.filter(
          (o) => now - o.createdAt < OVERLAY_TTL_MS
        );
        if (fresh.length === prev.overlays.length) return prev;
        return { ...prev, overlays: fresh };
      });
    }, 2000);
    return () => clearInterval(expireTimer);
  }, []);

  const updateState = useCallback(
    (updates: Partial<SessionState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const addTranscriptEntry = useCallback(
    (role: "user" | "agent", text: string) => {
      const entry: TranscriptEntry = {
        role,
        text,
        timestamp: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        transcriptEntries: [...prev.transcriptEntries, entry],
      }));
    },
    []
  );

  const handleFunctionCall = useCallback(
    (call: GeminiFunctionCall) => {
      switch (call.name) {
        case "show_overlay": {
          overlayCounterRef.current++;
          const newPosition =
            (call.args.position as Overlay["position"]) ?? "center";
          const overlay: Overlay = {
            id: `overlay-${overlayCounterRef.current}`,
            label: call.args.label ?? "",
            type: (call.args.type as Overlay["type"]) ?? "info",
            position: newPosition,
            detail: call.args.detail,
            createdAt: Date.now(),
          };
          setState((prev) => {
            const filtered = prev.overlays.filter(
              (o) => o.position !== newPosition
            );
            const next = [...filtered, overlay];
            const capped =
              next.length > MAX_VISIBLE_OVERLAYS
                ? next.slice(next.length - MAX_VISIBLE_OVERLAYS)
                : next;
            return { ...prev, overlays: capped };
          });
          break;
        }

        case "clear_overlays": {
          updateState({ overlays: [] });
          break;
        }

        case "show_diagnosis": {
          const diagnosis: Diagnosis = {
            primaryCause: call.args.primary_cause ?? "",
            confidence:
              (call.args.confidence as Diagnosis["confidence"]) ?? "medium",
            nextStep: call.args.next_step ?? "",
            toolsNeeded: call.args.tools_needed,
            safetyWarning: call.args.safety_warning,
          };
          updateState({
            diagnosis,
            safetyWarning: diagnosis.safetyWarning ?? null,
          });
          break;
        }

        case "generate_report": {
          const report: ServiceReport = {
            equipment: call.args.equipment ?? "",
            diagnosis: call.args.diagnosis ?? "",
            actionsTaken: call.args.actions_taken ?? "",
            partsUsed: call.args.parts_used,
            followUp: call.args.follow_up,
            generatedAt: Date.now(),
          };
          updateState({ report });
          break;
        }

        case "advance_step": {
          const completedStep = parseInt(call.args.completed_step ?? "0", 10);
          if (completedStep > 0) {
            setStepTracking((prev) => ({
              ...prev,
              completedSteps: [...prev.completedSteps, completedStep],
              currentStep: completedStep + 1,
            }));
          }
          break;
        }

        case "complete_procedure": {
          void (call.args.outcome as ProcedureOutcome);
          setStepTracking((prev) => ({
            ...prev,
            currentStep: prev.procedure?.steps.length ?? prev.currentStep,
          }));
          break;
        }

        default:
          console.warn(
            `[useSession] Unknown function call: ${call.name}`
          );
      }

      socketRef.current?.sendFunctionResponse(call.id, call.name, {
        success: true,
      });
    },
    [updateState]
  );

  useEffect(() => {
    const audioPlayer = createAudioPlayer();
    audioPlayerRef.current = audioPlayer;

    const socket = createGeminiSocket({
      onAudio: (base64PcmData) => {
        audioPlayer.playChunk(base64PcmData);

        if (audioDebounceRef.current) {
          clearTimeout(audioDebounceRef.current);
        }
        updateState({ isAudioPlaying: true });
      },
      onFunctionCall: handleFunctionCall,
      onFunctionCallCancellation: (ids) => {
        console.log("[useSession] Tool calls cancelled:", ids);
      },
      onTurnComplete: () => {
        audioDebounceRef.current = setTimeout(() => {
          updateState({ isAudioPlaying: false });
        }, 500);
      },
      onInputTranscript: (text) => {
        addTranscriptEntry("user", text);
      },
      onOutputTranscript: (text) => {
        addTranscriptEntry("agent", text);
      },
      onStateChange: (connectionState) => {
        updateState({ connectionState });
      },
      onInterrupted: () => {
        audioPlayer.stop();
        if (audioDebounceRef.current) {
          clearTimeout(audioDebounceRef.current);
        }
        updateState({ isAudioPlaying: false });
      },
      onError: (error) => {
        updateState({ error, connectionState: "error" });
      },
    });
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      audioPlayer.stop();
      if (audioDebounceRef.current) {
        clearTimeout(audioDebounceRef.current);
      }
    };
  }, [handleFunctionCall, updateState, addTranscriptEntry]);

  const connect = useCallback(
    async (equipmentHint?: string) => {
      if (!socketRef.current) return;
      updateState({ error: null });

      let fullPrompt = SYSTEM_PROMPT;

      if (equipmentHint) {
        const knowledgeService = createKnowledgeService(backendUrl);
        const procedures = await knowledgeService.searchProcedures(
          equipmentHint
        );

        if (procedures.length > 0) {
          const procedureContext =
            knowledgeService.formatProceduresForSystemPrompt(procedures);
          fullPrompt = SYSTEM_PROMPT + procedureContext;

          setStepTracking({
            procedure: procedures[0] as RepairProcedure,
            currentStep: 1,
            completedSteps: [],
            startedAt: Date.now(),
          });
        }
      }

      await socketRef.current.connect(apiKey, fullPrompt);
    },
    [apiKey, backendUrl, updateState]
  );

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    audioPlayerRef.current?.stop();
    if (audioDebounceRef.current) {
      clearTimeout(audioDebounceRef.current);
    }
    setState(INITIAL_SESSION_STATE);
    setStepTracking(INITIAL_STEP_TRACKING);
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.sendText(text);
  }, []);

  const startStreams = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (!socketRef.current) return;
      socketRef.current.startCameraStream(videoElement);
      try {
        await socketRef.current.startAudioStream();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Mic access denied";
        updateState({ error: msg });
      }
    },
    [updateState]
  );

  const clearOverlays = useCallback(() => {
    updateState({ overlays: [] });
  }, [updateState]);

  const dismissDiagnosis = useCallback(() => {
    updateState({ diagnosis: null, safetyWarning: null });
  }, [updateState]);

  const dismissReport = useCallback(() => {
    updateState({ report: null });
  }, [updateState]);

  return {
    state,
    stepTracking,
    connect,
    disconnect,
    sendMessage,
    startStreams,
    clearOverlays,
    dismissDiagnosis,
    dismissReport,
  };
}
