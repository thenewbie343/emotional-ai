import { useEffect, useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useParasiteState } from "../hooks/useParasiteState";

// ─── Parasite Island Modifier ─────────────────────────────────────────────────
// Place this INSIDE your <Canvas> in HomeScene.jsx
export function ParasiteIslandModifier({ islandRef, buildingRef, portalRef }) {
  const { changes, tier, isSilent, isUnraveling, isHungry } = useParasiteState();
  const { scene, camera } = useThree();
  const applied = useRef(new Set());

  // Apply changes to 3D objects
  useEffect(() => {
    changes.forEach(change => {
      if (applied.current.has(change.id)) return;

      switch (change.target) {
        case "portal_position":
          if (portalRef?.current) {
            portalRef.current.position.x += change.value.x;
            portalRef.current.position.z += change.value.z;
          }
          break;

        case "small_island_tilt":
          // Find small islands in scene and tilt one
          scene.traverse(obj => {
            if (obj.name === "small_island_0") {
              obj.rotation.z = THREE.MathUtils.degToRad(change.value);
            }
          });
          break;

        case "building_lights":
          // Turn off lights on one building
          scene.traverse(obj => {
            if (obj.name === "building_light_0" && obj.isLight) {
              obj.intensity = change.value ? 1 : 0;
            }
          });
          break;

        case "color_temperature":
          // Shift scene fog color
          if (scene.fog) {
            const col = new THREE.Color(scene.fog.color);
            col.offsetHSL(0, 0, change.value * 0.1);
            scene.fog.color = col;
          }
          break;

        case "frozen":
          // Handled in useFrame below
          break;
      }

      applied.current.add(change.id);
    });
  }, [changes, scene, portalRef]);

  // Get change values for animation
  const waterDarkness = changes.find(c => c.target === "water_darkness")?.value || 0;
  const birdCount = changes.find(c => c.target === "bird_count")?.value;
  const starRate = changes.find(c => c.target === "shooting_star_rate")?.value || 1;
  const isFrozen = changes.some(c => c.target === "frozen");
  const hasPhantomIsland = changes.some(c => c.target === "phantom_island");

  return (
    <>
      {/* Water darkening */}
      {waterDarkness > 0 && <WaterDarkener darkness={waterDarkness} />}

      {/* Phantom island in the distance */}
      {hasPhantomIsland && <PhantomIsland />}

      {/* Tier 5 — center light always on */}
      {isSilent && <CenterLight />}

      {/* Unraveling particle drift from SIYA */}
      {isUnraveling && <UnravelingParticles />}

      {/* Extra shooting stars */}
      {starRate > 1 && <ExtraShootingStars rate={starRate} />}

      {/* Tier 4+ flowers */}
      {tier >= 2 && <SIYAFlowers tier={tier} />}

      {/* Freeze frame effect */}
      {isFrozen && <FreezeEffect />}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WaterDarkener({ darkness }) {
  const meshRef = useRef();
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.color = new THREE.Color(
        0.05,
        0.05 + (1 - darkness) * 0.1,
        0.15 + (1 - darkness) * 0.2
      );
    }
  }, [darkness]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0d1b2a" transparent opacity={darkness * 0.6} />
    </mesh>
  );
}

function PhantomIsland() {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Slowly bob and fade in/out
    meshRef.current.position.y = -1 + Math.sin(clock.getElapsedTime() * 0.3) * 0.3;
    meshRef.current.material.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
  });

  return (
    <group position={[45, -1, -30]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[3, 8, 6]} />
        <meshStandardMaterial
          color="#1a1a2e" transparent opacity={0.3}
          roughness={0.9} metalness={0.1}
        />
      </mesh>
      {/* Nothing on it. Just there. */}
    </group>
  );
}

function CenterLight() {
  const lightRef = useRef();
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    lightRef.current.intensity = 1.5 + Math.sin(clock.getElapsedTime()) * 0.3;
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[0, 2, 0]}
        color="#fff8e7"
        intensity={1.5}
        distance={20}
      />
      {/* Visual orb for the light */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshBasicMaterial color="#fff8e7" />
      </mesh>
    </>
  );
}

function UnravelingParticles() {
  const particlesRef = useRef();
  const count = 80;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      // Drift slowly outward
      pos[i * 3]     += Math.sin(t * 0.2 + i) * 0.003;
      pos[i * 3 + 1] += 0.005; // slowly rise
      pos[i * 3 + 2] += Math.cos(t * 0.3 + i) * 0.003;
      // Reset when too far
      if (pos[i * 3 + 1] > 6) {
        pos[i * 3]     = (Math.random() - 0.5) * 3;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} position={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#6d28d9" size={0.06} transparent opacity={0.4}
        depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ExtraShootingStars({ rate }) {
  const stars = useRef([]);
  const groupRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    stars.current.forEach((star, i) => {
      if (!star) return;
      star.position.x -= 0.3 * rate;
      star.position.y -= 0.15;
      if (star.position.x < -50) {
        star.position.x = 50 + Math.random() * 20;
        star.position.y = 20 + Math.random() * 15;
        star.position.z = (Math.random() - 0.5) * 40;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: Math.floor(rate * 2) }).map((_, i) => (
        <mesh
          key={i}
          ref={el => stars.current[i] = el}
          position={[
            Math.random() * 60 - 30,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 40
          ]}
        >
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function SIYAFlowers({ tier }) {
  const flowerColor = tier >= 4 ? "#4a0080" : tier >= 3 ? "#6d28d9" : "#a78bfa";
  const count = tier >= 4 ? 8 : tier >= 3 ? 5 : 3;

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = 6 + Math.random() * 2;
        return (
          <FlowerMesh
            key={i}
            position={[Math.cos(angle) * r, -1.5, Math.sin(angle) * r]}
            color={flowerColor}
            delay={i * 0.5}
          />
        );
      })}
    </group>
  );
}

function FlowerMesh({ position, color, delay }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.2 + delay;
    meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.5 + delay) * 0.1;
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Stem */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      {/* Petals */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 5) * Math.PI * 2) * 0.12,
            0.62,
            Math.sin((i / 5) * Math.PI * 2) * 0.12,
          ]}
        >
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Center */}
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function FreezeEffect() {
  // Desaturate the whole scene slightly — handled via post-processing
  // For basic version: add a subtle blue overlay mesh
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[100, 8, 8]} />
      <meshBasicMaterial
        color="#0a0a2e" transparent opacity={0.15}
        side={THREE.BackSide} depthWrite={false}
      />
    </mesh>
  );
}
