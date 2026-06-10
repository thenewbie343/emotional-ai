import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, Cylinder, Octahedron, Box, Html, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

// --- 3D Plant Components (Copied from ForestPomodoro for standalone rendering) ---
const MathCrystal = ({ scale }) => (
  <Float speed={2} rotationIntensity={1} floatIntensity={2}>
    <Octahedron args={[1, 0]} scale={scale}>
      <meshPhysicalMaterial color="#3b82f6" transparent opacity={0.8} roughness={0.1} metalness={0.5} clearcoat={1} />
    </Octahedron>
  </Float>
);

const ScienceMushroom = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.2, 0.4, 1, 16]} position={[0, -0.5, 0]}>
      <meshStandardMaterial color="#d1d5db" />
    </Cylinder>
    <Sphere args={[0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.5} />
    </Sphere>
  </group>
);

const LanguageVine = ({ scale }) => {
  const spheres = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = Math.sin(t * Math.PI * 2) * 0.5 * t;
    const y = t * 2 - 1;
    const z = Math.cos(t * Math.PI * 2) * 0.5 * t;
    spheres.push(
      <Sphere key={i} args={[0.2, 16, 16]} position={[x, y, z]}>
        <meshStandardMaterial color="#ec4899" />
      </Sphere>
    );
  }
  return <group scale={scale}>{spheres}</group>;
};

const HistoryPillar = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.6, 0.6, 2, 8]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#6b7280" roughness={0.9} />
    </Cylinder>
    <Box args={[1.4, 0.2, 1.4]} position={[0, -1, 0]}>
      <meshStandardMaterial color="#4b5563" />
    </Box>
    <Box args={[1.4, 0.2, 1.4]} position={[0, 1, 0]}>
      <meshStandardMaterial color="#4b5563" />
    </Box>
  </group>
);

const GeneralTree = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.2, 0.3, 1.5, 16]} position={[0, -0.75, 0]}>
      <meshStandardMaterial color="#78350f" />
    </Cylinder>
    <Sphere args={[1, 16, 16]} position={[0, 0.5, 0]}>
      <meshStandardMaterial color="#22c55e" />
    </Sphere>
  </group>
);

// Individual plant item with hover logic
const GardenPlant = ({ session, position }) => {
  const [hovered, setHovered] = useState(false);

  let PlantComp = GeneralTree;
  if (session.plant_type === 'Math') PlantComp = MathCrystal;
  else if (session.plant_type === 'Science') PlantComp = ScienceMushroom;
  else if (session.plant_type === 'Language') PlantComp = LanguageVine;
  else if (session.plant_type === 'History') PlantComp = HistoryPillar;

  return (
    <group 
      position={position} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Add a subtle invisible hit box for easier hovering */}
      <mesh visible={false} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 2, 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <PlantComp scale={0.8} />

      {hovered && (
        <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(20, 20, 30, 0.9)',
            border: '1px solid rgba(124, 92, 252, 0.4)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transform: 'translate3d(0, -10px, 0)'
          }}>
            <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: 2 }}>{session.subject}</div>
            <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{session.duration_minutes} minutes</div>
            <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 4 }}>
              {new Date(session.completed_at).toLocaleDateString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default function PomodoroGarden({ userId, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/study/pomodoro/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch garden sessions", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchSessions();
  }, [userId]);

  // Generate random organic positions for the plants based on the session ID so they are stable
  const plantPositions = useMemo(() => {
    // seeded random generator to keep positions stable
    const seedRandom = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    return sessions.map((s, idx) => {
      // Use the session created/completed date as a seed to ensure stable position
      const seed = new Date(s.completed_at).getTime() || idx;
      
      // Radius distribution: we want them to spread outwards. 
      // Area = pi*r^2, so r = sqrt(random) * maxRadius
      const maxRadius = Math.max(8, Math.sqrt(sessions.length) * 1.5);
      const r = Math.sqrt(seedRandom(seed)) * maxRadius;
      
      const theta = seedRandom(seed + 1) * 2 * Math.PI;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      return { session: s, position: [x, 0, z] };
    });
  }, [sessions]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#050510', zIndex: 9999, display: 'flex', flexDirection: 'column'
    }}>
      {/* Header Overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 10
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ color: '#c084fc', fontSize: '2rem' }}>forest</span>
            Your Focus Garden
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0 0 0' }}>
            {sessions.length} plants grown from your focus sessions
          </p>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
            padding: '10px 20px', borderRadius: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
            backdropFilter: 'blur(10px)'
          }}
        >
          <span className="material-symbols-outlined">close</span>
          Close Garden
        </button>
      </div>

      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 10 }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          Growing your garden...
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 8, 15], fov: 50 }}>
        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} inclination={0.4} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        
        {/* Dark night/evening environment */}
        <Environment preset="night" />

        {/* Huge Ground Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Central Pedestal (Optional, just to ground the scene center) */}
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[2, 2.5, 0.2, 32]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Html position={[0, 0, 0]} center zIndexRange={[0, 0]}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-20px)' }}>
            Start of Journey
          </div>
        </Html>

        {plantPositions.map((p, i) => (
          <GardenPlant key={p.session.id || i} session={p.session} position={p.position} />
        ))}

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          minDistance={2} 
          maxDistance={30}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
