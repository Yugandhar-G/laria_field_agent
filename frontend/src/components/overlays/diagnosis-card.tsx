/**
 * Diagnosis card that slides up from the bottom of the screen.
 *
 * Displays structured diagnosis data from Gemini's show_diagnosis function
 * call: primary cause, confidence level, next steps, tools needed,
 * and safety warnings.
 *
 * Depends on: @/types (Diagnosis), @/components/ui/card, @/components/ui/badge, @/components/ui/button
 * Used by: session-screen.tsx
 */

import { AlertTriangle, Wrench, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Diagnosis } from "@/types";

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  onDismiss: () => void;
}

const CONFIDENCE_STYLES: Record<
  Diagnosis["confidence"],
  { label: string; className: string }
> = {
  high: {
    label: "High Confidence",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  medium: {
    label: "Medium Confidence",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  low: {
    label: "Low Confidence",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function DiagnosisCard({ diagnosis, onDismiss }: DiagnosisCardProps) {
  const confidence = CONFIDENCE_STYLES[diagnosis.confidence];

  return (
    <div className="fixed bottom-16 inset-x-0 z-30 px-4 pb-2 animate-in slide-in-from-bottom duration-300">
      <Card className="bg-zinc-900/95 border-zinc-700 backdrop-blur-md w-full max-w-md mx-auto overflow-hidden">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm text-white shrink-0">Diagnosis</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-white shrink-0"
              onClick={onDismiss}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {diagnosis.safetyWarning && (
            <div className="flex items-start gap-1.5 p-1.5 mt-1.5 rounded bg-red-500/20 border border-red-500/30">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-px" />
              <span className="text-[11px] text-red-300 leading-snug break-words">
                {diagnosis.safetyWarning}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div>
            <p className="text-xs font-semibold text-white break-words">
              {diagnosis.primaryCause}
            </p>
            <Badge
              className={`mt-1 text-[10px] ${confidence.className} border`}
              variant="outline"
            >
              {confidence.label}
            </Badge>
          </div>

          <div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
              Next Step
            </p>
            <p className="text-xs text-zinc-200 break-words">{diagnosis.nextStep}</p>
          </div>

          {diagnosis.toolsNeeded && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="text-[11px] text-zinc-300 break-words">
                {diagnosis.toolsNeeded}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
