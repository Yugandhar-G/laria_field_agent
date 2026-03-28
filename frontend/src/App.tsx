/**
 * Root application component for LARIA Field Agent.
 *
 * Two-screen state machine: StartScreen (idle/error) and SessionScreen
 * (connecting/connected/reconnecting). Supports equipment hint for
 * system-instruction-first RAG procedure loading.
 *
 * Depends on: @/hooks/use-session, @/components/screens/*
 * Used by: main.tsx
 */

import { useCallback, useState } from "react";

import { SessionScreen } from "@/components/screens/session-screen";
import { StartScreen } from "@/components/screens/start-screen";
import { useSession } from "@/hooks/use-session";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
/** Empty = use Vite proxy (`/api` → FastAPI). Set full URL only if you skip the proxy. */
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "";

export default function App() {
  const {
    state,
    stepTracking,
    connect,
    disconnect,
    sendMessage,
    startStreams,
    dismissDiagnosis,
    dismissReport,
  } = useSession(API_KEY, BACKEND_URL);

  const [equipmentHint, setEquipmentHint] = useState("");

  const handleStart = useCallback(async () => {
    try {
      await connect(equipmentHint || undefined);
    } catch (err) {
      console.error("[App] Connection failed:", err);
    }
  }, [connect, equipmentHint]);

  const isConnected =
    state.connectionState === "connected" ||
    state.connectionState === "reconnecting";

  const isConnecting = state.connectionState === "connecting";

  if (isConnected) {
    return (
      <SessionScreen
        state={state}
        stepTracking={stepTracking}
        onDisconnect={disconnect}
        onSendMessage={sendMessage}
        onStartStreams={startStreams}
        onDismissDiagnosis={dismissDiagnosis}
        onDismissReport={dismissReport}
      />
    );
  }

  return (
    <StartScreen
      onStart={handleStart}
      isLoading={isConnecting}
      error={state.error}
      equipmentHint={equipmentHint}
      onEquipmentHintChange={setEquipmentHint}
    />
  );
}
