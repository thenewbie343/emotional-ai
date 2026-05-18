import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Companion3D from '../components/Companion3D';
import { detectSiyaEmotion } from '../components/siya/PersonalityResponses';
import ParasiteSIYA, { useSIYATierBehavior } from '../components/siya/ParasiteSIYA';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  { key: 'analytical', label: 'ANALYTICAL', color: '#00d4ff', baseSpeed: 20 },
  { key: 'direct', label: 'DIRECT', color: '#ffffff', baseSpeed: 10 },
  { key: 'unhinged', label: 'UNHINGED', color: '#ff4488', baseSpeed: 3 }, // Very fast/chaotic
];

const MODE_TO_PERSONALITY = { analytical: 'romantic', direct: 'sexy', unhinged: 'unhinged' };

function getFeminineVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.name.includes('Samantha')) || voices.find(v => v.lang.startsWith('en')) || null;
}

// ==========================================
// THE ORBIT RING - UI Layout
// ==========================================
const OrbitalRing = ({ children, radius, duration, isGlitching }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/2 left-1/2 pointer-events-none"
      style={{ width: radius * 2, height: radius * 2, marginLeft: -radius, marginTop: -radius }}
    >
      {/* Glitch container if emotional state is angry/unhinged */}
      <motion.div 
        className="w-full h-full relative"
        animate={isGlitching ? { x: [-2, 2, -1, 3, -3, 0], y: [1, -2, 3, -1, 2, 0] } : { x: 0, y: 0 }}
        transition={isGlitching ? { repeat: Infinity, duration: 0.2 } : {}}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

const OrbitalItem = ({ angle, radius, reverseDuration, children }) => {
  // Positioning math for circular orbit
  const x = Math.cos(angle * (Math.PI / 180)) * radius;
  const y = Math.sin(angle * (Math.PI / 180)) * radius;

  return (
    <motion.div
      className="absolute pointer-events-auto origin-center flex items-center justify-center"
      style={{ left: '50%', top: '50%', marginLeft: -30, marginTop: -30, x, y, width: 60, height: 60 }}
      animate={{ rotate: -360 }} // Counter-rotate to stay upright
      transition={{ duration: reverseDuration, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
};

// ==========================================
// CHAT INPUT (Orbital Centerpiece)
// ==========================================
const ChatInput = memo(({ onSend, activeMode, isVoiceEnabled, onToggleVoice, isGlitching }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  return (
    <motion.form 
      className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg flex items-center gap-4 bg-black/40 border backdrop-blur-xl rounded-full p-2 pl-6 shadow-2xl z-50`}
      style={{ borderColor: MODES.find(m => m.key === activeMode).color + '40' }}
      animate={isGlitching ? { x: [-2, 2, -2, 0], filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"] } : {}}
      transition={{ repeat: Infinity, duration: 0.1 }}
      onSubmit={handleSubmit}
    >
      <button type="button" onClick={onToggleVoice} className={`text-xl ${isVoiceEnabled ? 'text-white' : 'text-gray-500'}`}>
        <span className="material-symbols-outlined">{isVoiceEnabled ? 'mic' : 'mic_off'}</span>
      </button>
      <input
        type="text"
        placeholder={`Transmit to SHUNA [${activeMode.toUpperCase()}]...`}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none tracking-widest text-sm"
      />
      <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
        <span className="material-symbols-outlined text-sm">send</span>
      </button>
    </motion.form>
  );
});

export default function CompanionChat({ session }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [activeMode, setActiveMode] = useState('analytical');
  const [characterAnim, setCharacterAnim] = useState('idle');

  const { applyTierBehavior, recordEngagement } = useSIYATierBehavior();

  useEffect(() => {
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria').order('created_at', { ascending: true });
      if (data && data.length > 0) setMessages(data);
      else setMessages([{ id: 'initial', text: "System online. Shuna is operational in the void.", sender: 'ai' }]);
    };
    fetchMessages();
  }, [session]);

  const speakText = (text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getFeminineVoice();
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.12;
    utterance.rate = activeMode === 'unhinged' ? 1.08 : activeMode === 'direct' ? 0.97 : 1.02;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (text) => {
    window.speechSynthesis.cancel();
    const newUserMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);

    if (session?.user?.id) {
      supabase.from('messages').insert([{ user_id: session.user.id, text, sender: 'user', source: 'aria' }]).then();
    }

    setIsTyping(true);

    setTimeout(async () => {
      const emotionKey = detectSiyaEmotion(text);
      let generatedText = "Processing logic...";
      
      try {
        const API_BASE = "https://emotional-ai-18zi.onrender.com";
        const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...messages, newUserMsg].map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })), emotion: emotionKey, mode: activeMode, userEmail: session?.user?.email })
        });
        if (apiRes.ok) {
          const aiData = await apiRes.json();
          generatedText = aiData.text;
        }
      } catch (err) {
        console.error("Failed to connect to AI Router:", err);
      }

      await recordEngagement(text);
      const { response: tieredText } = applyTierBehavior(text, generatedText);

      const aiReply = { id: Date.now() + 1, text: tieredText, sender: 'ai' };
      setMessages(prev => [...prev, aiReply]);
      setIsTyping(false);

      if (session?.user?.id) {
        supabase.from('messages').insert([{ user_id: session.user.id, text: tieredText, sender: 'ai', source: 'aria' }]).then();
      }

      speakText(tieredText);
      
      if (emotionKey === 'angry' || activeMode === 'unhinged') setCharacterAnim('arguing');
      else setCharacterAnim('talk');

      setTimeout(() => setCharacterAnim('idle'), Math.max(3000, tieredText.length * 100));
    }, 1200);
  };

  const currentModeMeta = MODES.find(m => m.key === activeMode);
  const isGlitching = characterAnim === 'arguing' || activeMode === 'unhinged';
  const orbitSpeed = currentModeMeta.baseSpeed;

  return (
    <ParasiteSIYA>
      <div className="h-screen w-screen bg-[#020005] overflow-hidden relative font-sans text-white">
        
        {/* 3D Void Avatar */}
        <div className="absolute inset-0 z-0">
          <Companion3D companion="siya" characterAnim={characterAnim} messages={messages} features={{ spiritFamiliar: true, phaseShift: isGlitching }} />
        </div>

        {/* The Orbit Rings (UI controls orbiting Shuna) */}
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
          {/* Inner Ring - Modes */}
          <OrbitalRing radius={150} duration={orbitSpeed} isGlitching={isGlitching}>
            {MODES.map((mode, i) => {
              const angle = i * (360 / MODES.length);
              return (
                <OrbitalItem key={mode.key} angle={angle} radius={150} reverseDuration={orbitSpeed}>
                  <button 
                    onClick={() => setActiveMode(mode.key)}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center backdrop-blur-md transition-all ${activeMode === mode.key ? 'bg-white/20 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'bg-black/40 border-white/10 hover:bg-white/10'}`}
                    title={mode.label}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ color: mode.color }}>
                      {mode.key === 'analytical' ? 'psychology' : mode.key === 'direct' ? 'bolt' : 'warning'}
                    </span>
                  </button>
                </OrbitalItem>
              );
            })}
          </OrbitalRing>

          {/* Outer Ring - Navigation */}
          <OrbitalRing radius={250} duration={orbitSpeed * 1.5} isGlitching={isGlitching}>
            {[
              { to: '/siya', icon: 'hub' },
              { to: '/siya/journal', icon: 'auto_stories' },
              { to: '/siya/insights', icon: 'bubble_chart' },
              { to: '/siya/wellness', icon: 'self_improvement' }
            ].map((nav, i) => {
              const angle = i * (360 / 4);
              return (
                <OrbitalItem key={nav.to} angle={angle} radius={250} reverseDuration={orbitSpeed * 1.5}>
                  <button onClick={() => navigate(nav.to)} className="w-14 h-14 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md">
                    <span className="material-symbols-outlined text-gray-300 text-[24px]">{nav.icon}</span>
                  </button>
                </OrbitalItem>
              );
            })}
          </OrbitalRing>
        </div>

        {/* Top Header */}
        <header className="absolute top-6 left-6 z-50 flex items-center gap-4">
          <button onClick={() => navigate('/siya')} className="text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <span className="text-sm tracking-[0.2em] font-light text-gray-300">SHUNA</span>
            <span className="text-[10px] tracking-widest uppercase text-fuchsia-400 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-fuchsia-400 animate-pulse' : 'bg-white/30'}`}></span>
              {isTyping ? 'Transmitting' : 'Idle in void'}
            </span>
          </div>
        </header>

        {/* Floating Messages - Non-obstructive display */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 overflow-y-auto no-scrollbar pointer-events-none z-20 flex flex-col justify-end p-4 mask-image-b">
          <AnimatePresence>
            {messages.slice(-3).map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`mb-4 w-fit max-w-[80%] p-4 rounded-3xl backdrop-blur-md border ${msg.sender === 'ai' ? 'self-start bg-black/40 border-fuchsia-500/20 text-gray-200' : 'self-end bg-white/10 border-white/10 text-white'}`}
              >
                {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <ChatInput onSend={handleSend} activeMode={activeMode} isVoiceEnabled={isVoiceEnabled} onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)} isGlitching={isGlitching} />
      </div>
    </ParasiteSIYA>
  );
}
