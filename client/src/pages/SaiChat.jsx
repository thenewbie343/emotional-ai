import { useState, useRef, useEffect, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import { motion, AnimatePresence } from 'framer-motion';
import StudySidebar from '../components/StudySidebar';
import QuizModal from '../components/QuizModal';
import ReactMarkdown from 'react-markdown';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

// --- WIDGETS ---

const PomodoroWidget = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let interval;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isDone) {
      setIsActive(false);
      setIsDone(true);
      if (onComplete) onComplete(25);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isDone, onComplete]);

  const toggle = () => setIsActive(!isActive);
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-6 w-64 shadow-2xl flex flex-col items-center my-2">
      <div className="text-purple-300 text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">timer</span>
        Focus Session
      </div>
      <div className="text-5xl font-light text-white mb-6 font-mono tracking-wider">
        {mins}:{secs}
      </div>
      {isDone ? (
        <div className="text-green-400 text-sm font-bold bg-green-400/10 px-4 py-2 rounded-full border border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)]">Session Complete! +15 XP</div>
      ) : (
        <button onClick={toggle} className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">{isActive ? 'pause' : 'play_arrow'}</span>
          {isActive ? 'Pause' : 'Start Focus'}
        </button>
      )}
    </div>
  );
};

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
    <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-6 shadow-2xl flex items-center gap-4 my-2">
       <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
       <span className="text-purple-300 text-sm">Loading activity data...</span>
    </div>
  );

  const days = Array.from({length: 28}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-5 w-full max-w-sm shadow-2xl my-2">
      <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
        <span className="material-symbols-outlined text-purple-400 text-[18px]">calendar_month</span>
        <div className="text-gray-200 text-sm font-semibold tracking-wide">Activity Heatmap (28 Days)</div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(date => {
          const val = data?.[date] || 0;
          let color = 'bg-white/5 border-white/5';
          if (val > 0) color = 'bg-purple-900/60 border-purple-800/50';
          if (val >= 25) color = 'bg-purple-700/80 border-purple-600/50';
          if (val >= 60) color = 'bg-purple-500 border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
          return (
            <div key={date} className="flex flex-col items-center">
              <div className={`w-full aspect-square rounded-[4px] border ${color} transition-all hover:scale-110`} title={`${date}: ${val} mins`} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-gray-400">
        Less <div className="w-2.5 h-2.5 rounded-[2px] bg-white/5"></div>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-purple-900/60"></div>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-purple-700/80"></div>
        <div className="w-2.5 h-2.5 rounded-[2px] bg-purple-500"></div> More
      </div>
    </div>
  );
};

const RoadmapWidget = ({ topic, userId, onRoadmapCreated }) => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/study/roadmap/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, topic })
        });
        const data = await res.json();
        setRoadmap(data);
        if (onRoadmapCreated) onRoadmapCreated(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [topic, userId]);

  if (loading) return (
    <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-6 shadow-2xl flex items-center gap-4 my-2">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-purple-300 text-sm">SAI is designing a curriculum for "{topic}"...</span>
    </div>
  );

  if (!roadmap || roadmap.error) return (
    <div className="bg-[#1a0b2e] border border-red-500/30 rounded-2xl p-4 shadow-xl my-2">
      <span className="text-red-400 text-sm flex items-center gap-2">
        <span className="material-symbols-outlined">error</span> 
        {typeof roadmap?.error === 'string' ? roadmap.error : "Failed to generate roadmap."}
      </span>
    </div>
  );

  return (
    <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl p-5 shadow-2xl max-w-md w-full my-2">
      <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
        <span className="material-symbols-outlined text-purple-400">account_tree</span>
        <h3 className="text-white font-semibold text-lg truncate" title={roadmap.topic}>{roadmap.topic} Syllabus</h3>
      </div>
      <div className="space-y-4 max-h-64 overflow-y-auto no-scrollbar pr-2 relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-purple-500/20"></div>
        {Array.isArray(roadmap.syllabus) ? roadmap.syllabus.map((stage, idx) => (
          <div key={idx} className="relative pl-6">
            <div className="absolute left-[3px] top-1.5 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
            <h4 className="text-sm font-bold text-white mb-2">{stage.stage}</h4>
            <div className="space-y-2">
              {Array.isArray(stage.lessons) && stage.lessons.map((lesson, lIdx) => (
                <div key={lIdx} className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs flex justify-between items-center group">
                  <span className={lesson.completed ? "text-gray-500 line-through" : "text-gray-300"}>{lesson.name}</span>
                  {lesson.completed && <span className="material-symbols-outlined text-green-400 text-[14px]">check_circle</span>}
                </div>
              ))}
            </div>
          </div>
        )) : <div className="text-red-400 text-sm">Invalid syllabus format. Please generate again.</div>}
      </div>
      <div className="mt-5 pt-3 border-t border-white/5 flex justify-between items-center">
        <span className="text-[10px] text-gray-500 tracking-wider uppercase">Saved to Study Portal</span>
        <button className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-[0_0_10px_rgba(168,85,247,0.3)]">
          View Details
        </button>
      </div>
    </div>
  );
};

