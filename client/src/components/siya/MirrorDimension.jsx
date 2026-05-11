import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const DarkMatterShader = {
  uniforms: {
    tDiffuse: { value: null },
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
    
    // Simplex noise for subtle distortion
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ; m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Cinematic vignette
      vec2 uv = vUv;
      vec2 p = -1.0 + 2.0 * uv;
      float r = sqrt(dot(p, p));
      
      // Gentle, professional dark matter waves
      float n = snoise(uv * 3.0 + time * 0.1);
      
      // Extremely subtle monochromatic aberration
      float offset = n * 0.02 * r;
      
      // Dark cinematic coloring
      vec3 color = vec3(0.02, 0.02, 0.03); // Deep space black/blue
      
      // Add subtle starlight/noise grain
      float grain = fract(sin(dot(uv, vec2(12.9898,78.233)) * time) * 43758.5453) * 0.05;
      
      // Blend based on vignette to only darken the edges
      float vignette = smoothstep(0.8, 0.2, r);
      
      vec3 finalColor = mix(color + grain, vec3(0.0), vignette);
      
      // Use multiply blending to darken the scene professionally
      gl_FragColor = vec4(finalColor, 0.8 * (1.0 - vignette));
    }
  `
}

export function MirrorDimension({ active }) {
  const materialRef = useRef()
  const groupRef = useRef()
  const { camera, size } = useThree()

  useFrame((state) => {
    if (!active) return
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime()
      materialRef.current.uniforms.resolution.value.set(size.width, size.height)
    }
    // Lock overlay directly to camera
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position)
      groupRef.current.quaternion.copy(camera.quaternion)
      groupRef.current.translateZ(-1) // Put right in front of lens
    }
  })

  if (!active) return null

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[5, 5]} />
        <shaderMaterial
          ref={materialRef}
          args={[DarkMatterShader]}
          transparent={true}
          depthWrite={false}
          blending={THREE.MultiplyBlending} // Professional cinematic darkening
        />
      </mesh>
    </group>
  )
}
