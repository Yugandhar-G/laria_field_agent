/**
 * Safety warning banner displayed below the status bar.
 *
 * Appears when Gemini's show_diagnosis function call includes a
 * safety_warning field. Red background with alert icon.
 *
 * Depends on: lucide-react
 * Used by: session-screen.tsx
 */

import { AlertTriangle } from "lucide-react";

interface SafetyBannerProps {
  warning: string;
}

export function SafetyBanner({ warning }: SafetyBannerProps) {
  return (
    <div className="fixed top-12 left-0 right-0 z-40 bg-red-600 px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top duration-200">
      <AlertTriangle className="h-4 w-4 text-white shrink-0" />
      <p className="text-sm text-white font-medium truncate">{warning}</p>
    </div>
  );
}
