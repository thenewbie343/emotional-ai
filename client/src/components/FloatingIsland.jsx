import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useCursor, Bvh } from '@react-three/drei'

// Pure 3D component — no HTML inside here
export default function FloatingIsland({ position = [0, -2, 0], scale = [8, 6, 11], rotation = [0, 0, 0] }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)

  useCursor(hovered)

  // Original main island art model
  const { scene } = useGLTF('/1st art work.glb')

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(time) * 0.2
    }
  })

  const isBlueBuilding = (e) => {
    const name = e.object?.name?.toLowerCase() || ''
    const normalizedName = name.replace(/_|-/g, ' ')
    return normalizedName.includes('blue') && normalizedName.includes('building')
  }

  const handlePointerOver = (e) => {
    if (isBlueBuilding(e)) { e.stopPropagation(); setHovered(true) }
  }
  const handlePointerOut = (e) => {
    if (isBlueBuilding(e)) { e.stopPropagation(); setHovered(false) }
  }
  const handleClick = (e) => {
    if (isBlueBuilding(e)) {
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('portal-click'))
    }
  }

  return (
    <group ref={groupRef}>
      <Bvh firstHitOnly>
        <primitive
          object={scene}
          position={position}
          scale={scale}
          rotation={rotation}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      </Bvh>
    </group>
  )
}

useGLTF.preload('/1st art work.glb')
