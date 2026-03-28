/**
 * AR-style overlay layer that renders target markers on the camera feed.
 *
 * Each overlay is a compact pill with a colored dot indicator, positioned
 * on the 9-grid. Only one overlay per grid slot (use-session replaces).
 * Rings use inline CSS animations for reliability across build configs.
 *
 * Depends on: @/types (Overlay, POSITION_STYLES, OVERLAY_COLORS)
 * Used by: session-screen.tsx
 */

import type { Overlay, OverlayType } from "@/types";
import { OVERLAY_COLORS, POSITION_STYLES } from "@/types";

interface OverlayLayerProps {
  overlays: Overlay[];
}

const RING_COLORS: Record<OverlayType, string> = {
  highlight: "rgb(250, 204, 21)",
  warning: "rgb(239, 68, 68)",
  info: "rgb(34, 211, 238)",
  step: "rgb(52, 211, 153)",
};

function OverlayMarker({ overlay }: { overlay: Overlay }) {
  const colors = OVERLAY_COLORS[overlay.type];
  const ringColor = RING_COLORS[overlay.type];
  const posStyle = POSITION_STYLES[overlay.position];

  return (
    <div
      className="absolute flex flex-col items-center"
      style={posStyle}
    >
      {/* Pulsing target ring */}
      <div className="relative w-10 h-10 flex items-center justify-center mb-1">
        {/* Outer ping */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${ringColor}`,
            animation: "overlay-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
          }}
        />
        {/* Inner solid ring with fill */}
        <div
          className="absolute inset-[2px] rounded-full"
          style={{
            border: `2px solid ${ringColor}`,
            backgroundColor: `${ringColor}20`,
            boxShadow: `0 0 12px ${ringColor}80`,
          }}
        />
        {/* Center dot */}
        <div
          className="w-2 h-2 rounded-full z-10"
          style={{ backgroundColor: ringColor }}
        />
      </div>

      {/* Label pill */}
      <div
        className={`rounded-md border ${colors.border} backdrop-blur-sm px-2 py-1 max-w-[160px]`}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          animation: "overlay-fade-in 0.25s ease-out",
        }}
      >
        <span className={`text-[11px] font-semibold ${colors.accent} leading-tight block text-center`}>
          {overlay.label}
        </span>
      </div>
    </div>
  );
}

export function OverlayLayer({ overlays }: OverlayLayerProps) {
  if (overlays.length === 0) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <style>{`
        @keyframes overlay-ping {
          0% { transform: scale(1); opacity: 0.8; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes overlay-fade-in {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {overlays.map((overlay) => (
        <OverlayMarker key={overlay.id} overlay={overlay} />
      ))}
    </div>
  );
}
