import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");

export default function LifeGate({ children, featureId, cost }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lives, setLives] = useState(0);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Fetch current balances and active unlocks
        const res = await fetch(`${API_BASE}/api/tokens/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });

        if (!res.ok) throw new Error('Failed to fetch balances');
        const balances = await res.json();

        if (!active) return;

        setLives(balances.lives);

        // 2. Check if feature is already unlocked
        const activeUnlock = balances.unlocked_features.some(f => f.feature_id === featureId);

        if (activeUnlock) {
          setIsUnlocked(true);
          setLoading(false);
        } else {
          // 3. Not unlocked yet. Check if we can auto-unlock
          if (balances.lives >= cost) {
            setUnlocking(true);
            const unlockRes = await fetch(`${API_BASE}/api/tokens/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, featureId })
            });

            if (unlockRes.ok) {
              setIsUnlocked(true);
            } else {
              const errData = await unlockRes.json();
              console.error('Auto-unlock failed:', errData.error);
            }
            setUnlocking(false);
            setLoading(false);
          } else {
            // Insufficient lives
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('LifeGate error:', err);
        if (active) setLoading(false);
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [featureId, cost]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#020005] text-white select-none">
        <div className="w-12 h-12 rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500 animate-spin mb-4" />
        <p className="text-sm font-light tracking-widest text-fuchsia-300 uppercase animate-pulse">
          {unlocking ? `Syncing companion... (Deducting ${cost} ${cost === 1 ? 'Life' : 'Lives'})` : 'Authorizing access...'}
        </p>
      </div>
    );
  }

  if (isUnlocked) {
    return children;
  }

  // Blocked Screen
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#020005] px-6 text-center select-none">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-fuchsia-500/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-sm w-full p-8 rounded-3xl bg-white/[0.01] border border-fuchsia-500/20 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
        
        <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.15)]">
          <span className="material-symbols-outlined text-[30px] text-fuchsia-400">lock</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-widest text-white uppercase bg-gradient-to-r from-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
            Feature Locked
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            Opening this feature requires <span className="text-fuchsia-400 font-semibold">{cost} {cost === 1 ? 'Life' : 'Lives'}</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 w-full text-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block">Your Balance</span>
          <span className="text-xl font-light text-fuchsia-300 block mt-1">{lives} {lives === 1 ? 'Life' : 'Lives'}</span>
        </div>

        <p className="text-xs text-red-400/80 font-medium">
          You don't have enough Lives to open this feature.
        </p>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => navigate('/profile')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(217,70,239,0.2)] active:scale-[0.98]"
          >
            Go to Command Center
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white/70 transition-all active:scale-[0.98]"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
