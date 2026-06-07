import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ShootingStars() {
  const meshRef = useRef()
  const starData = useRef(null)

  function getResetData() {
    const startX = (Math.random() - 0.5) * 200
    const startY = 50 + Math.random() * 100
    const startZ = -100 - Math.random() * 100

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      -1 - Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(4 + Math.random() * 4)

    return {
      pos: new THREE.Vector3(startX, startY, startZ),
      vel: velocity,
      active: false,
      timer: Math.random() * 5
    }
  }

  if (!starData.current) {
    starData.current = getResetData()
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const data = starData.current

    if (!data.active) {
      data.timer -= delta
      if (data.timer <= 0) {
        data.active = true
        meshRef.current.position.copy(data.pos)
        meshRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          data.vel.clone().normalize()
        )
      }
      meshRef.current.visible = false
    } else {
      meshRef.current.visible = true
      data.pos.add(data.vel)
      meshRef.current.position.copy(data.pos)

      if (data.pos.y < -50) {
        starData.current = getResetData()
      }
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <cylinderGeometry args={[0.1, 0.1, 15, 4]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
    </mesh>
  )
}
