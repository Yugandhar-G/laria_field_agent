/**
 * Camera access and frame capture hook.
 *
 * Manages rear camera access via getUserMedia and provides a hidden
 * canvas for JPEG frame capture. Handles cleanup of MediaStream tracks.
 *
 * Depends on: @/types (CameraConfig, DEFAULT_CAMERA_CONFIG)
 * Used by: session-screen.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { CameraConfig } from "@/types";
import { DEFAULT_CAMERA_CONFIG } from "@/types";

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
}

export function useCamera(
  config?: Partial<CameraConfig>
): UseCameraReturn {
  const mergedConfig: CameraConfig = { ...DEFAULT_CAMERA_CONFIG, ...config };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mergedConfig.facingMode,
          width: { ideal: mergedConfig.width },
          height: { ideal: mergedConfig.height },
          frameRate: { ideal: mergedConfig.frameRate },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Camera access denied";
      setError(message);
      setIsReady(false);
    }
  }, [
    mergedConfig.facingMode,
    mergedConfig.width,
    mergedConfig.height,
    mergedConfig.frameRate,
  ]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsReady(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isReady) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || mergedConfig.width;
    canvas.height = video.videoHeight || mergedConfig.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL(
      "image/jpeg",
      mergedConfig.jpegQuality
    );
    const base64 = dataUrl.split(",")[1];
    return base64 ?? null;
  }, [isReady, mergedConfig.width, mergedConfig.height, mergedConfig.jpegQuality]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isReady,
    error,
    startCamera,
    stopCamera,
    captureFrame,
  };
}
