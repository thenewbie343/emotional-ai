import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ShootingStars() {
  const meshRef = useRef()
  // We'll manage a single shooting star that resets its position randomly
  const [starData, setStarData] = useState(() => resetStar())

  function resetStar() {
    // Start way off in the distance
    const startX = (Math.random() - 0.5) * 200
    const startY = 50 + Math.random() * 100
    const startZ = -100 - Math.random() * 100

    // Shoot downwards and slightly diagonally
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      -1 - Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(4 + Math.random() * 4) // Fast speed

    return {
      pos: new THREE.Vector3(startX, startY, startZ),
      vel: velocity,
      active: false,
      timer: Math.random() * 5 // wait 0 to 5 seconds before next shooting star
    }
  }

  useFrame((state, delta) => {
    if (!meshRef.current) return

    if (!starData.active) {
      starData.timer -= delta
      if (starData.timer <= 0) {
        starData.active = true
        // Position it back to start
        meshRef.current.position.copy(starData.pos)
        // Orient the cylinder to face the direction of travel
        meshRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          starData.vel.clone().normalize()
        )
      }
      meshRef.current.visible = false
    } else {
      meshRef.current.visible = true
      // Move star
      starData.pos.add(starData.vel)
      meshRef.current.position.copy(starData.pos)

      // If it goes too low, reset it
      if (starData.pos.y < -50) {
        setStarData(resetStar())
      }
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      {/* A long, thin cylinder to look like a streak of light */}
      <cylinderGeometry args={[0.1, 0.1, 15, 4]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
    </mesh>
  )
}
