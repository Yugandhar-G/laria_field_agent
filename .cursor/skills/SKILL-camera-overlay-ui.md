# SKILL: Camera View and Overlay Components
## Files to create:
## - frontend/src/components/screens/session-screen.tsx (main session view)
## - frontend/src/components/overlays/overlay-layer.tsx
## - frontend/src/components/overlays/diagnosis-card.tsx
## - frontend/src/components/overlays/report-card.tsx
## - frontend/src/components/overlays/safety-banner.tsx
## - frontend/src/components/overlays/status-bar.tsx
## - frontend/src/hooks/use-camera.ts
## - frontend/src/hooks/use-session.ts

## Layout (mobile-first, full viewport)

```
┌──────────────────────────────┐
│ StatusBar                    │  fixed top, h-12, z-50
├──────────────────────────────┤
│ SafetyBanner (conditional)   │  fixed, z-40, red
├──────────────────────────────┤
│                              │
│   VIDEO (object-fit: cover)  │  absolute fill
│                              │
│   OverlayLayer (9-grid)      │  absolute fill, z-10
│     ┌──────┐                 │
│     │label │                 │
│     └──────┘                 │
│                              │
├──────────────────────────────┤
│ DiagnosisCard (conditional)  │  fixed bottom, z-30, slides up
│ OR ReportCard (conditional)  │
├──────────────────────────────┤
│ Control bar                  │  fixed bottom, z-50, h-16
│ [mic] [text input] [send]   │
└──────────────────────────────┘
```

## use-camera.ts Hook

```typescript
interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
}
export function useCamera(config?: Partial<CameraConfig>): UseCameraReturn;
```

- Requests rear camera on mount
- Creates hidden canvas for frame capture
- captureFrame() draws video to canvas, returns base64 JPEG (no prefix)
- Cleans up MediaStream tracks on unmount

## use-session.ts Hook

```typescript
interface UseSessionReturn {
  state: SessionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  clearOverlays: () => void;
  dismissDiagnosis: () => void;
  dismissReport: () => void;
}
export function useSession(apiKey: string, backendUrl: string): UseSessionReturn;
```

- Creates GeminiSocket and AudioPlayer
- Manages all SessionState (overlays, diagnosis, report, etc.)
- Handles function calls: updates state based on call name
- Sends function responses back to Gemini
- Triggers knowledge injection on equipment identification (once per session)
- Cleans up on unmount

## Overlay Styling

| Type | Border | Background | Icon |
|------|--------|------------|------|
| highlight | border-yellow-400 | bg-yellow-400/15 | Crosshair |
| warning | border-red-500 | bg-red-500/20 | AlertTriangle |
| info | border-blue-400 | bg-blue-400/15 | Info |
| step | border-green-400 | bg-green-400/15 | CheckCircle |

All overlays: backdrop-blur-sm, rounded-lg, px-3 py-2, text-white,
pointer-events-none, animate-pulse-overlay (custom animation)

## DiagnosisCard

- shadcn Card component with dark background
- Slides up from bottom with animate-slide-up
- Shows: primary cause (bold), confidence badge (colored), next step
- If safety_warning: red Alert at top of card
- If tools_needed: shown as Badge components
- Dismiss button (X) in top-right

## ReportCard

- Full-screen overlay (z-50)
- shadcn Card taking 90% of viewport
- Sections: Equipment, Diagnosis, Actions Taken, Parts Used, Follow-Up
- Share button (navigator.share API)
- Close button
- Generated timestamp

## SafetyBanner

- Full-width fixed bar below StatusBar
- Red background (bg-destructive)
- AlertTriangle icon + white text
- Appears/disappears with transition

## StatusBar

- Fixed bar at top, h-12, semi-transparent black
- Left: "LARIA" wordmark (bold, white)
- Center: connection status dot (green/red/yellow)
- Right: mic indicator icon

## DO NOT
- Do NOT use canvas for overlays. Use positioned divs with Tailwind.
- Do NOT add a "Scan" button. Camera streams continuously.
- Do NOT request camera+mic in one getUserMedia call. Separate them.
