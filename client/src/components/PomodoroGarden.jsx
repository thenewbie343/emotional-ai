import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, Cylinder, Octahedron, Box, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

// --- Seeded Random for Stable Decorative Elements ---
const createSeededRandom = (seedValue) => {
  let seed = seedValue;
  return () => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
};

// --- Rich Decorative Components ---

// Grass Patch using thin green/teal cones
const GrassPatch = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0.1, 0, 0.2]}>
        <coneGeometry args={[0.03, 0.4, 4]} />
        <meshStandardMaterial color="#10b981" roughness={0.9} />
      </mesh>
      <mesh position={[0.06, 0, -0.05]} rotation={[-0.1, 0, -0.1]}>
        <coneGeometry args={[0.025, 0.3, 4]} />
        <meshStandardMaterial color="#059669" roughness={0.9} />
      </mesh>
      <mesh position={[-0.06, 0, 0.05]} rotation={[0.05, 0, -0.2]}>
        <coneGeometry args={[0.02, 0.25, 4]} />
        <meshStandardMaterial color="#34d399" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Glowing Magic Flower
const MagicFlower = ({ position, color, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      {/* Stem */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <meshStandardMaterial color="#047857" roughness={0.9} />
      </mesh>
      {/* Glow Center */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      {/* Petals */}
      {[-0.1, 0.1].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 0]} rotation={[0, 0, x * 5]}>
          <boxGeometry args={[0.12, 0.03, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      ))}
      {[ -0.1, 0.1 ].map((z, i) => (
        <mesh key={i + 2} position={[0, 0.3, z]} rotation={[z * 5, 0, 0]}>
          <boxGeometry args={[0.06, 0.03, 0.12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// Rock / Boulder
const Boulder = ({ position, scale }) => {
  return (
    <mesh position={position} scale={scale} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#475569" roughness={0.95} metalness={0.1} />
    </mesh>
  );
};

// Central Glowing Pond
const GlowingPond = () => {
  return (
    <group position={[0, -0.4, 0]}>
      {/* Pond border rocks */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const r = 3 + Math.sin(i * 3) * 0.15;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const rockScale = 0.3 + Math.sin(i) * 0.15;
        return (
          <Boulder key={i} position={[x, 0.2, z]} scale={[rockScale, rockScale * 0.8, rockScale]} />
        );
      })}
      {/* Water Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0, 3, 32]} />
        <meshPhysicalMaterial 
          color="#06b6d4" 
          emissive="#0891b2" 
          emissiveIntensity={0.6}
          roughness={0.05} 
          metalness={0.9} 
          transmission={0.5}
          ior={1.33}
          transparent 
          opacity={0.85} 
        />
      </mesh>
      {/* Under-water glow */}
      <pointLight position={[0, 0.3, 0]} color="#06b6d4" intensity={2} distance={8} />
    </group>
  );
};

// --- Plant Primitives (Copied from ForestPomodoro for standalone rendering) ---
const MathCrystal = ({ scale }) => (
  <Float speed={2} rotationIntensity={1} floatIntensity={2}>
    <Octahedron args={[1, 0]} scale={scale}>
      <meshPhysicalMaterial color="#3b82f6" transparent opacity={0.9} roughness={0.05} metalness={0.6} clearcoat={1} emissive="#1d4ed8" emissiveIntensity={0.3} />
    </Octahedron>
  </Float>
);

const ScienceMushroom = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.2, 0.4, 1, 16]} position={[0, -0.5, 0]}>
      <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
    </Cylinder>
    <Sphere args={[0.8, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#10b981" emissive="#047857" emissiveIntensity={0.8} roughness={0.2} />
    </Sphere>
  </group>
);

const LanguageVine = ({ scale }) => {
  const spheres = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = Math.sin(t * Math.PI * 2.5) * 0.4 * t;
    const y = t * 2.2 - 1.1;
    const z = Math.cos(t * Math.PI * 2.5) * 0.4 * t;
    spheres.push(
      <Sphere key={i} args={[0.18, 16, 16]} position={[x, y, z]}>
        <meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.5} roughness={0.3} />
      </Sphere>
    );
  }
  return <group scale={scale}>{spheres}</group>;
};

const HistoryPillar = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.55, 0.55, 2, 12]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#94a3b8" roughness={0.9} />
    </Cylinder>
    <Box args={[1.3, 0.25, 1.3]} position={[0, -1, 0]}>
      <meshStandardMaterial color="#64748b" roughness={0.9} />
    </Box>
    <Box args={[1.3, 0.25, 1.3]} position={[0, 1, 0]}>
      <meshStandardMaterial color="#64748b" roughness={0.9} />
    </Box>
  </group>
);

