import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

const API_BASE = "https://emotional-ai-1-cfrn.onrender.com";

const ShunaVoiceChat = forwardRef(({ isActive, userId, userEmail, mode, companion, onStateChange, onError, onTranscriptsReceived }, ref) => {
  const [state, setState] = useState("idle");
  const isActiveRef = useRef(isActive);
  const isMountedRef = useRef(true);
  
  const recognitionRef = useRef(null);
  const audioElementRef = useRef(null);
  const hasFatalErrorRef = useRef(false);
  const transcriptRef = useRef("");
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    if (onStateChange) onStateChange(state);
  }, [state, onStateChange]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    transcriptRef.current = "";
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
    console.log("[ShunaVoice] VAD silence triggered. Sending text to backend:", transcript);

    try {
      const payload = {
        text: transcript,
        user_id: userId || "",
        user_email: userEmail || "",
        mode: mode || "friendly",
        companion: companion || "siya"
      };

      console.log("[ShunaVoice] Fetching:", `${API_BASE}/api/v1/shuna/voice-chat`);
      const response = await fetch(`${API_BASE}/api/v1/shuna/voice-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[ShunaVoice] Response status:", response.status);
      if (!response.ok) throw new Error(`Server error: status ${response.status}`);
      const result = await response.json();
      console.log("[ShunaVoice] Result data:", result);

      if (onTranscriptsReceived && (result.user_transcript || result.ai_transcript)) {
        onTranscriptsReceived(result.user_transcript, result.ai_transcript);
      }

      if (!result.success || !result.audio) {
        console.warn("[ShunaVoice] TTS failed or empty audio returned.");
        setState("idle");
        // Safe delayed restart handled via connection reset
        setTimeout(() => { if (isActiveRef.current) startRecognition(); }, 1500);
        return;
      }

      console.log("[ShunaVoice] Decoding audio...");
      const audioBytes = atob(result.audio);
      const array = new Uint8Array(audioBytes.length);
      for (let i = 0; i < audioBytes.length; i++) array[i] = audioBytes.charCodeAt(i);
      const playBlob = new Blob([array], { type: "audio/wav" });
      const playUrl = URL.createObjectURL(playBlob);

      const audio = new Audio(playUrl);
      audioElementRef.current = audio;
      audio.onplay = () => { 
        console.log("[ShunaVoice] Audio playing...");
        if (isMountedRef.current) setState("speaking"); 
      };
      audio.onended = () => {
        console.log("[ShunaVoice] Audio playback ended.");
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) startRecognition();
        else if (isMountedRef.current) setState("idle");
      };
      audio.onerror = (e) => {
        console.error("[ShunaVoice] Audio element error:", e);
        URL.revokeObjectURL(playUrl);
        if (isActiveRef.current) startRecognition();
      };

      await audio.play();
    } catch (err) {
      console.error("[ShunaVoice] sendTextToBackend failed:", err);
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
    recognition.interimResults = true; // Enabled for custom silence detection
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (!isActiveRef.current) return;
      
      let accumulated = "";
      for (let i = 0; i < event.results.length; ++i) {
        accumulated += event.results[i][0].transcript;
      }
      
      if (accumulated.trim()) {
        console.log("[ShunaVoice] Speech heard (accumulated):", accumulated);
        transcriptRef.current = accumulated;
        
        // Reset the silence timer on every new speech fragment heard
        if (silenceTimerRef.current) {
          console.log("[ShunaVoice] Resetting VAD timer (speaking...)");
          clearTimeout(silenceTimerRef.current);
        }
        
        silenceTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && transcriptRef.current.trim() && stateRef.current === "listening") {
            const finalSpeech = transcriptRef.current;
            
            // Transition to thinking state immediately so onend knows not to restart
            setState("thinking");
            
            // Abort current session to release mic
            if (recognitionRef.current) {
              console.log("[ShunaVoice] VAD silence threshold met. Aborting session...");
              try { recognitionRef.current.abort(); } catch (e) {}
            }
            
            // Clear current state transcript
            transcriptRef.current = "";
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            
            sendTextToBackend(finalSpeech);
          }
        }, 900); // 900ms of silence triggers the send action
      }
    };

    recognition.onerror = (event) => {
      // Suppress red console errors for expected events like 'aborted' (manual VAD stop) and 'no-speech' (silence)
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error("Speech recognition error:", event.error);
        if (onError) onError(event.error);
        if (isMountedRef.current) setState("error");
      } else {
        console.log("Speech recognition event:", event.error);
      }
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'language-not-supported') {
        hasFatalErrorRef.current = true;
      }
    };

    recognition.onend = () => {
      if (hasFatalErrorRef.current) {
        console.warn("Speech recognition stopped due to fatal error.");
        return;
      }

      if (isActiveRef.current && isMountedRef.current) {
        setTimeout(() => { 
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
