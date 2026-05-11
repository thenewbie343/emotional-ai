import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CompanionCharacter({ animation = 'idle', companion = 'sai', ...props }) {
  const group = useRef()
  const mesh = useRef()
  const aura = useRef()
  const core = useRef()
  
  // Determine color based on companion
  const color = companion === 'siya' ? '#ff66b2' : '#00bfff'
  const emissiveColor = companion === 'siya' ? '#ff1a8c' : '#0073e6'
  
  // Animate if it's not idle
  const isResponding = animation !== 'idle'

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    
    // Stable slow rotation
    if (group.current) {
      group.current.rotation.y = t * 0.3
      group.current.rotation.z = Math.sin(t * 0.2) * 0.1
    }

    // Effect when responding
    const targetScale = isResponding ? 1.3 : 1.0
    const targetIntensity = isResponding ? 3.0 : 1.0
    const pulseSpeed = isResponding ? 8 : 2

    // Smoothly interpolate scale
    if (group.current) {
      group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }

    // Smoothly animate materials
    if (mesh.current) {
      // Mesh pulsing effect
      const currentScale = 1 + Math.sin(t * pulseSpeed) * (isResponding ? 0.05 : 0.02)
      mesh.current.scale.set(currentScale, currentScale, currentScale)
    }
    
    if (aura.current) {
      // Aura rotation
      aura.current.rotation.x = t * 0.6
      aura.current.rotation.y = t * 0.9
      const auraScale = 1.2 + Math.sin(t * pulseSpeed * 0.8) * (isResponding ? 0.1 : 0.04)
      aura.current.scale.set(auraScale, auraScale, auraScale)
      
      if (aura.current.material) {
        aura.current.material.emissiveIntensity = THREE.MathUtils.lerp(
          aura.current.material.emissiveIntensity,
          targetIntensity * 0.6,
          0.1
        )
      }
    }
    
    if (core.current && core.current.material) {
      core.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        core.current.material.emissiveIntensity,
        targetIntensity,
        0.1
      )
    }
  })

  return (
    <group ref={group} {...props} position={[0, 3.0, 0]}>
      {/* Outer Aura */}
      <mesh ref={aura}>
        <icosahedronGeometry args={[1.2, 2]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissiveColor}
          emissiveIntensity={0.6}
          wireframe={true}
          transparent={true}
          opacity={0.4}
        />
      </mesh>
      
      {/* Mid Layer - Glassy Orb */}
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial 
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.8}
          transmission={0.9}
          opacity={1}
          metalness={0.1}
          roughness={0.1}
          ior={1.5}
          thickness={2.0}
          clearcoat={1}
        />
      </mesh>

      {/* Inner Bright Core */}
      <mesh ref={core}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive={color}
          emissiveIntensity={1.2}
        />
      </mesh>
      
      {/* Internal PointLight to cast glow */}
      <pointLight color={color} intensity={isResponding ? 3 : 1} distance={5} />
    </group>
  )
}
