import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSubscription } from '../hooks/useSubscription';

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
  
  // Local state for instant UI updates
  const [strictness, setStrictness] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [defaultCompanion, setDefaultCompanion] = useState('Shuna');
  
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        setMetadata(user.user_metadata);
        setStrictness(user.user_metadata.sai_strictness || 50);
        setIsMuted(user.user_metadata.mute_tts || false);
        setDefaultCompanion(user.user_metadata.default_companion || 'Shuna');
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

  const handleStrictnessChange = (e) => {
    const val = parseInt(e.target.value);
    setStrictness(val);
  };

  const saveStrictness = () => {
    updateMetadata({ sai_strictness: strictness });
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
              <div className="flex items-start gap-6 relative z-10">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                    <span className="material-symbols-outlined text-4xl text-white/50">person</span>
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-semibold tracking-wider">COMING SOON</span>
                  </div>
                </div>
                
                <div className="flex-1 pt-2">
                  <h2 className="text-2xl font-medium tracking-wide mb-2">{session?.user?.email?.split('@')[0] || 'Traveler'}</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
                      isPremium 
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.2)]'
                        : 'bg-white/5 text-gray-300 border-white/10'
                    }`}>
                      {isPremium ? 'Premium Beta Tester' : 'Free Void Walker'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Default Sync:</span>
                    <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
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
                    </div>
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
                    <span className="text-xs font-bold text-indigo-300">AVG</span>
                  </div>
                  <span className="text-sm font-medium text-white/80">Wellness Gyro</span>
                  <span className="text-[10px] text-white/40 mt-1">Synced to Ring Data</span>
                </div>
                
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col justify-center text-center">
                  <span className="text-3xl font-light text-fuchsia-300 mb-1">0</span>
                  <span className="text-sm font-medium text-white/80">Memories Crystallized</span>
                  <span className="text-[10px] text-white/40 mt-1">In your 3D Island</span>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                <h4 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-3">Module Unlocks</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1 border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[14px]">lock_open</span> Inner Diary
                  </span>
                  <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1 border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[14px]">lock_open</span> Resonance
                  </span>
                  {!isPremium && (
                    <span className="px-3 py-1 rounded-md bg-white/5 text-white/30 text-xs flex items-center gap-1 border border-white/10">
                      <span className="material-symbols-outlined text-[14px]">lock</span> Dream Vault
                    </span>
                  )}
                </div>
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
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 cursor-pointer">
                      <input type="radio" name="shuna_mode" defaultChecked className="accent-fuchsia-500" />
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
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed relative overflow-hidden group">
                      <input type="radio" name="shuna_mode" disabled className="accent-fuchsia-500" />
                      <div className="flex-1">
                        <div className="text-sm text-white">Analytical</div>
                        <div className="text-[10px] text-white/50">Cold, logical therapy breakdowns.</div>
                      </div>
                      <div className="absolute right-3 px-2 py-1 bg-gray-500/20 text-gray-300 text-[9px] font-bold tracking-widest rounded">COMING SOON</div>
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
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span> Wallet & Plan
              </h3>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-widest text-indigo-300/70 font-semibold mb-1">Energy Tokens</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light text-white">450</span>
                  <span className="text-sm text-white/40">⚡</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  Refill Wallet (via UPI)
                </button>
                <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">play_circle</span>
                  Earn Free Tokens
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Subscription</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isPremium ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {isPremium ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="text-xs text-white/50 mb-3">
                  {isPremium ? '₹60/month • Renews in 12 days' : 'Free tier limitations apply.'}
                </div>
                <button onClick={() => navigate('/billing')} className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors underline underline-offset-2">
                  Manage Plan
                </button>
              </div>
            </motion.section>

            {/* 5. Privacy Settings */}
            <motion.section variants={itemVariant} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-semibold tracking-widest text-white/50 uppercase mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">shield_lock</span> Privacy & Tech
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-white/60">volume_off</span>
                    <span className="text-sm font-medium">Mute Text-to-Speech</span>
                  </div>
                  <button 
                    onClick={() => { setIsMuted(!isMuted); updateMetadata({ mute_tts: !isMuted }); }}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isMuted ? 'bg-fuchsia-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                      animate={{ left: isMuted ? '26px' : '2px' }}
                      transition={springTransition}
                    />
                  </button>
                </div>

                <button 
                  onClick={() => alert("Packaging your diary and memories into a secure JSON file. This will be sent to your email.")}
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
                  onClick={() => alert("WARNING: This will permanently wipe your chat history from the active context window.")}
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
                <button className="w-full py-3 rounded-xl bg-black/40 border border-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  Change Password / Update Email
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-xl bg-black/40 border border-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Sign Out
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm("CRITICAL WARNING: This action will permanently destroy your 3D Memory Island, delete all chat history, and erase your token balance. Are you absolutely sure?")) {
                      alert("Account deletion sequence initiated.");
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  DELETE ACCOUNT
                </button>
              </div>
            </motion.section>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
