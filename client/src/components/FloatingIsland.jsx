import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useCursor } from '@react-three/drei'

// Pure 3D component — no HTML inside here
export default function FloatingIsland({ position = [0, -2, 0], scale = [8, 6, 11], rotation = [0, 0, 0] }) {
  const groupRef = useRef()
  const floatRef = useRef(0)
  const [hovered, setHovered] = useState(false)

  useCursor(hovered)

  // Original main island art model
  const { scene } = useGLTF('/1st art work.glb')

  // Base Y stored once — no array allocation every frame
  const baseY = position[1]

  useFrame((state) => {
    if (!groupRef.current) return
    // Simple sine float — no new arrays, minimal CPU cost
    groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.6) * 0.18
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
    <group ref={groupRef} position={[position[0], baseY, position[2]]}>
      <primitive
        object={scene}
        position={[0, 0, 0]}
        scale={scale}
        rotation={rotation}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
    </group>
  )
}

useGLTF.preload('/1st art work.glb')
