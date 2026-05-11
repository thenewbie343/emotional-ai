import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function FloatingDebris({ count = 30 }) {
  const rockRef = useRef()
  const mossRef = useRef()

  const { positions, rotations, scales, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const rotations = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const speeds = new Float32Array(count)
    const colors = new Float32Array(count * 3)

    const colorObj = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Orbit roughly around the island
      const radius = 15 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      
      positions[i * 3] = Math.cos(theta) * radius
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15
      positions[i * 3 + 2] = Math.sin(theta) * radius

      rotations[i * 3] = Math.random() * Math.PI
      rotations[i * 3 + 1] = Math.random() * Math.PI
      rotations[i * 3 + 2] = Math.random() * Math.PI

      scales[i] = 0.2 + Math.random() * 0.8
      speeds[i] = 0.02 + Math.random() * 0.06 // Slower, heavier orbit

      // Mix of old brown soil and dark grey rock colors
      if (Math.random() > 0.5) {
        colorObj.setHex(0x4a3c31) // Brown soil
      } else {
        colorObj.setHex(0x3a3f44) // Dark grey rock
      }
      colorObj.toArray(colors, i * 3)
    }

    return { positions, rotations, scales, speeds, colors }
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Assign colors to the instances
  useEffect(() => {
    if (!rockRef.current) return
    const tempColor = new THREE.Color()
    for (let i = 0; i < count; i++) {
      // Set rock/soil color
      tempColor.fromArray(colors, i * 3)
      rockRef.current.setColorAt(i, tempColor)
      
      // Set moss/sea grass color
      if (mossRef.current) {
        tempColor.setHex(0x2d5a27) // Deep natural green
        // Add slight random variation to moss color per rock
        tempColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1)
        mossRef.current.setColorAt(i, tempColor)
      }
    }
    rockRef.current.instanceColor.needsUpdate = true
    if (mossRef.current) mossRef.current.instanceColor.needsUpdate = true
  }, [count, colors])

  useFrame(({ clock }) => {
    if (!rockRef.current) return
    const time = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const startX = positions[i * 3]
      const startZ = positions[i * 3 + 2]
      
      const radius = Math.sqrt(startX * startX + startZ * startZ)
      const startAngle = Math.atan2(startZ, startX)
      const currentAngle = startAngle + time * speeds[i]

      const x = Math.cos(currentAngle) * radius
      // Gentle, heavy bobbing
      const y = positions[i * 3 + 1] + Math.sin(time * 0.5 + i) * 1.5 
      const z = Math.sin(currentAngle) * radius

      dummy.position.set(x, y, z)

      // Slow rotation to look heavy and old
      dummy.rotation.set(
        rotations[i * 3] + time * speeds[i] * 1.2,
        rotations[i * 3 + 1] + time * speeds[i] * 1.2,
        rotations[i * 3 + 2] + time * speeds[i] * 1.2
      )

      // Update Rock Matrix
      dummy.scale.setScalar(scales[i])
      dummy.updateMatrix()
      rockRef.current.setMatrixAt(i, dummy.matrix)

      // Update Moss Matrix
      if (mossRef.current) {
        // Make the moss slightly larger and offset rotation so it pokes out organically
        dummy.scale.setScalar(scales[i] * 1.08)
        dummy.rotation.x += 0.5
        dummy.rotation.y += 0.5
        dummy.updateMatrix()
        mossRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    rockRef.current.instanceMatrix.needsUpdate = true
    if (mossRef.current) mossRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* Base Layer: Soil and Rock */}
      <instancedMesh ref={rockRef} args={[null, null, count]}>
        <dodecahedronGeometry args={[1, 1]} /> 
        <meshStandardMaterial roughness={1} />
      </instancedMesh>

      {/* Overgrowth Layer: Moss and Sea Grass */}
      <instancedMesh ref={mossRef} args={[null, null, count]}>
        <icosahedronGeometry args={[1, 0]} /> 
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  )
}
