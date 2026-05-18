import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, MeshDistortMaterial, Float, Sparkles } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

// Local analysis helper
function localAnalyzeDream(dreamText) {
  const text = dreamText.toLowerCase();
  
  const darkScore = ['dark', 'shadow', 'death', 'fear', 'nightmare'].filter(w => text.includes(w)).length;
  const joyScore = ['happy', 'sun', 'bright', 'joy', 'love'].filter(w => text.includes(w)).length;
  const waterScore = ['water', 'ocean', 'rain', 'swim', 'river'].filter(w => text.includes(w)).length;
  const skyScore = ['fly', 'cloud', 'sky', 'star', 'space'].filter(w => text.includes(w)).length;
  
  const maxScore = Math.max(darkScore, joyScore, waterScore, skyScore);
  
  if (darkScore === maxScore && darkScore > 0) return { mood: 'dark', color: '#7c3aed', distort: 0.8, speed: 4 };
  if (joyScore === maxScore && joyScore > 0) return { mood: 'joyful', color: '#fbbf24', distort: 0.3, speed: 1.5 };
  if (waterScore === maxScore && waterScore > 0) return { mood: 'peaceful', color: '#0ea5e9', distort: 0.5, speed: 2 };
  if (skyScore === maxScore && skyScore > 0) return { mood: 'ethereal', color: '#a78bfa', distort: 0.2, speed: 1 };
  
  return { mood: 'mysterious', color: '#ff4488', distort: 0.4, speed: 2 };
}

// ─── Individual Liquid Sphere ────────────────────────────────────────────────
function DreamSphere({ dream, position, index, onHover, onClick, isSelected }) {
  const meshRef = useRef();
  const analysis = useMemo(() => localAnalyzeDream(dream.dream_text || dream.dream_content || ""), [dream]);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <Float speed={analysis.speed} rotationIntensity={1} floatIntensity={2}>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick(dream, position);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(dream);
        }}
        onPointerOut={(e) => {
          document.body.style.cursor = 'auto';
          onHover(null);
        }}
        scale={isSelected ? 1.5 : 1}
      >
        <sphereGeometry args={[isSelected ? 1.5 : 1, 64, 64]} />
        <MeshDistortMaterial 
          color={analysis.color} 
          envMapIntensity={1} 
          clearcoat={1} 
          clearcoatRoughness={0.1} 
          metalness={0.8} 
          roughness={0.2} 
          distort={analysis.distort} 
          speed={analysis.speed}
          transparent
          opacity={isSelected ? 0.9 : 0.7}
        />
        {isSelected && (
          <Sparkles count={50} scale={3} size={2} color={analysis.color} speed={0.4} />
        )}
      </mesh>
    </Float>
  );
}

