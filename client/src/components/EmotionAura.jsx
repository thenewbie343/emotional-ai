import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const EMOTION_CONFIGS = {
  happy: { color: '#ffd700', particleColor: '#ffee88', intensity: 2.5, speed: 1.5 },
  sad: { color: '#4477cc', particleColor: '#6699dd', intensity: 1.0, speed: 0.3 },
  angry: { color: '#ff2244', particleColor: '#ff6644', intensity: 3.0, speed: 2.5 },
  calm: { color: '#9966ff', particleColor: '#bb99ff', intensity: 1.5, speed: 0.5 },
  love: { color: '#ff66aa', particleColor: '#ffaacc', intensity: 2.0, speed: 1.0 },
  excited: { color: '#00ff88', particleColor: '#66ffbb', intensity: 2.8, speed: 2.0 },
  neutral: { color: '#8899aa', particleColor: '#aabbcc', intensity: 1.2, speed: 0.6 },
}

export default function EmotionAura({ emotion = 'neutral' }) {
  const particlesRef = useRef()
  const lightRef = useRef()
  const config = EMOTION_CONFIGS[emotion] || EMOTION_CONFIGS.neutral

  const count = 120
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
    }
    return pos
  }, [])

  const velocities = useMemo(() => {
    const vel = []
    for (let i = 0; i < count; i++) {
      vel.push({
        x: (Math.random() - 0.5) * 0.02,
        y: Math.random() * 0.01 + 0.005,
        z: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2
      })
    }
    return vel
  }, [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < count; i++) {
        const v = velocities[i]
        posArray[i * 3] += Math.sin(time * config.speed + v.phase) * v.x
        posArray[i * 3 + 1] += v.y * config.speed
        posArray[i * 3 + 2] += Math.cos(time * config.speed + v.phase) * v.z

        if (posArray[i * 3 + 1] > 5) {
          posArray[i * 3 + 1] = -4
          posArray[i * 3] = (Math.random() - 0.5) * 10
          posArray[i * 3 + 2] = (Math.random() - 0.5) * 6
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }

    if (lightRef.current) {
      lightRef.current.intensity = config.intensity + Math.sin(time * 2) * 0.5
    }
  })

  return (
    <group>
      <pointLight
        ref={lightRef}
        color={config.color}
        intensity={config.intensity}
        distance={15}
        position={[0, 2, 3]}
      />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={config.particleColor}
          size={0.08}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
