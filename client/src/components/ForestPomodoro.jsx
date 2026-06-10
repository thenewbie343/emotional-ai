import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, Cylinder, Octahedron, Box } from '@react-three/drei';
import * as THREE from 'three';
import PomodoroGarden from './PomodoroGarden';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

// 3D Plant Components
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
  // A simple abstraction of a vine: a curved cylinder-like arrangement of spheres
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

const WiltingPlant = ({ children }) => {
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.PI / 2.5, 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -1, 0.05);
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

export default function ForestPomodoro({ userId, onComplete }) {
  const [subject, setSubject] = useState('General');
  const [durationStr, setDurationStr] = useState('25');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [status, setStatus] = useState('idle'); // idle, running, completed, wilted
  const [debugMode, setDebugMode] = useState(false);
  const [showGarden, setShowGarden] = useState(false);

  const durationMins = parseInt(durationStr, 10);
  const durationSecs = debugMode ? durationMins : durationMins * 60; // In debug mode, 1 min = 1 sec

  useEffect(() => {
    if (status === 'idle') {
      setTimeLeft(durationSecs);
    }
  }, [durationSecs, status]);

  // Page visibility API for wilting
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'running' && !debugMode) {
        setStatus('wilted');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, debugMode]);

  // Timer interval
  useEffect(() => {
    let interval;
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const handleStart = () => {
    setStatus('running');
  };

  const handleGiveUp = () => {
    setStatus('wilted');
  };

  const handleComplete = async () => {
    setStatus('completed');
    try {
      const res = await fetch(`${API_BASE}/api/study/pomodoro/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          durationMins,
          completed: true,
          plantType: subject
        })
      });
      const data = await res.json();
      if (onComplete && data.success) {
        onComplete(durationMins, data.xpEarned);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  const reset = () => {
    setStatus('idle');
    setTimeLeft(durationSecs);
  };

  const progress = status === 'idle' ? 0 : status === 'completed' ? 1 : 1 - (timeLeft / durationSecs);
  
  // Base scale starts at 0.2 and grows to 1.0. If wilted, it shrinks or tips over.
  const baseScale = 0.2 + (progress * 0.8);
  const actualScale = status === 'wilted' ? baseScale * 0.8 : baseScale;

  const renderPlant = () => {
    let PlantComp = GeneralTree;
    if (subject === 'Math') PlantComp = MathCrystal;
    else if (subject === 'Science') PlantComp = ScienceMushroom;
    else if (subject === 'Language') PlantComp = LanguageVine;
    else if (subject === 'History') PlantComp = HistoryPillar;

    const plant = <PlantComp scale={actualScale} />;
    if (status === 'wilted') return <WiltingPlant>{plant}</WiltingPlant>;
    return plant;
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const displayTime = debugMode ? `${timeLeft}s` : `${mins}:${secs}`;

  return (
    <div className="sai-widget" style={{ width: '100%', maxWidth: 320, padding: 20, textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at 50% 100%, rgba(124, 92, 252, 0.15) 0%, transparent 60%)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>local_florist</span>
            Focus Garden
          </div>
          <button 
            onClick={() => setDebugMode(!debugMode)}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, cursor: 'pointer' }}
          >
            DEBUG: {debugMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <button 
          onClick={() => setShowGarden(true)}
          style={{ width: '100%', padding: '8px 0', marginBottom: 15, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>park</span>
          View My Garden
        </button>

        {status === 'idle' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <select 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 12, outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="General">General</option>
              <option value="Math">Math (Crystal)</option>
              <option value="Science">Science (Mushroom)</option>
              <option value="Language">Language (Vine)</option>
              <option value="History">History (Pillar)</option>
            </select>
            <select 
              value={durationStr} 
              onChange={(e) => setDurationStr(e.target.value)}
              style={{ width: 80, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 12, outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="25">25m</option>
              <option value="45">45m</option>
              <option value="60">60m</option>
            </select>
          </div>
        )}

        {/* 3D Canvas Container */}
        <div style={{ width: '100%', height: 180, background: 'rgba(0,0,0,0.2)', borderRadius: 16, marginBottom: 20, position: 'relative', border: status === 'wilted' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
          <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Environment preset="city" />
            
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color="#1f2937" roughness={1} />
            </mesh>

            {renderPlant()}
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
          </Canvas>
          
          {/* Status Overlay */}
          {status === 'wilted' && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 16, flexDirection: 'column' }}>
              <span className="material-symbols-outlined text-red-500 text-4xl mb-2">sentiment_very_dissatisfied</span>
              <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>Your plant wilted.</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: 4 }}>You left the session.</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: '2.5rem', fontWeight: 300, color: status === 'wilted' ? '#f87171' : 'white', fontFamily: 'monospace', letterSpacing: 4, marginBottom: 20 }}>
          {status === 'completed' ? 'DONE' : displayTime}
        </div>

        {status === 'idle' && (
          <button onClick={handleStart} style={{ width: '100%', padding: '12px 0', borderRadius: 20, background: 'linear-gradient(135deg, #7c5cfc, #5a3fd6)', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(124,92,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
            Plant Seed
          </button>
        )}

        {status === 'running' && (
          <button onClick={handleGiveUp} style={{ width: '100%', padding: '12px 0', borderRadius: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            Give Up (Wilts Plant)
          </button>
        )}

        {(status === 'completed' || status === 'wilted') && (
          <button onClick={reset} style={{ width: '100%', padding: '12px 0', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Plant Another
          </button>
        )}
      </div>

      {showGarden && <PomodoroGarden userId={userId} onClose={() => setShowGarden(false)} />}
    </div>
  );
}
