import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function IntimateProximity() {
  const { camera, scene } = useThree()

  // Reference to original lighting to restore when moving back
  const originalLights = useRef(new Map())
  const hasDimmed = useRef(false)

  // A specific deep red/purple light for intimate mode
  const intimateLight = useRef()

  useEffect(() => {
    // Create the intimate light once
    const light = new THREE.PointLight('#ff0055', 0, 10)
    light.position.set(0, 1, 2)
    scene.add(light)
    intimateLight.current = light

    // Store original intensities of all lights in the scene
    scene.traverse((object) => {
      if (object.isLight && object !== light) {
        originalLights.current.set(object.uuid, object.intensity)
      }
    })

    return () => {
      scene.remove(light)
    }
  }, [scene])

  useFrame(() => {
    // Calculate distance from camera to the center (where SHUNAis)
    const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0))

    // Threshold for "intimate" distance (e.g. less than 2.5 units away)
    if (distance < 2.5) {
      if (!hasDimmed.current) {
        hasDimmed.current = true
        // Dim all other lights slowly
        scene.traverse((object) => {
          if (object.isLight && object !== intimateLight.current) {
            object.intensity *= 0.1 // Drop to 10%
          }
        })
      }
      // Ramp up the intimate light based on closeness
      const intensity = Math.max(0, (2.5 - distance) * 2)
      if (intimateLight.current) {
        intimateLight.current.intensity = THREE.MathUtils.lerp(intimateLight.current.intensity, intensity, 0.1)
      }
    } else {
      if (hasDimmed.current) {
        hasDimmed.current = false
        // Restore original lights
        scene.traverse((object) => {
          if (object.isLight && object !== intimateLight.current && originalLights.current.has(object.uuid)) {
            object.intensity = originalLights.current.get(object.uuid)
          }
        })
      }
      // Fade out intimate light
      if (intimateLight.current && intimateLight.current.intensity > 0) {
        intimateLight.current.intensity = THREE.MathUtils.lerp(intimateLight.current.intensity, 0, 0.1)
      }
    }
  })

  return null
}
