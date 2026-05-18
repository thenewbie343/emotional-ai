import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, MeshTransmissionMaterial, Sparkles, Html, SpotLight, Text } from '@react-three/drei';
import * as THREE from 'three';

const CATEGORY_META = {
  name:     { emoji: '👤', label: 'Identity',    color: '#7c5cfc' },
  age:      { emoji: '🎂', label: 'Age',         color: '#f59e0b' },
  love:     { emoji: '❤️',  label: 'Loves',       color: '#ef4444' },
  interest: { emoji: '⭐', label: 'Interests',   color: '#10b981' },
  location: { emoji: '📍', label: 'Location',    color: '#00d4ff' },
  identity: { emoji: '🌟', label: 'About You',   color: '#a855f7' },
  favorite: { emoji: '🏆', label: 'Favorites',   color: '#f97316' },
  work:     { emoji: '💼', label: 'Work',        color: '#64748b' },
};

// ==========================================
// MAGNETIC CURSOR PHYSICS EFFECT
// ==========================================
function MagneticButton({ children, className, onClick }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 }); // 0.3 is the pull strength
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ==========================================
// SCROLL-SCRUBBED TIME CONTROL & DEEP PARALLAX
// ==========================================
function CameraController({ scrollYProgress }) {
  const { camera } = useThree();
  useFrame(() => {
    // Scroll scrubs through Z-axis
    const zOffset = scrollYProgress.get() * 15; // move up to 15 units deep
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 8 - zOffset, 0.1);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ==========================================
// VOLUMETRIC GOD RAYS (Ambient Light Beams)
// ==========================================
function GodRays() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
    }
  });
  return (
    <group ref={ref}>
      <SpotLight position={[0, 10, -5]} angle={0.4} penumbra={1} intensity={3} color="#f5d0fe" castShadow distance={20} attenuation={5} />
      <SpotLight position={[-5, 5, -10]} angle={0.3} penumbra={1} intensity={2} color="#a855f7" distance={20} attenuation={5} />
    </group>
  );
}

// ==========================================
// GLASS SHARD MEMORY
// ==========================================
function MemoryShard({ memory, position, isSelected, onClick }) {
  const meshRef = useRef();
  const meta = CATEGORY_META[memory.category] || { color: '#7c5cfc', emoji: '💭' };
  
  const targetScale = isSelected ? 1.8 : 1;
  const targetOpacity = isSelected ? 1 : 0.8;

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      if (!isSelected) {
        meshRef.current.rotation.x += delta * 0.15;
        meshRef.current.rotation.y += delta * 0.25;
      } else {
        meshRef.current.quaternion.slerp(state.camera.quaternion, 0.1);
      }
    }
  });

  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={2}>
      <mesh 
        ref={meshRef} 
        position={position} 
        onClick={(e) => { e.stopPropagation(); onClick(memory); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <octahedronGeometry args={[0.5, 0]} />
        {/* Glassmorphism Refraction Shader via Drei */}
        <MeshTransmissionMaterial 
          backside 
          samples={4} 
          thickness={0.8} 
          chromaticAberration={1.5} 
          anisotropy={0.3} 
          distortion={1.0} 
          distortionScale={0.5} 
          temporalDistortion={0.2} 
          color={meta.color}
          transparent
          opacity={targetOpacity}
        />
        {isSelected && (
          <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
            <div className="pointer-events-none w-48 h-48 rounded-full bg-white/20 blur-2xl"></div>
          </Html>
        )}
      </mesh>
    </Float>
  );
}

function MemorySphere({ memories, selectedId, onSelect, scrollYProgress }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Parallax effect: rotation tied to scroll
      const baseRotation = state.clock.elapsedTime * 0.05;
      const scrollRotation = scrollYProgress.get() * Math.PI;
      groupRef.current.rotation.y = baseRotation + scrollRotation;
    }
  });

  const shardPositions = useMemo(() => {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); 
    const radius = 5; 
    for (let i = 0; i < memories.length; i++) {
      const y = 1 - (i / (memories.length - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      points.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
    }
    return points;
  }, [memories]);

  return (
    <group ref={groupRef}>
      {memories.map((mem, i) => (
        <MemoryShard key={mem.id} memory={mem} position={shardPositions[i]} isSelected={selectedId === mem.id} onClick={onSelect} />
      ))}
    </group>
  );
}

