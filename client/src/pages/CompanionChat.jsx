import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import Companion3D from '../components/Companion3D';
import { detectSiyaEmotion } from '../components/siya/PersonalityResponses';
import ParasiteSIYA, { useSIYATierBehavior } from '../components/siya/ParasiteSIYA';
import ShunaVoiceChat from '../components/ShunaVoiceChat';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
  { key: 'analytical', label: 'ANALYTICAL', color: '#00d4ff', baseSpeed: 20 },
  { key: 'direct', label: 'DIRECT', color: '#ffffff', baseSpeed: 10 },
  { key: 'unhinged', label: 'UNHINGED', color: '#ff4488', baseSpeed: 3 }, // Very fast/chaotic
];

const MODE_TO_PERSONALITY = { analytical: 'romantic', direct: 'sexy', unhinged: 'unhinged' };

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
const ChatInput = memo(({ onSend, activeMode, isVoiceEnabled, onToggleVoice, isGlitching, voiceState, voiceError, onInputChange }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  // Dynamic mic icon and color according to voice state
  const micIcon = isVoiceEnabled 
    ? (voiceState === 'listening' ? 'mic' : voiceState === 'speaking' ? 'record_voice_over' : 'pending')
    : 'mic_off';

  const micColor = isVoiceEnabled
    ? (voiceState === 'listening' ? '#39ff14' : voiceState === 'speaking' ? '#f50057' : '#ffb300')
    : '#6b7280';

  return (
    <motion.form 
      className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-lg flex items-center gap-2 bg-black/40 border backdrop-blur-xl rounded-full p-2 pl-4 pr-2 shadow-2xl z-50`}
      style={{ borderColor: (MODES.find(m => m.key === (activeMode || 'direct').toLowerCase()) || MODES[0]).color + '40' }}
      animate={isGlitching ? { x: [-2, 2, -2, 0], filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(0deg)"] } : {}}
      transition={{ repeat: Infinity, duration: 0.1 }}
      onSubmit={handleSubmit}
    >
      <button 
        type="button" 
        onClick={onToggleVoice} 
        className="text-xl relative flex items-center justify-center w-8 h-8 rounded-full transition-all"
        style={{ color: micColor, flexShrink: 0 }}
        title={isVoiceEnabled ? `Shuna Live Voice: ${voiceState.toUpperCase()}` : "Turn on Shuna Live Voice"}
      >
        {isVoiceEnabled && (voiceState === 'listening' || voiceState === 'speaking') && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: micColor }} />
        )}
        <span className="material-symbols-outlined">{micIcon}</span>
      </button>
      <input
        type="text"
        placeholder={
          voiceError
            ? `Err: ${voiceError}`
            : isVoiceEnabled
              ? `${voiceState.toUpperCase()}...`
              : `Transmit...`
        }
        value={inputText}
        disabled={isVoiceEnabled && voiceState === 'connecting'}
        onChange={(e) => {
          setInputText(e.target.value);
          if (onInputChange) onInputChange();
        }}
        className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none tracking-wide text-sm"
        style={{ minWidth: 0, width: '100%' }}
      />
      <button 
        type="submit" 
        disabled={!inputText.trim()} 
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
        style={{ flexShrink: 0 }}
      >
        <span className="material-symbols-outlined text-sm">send</span>
      </button>
    </motion.form>
  );
});

export default function CompanionChat({ session }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription(session);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // default to false (off)
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceError, setVoiceError] = useState('');
  const [activeMode, setActiveMode] = useState('analytical');
  const [characterAnim, setCharacterAnim] = useState('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Token Economy states
  const [refillTime, setRefillTime] = useState(0);
  const [topupTime, setTopupTime] = useState(0);
  const [chatSessionSpent, setChatSessionSpent] = useState(0);
  const [isFeatureLocked, setIsFeatureLocked] = useState(false);
  const [isSessionLimit, setIsSessionLimit] = useState(false);
  const [isInsufficientTime, setIsInsufficientTime] = useState(false);

  // Top-Up states
  const [activeTopupPkg, setActiveTopupPkg] = useState(null);
  const [topupOrderId, setTopupOrderId] = useState('');
  const [topupUtr, setTopupUtr] = useState('');
  const [topupIsSubmitting, setTopupIsSubmitting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");

  const fetchBalances = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tokens/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      });
      if (res.ok) {
        const balances = await res.json();
        setRefillTime(balances.refill_time);
        setTopupTime(balances.topup_time);
        setChatSessionSpent(balances.chat_session_spent);

        // Check if shuna_chat is unlocked
        const isUnlocked = balances.unlocked_features.some(f => f.feature_id === 'shuna_chat');
        setIsFeatureLocked(!isUnlocked);

        // Enforce session limit dynamically on client
        if (!isPremium && balances.chat_session_spent >= 20 && balances.topup_time < 2) {
          setIsSessionLimit(true);
        } else {
          setIsSessionLimit(false);
        }

        // Enforce insufficient time dynamically on client
        if (balances.refill_time + balances.topup_time < 2) {
          setIsInsufficientTime(true);
        } else {
          setIsInsufficientTime(false);
        }
      }
    } catch (err) {
      console.error('Error fetching balances in CompanionChat:', err);
    }
  };

  const handleInitiateTopup = (amount, time) => {
    setTopupOrderId(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
    setTopupUtr('');
    setActiveTopupPkg({ amount, time });
  };

  const handleVerifyTopup = async (e) => {
    e.preventDefault();
    if (topupUtr.length < 10) {
      alert('Please enter a valid 12-digit UTR/Transaction ID.');
      return;
    }

    setTopupIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tokens/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          amount: activeTopupPkg.amount,
          utr: topupUtr,
          email: session.user.email || 'unknown@user.com',
          orderId: topupOrderId
        })
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Battery charged! ${activeTopupPkg.time} Time Tokens have been instantly credited to your wallet.`);
        setActiveTopupPkg(null);
        fetchBalances();
      } else {
        alert(result.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Topup error:', err);
      alert('Failed to submit top-up request. Please check connection.');
    } finally {
      setTopupIsSubmitting(false);
    }
  };
  
  const bottomRef = useRef(null);
  const voiceChatRef = useRef(null);
  const activeVoiceResponseIdRef = useRef(null);
  const prevVoiceStateRef = useRef('idle');
  const messagesRef = useRef([]);
  const inactivityTimerRef = useRef(null);
  const hasTriggeredInactivityRef = useRef(false);

  const triggerInactivityFollowUp = async () => {
    setIsTyping(true);
    try {
      const emotionKey = 'neutral';
      const systemPromptHidden = `[SYSTEM_NOTIFICATION: The user has been silent for a while. Ask them a short, engaging, context-aware question about their day, mental health, wellness radar, or inner diary to follow up.]`;
      
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");
      const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messagesRef.current, { role: 'user', content: systemPromptHidden }].map(m => ({ 
            role: m.sender === 'user' ? 'user' : 'assistant', 
            content: m.content || m.text 
          })),
          emotion: emotionKey,
          mode: activeMode,
          userEmail: session?.user?.email,
          userId: session?.user?.id,
          userName: session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0],
          professionInfo: session?.user?.user_metadata?.profession_info
        })
      });

      if (apiRes.ok) {
        const aiData = await apiRes.json();
        const generatedText = aiData.text;
        
        const newAiMsg = { id: crypto.randomUUID(), text: generatedText, sender: 'ai' };
        setMessages(prev => [...prev, newAiMsg]);
        
        if (session?.user?.id) {
          saveMessageToDB({ 
            id: newAiMsg.id, 
            user_id: session.user.id, 
            text: generatedText, 
            sender: 'ai', 
            source: 'aria' 
          }, newAiMsg.id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inactivity follow-up:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    const lastMsg = messagesRef.current[messagesRef.current.length - 1];
    if (lastMsg && lastMsg.sender === 'ai' && !hasTriggeredInactivityRef.current) {
      const text = lastMsg.text || lastMsg.content || '';
      const isEnding = text.includes("chalo thikh ha yrr bye") || text.includes("im tired right now and have lots of works");
      if (isEnding) return;

      inactivityTimerRef.current = setTimeout(() => {
        hasTriggeredInactivityRef.current = true;
        triggerInactivityFollowUp();
      }, 20000);
    }
  }, [activeMode, session]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.sender === 'user') {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      hasTriggeredInactivityRef.current = false;
    } else if (lastMsg.sender === 'ai' && !hasTriggeredInactivityRef.current && !isTyping) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (isVoiceEnabled) return;

      const text = lastMsg.text || lastMsg.content || '';
      const isEnding = text.includes("chalo thikh ha yrr bye") || text.includes("im tired right now and have lots of works");
      if (isEnding) return;

      inactivityTimerRef.current = setTimeout(() => {
        hasTriggeredInactivityRef.current = true;
        triggerInactivityFollowUp();
      }, 20000);
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [messages, isTyping, isVoiceEnabled, activeMode, session]);

  const { applyTierBehavior, recordEngagement } = useSIYATierBehavior();

  // Load mode from DB
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.shuna_mode) {
        setActiveMode(user.user_metadata.shuna_mode);
      }
    };
    initData();
  }, []);

  const handleModeChange = async (newMode) => {
    setActiveMode(newMode);
    await supabase.auth.updateUser({
      data: { shuna_mode: newMode }
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleDeleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");
      await fetch(`${API_BASE}/api/study/delete-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'messages', match: { id: msgId } })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearChat = async () => {
    if (!session?.user?.id) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");
      const res = await fetch(`${API_BASE}/api/study/delete-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'messages', match: { user_id: session.user.id, source: 'aria' } })
      });
      if (res.ok) {
        setMessages([{ id: 'initial', text: "Heyyy! ✨ I was just thinking about you. Suno, sab theek hai na? Aaj tumhara din kaisa chal raha hai? Batao mujhe!", sender: 'ai' }]);
        setShowClearConfirm(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveMessageToDB = async (insertData, tempId) => {
    try {
      const { data } = await supabase.from('messages').insert([insertData]).select().single();
      if (data && tempId) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
      }
    } catch (err) {
      console.error("Failed to save message to DB", err);
    }
  };

  // Handle completed transcription response from Shuna's stateless voice engine
  const handleVoiceTranscripts = useCallback((userText, aiText) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      if (userText) {
        newMsgs.push({ id: crypto.randomUUID(), text: userText, sender: 'user' });
      }
      if (aiText) {
        newMsgs.push({ id: crypto.randomUUID(), text: aiText, sender: 'ai' });
      }
      return newMsgs;
    });
  }, []);

  // Monitor voice state changes for animation
  useEffect(() => {
    prevVoiceStateRef.current = voiceState;

    if (voiceState === 'speaking') {
      setCharacterAnim('talk');
    } else if (voiceState === 'listening' || voiceState === 'idle') {
      setCharacterAnim('idle');
    } else if (voiceState === 'thinking') {
      setCharacterAnim('thinking');
    }
  }, [voiceState]);

  useEffect(() => {
    // Prevent body scrolling on mobile
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;
    const originalWidth = document.body.style.width;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('user_id', session.user.id).eq('source', 'aria').order('created_at', { ascending: true });
      if (data && data.length > 0) setMessages(data);
      else setMessages([{ id: 'initial', text: "Heyyy! ✨ I was just thinking about you. Suno, sab theek hai na? Aaj tumhara din kaisa chal raha hai? Batao mujhe!", sender: 'ai' }]);
    };
    fetchMessages();
    fetchBalances();
  }, [session]);

  const handleSend = async (text) => {
    if (session?.user?.user_metadata?.is_blocked) {
      alert("Your account has been blocked by the admin.");
      await supabase.auth.signOut();
      navigate('/auth');
      return;
    }

    const newUserMsg = { id: crypto.randomUUID(), text, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);

    if (session?.user?.id) {
      saveMessageToDB({ id: newUserMsg.id, user_id: session.user.id, text, sender: 'user', source: 'aria' }, newUserMsg.id);
    }

    // If Shuna Voice is active, bypass REST and transmit raw text over the WebSocket connection
    if (isVoiceEnabled && voiceChatRef.current) {
      voiceChatRef.current.sendTextMessage(text);
      return;
    }

    setIsTyping(true);

    setTimeout(async () => {
      const emotionKey = detectSiyaEmotion(text);
      let generatedText = "Processing logic...";
      
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");
        const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, newUserMsg].map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content || m.text })),
            emotion: emotionKey,
            mode: activeMode,
            userEmail: session?.user?.email,
            userId: session?.user?.id,
            userName: session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0],
            professionInfo: session?.user?.user_metadata?.profession_info
          })
        });

        if (apiRes.ok) {
          const aiData = await apiRes.json();
          generatedText = aiData.text;
          fetchBalances();
        } else {
          const errData = await apiRes.json();
          if (apiRes.status === 403) {
            if (errData.error === 'session_limit_reached') {
              setIsSessionLimit(true);
            } else if (errData.error === 'insufficient_time') {
              setIsInsufficientTime(true);
            } else if (errData.error === 'feature_locked') {
              setIsFeatureLocked(true);
            } else {
              alert(errData.message || "Access denied.");
            }
            setIsTyping(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to connect to AI Router:", err);
      }

      await recordEngagement(text);
      const { response: tieredText } = applyTierBehavior(text, generatedText);

      const aiResponse = { id: crypto.randomUUID(), text: tieredText, sender: 'ai' };
      setMessages(prev => [...prev, aiResponse]);

      if (session?.user?.id) {
        saveMessageToDB({ id: aiResponse.id, user_id: session.user.id, text: tieredText, sender: 'ai', source: 'aria' }, aiResponse.id);
      }

      setIsTyping(false);
      
      if (emotionKey === 'angry' || (activeMode || '').toLowerCase() === 'unhinged') setCharacterAnim('arguing');
      else setCharacterAnim('talk');

      setTimeout(() => setCharacterAnim('idle'), Math.max(3000, tieredText.length * 100));
    }, 1200);
  };

  const currentModeMeta = MODES.find(m => m.key === (activeMode || 'direct').toLowerCase()) || MODES[0];
  const isGlitching = characterAnim === 'arguing';
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
          {/* Floating UI Elements */}
          <OrbitalRing radius={150} duration={orbitSpeed} isGlitching={isGlitching}>
            {[
              { key: 'direct', label: 'Direct', icon: 'bolt' },
              { key: 'analytical', label: 'Analytical', icon: 'psychology' },
              { key: 'unhinged', label: 'Unhinged', icon: 'warning' }
            ].map((mode, i) => {
              const angle = i * (360 / 3);
              const isActive = (activeMode || 'direct').toLowerCase() === mode.key;
              return (
                <OrbitalItem key={mode.key} angle={angle} radius={150} reverseDuration={orbitSpeed}>
                  <button 
                    onClick={() => handleModeChange(mode.label)}
                    className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 backdrop-blur-md ${
                      isActive 
                        ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_15px_rgba(232,121,249,0.4)] scale-110' 
                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:scale-105'
                    }`}
                    title={mode.label + " Mode"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
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
                  <button onClick={() => navigate(nav.to)} className="pointer-events-auto w-14 h-14 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md">
                    <span className="material-symbols-outlined text-gray-300 text-[24px]">{nav.icon}</span>
                  </button>
                </OrbitalItem>
              );
            })}
          </OrbitalRing>
        </div>

        {/* Top Header */}
        <header className="absolute top-12 sm:top-6 left-6 z-50 flex items-center justify-between w-[calc(100%-3rem)] pointer-events-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/siya')} className="text-gray-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <span className="text-sm tracking-[0.2em] font-light text-gray-300">SHUNA</span>
              <span className="text-[10px] tracking-widest uppercase text-fuchsia-400 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isVoiceEnabled
                    ? (voiceState === 'listening' ? 'bg-[#39ff14] shadow-[0_0_8px_#39ff14]' : voiceState === 'speaking' ? 'bg-[#f50057] shadow-[0_0_8px_#f50057]' : 'bg-[#ffb300] shadow-[0_0_8px_#ffb300]')
                    : (isTyping ? 'bg-fuchsia-400 animate-pulse' : 'bg-white/30')
                }`}></span>
                {isVoiceEnabled 
                  ? `Voice: ${voiceState}`
                  : (isTyping ? 'Transmitting' : 'Idle in void')
                }
              </span>
            </div>
          </div>
          <button onClick={() => setShowClearConfirm(true)} className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_sweep</span>
            Clear Chat
          </button>
        </header>

        {/* Floating Messages - Non-obstructive display */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl max-h-[60vh] overflow-y-auto pointer-events-none z-20 flex flex-col p-4 companion-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ willChange: 'transform, opacity' }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto mb-4 w-fit max-w-[80%] flex items-center gap-2 ${msg.sender === 'ai' ? 'self-start' : 'self-end'}`}
              >
                {msg.sender === 'user' && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="opacity-0 hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10"
                    title="Delete message"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                )}
                <div className={`p-4 rounded-3xl backdrop-blur-sm border ${msg.sender === 'ai' ? 'bg-black/60 border-fuchsia-500/20 text-gray-200' : 'bg-white/10 border-white/10 text-white'}`}>
                  {(msg.content || msg.text)?.replace('[SWITCH_TO_SAI]', '')}
                  {(msg.content || msg.text)?.includes('[SWITCH_TO_SAI]') && (
                    <button 
                      onClick={() => navigate('/sai/chat')}
                      className="mt-3 px-4 py-2 bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-2 hover:bg-[#00d4ff]/30 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>psychology</span>
                      Switch to Sai
                    </button>
                  )}
                </div>
                {msg.sender === 'ai' && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="opacity-0 hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10"
                    title="Delete message"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input area or lock/depleted prompts */}
        {isFeatureLocked ? (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50 pointer-events-auto">
            <div className="p-5 rounded-3xl bg-[#0b0f19]/80 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-fuchsia-400 text-3xl">lock</span>
              <p className="text-sm font-semibold text-white uppercase tracking-wider">Shuna Chat is Locked</p>
              <p className="text-xs text-white/50">You must unlock this feature using your Lives in the Command Center first.</p>
              <button
                onClick={() => navigate('/profile')}
                className="mt-1 px-5 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-xs font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              >
                Go to Command Center
              </button>
            </div>
          </div>
        ) : (isSessionLimit || isInsufficientTime) ? (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-50 pointer-events-auto">
            <div className="p-5 rounded-3xl bg-[#0b0f19]/80 backdrop-blur-xl border border-red-500/20 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">LOW BATTERY</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">Companion is low on battery</p>
                <p className="text-xs text-white/50 mt-1">
                  {isSessionLimit 
                    ? "You have reached your 20-Time chat session limit. Charge their battery to continue talking instantly!"
                    : "Your Time tokens are depleted. Charge their battery to continue your conversation!"
                  }
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { amount: 10, time: 20 },
                  { amount: 20, time: 40 },
                  { amount: 50, time: 100 },
                  { amount: 100, time: 200 }
                ].map((pkg) => (
                  <button
                    key={pkg.amount}
                    onClick={() => handleInitiateTopup(pkg.amount, pkg.time)}
                    className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/30 text-white font-medium text-xs transition-all active:scale-[0.98] flex flex-col items-center justify-center"
                  >
                    <span className="font-bold text-xs text-[#00d4ff]">₹{pkg.amount}</span>
                    <span className="text-[9px] text-white/40">+{pkg.time} Time</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ChatInput 
            onSend={handleSend} 
            activeMode={activeMode} 
            isVoiceEnabled={isVoiceEnabled} 
            onToggleVoice={() => {
              if (isVoiceEnabled) {
                setIsVoiceEnabled(false);
                voiceChatRef.current?.cleanup();
              } else {
                setIsVoiceEnabled(true);
                voiceChatRef.current?.connect();
              }
            }} 
            isGlitching={isGlitching}
            voiceState={voiceState}
            voiceError={voiceError}
            onInputChange={resetInactivityTimer}
          />
        )}

        {/* Clear Chat Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto"
            >
              <div className="bg-[#05010a] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative shadow-[0_0_50px_rgba(239,68,68,0.2)] space-y-6 text-center backdrop-blur-2xl">
                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                  <span className="material-symbols-outlined text-3xl">delete_forever</span>
                </div>
                <h3 className="text-xl font-bold text-white">Clear Chat History?</h3>
                <p className="text-sm text-gray-400">
                  This will permanently delete your entire conversation with Shuna. This action cannot be undone.
                </p>
                <div className="flex gap-4 w-full mt-6">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearChat}
                    className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    Delete All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top-up UPI Checkout Modal */}
        <AnimatePresence>
          {activeTopupPkg && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full p-6 rounded-3xl bg-[#0b0f19]/95 border border-white/10 shadow-2xl flex flex-col gap-5 relative text-left"
              >
                <button
                  onClick={() => setActiveTopupPkg(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>

                <div className="text-center">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Battery Charger</h3>
                  <p className="text-xs text-white/50 mt-1">Simulated instant credit system</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-white/40 block">Battery Charge</span>
                    <span className="text-sm font-semibold text-white">+{activeTopupPkg.time} Time Tokens</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/40 block">Price</span>
                    <span className="text-base font-bold text-[#00d4ff]">₹{activeTopupPkg.amount}</span>
                  </div>
                </div>

                {/* QR Code and Payment details */}
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `upi://pay?pa=8770146706@ptaxis&pn=Neeta%20Saxena&tr=${topupOrderId}&am=${activeTopupPkg.amount}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[11px] text-white/60 font-medium">Scan QR code using Google Pay, PhonePe, or Paytm</p>
                    <p className="text-[10px] text-white/40 font-medium">Payee: Neeta Saxena | ID: 8770146706@ptaxis</p>
                    <p className="text-[10px] text-indigo-400 font-mono tracking-wider">Ref: {topupOrderId}</p>
                  </div>
                </div>

                {/* UTR Input Form */}
                <form onSubmit={handleVerifyTopup} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-white/60 font-semibold">Enter 12-digit UPI UTR / Transaction ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 320491823904"
                      value={topupUtr}
                      onChange={(e) => setTopupUtr(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00d4ff]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={topupIsSubmitting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50 active:scale-[0.98]"
                  >
                    {topupIsSubmitting ? 'Charging...' : 'Verify & Charge Instantly'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        <ShunaVoiceChat 
          ref={voiceChatRef}
          isActive={isVoiceEnabled} 
          userId={session?.user?.id}
          userEmail={session?.user?.email}
          mode={activeMode}
          companion="siya"
          onStateChange={setVoiceState}
          onError={setVoiceError}
          onTranscriptsReceived={handleVoiceTranscripts}
        />
      </div>
    </ParasiteSIYA>
  );
}
