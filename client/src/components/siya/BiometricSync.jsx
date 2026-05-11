import { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── BiometricHeartbeat ─────────────────────────────────────────────────────
// Uses device motion (accelerometer) if available, otherwise simulates a
// realistic resting heart rate. Works on HTTP local network — no camera needed.
export function BiometricHeartbeat({ active }) {
  const [bpm, setBpm] = useState(72)
  const motionRef = useRef({ active: false, last: 0, peaks: [] })

  useEffect(() => {
    if (!active) {
      motionRef.current.active = false
      return
    }
    motionRef.current.active = true

    // ── Try DeviceMotion (accelerometer) — works on HTTP ──
    const tryMotion = () => {
      if (!window.DeviceMotionEvent) return false

      const handler = (e) => {
        if (!motionRef.current.active) return
        const acc = e.accelerationIncludingGravity
        if (!acc) return
        const magnitude = Math.sqrt(
          (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
        )
        // Detect movement peaks as proxy for pulse
        const now = Date.now()
        if (magnitude > 11) {
          const last = motionRef.current.last
          const gap = now - last
          if (gap > 400 && gap < 1600) {
            const newBpm = Math.round(60000 / gap)
            if (newBpm > 40 && newBpm < 200) {
              setBpm(Math.min(180, Math.max(45, newBpm)))
            }
          }
          motionRef.current.last = now
        }
      }

      window.addEventListener('devicemotion', handler)
      return () => window.removeEventListener('devicemotion', handler)
    }

    const cleanup = tryMotion()

    // ── Procedural BPM simulation — realistic slow drift ──
    // Keeps the visual alive even when motion isn't detected
    const drift = setInterval(() => {
      if (!motionRef.current.active) return
      setBpm(prev => {
        const delta = (Math.random() - 0.5) * 4
        return Math.round(Math.min(110, Math.max(52, prev + delta)))
      })
    }, 3000)

    return () => {
      motionRef.current.active = false
      clearInterval(drift)
      if (typeof cleanup === 'function') cleanup()
    }
  }, [active])

  if (!active) return null
  return <PulseEffect bpm={bpm} />
}

// ── PulseEffect ────────────────────────────────────────────────────────────
// Renders a red heartbeat point light + a DOM BPM readout
function PulseEffect({ bpm }) {
  const lightRef = useRef()
  const ringRef = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    const bps = bpm / 60

    // Realistic double-beat (lub-dub) waveform
    const phase = (time * bps) % 1.0
    let intensity = 0.15
    if (phase < 0.08)                     intensity = 2.2        // lub
    else if (phase > 0.18 && phase < 0.26) intensity = 1.5       // dub
    else if (phase < 0.15)                 intensity = THREE.MathUtils.lerp(2.2, 0.15, (phase - 0.08) / 0.07)

    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, intensity, 0.35)
    }

    // Pulse ring scale
    if (ringRef.current) {
      const scale = 1 + intensity * 0.3
      ringRef.current.scale.setScalar(scale)
      ringRef.current.material.opacity = Math.min(0.5, intensity * 0.2)
    }
  })

  return (
    <>
      {/* Heartbeat red light */}
      <pointLight ref={lightRef} color="#ff1144" distance={18} position={[0, 0.5, 0]} />

      {/* Expanding pulse ring */}
      <mesh ref={ringRef} position={[0, 0.5, 0]}>
        <torusGeometry args={[1.2, 0.04, 8, 48]} />
        <meshBasicMaterial color="#ff1144" transparent opacity={0.3} />
      </mesh>

      {/* DOM BPM readout — rendered as a DOM portal would need, so we use a
          floating div via a separate component in CompanionChat instead.
          Here we emit a custom event for the UI to catch. */}
      <BpmEmitter bpm={bpm} />
    </>
  )
}

// ── BpmEmitter — fires a custom event so CompanionChat can display BPM ───
function BpmEmitter({ bpm }) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('siya-bpm', { detail: { bpm } }))
  }, [bpm])
  return null
}
