/**
 * ShunaVoiceChat.jsx — Real-Time Voice Interface for Shuna
 * =========================================================
 * High-performance bidirectional audio pipeline:
 *   Browser Mic → 16kHz PCM → WebSocket → FastAPI → Gemini Live
 *   Gemini Live → 24kHz PCM → WebSocket → Float32 AudioBuffer → Speaker
 *
 * Key guarantees:
 *   - Zero audio gaps/overlaps via nextStartTimeRef absolute scheduling
 *   - No AudioContext before user interaction (browser policy compliant)
 *   - Full resource cleanup on unmount (no memory leaks)
 *   - Auto-reconnect with exponential backoff on socket drops
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import "./ShunaVoiceChat.css";

// ── Configuration ───────────────────────────────────────────────────────────
const WS_URL = "wss://shuna-backend.onrender.com/ws/v1/shuna/live-chat";
const INPUT_SAMPLE_RATE = 16000;   // Mic capture → Gemini expects 16kHz
const OUTPUT_SAMPLE_RATE = 24000;  // Gemini outputs 24kHz PCM
const BUFFER_SIZE = 4096;          // ScriptProcessor buffer size
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

// ── PCM Conversion Utilities ────────────────────────────────────────────────

/**
 * Convert Float32 audio samples to Int16 PCM bytes.
 * Used for mic capture → WebSocket transmission.
 */
function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

/**
 * Convert raw Int16 PCM bytes from Gemini to Float32 for AudioBuffer.
 * Used for WebSocket reception → speaker playback.
 */
function int16ToFloat32(arrayBuffer) {
  const int16 = new Int16Array(arrayBuffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 0x8000;
  }
  return float32;
}

/**
 * Downsample from browser's native sample rate to target rate.
 * Uses simple linear interpolation — lightweight, no FFT overhead.
 */
