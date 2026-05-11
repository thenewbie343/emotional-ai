import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function MagicDrip({ count = 50 }) {
  const meshRef = useRef()

  const { positions, phases, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Start underneath the island (-2 to -8 in Y)
      positions[i * 3] = (Math.random() - 0.5) * 8 // x width
      positions[i * 3 + 1] = -2 - Math.random() * 6 // y height
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 // z depth

      phases[i] = Math.random() * Math.PI * 2
      speeds[i] = 1 + Math.random() * 2 // fall speed
    }

    return { positions, phases, speeds }
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const time = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3] + Math.sin(time * 0.5 + phases[i]) * 0.2 // gentle sway
      const startY = positions[i * 3 + 1]
      const z = positions[i * 3 + 2] + Math.cos(time * 0.5 + phases[i]) * 0.2

      // Calculate falling Y position
      // Modulo arithmetic to loop the drip falling down
      let currentY = startY - ((time * speeds[i]) % 15)

      // Fade out effect by scaling down as it drops
      // distance fallen = startY - currentY
      const distanceFallen = startY - currentY
      const scale = Math.max(0, 1 - (distanceFallen / 15))

      dummy.position.set(x, currentY, z)
      dummy.scale.setScalar(scale * 0.2) // very small
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      {/* Glowing emissive material */}
      <meshBasicMaterial color="#aaddff" transparent opacity={0.6} />
    </instancedMesh>
  )
}