// ─── Camera Controller ───────────────────────────────────────────────────────
function CameraController({ targetPosition }) {
  const { camera } = useThree();
  useFrame(() => {
    if (targetPosition) {
      camera.position.lerp(new THREE.Vector3(targetPosition[0], targetPosition[1] + 2, targetPosition[2] + 8), 0.05);
      camera.lookAt(targetPosition[0], targetPosition[1], targetPosition[2]);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 5, 20), 0.02);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SaiDreams({ session }) {
  const navigate = useNavigate();
  const userId = session?.user?.id;
  const [dreams, setDreams] = useState([]);
  const [hoveredDream, setHoveredDream] = useState(null);
  const [selectedDream, setSelectedDream] = useState(null);
  const [targetPos, setTargetPos] = useState(null);
  const [showInput, setShowInput] = useState(false);
  const [newDream, setNewDream] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("sai_dreams").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => {
        if (data) setDreams(data);
      });
  }, [userId]);

  // Generate random positions in a nebula cloud
  const positions = useMemo(() => {
    return dreams.map((_, i) => [
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 30
    ]);
  }, [dreams]);

  // Play distorted audio whisper
  useEffect(() => {
    if (hoveredDream && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = hoveredDream.dream_text || hoveredDream.dream_content || "A forgotten dream";
      const utterance = new SpeechSynthesisUtterance(text.substring(0, 50) + "...");
      utterance.pitch = 0.3; // Very low pitch for distorted whisper
      utterance.rate = 0.7; // Slow
      utterance.volume = 0.3; // Quiet
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
  }, [hoveredDream]);

  const handleSaveDream = async () => {
    if (!newDream.trim() || !userId) return;
    setSaving(true);
    const { data } = await supabase.from("sai_dreams")
      .insert({ user_id: userId, dream_text: newDream.trim() })
      .select().single();
    
    if (data) {
      setDreams(d => [data, ...d]);
      setNewDream("");
      setShowInput(false);
    }
    setSaving(false);
  };

  return (
    <div className="h-screen w-screen bg-[#020005] overflow-hidden relative font-sans text-white">
      
      {/* 3D Nebula Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: true, alpha: false }} dpr={[1, 1.5]}>
          <color attach="background" args={["#020005"]} />
          <fog attach="fog" args={["#020005", 10, 50]} />
          
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 10]} intensity={1} color="#a78bfa" />
          <pointLight position={[-10, -10, -10]} intensity={2} color="#0ea5e9" />

          <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
          
          <Suspense fallback={null}>
            {dreams.map((dream, i) => (
              <DreamSphere 
                key={dream.id} 
                dream={dream} 
                position={positions[i]} 
                index={i}
                isSelected={selectedDream?.id === dream.id}
                onHover={setHoveredDream}
                onClick={(d, p) => { setSelectedDream(d); setTargetPos(p); }}
              />
            ))}
          </Suspense>

          <CameraController targetPosition={targetPos} />
          
          {/* Fallback controls if no dream is clicked */}
          {!selectedDream && (
            <OrbitControls 
              enableZoom={true} 
              enablePan={true} 
              autoRotate 
              autoRotateSpeed={0.5} 
              maxDistance={50} 
            />
          )}
        </Canvas>
      </div>

      {/* Header */}
      <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
        <button onClick={() => navigate('/sai')} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <div className="flex flex-col">
          <span className="text-sm tracking-[0.2em] font-light text-gray-300">DREAM VAULT</span>
          <span className="text-[10px] tracking-widest uppercase text-indigo-400">The Nebula</span>
        </div>
      </header>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowInput(!showInput)}
        className="absolute bottom-10 right-10 z-50 w-16 h-16 rounded-full bg-indigo-600/50 border border-indigo-400/50 flex items-center justify-center backdrop-blur-xl hover:bg-indigo-500/50 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
      >
        <span className="material-symbols-outlined">{showInput ? 'close' : 'add'}</span>
      </button>

      {/* Input Overlay */}
      <AnimatePresence>
        {showInput && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="absolute bottom-32 right-10 z-50 w-[400px] p-6 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-2xl shadow-2xl"
          >
            <h3 className="text-sm font-semibold tracking-widest uppercase text-indigo-300 mb-4">Log a New Dream</h3>
            <textarea
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-indigo-500/50 resize-none placeholder:text-gray-600"
              placeholder="I was falling through a sky of glass..."
              value={newDream}
              onChange={(e) => setNewDream(e.target.value)}
            />
            <button 
              onClick={handleSaveDream}
              disabled={saving || !newDream.trim()}
              className="w-full mt-4 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Manifesting...' : 'Solidify Dream'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover & Selection Info Overlay */}
      <AnimatePresence>
        {(hoveredDream || selectedDream) && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-10 left-10 z-40 max-w-md"
          >
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl">
              <div className="text-xs tracking-widest text-indigo-400 mb-2 uppercase">
                {new Date((selectedDream || hoveredDream).created_at).toLocaleDateString()}
              </div>
              <p className="text-sm leading-relaxed text-gray-200">
                {(selectedDream || hoveredDream).dream_text || (selectedDream || hoveredDream).dream_content}
              </p>
              
              {selectedDream && (
                <button 
                  onClick={() => { setSelectedDream(null); setTargetPos(null); }}
                  className="mt-6 text-xs uppercase tracking-widest text-gray-400 hover:text-white border-b border-transparent hover:border-white pb-1 transition-all"
                >
                  Return to Nebula
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crosshair / Center Reticle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
        <div className="w-12 h-12 border border-white/50 rounded-full" />
        <div className="w-1 h-1 bg-white rounded-full absolute" />
      </div>

    </div>
  );
}
