import { useState, useEffect, useRef, useCallback } from 'react'

export default function VoiceInput({ onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [permissionState, setPermissionState] = useState('unknown') // 'unknown' | 'granted' | 'denied'
  const recognitionRef = useRef(null)
  const stoppedByUserRef = useRef(false)

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setPermissionState('granted')
    }

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      if (transcript && onTranscript) {
        onTranscript(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionState('denied')
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    return recognition
  }, [onTranscript])

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
    }

    // Check permission state if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(result => {
        setPermissionState(result.state)
        result.onchange = () => setPermissionState(result.state)
      }).catch(() => {})
    }

    return () => {
      if (recognitionRef.current) {
        stoppedByUserRef.current = true
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [])

  const toggleListening = async () => {
    if (!isSupported) return

    if (isListening && recognitionRef.current) {
      stoppedByUserRef.current = true
      recognitionRef.current.stop()
      return
    }

    // Create fresh recognition instance (mobile Safari requires this)
    const recognition = createRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    stoppedByUserRef.current = false

    try {
      // On mobile, request microphone permission explicitly first
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          // Stop the stream immediately — we just needed permission
          stream.getTracks().forEach(t => t.stop())
          setPermissionState('granted')
        } catch (permErr) {
          setPermissionState('denied')
          return
        }
      }
      recognition.start()
    } catch (e) {
      console.warn('Could not start speech recognition:', e)
      setIsListening(false)
    }
  }

  if (!isSupported) return null // Hide button on unsupported browsers silently

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={
        permissionState === 'denied'
          ? 'Microphone blocked — check browser settings'
          : isListening
          ? 'Listening... Tap to stop'
          : 'Voice Input'
      }
      style={{
        padding: '12px',
        borderRadius: '50%',
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: permissionState === 'denied'
          ? 'rgba(255,100,100,0.15)'
          : isListening
          ? 'rgba(255,68,68,0.25)'
          : 'rgba(255,255,255,0.1)',
        border: `1px solid ${
          permissionState === 'denied'
            ? 'rgba(255,100,100,0.4)'
            : isListening
            ? 'rgba(255,68,68,0.6)'
            : 'rgba(255,255,255,0.2)'
        }`,
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.3s',
        flexShrink: 0,
        boxShadow: isListening ? '0 0 18px rgba(255, 68, 68, 0.5)' : 'none',
        animation: isListening ? 'micPulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {permissionState === 'denied' ? (
        <span style={{ fontSize: '1.1rem' }}>🚫</span>
      ) : isListening ? (
        <span style={{ fontSize: '1.2rem' }}>🔴</span>
      ) : (
        <span style={{ fontSize: '1.2rem' }}>🎤</span>
      )}
      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255,68,68,0.4); }
          50% { box-shadow: 0 0 22px rgba(255,68,68,0.7); }
        }
      `}</style>
    </button>
  )
}