// ==========================================
// FLUID TYPOGRAPHY EFFECT
// ==========================================
const FluidText = ({ text, className }) => {
  const letters = Array.from(text);
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const child = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 12, stiffness: 200 } }
  };
  return (
    <motion.div variants={container} initial="hidden" animate="visible" className={`flex ${className}`}>
      {letters.map((char, index) => (
        <motion.span key={index} variants={child} whileHover={{ y: -10, filter: "blur(2px)", color: "#e879f9" }}>
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default function SaiMemories({ session }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState(null);
  
  // Setup Framer Motion Scroll
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const { data } = await supabase.from('sai_memories').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (data) setMemories(data);
      setLoading(false);
    };
    load();
  }, [session]);

  // Deep Parallax Y offsets for foreground/background elements
  const foregroundY = useTransform(smoothProgress, [0, 1], ["0%", "-200%"]);
  const backgroundY = useTransform(smoothProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="h-[300vh] w-screen bg-[#05010a] text-white overflow-x-hidden relative selection:bg-purple-500/30 font-sans">
      
      {/* 3D WebGL Canvas - Sticky to screen */}
      <div className="fixed inset-0 z-0" onClick={() => setSelectedMemory(null)}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.2} />
          <GodRays />
          <CameraController scrollYProgress={smoothProgress} />
          <Suspense fallback={null}>
            <MemorySphere memories={memories} selectedId={selectedMemory?.id} onSelect={setSelectedMemory} scrollYProgress={smoothProgress} />
            {/* Deep space dust */}
            <Sparkles count={500} scale={20} size={1.5} speed={0.4} opacity={0.2} color="#c084fc" />
            <Sparkles count={200} scale={10} size={2.5} speed={0.8} opacity={0.5} color="#e879f9" />
          </Suspense>
        </Canvas>
      </div>

      {/* DOM UI Overlays */}
      <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
        
        {/* Parallax Header */}
        <motion.header style={{ y: foregroundY }} className="pointer-events-auto">
          <Link to="/sai" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-white/10 transition-colors mb-6 group">
            <span className="material-symbols-outlined text-[24px] text-purple-300 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </Link>
          
          {/* Fluid Typography Header */}
          <FluidText text="The Shattered Sphere" className="text-5xl md:text-7xl font-light tracking-wider mb-2 font-serif bg-clip-text text-transparent bg-gradient-to-r from-purple-200 via-fuchsia-300 to-indigo-200" />
          
          <p className="text-sm text-purple-200/60 font-medium tracking-widest uppercase flex items-center gap-3 mt-4">
             <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.9)]"></span> 
             Scroll to explore the void
          </p>
        </motion.header>

        {/* Floating Controls with Magnetic Cursor */}
        <motion.div style={{ y: backgroundY }} className="pointer-events-auto absolute bottom-10 right-10 flex flex-col gap-4">
          <MagneticButton className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <span className="material-symbols-outlined text-purple-200 text-2xl">auto_awesome</span>
          </MagneticButton>
          <MagneticButton className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <span className="material-symbols-outlined text-indigo-200 text-2xl">scatter_plot</span>
          </MagneticButton>
        </motion.div>
      </div>

      {/* Selected Memory Focus Modal (Glassmorphism & Liquid State) */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 pointer-events-auto"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div 
              layoutId={`memory-${selectedMemory.id}`}
              initial={{ scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white/[0.02] border border-white/10 rounded-[40px] p-10 shadow-[0_30px_100px_-20px_rgba(192,38,211,0.4)] relative overflow-hidden backdrop-blur-3xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent mix-blend-overlay"></div>
              
              <h2 className="text-3xl md:text-5xl font-serif text-white leading-tight mb-10 relative z-10 drop-shadow-2xl">
                "{selectedMemory.fact}"
              </h2>

              <div className="flex justify-between items-end border-t border-white/10 pt-6 relative z-10">
                <div className="flex gap-2">
                  {selectedMemory.tags?.map(tag => (
                    <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-purple-200 font-mono tracking-wider">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <MagneticButton
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  onClick={() => {
                    supabase.from('sai_memories').delete().eq('id', selectedMemory.id).then(() => {
                      setMemories(prev => prev.filter(m => m.id !== selectedMemory.id));
                      setSelectedMemory(null);
                    });
                  }}
                >
                  <span className="material-symbols-outlined">shatter</span>
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
