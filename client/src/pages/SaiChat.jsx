import { useState, useRef, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import StudySidebar from '../components/StudySidebar';
import QuizModal from '../components/QuizModal';

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
  
  const zPos = -(total - index - 1) * 6;
  const xPos = isAI ? -2 : 2;
  const color = isAI ? '#a855f7' : '#3b82f6';

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + index) * 0.2;
    }
  });

  return (
    <group position={[xPos, 0, zPos]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe={true} />
      </mesh>

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

// Dynamic 3D Study Nodes
function StudyNode3D({ lessonName, index, onStudy, onQuiz }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + index) * 0.15;
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[index % 2 === 0 ? -3 : 3, 2.2, -12 - index * 8]}>
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.6]} />
        <meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={0.6} wireframe />
      </mesh>
      <Html center position={[0, 1.2, 0]} className="pointer-events-auto">
        <div style={{
          background: 'rgba(15, 15, 25, 0.85)', border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '12px', padding: '10px 14px', width: '160px', backdropFilter: 'blur(10px)',
          textAlign: 'center', boxShadow: '0 4px 15px rgba(168,85,247,0.3)', color: 'white',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Lesson</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textString: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 8px 0' }}>{lessonName}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <button onClick={onStudy} style={nodeBtnStyle}>Study</button>
            <button onClick={onQuiz} style={nodeQuizBtnStyle}>Quiz</button>
          </div>
        </div>
      </Html>
    </group>
  );
}

const nodeBtnStyle = {
  background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: '8px', color: '#60a5fa', fontSize: '0.65rem', padding: '4px 10px', cursor: 'pointer', fontWeight: 600
};
const nodeQuizBtnStyle = {
  background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)',
  borderRadius: '8px', color: '#c084fc', fontSize: '0.65rem', padding: '4px 10px', cursor: 'pointer', fontWeight: 600
};

// The Tunnel Camera logic
function TunnelCamera({ messageCount }) {
  const cameraRef = useRef();
  
  useFrame((state) => {
    const targetZ = 3; 
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.05);
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
    state.camera.position.y = Math.cos(state.clock.elapsedTime * 0.2) * 0.5;
    state.camera.lookAt(0, 0, -50);
  });

  return <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 0, 5]} fov={60} />;
}

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

