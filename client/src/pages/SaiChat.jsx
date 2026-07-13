import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import StudySidebar from '../components/StudySidebar';
import QuizModal from '../components/QuizModal';
import ForestPomodoro from '../components/ForestPomodoro';
import ReactMarkdown from 'react-markdown';
import './SaiChat.css';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

// ============================================
// WIDGETS
// ============================================


const HeatmapWidget = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/study/heatmap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchHeatmap();
  }, [userId]);

  if (loading) return (
    <div className="sai-widget" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 18, height: 18, border: '2px solid #7c5cfc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sai-bounce 1s linear infinite' }} />
      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>Loading activity data...</span>
    </div>
  );

  const days = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="sai-widget" style={{ maxWidth: 340 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#c084fc' }}>calendar_month</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>Activity Heatmap (28 Days)</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map(date => {
          const val = data?.[date] || 0;
          let bg = 'rgba(255,255,255,0.03)';
          if (val > 0) bg = 'rgba(168,85,247,0.2)';
          if (val >= 25) bg = 'rgba(168,85,247,0.5)';
          if (val >= 60) bg = 'rgba(168,85,247,0.8)';
          return (
            <div key={date} style={{ aspectRatio: 1, borderRadius: 3, background: bg, transition: 'all 0.2s', cursor: 'default' }} title={`${date}: ${val} mins`} />
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
        Less
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(168,85,247,0.2)' }} />
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(168,85,247,0.5)' }} />
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(168,85,247,0.8)' }} />
        More
      </div>
    </div>
  );
};

const RoadmapWidget = ({ topic, userId, onRoadmapCreated }) => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const onRoadmapCreatedRef = useRef(onRoadmapCreated);
  useEffect(() => {
    onRoadmapCreatedRef.current = onRoadmapCreated;
  }, [onRoadmapCreated]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topic }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        if (data.syllabus && typeof data.syllabus === 'string') {
          try { data.syllabus = JSON.parse(data.syllabus); } catch(e) { }
        }
        setRoadmap(data);
        if (onRoadmapCreatedRef.current) onRoadmapCreatedRef.current(data);
      }
    } catch (err) {
      setError(err.name === 'TimeoutError' ? 'Request timed out. SAI API keys may not be configured on the server.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [topic, userId]);

  useEffect(() => {
    generate();
  }, [generate]);

  if (loading) return (
    <div className="sai-widget" style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 380 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #7c5cfc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sai-bounce 1s linear infinite', flexShrink: 0 }} />
      <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>SAI is designing a curriculum for "{topic}"...</span>
    </div>
  );

  if (error || !roadmap) return (
    <div className="sai-roadmap-error">
      <div className="error-text">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
        {error || "Failed to generate roadmap."}
      </div>
      <button className="sai-retry-btn" onClick={generate}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -2 }}>refresh</span> Retry
      </button>
    </div>
  );

  const syllabus = Array.isArray(roadmap.syllabus) ? roadmap.syllabus : [];

  return (
    <div className="sai-roadmap-widget">
      <div className="sai-roadmap-header">
        <div className="icon">
          <span className="material-symbols-outlined">account_tree</span>
        </div>
        <h3 title={roadmap.topic}>{roadmap.topic} Syllabus</h3>
      </div>

      {syllabus.length > 0 ? (
        <div className="sai-roadmap-timeline">
          {syllabus.map((stage, idx) => (
            <div key={idx} className="sai-roadmap-stage">
              <div className="dot" />
              <div className="stage-title">{stage.stage}</div>
              {Array.isArray(stage.lessons) && stage.lessons.map((lesson, lIdx) => (
                <div key={lIdx} className={`sai-roadmap-lesson ${lesson.completed ? 'completed' : ''}`}>
                  {lesson.completed && <span className="material-symbols-outlined check-icon">check_circle</span>}
                  <span>{lesson.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#f87171', fontSize: '0.82rem', padding: '8px 0' }}>
          Invalid syllabus format.
          <button className="sai-retry-btn" onClick={generate} style={{ marginLeft: 10 }}>Regenerate</button>
        </div>
      )}

      <div className="sai-roadmap-footer">
        <span>Saved to Study Portal</span>
      </div>
    </div>
  );
};

// ============================================
// MAIN CHAT COMPONENT
// ============================================

export default function SaiChat({ session }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription(session);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [slowWarning, setSlowWarning] = useState(false);
  const [inputText, setInputText] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeRoadmapSyllabus, setActiveRoadmapSyllabus] = useState(null);
  const [strictness, setStrictness] = useState(50); // Default strictness

  const [roadmaps, setRoadmaps] = useState([]);
  const [activeQuizLesson, setActiveQuizLesson] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef(null);
  const slowTimerRef = useRef(null);
  const userId = session?.user?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  useEffect(() => {
    const initData = async () => {
      if (!userId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.sai_strictness) {
        setStrictness(user.user_metadata.sai_strictness);
      }
    };
    initData();
  }, [userId]);

  const handleDeleteMessage = async (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";
      await fetch(`${API_BASE}/api/study/delete-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'messages', match: { id: msgId } })
      });
    } catch (e) {
      console.error("Failed to delete message", e);
    }
  };

  const handleClearChat = async () => {
    if (!session?.user?.id) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";
      const res = await fetch(`${API_BASE}/api/study/delete-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'messages', match: { user_id: session.user.id, source: 'sai' } })
      });
      if (res.ok) {
        setMessages([]);
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
    if (!userId) return;
    const loadData = async () => {
      const { data: msgs } = await supabase.from('messages').select('*').eq('user_id', userId).eq('source', 'sai').order('created_at', { ascending: true });
      if (msgs && msgs.length > 0) {
        const parsedMsgs = msgs.map(m => {
          try {
            if (m.text.startsWith('WIDGET:')) {
              const widgetData = JSON.parse(m.text.replace('WIDGET:', ''));
              return { ...m, ...widgetData };
            }
          } catch (e) { /* ignore */ }
          return m;
        });
        setMessages(parsedMsgs);
      } else {
        setMessages([{
          id: 'initial',
          text: "Welcome to your study hub. I'm SAI — your strict, no-nonsense study coach.\n\nTry these commands:\n- **\"make a roadmap of [topic]\"** — I'll build a full curriculum\n- **\"start pomodoro\"** — launch a 25-min focus timer\n- **\"show my activity\"** — see your study heatmap\n\nOr just ask me anything. Let's get to work.",
          sender: 'ai'
        }]);
      }
    };
    loadData();
    fetchRoadmaps();
  }, [session, userId]);

  const fetchRoadmaps = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRoadmaps(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogPomodoro = async (durationMins) => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/study/session/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, durationMins })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (textToSend, skipInterceptor = false) => {
    if (!textToSend.trim()) return;

    if (session?.user?.user_metadata?.is_blocked) {
      alert("Your account has been blocked.");
      await supabase.auth.signOut();
      navigate('/auth');
      return;
    }

    if (session?.user?.id && !isPremium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('sender', 'user').gte('created_at', today.toISOString());
      if (count >= 10) {
        alert("Free limit reached. Upgrade to Premium.");
        navigate('/billing');
        return;
      }
    }

    const text = textToSend.trim();
    const lowerText = text.toLowerCase();

    const userMsg = { id: crypto.randomUUID(), text: text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);

    saveMessageToDB({ id: userMsg.id, user_id: userId, text: userMsg.text, sender: 'user', source: 'sai' }, userMsg.id);

    // WIDGET INTERCEPTORS — no setIsTyping needed here
    if (!skipInterceptor && (lowerText.includes('roadmap of') || lowerText.match(/make.*roadmap.*for/) || lowerText.match(/roadmap.*for/))) {
      let topic = 'Unknown Topic';
      const m1 = lowerText.match(/roadmap of\s+(.+)/);
      const m2 = lowerText.match(/roadmap for\s+(.+)/);
      const m3 = lowerText.match(/roadmap\s+(.+)/);
      if (m1) topic = m1[1];
      else if (m2) topic = m2[1];
      else if (m3) topic = m3[1];
      // Capitalize first letter
      topic = topic.charAt(0).toUpperCase() + topic.slice(1);

      const widgetMsg = { id: crypto.randomUUID(), type: 'roadmap', topic, sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      saveMessageToDB({ id: widgetMsg.id, user_id: userId, text: `WIDGET:${JSON.stringify({ type: 'roadmap', topic })}`, sender: 'ai', source: 'sai' }, widgetMsg.id);
      return;
    }

    if (!skipInterceptor && (lowerText.includes('pomodoro') || lowerText.includes('timer') || lowerText.includes('focus'))) {
      const widgetMsg = { id: crypto.randomUUID(), type: 'pomodoro', sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      saveMessageToDB({ id: widgetMsg.id, user_id: userId, text: `WIDGET:${JSON.stringify({ type: 'pomodoro' })}`, sender: 'ai', source: 'sai' }, widgetMsg.id);
      return;
    }

    if (!skipInterceptor && (lowerText.includes('heatmap') || lowerText.includes('less studied') || lowerText.includes('my activity') || lowerText.includes('my work') || lowerText.includes('show activity'))) {
      const widgetMsg = { id: crypto.randomUUID(), type: 'heatmap', sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      saveMessageToDB({ id: widgetMsg.id, user_id: userId, text: `WIDGET:${JSON.stringify({ type: 'heatmap' })}`, sender: 'ai', source: 'sai' }, widgetMsg.id);
      return;
    }

    // NORMAL AI RESPONSE
    setIsTyping(true);
    setSlowWarning(false);

    // Show "taking longer than usual" after 8 seconds
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 8000);

    try {
      const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter(m => !m.type).slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          emotion: 'default',
          companion: 'sai',
          strictness: strictness, // Pass strictness to backend
          userEmail: session?.user?.email,
          userId: userId
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
      });

      if (apiRes.ok) {
        const aiData = await apiRes.json();
        const aiReply = { id: crypto.randomUUID(), text: aiData.text || "I couldn't generate a response.", sender: 'ai' };
        setMessages(prev => [...prev, aiReply]);
        saveMessageToDB({ id: aiReply.id, user_id: userId, text: aiReply.text, sender: 'ai', source: 'sai' }, aiReply.id);
      } else {
        const errText = await apiRes.text().catch(() => '');
        const aiReply = { id: crypto.randomUUID(), text: `⚠️ Server error (${apiRes.status}). ${errText ? errText.slice(0, 100) : 'Please try again.'}`, sender: 'ai' };
        setMessages(prev => [...prev, aiReply]);
      }
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const aiReply = {
        id: crypto.randomUUID(),
        text: isTimeout
          ? "⏱ Request timed out — the server took too long. This usually means the AI provider is slow or SAI's API keys aren't configured on the server."
          : `Connection error: ${err.message}`,
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiReply]);
    } finally {
      clearTimeout(slowTimerRef.current);
      setIsTyping(false);
      setSlowWarning(false);
    }
  };

  const processMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    sendMessage(text);
  };

  const handleStartLesson = (lessonName) => {
    setIsSidebarOpen(false);
    const context = activeRoadmap ? ` in the context of ${activeRoadmap.topic}` : '';
    sendMessage(`I am ready to study. Please act as my expert teacher and give me a detailed, structured lesson explaining ${lessonName}${context}. Break it down clearly with examples.`, true);
  };

  const handleStartQuiz = (lessonName) => {
    setIsSidebarOpen(false);
    setActiveQuizLesson(lessonName);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="sai-chat-page">

      {/* Header */}
      <header className="sai-header">
        <div className="sai-header-left">
          <Link to="/sai" className="sai-back-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </Link>
          <div>
            <div className="sai-header-title">SAI</div>
            <div className="sai-header-status">
              <span className="sai-status-dot" />
              Study Protocol Active
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowClearConfirm(true)} className="px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_sweep</span>
            Clear Chat
          </button>
          <button className="sai-sidebar-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="Study Portal">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu_book</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="sai-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`sai-msg-row ${msg.sender} group`}>
            {msg.sender === 'ai' && (
              <div className="sai-avatar">
                <span className="material-symbols-outlined">psychology</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {msg.sender === 'user' && (
                <button 
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10"
                  title="Delete message"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              )}
              <div>
                {msg.type === 'pomodoro' ? (
                  <ForestPomodoro userId={userId} onComplete={(duration) => {
                    setMessages(prev => [...prev, { id: Date.now(), text: `Awesome! I just completed a ${duration}-minute focus session.`, sender: 'user' }]);
                  }} />
                ) : msg.type === 'roadmap' ? (
                  <RoadmapWidget topic={msg.topic} userId={userId} onRoadmapCreated={(r) => { fetchRoadmaps(); setActiveRoadmap(r); }} />
                ) : msg.type === 'heatmap' ? (
                  <HeatmapWidget userId={userId} />
                ) : (
                  <div className={`sai-bubble ${msg.sender}`}>
                    <div className="sai-prose">
                      <ReactMarkdown>{msg.text?.replace('[SWITCH_TO_SHUNA]', '') || ''}</ReactMarkdown>
                    </div>
                    {msg.text?.includes('[SWITCH_TO_SHUNA]') && (
                      <button 
                        onClick={() => navigate('/chat')}
                        className="mt-3 px-4 py-2 bg-[#f50057]/20 text-[#f50057] border border-[#f50057]/40 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-2 hover:bg-[#f50057]/30 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>favorite</span>
                        Switch to Shuna
                      </button>
                    )}
                  </div>
                )}
              </div>
              {msg.sender === 'ai' && (
                <button 
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10"
                  title="Delete message"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="sai-typing-row">
            <div className="sai-avatar">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div className="sai-typing-bubble">
              <span className="tdot" />
              <span className="tdot" />
              <span className="tdot" />
            </div>
          </div>
        )}

        {/* Slow warning */}
        {isTyping && slowWarning && (
          <div className="sai-slow-warning">Taking longer than usual — server may be waking up...</div>
        )}

        <div ref={messagesEndRef} style={{ height: 16 }} />
      </div>

      {/* Input */}
      <div className="sai-input-area">
        <form id="sai-chat-form" onSubmit={processMessage} className="sai-input-wrapper">
          <div className="sai-input-glow" />
          <div className="sai-input-inner">
            <input
              type="text"
              placeholder={activeRoadmap ? `Ask SAI about: ${activeRoadmap.topic}` : "Message SAI..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="sai-send-btn" disabled={!inputText.trim()}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 shadow-2xl border-l border-white/10 w-full max-w-sm sm:max-w-md bg-[#05010a]/95 backdrop-blur-2xl"
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

      {/* Quiz Modal */}
      {activeQuizLesson && (
        <QuizModal
          session={session}
          lessonName={activeQuizLesson}
          onClose={() => { setActiveQuizLesson(null); fetchRoadmaps(); }}
        />
      )}

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold text-white">Clear Chat History?</h3>
              <p className="text-sm text-gray-400">
                This will permanently delete your entire conversation with SAI. This action cannot be undone.
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
                  className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shadow-lg shadow-red-500/30"
                >
                  Delete All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
