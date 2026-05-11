import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function CinematicCamera({ active, targetPos = new THREE.Vector3(0, -1, 0) }) {
  const { camera } = useThree()
  const originalPos = useRef(new THREE.Vector3())
  const originalQuat = useRef(new THREE.Quaternion())
  const wasActive = useRef(false)

  useFrame((state) => {
    if (active) {
      if (!wasActive.current) {
        // Save state before hijacking
        originalPos.current.copy(camera.position)
        originalQuat.current.copy(camera.quaternion)
        wasActive.current = true
      }

      const time = state.clock.getElapsedTime()
      
      // Smooth spline-like orbiting tracking shot
      const radius = 3.5 + Math.sin(time * 0.2) * 1.0
      const height = targetPos.y + 0.5 + Math.sin(time * 0.5) * 1.0
      
      const targetX = targetPos.x + Math.sin(time * 0.3) * radius
      const targetZ = targetPos.z + Math.cos(time * 0.3) * radius

      // Lerp camera to cinematic path
      camera.position.lerp(new THREE.Vector3(targetX, height, targetZ), 0.02)
      
      // Look at subject with slight delay/smoothness
      const lookTarget = targetPos.clone().add(new THREE.Vector3(0, 1, 0)) // Look at head/chest
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(camera.position, lookTarget, new THREE.Vector3(0, 1, 0))
      )
      camera.quaternion.slerp(targetQuat, 0.05)

    } else {
      if (wasActive.current) {
        // Return to original state slowly
        camera.position.lerp(originalPos.current, 0.05)
        camera.quaternion.slerp(originalQuat.current, 0.05)
        
        // Stop hijacking when close enough
        if (camera.position.distanceTo(originalPos.current) < 0.1) {
          wasActive.current = false
        }
      }
    }
  })

  // Cinematic Letterboxing UI Overlay (handled outside canvas, but we can do a CSS trick here via DOM)
  return null
}
