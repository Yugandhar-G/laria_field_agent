/**
 * Audio player for Gemini Live API PCM audio output.
 *
 * Plays 24kHz PCM audio chunks with gapless scheduling using Web Audio API.
 * Handles base64 decoding, Int16-to-Float32 conversion, and sequential
 * buffer scheduling to avoid audible gaps between chunks.
 *
 * Depends on: @/types (AudioPlayer)
 * Used by: use-session hook
 */

import type { AudioPlayer } from "@/types";

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

const SAMPLE_RATE = 24000;

export function createAudioPlayer(): AudioPlayer {
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let nextStartTime = 0;
  let playing = false;
  const scheduledSources: AudioBufferSourceNode[] = [];

  function ensureContext(): { ctx: AudioContext; gain: GainNode } {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return { ctx: audioContext, gain: gainNode! };
  }

  function playChunk(base64PcmData: string): void {
    const { ctx, gain } = ensureContext();

    const int16Data = base64ToInt16Array(base64PcmData);
    const float32Data = int16ToFloat32(int16Data);

    const buffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(float32Data);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const now = ctx.currentTime;
    const startAt = Math.max(nextStartTime, now);
    source.start(startAt);
    nextStartTime = startAt + buffer.duration;

    playing = true;
    scheduledSources.push(source);

    source.onended = () => {
      const idx = scheduledSources.indexOf(source);
      if (idx !== -1) {
        scheduledSources.splice(idx, 1);
      }
      if (scheduledSources.length === 0) {
        playing = false;
      }
    };
  }

  function stop(): void {
    for (const source of scheduledSources) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    scheduledSources.length = 0;
    nextStartTime = 0;
    playing = false;
  }

  function setVolume(level: number): void {
    const { gain } = ensureContext();
    gain.gain.value = Math.max(0, Math.min(1, level));
  }

  function isPlaying(): boolean {
    return playing;
  }

  return { playChunk, stop, setVolume, isPlaying };
}
