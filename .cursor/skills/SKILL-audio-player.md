# SKILL: Audio Player
## File to create: frontend/src/utils/audio-player.ts

## What This File Does
Plays 24kHz PCM audio chunks from Gemini. Handles base64 decode,
Int16-to-Float32 conversion, AudioBuffer creation, and gapless
sequential playback via Web Audio API.

## Interface

```typescript
export function createAudioPlayer(): AudioPlayer;
```

The AudioPlayer interface is defined in @/types/index.ts. Import it, do not redefine:
```typescript
interface AudioPlayer {
  playChunk: (base64PcmData: string) => void;
  stop: () => void;
  setVolume: (level: number) => void;
  isPlaying: () => boolean;
}
```

## Implementation Requirements

- AudioContext at 24000 Hz sample rate
- GainNode for volume control
- Gapless playback: track nextStartTime, schedule buffers sequentially
- AudioContext must be created/resumed after user gesture (browser autoplay policy)
- Conversion pipeline: base64 -> Uint8Array -> Int16Array -> Float32Array (divide by 32768)
- stop() clears all scheduled sources, resets nextStartTime

## Conversion Functions

```typescript
function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i]! / 32768.0;
  }
  return float32Array;
}
```

## DO NOT
- Do NOT use HTMLAudioElement. Raw PCM requires Web Audio API.
- Do NOT resample. Play at native 24kHz.
- Do NOT install audio libraries.
