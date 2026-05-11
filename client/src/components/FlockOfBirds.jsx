import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { PositionalAudio } from '@react-three/drei'
import * as THREE from 'three'

export default function FlockOfBirds({ 
  count = 30, 
  isAudioEnabled = false,
  radius = 20,
  height = 8,
  heightVariance = 20,
  centerOffset = [0, 0, 0],
  speed = 0.2
}) {
  const meshRef = useRef()
  
  // Create a simple V shape for the bird
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(-0.5, 0.2)
    shape.lineTo(0, -0.1)
    shape.lineTo(0.5, 0.2)
    shape.lineTo(0, 0)
    
    const extrudeSettings = { depth: 0.02, bevelEnabled: false }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.center() // Center the geometry for proper rotation
    return geo
  }, [])

  // Setup initial random positions, phases, and scales for each bird
  const { positions, phases, scales } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const scales = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Position them based on center offset
      positions[i * 3] = centerOffset[0] + (Math.random() - 0.5) * (radius * 2.5) // x
      positions[i * 3 + 1] = centerOffset[1] + height + Math.random() * heightVariance // y
      positions[i * 3 + 2] = centerOffset[2] + (Math.random() - 0.5) * (radius * 2.5) // z
      phases[i] = Math.random() * Math.PI * 2
      scales[i] = 0.2 + Math.random() * 0.3
    }
    return { positions, phases, scales }
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    if (!meshRef.current) return
    
    for (let i = 0; i < count; i++) {
      // Circular flying pattern combined with bobbing
      const x = positions[i * 3] + Math.sin(time * speed + phases[i]) * radius
      const y = positions[i * 3 + 1] + Math.sin(time * (speed * 10) + phases[i]) * 1.5
      const z = positions[i * 3 + 2] + Math.cos(time * speed + phases[i]) * radius
      
      dummy.position.set(x, y, z)
      
      // Calculate flight direction to face forward along the circular path
      dummy.rotation.y = Math.atan2(
        Math.cos(time * speed + phases[i]),
        -Math.sin(time * speed + phases[i])
      )
      
      // Flapping wings animation
      dummy.rotation.z = Math.sin(time * (speed * 60) + phases[i]) * 0.4
      // Slight pitch
      dummy.rotation.x = 0.2
      
      dummy.scale.setScalar(scales[i])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // We attach positional audio to the center of the flock.
  // We'll create an invisible group that roughly follows the center of the flock.
  const flockCenterRef = useRef()
  useFrame(({ clock }) => {
    if (flockCenterRef.current) {
      const time = clock.getElapsedTime()
      // Approximate center of the circular motion
      flockCenterRef.current.position.set(
        centerOffset[0] + Math.sin(time * speed) * radius,
        centerOffset[1] + height + (heightVariance / 2),
        centerOffset[2] + Math.cos(time * speed) * radius
      )
    }
  })

  return (
    <>
      <instancedMesh ref={meshRef} args={[geometry, null, count]}>
        <meshStandardMaterial color="#222" roughness={0.8} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Invisible object to host the positional audio that moves with the flock */}
      <group ref={flockCenterRef}>
        {/* 
          isAudioEnabled && (
          <PositionalAudio 
            url="/birds.mp3" // PLEASE ADD A 'birds.mp3' FILE TO YOUR 'client/public' FOLDER!
            distance={10} 
            loop 
            autoplay 
          />
        )
        */}
      </group>
    </>
  )
}
