import { useEffect, useRef, useState } from 'react'

// Ambient hum is ON by default; user can toggle it off
export default function AmbientSound({ emotion = 'calm', enabled = true }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioCtxRef = useRef(null)
  const oscillatorsRef = useRef([])
  const gainNodeRef = useRef(null)
  const startedRef = useRef(false)

  const startSound = async () => {
    if (startedRef.current) return
    startedRef.current = true

    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    audioCtxRef.current = ctx

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.04
    masterGain.connect(ctx.destination)
    gainNodeRef.current = masterGain

    const freqs = emotion === 'sad'    ? [110.00, 130.81, 164.81]
               : emotion === 'excited' ? [164.81, 246.94, 329.63]
               : emotion === 'angry'   ? [123.47, 185.00, 246.94]
               :                        [130.81, 196.00, 261.63] // calm / default: C3 G3 C4

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = i * 5

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.1 + i * 0.05

      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.4

      lfo.connect(lfoGain.gain)
      osc.connect(lfoGain)
      lfoGain.connect(masterGain)

      osc.start()
      lfo.start()
      oscillatorsRef.current.push({ osc, lfo })
    })

    setIsPlaying(true)
  }

  const stopSound = () => {
    oscillatorsRef.current.forEach(({ osc, lfo }) => {
      try { osc.stop(); lfo.stop() } catch {}
    })
    oscillatorsRef.current = []
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    startedRef.current = false
    setIsPlaying(false)
  }

  const toggleSound = () => {
    if (isPlaying) {
      stopSound()
    } else {
      startSound()
    }
  }

  // Respect the `enabled` prop — start when enabled, stop when disabled
  useEffect(() => {
    if (enabled && !isPlaying) {
      startSound()
    } else if (!enabled && isPlaying) {
      stopSound()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      title={isPlaying ? 'Ambient hum is ON — tap to turn off' : 'Ambient hum is OFF — tap to turn on'}
      style={{
        padding: '8px 14px',
        background: isPlaying
          ? 'rgba(0, 255, 128, 0.18)'
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isPlaying ? 'rgba(0, 255, 128, 0.45)' : 'rgba(255,255,255,0.1)'}`,
        color: isPlaying ? '#00ff80' : 'rgba(255,255,255,0.5)',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {isPlaying ? '🔊' : '🔈'}
      <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
        {isPlaying ? 'Hum ON' : 'Hum OFF'}
      </span>
    </button>
  )
}
