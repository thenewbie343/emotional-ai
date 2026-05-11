import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Cloud } from '@react-three/drei'

export default function MovingCloud({ 
  moveSpeed = 2, 
  xRange = [-40, 40],
  position = [0, 0, 0],
  ...props 
}) {
  const groupRef = useRef()

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x += moveSpeed * delta
      
      // Wrap around logic
      if (moveSpeed > 0 && groupRef.current.position.x > xRange[1]) {
        groupRef.current.position.x = xRange[0]
      } else if (moveSpeed < 0 && groupRef.current.position.x < xRange[0]) {
        groupRef.current.position.x = xRange[1]
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* 
        The Cloud component is automatically picked up by the parent <Clouds> 
        component from @react-three/drei, even when wrapped in a group.
      */}
      <Cloud {...props} position={[0, 0, 0]} />
    </group>
  )
}
