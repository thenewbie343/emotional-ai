import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import ForestPomodoro from '../components/ForestPomodoro';
import RankUpModal from '../components/RankUpModal';
import '../index.css';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

export default function SaiDashboard({ session }) {
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState('timetable'); // timetable, missions, mastery, countdown

  // Common loading/error states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // ── 1. TIMETABLE STATE ──────────────────────────────────────────────────
  const [timetables, setTimetables] = useState([]);
  const [activeTimetable, setActiveTimetable] = useState(null);
  const [newTimetableForm, setNewTimetableForm] = useState({
    subject: '',
    examDate: '',
    hours: {
      Monday: 2,
      Tuesday: 2,
      Wednesday: 2,
      Thursday: 2,
      Friday: 2,
      Saturday: 3,
      Sunday: 3
    }
  });
  const [activeSlot, setActiveSlot] = useState(null); // Slot selected for Pomodoro
  const [rankUpData, setRankUpData] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);

  // ── 2. MISSION BOARD STATE ──────────────────────────────────────────────
  const [missions, setMissions] = useState([]);
  const [newMissionForm, setNewMissionForm] = useState({
    title: '',
    subject: '',
    xpReward: 50,
    dueDate: ''
  });

  // ── 3. MASTERY STATE ────────────────────────────────────────────────────
  const [masteryEntries, setMasteryEntries] = useState([]);
  const [coachingTip, setCoachingTip] = useState('');
  const [newMasteryForm, setNewMasteryForm] = useState({
    subject: '',
    topic: '',
    confidence: 3
  });

  // ── 4. COUNTDOWN STATE ──────────────────────────────────────────────────
  const [countdownStats, setCountdownStats] = useState(null);

  // ── FETCH INITIAL DATA ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchTimetables();
    fetchMissions();
    fetchMastery();
    fetchDailyChallenge();
  }, [userId]);

  const fetchDailyChallenge = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/study/challenges/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && !data.error) setDailyChallenge(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Sync active countdown stats when active timetable changes
  useEffect(() => {
    if (activeTimetable) {
      fetchCountdownStats(activeTimetable.id);
    } else {
      setCountdownStats(null);
    }
  }, [activeTimetable]);

  // ── API CALLS ───────────────────────────────────────────────────────────
  const handlePotentialRankUp = async (result) => {
    if (result.leveledUp && result.newRank) {
      try {
        const res = await fetch(`${API_BASE}/api/study/rank/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, rank: result.newRank })
        });
        const msgData = await res.json();
        setRankUpData({ rank: result.newRank, message: msgData.message });
      } catch (err) {
        setRankUpData({ rank: result.newRank, message: "Congratulations on reaching a new rank! Keep pushing your limits." });
      }
    }
  };


  // -- Timetable APIs
  const fetchTimetables = async () => {
    try {
      const { data, error } = await supabase
        .from('sai_timetables')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTimetables(data || []);
      if (data && data.length > 0 && !activeTimetable) {
        setActiveTimetable(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateTimetable = async (e) => {
    e.preventDefault();
    if (!newTimetableForm.subject || !newTimetableForm.examDate) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Ask AI to generate the schedule structure
      const res = await fetch(`${API_BASE}/api/study/timetable/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject: newTimetableForm.subject,
          examDate: newTimetableForm.examDate,
          hoursPerDay: newTimetableForm.hours
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to generate timetable');

      // 2. Save the generated schedule to Supabase
      const saveRes = await fetch(`${API_BASE}/api/study/timetable/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject: newTimetableForm.subject,
          examDate: newTimetableForm.examDate,
          schedule: resData.schedule
        })
      });

      const savedData = await saveRes.json();
      if (!saveRes.ok) throw new Error(savedData.error || 'Failed to save timetable');

      // 3. Reset form and refresh
      setNewTimetableForm({
        subject: '',
        examDate: '',
        hours: { Monday: 2, Tuesday: 2, Wednesday: 2, Thursday: 2, Friday: 2, Saturday: 3, Sunday: 3 }
      });
      await fetchTimetables();
      setActiveTimetable(savedData);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (timetableId, updatedSchedule) => {
    try {
      const res = await fetch(`${API_BASE}/api/study/timetable/update-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          timetableId,
          schedule: updatedSchedule
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule');

      // Refresh local states
      setTimetables(prev => prev.map(t => t.id === timetableId ? data : t));
      setActiveTimetable(data);
    } catch (err) {
      console.error("Failed to update schedule:", err);
    }
  };

  // -- Mission APIs
  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('sai_missions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMissions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!newMissionForm.title || !newMissionForm.subject) return;

    try {
      const res = await fetch(`${API_BASE}/api/study/missions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: newMissionForm.title,
          subject: newMissionForm.subject,
          xpReward: newMissionForm.xpReward,
          dueDate: newMissionForm.dueDate ? new Date(newMissionForm.dueDate).toISOString() : null
        })
      });

      if (!res.ok) throw new Error('Failed to create mission');
      setNewMissionForm({ title: '', subject: '', xpReward: 50, dueDate: '' });
      fetchMissions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteMission = async (missionId) => {
    try {
      const res = await fetch(`${API_BASE}/api/study/missions/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, missionId })
      });
      if (!res.ok) throw new Error('Failed to complete mission');
      const data = await res.json();
      handlePotentialRankUp(data);
      fetchMissions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDailyMissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/study/missions/generate-daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error('Failed to generate daily missions');
      fetchMissions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  
  const handleCompleteDailyChallenge = async () => {
    if (!dailyChallenge) return;
    try {
      const res = await fetch(`${API_BASE}/api/study/challenges/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, challengeId: dailyChallenge.id })
      });
      const data = await res.json();
      if (res.ok) {
        setDailyChallenge({ ...dailyChallenge, completed: true });
        handlePotentialRankUp(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -- Mastery Tracker APIs
  const fetchMastery = async () => {
    try {
      const { data, error } = await supabase
        .from('sai_subject_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('last_studied', { ascending: false });
      if (error) throw error;
      setMasteryEntries(data || []);

      // Fetch AI Coaching Tip
      if (data && data.length > 0) {
        const res = await fetch(`${API_BASE}/api/study/mastery/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const tipData = await res.json();
        setCoachingTip(tipData.suggestion);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMastery = async (e) => {
    e.preventDefault();
    if (!newMasteryForm.subject || !newMasteryForm.topic) return;

    try {
      const res = await fetch(`${API_BASE}/api/study/mastery/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject: newMasteryForm.subject,
          topic: newMasteryForm.topic,
          confidence: parseInt(newMasteryForm.confidence, 10)
        })
      });
      if (!res.ok) throw new Error('Failed to log mastery');
      setNewMasteryForm({ subject: '', topic: '', confidence: 3 });
      fetchMastery();
    } catch (err) {
      console.error(err);
    }
  };

  // -- Countdown APIs
  const fetchCountdownStats = async (timetableId) => {
    try {
      const res = await fetch(`${API_BASE}/api/study/countdown/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, timetableId })
      });
      const data = await res.json();
      if (res.ok) {
        setCountdownStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch countdown stats:", err);
    }
  };

  // ── HELPERS ─────────────────────────────────────────────────────────────
  
  // Weekly Calendar Grid calculation based on schedule JSON
  const weeklyGrid = useMemo(() => {
    if (!activeTimetable || !Array.isArray(activeTimetable.schedule)) return {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const grid = {};
    days.forEach(d => { grid[d] = []; });

    activeTimetable.schedule.forEach(item => {
      const day = item.dayOfWeek || new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' });
      if (grid[day]) {
        grid[day].push(item);
      }
    });
    return grid;
  }, [activeTimetable]);

  const isOverdue = (dueDateStr, status) => {
    if (!dueDateStr || status === 'completed') return false;
    return new Date(dueDateStr) < new Date();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 font-sans pb-24 relative overflow-hidden">
      {/* Background radial glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[120px] bg-purple-900/10 top-[-5%] left-[-10%]"></div>
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[120px] bg-blue-900/10 bottom-[-10%] right-[-5%]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-12 space-y-8">
        {/* Page Header */}
        <header className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-purple-400">dashboard</span>
              SAI Study Dashboard
            </h1>
            <p className="text-sm text-gray-400">Manage schedules, track mastery, and review study countdowns.</p>
          </div>
          <a href="/sai" className="px-4 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Hub
          </a>
        </header>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1.5 bg-[#121214] border border-white/5 rounded-2xl max-w-2xl">
          {[
            { id: 'timetable', icon: 'calendar_month', label: 'Timetable Grid' },
            { id: 'missions', icon: 'assignment', label: 'Mission Board' },
            { id: 'mastery', icon: 'insights', label: 'Mastery Tracker' },
            { id: 'countdown', icon: 'alarm', label: 'Exam Countdowns' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Display generic loading/error overlays */}
        {loading && (
          <div className="p-8 text-center text-purple-400 bg-[#121214] border border-white/5 rounded-3xl animate-pulse">
            🤖 SAI is processing your request. Please wait...
          </div>
        )}
        {errorMsg && (
          <div className="p-4 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded-2xl">
            ⚠️ Error: {errorMsg}
          </div>
        )}

        {/* ── TAB 1: TIMETABLE BUILDER ────────────────────────────────────── */}
        {activeTab === 'timetable' && (
          <div className="space-y-8">
            {/* Generate Timetable form */}
            <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">auto_awesome</span> Create AI study schedule
              </h3>
              <form onSubmit={handleGenerateTimetable} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics, Calculus"
                    value={newTimetableForm.subject}
                    onChange={e => setNewTimetableForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={newTimetableForm.examDate}
                    onChange={e => setNewTimetableForm(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-semibold text-sm transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  Generate with SAI
                </button>
              </form>
            </div>

            {/* Timetable Selector */}
            {timetables.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                <span className="text-xs text-gray-500 font-semibold uppercase shrink-0">Schedules:</span>
                {timetables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTimetable(t)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                      activeTimetable?.id === t.id
                        ? 'bg-purple-600/10 border-purple-500 text-purple-400'
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    📚 {t.subject} (Exam: {new Date(t.exam_date).toLocaleDateString()})
                  </button>
                ))}
              </div>
            )}

            {/* Weekly Calendar Grid */}
            {activeTimetable ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-light text-white">
                    Study Slots for <span className="font-semibold text-purple-400">{activeTimetable.subject}</span>
                  </h2>
                  <span className="text-xs text-gray-400">Click any slot to launch your Pomodoro focus session.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[220px]">
                      <h4 className="text-xs font-semibold text-purple-400 mb-3 pb-2 border-b border-white/5 uppercase tracking-wider">
                        {day.substring(0, 3)}
                      </h4>
                      <div className="flex-grow space-y-3">
                        {weeklyGrid[day]?.length > 0 ? (
                          weeklyGrid[day].map((slot, index) => (
                            <div
                              key={index}
                              onClick={() => slot.completed ? null : setActiveSlot({ ...slot, subject: activeTimetable.subject })}
                              className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                                slot.completed
                                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 line-through opacity-60 cursor-default'
                                  : 'bg-purple-950/10 border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-950/20 text-gray-300 cursor-pointer hover:scale-[1.02]'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold truncate">{slot.topic}</div>
                                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">schedule</span>
                                  {slot.suggestedDurationMinutes} mins
                                </div>
                              </div>
                              <div className="mt-2 text-[9px] font-semibold self-end flex items-center gap-1">
                                {slot.completed ? (
                                  <>
                                    <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
                                    Done
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-xs text-purple-400">play_circle</span>
                                    Start
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[10px] text-gray-600 italic mt-4 text-center">No slots</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 bg-[#121214] border border-white/5 rounded-3xl">
                🔮 No timetables generated yet. Input details above and ask SAI to plan your schedule!
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MISSION BOARD ────────────────────────────────────────── */}
        {activeTab === 'missions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Missions List (Left Column) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-white">Active Missions</h2>

              {/* Daily Challenge Highlight */}
              {dailyChallenge && (
                <div className={`p-6 rounded-3xl border shadow-xl flex items-center justify-between transition-all ${dailyChallenge.completed ? 'bg-emerald-950/20 border-emerald-500/20 opacity-70' : 'bg-gradient-to-r from-[#121214] to-purple-950/20 border-purple-500/30'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-amber-400">star</span>
                      <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">Daily SAI Challenge</span>
                    </div>
                    <h3 className={`text-lg font-bold ${dailyChallenge.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {dailyChallenge.challenge_text}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">2x XP Bonus</div>
                      <div className="text-base font-bold text-amber-400">+{dailyChallenge.xp_reward} XP</div>
                    </div>
                    {!dailyChallenge.completed ? (
                      <button onClick={handleCompleteDailyChallenge} className="px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                        <span className="material-symbols-outlined text-[16px]">done</span> Complete
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">verified</span> Completed</span>
                    )}
                  </div>
                </div>
              )}

                <button
                  onClick={handleGenerateDailyMissions}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md"
                >
                  Generate Daily Missions (SAI)
                </button>
              </div>

              <div className="space-y-4">
                {missions.length > 0 ? (
                  missions.map(mission => {
                    const overdue = isOverdue(mission.due_date, mission.status);
                    return (
                      <div
                        key={mission.id}
                        className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${
                          mission.status === 'completed'
                            ? 'bg-emerald-950/10 border-emerald-500/20 opacity-60'
                            : overdue
                            ? 'bg-red-950/15 border-red-500/30 shadow-md shadow-red-950/10'
                            : 'bg-[#121214] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                              mission.auto_generated ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'
                            }`}>
                              {mission.auto_generated ? 'DAILY' : 'CAMPAIGN'}
                            </span>
                            <span className="text-xs text-gray-500 font-bold">{mission.subject}</span>
                          </div>
                          <h4 className={`text-base font-bold ${mission.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                            {mission.title}
                          </h4>
                          {mission.due_date && (
                            <div className={`text-[11px] flex items-center gap-1 ${overdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                              <span className="material-symbols-outlined text-[14px]">event</span>
                              Due: {new Date(mission.due_date).toLocaleDateString()} {overdue && '(OVERDUE)'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-semibold uppercase">Reward</div>
                            <div className="text-sm font-bold text-amber-400">+{mission.xp_reward} XP</div>
                          </div>

                          {mission.status !== 'completed' ? (
                            <button
                              onClick={() => handleCompleteMission(mission.id)}
                              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all active:scale-95 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Complete
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">done_all</span> Claimed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-gray-500 bg-[#121214] border border-white/5 rounded-3xl">
                    ⚔️ No missions logged. Create a custom mission or click the button above to generate daily challenges!
                  </div>
                )}
              </div>
            </div>

            {/* Custom Mission Form (Right Column) */}
            <div className="lg:col-span-4 bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-xl h-fit">
              <h3 className="text-base font-bold text-white mb-4">Launch New Mission</h3>
              <form onSubmit={handleCreateMission} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Mission Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solve physics problem set"
                    value={newMissionForm.title}
                    onChange={e => setNewMissionForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics, Math"
                    value={newMissionForm.subject}
                    onChange={e => setNewMissionForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">XP Reward</label>
                    <select
                      value={newMissionForm.xpReward}
                      onChange={e => setNewMissionForm(prev => ({ ...prev, xpReward: parseInt(e.target.value, 10) }))}
                      className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="25">25 XP (Quick)</option>
                      <option value="50">50 XP (Normal)</option>
                      <option value="100">100 XP (Epic)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Due Date</label>
                    <input
                      type="date"
                      value={newMissionForm.dueDate}
                      onChange={e => setNewMissionForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  Create Mission
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 3: SUBJECT MASTERY TRACKER ──────────────────────────────── */}
        {activeTab === 'mastery' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Topic List & visual progress bars (Left Column) */}
            <div className="lg:col-span-8 space-y-6">
              <h2 className="text-xl font-light text-white">Subject Mastery Progress</h2>

              {coachingTip && (
                <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/20 flex gap-4 items-start relative overflow-hidden">
                  <span className="material-symbols-outlined text-[24px] text-purple-400">psychology</span>
                  <div>
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-1">SAI coaching suggestion</h4>
                    <p className="text-sm text-gray-200 leading-relaxed">{coachingTip}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6 bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-xl">
                {masteryEntries.length > 0 ? (
                  masteryEntries.map((entry, index) => {
                    const percentage = (entry.confidence / 5) * 100;
                    const barColor = entry.confidence <= 2 ? 'bg-red-500' : entry.confidence <= 3 ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <div key={entry.id || index} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-xs text-purple-400 font-bold uppercase">{entry.subject}</span>
                            <h4 className="text-base font-bold text-white">{entry.topic}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">Studied: {entry.last_studied}</span>
                            <span className="text-sm font-bold text-white">Confidence: {entry.confidence}/5</span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden w-full relative">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    🎓 No subjects cataloged in your tracker yet. Fill the form to log your topic confidence levels.
                  </div>
                )}
              </div>
            </div>

            {/* Log Mastery Form (Right Column) */}
            <div className="lg:col-span-4 bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-xl h-fit">
              <h3 className="text-base font-bold text-white mb-4">Rate Topic Confidence</h3>
              <form onSubmit={handleCreateMastery} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics, Math"
                    value={newMasteryForm.subject}
                    onChange={e => setNewMasteryForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Topic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantum Mechanics, Integration"
                    value={newMasteryForm.topic}
                    onChange={e => setNewMasteryForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Confidence (1-5)</label>
                  <div className="flex gap-2 justify-between">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNewMasteryForm(prev => ({ ...prev, confidence: num }))}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                          newMasteryForm.confidence === num
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  Log topic confidence
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 4: EXAM COUNTDOWN ───────────────────────────────────────── */}
        {activeTab === 'countdown' && (
          <div className="space-y-8">
            <h2 className="text-xl font-light text-white">Active Exam Countdowns</h2>

            {timetables.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {timetables.map(t => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(t.exam_date) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)));
                  const schedule = Array.isArray(t.schedule) ? t.schedule : [];
                  const total = schedule.length;
                  const completed = schedule.filter(item => item.completed).length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div key={t.id} className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-purple-400 font-bold uppercase tracking-widest">countdown</span>
                          <h3 className="text-2xl font-bold text-white mt-1">{t.subject}</h3>
                        </div>
                        <div className="px-4 py-2 bg-purple-950/20 border border-purple-500/20 text-purple-400 font-bold text-xl rounded-2xl flex items-center justify-center shrink-0">
                          ⏳ {daysLeft} Days
                        </div>
                      </div>

                      {/* Covered progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-gray-400">
                          <span>Syllabus covered</span>
                          <span className="text-purple-400">{completed}/{total} topics ({percent}%)</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden w-full">
                          <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>

                      {/* Detailed countdown metrics if available */}
                      {activeTimetable?.id === t.id && countdownStats?.comment && (
                        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs leading-relaxed text-gray-200">
                          <strong className="text-purple-300">SAI coaching assessment:</strong> {countdownStats.comment}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-gray-500 pt-4 border-t border-white/5">
                        <span>Exam Date: {new Date(t.exam_date).toLocaleDateString()}</span>
                        <button
                          onClick={() => {
                            setActiveTimetable(t);
                            fetchCountdownStats(t.id);
                          }}
                          className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                        >
                          Show SAI pace assessment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 bg-[#121214] border border-white/5 rounded-3xl">
                ⏳ No exams schedules active. Create a timetable schedule under the Timetable Grid to configure countdown monitors.
              </div>
            )}
          </div>
        )}
      </div>

      {rankUpData && <RankUpModal rank={rankUpData.rank} message={rankUpData.message} onClose={() => setRankUpData(null)} />}

      {/* ── 5. POMODORO OVERLAY MODAL ─────────────────────────────────────── */}
      {activeSlot && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 max-w-lg w-full relative shadow-2xl space-y-6">
            <button
              onClick={() => setActiveSlot(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Start Focus Session</h3>
              <p className="text-xs text-gray-400">
                Study session for <span className="font-semibold text-purple-400">{activeSlot.topic}</span> ({activeSlot.subject}).
              </p>
            </div>

            <ForestPomodoro
              userId={userId}
              presetSubject={activeSlot.subject}
              presetDuration={activeSlot.suggestedDurationMinutes || 25}
              onComplete={async (duration) => {
                // 1. Mark the slot as completed in active timetable
                if (activeTimetable && Array.isArray(activeTimetable.schedule)) {
                  const updatedSchedule = activeTimetable.schedule.map(item => {
                    if (item.date === activeSlot.date && item.topic === activeSlot.topic) {
                      return { ...item, completed: true };
                    }
                    return item;
                  });

                  await handleUpdateSchedule(activeTimetable.id, updatedSchedule);
                  // Refresh countdown stats
                  fetchCountdownStats(activeTimetable.id);
                }
                // Close modal
                setActiveSlot(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
