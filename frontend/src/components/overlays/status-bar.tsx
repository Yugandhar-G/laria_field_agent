/**
 * Top status bar showing connection state and mic indicator.
 *
 * Fixed at the top of the session screen. Shows LARIA wordmark,
 * connection status dot (green/yellow/red), and mic indicator.
 *
 * Depends on: @/types (ConnectionState)
 * Used by: session-screen.tsx
 */

import { Mic, MicOff } from "lucide-react";

import type { ConnectionState } from "@/types";

interface StatusBarProps {
  connectionState: ConnectionState;
  isAudioPlaying: boolean;
}

const STATUS_COLORS: Record<ConnectionState, string> = {
  idle: "bg-zinc-500",
  connecting: "bg-yellow-400 animate-pulse",
  connected: "bg-green-500",
  reconnecting: "bg-yellow-400 animate-pulse",
  error: "bg-red-500",
};

const STATUS_LABELS: Record<ConnectionState, string> = {
  idle: "Disconnected",
  connecting: "Connecting...",
  connected: "Live",
  reconnecting: "Reconnecting...",
  error: "Connection Error",
};

export function StatusBar({
  connectionState,
  isAudioPlaying,
}: StatusBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-black/70 backdrop-blur-md flex items-center justify-between px-4">
      <span className="text-white font-bold text-lg tracking-tight">
        LARIA
      </span>

      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[connectionState]}`}
        />
        <span className="text-xs text-zinc-300">
          {STATUS_LABELS[connectionState]}
        </span>
      </div>

      <div className="text-zinc-400">
        {connectionState === "connected" ? (
          <Mic className={`h-5 w-5 ${isAudioPlaying ? "text-green-400" : "text-white"}`} />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
