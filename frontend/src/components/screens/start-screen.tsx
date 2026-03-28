/**
 * Start screen shown before a session begins.
 *
 * Dark gradient background with LARIA wordmark, tagline, equipment
 * hint input (for pre-loading procedures), and start button.
 *
 * Depends on: @/components/ui/button, lucide-react
 * Used by: App.tsx
 */

import { Camera, Loader2, Mic, Search, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StartScreenProps {
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
  equipmentHint: string;
  onEquipmentHintChange: (value: string) => void;
}

export function StartScreen({
  onStart,
  isLoading,
  error,
  equipmentHint,
  onEquipmentHintChange,
}: StartScreenProps) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-8 w-8 text-green-400" />
          <h1 className="text-4xl font-bold text-white tracking-tight">
            LARIA
          </h1>
        </div>

        <p className="text-lg text-zinc-400 mb-8">Your AI Field Expert</p>

        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          Point your camera at any equipment. LARIA will identify it,
          diagnose issues, and guide you through repairs with real-time
          visual overlays and voice instructions.
        </p>

        <div className="w-full mb-6">
          <label
            htmlFor="equipment-hint"
            className="block text-xs text-zinc-500 mb-1.5 text-left"
          >
            What are you working on? (optional)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <input
              id="equipment-hint"
              type="text"
              value={equipmentHint}
              onChange={(e) => onEquipmentHintChange(e.target.value)}
              placeholder="e.g. toaster won't heat, CRAC unit high temp..."
              className="w-full h-11 pl-9 pr-3 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 min-h-[44px]"
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1 text-left">
            Pre-loads repair procedures for faster guidance
          </p>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Button
          onClick={onStart}
          disabled={isLoading}
          size="lg"
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white rounded-xl min-h-[44px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {equipmentHint ? "Loading procedures..." : "Connecting..."}
            </>
          ) : (
            "Start Session"
          )}
        </Button>

        <div className="mt-6 flex items-center gap-4 text-zinc-600 text-xs">
          <span className="flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" />
            Camera
          </span>
          <span className="flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" />
            Microphone
          </span>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Requires camera and microphone access
        </p>
      </div>
    </div>
  );
}
