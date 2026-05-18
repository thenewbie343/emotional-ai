import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTIONS = [
  { id: 'sleep',   label: 'Physical (Sleep)', icon: '🌙', scale: ['Terrible', 'Poor', 'Okay', 'Good', 'Great'] },
  { id: 'energy',  label: 'Mental (Energy)', icon: '⚡', scale: ['Drained', 'Low', 'Medium', 'High', 'Electric'] },
  { id: 'stress',  label: 'Emotional (Stress)', icon: '🌀', scale: ['Very High', 'High', 'Moderate', 'Low', 'None'] },
  { id: 'connect', label: 'Social (Connect)', icon: '🤝', scale: ['Very Alone', 'Isolated', 'Neutral', 'Connected', 'Loved'] },
  { id: 'purpose', label: 'Spiritual (Purpose)', icon: '🎯', scale: ['Lost', 'Uncertain', 'Neutral', 'Meaningful', 'Inspired'] },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ─── 3D Gyroscope Component ──────────────────────────────────────────────────
function GyroscopeRings({ scores }) {
  const ringsRef = useRef([]);
  const coreRef = useRef();
  
  // Calculate balance based on scores (0 to 1)
  const balance = useMemo(() => {
    if (!scores || scores.length === 0) return 0.5;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg / 4; // 0 to 1
  }, [scores]);

  const isPerfectlyAligned = balance >= 0.8;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Wobble amount increases as balance decreases
    const wobble = (1 - balance) * 0.5;
    const baseSpeed = 0.5 + balance * 1.5; // Rotates faster when balanced

    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      
      // Target rotations for alignment (0,0,0 is perfectly aligned)
      const targetX = isPerfectlyAligned ? 0 : Math.sin(t * baseSpeed + i) * wobble * Math.PI;
      const targetY = isPerfectlyAligned ? t * (0.2 + i * 0.1) : Math.cos(t * baseSpeed * 0.8 + i) * wobble * Math.PI;
      const targetZ = isPerfectlyAligned ? 0 : Math.sin(t * baseSpeed * 1.2 + i) * wobble * Math.PI;

      ring.rotation.x = THREE.MathUtils.lerp(ring.rotation.x, targetX, 0.05);
      ring.rotation.y = THREE.MathUtils.lerp(ring.rotation.y, targetY, 0.05);
      ring.rotation.z = THREE.MathUtils.lerp(ring.rotation.z, targetZ, 0.05);
      
      // Color shifts based on alignment
      const material = ring.children[0].material;
      const targetColor = new THREE.Color().setHSL(0.6 + (i * 0.05), balance, 0.3 + (balance * 0.5));
      material.color.lerp(targetColor, 0.05);
    });

    if (coreRef.current) {
      const coreScale = 0.5 + balance * 0.5;
      coreRef.current.scale.setScalar(THREE.MathUtils.lerp(coreRef.current.scale.x, coreScale, 0.1));
      coreRef.current.rotation.y += 0.01;
      coreRef.current.material.emissiveIntensity = balance * 2;
    }
  });

  return (
    <group>
      {/* 5 Intersecting Rings */}
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} ref={(el) => ringsRef.current[i] = el}>
          <mesh>
            <torusGeometry args={[2.5 - i * 0.3, 0.03, 16, 100]} />
            <meshStandardMaterial 
              metalness={0.9} 
              roughness={0.1} 
              transparent 
              opacity={0.8}
              envMapIntensity={2}
            />
          </mesh>
        </group>
      ))}

      {/* Core Energy */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#a78bfa" 
          emissive="#7c3aed" 
          wireframe={!isPerfectlyAligned}
          transparent 
          opacity={0.9} 
        />
      </mesh>

      {/* Volumetric God Rays when aligned */}
      {isPerfectlyAligned && (
        <group position={[0, 5, 0]}>
          <SpotLight
            distance={20}
            angle={0.4}
            attenuation={10}
            anglePower={5}
            color="#a78bfa"
            intensity={5}
            penumbra={1}
            castShadow
          />
        </group>
      )}

      {/* Atmospheric Particles */}
      <Sparkles 
        count={isPerfectlyAligned ? 200 : 50} 
        scale={6} 
        size={isPerfectlyAligned ? 3 : 1} 
        color="#a78bfa" 
        speed={balance * 2} 
      />
    </group>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SaiWellness({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('check'); // 'check' | 'result'
  const [answers, setAnswers] = useState({});
  const [todayEntry, setTodayEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('sai_wellness')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date_key', getTodayKey())
        .limit(1);
      if (data && data.length > 0) {
        setTodayEntry(data[0]);
        setAnswers({
          sleep: data[0].sleep,
          energy: data[0].energy,
          stress: data[0].stress,
          connect: data[0].connect,
          purpose: data[0].purpose
        });
        setStep('result');
      }
    };
    load();
  }, [session]);

  const calcAvg = (entry) => {
    const scores = QUESTIONS.map(q => entry[q.id] ?? 2);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!allAnswered || !session?.user?.id) return;
    setSaving(true);

    const payload = {
      user_id: session.user.id,
      date_key: getTodayKey(),
      ...answers,
      avg_score: calcAvg(answers),
    };

    const { data, error } = await supabase
      .from('sai_wellness')
      .upsert([payload], { onConflict: 'user_id,date_key' })
      .select();

    if (data?.[0] && !error) {
      setTodayEntry(data[0]);
    }
    setSaving(false);
    setStep('result');
  };

  // Convert answers object to array for Gyroscope
  const currentScores = Object.keys(answers).length > 0 
    ? QUESTIONS.map(q => answers[q.id] !== undefined ? answers[q.id] : 2) 
    : [2, 2, 2, 2, 2]; // Default mid

  return (
    <div className="h-screen w-screen bg-[#020005] overflow-hidden relative font-sans text-white">
      
      {/* 3D Gyroscope Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <color attach="background" args={["#020005"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} color="#a78bfa" />
          <Environment preset="night" />
          <Suspense fallback={null}>
            <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
              <GyroscopeRings scores={currentScores} />
            </Float>
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/sai')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div className="flex flex-col">
          <span className="text-sm tracking-[0.2em] font-light text-gray-300">WELLNESS RADAR</span>
          <span className="text-[10px] tracking-widest uppercase text-indigo-400">The Gyroscope</span>
        </div>
      </header>

      {/* Main Content Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
        <AnimatePresence mode="wait">
          
          {step === 'check' && (
            <motion.div 
              key="check"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl p-8 pointer-events-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-light tracking-wide mb-2">Align Your Rings</h2>
                <p className="text-sm text-gray-400">Log your state to stabilize the Gyroscope.</p>
              </div>

              <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {QUESTIONS.map(q => (
                  <div key={q.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-indigo-200 uppercase tracking-widest">
                      <span>{q.icon}</span> {q.label}
                    </div>
                    <div className="flex gap-2">
                      {q.scale.map((label, i) => (
                        <button
                          key={i}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
                          className={`flex-1 py-3 text-xs rounded-xl border transition-all ${
                            answers[q.id] === i 
                              ? 'bg-indigo-600/50 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)] text-white' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!allAnswered || saving}
                className="w-full mt-8 py-4 rounded-xl bg-white text-black font-semibold tracking-widest uppercase text-sm hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Aligning...' : 'Sync Resonance'}
              </button>
            </motion.div>
          )}

          {step === 'result' && todayEntry && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-12 left-12 p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl pointer-events-auto max-w-sm"
            >
              <h2 className="text-sm uppercase tracking-widest text-indigo-400 mb-6">Alignment Status</h2>
              
              <div className="space-y-4">
                {QUESTIONS.map(q => {
                  const val = todayEntry[q.id] ?? 2;
                  const pct = (val / 4) * 100;
                  return (
                    <div key={q.id}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{q.label}</span>
                        <span>{q.scale[val]}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full ${pct > 66 ? 'bg-emerald-400' : pct > 33 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <button 
                  onClick={() => setStep('check')}
                  className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  Recalibrate
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