export default function SaiChat({ session }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription(session);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeQuizLesson, setActiveQuizLesson] = useState(null);
  
  const messagesEndRef = useRef(null);
  const userId = session?.user?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      const { data: msgs } = await supabase.from('messages').select('*').eq('user_id', userId).eq('source', 'sai').order('created_at', { ascending: true });
      if (msgs && msgs.length > 0) {
        // Parse complex messages if any
        const parsedMsgs = msgs.map(m => {
          try {
            if (m.text.startsWith('WIDGET:')) {
              const widgetData = JSON.parse(m.text.replace('WIDGET:', ''));
              return { ...m, ...widgetData };
            }
          } catch(e) {}
          return m;
        });
        setMessages(parsedMsgs);
      } else {
        setMessages([{ id: 'initial', text: "Welcome to your study hub. I'm SAI. Tell me what you want to learn, or say 'start pomodoro' to begin a focus session.", sender: 'ai' }]);
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
      setRoadmaps(data);
      if (data && data.length > 0 && !activeRoadmap) {
        setActiveRoadmap(data[0]);
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
    } catch(err) {
      console.error(err);
    }
  };

  const processMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

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

    const text = inputText;
    const lowerText = text.toLowerCase();
    setInputText('');
    
    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    supabase.from('messages').insert([{ user_id: userId, text, sender: 'user', source: 'sai' }]).then();

    // WIDGET INTERCEPTORS
    if (lowerText.includes('roadmap of') || lowerText.match(/make.*roadmap.*for/)) {
      let topic = 'Unknown Topic';
      const m1 = lowerText.match(/roadmap of\s+(.+)/);
      const m2 = lowerText.match(/roadmap for\s+(.+)/);
      if (m1) topic = m1[1];
      else if (m2) topic = m2[1];
      
      const widgetMsg = { id: Date.now() + 1, type: 'roadmap', topic, sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      supabase.from('messages').insert([{ user_id: userId, text: `WIDGET:${JSON.stringify({type:'roadmap', topic})}`, sender: 'ai', source: 'sai' }]).then();
      return;
    }
    
    if (lowerText.includes('start pomodoro') || lowerText.includes('start timer')) {
      const widgetMsg = { id: Date.now() + 1, type: 'pomodoro', sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      supabase.from('messages').insert([{ user_id: userId, text: `WIDGET:${JSON.stringify({type:'pomodoro'})}`, sender: 'ai', source: 'sai' }]).then();
      return;
    }

    if (lowerText.includes('heatmap') || lowerText.includes('less studied') || lowerText.includes('my activity') || lowerText.includes('my work')) {
      const widgetMsg = { id: Date.now() + 1, type: 'heatmap', sender: 'ai' };
      setMessages(prev => [...prev, widgetMsg]);
      supabase.from('messages').insert([{ user_id: userId, text: `WIDGET:${JSON.stringify({type:'heatmap'})}`, sender: 'ai', source: 'sai' }]).then();
      return;
    }

    // NORMAL AI RESPONSE
    setIsTyping(true);
    try {
      const apiRes = await fetch(`${API_BASE}/api/ai/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter(m => !m.type).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          emotion: 'default',
          companion: 'sai',
          userEmail: session?.user?.email,
          userId: userId
        }),
        signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined
      });
      
      if (apiRes.ok) {
        const aiData = await apiRes.json();
        const aiReply = { id: Date.now() + 1, text: aiData.text, sender: 'ai' };
        setMessages(prev => [...prev, aiReply]);
        supabase.from('messages').insert([{ user_id: userId, text: aiReply.text, sender: 'ai', source: 'sai' }]).then();
      } else {
        const aiReply = { id: Date.now() + 1, text: "I'm having trouble connecting to my logic core right now.", sender: 'ai' };
        setMessages(prev => [...prev, aiReply]);
      }
    } catch (err) {
      const aiReply = { id: Date.now() + 1, text: "Connection error.", sender: 'ai' };
      setMessages(prev => [...prev, aiReply]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartLesson = (lessonName) => {
    setIsSidebarOpen(false);
    setInputText(`Explain to me what is ${lessonName}`);
    // Delay submission slightly to allow state to settle
    setTimeout(() => {
      const form = document.getElementById("sai-chat-form");
      if(form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }, 100);
  };

  const handleStartQuiz = (lessonName) => {
    setIsSidebarOpen(false);
    setActiveQuizLesson(lessonName);
  };

  return (
    <div className="flex flex-col h-screen bg-[#05010a] text-white font-sans selection:bg-purple-500/30 overflow-hidden relative">
      
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#090514]/80 backdrop-blur-xl z-20 shadow-lg">
        <div className="flex items-center gap-4">
          <Link to="/sai" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.15)] group">
            <span className="material-symbols-outlined text-purple-300 text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300">
              SAI Intelligence
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-purple-400/80 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(168,85,247,0.8)]"></span>
              Study Protocol Active
            </span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-600/40 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          title="Open Study Portal"
        >
          <span className="material-symbols-outlined text-purple-300">menu_book</span>
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth z-10">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400/50">
                  <span className="material-symbols-outlined text-[16px] md:text-[20px] text-white">psychology</span>
                </div>
              )}
              
              <div className={`max-w-[90%] md:max-w-[75%]`}>
                {msg.type === 'pomodoro' ? (
                  <PomodoroWidget onComplete={handleLogPomodoro} />
                ) : msg.type === 'roadmap' ? (
                  <RoadmapWidget topic={msg.topic} userId={userId} onRoadmapCreated={(r) => {
                    fetchRoadmaps();
                    setActiveRoadmap(r);
                  }} />
                ) : msg.type === 'heatmap' ? (
                  <HeatmapWidget userId={userId} />
                ) : (
                  <div className={`p-4 md:p-5 rounded-2xl ${msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-purple-50 rounded-tr-sm shadow-[0_5px_20px_rgba(168,85,247,0.15)] backdrop-blur-md' 
                    : 'bg-[#150a26]/90 border border-white/10 text-gray-200 rounded-tl-sm shadow-[0_5px_20px_rgba(0,0,0,0.3)] backdrop-blur-md'}`}>
                    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/10 prose-purple max-w-none text-[14px] md:text-[15px]">
                      <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-purple-400/50">
                  <span className="material-symbols-outlined text-[16px] md:text-[20px] text-white">psychology</span>
                </div>
              <div className="bg-[#150a26]/90 border border-white/10 p-4 md:p-5 rounded-2xl rounded-tl-sm flex items-center gap-2 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce shadow-[0_0_5px_rgba(168,85,247,0.8)]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce shadow-[0_0_5px_rgba(168,85,247,0.8)]" style={{animationDelay: '0.2s'}}></span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce shadow-[0_0_5px_rgba(168,85,247,0.8)]" style={{animationDelay: '0.4s'}}></span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <div className="p-4 bg-[#090514]/90 border-t border-white/5 backdrop-blur-xl z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <form id="sai-chat-form" onSubmit={processMessage} className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center bg-[#110820] border border-purple-500/40 rounded-full p-2 pl-6 shadow-2xl">
            <input
              type="text"
              placeholder={activeRoadmap ? `Ask SAI about: ${activeRoadmap.topic} (or say 'start pomodoro')` : "Message SAI..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder:text-purple-300/40 focus:outline-none tracking-wide text-sm md:text-base font-light"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() && !isTyping}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(168,85,247,0.5)] flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar Overlay */}
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

      {/* Quiz Modal Overlay */}
      {activeQuizLesson && (
        <QuizModal
          session={session}
          lessonName={activeQuizLesson}
          onClose={() => {
            setActiveQuizLesson(null);
            fetchRoadmaps();
          }}
        />
      )}
    </div>
  );
}
