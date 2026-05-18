import { useState, useEffect, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const MOODS = [
  { emoji: '🤩', label: 'Amazing', color: '#ffd700', hsl: [50, 1, 0.5] },
  { emoji: '😊', label: 'Good', color: '#00ff88', hsl: [150, 1, 0.5] },
  { emoji: '😐', label: 'Okay', color: '#88aacc', hsl: [210, 0.4, 0.7] },
  { emoji: '😢', label: 'Sad', color: '#5577cc', hsl: [225, 0.5, 0.6] },
  { emoji: '😡', label: 'Angry', color: '#ff4466', hsl: [350, 1, 0.6] },
];

const SHUNA_COMMENTS = {
  '🤩': ["Your positive energy is absolutely radiant!", "Amazing days deserve to be remembered. I'm so happy for you!"],
  '😊': ["Good vibes! What made today special?", "I'm glad you're feeling good. You deserve it."],
  '😐': ["Even ordinary days have small moments worth noticing.", "Sometimes 'okay' is perfectly fine. I'm here if you need me."],
  '😢': ["It's brave to acknowledge sadness. I'm right here with you.", "Sending you all my warmth. Tomorrow is a new beginning."],
  '😡': ["I hear you. It's okay to feel angry — let it out here safely.", "Your feelings are valid. Take a deep breath — I'm here."],
};

function formatTime(dateStr) {
  const d = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - d) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Emotional Particle Field ─────────────────────────────────────────────────
function EmotionField({ entries }) {
  const meshRef = useRef();
  const count = Math.min(entries.length * 50 + 200, 2000);
  
  const { positions, colors } = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const moodColorMap = { '🤩': [1, 0.85, 0], '😊': [0, 1, 0.53], '😐': [0.53, 0.67, 0.8], '😢': [0.33, 0.47, 0.8], '😡': [1, 0.27, 0.4] };
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Color from recent entries
      const entry = entries[Math.floor(Math.random() * Math.max(entries.length, 1))];
      const c = entry ? (moodColorMap[entry.mood] || [0.5, 0.5, 1]) : [0.5, 0.5, 1];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { positions: pos, colors: col };
  }, [entries, count]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.03;
      meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.02) * 0.2;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.1} sizeAttenuation transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ─── Core Mood Orb ────────────────────────────────────────────────────────────
function MoodOrb({ selectedMood }) {
  const meshRef = useRef();
  const mood = selectedMood ? MOODS.find(m => m.emoji === selectedMood) : null;
  const targetColor = mood ? new THREE.Color(mood.color) : new THREE.Color('#7c3aed');
  const currentColor = useRef(new THREE.Color('#7c3aed'));

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z += 0.003;
      currentColor.current.lerp(targetColor, 0.05);
      meshRef.current.material.color.copy(currentColor.current);
      meshRef.current.material.emissive.copy(currentColor.current);
      meshRef.current.material.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.85}
          wireframe={!selectedMood}
        />
      </mesh>
      {selectedMood && (
        <>
          <pointLight intensity={3} color={mood?.color || '#7c3aed'} distance={8} />
          <Sparkles count={40} scale={4} size={2} color={mood?.color || '#a78bfa'} speed={0.3} />
        </>
      )}
    </Float>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
import React from 'react';

export default function SaiJournal({ session }) {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState([]);
  const [shunaComment, setShunaComment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('sai_moods').select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setEntries(data); });
  }, [session]);

  const handleMoodSelect = (emoji) => {
    setSelectedMood(emoji);
    const pool = SHUNA_COMMENTS[emoji] || [];
    setShunaComment(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleSave = async () => {
    if (!selectedMood || !session?.user?.id) return;
    setSaving(true);
    const { data, error } = await supabase.from('sai_moods').insert([{
      user_id: session.user.id, mood: selectedMood, note: note.trim() || null,
    }]).select();

    if (!error && data) setEntries(p => [data[0], ...p]);
    setSelectedMood(null); setNote(''); setShunaComment(null); setSaving(false);
  };

  const currentMoodMeta = selectedMood ? MOODS.find(m => m.emoji === selectedMood) : null;

  return (
    <div className="h-screen w-screen bg-[#030008] overflow-hidden relative font-sans text-white">
      
      {/* 3D Emotional Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
          <color attach="background" args={["#030008"]} />
          <ambientLight intensity={0.3} />
          <Stars radius={80} depth={50} count={3000} factor={4} saturation={1} fade />
          <Suspense fallback={null}>
            <EmotionField entries={entries} />
            <MoodOrb selectedMood={selectedMood} />
          </Suspense>
        </Canvas>
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/siya')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div>
          <span className="text-sm tracking-[0.2em] font-light text-gray-300 block">INNER DIARY</span>
          <span className="text-[10px] tracking-widest uppercase text-fuchsia-400">Emotional Memory Field</span>
        </div>
      </header>

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="absolute top-6 right-6 z-50 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs uppercase tracking-widest text-gray-300 hover:bg-white/15 transition-all backdrop-blur-xl"
      >
        {showHistory ? 'Log Mood' : `${entries.length} Entries`}
      </button>

      {/* Main Interaction Area */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="logger"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto flex flex-col items-center gap-6 w-full max-w-md px-6"
            >
              <p className="text-gray-400 text-sm tracking-widest uppercase text-center">What dimension are you in right now?</p>
              
              {/* Mood Selector */}
              <div className="flex gap-4">
                {MOODS.map(m => (
                  <button
                    key={m.emoji}
                    onClick={() => handleMoodSelect(m.emoji)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all border ${selectedMood === m.emoji ? 'scale-125 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'scale-100 border-white/10 bg-white/5 hover:bg-white/10'}`}
                    style={selectedMood === m.emoji ? { borderColor: m.color + '80', background: m.color + '20', boxShadow: `0 0 20px ${m.color}40` } : {}}
                    title={m.label}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>

              {/* Shuna's response + note input */}
              <AnimatePresence>
                {selectedMood && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full space-y-4"
                  >
                    {shunaComment && (
                      <div className="p-4 rounded-2xl bg-black/40 border border-fuchsia-500/20 backdrop-blur-xl">
                        <p className="text-sm text-gray-200 leading-relaxed">💬 {shunaComment}</p>
                      </div>
                    )}
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="What's on your mind? (optional)"
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-fuchsia-500/30 resize-none"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all"
                      style={{ background: currentMoodMeta ? `linear-gradient(135deg, ${currentMoodMeta.color}60, ${currentMoodMeta.color}30)` : 'rgba(255,255,255,0.1)', border: `1px solid ${currentMoodMeta?.color || 'rgba(255,255,255,0.2)'}40` }}
                    >
                      {saving ? 'Crystallizing...' : 'Crystallize Emotion'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="pointer-events-auto w-full max-w-md px-6 max-h-[70vh] overflow-y-auto no-scrollbar space-y-3"
            >
              <div className="sticky top-0 pb-3">
                <h2 className="text-xs uppercase tracking-widest text-gray-400">Emotional History</h2>
              </div>
              {entries.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-12">No entries yet. Log your first mood.</div>
              ) : (
                entries.map((entry, i) => {
                  const m = MOODS.find(mo => mo.emoji === entry.mood);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md"
                    >
                      <div className="text-2xl">{entry.mood}</div>
                      <div className="flex-1 min-w-0">
                        {entry.note && <p className="text-sm text-gray-200 mb-1 truncate">{entry.note}</p>}
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-widest" style={{ color: m?.color || '#a78bfa' }}>{m?.label}</span>
                          <span className="text-xs text-gray-600">· {formatTime(entry.created_at)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
