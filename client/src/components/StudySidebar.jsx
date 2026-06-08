import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CURATED_TEMPLATES = {
  Physics: [
    {
      stage: "1. Classical Mechanics",
      lessons: [{ name: "Newton's Laws of Motion", completed: false }, { name: "Work, Energy & Power", completed: false }, { name: "Rotational Dynamics", completed: false }]
    },
    {
      stage: "2. Electromagnetism",
      lessons: [{ name: "Electrostatics & Gauss's Law", completed: false }, { name: "Electric Circuits", completed: false }, { name: "Magnetic Fields & Induction", completed: false }]
    },
    {
      stage: "3. Modern Physics",
      lessons: [{ name: "Wave-Particle Duality", completed: false }, { name: "Schrodinger Equation & Quantum States", completed: false }]
    }
  ],
  Chemistry: [
    {
      stage: "1. Atomic Structure & Bonding",
      lessons: [{ name: "Periodic Trends & Orbitals", completed: false }, { name: "Chemical Bonding & VSEPR", completed: false }]
    },
    {
      stage: "2. Organic Chemistry",
      lessons: [{ name: "Hydrocarbons & Nomenclature", completed: false }, { name: "Functional Groups & Spectroscopy", completed: false }, { name: "Reaction Mechanisms", completed: false }]
    },
    {
      stage: "3. Physical Chemistry",
      lessons: [{ name: "Gibbs Free Energy & Entropy", completed: false }, { name: "Chemical Equilibrium & Kinetics", completed: false }]
    }
  ],
  "Web Development": [
    {
      stage: "1. Frontend Foundations",
      lessons: [{ name: "Semantic HTML & CSS Layouts", completed: false }, { name: "JavaScript ES6+ Fundamentals", completed: false }]
    },
    {
      stage: "2. React Application Design",
      lessons: [{ name: "Components, Props & State", completed: false }, { name: "React Hooks (State & Effects)", completed: false }]
    },
    {
      stage: "3. Backend & Data Layer",
      lessons: [{ name: "Node.js & Express APIs", completed: false }, { name: "SQL & Supabase Integration", completed: false }]
    }
  ],
  Calculus: [
    {
      stage: "1. Limits & Continuity",
      lessons: [{ name: "Concept of Limits & Infinity", completed: false }, { name: "Limits & Continuity Theorems", completed: false }]
    },
    {
      stage: "2. Derivatives",
      lessons: [{ name: "Rules of Differentiation", completed: false }, { name: "Optimization & Rate of Change", completed: false }]
    },
    {
      stage: "3. Integrals",
      lessons: [{ name: "Fundamental Theorem of Calculus", completed: false }, { name: "Integration by Parts & Substitution", completed: false }]
    }
  ]
};

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

