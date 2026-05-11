import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Extremely complex shader to simulate gravitational lensing (Black Hole)
const SingularityShader = {
  uniforms: {
    tDiffuse: { value: null }, // Requires a render target to refract, or we do a procedural distortion
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      // Center of the singularity
      vec2 center = vec2(0.5, 0.5);
      
      // Distance from center
      float dist = distance(uv, center);
      
      // Event Horizon (Pitch black)
      if (dist < 0.1) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      
      // Gravitational Lensing (Accretion Disk)
      float accretion = smoothstep(0.1, 0.15, dist) - smoothstep(0.15, 0.3, dist);
      
      // Glowing plasma around the black hole
      float angle = atan(uv.y - center.y, uv.x - center.x);
      float swirl = sin(angle * 10.0 + time * 5.0) * 0.5 + 0.5;
      
      // Orange/Gold plasma
      vec3 plasmaColor = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.2), swirl);
      
      // Distort the background (simulated by just darkening and coloring heavily)
      // Since we don't have a screen texture pass here, we render this as a glowing object
      float alpha = accretion * 2.0;
      
      // Add subtle space dust
      float dust = fract(sin(dot(uv, vec2(12.9898,78.233)) * time) * 43758.5453);
      
      gl_FragColor = vec4(plasmaColor + (dust * 0.1), alpha);
    }
  `
}

export function Singularity({ active }) {
  const meshRef = useRef()
  const { camera } = useThree()
  const materialRef = useRef()

  useFrame((state, delta) => {
    if (!active) return
    
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime()
    }

    if (meshRef.current) {
      // Make it always face camera
      meshRef.current.lookAt(camera.position)
      // Pulsing scale
      const scale = 1.0 + Math.sin(state.clock.getElapsedTime() * 2) * 0.05
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  if (!active) return null

  return (
    <group position={[0, 2, -5]}>
      {/* The Black Hole Mesh */}
      <mesh ref={meshRef}>
        <planeGeometry args={[10, 10]} />
        <shaderMaterial
          ref={materialRef}
          args={[SingularityShader]}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Intense light from the accretion disk */}
      <pointLight color="#ff6600" intensity={50} distance={20} decay={2} />
      
      {/* Environmental darkening (Sucking the light away) */}
      <ambientLight intensity={0.01} />
    </group>
  )
}
