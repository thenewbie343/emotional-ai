import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Neural Pulse: dynamic energy rings that emanate from SHUNA─────────────
// Replaces: Singularity (too gimmicky), AudioMandala (too simple)
// Role: Shows SHUNAis "thinking" / in deep processing mode

export function NeuralPulse({ active }) {
  const rings = useRef([])
  const groupRef = useRef()
  const timeRef = useRef(0)

  useFrame((state, delta) => {
    if (!active || !groupRef.current) return
    timeRef.current += delta

    rings.current.forEach((ring, i) => {
      if (!ring) return
      const phase = (timeRef.current * 0.8 + i * (Math.PI * 2 / 4)) % (Math.PI * 2)
      const scale = 0.5 + Math.abs(Math.sin(phase)) * 2.5
      const opacity = (1 - Math.abs(Math.sin(phase))) * 0.4
      ring.scale.setScalar(scale)
      if (ring.material) ring.material.opacity = opacity
    })
    groupRef.current.rotation.y = timeRef.current * 0.1
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {[0, 1, 2, 3].map(i => (
        <mesh
          key={i}
          ref={el => { rings.current[i] = el }}
          rotation={[Math.PI / 2 + (i * 0.4), 0, i * 0.7]}
        >
          <ringGeometry args={[0.6, 0.65, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#00d4ff' : '#7c5cfc'}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <pointLight color="#00d4ff" intensity={3} distance={6} decay={2} />
    </group>
  )
}

// ── Phase Shift: chromatic ghosting / holographic body double ─────────────
// Replaces: MirrorDimension (too dark/distracting), RealWorldEnv (not visual)
// Role: Shows SHUNAshifting between digital and physical states

export function PhaseShift({ active }) {
  const ghost1 = useRef()
  const ghost2 = useRef()

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (ghost1.current) {
      ghost1.current.position.x = Math.sin(t * 0.4) * 0.6
      ghost1.current.position.y = -1.5 + Math.cos(t * 0.3) * 0.15
      ghost1.current.material.opacity = 0.08 + Math.sin(t * 2) * 0.04
    }
    if (ghost2.current) {
      ghost2.current.position.x = Math.sin(t * 0.4 + Math.PI) * 0.6
      ghost2.current.position.y = -1.5 + Math.cos(t * 0.3 + Math.PI) * 0.15
      ghost2.current.material.opacity = 0.06 + Math.cos(t * 2) * 0.03
    }
  })

  if (!active) return null

  return (
    <group>
      {/* Cyan ghost */}
      <mesh ref={ghost1} position={[0, -1.5, -0.2]}>
        <capsuleGeometry args={[0.35, 1.8, 8, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.1} />
      </mesh>
      {/* Magenta ghost */}
      <mesh ref={ghost2} position={[0, -1.5, -0.2]}>
        <capsuleGeometry args={[0.38, 1.85, 8, 16]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.07} />
      </mesh>
    </group>
  )
}

// ── Time Echo: ghost trail of past positions ──────────────────────────────
// Replaces: Singularity, AudioMandala
// Role: Visually shows Siya's "temporal awareness" — she remembers everything

export function TimeEcho({ active }) {
  const echoRefs = useRef([])
  const timeRef = useRef(0)

  useFrame((state, delta) => {
    if (!active) return
    timeRef.current += delta

    echoRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const age = i / 5
      const bobY = Math.sin(timeRef.current * 0.5 - age * 2) * 0.08
      mesh.position.x = Math.sin(timeRef.current * 0.3 - age) * age * 0.3
      mesh.position.y = -1.5 + bobY - age * 0.1
      mesh.position.z = -0.15 - age * 0.3
      if (mesh.material) {
        mesh.material.opacity = (1 - age) * 0.12
      }
    })
  })

  if (!active) return null

  return (
    <group>
      {[0, 1, 2, 3, 4].map(i => (
        <mesh
          key={i}
          ref={el => { echoRefs.current[i] = el }}
          position={[0, -1.5, -0.15 - i * 0.3]}
        >
          <capsuleGeometry args={[0.32 - i * 0.01, 1.7, 6, 12]} />
          <meshBasicMaterial
            color="#7c5cfc"
            transparent
            opacity={0.12 - i * 0.02}
          />
        </mesh>
      ))}
    </group>
  )
}
