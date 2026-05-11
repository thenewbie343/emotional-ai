import * as THREE from 'three'

// We create a reusable liquid opal material
export const opalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.9, // glass-like
  ior: 1.5,
  thickness: 0.5,
  iridescence: 1.0, // This gives the color shifting opal effect!
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400],
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide
})

export function applyOpalShader(scene, active) {
  if (!scene) return

  scene.traverse((child) => {
    if (child.isMesh) {
      // Store original material if not stored yet
      if (!child.userData.originalMaterial) {
        child.userData.originalMaterial = child.material
      }

      if (active) {
        child.material = opalMaterial
      } else {
        child.material = child.userData.originalMaterial
      }
    }
  })
}
