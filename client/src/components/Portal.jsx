import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import * as THREE from 'three'

export default function Portal() {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  
  // Change cursor to pointer when hovering
  useCursor(hovered)

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Slowly rotate the portal crystal
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x += delta * 0.2
      
      // Scale up smoothly when hovered
      const targetScale = hovered ? 1.3 : 1.0
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    // Dispatch a custom event so the HomeScene can show the companion picker
    window.dispatchEvent(new CustomEvent('portal-click'))
  }

  return (
    <mesh
      ref={meshRef}
      position={[0, 1.5, 0]} // Hovering slightly above the island center
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered(false)
      }}
      castShadow
    >
      <octahedronGeometry args={[1, 0]} />
      {/* Glowing mystical crystal material */}
      <meshStandardMaterial 
        color={hovered ? "#00ffff" : "#8a2be2"} 
        emissive={hovered ? "#00ffff" : "#6a0dad"}
        emissiveIntensity={hovered ? 2.5 : 1.2}
        roughness={0.1}
        metalness={0.9}
        transparent={true}
        opacity={0.9}
      />
      {/* Point light to cast the crystal's glow onto the island */}
      <pointLight 
        color={hovered ? "#00ffff" : "#8a2be2"} 
        intensity={hovered ? 25 : 10} 
        distance={8} 
        decay={2}
        position={[0, 0, 0]}
      />
    </mesh>
  )
}
