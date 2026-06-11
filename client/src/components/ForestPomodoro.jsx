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

export default function ForestPomodoro({ userId, onComplete, presetSubject, presetDuration }) {
  const [customName, setCustomName] = useState('');
  const [subject, setSubject] = useState(presetSubject || 'General');
  const [durationVal, setDurationVal] = useState(presetDuration ? String(presetDuration) : '25');
  const [timeUnit, setTimeUnit] = useState('Minutes');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, running, completed, wilted
  const [showGarden, setShowGarden] = useState(false);

  useEffect(() => {
    if (presetSubject) {
      setSubject(presetSubject);
      setCustomName(presetSubject);
    }
    if (presetDuration) {
      setDurationVal(String(presetDuration));
      setTimeUnit('Minutes');
    }
  }, [presetSubject, presetDuration]);

  // Calculate total seconds based on user input
  let val = parseFloat(durationVal);
  if (isNaN(val) || val <= 0) val = 1;
  let durationSecs = 0;
  if (timeUnit === 'Hours') {
    if (val > 8) val = 8;
    durationSecs = Math.floor(val * 3600);
  } else if (timeUnit === 'Minutes') {
    durationSecs = Math.floor(val * 60);
  } else if (timeUnit === 'Seconds') {
    durationSecs = Math.floor(val);
  }

  const calculatePhases = (totalSeconds) => {
    const phases = [];
    let remaining = totalSeconds;
    // Auto breaks apply if total > 25 mins (1500 secs)
    if (remaining > 1500) {
      while (remaining > 0) {
        if (remaining >= 1800) {
          phases.push({ type: 'work', duration: 1500 });
          phases.push({ type: 'break', duration: 300 });
          remaining -= 1800;
        } else if (remaining > 1500) {
          phases.push({ type: 'work', duration: 1500 });
          phases.push({ type: 'break', duration: remaining - 1500 });
          remaining = 0;
        } else {
          phases.push({ type: 'work', duration: remaining });
          remaining = 0;
        }
      }
    } else {
      phases.push({ type: 'work', duration: remaining });
    }
    return phases;
  };

  const phases = calculatePhases(durationSecs);

  useEffect(() => {
    if (status === 'idle') {
      if (phases.length > 0) {
        setTimeLeft(phases[0].duration);
      }
      setCurrentPhaseIdx(0);
    }
  }, [durationSecs, status]);

  // Page visibility API for wilting
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === 'running' && phases[currentPhaseIdx]?.type === 'work') {
        setStatus('wilted');
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, phases, currentPhaseIdx]);

  // Timer interval
  useEffect(() => {
    let interval;
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Move to next phase
            if (currentPhaseIdx + 1 < phases.length) {
              const nextPhase = phases[currentPhaseIdx + 1];
              setCurrentPhaseIdx(currentPhaseIdx + 1);
              
              // Notify
              if (window.Notification && Notification.permission === 'granted') {
                new Notification(nextPhase.type === 'break' ? 'Break Time!' : 'Work Time!', { 
                  body: nextPhase.type === 'break' ? 'Time for a short break.' : 'Break is over. Back to focus.' 
                });
              }
              
              return nextPhase.duration;
            } else {
              handleComplete();
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, timeLeft, currentPhaseIdx, phases]);

  const handleStart = () => {
    if (window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    setCurrentPhaseIdx(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
    setStatus('running');
  };

  const handleGiveUp = () => {
    setStatus('wilted');
  };

  const handleComplete = async () => {
    setStatus('completed');
    try {
      const finalName = customName.trim() || subject;
      const res = await fetch(`${API_BASE}/api/study/pomodoro/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject: finalName,
          durationMins: Math.round(durationSecs / 60),
          completed: true,
          plantType: subject
        })
      });
      const data = await res.json();
      if (onComplete && data.success) {
        onComplete(Math.round(durationSecs / 60), data.xpEarned);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  const reset = () => {
    setStatus('idle');
    setCurrentPhaseIdx(0);
    if (phases.length > 0) setTimeLeft(phases[0].duration);
  };

  let totalElapsed = 0;
  for (let i = 0; i < currentPhaseIdx; i++) totalElapsed += phases[i].duration;
  totalElapsed += (phases[currentPhaseIdx]?.duration || 0) - timeLeft;
  
  const progress = status === 'idle' ? 0 : status === 'completed' ? 1 : totalElapsed / durationSecs;
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
  const displayTime = `${mins}:${secs}`;
  const isBreak = phases[currentPhaseIdx]?.type === 'break';

  const workCount = phases.filter(p => p.type === 'work').length;
  const breakCount = phases.filter(p => p.type === 'break').length;
  const breakDuration = breakCount > 0 ? (phases.find(p => p.type === 'break')?.duration / 60) : 0;
  const breakdownText = phases.length > 1 
    ? `${workCount} sessions × 25m + ${breakCount} break(s) of ${breakDuration}m`
    : `${Math.round(durationSecs / 60)} min work session`;

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
        </div>

        <button 
          onClick={() => setShowGarden(true)}
          style={{ width: '100%', padding: '8px 0', marginBottom: 15, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>park</span>
          View My Garden
        </button>

        {status === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 15 }}>
            <input 
              type="text" 
              placeholder="Custom task name (optional)" 
              value={customName} 
              onChange={e => setCustomName(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 12, outline: 'none', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
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
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="number"
                value={durationVal}
                onChange={e => setDurationVal(e.target.value)}
                min="1"
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 12, outline: 'none', fontSize: '0.85rem' }}
              />
              <select 
                value={timeUnit} 
                onChange={(e) => setTimeUnit(e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 12, outline: 'none', fontSize: '0.85rem' }}
              >
                <option value="Minutes">Minutes</option>
                <option value="Hours">Hours</option>
                <option value="Seconds">Seconds</option>
              </select>
            </div>
            {durationSecs > 1500 && (
              <div style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(124, 92, 252, 0.1)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(124, 92, 252, 0.2)' }}>
                {breakdownText}
              </div>
            )}
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

        {status === 'running' && (
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isBreak ? '#34d399' : '#a78bfa', marginBottom: 4, textTransform: 'uppercase' }}>
            {isBreak ? '☕ Break Time' : '🎯 Focus Time'}
          </div>
        )}

        <div style={{ fontSize: '2.5rem', fontWeight: 300, color: status === 'wilted' ? '#f87171' : isBreak ? '#34d399' : 'white', fontFamily: 'monospace', letterSpacing: 4, marginBottom: 20 }}>
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

