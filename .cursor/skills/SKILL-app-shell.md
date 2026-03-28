# SKILL: App Shell
## Files to create:
## - frontend/src/App.tsx
## - frontend/src/components/screens/start-screen.tsx
## - frontend/src/main.tsx
## - frontend/index.html

## App.tsx State Machine

```
idle ──[user taps Start]──> connecting ──[WS open]──> connected
                                │                         │
                                └──[error]──> error ◄─────┘
                                                │
                                          [retry] ──> connecting
```

Uses useSession hook. No routing library needed (two screens only).

## StartScreen Props
```typescript
interface StartScreenProps {
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
}
```

Design: Dark gradient background, LARIA wordmark, tagline
"Your AI Field Expert", start button (green, large), permission hint.
Use shadcn Button component. Lucide icons.

## index.html
- viewport: width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no
- theme-color: #0a0a0a
- apple-mobile-web-app-capable: yes
- Use 100dvh for height
- Body: bg-background, overflow-hidden, user-select-none

## DO NOT
- Do NOT add React Router
- Do NOT add Redux/Zustand
- Do NOT add service workers
- Do NOT add authentication screens
