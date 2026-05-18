import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Environment, Stars, SpotLight } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

const MOODS = ["🌟 Thriving", "😊 Good", "😐 Okay", "😔 Struggling", "🌑 Dark"];
const MOOD_COLORS = ["#facc15", "#34d399", "#94a3b8", "#f97316", "#7c3aed"];

// ─── Floating Capsule Mesh ────────────────────────────────────────────────────
function CapsuleMesh({ capsule, position, isSelected, onClick }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const today = new Date().toISOString().split("T")[0];
  const isUnlocked = today >= capsule.unlock_date;
  const isOpened = capsule.opened;
  
  const daysLeft = Math.max(0, Math.ceil((new Date(capsule.unlock_date) - new Date()) / 86400000));
  const moodColor = MOOD_COLORS[capsule.mood_score ?? 2];

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      if (isSelected) meshRef.current.rotation.x += 0.003;
    }
    if (glowRef.current) {
      const pulsate = Math.sin(clock.elapsedTime * 2) * 0.1 + 0.9;
      glowRef.current.intensity = isUnlocked && !isOpened ? pulsate * 3 : 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5}>
      <group position={position} onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        {/* Capsule body */}
        <mesh ref={meshRef} scale={isSelected ? 1.4 : 1}>
          {isOpened ? (
            <boxGeometry args={[0.8, 0.6, 0.8]} />
          ) : (
            <capsuleGeometry args={[0.4, 0.6, 8, 16]} />
          )}
          <meshStandardMaterial
            color={isOpened ? "#ffffff" : moodColor}
            metalness={0.8}
            roughness={0.1}
            transparent
            opacity={isOpened ? 0.3 : isUnlocked ? 0.9 : 0.5}
            wireframe={!isUnlocked && !isOpened}
            emissive={isUnlocked && !isOpened ? moodColor : "#000000"}
            emissiveIntensity={isUnlocked && !isOpened ? 0.5 : 0}
          />
        </mesh>

        {/* Lock icon (scaled box) for locked state */}
        {!isUnlocked && (
          <mesh position={[0, 0, 0]} scale={0.2}>
            <torusGeometry args={[1, 0.3, 8, 16, Math.PI]} />
            <meshStandardMaterial color="rgba(255,255,255,0.3)" wireframe />
          </mesh>
        )}

        {/* Glow for unlocked, unopened */}
        {isUnlocked && !isOpened && (
          <>
            <pointLight ref={glowRef} color={moodColor} distance={4} intensity={3} />
            <Sparkles count={20} scale={2} size={2} color={moodColor} speed={1} />
          </>
        )}

        {/* Floating day counter */}
        {!isUnlocked && (
          <group position={[0, 1.2, 0]}>
            <mesh>
              <planeGeometry args={[1.2, 0.4]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>
    </Float>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function TimeCapsuleScene({ capsules, selectedId, onSelect }) {
  const positions = capsules.map((_, i) => {
    const angle = (i / Math.max(capsules.length, 1)) * Math.PI * 2;
    const radius = 3 + Math.floor(i / 6);
    return [Math.cos(angle) * radius, (Math.random() - 0.5) * 3, Math.sin(angle) * radius];
  });

  return (
    <Canvas camera={{ position: [0, 5, 12], fov: 55 }}>
      <color attach="background" args={["#030008"]} />
      <fog attach="fog" args={["#030008", 8, 30]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#a78bfa" />
      <Stars radius={80} depth={60} count={4000} factor={3} saturation={1} fade />
      
      <Suspense fallback={null}>
        {capsules.map((capsule, i) => (
          <CapsuleMesh
            key={capsule.id}
            capsule={capsule}
            position={positions[i]}
            isSelected={selectedId === capsule.id}
            onClick={(e) => { e.stopPropagation(); onSelect(capsule); }}
          />
        ))}

        {/* Central Vortex */}
        <group>
          <pointLight position={[0, 0, 0]} intensity={2} color="#7c3aed" distance={8} />
          <Sparkles count={100} scale={8} size={1.5} color="#7c3aed" speed={0.3} />
          <mesh>
            <torusGeometry args={[1.5, 0.02, 16, 100]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.4} />
          </mesh>
        </group>

        <Environment preset="night" />
      </Suspense>
    </Canvas>
  );
}

// ─── Seal Form Overlay ────────────────────────────────────────────────────────
function SealFormOverlay({ userId, onSealed, onClose }) {
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState(0);
  const [unlockDate, setUnlockDate] = useState("");
  const [sealing, setSealing] = useState(false);

  const minDate = new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];

  const seal = async () => {
    if (!message.trim() || !unlockDate) return;
    setSealing(true);

    const [{ data: wellness }, { data: xp }] = await Promise.all([
      supabase.from("sai_wellness").select("avg_score").eq("user_id", userId).order("date_key", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sai_xp").select("xp, level").eq("user_id", userId).maybeSingle(),
    ]);

    const snapshot = { wellness: wellness?.avg_score, level: xp?.level, xp: xp?.xp };
    const { data, error } = await supabase.from("sai_time_capsules").insert({
      user_id: userId, message, mood: MOODS[mood], mood_score: mood,
      unlock_date: unlockDate, snapshot, sealed_at: new Date().toISOString(),
    }).select().single();

    setSealing(false);
    if (!error && data) { onSealed(data); onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg p-8 rounded-3xl bg-black/60 border border-purple-500/20 backdrop-blur-2xl z-50 shadow-[0_0_60px_rgba(124,58,237,0.15)]"
    >
      <h2 className="text-lg font-light tracking-[0.2em] uppercase text-purple-300 mb-6">Seal a Time Capsule</h2>
      
      <div className="space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">Message to your future self</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Dear future me..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 resize-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">Current Mood</label>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map((m, i) => (
              <button
                key={m}
                onClick={() => setMood(i)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${mood === i ? 'border-purple-400 bg-purple-500/20 text-purple-200' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
              >{m}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">Unlock Date (min. 7 days)</label>
          <input
            type="date"
            min={minDate}
            value={unlockDate}
            onChange={e => setUnlockDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/40"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5">Cancel</button>
        <button
          onClick={seal}
          disabled={sealing || !message.trim() || !unlockDate}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {sealing ? "Sealing..." : "🔮 Seal"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiTimeCapsule({ session }) {
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const [capsules, setCapsules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const fetchCapsules = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("sai_time_capsules").select("*").eq("user_id", userId).order("sealed_at", { ascending: false });
    setCapsules(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchCapsules(); }, [fetchCapsules]);

  const handleOpen = async () => {
    if (!selected || selected.opened) return;
    const today = new Date().toISOString().split("T")[0];
    if (today < selected.unlock_date) return;

    setOpening(true);
    const { data } = await supabase.from("sai_time_capsules")
      .update({ opened: true, opened_at: new Date().toISOString() })
      .eq("id", selected.id).select().single();
    
    if (data) {
      setCapsules(c => c.map(cap => cap.id === data.id ? data : cap));
      setSelected(data);
    }
    setOpening(false);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="h-screen w-screen bg-[#030008] overflow-hidden relative font-sans text-white">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 text-sm tracking-widest animate-pulse">INITIALIZING CHRONOVAULT...</div>
          </div>
        ) : (
          <TimeCapsuleScene capsules={capsules} selectedId={selected?.id} onSelect={setSelected} />
        )}
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/sai')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div>
          <span className="text-sm tracking-[0.2em] font-light text-gray-300 block">CHRONO VAULT</span>
          <span className="text-[10px] tracking-widest uppercase text-purple-400">{capsules.length} capsules in orbit</span>
        </div>
      </header>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="absolute bottom-10 right-10 z-50 w-16 h-16 rounded-full bg-purple-600/50 border border-purple-400/50 flex items-center justify-center backdrop-blur-xl hover:bg-purple-500/50 transition-all shadow-[0_0_30px_rgba(124,58,237,0.3)]"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      )}

      {/* Selected capsule detail */}
      <AnimatePresence>
        {selected && !showForm && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-10 left-10 z-40 w-full max-w-sm p-6 rounded-3xl bg-black/50 border border-white/10 backdrop-blur-2xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-gray-400 block">
                  {selected.mood} · {new Date(selected.sealed_at).toLocaleDateString()}
                </span>
                <span className="text-xs uppercase tracking-widest text-purple-400 block mt-1">
                  {selected.opened ? 'Opened' : today >= selected.unlock_date ? 'Ready to Open' : `${Math.ceil((new Date(selected.unlock_date) - new Date()) / 86400000)} days remaining`}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {(selected.opened) && (
              <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-sm leading-relaxed text-gray-200 italic">"{selected.message}"</p>
              </div>
            )}

            {!selected.opened && today >= selected.unlock_date && (
              <button
                onClick={handleOpen}
                disabled={opening}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {opening ? "Opening..." : "💌 Open Capsule"}
              </button>
            )}
          </motion.div>
        )}

        {showForm && (
          <SealFormOverlay key="form" userId={userId} onSealed={cap => { setCapsules(c => [cap, ...c]); }} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && capsules.length === 0 && !showForm && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-3">
            <div className="text-5xl">🔮</div>
            <p className="text-gray-500 text-sm tracking-widest">The void awaits your first capsule</p>
          </div>
        </div>
      )}
    </div>
  );
}
