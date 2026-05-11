import { useEffect, useRef, useState } from 'react'

export default function AmbientSound({ emotion = 'calm', enabled = false }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioCtxRef = useRef(null)
  const oscillatorsRef = useRef([])
  const gainNodeRef = useRef(null)

  const toggleSound = () => {
    if (!isPlaying) {
      // Initialize Web Audio API
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContext()
      audioCtxRef.current = ctx

      const masterGain = ctx.createGain()
      masterGain.gain.value = 0.05 // Very quiet background hum
      masterGain.connect(ctx.destination)
      gainNodeRef.current = masterGain

      // Create a drone using multiple oscillators
      const freqs = emotion === 'calm' ? [130.81, 196.00, 261.63] // C3, G3, C4
                 : emotion === 'sad' ? [110.00, 130.81, 164.81] // A2, C3, E3
                 : [146.83, 220.00, 293.66] // D3, A3, D4

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        
        // Detune slightly for warmth
        osc.detune.value = i * 5

        // Individual LFO for slow volume pulsing
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 0.1 + (i * 0.05) // Very slow

        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.5
        
        lfo.connect(lfoGain.gain)
        osc.connect(lfoGain)
        lfoGain.connect(masterGain)

        osc.start()
        lfo.start()
        
        oscillatorsRef.current.push({ osc, lfo, lfoGain })
      })

      setIsPlaying(true)
    } else {
      // Stop and cleanup
      if (audioCtxRef.current) {
        oscillatorsRef.current.forEach(({ osc, lfo }) => {
          osc.stop()
          lfo.stop()
          osc.disconnect()
          lfo.disconnect()
        })
        oscillatorsRef.current = []
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(e => console.error("Audio cleanup error:", e))
        }
      }
      setIsPlaying(false)
    }
  }

  // Sync play state with the `enabled` prop from parent
  useEffect(() => {
    if (enabled && !isPlaying) toggleSound()
    else if (!enabled && isPlaying) toggleSound()
  }, [enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
      }
    }
  }, [])

  return (
    <button 
      onClick={toggleSound}
      style={{
        padding: '8px 16px',
        background: isPlaying ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isPlaying ? 'rgba(0, 255, 128, 0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: isPlaying ? '#00ff80' : 'white',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s'
      }}
    >
      {isPlaying ? '🔊 Ambient Hum ON' : '🔈 Ambient Hum OFF'}
    </button>
  )
}
