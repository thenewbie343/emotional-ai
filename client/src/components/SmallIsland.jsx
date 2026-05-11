import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Bvh, Clone } from '@react-three/drei'

export default function SmallIsland({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], floatOffset = 0, floatSpeed = 0.8 }) {
  const groupRef = useRef()

  // Use the small islands GLB from public/
  const { scene } = useGLTF('/small islands.glb')

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (groupRef.current) {
      // Smooth independent floating bob per island
      groupRef.current.position.y = position[1] + Math.sin(time * floatSpeed + floatOffset) * 0.35
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <Bvh firstHitOnly>
        {/* Clone reuses the single loaded GLTF for all 5 instances efficiently */}
        <Clone object={scene} />
      </Bvh>
    </group>
  )
}

// Preload once — shared across all 5 instances
useGLTF.preload('/small islands.glb')
