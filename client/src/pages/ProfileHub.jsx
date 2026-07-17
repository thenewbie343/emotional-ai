import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';
import TokenIcon from '../components/TokenIcon';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 1
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: springTransition }
};

export default function ProfileHub({ session }) {
  const navigate = useNavigate();
  const { isPremium, loading: subLoading } = useSubscription(session);
  const [metadata, setMetadata] = useState(null);
  
  const [strictness, setStrictness] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [defaultCompanion, setDefaultCompanion] = useState('Shuna');
  const [shunaMode, setShunaMode] = useState('Direct');
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [wellnessAvg, setWellnessAvg] = useState('0.0');
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [profession, setProfession] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [customClass, setCustomClass] = useState('');
  const [branch, setBranch] = useState('');
  const [customBranch, setCustomBranch] = useState('');

  // Token Wallet & Unlocks States
  const [lives, setLives] = useState(0);
  const [refillTime, setRefillTime] = useState(0);
  const [topupTime, setTopupTime] = useState(0);
  const [debtTime, setDebtTime] = useState(0);
  const [unlockedFeatures, setUnlockedFeatures] = useState([]);

  // Top-Up modal states
  const [activeTopupPkg, setActiveTopupPkg] = useState(null);
  const [topupOrderId, setTopupOrderId] = useState('');
  const [topupUtr, setTopupUtr] = useState('');
  const [topupIsSubmitting, setTopupIsSubmitting] = useState(false);

  const fetchBalances = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/tokens/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const balances = await res.json();
        localStorage.setItem('antigravity_token_balances', JSON.stringify(balances));
        setLives(balances.lives);
        setRefillTime(balances.refill_time);
        setTopupTime(balances.topup_time);
        setDebtTime(balances.debt_time);
        setUnlockedFeatures(balances.unlocked_features.map(f => f.feature_id));
      }
    } catch (err) {
      console.error('Error fetching token balances:', err);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        setMetadata(user.user_metadata);
        setStrictness(user.user_metadata.sai_strictness || 50);
        setIsMuted(user.user_metadata.mute_tts || false);
        setDefaultCompanion(user.user_metadata.default_companion || 'Shuna');
        setShunaMode(user.user_metadata.shuna_mode || 'Direct');
        setDisplayName(user.user_metadata.display_name || user.user_metadata.full_name || user.email?.split('@')[0] || 'Traveler');

        if (user.user_metadata.profession_info) {
          const info = user.user_metadata.profession_info;
          setProfession(info.profession || '');
          if (info.profession === 'student') {
            if (['6','7','8','9','10','11','12'].includes(info.details)) {
              setStudentClass(info.details);
            } else {
              setStudentClass('other');
              setCustomClass(info.details || '');
            }
          } else if (info.profession === 'pre_grad' || info.profession === 'post_grad') {
            if (['B.Tech', 'B.Sc', 'B.B.A', 'M.B.B.S', 'M.A', 'M.B.A', 'B.Com', 'M.Tech', 'Ph.D'].includes(info.details)) {
              setBranch(info.details);
            } else {
              setBranch('other');
              setCustomBranch(info.details || '');
            }
          }
        }
      } else if (user) {
        setDisplayName(user.email?.split('@')[0] || 'Traveler');
      }
      
      if (user) {
        // Load initial balances
        fetchBalances(user.id);

        const { count } = await supabase.from('sai_memories').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        setMemoriesCount(count || 0);

        const { data: wellness } = await supabase.from('sai_wellness').select('avg_score').eq('user_id', user.id).order('date_key', { ascending: false }).limit(1);
        if (wellness && wellness.length > 0) {
          setWellnessAvg(Number(wellness[0].avg_score).toFixed(1));
        }
      }
    }
    loadProfile();
  }, []);

  const updateMetadata = async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const newMetadata = { ...user.user_metadata, ...updates };
    await supabase.auth.updateUser({
      data: newMetadata
    });
    setMetadata(newMetadata);
  };

  const handleUnlockFeature = async (featureId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(`${API_BASE}/api/tokens/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, featureId })
      });

      const result = await res.json();
      if (res.ok) {
        alert('Module unlocked successfully!');
        fetchBalances(user.id);
      } else {
        alert(result.error || 'Failed to unlock feature.');
      }
    } catch (err) {
      console.error('Error unlocking feature:', err);
      alert('Network error unlocking feature.');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(`${API_BASE}/api/tokens/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: activeTopupPkg.amount,
          utr: topupUtr,
          email: user.email || 'unknown@user.com',
          orderId: topupOrderId
        })
      });

      const result = await res.json();
      if (res.ok) {
        alert(`Top-up successful! ${activeTopupPkg.time} Time Tokens have been instantly credited to your wallet.`);
        setActiveTopupPkg(null);
        fetchBalances(user.id);
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

  const handleStrictnessChange = (e) => {
    const val = parseInt(e.target.value);
    setStrictness(val);
  };

  const saveStrictness = () => {
    updateMetadata({ sai_strictness: strictness });
  };

  const handleProfessionChange = async (e) => {
    const val = e.target.value;
    setProfession(val);
    setStudentClass('');
    setCustomClass('');
    setBranch('');
    setCustomBranch('');
    await updateMetadata({
      profession_info: {
        profession: val,
        details: ''
      }
    });
  };

  const handleStudentClassChange = async (e) => {
    const val = e.target.value;
    setStudentClass(val);
    if (val !== 'other') {
      await updateMetadata({
        profession_info: {
          profession: 'student',
          details: val
        }
      });
    }
  };

  const handleCustomClassChange = (e) => {
    setCustomClass(e.target.value);
  };

  const handleBranchChange = async (e) => {
    const val = e.target.value;
    setBranch(val);
    if (val !== 'other') {
      await updateMetadata({
        profession_info: {
          profession: profession,
          details: val
        }
      });
    }
  };

  const handleCustomBranchChange = (e) => {
    setCustomBranch(e.target.value);
  };

  const saveCustomProfessionDetails = async () => {
    const details = profession === 'student' ? customClass : customBranch;
    await updateMetadata({
      profession_info: {
        profession,
        details
      }
    });
  };

  const saveShunaMode = (mode) => {
    setShunaMode(mode);
    updateMetadata({ shuna_mode: mode });
  };

  const handleDownloadMind = async () => {
    if (!isPremium) {
      alert("Data Export is a Premium feature. Please upgrade your subscription to download your data.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // First, check if there's a download link available from a previously approved request
    const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";
    try {
      const res = await fetch(`${API_BASE}/api/user/export`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          if (window.confirm("Your data export is ready! Download it now?\n\n(If you want to request a fresher export, click Cancel and then click this button again after the old one expires)")) {
            window.location.href = data.downloadUrl;
            return;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('data_export_requests').insert([{ user_id: user.id, email: user.email, request_type: 'data_export' }]);
    alert("Export request sent! Our admin team will package your data. You will receive an in-app notification when it is ready to download here.");
  };

  const handleClearHistory = async () => {
    if (window.confirm("WARNING: This will permanently wipe your chat history from the active context window.")) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";
          await fetch(`${API_BASE}/api/study/delete-record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: 'messages', match: { user_id: user.id } })
          });
          alert("Chat history cleared.");
        } catch (e) {
          console.error(e);
          alert("Failed to clear chat history.");
        }
      }
    }
  };

  const handleChangePassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      if (window.confirm("Send a manual request to the admin to change your email or password?")) {
        await supabase.from('data_export_requests').insert({
          user_id: user.id,
          email: user.email,
          status: 'pending',
          request_type: 'account_change'
        });
        alert("Request sent. An admin will contact you shortly.");
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("CRITICAL WARNING: This action will permanently destroy your 3D Memory Island and delete all chat history. Are you absolutely sure?")) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('messages').delete().eq('user_id', user.id);
        await supabase.from('sai_memories').delete().eq('user_id', user.id);
        await supabase.auth.signOut();
        navigate('/auth');
        alert("Your data has been erased. Please cancel your subscription via the Billing portal if active.");
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getStrictnessLabel = (val) => {
    if (val <= 30) return "Firm but polite";
    if (val <= 70) return "Strict and demanding";
    return "Extremely aggressive";
  };

  return (
    <div className="min-h-screen bg-[#020005] text-gray-100 font-sans p-6 lg:p-12 overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto relative z-10 flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={itemVariant} className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <h1 className="text-3xl font-light tracking-tight">Command Center</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 1. Identity */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 w-full">
                <div className="relative group cursor-pointer flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                    {metadata?.avatar_url ? (
                      <img src={metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-white/50">person</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-semibold tracking-wider">COMING SOON</span>
                  </div>
                </div>
                
                <div className="flex-1 pt-2 w-full flex flex-col items-center md:items-start">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="bg-black/40 border border-white/20 rounded px-2 py-1 text-xl font-medium text-white w-48 outline-none focus:border-indigo-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsEditingName(false);
                              updateMetadata({ display_name: displayName });
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            setIsEditingName(false);
                            updateMetadata({ display_name: displayName });
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-medium tracking-wide">{displayName}</h2>
                        <button 
                          onClick={() => setIsEditingName(true)}
                          className="w-7 h-7 rounded-full bg-white/5 text-white/50 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                    <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
                      isPremium 
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                        : 'bg-white/5 text-gray-300 border-white/10'
                    }`}>
                      {isPremium ? 'Premium User' : 'Free Void Walker'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    <span className="text-xs text-white/50 uppercase tracking-widest font-semibold flex-shrink-0">Default Sync:</span>
                    <div className="flex flex-wrap justify-center bg-black/40 rounded-2xl p-1 border border-white/5">
                      <button 
                        onClick={() => { setDefaultCompanion('Shuna'); updateMetadata({ default_companion: 'Shuna' }); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${defaultCompanion === 'Shuna' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'text-white/40 hover:text-white/70'}`}
                      >
                        Shuna
                      </button>
                      <button 
                        onClick={() => { setDefaultCompanion('Sai'); updateMetadata({ default_companion: 'Sai' }); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${defaultCompanion === 'Sai' ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-white/40 hover:text-white/70'}`}
                      >
                        Sai
                      </button>
                      <button 
                        onClick={() => { setDefaultCompanion('Island'); updateMetadata({ default_companion: 'Island' }); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${defaultCompanion === 'Island' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
                      >
                        3D Island
                      </button>
                    </div>
                  </div>

                  {/* Profession Settings */}
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Profession (Optional):</span>
                      <select 
                        value={profession} 
                        onChange={handleProfessionChange}
                        className="w-full bg-[#0a0514] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 pointer-events-auto appearance-none pr-10 shadow-lg shadow-black/40"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                          backgroundPosition: 'right 12px center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="" className="bg-[#0a0514] text-gray-400">Choose Profession...</option>
                        <option value="student" className="bg-[#0a0514] text-white">Student</option>
                        <option value="pre_grad" className="bg-[#0a0514] text-white">Pre-Graduation</option>
                        <option value="post_grad" className="bg-[#0a0514] text-white">Post-Graduation</option>
                        <option value="employer" className="bg-[#0a0514] text-white">Employer</option>
                        <option value="startup_owner" className="bg-[#0a0514] text-white">Startup Owner</option>
                      </select>
                    </div>

                    {profession === 'student' && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Class / Grade:</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select 
                            value={studentClass} 
                            onChange={handleStudentClassChange}
                            className="w-full sm:flex-1 bg-[#0a0514] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 pointer-events-auto appearance-none pr-10 shadow-lg shadow-black/40"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                              backgroundPosition: 'right 12px center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '16px'
                            }}
                          >
                            <option value="" className="bg-[#0a0514] text-gray-400">Choose Class...</option>
                            {['6', '7', '8', '9', '10', '11', '12'].map(c => (
                              <option key={c} value={c} className="bg-[#0a0514] text-white">Class {c}</option>
                            ))}
                            <option value="other" className="bg-[#0a0514] text-white">Other</option>
                          </select>
                          {studentClass === 'other' && (
                            <input 
                              type="text" 
                              placeholder="Enter class..."
                              value={customClass}
                              onChange={handleCustomClassChange}
                              onBlur={saveCustomProfessionDetails}
                              className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors pointer-events-auto"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {(profession === 'pre_grad' || profession === 'post_grad') && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Branch / Course:</span>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select 
                            value={branch} 
                            onChange={handleBranchChange}
                            className="w-full sm:flex-1 bg-[#0a0514] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 pointer-events-auto appearance-none pr-10 shadow-lg shadow-black/40"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                              backgroundPosition: 'right 12px center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '16px'
                            }}
                          >
                            <option value="" className="bg-[#0a0514] text-gray-400">Choose Branch...</option>
                            {['B.Tech', 'B.Sc', 'B.B.A', 'M.B.B.S', 'M.A', 'M.B.A', 'B.Com', 'M.Tech', 'Ph.D'].map(b => (
                              <option key={b} value={b} className="bg-[#0a0514] text-white">{b}</option>
                            ))}
                            <option value="other" className="bg-[#0a0514] text-white">Other</option>
                          </select>
                          {branch === 'other' && (
                            <input 
                              type="text" 
                              placeholder="Enter branch..."
                              value={customBranch}
                              onChange={handleCustomBranchChange}
                              onBlur={saveCustomProfessionDetails}
                              className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors pointer-events-auto"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* 3. Analytics (Placeholder logic) */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">query_stats</span> Spatial Analytics
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 mb-3 flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-300">{wellnessAvg}</span>
                  </div>
                  <span className="text-sm font-medium text-white/80">Wellness Gyro</span>
                  <span className="text-[10px] text-white/40 mt-1">Synced to Ring Data</span>
                </div>
                
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col justify-center text-center">
                  <span className="text-3xl font-light text-fuchsia-300 mb-1">{memoriesCount}</span>
                  <span className="text-sm font-medium text-white/80">Memories Crystallized</span>
                  <span className="text-[10px] text-white/40 mt-1">In your 3D Island</span>
                </div>
              </div>
            </motion.section>

            {/* Feature Access Status */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified_user</span> System Status & Access
              </h3>
              <p className="text-xs text-white/40 mb-4 flex items-center gap-1.5 flex-wrap">
                Access is unlocked automatically using your Lives <TokenIcon type="life" className="w-3.5 h-3.5" /> when you open a feature.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'inner_diary', name: 'Inner Diary', livesCost: 1, timeCost: 5, desc: 'Record daily journals', timeSuffix: '/ entry' },
                  { id: 'goals', name: 'Goals System', livesCost: 1, timeCost: 5, desc: 'Set and track tasks', timeSuffix: '/ challenge' },
                  { id: 'memory_vault', name: 'Memory Vault', livesCost: 1, timeCost: 0, desc: 'Crystallize memories' },
                  { id: 'wellness_radar', name: 'Wellness Radar', livesCost: 1, timeCost: 5, desc: 'Analyze health gyro', timeSuffix: '/ scan' },
                  { id: 'shuna_chat', name: 'Shuna Chat', livesCost: 2, timeCost: 2, desc: 'Talk to Shuna', timeSuffix: '/ msg' },
                  { id: 'sai_chat', name: 'Sai Chat (Link)', livesCost: 2, timeCost: 2, desc: 'Productive coaching', timeSuffix: '/ msg' },
                  { id: 'resonance', name: 'Resonance Insights', livesCost: 2, timeCost: 0, desc: 'Synthesized insights', premiumOnly: true },
                  { id: 'dream_vault', name: 'Dream Vault', livesCost: 2, timeCost: 10, desc: 'Deep sleep analysis', timeSuffix: '/ dream' },
                  { id: 'time_capsule', name: 'Time Capsules', livesCost: 2, timeCost: 10, desc: 'Save digital memories', timeSuffix: '/ capsule' },
                  { id: 'study_hub', name: 'Study Hub (Dashboard)', livesCost: 3, timeCost: 0, desc: 'Academic tracking board' }
                ].map((feature) => {
                  const isUnlocked = unlockedFeatures.includes(feature.id);

                  return (
                    <div
                      key={feature.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isUnlocked
                          ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                          : 'bg-white/[0.01] border-white/5'
                      } flex justify-between items-center gap-3`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-white truncate">{feature.name}</span>
                          {feature.premiumOnly && (
                            <span className="px-1 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[7px] font-bold uppercase tracking-wider">Premium</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40 mt-0.5">{feature.desc}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 select-none">
                        <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium">
                          {feature.livesCost > 0 && (
                            <span className="flex items-center gap-0.5">
                              {feature.livesCost} <TokenIcon type="life" className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {feature.timeCost > 0 && (
                            <span className="flex items-center gap-0.5">
                              {feature.timeCost} <TokenIcon type="time" className="w-3.5 h-3.5" />{feature.timeSuffix || ''}
                            </span>
                          )}
                        </div>
                        {isUnlocked ? (
                          <span className="text-[9px] font-extrabold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold text-white/30 tracking-wider uppercase bg-white/5 px-2 py-0.5 rounded-full">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            {/* 4. AI Controls */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">tune</span> Persona Controls
              </h3>

              <div className="space-y-6">
                {/* Shuna Mode */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-fuchsia-200">Shuna's Behavior Mode</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${shunaMode === 'Direct' ? 'bg-fuchsia-500/10 border border-fuchsia-500/30' : 'bg-black/20 border border-white/5'}`}>
                      <input type="radio" name="shuna_mode" checked={shunaMode === 'Direct'} onChange={() => saveShunaMode('Direct')} className="accent-fuchsia-500" />
                      <div className="flex-1">
                        <div className="text-sm text-white">Direct (Default)</div>
                        <div className="text-[10px] text-white/50">Caring, empathetic, but grounded.</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed relative overflow-hidden group">
                      <input type="radio" name="shuna_mode" disabled className="accent-fuchsia-500" />
                      <div className="flex-1">
                        <div className="text-sm text-white">Unhinged</div>
                        <div className="text-[10px] text-white/50">Raw, unfiltered emotional reactions.</div>
                      </div>
                      <div className="absolute right-3 px-2 py-1 bg-red-500/20 text-red-300 text-[9px] font-bold tracking-widest rounded">COMING SOON</div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${shunaMode === 'Analytical' ? 'bg-fuchsia-500/10 border border-fuchsia-500/30' : 'bg-black/20 border border-white/5'}`}>
                      <input type="radio" name="shuna_mode" checked={shunaMode === 'Analytical'} onChange={() => saveShunaMode('Analytical')} className="accent-fuchsia-500" />
                      <div className="flex-1">
                        <div className="text-sm text-white">Analytical</div>
                        <div className="text-[10px] text-white/50">Cold, logical therapy breakdowns.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sai Strictness */}
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-[#00d4ff]">Sai's Strictness Level</span>
                    <span className="text-xs font-bold text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-1 rounded">{strictness}%</span>
                  </div>
                  
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={strictness} 
                    onChange={handleStrictnessChange}
                    onMouseUp={saveStrictness}
                    onTouchEnd={saveStrictness}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00d4ff]"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-white/40">Polite (1)</span>
                    <span className="text-[10px] text-[#00d4ff] font-medium">{getStrictnessLabel(strictness)}</span>
                    <span className="text-[10px] text-white/40">Aggressive (100)</span>
                  </div>
                </div>
              </div>
            </motion.section>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* 2. Wallet & Subscription */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-gradient-to-br from-[#0b0f19] to-[#020005] border border-indigo-500/20 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full" />
              
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span> Token Wallet
              </h3>

              <div className="flex flex-col gap-4 mb-6">
                {/* Lives */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TokenIcon type="life" className="w-8 h-8" />
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-white/40 block font-semibold">Available Lives</span>
                      <span className="text-xl font-light text-fuchsia-300 block mt-0.5">{lives} Lives</span>
                    </div>
                  </div>
                  <span className="text-xs text-white/30 font-light">Feature key tokens</span>
                </div>

                {/* Time */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenIcon type="time" className="w-8 h-8" />
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-[#00d4ff]/80 block font-bold">Total Time</span>
                        <span className="text-xl font-light text-[#00d4ff] block mt-0.5">{refillTime + topupTime} Time</span>
                      </div>
                    </div>
                    <span className="text-xs text-white/30 font-light">For chat sessions</span>
                  </div>
                  <div className="text-[10px] text-white/40 font-medium font-mono pt-1 border-t border-white/5 flex justify-between">
                    <span>Refill Time: {refillTime}</span>
                    <span>Top-up Time: {topupTime}</span>
                  </div>
                </div>

                {/* Debt (Conditional) */}
                {debtTime > 0 && (
                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 flex items-center gap-3 animate-pulse">
                    <TokenIcon type="time" className="w-6 h-6 text-red-400" />
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-red-400 block font-semibold">Declined Debt</span>
                      <span className="text-base font-bold text-red-500 block mt-0.5">{debtTime} Time</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase top-up trigger */}
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-widest text-[#00d4ff]/80 font-bold mb-3">Refill / Top-Up Time</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { amount: 10, time: 20 },
                    { amount: 20, time: 40 },
                    { amount: 50, time: 100 },
                    { amount: 100, time: 200 }
                  ].map((pkg) => (
                    <button
                      key={pkg.amount}
                      onClick={() => handleInitiateTopup(pkg.amount, pkg.time)}
                      className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/30 text-white font-medium text-xs transition-all active:scale-[0.98] flex flex-col items-center justify-center"
                    >
                      <span className="font-semibold text-xs text-[#00d4ff]">₹{pkg.amount}</span>
                      <span className="text-[9px] text-white/50">+{pkg.time} Time</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Subscription Tier</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isPremium ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-gray-500/20 text-gray-400'}`}>
                    {isPremium ? 'PREMIUM' : 'FREE'}
                  </span>
                </div>
                <div className="text-[11px] text-white/40 mb-3">
                  {isPremium ? 'Unlimited access & daily resets.' : 'Refills every 2 days (30 Time & 5 Lives).'}
                </div>
                <button onClick={() => navigate('/billing')} className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors underline underline-offset-2">
                  {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
                </button>
              </div>
            </motion.section>

            {/* 5. Privacy Settings */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">shield_lock</span> Privacy & Tech
              </h3>
              
              <div className="space-y-4">
                <button 
                  onClick={handleDownloadMind}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-white/60 group-hover:text-white transition-colors">download</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">Download Your Mind</div>
                      <div className="text-[10px] text-white/40">Export diary entries & chat history</div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-white/30">chevron_right</span>
                </button>

                <button 
                  onClick={handleClearHistory}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-red-500/10 hover:border-red-500/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-white/60 group-hover:text-red-400 transition-colors">delete_sweep</span>
                    <div className="text-sm font-medium group-hover:text-red-400 transition-colors">Clear Chat History</div>
                  </div>
                </button>
              </div>
            </motion.section>

            {/* 6. Danger Zone */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-red-950/20 border border-red-500/20 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-red-500/50 uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span> Danger Zone
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={handleChangePassword}
                  className="w-full py-3 rounded-xl bg-black/40 border border-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Request Account Changes (Email/Password)
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-xl bg-black/40 border border-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Sign Out
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  DELETE ACCOUNT
                </button>
              </div>
            </motion.section>

          </div>
        </div>
      </motion.div>

      {/* Top-up UPI Checkout Modal */}
      <AnimatePresence>
        {activeTopupPkg && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 rounded-3xl bg-[#0b0f19]/90 border border-white/10 shadow-2xl flex flex-col gap-5 relative"
            >
              <button
                onClick={() => setActiveTopupPkg(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>

              <div className="text-center">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Top-Up Checkout</h3>
                <p className="text-xs text-white/50 mt-1">Simulated instant credit system</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                <div>
                  <span className="text-xs text-white/40 block">Time Package</span>
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
                  <p className="text-[10px] text-white/40">Payee: Neeta Saxena | ID: 8770146706@ptaxis</p>
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
                  {topupIsSubmitting ? 'Verifying...' : 'Verify & Credit Instantly'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