const GeneralTree = ({ scale }) => (
  <group scale={scale}>
    <Cylinder args={[0.2, 0.35, 1.6, 16]} position={[0, -0.8, 0]}>
      <meshStandardMaterial color="#78350f" roughness={0.9} />
    </Cylinder>
    <Sphere args={[0.9, 16, 16]} position={[0, 0.6, 0]}>
      <meshStandardMaterial color="#22c55e" emissive="#15803d" emissiveIntensity={0.3} roughness={0.5} />
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
      <mesh visible={false} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 2.5, 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <PlantComp scale={0.95} />

      {/* Floating Spotlight when hovered */}
      {hovered && (
        <pointLight position={[0, 2, 0]} color="#c084fc" intensity={1.5} distance={5} />
      )}

      {hovered && (
        <Html position={[0, 1.8, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(192, 132, 252, 0.5)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            padding: '10px 14px',
            borderRadius: '16px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 30px rgba(0,0,0,0.7), 0 0 15px rgba(192, 132, 252, 0.2)',
            transform: 'translate3d(0, -10px, 0)',
            transition: 'all 0.2s ease',
            fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: 2, fontSize: '0.95rem' }}>{session.subject}</div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#38bdf8' }}>schedule</span>
              {session.duration_minutes} mins Focus
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
              {new Date(session.completed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

function PomodoroGardenContent({ userId, onClose }) {
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

  // Generate random organic positions for the plants
  const plantPositions = useMemo(() => {
    const seedRandom = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    return sessions.map((s, idx) => {
      const seed = new Date(s.completed_at).getTime() || idx;
      
      // We position them outside the central pond (radius 3.5) and within a max radius of 15
      const minRadius = 4.5;
      const maxRadius = Math.max(10, Math.sqrt(sessions.length) * 2.2);
      
      const r = minRadius + (seedRandom(seed) * (maxRadius - minRadius));
      const theta = seedRandom(seed + 1) * 2 * Math.PI;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      return { session: s, position: [x, 0, z] };
    });
  }, [sessions]);

  // Seeded decorations (Grass, Flowers, Rocks) to fill up the garden
  const decorations = useMemo(() => {
    const random = createSeededRandom(999);
    const list = [];
    const count = 120; // Number of foliage details

    for (let i = 0; i < count; i++) {
      // Don't place inside the central pond (radius 3.5)
      const minRadius = 3.6;
      const maxRadius = 18;
      const r = minRadius + (random() * (maxRadius - minRadius));
      const theta = random() * 2 * Math.PI;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      const typeVal = random();
      if (typeVal < 0.6) {
        // Grass Patch
        list.push({ type: 'grass', position: [x, 0, z], scale: 0.8 + random() * 0.4, id: i });
      } else if (typeVal < 0.85) {
        // Flower
        const colors = ['#f472b6', '#fbbf24', '#c084fc', '#60a5fa', '#34d399'];
        const color = colors[Math.floor(random() * colors.length)];
        list.push({ type: 'flower', position: [x, 0, z], color, scale: 0.8 + random() * 0.4, id: i });
      } else {
        // Boulder
        list.push({ type: 'rock', position: [x, 0.1, z], scale: [0.15 + random() * 0.2, 0.15 + random() * 0.15, 0.15 + random() * 0.2], id: i });
      }
    }
    return list;
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'radial-gradient(circle at center, #0b0f19 0%, #030408 100%)', 
      zIndex: 99999, display: 'flex', flexDirection: 'column',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Top Glassmorphic Navigation Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '25px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(3, 4, 8, 0.85) 0%, rgba(3, 4, 8, 0) 100%)',
        backdropFilter: 'blur(4px)',
        zIndex: 10
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, letterSpacing: '-0.5px' }}>
            <span className="material-symbols-outlined" style={{ color: '#c084fc', fontSize: '2.4rem' }}>local_florist</span>
            Your Focus Garden
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            A living testament to your study sessions — {sessions.length} plants grown
          </p>
        </div>

        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          {/* Quick Legend */}
          <div style={{ display: 'flex', gap: 15, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 16px', borderRadius: '16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span> Math</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span> Science</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }}></span> Lang</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }}></span> Hist</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></span> Gen</div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
              padding: '12px 24px', borderRadius: '50px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.95rem',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            Exit Garden
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 10, textAlign: 'center' }}>
          <div style={{ border: '3px solid rgba(192, 132, 252, 0.2)', borderTop: '3px solid #c084fc', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }}></div>
          <div style={{ fontWeight: 500, fontSize: '1.1rem', color: '#c084fc' }}>Summoning your focus sanctuary...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* 3D Canvas */}
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        <Canvas camera={{ position: [0, 9, 17], fov: 48 }} shadows>
          {/* Moody night scene fog */}
          <fog attach="fog" args={["#0b0f19", 12, 45]} />
          
          <Stars radius={80} depth={40} count={3500} factor={5} saturation={0.5} fade speed={1.5} />
          
          {/* Realistic soft overhead lighting */}
          <ambientLight intensity={0.25} />
          <directionalLight 
            position={[-15, 25, 10]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize-width={2048} 
            shadow-mapSize-height={2048} 
            color="#a7f3d0" // Soft minty-moonlight color
          />

          {/* Magical secondary color fill lights */}
          <pointLight position={[10, 8, 10]} color="#d8b4fe" intensity={1.5} distance={25} />
          <pointLight position={[-12, 6, -12]} color="#67e8f9" intensity={1.2} distance={20} />

          {/* Central Water Sanctuary */}
          <GlowingPond />

          {/* Rich Soil/Grassy Meadow Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color="#0d1527" // Dark mystical blue-green ground
              roughness={0.95} 
              metalness={0.05} 
            />
          </mesh>

          {/* Render Ground Grids for high-end look */}
          <gridHelper args={[60, 40, '#312e81', '#1e1b4b']} position={[0, -0.41, 0]} />

          {/* Stable Seeded Foliage/Garden Elements */}
          {decorations.map((d) => {
            if (d.type === 'grass') {
              return <GrassPatch key={d.id} position={d.position} scale={d.scale} />;
            } else if (d.type === 'flower') {
              return <MagicFlower key={d.id} position={d.position} color={d.color} scale={d.scale} />;
            } else {
              return <Boulder key={d.id} position={d.position} scale={d.scale} />;
            }
          })}

          {/* Render User's Grown Plants */}
          {plantPositions.map((p, i) => (
            <GardenPlant key={p.session.id || i} session={p.session} position={p.position} />
          ))}

          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            maxPolarAngle={Math.PI / 2 - 0.08} // Prevent camera going below ground
            minDistance={4} 
            maxDistance={25}
            autoRotate={true}
            autoRotateSpeed={0.3}
          />
        </Canvas>
      </div>

      {/* Floating Instructions/Status overlay */}
      <div style={{
        position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 24px', borderRadius: '30px', color: 'white', fontSize: '0.85rem',
        backdropFilter: 'blur(12px)', pointerEvents: 'none', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: 18 }}>drag_pan</span>
        Drag to rotate. Scroll to zoom. Hover over any plant to inspect.
      </div>
    </div>
  );
}

// Portal implementation to escape parent styling & transforms
export default function PomodoroGarden({ userId, onClose }) {
  return createPortal(
    <PomodoroGardenContent userId={userId} onClose={onClose} />,
    document.body
  );
}
