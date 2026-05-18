import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshTransmissionMaterial, Sparkles, Html } from '@react-three/drei';
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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// 3D Glass Shard representing a single memory
function MemoryShard({ memory, position, isSelected, onClick }) {
  const meshRef = useRef();
  const meta = CATEGORY_META[memory.category] || { color: '#7c5cfc', emoji: '💭' };
  
  const targetScale = isSelected ? 1.5 : 1;
  const targetOpacity = isSelected ? 1 : 0.8;

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      if (!isSelected) {
        meshRef.current.rotation.x += delta * 0.2;
        meshRef.current.rotation.y += delta * 0.3;
      } else {
        // Point towards camera when selected
        meshRef.current.quaternion.slerp(state.camera.quaternion, 0.1);
      }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh 
        ref={meshRef} 
        position={position} 
        onClick={(e) => { e.stopPropagation(); onClick(memory); }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <MeshTransmissionMaterial 
          backside 
          samples={4} 
          thickness={0.5} 
          chromaticAberration={1} 
          anisotropy={0.3} 
          distortion={0.5} 
          distortionScale={0.5} 
          temporalDistortion={0.1} 
          color={meta.color}
          transparent
          opacity={targetOpacity}
        />
        {isSelected && (
          <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
            <div className="pointer-events-none w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          </Html>
        )}
      </mesh>
    </Float>
  );
}

// The Shattered Sphere layout
function MemorySphere({ memories, selectedId, onSelect }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && !selectedId) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // Distribute points on a sphere (Fibonacci sphere algorithm)
  const shardPositions = useMemo(() => {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    const radius = 4; // Sphere radius

    for (let i = 0; i < memories.length; i++) {
      const y = 1 - (i / (memories.length - 1)) * 2; // y goes from 1 to -1
      const r = Math.sqrt(1 - y * y); // radius at y
      const theta = phi * i;

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;

      points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }
    return points;
  }, [memories]);

  return (
    <group ref={groupRef}>
      {memories.map((mem, i) => (
        <MemoryShard 
          key={mem.id} 
          memory={mem} 
          position={shardPositions[i]} 
          isSelected={selectedId === mem.id}
          onClick={onSelect}
        />
      ))}
    </group>
  );
}

const springTransition = { type: "spring", stiffness: 300, damping: 25, mass: 0.8 };

export default function SaiMemories({ session }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('sai_memories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) console.error('Load memories error:', error);
      if (data) setMemories(data);
      setLoading(false);
    };
    load();
  }, [session]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    await supabase.from('sai_memories').delete().eq('id', id);
    setMemories(prev => prev.filter(m => m.id !== id));
    if (selectedMemory?.id === id) setSelectedMemory(null);
    setDeletingId(null);
  };

  const categories = ['all', ...Object.keys(CATEGORY_META)];
  const counts = memories.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  const filtered = memories.filter(m => {
    const matchSearch = search ? m.fact.toLowerCase().includes(search.toLowerCase()) || (m.tags || []).some(t => t.includes(search.toLowerCase())) : true;
    const matchFilter = activeFilter === 'all' || m.category === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="h-screen w-screen bg-[#09090b] text-white overflow-hidden relative selection:bg-purple-500/30 font-sans">
      
      {/* 3D WebGL Background - The Shattered Sphere */}
      <div className="absolute inset-0 z-0" onClick={() => setSelectedMemory(null)}>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} color="#c084fc" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
          <Suspense fallback={null}>
            <MemorySphere memories={filtered} selectedId={selectedMemory?.id} onSelect={setSelectedMemory} />
            <Sparkles count={200} scale={12} size={1} speed={0.1} opacity={0.3} color="#e879f9" />
          </Suspense>
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={3} 
            maxDistance={15} 
            autoRotate={!selectedMemory}
            autoRotateSpeed={0.5}
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* DOM UI Overlays (Framer Motion) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-10">
        
        {/* Top Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springTransition}
          className="pointer-events-auto flex justify-between items-start"
        >
          <div>
            <Link to="/sai" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg hover:bg-white/10 transition-colors mb-4 group">
              <span className="material-symbols-outlined text-[20px] text-purple-300 group-hover:-translate-x-1 transition-transform">arrow_back</span>
            </Link>
            <h1 className="text-4xl md:text-5xl font-light tracking-wide text-white mb-2 font-serif bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-indigo-200">
              The Shattered Sphere
            </h1>
            <p className="text-sm text-purple-200/60 font-medium tracking-widest uppercase flex items-center gap-2">
               <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span> Memory Vault
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-4 py-2">
            <span className="text-xl font-light text-white">{memories.length}</span>
            <span className="text-xs text-purple-200/60 uppercase tracking-wider">Fragments</span>
          </div>
        </motion.header>

        {/* Filters & Search - Bottom Bar */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={springTransition}
          className="pointer-events-auto w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between bg-black/40 border border-white/10 backdrop-blur-xl p-4 rounded-3xl shadow-2xl"
        >
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/50 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-purple-200/30 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
            {categories.map(cat => {
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all shrink-0 ${activeFilter === cat ? 'bg-purple-600/80 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400/30' : 'bg-white/5 text-purple-200/50 hover:bg-white/10 border border-transparent hover:border-white/10'}`}
                >
                  {meta ? `${meta.emoji} ${meta.label}` : '✨ All'}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Selected Memory Focus Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div 
              layoutId={`memory-${selectedMemory.id}`}
              initial={{ scale: 0.9, y: 20, rotateX: 10 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={springTransition}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#110c18]/90 border border-purple-500/20 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500"></div>
              
              <div className="flex justify-between items-start mb-6">
                <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold tracking-widest uppercase flex items-center gap-2">
                  {CATEGORY_META[selectedMemory.category]?.emoji} {CATEGORY_META[selectedMemory.category]?.label || selectedMemory.category}
                </span>
                <button 
                  onClick={() => setSelectedMemory(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
                >
                  <span className="material-symbols-outlined text-[18px] text-gray-400 hover:text-white">close</span>
                </button>
              </div>

              <h2 className="text-2xl md:text-3xl font-serif text-white leading-relaxed mb-8">
                "{selectedMemory.fact}"
              </h2>

              <div className="flex flex-wrap gap-2 mb-8">
                {selectedMemory.tags?.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-purple-200/60 font-mono">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-6">
                <span className="text-xs font-mono text-gray-500">
                  Extracted {timeAgo(selectedMemory.created_at)}
                </span>
                
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${deletingId === selectedMemory.id ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'}`}
                  onClick={() => handleDelete(selectedMemory.id)}
                  title="Shatter this memory"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {deletingId === selectedMemory.id ? 'hourglass_empty' : 'delete'}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
