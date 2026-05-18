import { useState, useEffect, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

// ─── Analysis Engine (preserved from original) ───────────────────────────────
function analyzeMessages(messages) {
  const emotions = { happy: 0, sad: 0, angry: 0, anxious: 0, love: 0, curious: 0, playful: 0, grateful: 0 };
  const keywords = {};
  const userMsgs = messages.filter(m => m.sender === 'user');

  userMsgs.forEach(msg => {
    const lower = msg.text.toLowerCase();
    if (lower.match(/\b(happy|amazing|awesome|great|excited|yay|wonderful)\b/)) emotions.happy++;
    if (lower.match(/\b(sad|depressed|down|crying|lonely|hurt|broken)\b/)) emotions.sad++;
    if (lower.match(/\b(angry|mad|furious|hate|pissed|annoyed|frustrated)\b/)) emotions.angry++;
    if (lower.match(/\b(anxious|worried|nervous|scared|afraid|panic|stress)\b/)) emotions.anxious++;
    if (lower.match(/\b(love|adore|crush|romantic|kiss|heart|darling)\b/)) emotions.love++;
    if (lower.match(/\b(why|how|what if|wonder|curious|question|meaning)\b/)) emotions.curious++;
    if (lower.match(/\b(haha|lol|lmao|funny|joke|silly|goofy)\b/)) emotions.playful++;
    if (lower.match(/\b(thank|grateful|appreciate|blessed|lucky)\b/)) emotions.grateful++;
    lower.split(/\W+/).filter(w => w.length > 4).forEach(w => {
      if (!['about', 'would', 'could', 'should', 'their', 'there', 'where', 'which', 'think', 'really'].includes(w))
        keywords[w] = (keywords[w] || 0) + 1;
    });
  });

  const dominant = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
  const topKeywords = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalEmotions = Object.values(emotions).reduce((a, b) => a + b, 0);
  const positivity = ((emotions.happy + emotions.love + emotions.playful + emotions.grateful) / Math.max(totalEmotions, 1)) * 100;
  return { emotions, dominant, topKeywords, positivity: Math.round(positivity), totalMsgs: userMsgs.length };
}

const EMOTION_COLORS = {
  happy: '#f59e0b', sad: '#5577cc', angry: '#ef4444',
  anxious: '#8b5cf6', love: '#ec4899', curious: '#00d4ff',
  playful: '#10b981', grateful: '#f97316',
};
const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  love: '❤️', curious: '🔍', playful: '😄', grateful: '🙏',
};

// ─── HarmonyHive 3D Visualization ────────────────────────────────────────────
function HexCell({ position, emotion, count, maxCount, isActive, onClick }) {
  const meshRef = useRef();
  const color = EMOTION_COLORS[emotion] || '#7c3aed';
  const intensity = count / Math.max(maxCount, 1);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.08 * intensity;
      if (isActive) {
        meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3;
      }
    }
  });

  const scale = 0.3 + intensity * 0.7;

  return (
    <Float speed={0.5} floatIntensity={0.3}>
      <group position={position} onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        {/* Hex cylinder */}
        <mesh ref={meshRef} scale={[scale, 0.3 + intensity * 0.8, scale]}>
          <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
          <meshStandardMaterial
            color={color}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={0.6 + intensity * 0.4}
            emissive={color}
            emissiveIntensity={isActive ? 0.5 : intensity * 0.2}
          />
        </mesh>

        {/* Top glow disk */}
        <mesh position={[0, (0.3 + intensity * 0.8) / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.4 + intensity * 0.4} />
        </mesh>

        {isActive && (
          <>
            <pointLight position={[0, 1, 0]} color={color} intensity={3} distance={4} />
            <Sparkles count={20} scale={1.5} size={2} color={color} speed={0.5} />
          </>
        )}
      </group>
    </Float>
  );
}

