/**
 * Gemini Live API WebSocket connection service.
 *
 * Manages persistent WebSocket to Gemini Live API. Streams camera frames
 * (JPEG, 1 FPS) and mic audio (16kHz PCM). Receives audio responses
 * (24kHz PCM), transcription text, and tool calls. Handles reconnection
 * with session resumption, context window compression for unlimited
 * session duration, and SILENT tool responses for UI-only tools.
 *
 * Depends on: @/types (GeminiSocket, GeminiSocketCallbacks, GeminiFunctionCall, ConnectionState)
 * Used by: use-session hook
 */

import type {
  ConnectionState,
  GeminiFunctionCall,
  GeminiSocket,
  GeminiSocketCallbacks,
} from "@/types";

const WS_BASE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const MODEL = "models/gemini-2.5-flash-native-audio-latest";
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const FRAME_CAPTURE_INTERVAL_MS = 1000;
const AUDIO_SAMPLE_RATE_INPUT = 16000;

const UI_ONLY_TOOLS = new Set([
  "show_overlay",
  "clear_overlays",
  "advance_step",
]);

export function createGeminiSocket(
  callbacks: GeminiSocketCallbacks
): GeminiSocket {
  let ws: WebSocket | null = null;
  let state: ConnectionState = "idle";
  let reconnectAttempts = 0;
  let frameIntervalId: ReturnType<typeof setInterval> | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let scriptProcessor: ScriptProcessorNode | null = null;
  let sessionResumeHandle: string | null = null;
  let currentApiKey = "";
  let currentSystemPrompt = "";
  let currentVideoElement: HTMLVideoElement | null = null;
  let hiddenCanvas: HTMLCanvasElement | null = null;
  let connectResolve: (() => void) | null = null;
  let connectReject: ((err: Error) => void) | null = null;

  const processedCallIds = new Set<string>();

  function setState(newState: ConnectionState): void {
    state = newState;
    callbacks.onStateChange(newState);
  }

  function buildSetupMessage(systemPrompt: string): Record<string, unknown> {
    const setup: Record<string, unknown> = {
      model: MODEL,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore",
            },
          },
        },
      },
      contextWindowCompression: {
        slidingWindow: {},
      },
      realtimeInputConfig: {
        activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "show_overlay",
              description:
                "Display a visual overlay on the camera feed to highlight a component or show an instruction. SILENT EXECUTION.",
              parameters: {
                type: "OBJECT",
                properties: {
                  label: {
                    type: "STRING",
                    description:
                      "Short text label (e.g. 'Check this valve')",
                  },
                  type: {
                    type: "STRING",
                    enum: ["highlight", "warning", "info", "step"],
                  },
                  position: {
                    type: "STRING",
                    enum: [
                      "top-left",
                      "top-center",
                      "top-right",
                      "center-left",
                      "center",
                      "center-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ],
                  },
                  detail: {
                    type: "STRING",
                    description: "Longer description (1-2 sentences)",
                  },
                },
                required: ["label", "type", "position"],
              },
            },
            {
              name: "clear_overlays",
              description:
                "Remove all visual overlays from the camera feed. SILENT EXECUTION.",
              parameters: { type: "OBJECT", properties: {} },
            },
            {
              name: "show_diagnosis",
              description:
                "Display a structured diagnosis card with causes and next steps.",
              parameters: {
                type: "OBJECT",
                properties: {
                  primary_cause: { type: "STRING" },
                  confidence: {
                    type: "STRING",
                    enum: ["high", "medium", "low"],
                  },
                  next_step: { type: "STRING" },
                  tools_needed: { type: "STRING" },
                  safety_warning: { type: "STRING" },
                },
                required: ["primary_cause", "confidence", "next_step"],
              },
            },
            {
              name: "generate_report",
              description:
                "Generate a service report summarizing the session.",
              parameters: {
                type: "OBJECT",
                properties: {
                  equipment: { type: "STRING" },
                  diagnosis: { type: "STRING" },
                  actions_taken: { type: "STRING" },
                  parts_used: { type: "STRING" },
                  follow_up: { type: "STRING" },
                },
                required: ["equipment", "diagnosis", "actions_taken"],
              },
            },
            {
              name: "advance_step",
              description:
                "Mark the current repair step as complete and advance to the next step. Call this when you have visually confirmed the user completed the current step. SILENT EXECUTION.",
              parameters: {
                type: "OBJECT",
                properties: {
                  completed_step: {
                    type: "INTEGER",
                    description: "The step number just completed (1-based)",
                  },
                  notes: {
                    type: "STRING",
                    description:
                      "Brief note about what was observed (e.g. 'cord intact, no damage')",
                  },
                },
                required: ["completed_step"],
              },
            },
            {
              name: "complete_procedure",
              description:
                "Mark the entire repair procedure as complete. Call this after all steps are done and the issue is resolved.",
              parameters: {
                type: "OBJECT",
                properties: {
                  outcome: {
                    type: "STRING",
                    enum: ["resolved", "partially_resolved", "escalate"],
                  },
                  summary: {
                    type: "STRING",
                    description: "Brief summary of what was done",
                  },
                },
                required: ["outcome"],
              },
            },
          ],
        },
      ],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };

    if (sessionResumeHandle) {
      setup.sessionResumption = { handle: sessionResumeHandle };
    } else {
      setup.sessionResumption = {};
    }

    return { setup };
  }

  function sendToolResponse(
    callId: string,
    functionName: string,
    result: Record<string, unknown>
  ): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const response: Record<string, unknown> = {
      id: callId,
      name: functionName,
      response: result,
    };

    if (UI_ONLY_TOOLS.has(functionName)) {
      response.scheduling = "SILENT";
    }

    ws.send(
      JSON.stringify({
        toolResponse: {
          functionResponses: [response],
        },
      })
    );
  }

  function parseMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      console.error("[GeminiSocket] Failed to parse message");
      return;
    }

    if (msg.error) {
      const apiErr = msg.error as Record<string, unknown>;
      const errMsg = `Gemini API error: ${apiErr.message ?? JSON.stringify(apiErr)}`;
      console.error("[GeminiSocket]", errMsg);
      connectReject?.(new Error(errMsg));
      connectResolve = null;
      connectReject = null;
      callbacks.onError(errMsg);
      ws?.close(1000, "API error");
      return;
    }

    if (msg.setupComplete) {
      reconnectAttempts = 0;
      setState("connected");
      connectResolve?.();
      connectResolve = null;
      connectReject = null;
      return;
    }

    if (msg.sessionResumptionUpdate) {
      const update = msg.sessionResumptionUpdate as Record<string, unknown>;
      if (update.newHandle && typeof update.newHandle === "string") {
        sessionResumeHandle = update.newHandle;
      }
      return;
    }

    if (msg.toolCall) {
      const toolCall = msg.toolCall as Record<string, unknown>;
      const functionCalls = toolCall.functionCalls as Array<{
        name: string;
        args: Record<string, string>;
        id: string;
      }>;
      if (functionCalls) {
        const seenInBatch = new Set<string>();
        for (const fc of functionCalls) {
          if (processedCallIds.has(fc.id)) continue;
          if (seenInBatch.has(fc.name)) continue;

          processedCallIds.add(fc.id);
          seenInBatch.add(fc.name);

          const call: GeminiFunctionCall = {
            name: fc.name,
            args: fc.args ?? {},
            id: fc.id,
          };
          callbacks.onFunctionCall(call);
        }
      }
      return;
    }

    if (msg.toolCallCancellation) {
      const cancellation = msg.toolCallCancellation as Record<string, unknown>;
      const ids = cancellation.ids as string[] | undefined;
      if (ids) {
        callbacks.onFunctionCallCancellation(ids);
      }
      return;
    }

    if (msg.goAway) {
      attemptReconnect();
      return;
    }

    if (msg.serverContent) {
      const content = msg.serverContent as Record<string, unknown>;

      if (content.interrupted) {
        callbacks.onInterrupted();
      }

      if (content.inputTranscription) {
        const transcription = content.inputTranscription as Record<
          string,
          unknown
        >;
        if (transcription.text && typeof transcription.text === "string") {
          callbacks.onInputTranscript(transcription.text);
        }
      }

      if (content.outputTranscription) {
        const transcription = content.outputTranscription as Record<
          string,
          unknown
        >;
        if (transcription.text && typeof transcription.text === "string") {
          callbacks.onOutputTranscript(transcription.text);
        }
      }

      if (content.modelTurn) {
        const modelTurn = content.modelTurn as Record<string, unknown>;
        const parts = modelTurn.parts as
          | Array<Record<string, unknown>>
          | undefined;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              const inlineData = part.inlineData as Record<string, unknown>;
              if (
                typeof inlineData.mimeType === "string" &&
                inlineData.mimeType.startsWith("audio/") &&
                typeof inlineData.data === "string"
              ) {
                callbacks.onAudio(inlineData.data);
              }
            }
          }
        }
      }

      if (content.turnComplete) {
        callbacks.onTurnComplete();
      }
    }
  }

  function attemptReconnect(): void {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setState("error");
      callbacks.onError(
        `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`
      );
      return;
    }

    setState("reconnecting");
    reconnectAttempts++;

    setTimeout(() => {
      openWebSocket(currentApiKey, currentSystemPrompt).catch((err) => {
        console.error("[GeminiSocket] Reconnect failed:", err);
        attemptReconnect();
      });
    }, RECONNECT_DELAY_MS);
  }

  function openWebSocket(
    apiKey: string,
    systemPrompt: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      connectResolve = resolve;
      connectReject = reject;

      const url = `${WS_BASE_URL}?key=${apiKey}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("[GeminiSocket] WebSocket opened, sending setup");
        const setupMsg = buildSetupMessage(systemPrompt);
        ws?.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === "string") {
          parseMessage(event.data);
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => parseMessage(text));
        }
      };

      ws.onerror = (ev: Event) => {
        const detail =
          ev instanceof ErrorEvent ? ev.message : "WebSocket connection error";
        const err = new Error(detail);
        console.error("[GeminiSocket] onerror:", detail);
        connectReject?.(err);
        connectResolve = null;
        connectReject = null;
        callbacks.onError(err.message);
      };

      ws.onclose = (event: CloseEvent) => {
        console.warn(
          `[GeminiSocket] onclose code=${event.code} reason="${event.reason}" wasClean=${event.wasClean}`
        );
        if (event.code !== 1000 && state !== "idle") {
          callbacks.onError(
            `Connection closed (code ${event.code}${event.reason ? `: ${event.reason}` : ""})`
          );
          attemptReconnect();
        }
      };
    });
  }

  async function connect(
    apiKey: string,
    systemPrompt: string
  ): Promise<void> {
    currentApiKey = apiKey;
    currentSystemPrompt = systemPrompt;
    processedCallIds.clear();
    setState("connecting");
    await openWebSocket(apiKey, systemPrompt);
  }

  function disconnect(): void {
    stopStreams();

    if (ws) {
      ws.onclose = null;
      ws.close(1000, "Client disconnect");
      ws = null;
    }

    sessionResumeHandle = null;
    reconnectAttempts = 0;
    processedCallIds.clear();
    setState("idle");
  }

  function sendText(message: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: message }] }],
          turnComplete: true,
        },
      })
    );
  }

  function sendFunctionResponse(
    callId: string,
    functionName: string,
    result: Record<string, unknown>
  ): void {
    sendToolResponse(callId, functionName, result);
  }

  function startCameraStream(videoElement: HTMLVideoElement): void {
    currentVideoElement = videoElement;

    if (!hiddenCanvas) {
      hiddenCanvas = document.createElement("canvas");
    }

    if (frameIntervalId) {
      clearInterval(frameIntervalId);
    }

    frameIntervalId = setInterval(() => {
      if (
        !currentVideoElement ||
        !hiddenCanvas ||
        !ws ||
        ws.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      hiddenCanvas.width = currentVideoElement.videoWidth || 640;
      hiddenCanvas.height = currentVideoElement.videoHeight || 480;

      const ctx = hiddenCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(
        currentVideoElement,
        0,
        0,
        hiddenCanvas.width,
        hiddenCanvas.height
      );

      const dataUrl = hiddenCanvas.toDataURL("image/jpeg", 0.6);
      const base64 = dataUrl.split(",")[1];
      if (!base64) return;

      ws.send(
        JSON.stringify({
          realtimeInput: {
            video: {
              mimeType: "image/jpeg",
              data: base64,
            },
          },
        })
      );
    }, FRAME_CAPTURE_INTERVAL_MS);
  }

  async function startAudioStream(): Promise<void> {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: AUDIO_SAMPLE_RATE_INPUT,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE_INPUT });
    const source = audioContext.createMediaStreamSource(mediaStream);

    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const float32Data = event.inputBuffer.getChannelData(0);
      const int16Data = new Int16Array(float32Data.length);

      for (let i = 0; i < float32Data.length; i++) {
        const sample = Math.max(-1, Math.min(1, float32Data[i]!));
        int16Data[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }

      const uint8 = new Uint8Array(int16Data.buffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]!);
      }
      const base64 = btoa(binary);

      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: `audio/pcm;rate=${AUDIO_SAMPLE_RATE_INPUT}`,
              data: base64,
            },
          },
        })
      );
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
  }

  function stopStreams(): void {
    if (frameIntervalId) {
      clearInterval(frameIntervalId);
      frameIntervalId = null;
    }

    if (scriptProcessor) {
      scriptProcessor.disconnect();
      scriptProcessor = null;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        track.stop();
      }
      mediaStream = null;
    }

    currentVideoElement = null;
  }

  function getState(): ConnectionState {
    return state;
  }

  return {
    connect,
    disconnect,
    sendText,
    sendFunctionResponse,
    startCameraStream,
    startAudioStream,
    stopStreams,
    getState,
  };
}
