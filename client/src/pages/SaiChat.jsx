import { useState, useRef, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const SAI_RESPONSES = {
  greetings: [{ text: "Hey! I've been thinking about you. How's your day going?", emotion: "talk" }, { text: "Welcome back! I missed our conversations.", emotion: "laughing" }],
  happy: [{ text: "That makes me so happy to hear! Tell me more!", emotion: "laughing" }],
  sad: [{ text: "I'm here for you. It's okay to feel this way, and I'm not going anywhere.", emotion: "calm" }],
  default: [{ text: "That's really interesting. Tell me more about that.", emotion: "talk" }, { text: "I hear you. What else is on your mind?", emotion: "talk" }],
};

function detectEmotion(text) {
  const lower = text.toLowerCase();
  if (lower.match(/\b(hi|hello|hey|sup|yo)\b/)) return 'greetings';
  if (lower.match(/\b(happy|amazing|awesome|great)\b/)) return 'happy';
  if (lower.match(/\b(sad|down|crying|pain)\b/)) return 'sad';
  return 'default';
}

// 3D Message Node in the Memory Tunnel
function MessageNode({ message, index, total }) {
  const meshRef = useRef();
  const isAI = message.sender === 'ai';
  
  // Calculate Z position based on index (newest is closest to 0, older goes deep negative Z)
  const zPos = -(total - index - 1) * 6;
  const xPos = isAI ? -2 : 2; // AI on left, User on right
  const color = isAI ? '#a855f7' : '#3b82f6'; // Purple for AI, Blue for User

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + index) * 0.2;
    }
  });

  return (
    <group position={[xPos, 0, zPos]}>
      {/* Abstract Geometry Node */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe={true} />
      </mesh>

      {/* Actual Message Text rendered via HTML overlay */}
      <Html center position={[isAI ? 1.5 : -1.5, 0, 0]} className="pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: isAI ? -50 : 50, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`w-64 p-4 rounded-2xl backdrop-blur-md border ${isAI ? 'bg-purple-900/20 border-purple-500/30 text-purple-100' : 'bg-blue-900/20 border-blue-500/30 text-blue-100'}`}
        >
          <p className="text-sm font-sans tracking-wide leading-relaxed">{message.text}</p>
        </motion.div>
      </Html>
    </group>
  );
}

// The Tunnel Camera logic
function TunnelCamera({ messageCount }) {
  const cameraRef = useRef();
  
  useFrame((state) => {
    // Smoothly fly camera forward as new messages appear
    const targetZ = 3; 
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.05);
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.5; // Slight drifting
    state.camera.position.y = Math.cos(state.clock.elapsedTime * 0.2) * 0.5;
    state.camera.lookAt(0, 0, -50);
  });

  return <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 5]} fov={60} />;
}

export default function SaiChat({ session }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (!session?.user?.id) return;
    const loadData = async () => {
      const { data: msgs } = await supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'sai').order('created_at', { ascending: true });
      if (msgs && msgs.length > 0) setMessages(msgs);
      else setMessages([{ id: 'initial', text: "I've been waiting for you in the Memory Tunnel. What's on your mind?", sender: 'ai' }]);
    };
    loadData();
  }, [session]);

  const processMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const userMsg = { id: Date.now(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    if (session?.user?.id) {
      supabase.from('messages').insert([{ user_id: session.user.id, text: userMsg.text, sender: 'user', source: 'sai' }]).then();
    }

    setTimeout(() => {
      const emotion = detectEmotion(userMsg.text);
      const responsePool = SAI_RESPONSES[emotion] || SAI_RESPONSES.default;
      const aiReply = { id: Date.now() + 1, text: responsePool[0].text, sender: 'ai' };
      
      setMessages(prev => [...prev, aiReply]);
      setIsTyping(false);
      
      if (session?.user?.id) {
        supabase.from('messages').insert([{ user_id: session.user.id, text: aiReply.text, sender: 'ai', source: 'sai' }]).then();
      }
    }, 1500);
  };

  return (
    <div className="h-screen w-screen bg-[#05010a] text-white overflow-hidden relative selection:bg-purple-500/30 font-sans">
      
      {/* 3D WebGL Background - The Memory Tunnel */}
      <div className="absolute inset-0 z-0">
        <Canvas dpr={[1, 2]}>
          <TunnelCamera messageCount={messages.length} />
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={2} color="#c084fc" />
          
          <group position={[0, 0, (messages.length - 1) * 6]}>
            {messages.map((msg, i) => (
              <MessageNode key={msg.id} message={msg} index={i} total={messages.length} />
            ))}
            
            {/* Glowing Dust particles inside the tunnel */}
            <Sparkles count={500} scale={[10, 10, 100]} position={[0, 0, -20]} size={2} speed={0.5} opacity={0.3} color="#a855f7" />
          </group>

          {/* Endless Tube Geometry to represent the tunnel walls */}
          <mesh position={[0, 0, -25]}>
            <cylinderGeometry args={[8, 8, 100, 32, 1, true]} />
            <meshStandardMaterial color="#2e1065" wireframe={true} transparent opacity={0.1} />
          </mesh>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header */}
        <header className="pointer-events-auto flex items-center gap-4">
          <Link to="/sai" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-purple-300">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-light tracking-wide text-white font-serif bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-indigo-200">
            SAI Neural Link
          </h1>
        </header>

        {/* Input Area */}
        <div className="pointer-events-auto w-full max-w-3xl mx-auto mb-6 relative">
          
          <AnimatePresence>
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-10 left-6 text-sm text-purple-300/60 font-mono tracking-widest flex items-center gap-2"
              >
                SAI is materializing a response <span className="animate-pulse">...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={processMessage} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-[#090514]/80 border border-purple-500/30 backdrop-blur-xl rounded-full p-2 pl-6">
              <input
                type="text"
                placeholder="Transmit thought into the void..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-purple-300/30 focus:outline-none tracking-wide text-lg"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="w-12 h-12 rounded-full bg-purple-600/50 hover:bg-purple-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
