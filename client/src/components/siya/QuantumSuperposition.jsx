import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import CompanionCharacter from '../CompanionCharacter'
import * as THREE from 'three'

export default function QuantumSuperposition({ isThinking, animation = 'idle' }) {
  const leftGhostRef = useRef()
  const rightGhostRef = useRef()
  
  // The central (real) character
  const mainRef = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (isThinking) {
      if (leftGhostRef.current && rightGhostRef.current) {
        // Jitter and float
        leftGhostRef.current.position.x = -0.5 + Math.sin(time * 15) * 0.05
        leftGhostRef.current.position.y = Math.sin(time * 2) * 0.1
        
        rightGhostRef.current.position.x = 0.5 + Math.cos(time * 12) * 0.05
        rightGhostRef.current.position.y = Math.cos(time * 2.5) * 0.1
        
        // Glitch rotation
        leftGhostRef.current.rotation.z = Math.sin(time * 20) * 0.02
        rightGhostRef.current.rotation.z = Math.cos(time * 25) * 0.02
      }
    }
  })

  return (
    <group>
      {/* Central Real Character */}
      <group ref={mainRef}>
        <CompanionCharacter animation={animation} />
      </group>

      {/* Ghostly Superpositions (Only visible when thinking) */}
      {isThinking && (
        <>
          <group ref={leftGhostRef} position={[-0.5, 0, -0.5]}>
            {/* By rendering the character inside a group with a dark blue light, we simulate a hologram */}
            <pointLight color="#0088ff" intensity={2} distance={2} />
            <CompanionCharacter animation="talk" /> {/* Plays alternate animation */}
          </group>
          
          <group ref={rightGhostRef} position={[0.5, 0, -0.5]}>
            <pointLight color="#ff00aa" intensity={2} distance={2} />
            <CompanionCharacter animation="dance" /> {/* Plays alternate animation */}
          </group>
        </>
      )}
    </group>
  )
}