// ─── Resonance Thread connecting cells ────────────────────────────────────────
function ResonanceThread({ from, to, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.opacity = 0.15 + Math.sin(clock.elapsedTime * 2) * 0.1;
  });

  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const line = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line ref={ref} geometry={line}>
      <lineBasicMaterial color={color} transparent opacity={0.2} />
    </line>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiInsights({ session }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEmotion, setActiveEmotion] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const [{ data: msgs }, { data: mems }] = await Promise.all([
        supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria').order('created_at', { ascending: false }).limit(200),
        supabase.from('sai_memories').select('*').eq('user_id', session.user.id),
      ]);
      const finalMsgs = msgs || [];
      setMessages(finalMsgs);
      setMemories(mems || []);
      if (finalMsgs.length > 0) setAnalysis(analyzeMessages(finalMsgs));
      setLoading(false);
    };
    load();
  }, [session]);

  // Position emotions in a honeycomb pattern
  const hexPositions = analysis ? analysis.dominant.map(([emotion], i) => {
    const cols = 4;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const offset = row % 2 === 0 ? 0 : 0.6;
    return {
      emotion,
      pos: [
        (col - 1.5) * 1.3 + offset,
        0,
        (row - 1) * 1.1
      ]
    };
  }) : [];

  const maxCount = analysis ? (analysis.dominant[0]?.[1] || 1) : 1;

  const activeData = activeEmotion ? analysis?.dominant.find(([e]) => e === activeEmotion) : null;

  return (
    <div className="h-screen w-screen bg-[#020005] overflow-hidden relative font-sans text-white">

      {/* 3D HarmonyHive Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 8], fov: 55 }}>
          <color attach="background" args={['#020005']} />
          <fog attach="fog" args={['#020005', 10, 25]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={0.6} color="#a78bfa" />
          <Stars radius={80} depth={60} count={3000} factor={4} saturation={1} fade />

          <Suspense fallback={null}>
            {analysis && hexPositions.map(({ emotion, pos }, i) => {
              const [, count] = analysis.dominant[i] || [emotion, 0];
              return (
                <HexCell
                  key={emotion}
                  position={pos}
                  emotion={emotion}
                  count={count}
                  maxCount={maxCount}
                  isActive={activeEmotion === emotion}
                  onClick={(e) => { e.stopPropagation(); setActiveEmotion(activeEmotion === emotion ? null : emotion); }}
                />
              );
            })}

            {/* Resonance threads between top emotions */}
            {analysis && hexPositions.slice(0, 4).map(({ pos: from, emotion: fromE }, i) =>
              hexPositions.slice(i + 1, i + 3).map(({ pos: to, emotion: toE }) => (
                <ResonanceThread
                  key={`${fromE}-${toE}`}
                  from={from} to={to}
                  color={EMOTION_COLORS[fromE] || '#7c3aed'}
                />
              ))
            )}

            {/* Atmospheric ground mist */}
            <Sparkles count={60} scale={[10, 0.5, 10]} size={4} color="#1e1b4b" speed={0.05} opacity={0.3} />
          </Suspense>
        </Canvas>
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/siya')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div>
          <span className="text-sm tracking-[0.2em] font-light text-gray-300 block">RESONANCE</span>
          <span className="text-[10px] tracking-widest uppercase text-pink-400">The Harmony Hive</span>
        </div>
      </header>

      {/* Stats Row */}
      {analysis && (
        <div className="absolute top-6 right-6 z-50 flex gap-3">
          {[
            { label: 'Messages', val: analysis.totalMsgs },
            { label: 'Positivity', val: `${analysis.positivity}%` },
            { label: 'Memories', val: memories.length },
          ].map(s => (
            <div key={s.label} className="px-4 py-2 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-center">
              <div className="text-base font-semibold text-white">{s.val}</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active Emotion Detail */}
      <AnimatePresence>
        {activeData && (
          <motion.div
            key={activeData[0]}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-10 left-10 z-40 max-w-sm p-6 rounded-3xl backdrop-blur-2xl border"
            style={{
              background: `${EMOTION_COLORS[activeData[0]] || '#7c3aed'}08`,
              borderColor: `${EMOTION_COLORS[activeData[0]] || '#7c3aed'}30`
            }}
          >
            <div className="text-3xl mb-2">{EMOTION_EMOJI[activeData[0]]}</div>
            <h3 className="text-lg font-semibold capitalize mb-1" style={{ color: EMOTION_COLORS[activeData[0]] }}>
              {activeData[0]}
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Detected {activeData[1]} time{activeData[1] !== 1 ? 's' : ''} in your conversations
            </p>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(activeData[1] / maxCount) * 100}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full"
                style={{ background: EMOTION_COLORS[activeData[0]] }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Guide */}
      {!loading && !activeEmotion && analysis && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 text-center pointer-events-none">
          <p className="text-xs uppercase tracking-widest text-gray-600 animate-pulse">Click a hex to explore your emotions</p>
        </div>
      )}

      {/* Empty / Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <p className="text-gray-600 text-sm tracking-widest animate-pulse">SCANNING EMOTIONAL FREQUENCY...</p>
        </div>
      )}

      {!loading && !analysis && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none gap-4">
          <div className="text-4xl">🌑</div>
          <p className="text-gray-500 text-sm">Chat more to populate the Hive</p>
        </div>
      )}

      {/* Top keywords cloud */}
      {analysis && analysis.topKeywords.length > 0 && (
        <div className="absolute bottom-10 right-10 z-40 flex flex-wrap gap-2 max-w-xs justify-end">
          {analysis.topKeywords.map(([word, count], i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.4 + (count / (analysis.topKeywords[0]?.[1] || 1)) * 0.6, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300"
              style={{ fontSize: `${10 + count * 1.5}px` }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
