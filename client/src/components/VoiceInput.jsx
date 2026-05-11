import { useState, useEffect, useRef } from 'react'

export default function VoiceInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false // Only get final results
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const current = event.resultIndex
      const transcript = event.results[current][0].transcript
      if (transcript && onTranscript) {
        onTranscript(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error("Could not start recognition:", e)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      style={{
        padding: '12px',
        borderRadius: '50%',
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isListening ? '#ff4444' : 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: isListening ? '0 0 15px rgba(255, 68, 68, 0.5)' : 'none'
      }}
      title={isListening ? "Listening... Click to stop" : "Use Voice Input"}
    >
      {isListening ? (
        <span style={{ fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>🔴</span>
      ) : (
        <span style={{ fontSize: '1.2rem' }}>🎤</span>
      )}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  )
}
