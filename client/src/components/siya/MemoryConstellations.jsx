import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

export default function MemoryConstellations({ messages = [] }) {
  const linesRef = useRef()
  const groupRef = useRef()
  
  // Extract only user messages and keep the last 15 for performance
  const userMessages = messages.filter(m => m.sender === 'user').slice(-15)

  // Generate random positions high in the sky for each message
  const constellationData = useMemo(() => {
    return userMessages.map((msg, index) => {
      // Create an arc high above the scene
      const angle = (index / 15) * Math.PI * 2
      const radius = 8 + Math.random() * 4
      const height = 5 + Math.random() * 4
      
      return {
        id: msg.id || index,
        text: msg.text.length > 20 ? msg.text.substring(0, 20) + '...' : msg.text,
        position: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius - 4 // Push them back a bit
        )
      }
    })
  }, [userMessages])

  // Create geometry for the lines connecting the stars
  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    if (constellationData.length > 1) {
      const positions = []
      for (let i = 0; i < constellationData.length - 1; i++) {
        // Connect each star to the next
        positions.push(
          constellationData[i].position.x, constellationData[i].position.y, constellationData[i].position.z,
          constellationData[i+1].position.x, constellationData[i+1].position.y, constellationData[i+1].position.z
        )
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    }
    return geo
  }, [constellationData])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (groupRef.current) {
      // Slowly rotate the entire constellation map
      groupRef.current.rotation.y = time * 0.02
    }
    if (linesRef.current) {
      // Pulse line opacity
      linesRef.current.material.opacity = 0.2 + Math.sin(time * 2) * 0.1
    }
  })

  if (constellationData.length === 0) return null

  return (
    <group ref={groupRef}>
      {/* Draw the connecting constellation lines */}
      {constellationData.length > 1 && (
        <lineSegments ref={linesRef} geometry={lineGeometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.3} linewidth={1} />
        </lineSegments>
      )}

      {/* Draw the stars and text */}
      {constellationData.map((data, i) => (
        <group key={data.id} position={data.position}>
          {/* Glowing Star */}
          <mesh>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <pointLight color="#ffffff" intensity={0.5} distance={2} />
          
          {/* Floating Memory Text */}
          <Text
            position={[0, -0.2, 0]}
            fontSize={0.2}
            color="rgba(255, 255, 255, 0.6)"
            anchorX="center"
            anchorY="middle"
            maxWidth={2}
            textAlign="center"
          >
            {data.text}
          </Text>
        </group>
      ))}
    </group>
  )
}
