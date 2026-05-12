// Companion3D — Full 3D scene for both SAI and Siya
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls, Environment } from '@react-three/drei'
import CompanionCharacter from './CompanionCharacter'

// Siya's creative scene effects (replaces old system-override effects)
import { SpiritFamiliar } from './siya/SpiritFamiliar'
import { BiometricHeartbeat } from './siya/BiometricSync'
import MemoryConstellations from './siya/MemoryConstellations'
import IntimateProximity from './siya/IntimateProximity'
import { NeuralPulse, PhaseShift, TimeEcho } from './siya/SiyaEffects'

// ── Gentle floating wrapper ────────────────────────────────────────────────
function FloatingCharacter({ animation, companion }) {
  const groupRef = useRef()

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    // Gentle float around Y=0
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.08
  })

  return (
    <group ref={groupRef}>
      <CompanionCharacter animation={animation || 'idle'} companion={companion} />
    </group>
  )
}

// ── Scene effects — only the ones that are active ─────────────────────────
function SceneEffects({ messages, features }) {
  return (
    <>
      {/* Always-on ambient proximity sensing */}
      <IntimateProximity />

      {/* Siya-specific creative effects */}
      <SpiritFamiliar active={features?.spiritFamiliar} />
      <BiometricHeartbeat active={features?.biometricSync} />
      <NeuralPulse active={features?.neuralPulse} />
      <PhaseShift active={features?.phaseShift} />
      <TimeEcho active={features?.timeEcho} />

      {/* Memory constellations (only when there are messages to show) */}
      {messages && messages.length > 3 && (
        <MemoryConstellations messages={messages} />
      )}
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function Companion3D({ characterAnim, messages, features, companion = 'sai' }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 52 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        {/* Base lighting */}
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 8, 5]} intensity={1.8} color="#ffffff" castShadow />
        <pointLight position={[-3, 4, 3]} intensity={0.6} color="#aaddff" />
        <pointLight position={[3, -1, 4]} intensity={0.4} color="#ffaadd" />
        <Environment preset="city" />

        {/* The character */}
        <FloatingCharacter animation={characterAnim} companion={companion} />

        {/* Scene effects driven by feature flags */}
        <SceneEffects messages={messages} features={features} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          maxPolarAngle={Math.PI / 2 + 0.25}
          minPolarAngle={Math.PI / 2 - 0.45}
        />
      </Suspense>
    </Canvas>
  )
}