/**
 * ShunaVoiceChat.jsx — Stateless HTTP Pipelined Voice Engine
 * ==========================================================
 * Pipeline flow:
 *   Mic Record (MediaRecorder) ➔ stop ➔ POST Form Data ➔ FastAPI ➔ Playback Response
 */

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

// ── Configuration ───────────────────────────────────────────────────────────
const API_BASE = "https://shuna-backend.onrender.com";
const SPEECH_THRESHOLD = 12;      // Average volume threshold to detect voice activity
const SILENCE_TIMEOUT_MS = 1600;   // Auto-stop recording after 1.6s of silence

const ShunaVoiceChat = forwardRef(({ isActive, userId, onStateChange, onError, onTranscriptsReceived }, ref) => {
  const [state, setState] = useState("idle"); // idle | connecting | listening | thinking | speaking | error

  // Audio/Recording refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceCheckFrameRef = useRef(null);
  const audioElementRef = useRef(null);

  // Connection/Tear-down flag refs
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    isActiveRef.current = false;

    if (silenceCheckFrameRef.current) {
      cancelAnimationFrame(silenceCheckFrameRef.current);
      silenceCheckFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }

    if (isMountedRef.current) {
      setState("idle");
    }
  }, []);

  // Expose API to parent component
  useImperativeHandle(ref, () => ({
    connect() {
      isActiveRef.current = true;
      startRecording();
    },
    cleanup() {
      cleanup();
    }
  }));

  // ── Send Audio to Backend ───────────────────────────────────────────────
  const sendAudioToBackend = useCallback(async (audioBlob) => {
    if (!isActiveRef.current) return;
    setState("thinking");

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `audio-input.${audioBlob.type.split("/")[1] || "webm"}`);
      formData.append("user_id", userId || "");

      const response = await fetch(`${API_BASE}/api/v1/shuna/voice-chat`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: status ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.audio) {
        throw new Error("Invalid server voice response");
      }

      if (onTranscriptsReceived) {
        onTranscriptsReceived(result.user_transcript, result.ai_transcript);
      }

      // Decode base64 audio response to blob URL
      const audioBytes = atob(result.audio);
      const array = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) {
        array[i] = audioBytes.charCodeAt(i);
      }
      const playBlob = new Blob([array], { type: "audio/wav" });
      const playUrl = URL.createObjectURL(playBlob);

      // Play back audio response
      const audio = new Audio(playUrl);
      audioElementRef.current = audio;

      audio.onplay = () => {
        if (isMountedRef.current) setState("speaking");
      };

      audio.onended = () => {
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) {
          startRecording();
        } else {
          if (isMountedRef.current) setState("idle");
        }
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) {
          startRecording();
        }
      };

      await audio.play();

    } catch (err) {
      console.error("Failed to process voice pipeline:", err);
      if (onError) onError(err.message || "Failed to process voice response");
      if (isMountedRef.current) setState("error");

      // Auto-restart recording after 3s delay in case of transient error
      setTimeout(() => {
        if (isActiveRef.current) {
          startRecording();
        }
      }, 3000);
    }
  }, [userId, onTextMessageReceived, onError]);

  // ── Start Recording ─────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    cleanup();
    isActiveRef.current = true;

    if (isMountedRef.current) {
      setState("listening");
      if (onError) onError("");
    }

    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (!isActiveRef.current) return;
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await sendAudioToBackend(audioBlob);
      };

      // Web Audio RMS volume check for silence VAD detection
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = null;
      let hasSpoken = false;

      const checkSilence = () => {
        if (!isActiveRef.current || mediaRecorder.state !== "recording") return;

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > SPEECH_THRESHOLD) {
          hasSpoken = true;
          silenceStart = null;
        } else if (hasSpoken) {
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
            mediaRecorder.stop();
            return;
          }
        }

        silenceCheckFrameRef.current = requestAnimationFrame(checkSilence);
      };

      mediaRecorder.start();
      silenceCheckFrameRef.current = requestAnimationFrame(checkSilence);

    } catch (err) {
      console.error("Failed to start voice capture:", err);
      if (onError) onError(err.message || "Failed to start microphone capture");
      if (isMountedRef.current) setState("error");
    }
  }, [cleanup, onError, sendAudioToBackend]);

  // Synchronize component state with isActive prop changes
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      startRecording();
    } else {
      cleanup();
    }
  }, [isActive, startRecording, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return null; // Headless component
});

export default ShunaVoiceChat;