function downsample(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const lo = Math.floor(srcIndex);
    const hi = Math.min(lo + 1, buffer.length - 1);
    const frac = srcIndex - lo;
    result[i] = buffer[lo] * (1 - frac) + buffer[hi] * frac;
  }
  return result;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ShunaVoiceChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState("idle"); // idle | connecting | listening | speaking | error
  const [errorMsg, setErrorMsg] = useState("");

  // Refs for mutable state that must survive re-renders without triggering them
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptNodeRef = useRef(null);
  const micSourceRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isCleaningUpRef = useRef(false);

  // ── Cleanup Everything ──────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    // Clear reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Disconnect mic pipeline
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current.onaudioprocess = null;
      scriptNodeRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }

    // Stop all mic tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Close AudioContext
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close(1000, "user_disconnect");
      }
      wsRef.current = null;
    }

    nextStartTimeRef.current = 0;
    reconnectAttemptRef.current = 0;
    isCleaningUpRef.current = false;

    if (isMountedRef.current) {
      setState("idle");
      setErrorMsg("");
    }
  }, []);

  // ── Schedule PCM Playback on Speaker ────────────────────────────────────
  const schedulePlayback = useCallback((pcmArrayBuffer) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx || audioCtx.state === "closed") return;

    const float32Data = int16ToFloat32(pcmArrayBuffer);
    if (float32Data.length === 0) return;

    const audioBuffer = audioCtx.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    // Precision scheduling: start at the later of "now" or "end of last chunk"
    const now = audioCtx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);

    // Advance the pointer by the exact duration of this chunk
    nextStartTimeRef.current = startAt + audioBuffer.duration;

    if (isMountedRef.current) {
      setState("speaking");
    }
  }, []);

  // ── Connect WebSocket + Mic ─────────────────────────────────────────────
  const connect = useCallback(async () => {
    cleanup();

    if (isMountedRef.current) {
      setState("connecting");
      setErrorMsg("");
    }

    try {
      // 1. Initialize AudioContext (requires user gesture — called from button)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      audioCtxRef.current = audioCtx;
      nextStartTimeRef.current = 0;

      // 2. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: INPUT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Open WebSocket
      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        reconnectAttemptRef.current = 0;
        setState("listening");

        // 4. Wire mic → ScriptProcessor → WebSocket
        const micSource = audioCtx.createMediaStreamSource(stream);
        micSourceRef.current = micSource;

        const scriptNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        scriptNodeRef.current = scriptNode;

        scriptNode.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const downsampled = downsample(inputData, audioCtx.sampleRate, INPUT_SAMPLE_RATE);
          const pcmBytes = float32ToInt16(downsampled);
          wsRef.current.send(pcmBytes);
        };

        micSource.connect(scriptNode);
        // Connect to destination to keep the processor alive (outputs silence)
        scriptNode.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        if (typeof event.data === "string") {
          // Control messages
          if (event.data === "__turn_done__") {
            // Shuna finished speaking — switch back to listening after audio drains
            const remainingAudio = Math.max(0, nextStartTimeRef.current - (audioCtxRef.current?.currentTime || 0));
            setTimeout(() => {
              if (isMountedRef.current) setState("listening");
            }, remainingAudio * 1000 + 150);
            return;
          }
          if (event.data === "__pong__" || event.data === "__heartbeat__") {
            return; // Swallow keepalive messages
          }
          return;
        }

        // Binary data = raw 24kHz PCM audio from Gemini
        if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
          schedulePlayback(event.data);
        }
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current || isCleaningUpRef.current) return;

        if (event.code === 1000) {
          // Clean close (user initiated)
          setState("idle");
          return;
        }

        // Unexpected close — attempt reconnect
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptRef.current);
          reconnectAttemptRef.current++;
          setState("connecting");
          setErrorMsg(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`);
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, delay);
        } else {
          setState("error");
          setErrorMsg("Unable to connect to Shuna's voice server. Please try again later.");
        }
      };

      ws.onerror = () => {
        // onclose will fire after this — handle reconnect there
      };
    } catch (err) {
      if (isMountedRef.current) {
        setState("error");
        if (err.name === "NotAllowedError") {
          setErrorMsg("Microphone access denied. Please allow mic permissions and try again.");
        } else {
          setErrorMsg(err.message || "Failed to connect to voice server.");
        }
      }
    }
  }, [cleanup, schedulePlayback]);

  // ── Disconnect ──────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    cleanup();
    setIsOpen(false);
  }, [cleanup]);

  // ── Unmount Safety ──────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // ── Heartbeat Ping (client side) ────────────────────────────────────────
  useEffect(() => {
    if (state !== "listening" && state !== "speaking") return;

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("__ping__");
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [state]);

  // ── Render ──────────────────────────────────────────────────────────────
  const statusLabels = {
    idle: "Tap to connect",
    connecting: "Connecting...",
    listening: "Listening to you...",
    speaking: "Shuna is speaking...",
    error: "Connection error",
  };

  // Closed state — show floating action button
  if (!isOpen) {
    return (
      <div className="shuna-voice-overlay">
        <button
          className="shuna-voice-fab"
          onClick={() => {
            setIsOpen(true);
            connect();
          }}
          title="Talk to Shuna"
        >
          <span className="material-symbols-outlined">mic</span>
        </button>
      </div>
    );
  }

  // Open state — show voice panel
  return (
    <div className="shuna-voice-overlay">
      <div className="shuna-voice-panel">
        {/* Header */}
        <div className="shuna-voice-header">
          <div className="shuna-voice-title">
            <div className={`status-dot ${state}`} />
            <h3>Shuna Voice</h3>
          </div>
          <button className="shuna-voice-close" onClick={disconnect} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Orb Visualizer */}
        <div className="shuna-voice-orb-container">
          <div className="shuna-voice-ring" />
          <div className="shuna-voice-ring" />
          <div className="shuna-voice-ring" />
          <div className={`shuna-voice-orb ${state}`} />
        </div>

        {/* Status */}
        <div className={`shuna-voice-status ${state}`}>
          {statusLabels[state]}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="shuna-voice-error">{errorMsg}</div>
        )}
      </div>
    </div>
  );
}