export default function StudySidebar({ session, onClose, onStartQuiz, onStartLesson, activeRoadmap, setActiveRoadmap, roadmaps, fetchRoadmaps }) {
  const [activeTab, setActiveTab] = useState('roadmaps'); // 'roadmaps', 'tasks', 'progress'
  const [customTopic, setCustomTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  
  // Pomodoro state
  const [selectedTask, setSelectedTask] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const timerRef = useRef(null);

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState({});

  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      fetchTasks();
      fetchHeatmapData();
    }
  }, [userId]);

  // Handle Pomodoro ticking
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            handlePomodoroComplete();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const handlePomodoroComplete = async () => {
    alert("🔥 Pomodoro session completed! 15 XP earned.");
    try {
      await fetch(`${API_BASE}/api/study/logs/log-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskName: selectedTask || "General Study", durationMins: 25 })
      });
      fetchTasks();
      fetchHeatmapData();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/study/tasks/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    try {
      await fetch(`${API_BASE}/api/study/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskName: newTaskText.trim() })
      });
      setNewTaskText('');
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (taskId, completed) => {
    try {
      await fetch(`${API_BASE}/api/study/tasks/toggle-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId, completed })
      });
      fetchTasks();
      if (completed) {
        alert("✨ Task completed! 15 XP earned.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/study/logs/heatmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setHeatmapData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadCurated = async (topic) => {
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topic, syllabus: CURATED_TEMPLATES[topic] })
      });
      const data = await res.json();
      setActiveRoadmap(data);
      fetchRoadmaps();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateCustom = async (e) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, topic: customTopic.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRoadmap(data);
        fetchRoadmaps();
        setCustomTopic('');
      } else {
        alert("Failed to generate custom syllabus.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleLesson = async (stageIndex, lessonIndex, completed) => {
    if (!activeRoadmap) return;
    try {
      const res = await fetch(`${API_BASE}/api/study/roadmap/update-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roadmapId: activeRoadmap.id,
          stageIndex,
          lessonIndex,
          completed
        })
      });
      const data = await res.json();
      if (data && !data.error) {
        setActiveRoadmap(data);
      }
      fetchRoadmaps();
      if (completed) {
        alert("📚 Lesson completed! 20 XP earned.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render contribution heatmap blocks (past 12 weeks)
  const renderHeatmap = () => {
    const blocks = [];
    const today = new Date();
    
    // Generate dates for the past 90 days
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const mins = heatmapData[dateString] || 0;
      
      // Select HSL color intensity based on study minutes
      let bg = 'rgba(255,255,255,0.03)';
      if (mins > 0 && mins <= 15) bg = 'rgba(168, 85, 247, 0.15)'; // light purple
      else if (mins > 15 && mins <= 30) bg = 'rgba(168, 85, 247, 0.4)'; // medium purple
      else if (mins > 30 && mins <= 50) bg = 'rgba(168, 85, 247, 0.7)'; // solid purple
      else if (mins > 50) bg = '#c084fc'; // glowing purple
      
      blocks.push(
        <div
          key={dateString}
          className="w-3.5 h-3.5 rounded-[3px] transition-colors relative group"
          style={{ background: bg }}
          title={`${date.toLocaleDateString()}: ${mins} mins focused`}
        />
      );
    }
    return blocks;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '460px',
      background: 'rgba(10, 10, 18, 0.88)', borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 10000, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', color: 'white', fontFamily: 'Inter, sans-serif'
    }}>
      {/* Sidebar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined text-purple-400 text-[26px]">psychology</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '1px', color: '#f3e8ff' }}>Cognitive Assistant</span>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['roadmaps', 'tasks', 'progress'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
              color: activeTab === tab ? '#c084fc' : 'rgba(255,255,255,0.4)',
              fontWeight: 600, borderBottom: activeTab === tab ? '2px solid #c084fc' : 'none',
              cursor: 'pointer', textTransform: 'capitalize', fontSize: '0.85rem', letterSpacing: '0.5px'
            }}
          >
            {tab === 'progress' ? 'Heatmap' : tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }} className="no-scrollbar">
        <AnimatePresence mode="wait">
          {/* TAB 1: ROADMAPS */}
          {activeTab === 'roadmaps' && (
            <motion.div key="roadmaps" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeRoadmap ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#c084fc' }}>{activeRoadmap.topic}</h3>
                    <button 
                      onClick={() => setActiveRoadmap(null)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem', color: 'white', cursor: 'pointer' }}
                    >
                      Back to Presets
                    </button>
                  </div>

                  {/* Syllabus Tree */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', borderLeft: '1px solid rgba(168,85,247,0.2)', marginLeft: 10, paddingLeft: 20 }}>
                    {Array.isArray(activeRoadmap.syllabus) ? activeRoadmap.syllabus.map((stage, sIdx) => (
                      <div key={sIdx} style={{ position: 'relative' }}>
                        {/* Dot indicator */}
                        <div style={{ position: 'absolute', left: -26, top: 4, width: 11, height: 11, borderRadius: '50%', background: '#a855f7', border: '2px solid #0a0a12' }} />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f3e8ff', marginBottom: 10 }}>{stage.stage}</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {Array.isArray(stage.lessons) && stage.lessons.map((lesson, lIdx) => (
                            <div key={lIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input 
                                  type="checkbox" 
                                  checked={lesson.completed || false}
                                  onChange={(e) => handleToggleLesson(sIdx, lIdx, e.target.checked)}
                                  style={{ cursor: 'pointer', accentColor: '#a855f7' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: lesson.completed ? 'rgba(255,255,255,0.4)' : '#e2e8f0', textDecoration: lesson.completed ? 'line-through' : 'none' }}>
                                  {lesson.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => onStartLesson(lesson.name)}
                                  className="material-symbols-outlined text-[18px] text-blue-400 hover:scale-110 transition-transform"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  title="Study Lesson in Chat"
                                >
                                  school
                                </button>
                                <button
                                  onClick={() => onStartQuiz(lesson.name)}
                                  className="material-symbols-outlined text-[18px] text-purple-400 hover:scale-110 transition-transform"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                  title="Take Hybrid Quiz"
                                >
                                  quiz
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>Invalid roadmap data format. Please generate a new one.</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Curated Templates Preset Grid */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Curated Presets</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {Object.keys(CURATED_TEMPLATES).map(topic => (
                        <div
                          key={topic}
                          onClick={() => handleLoadCurated(topic)}
                          style={{
                            background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.15)',
                            borderRadius: '16px', padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          className="hover:scale-105 hover:bg-purple-900/10"
                        >
                          <span style={{ fontSize: '1.8rem' }}>
                            {topic === 'Physics' ? '⚛️' : topic === 'Chemistry' ? '🧪' : topic === 'Calculus' ? '🧮' : '💻'}
                          </span>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 8 }}>{topic}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Custom Generation Input */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Custom Learning Roadmap</h4>
                    <form onSubmit={handleGenerateCustom} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input 
                        type="text"
                        placeholder="What do you want to learn? (e.g. React Hooks)"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        disabled={generating}
                        style={{
                          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                          padding: '12px 16px', borderRadius: '12px', color: 'white', fontSize: '0.85rem', outline: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={generating || !customTopic.trim()}
                        style={{
                          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                          border: 'none', padding: '12px', borderRadius: '12px', color: 'white',
                          fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'opacity 0.2s'
                        }}
                      >
                        {generating ? "AI is generating roadmap..." : "Generate Roadmap"}
                      </button>
                    </form>
                  </div>

                  {/* Active Roadmaps List */}
                  {roadmaps.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Your Saved Roadmaps</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {roadmaps.map(rm => (
                          <div
                            key={rm.id}
                            onClick={() => setActiveRoadmap(rm)}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                              padding: '12px 16px', borderRadius: '14px', cursor: 'pointer'
                            }}
                            className="hover:bg-white/5"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{rm.topic}</span>
                            <span className="material-symbols-outlined text-purple-400 text-sm">arrow_forward_ios</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: TASKS & FOCUS TIMER */}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Pomodoro Timer Card */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.12)',
                borderRadius: '24px', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>
                  Focus Timer (Pomodoro)
                </div>
                
                {/* Visual Circle Timer */}
                <div style={{
                  width: '160px', height: '160px', borderRadius: '50%', border: '3px solid rgba(168, 85, 247, 0.2)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                  background: 'rgba(0,0,0,0.2)', marginBottom: 20, boxShadow: '0 0 20px rgba(168,85,247,0.1)'
                }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#c084fc', fontMono: true }}>
                    {formatTime(timeLeft)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {isTimerRunning ? 'Studying...' : 'Paused'}
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    style={{
                      background: isTimerRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                      border: `1px solid ${isTimerRunning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                      borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justify: 'center',
                      color: isTimerRunning ? '#ef4444' : '#c084fc', cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined mx-auto">{isTimerRunning ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button
                    onClick={() => { setIsTimerRunning(false); setTimeLeft(25 * 60); }}
                    style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justify: 'center',
                      color: 'white', cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined mx-auto">refresh</span>
                  </button>
                </div>

                {/* Select Task for Focus */}
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Focusing on Task:</label>
                  <select
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', padding: '10px', color: 'white', outline: 'none', fontSize: '0.8rem'
                    }}
                  >
                    <option value="">General Session</option>
                    {Array.isArray(tasks) && tasks.filter(t => !t.completed).map(task => (
                      <option key={task.id} value={task.task_name}>{task.task_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Checklist */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Study Checklist</h4>
                
                {/* Task Add Form */}
                <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="New study task..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    style={{
                      flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                      padding: '10px 14px', borderRadius: '10px', color: 'white', fontSize: '0.8rem', outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newTaskText.trim()}
                    style={{
                      background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                      borderRadius: '10px', padding: '10px 16px', color: '#c084fc', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </form>

                {/* Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!Array.isArray(tasks) || tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                      No tasks scheduled. Add one above!
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex', alignItems: 'center', justify: 'space-between',
                          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                          padding: '12px 14px', borderRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: '#a855f7' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: task.completed ? 'rgba(255,255,255,0.3)' : '#e2e8f0', textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.task_name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: HEATMAP PROGRESS */}
          {activeTab === 'progress' && (
            <motion.div key="progress" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
                  Study Consistency Heatmap
                </h4>
                
                {/* Heatmap Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: '100%', justifyContent: 'center' }}>
                  {renderHeatmap()}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginTop: 20, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                  <span>Less Active</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.03)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(168, 85, 247, 0.15)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(168, 85, 247, 0.4)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(168, 85, 247, 0.7)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: '#c084fc' }} />
                  </div>
                  <span>Study Master</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
