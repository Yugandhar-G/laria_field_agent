/**
 * Main session screen with camera feed, overlays, step progress, and controls.
 *
 * Full viewport camera view with overlay layer, status bar, step tracker,
 * safety banner, diagnosis card, and report card. Includes bottom control
 * bar with text input and disconnect button.
 *
 * Depends on: @/types, @/hooks/use-camera, overlay components,
 *             @/components/ui/button
 * Used by: App.tsx
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LogOut, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DiagnosisCard } from "@/components/overlays/diagnosis-card";
import { OverlayLayer } from "@/components/overlays/overlay-layer";
import { ReportCard } from "@/components/overlays/report-card";
import { SafetyBanner } from "@/components/overlays/safety-banner";
import { StatusBar } from "@/components/overlays/status-bar";
import { useCamera } from "@/hooks/use-camera";
import type { SessionState, StepTrackingState } from "@/types";

interface SessionScreenProps {
  state: SessionState;
  stepTracking: StepTrackingState;
  onDisconnect: () => void;
  onSendMessage: (text: string) => void;
  onStartStreams: (videoElement: HTMLVideoElement) => Promise<void>;
  onDismissDiagnosis: () => void;
  onDismissReport: () => void;
}

export function SessionScreen({
  state,
  stepTracking,
  onDisconnect,
  onSendMessage,
  onStartStreams,
  onDismissDiagnosis,
  onDismissReport,
}: SessionScreenProps) {
  const { videoRef, canvasRef, startCamera, stopCamera } = useCamera();
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const streamsStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await startCamera();
      if (cancelled || streamsStartedRef.current) return;
      if (videoRef.current) {
        streamsStartedRef.current = true;
        await onStartStreams(videoRef.current);
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setTextInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const totalSteps = stepTracking.procedure?.steps.length ?? 0;
  const completedCount = stepTracking.completedSteps.length;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black select-none">
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className="hidden" />

      <OverlayLayer overlays={state.overlays} />

      <StatusBar
        connectionState={state.connectionState}
        isAudioPlaying={state.isAudioPlaying}
      />

      {totalSteps > 0 && (
        <div className="fixed top-12 left-0 right-0 z-40 px-3">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-lg px-3 py-2">
            <span className="text-xs text-zinc-400 whitespace-nowrap">
              Step {Math.min(stepTracking.currentStep, totalSteps)}/{totalSteps}
            </span>
            <div className="flex-1 flex gap-1">
              {stepTracking.procedure?.steps.map((step) => {
                const isCompleted = stepTracking.completedSteps.includes(
                  step.order
                );
                const isCurrent = step.order === stepTracking.currentStep;
                return (
                  <div
                    key={step.order}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      isCompleted
                        ? "bg-green-400"
                        : isCurrent
                          ? "bg-green-400/40 animate-pulse"
                          : "bg-zinc-700"
                    }`}
                  />
                );
              })}
            </div>
            {completedCount === totalSteps && totalSteps > 0 && (
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            )}
          </div>
        </div>
      )}

      {state.safetyWarning && <SafetyBanner warning={state.safetyWarning} />}

      {state.diagnosis && (
        <DiagnosisCard
          diagnosis={state.diagnosis}
          onDismiss={onDismissDiagnosis}
        />
      )}

      {state.report && (
        <ReportCard report={state.report} onClose={onDismissReport} />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-black/80 backdrop-blur-md flex items-center gap-2 px-3 pb-safe">
        <input
          ref={inputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 h-10 px-3 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500/50 min-h-[44px]"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-green-400 hover:text-green-300 min-h-[44px] min-w-[44px]"
          onClick={handleSend}
          disabled={!textInput.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-red-400 hover:text-red-300 min-h-[44px] min-w-[44px]"
          onClick={onDisconnect}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
