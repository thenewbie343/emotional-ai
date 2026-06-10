import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Html } from '@react-three/drei';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 1 — LibraryTower
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [3, 1.2, -2]
// Trigger: 10 missions complete
export function LibraryTower() {
  const geometries = useMemo(() => {
    const g1 = new THREE.BoxGeometry(1.2, 0.3, 1.2).translate(0, 0.15, 0);
    const g2 = new THREE.BoxGeometry(1.0, 0.8, 1.0).translate(0, 0.7, 0);
    const g3 = new THREE.BoxGeometry(0.8, 0.8, 0.8).translate(0, 1.5, 0);
    const g4 = new THREE.BoxGeometry(0.6, 0.6, 0.6).translate(0, 2.2, 0);

    const wallGeom = BufferGeometryUtils.mergeGeometries([g1, g2, g3, g4]);

    g1.dispose();
    g2.dispose();
    g3.dispose();
    g4.dispose();

    const roofGeom = new THREE.BoxGeometry(0.4, 0.2, 0.4);
    const windowGeom = new THREE.BoxGeometry(0.2, 0.3, 0.05);

    return { wallGeom, roofGeom, windowGeom };
  }, []);

  const materials = useMemo(() => {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: '#2e1065',
      roughness: 0.85,
      metalness: 0.1,
    });

    const roofMaterial = new THREE.MeshStandardMaterial({
      color: '#4c1d95',
      roughness: 0.7,
      metalness: 0.2,
    });

    const windowMaterial = new THREE.MeshBasicMaterial({
      color: '#fef08a',
    });

    return { wallMaterial, roofMaterial, windowMaterial };
  }, []);

  return (
    <group position={[3, 1.2, -2]}>
      <mesh geometry={geometries.wallGeom} material={materials.wallMaterial} castShadow={false} receiveShadow={false} />
      <mesh geometry={geometries.roofGeom} material={materials.roofMaterial} position={[0, 2.6, 0]} castShadow={false} receiveShadow={false} />
      <mesh geometry={geometries.windowGeom} material={materials.windowMaterial} position={[0, 0.7, 0.501]} castShadow={false} receiveShadow={false} />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 2 — Monument
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position starts around: [-3, 1, 2]
// Trigger: Goal completed
export function Monument({ goalName, index }) {
  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.15, 0.18, 0.8, 8);
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4f46e5',
      roughness: 0.65,
      metalness: 0.3,
    });
  }, []);

  const position = useMemo(() => {
    const cols = 3;
    const xOffset = (index % cols) * 0.6;
    const zOffset = Math.floor(index / cols) * -0.6;
    return [-3 + xOffset, 1, 2 + zOffset];
  }, [index]);

  return (
    <group position={position}>
      <mesh geometry={geometry} material={material} position={[0, 0.4, 0]} castShadow={false} receiveShadow={false} />
      <Html position={[0, 0.9, 0]} center distanceFactor={15}>
        <div style={{
          background: 'rgba(15, 15, 25, 0.9)',
          border: '1px solid rgba(124, 92, 252, 0.4)',
          backdropFilter: 'blur(6px)',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '10px',
          fontSize: '0.65rem',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          🏆 {goalName}
        </div>
      </Html>
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 3 — Observatory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [0, 3, -4]
// Trigger: Mastermind rank reached
export function Observatory() {
  const geometry = useMemo(() => {
    const g1 = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12).translate(0, 0.15, 0);
    const g2 = new THREE.SphereGeometry(0.5, 16, 16).translate(0, 0.3, 0);
    const merged = BufferGeometryUtils.mergeGeometries([g1, g2]);
    g1.dispose();
    g2.dispose();
    return merged;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#a78bfa',
      wireframe: true,
    });
  }, []);

  return (
    <group position={[0, 3, -4]}>
      <mesh geometry={geometry} material={material} castShadow={false} receiveShadow={false} />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 4 — Garden
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [2, 1, 3]
// Trigger: 25 pomodoros completed
export function Garden() {
  const count = 25;
  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), []);
  const foliageGeometry = useMemo(() => new THREE.SphereGeometry(0.4, 8, 8), []);

  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.9,
  }), []);

  const foliageMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#10b981',
    roughness: 0.6,
  }), []);

  const trunkRef = useRef();
  const foliageRef = useRef();

  useEffect(() => {
    if (!trunkRef.current || !foliageRef.current) return;
    const tempObject = new THREE.Object3D();
    const spacing = 0.35;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const x = (col - 2) * spacing;
      const z = (row - 2) * spacing;

      // Position trunk
      tempObject.position.set(x, 0.4 * 0.15, z);
      tempObject.scale.set(0.15, 0.15, 0.15);
      tempObject.updateMatrix();
      trunkRef.current.setMatrixAt(i, tempObject.matrix);

      // Position foliage
      tempObject.position.set(x, 0.9 * 0.15, z);
      tempObject.scale.set(0.15, 0.15, 0.15);
      tempObject.updateMatrix();
      foliageRef.current.setMatrixAt(i, tempObject.matrix);
    }
    trunkRef.current.instanceMatrix.needsUpdate = true;
    foliageRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group position={[2, 1, 3]}>
      <instancedMesh ref={trunkRef} args={[trunkGeometry, trunkMaterial, count]} castShadow={false} receiveShadow={false} />
      <instancedMesh ref={foliageRef} args={[foliageGeometry, foliageMaterial, count]} castShadow={false} receiveShadow={false} />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 5 — Lighthouse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [-4, 1, -4]
// Trigger: 30 day streak
export function Lighthouse() {
  const towerGeom = useMemo(() => new THREE.CylinderGeometry(0.15, 0.3, 2.2, 10), []);
  const lightGeom = useMemo(() => new THREE.SphereGeometry(0.18, 8, 8), []);

  const towerMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.6,
    metalness: 0.2,
  }), []);

  const lightMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#fef08a',
  }), []);

  const [target, setTarget] = useState(null);
  const targetRef = useRef();

  useFrame((state) => {
    if (targetRef.current) {
      const t = state.clock.getElapsedTime() * 0.8;
      targetRef.current.position.x = Math.cos(t) * 5;
      targetRef.current.position.z = Math.sin(t) * 5;
    }
  });

  return (
    <group position={[-4, 1, -4]}>
      <mesh geometry={towerGeom} material={towerMaterial} position={[0, 1.1, 0]} castShadow={false} receiveShadow={false} />
      <mesh geometry={lightGeom} material={lightMaterial} position={[0, 2.2, 0]} castShadow={false} receiveShadow={false} />

      <spotLight
        position={[0, 2.2, 0]}
        intensity={0.3}
        distance={10}
        angle={Math.PI / 6}
        penumbra={0.5}
        castShadow={false}
        color="#fbbf24"
        target={target}
      />
      <object3D 
        ref={(node) => {
          targetRef.current = node;
          setTarget(node);
        }} 
        position={[5, 1.7, 0]} 
      />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 6 — Aurora
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [0, 20, 0]
// Trigger: 7 day study streak
export function Aurora() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(12, 6), []);

  const mats = useMemo(() => {
    const config = {
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    };
    return [
      new THREE.MeshBasicMaterial({ color: '#34d399', ...config }),
      new THREE.MeshBasicMaterial({ color: '#a78bfa', ...config }),
      new THREE.MeshBasicMaterial({ color: '#60a5fa', ...config }),
    ];
  }, []);

  return (
    <group position={[0, 20, 0]}>
      <mesh geometry={geometry} material={mats[0]} rotation={[0.2, 0.1, 0]} position={[0, 0, -1]} castShadow={false} receiveShadow={false} />
      <mesh geometry={geometry} material={mats[1]} rotation={[0.2, -0.2, 0]} position={[0, 0.5, 0]} castShadow={false} receiveShadow={false} />
      <mesh geometry={geometry} material={mats[2]} rotation={[-0.1, 0.3, 0]} position={[0, -0.5, 1]} castShadow={false} receiveShadow={false} />
    </group>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENT 7 — Fireworks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Position: [0, 8, 0]
// Trigger: Exam completed
export function Fireworks({ onComplete }) {
  const count = 200;

  useEffect(() => {
    const t = setTimeout(() => {
      if (onComplete) onComplete();
    }, 10000);
    return () => clearTimeout(t);
  }, [onComplete]);

  const [positions, velocities, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    const palette = ['#facc15', '#f97316', '#a78bfa', '#34d399'];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 1.0 + Math.random() * 2.5;

      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;

      const hex = palette[Math.floor(Math.random() * palette.length)];
      const color = new THREE.Color(hex);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return [pos, vel, cols];
  }, []);

  const pointsRef = useRef();

  useFrame(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;

    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3] += velocities[i * 3] * 0.016;
      velocities[i * 3 + 1] -= 0.2 * 0.016; // Gravity
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016;
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 8, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IslandAchievements({ achievements = [], showFireworks = false, onFireworksComplete }) {
  const isUnlocked = (id) => achievements.some(a => a.achievement_id === id);

  const monuments = useMemo(() => {
    return achievements.filter(a => a.achievement_id === 'monument');
  }, [achievements]);

  return (
    <group>
      {isUnlocked('library_tower') && <LibraryTower />}

      {monuments.map((m, idx) => (
        <Monument 
          key={m.id || idx} 
          goalName={m.metadata?.goalName || 'Goal'} 
          index={idx} 
        />
      ))}

      {isUnlocked('observatory') && <Observatory />}

      {isUnlocked('garden') && <Garden />}

      {isUnlocked('lighthouse') && <Lighthouse />}

      {isUnlocked('aurora') && <Aurora />}

      {showFireworks && <Fireworks onComplete={onFireworksComplete} />}
    </group>
  );
}
