import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function SpiritFamiliar({ active, onInteract }) {
  const orbRef = useRef()
  const lightRef = useRef()
  
  // Orbit logic
  const angle = useRef(0)
  const hoverY = useRef(0)

  // Interaction state
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  useFrame((state, delta) => {
    if (!active || !orbRef.current) return
    
    // Smooth, professional orbit
    angle.current += delta * 0.5
    hoverY.current += delta * 1.5
    
    // Position it higher and further back to avoid chat box overlap
    const radius = 2.5
    const targetX = Math.cos(angle.current) * radius
    const targetZ = Math.sin(angle.current) * radius - 1
    const targetY = 1.5 + Math.sin(hoverY.current) * 0.3

    orbRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1)
    
    // Pulse light based on interaction
    if (lightRef.current) {
      const targetIntensity = clicked ? 15 : (hovered ? 8 : 4)
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.1)
    }

    // Scale animation on click
    const targetScale = clicked ? 1.5 : (hovered ? 1.2 : 1)
    orbRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
  })

  if (!active) return null

  return (
    <group ref={orbRef}>
      <mesh 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => { setHovered(false); setClicked(false) }}
        onPointerDown={(e) => {
          e.stopPropagation()
          setClicked(true)
          if (onInteract) onInteract()
        }}
        onPointerUp={() => setClicked(false)}
      >
        <sphereGeometry args={[0.4, 32, 32]} /> {/* Optimized orb */}
        
        {/* Mobile-optimized glowing material */}
        <meshStandardMaterial 
          color={hovered ? "#00ffff" : "#ffffff"}
          emissive={hovered ? "#0044ff" : "#444444"}
          emissiveIntensity={hovered ? 2 : 0.5}
          transparent={true}
          opacity={0.8}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      
      {/* Subtle core inside the orb */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={hovered ? "#ffffff" : "#cccccc"} />
      </mesh>
    </group>
  )
}
