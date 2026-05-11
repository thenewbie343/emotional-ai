import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function AudioMandala({ active }) {
  const groupRef = useRef()
  
  useFrame((state) => {
    if (!active || !groupRef.current) return
    
    // Smooth, professional rotation
    const time = state.clock.getElapsedTime()
    groupRef.current.rotation.z = time * 0.2
    
    // Simulating audio reactivity (pulsing size)
    const audioPulse = 1.0 + Math.sin(time * 15) * 0.05 // Rapid subtle vibration
    groupRef.current.scale.lerp(new THREE.Vector3(audioPulse, audioPulse, audioPulse), 0.2)
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={[0, 1.5, -2]}>
      {/* High-end minimalist geometry */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (Math.PI / 3) * i]}>
          <ringGeometry args={[1.8, 1.85, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
      </mesh>
    </group>
  )
}
