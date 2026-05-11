import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export function TimeWarp({ active, sceneGroupRef }) {
  const targetTimeScale = active ? 20.0 : 1.0
  const currentTimeScale = useRef(1.0)
  
  // Lighting references to simulate rapid day/night cycles
  const sunLightRef = useRef()
  const moonLightRef = useRef()

  useFrame((state) => {
    // Lerp time scale smoothly
    currentTimeScale.current = THREE.MathUtils.lerp(currentTimeScale.current, targetTimeScale, 0.05)
    
    // We hack the clock to speed up by overriding the clock's elapsed time manually for specific effects
    // However, it's safer to just spin the environment and change lights rapidly
    const time = state.clock.getElapsedTime() * currentTimeScale.current

    if (sceneGroupRef?.current) {
      // Rapidly spin the island/sky container
      sceneGroupRef.current.rotation.y = time * 0.1
    }

    if (sunLightRef.current && moonLightRef.current) {
      // Day/Night cycle
      const sunHeight = Math.sin(time * 0.5)
      
      sunLightRef.current.position.y = sunHeight * 10
      sunLightRef.current.position.x = Math.cos(time * 0.5) * 10
      sunLightRef.current.intensity = Math.max(0, sunHeight * 2)
      
      moonLightRef.current.position.y = -sunHeight * 10
      moonLightRef.current.position.x = -Math.cos(time * 0.5) * 10
      moonLightRef.current.intensity = Math.max(0, -sunHeight * 0.8)
    }
  })

  return (
    <group>
      <directionalLight ref={sunLightRef} color="#ffddaa" castShadow />
      <directionalLight ref={moonLightRef} color="#4466ff" />
    </group>
  )
}