export default function SaiChat({ session }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription(session);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  // Study states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeQuizLesson, setActiveQuizLesson] = useState(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      const { data: msgs } = await supabase.from('messages').select('*').eq('user_id', userId).eq('source', 'sai').order('created_at', { ascending: true });
      if (msgs && msgs.length > 0) setMessages(msgs);
      else setMessages([{ id: 'initial', text: "I've been waiting for you in the Memory Tunnel. What's on your mind?", sender: 'ai' }]);
    };
    loadData();
    fetchRoadmaps();
  }, [session]);

  const fetchRoadmaps = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setRoadmaps(data);
      if (data && data.length > 0 && !activeRoadmap) {
        setActiveRoadmap(data[0]); // Load the latest active roadmap by default
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartLesson = (lessonName) => {
    setIsSidebarOpen(false);
    const text = `Let's study the lesson: "${lessonName}". Can you introduce this topic?`;
    processMessage(null, text);
  };

  const handleStartQuiz = (lessonName) => {
    setIsSidebarOpen(false);
    setActiveQuizLesson(lessonName);
  };

  const processMessage = async (e, directText = null) => {
    if (e) e.preventDefault();
    const textToSend = directText || inputText;
    if (!textToSend.trim()) return;

    if (session?.user?.user_metadata?.is_blocked) {
      alert("Your account has been blocked by the admin.");
      await supabase.auth.signOut();
      navigate('/auth');
      return;
    }

    if (session?.user?.id && !isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('sender', 'user')
        .gte('created_at', today.toISOString());

      if (!error && count >= 10) {
        alert("You have reached your daily limit of 10 messages on the Free tier. Upgrade to Premium for unlimited access.");
        navigate('/billing');
        return;
      }
    }
    
    const userMsg = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    if (session?.user?.id) {
      supabase.from('messages').insert([{ user_id: userId, text: userMsg.text, sender: 'user', source: 'sai' }]).then();
    }

    try {
      const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          emotion: detectEmotion(userMsg.text),
          companion: 'sai',
          userEmail: session?.user?.email,
          userId: userId
        })
      });
      
      if (apiRes.ok) {
        const aiData = await apiRes.json();
        const aiReply = { id: Date.now() + 1, text: aiData.text, sender: 'ai' };
        setMessages(prev => [...prev, aiReply]);
        if (session?.user?.id) {
          supabase.from('messages').insert([{ user_id: userId, text: aiReply.text, sender: 'ai', source: 'sai' }]).then();
        }
      } else {
        if (apiRes.status === 403) {
          const errData = await apiRes.json();
          alert(errData.message || "Action not allowed.");
          if (errData.blocked) {
            await supabase.auth.signOut();
            navigate('/auth');
          } else {
            navigate('/billing');
          }
        } else {
          // Fallback to local replies
          const emotion = detectEmotion(userMsg.text);
          const responsePool = SAI_RESPONSES[emotion] || SAI_RESPONSES.default;
          const aiReply = { id: Date.now() + 1, text: responsePool[0].text, sender: 'ai' };
          setMessages(prev => [...prev, aiReply]);
        }
      }
    } catch (err) {
      console.error(err);
      const emotion = detectEmotion(userMsg.text);
      const responsePool = SAI_RESPONSES[emotion] || SAI_RESPONSES.default;
      const aiReply = { id: Date.now() + 1, text: responsePool[0].text, sender: 'ai' };
      setMessages(prev => [...prev, aiReply]);
    } finally {
      setIsTyping(false);
    }
  };

  // Get active uncompleted lessons for 3D mapping
  const activeLessons = [];
  if (activeRoadmap) {
    activeRoadmap.syllabus.forEach(stage => {
      stage.lessons.forEach(lesson => {
        if (!lesson.completed) {
          activeLessons.push(lesson.name);
        }
      });
    });
  }

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

            {/* Dynamic 3D Study Nodes representing uncompleted syllabus lessons */}
            {activeLessons.slice(0, 3).map((lessonName, index) => (
              <StudyNode3D
                key={lessonName}
                lessonName={lessonName}
                index={index}
                onStudy={() => handleStartLesson(lessonName)}
                onQuiz={() => handleStartQuiz(lessonName)}
              />
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
        <header className="pointer-events-auto flex items-center w-full">
          <Link to="/sai" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-purple-300">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-light tracking-wide text-white font-serif bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-indigo-200 ml-4">
            SAI Study Portal
          </h1>

          {/* Toggle sidebar button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-purple-300">psychology</span>
          </button>
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
                SAI is analyzing curriculum <span className="animate-pulse">...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => processMessage(e)} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-[#090514]/80 border border-purple-500/30 backdrop-blur-xl rounded-full p-2 pl-6">
              <input
                type="text"
                placeholder={activeRoadmap ? `Ask SAI about: ${activeRoadmap.topic}...` : "Transmit study request..."}
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

      {/* Slide-out Study Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 460 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 460 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-[10000]"
          >
            <StudySidebar
              session={session}
              onClose={() => setIsSidebarOpen(false)}
              onStartQuiz={handleStartQuiz}
              onStartLesson={handleStartLesson}
              activeRoadmap={activeRoadmap}
              setActiveRoadmap={setActiveRoadmap}
              roadmaps={roadmaps}
              fetchRoadmaps={fetchRoadmaps}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal Overlay */}
      {activeQuizLesson && (
        <QuizModal
          session={session}
          lessonName={activeQuizLesson}
          onClose={() => {
            setActiveQuizLesson(null);
            fetchRoadmaps(); // reload completed state
          }}
        />
      )}
    </div>
  );
}
