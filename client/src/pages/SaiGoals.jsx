import { useState, useEffect, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Environment, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

// ─── Island Config (generated via Ollama MCP) ─────────────────────────────────
const ISLAND_CONFIGS = {
  health:    { baseColor: '#10b981', lightColor: '#34d399', particleColor: '#6ee7b7' },
  mind:      { baseColor: '#f1c40f', lightColor: '#f2c464', particleColor: '#ffe58f' },
  social:    { baseColor: '#f59e0b', lightColor: '#fbbf24', particleColor: '#fcd34d' },
  creative:  { baseColor: '#ec4899', lightColor: '#f472b6', particleColor: '#fbcfe8' },
  career:    { baseColor: '#00d4ff', lightColor: '#38bdf8', particleColor: '#7dd3fc' },
  wellbeing: { baseColor: '#a855f7', lightColor: '#c084fc', particleColor: '#e9d5ff' },
};

const CATEGORIES = [
  { key: 'health',    emoji: '💪', label: 'Health' },
  { key: 'mind',      emoji: '🧠', label: 'Mind' },
  { key: 'social',    emoji: '🤝', label: 'Social' },
  { key: 'creative',  emoji: '🎨', label: 'Creative' },
  { key: 'career',    emoji: '🚀', label: 'Career' },
  { key: 'wellbeing', emoji: '🌿', label: 'Wellbeing' },
];

const CHALLENGES = {
  health:    ["Go for a 15-minute walk today.", "Drink 8 glasses of water.", "Do 10 minutes of stretching.", "Sleep before midnight tonight."],
  mind:      ["Read 10 pages of any book.", "Write 3 things you're grateful for.", "Practice 5 minutes of mindful breathing.", "Learn one new concept today."],
  social:    ["Text someone you haven't talked to.", "Give someone a genuine compliment.", "Have a screen-free conversation.", "Ask a friend 'how are you really doing?'"],
  creative:  ["Doodle for 10 minutes.", "Write a short poem about your emotion.", "Take one photo you find beautiful.", "Listen to music you've never heard."],
  career:    ["Spend 20 focused minutes on your top task.", "Write your top 3 priorities.", "Read one article in your field.", "Organize one messy folder."],
  wellbeing: ["Spend 20 minutes in natural light.", "Do something that brings pure joy.", "Take a screen-free break.", "Reflect: what would make today good?"],
};

function generateChallenge(category) {
  const pool = CHALLENGES[category] || CHALLENGES.wellbeing;
  const seed = new Date().toISOString().split('T')[0];
  const idx = [...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0) % pool.length;
  return pool[idx];
}

// ─── Floating Island Mesh ─────────────────────────────────────────────────────
function GoalIsland({ goal, position, isSelected, onClick }) {
  const cfg = ISLAND_CONFIGS[goal.category] || ISLAND_CONFIGS.wellbeing;
  const progress = goal.progress || 0;
  const isComplete = progress >= 100;

  // Island scale reflects progress
  const scale = 0.5 + (progress / 100) * 0.8;
  const heightBoost = (progress / 100) * 1.5;

  return (
    <Float speed={1 + progress * 0.01} rotationIntensity={0.3} floatIntensity={1}>
      <group
        position={[position[0], position[1] + heightBoost, position[2]]}
        onClick={onClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        {/* Island base (disk) */}
        <mesh scale={[scale, scale * 0.3, scale]}>
          <cylinderGeometry args={[1, 1.4, 0.5, 8]} />
          <meshStandardMaterial
            color={cfg.baseColor}
            metalness={0.3}
            roughness={0.8}
            emissive={isSelected ? cfg.baseColor : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>

        {/* Lighthouse beacon on top */}
        <mesh position={[0, scale * 0.4 + 0.4, 0]} scale={isComplete ? 1.2 : 0.6}>
          <cylinderGeometry args={[0.05, 0.1, 0.6, 8]} />
          <meshStandardMaterial color="#ffffff" emissive={cfg.lightColor} emissiveIntensity={isComplete ? 3 : 0.5} />
        </mesh>

        {/* Light beam */}
        {(isComplete || isSelected) && (
          <>
            <pointLight position={[0, 2, 0]} color={cfg.lightColor} intensity={isComplete ? 4 : 2} distance={6} />
            <Sparkles count={isComplete ? 60 : 20} scale={2} size={isComplete ? 3 : 1.5} color={cfg.particleColor} speed={0.5} />
          </>
        )}

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <torusGeometry args={[scale * 1.2, 0.02, 8, 40]} />
            <meshBasicMaterial color={cfg.lightColor} transparent opacity={0.8} />
          </mesh>
        )}
      </group>
    </Float>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiGoals({ session }) {
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const today = new Date().toISOString().split('T')[0];

  const [goals, setGoals] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // New goal form
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('health');
  const [saving, setSaving] = useState(false);

  // Calculate island positions in a spiral
  const positions = goals.map((_, i) => {
    const angle = (i / Math.max(goals.length, 1)) * Math.PI * 2;
    const radius = 3.5 + Math.floor(i / 5) * 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  });

  const loadAll = async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: gs }, { data: cs }] = await Promise.all([
      supabase.from('sai_goals').select('*').eq('user_id', userId).eq('status', 'active').order('created_at'),
      supabase.from('sai_challenges').select('*').eq('user_id', userId).eq('date_key', today),
    ]);

    setGoals(gs || []);
    const existing = new Set((cs || []).map(c => c.goal_id));
    const missing = (gs || []).filter(g => !existing.has(g.id));

    if (missing.length > 0) {
      const newCs = missing.map(g => ({ user_id: userId, goal_id: g.id, challenge_text: generateChallenge(g.category), date_key: today, completed: false }));
      const { data: ins } = await supabase.from('sai_challenges').insert(newCs).select();
      setChallenges([...(cs || []), ...(ins || [])]);
    } else {
      setChallenges(cs || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [userId]);

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data: goal } = await supabase.from('sai_goals').insert([{
      user_id: userId, title: newTitle.trim(), category: newCat, progress: 0, status: 'active',
    }]).select().single();

    if (goal) {
      const ch = { user_id: userId, goal_id: goal.id, challenge_text: generateChallenge(goal.category), date_key: today, completed: false };
      const { data: chData } = await supabase.from('sai_challenges').insert([ch]).select().single();
      setGoals(p => [...p, goal]);
      if (chData) setChallenges(p => [...p, chData]);
    }
    setNewTitle(''); setSaving(false); setShowForm(false);
  };

  const updateProgress = async (goalId, val) => {
    const clamped = Math.max(0, Math.min(100, val));
    await supabase.from('sai_goals').update({ progress: clamped }).eq('id', goalId);
    setGoals(p => p.map(g => g.id === goalId ? { ...g, progress: clamped } : g));
    if (selected?.id === goalId) setSelected(s => ({ ...s, progress: clamped }));
  };

  const completeChallenge = async (ch) => {
    await supabase.from('sai_challenges').update({ completed: true }).eq('id', ch.id);
    setChallenges(p => p.map(c => c.id === ch.id ? { ...c, completed: true } : c));
    const goal = goals.find(g => g.id === ch.goal_id);
    if (goal) updateProgress(goal.id, (goal.progress || 0) + 10);
  };

  const deleteGoal = async (id) => {
    await supabase.from('sai_challenges').delete().eq('goal_id', id);
    await supabase.from('sai_goals').delete().eq('id', id);
    setGoals(p => p.filter(g => g.id !== id));
    setChallenges(p => p.filter(c => c.goal_id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const selectedChallenge = selected ? challenges.find(c => c.goal_id === selected.id) : null;
  const cfg = selected ? (ISLAND_CONFIGS[selected.category] || ISLAND_CONFIGS.wellbeing) : null;

  return (
    <div className="h-screen w-screen bg-[#010008] overflow-hidden relative font-sans text-white">
      
      {/* 3D Archipelago Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 8, 14], fov: 55 }}>
          <color attach="background" args={["#010008"]} />
          <fog attach="fog" args={["#010008", 15, 35]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[0, 10, 5]} intensity={0.6} color="#a78bfa" />
          <Stars radius={80} depth={60} count={3000} factor={4} saturation={1} fade />
          
          <Suspense fallback={null}>
            {goals.map((goal, i) => (
              <GoalIsland
                key={goal.id}
                goal={goal}
                position={positions[i]}
                isSelected={selected?.id === goal.id}
                onClick={(e) => { e.stopPropagation(); setSelected(goal); }}
              />
            ))}

            {/* Ocean floor mist */}
            <Sparkles count={50} scale={[20, 2, 20]} size={6} color="#1e1b4b" speed={0.1} opacity={0.3} />
          </Suspense>
        </Canvas>
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/sai')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div>
          <span className="text-sm tracking-[0.2em] font-light text-gray-300 block">ASCENT ARCHIPELAGO</span>
          <span className="text-[10px] tracking-widest uppercase text-indigo-400">{goals.length} islands in your sky</span>
        </div>
      </header>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="absolute top-6 right-6 z-50 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/15 transition-all backdrop-blur-xl"
      >
        + New Island
      </button>

      {/* Selected Goal Panel */}
      <AnimatePresence>
        {selected && !showForm && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-10 left-10 z-40 w-full max-w-sm"
          >
            <div
              className="p-6 rounded-3xl backdrop-blur-2xl border shadow-2xl"
              style={{ background: `${cfg.baseColor}08`, borderColor: `${cfg.baseColor}30` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: cfg.lightColor }}>
                    {CATEGORIES.find(c => c.key === selected.category)?.emoji} {selected.category}
                  </span>
                  <h3 className="text-base font-semibold text-white">{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Progress control */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Island Height</span><span>{selected.progress || 0}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selected.progress || 0}%` }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${cfg.baseColor}, ${cfg.lightColor})` }}
                  />
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={selected.progress || 0}
                  onChange={e => updateProgress(selected.id, Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-500"
                />
              </div>

              {/* Daily challenge */}
              {selectedChallenge && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: cfg.lightColor }}>⚡ Today's Challenge</div>
                  <p className="text-sm text-gray-200">{selectedChallenge.challenge_text}</p>
                  {!selectedChallenge.completed ? (
                    <button
                      onClick={() => completeChallenge(selectedChallenge)}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
                      style={{ background: `linear-gradient(135deg, ${cfg.baseColor}, ${cfg.lightColor})` }}
                    >
                      ✓ Complete +10%
                    </button>
                  ) : (
                    <div className="mt-3 text-xs text-emerald-400 text-center">✅ Completed today!</div>
                  )}
                </div>
              )}

              <button
                onClick={() => deleteGoal(selected.id)}
                className="text-xs text-gray-600 hover:text-rose-400 transition-colors uppercase tracking-widest"
              >
                Dissolve Island
              </button>
            </div>
          </motion.div>
        )}

        {/* New Goal Form */}
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-2xl z-50"
          >
            <h2 className="text-sm uppercase tracking-widest text-gray-300 mb-6">Create New Island</h2>
            <div className="space-y-4">
              <input
                placeholder="What do you want to achieve?"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40"
              />
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => {
                  const c = ISLAND_CONFIGS[cat.key];
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setNewCat(cat.key)}
                      className={`py-2 px-3 rounded-xl text-xs border transition-all ${newCat === cat.key ? 'text-white' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                      style={newCat === cat.key ? { borderColor: c.baseColor, background: `${c.baseColor}20`, color: c.lightColor } : {}}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5">Cancel</button>
              <button
                onClick={handleAddGoal}
                disabled={saving || !newTitle.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Building...' : '🗺 Create Island'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && goals.length === 0 && !showForm && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-4">
          <div className="text-5xl">🏝️</div>
          <p className="text-gray-500 text-sm tracking-widest text-center">The archipelago awaits your first island</p>
          <button className="pointer-events-auto px-6 py-3 rounded-full bg-white/10 border border-white/20 text-sm text-gray-300 hover:bg-white/15" onClick={() => setShowForm(true)}>
            Create First Island
          </button>
        </div>
      )}
    </div>
  );
}
