import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

const API_BASE = "https://emotional-ai-1-cfrn.onrender.com";

const ShunaVoiceChat = forwardRef(({ isActive, userId, userEmail, mode, companion, onStateChange, onError, onTranscriptsReceived }, ref) => {
  const [state, setState] = useState("idle");
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);
  
  const recognitionRef = useRef(null);
  const audioElementRef = useRef(null);
  const hasFatalErrorRef = useRef(false);

  useEffect(() => {
    if (onStateChange) onStateChange(state);
  }, [state, onStateChange]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (isMountedRef.current) setState("idle");
  }, []);

  useImperativeHandle(ref, () => ({
    connect() {
      isActiveRef.current = true;
      hasFatalErrorRef.current = false;
      startRecognition();
    },
    cleanup() {
      cleanup();
    }
  }));

  const sendTextToBackend = useCallback(async (transcript) => {
    if (!isActiveRef.current) return;
    setState("thinking");

    try {
      const payload = {
        text: transcript,
        user_id: userId || "",
        user_email: userEmail || "",
        mode: mode || "friendly",
        companion: companion || "siya"
      };

      const response = await fetch(`${API_BASE}/api/v1/shuna/voice-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server error: status ${response.status}`);
      const result = await response.json();

      if (onTranscriptsReceived && (result.user_transcript || result.ai_transcript)) {
        onTranscriptsReceived(result.user_transcript, result.ai_transcript);
      }

      if (!result.success || !result.audio) {
        console.warn("TTS failed or empty audio. Transitioning to idle.");
        setState("idle");
        setTimeout(() => { if (isActiveRef.current) startRecognition(); }, 1500);
        return;
      }

      const audioBytes = atob(result.audio);
      const array = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) array[i] = audioBytes.charCodeAt(i);
      const playBlob = new Blob([array], { type: "audio/wav" });
      const playUrl = URL.createObjectURL(playBlob);

      const audio = new Audio(playUrl);
      audioElementRef.current = audio;
      audio.onplay = () => { if (isMountedRef.current) setState("speaking"); };
      audio.onended = () => {
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) startRecognition();
        else if (isMountedRef.current) setState("idle");
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) startRecognition();
      };

      await audio.play();
    } catch (err) {
      if (onError) onError(err.message || "Failed to process voice response");
      if (isMountedRef.current) setState("error");
      setTimeout(() => { if (isActiveRef.current) startRecognition(); }, 3000);
    }
  }, [userId, userEmail, mode, companion, onTranscriptsReceived, onError]);

  const startRecognition = useCallback(() => {
    cleanup();
    isActiveRef.current = true;
    if (isMountedRef.current) setState("listening");
    if (onError) onError("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const err = "Web Speech API is not supported in this browser.";
      console.error(err);
      if (onError) onError(err);
      if (isMountedRef.current) setState("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (!isActiveRef.current) return;
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        sendTextToBackend(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      
      // Stop the restart loop for fatal errors (blocked permissions or unsupported features)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'language-not-supported') {
        hasFatalErrorRef.current = true;
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        if (onError) onError(event.error);
        if (isMountedRef.current) setState("error");
      }
    };

    recognition.onend = () => {
      // Do not restart if we hit a fatal error (like blocked microphone)
      if (hasFatalErrorRef.current) {
        console.warn("Speech recognition stopped due to fatal error.");
        return;
      }

      // The ONLY place where restart is handled to avoid double-start race conditions
      if (isActiveRef.current && isMountedRef.current) {
        setTimeout(() => { 
          // Restart only if we are still active and in listening or error state
          // (We do not restart if we transitioned to thinking or speaking)
          if (isActiveRef.current && (stateRef.current === "listening" || stateRef.current === "error")) {
            startRecognition(); 
          }
        }, 1000);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, [cleanup, onError, sendTextToBackend]);

  // Track state in a ref for closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Sync state when active prop changes
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      hasFatalErrorRef.current = false;
      startRecognition();
    } else {
      cleanup();
    }
  }, [isActive, startRecognition, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return null;
});

export default ShunaVoiceChat;
