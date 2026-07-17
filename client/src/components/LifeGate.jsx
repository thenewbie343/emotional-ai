import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000" : "https://emotional-ai-18zi.onrender.com");

export default function LifeGate({ children, featureId, cost }) {
  const navigate = useNavigate();
  
  // 1. Initial State from localStorage cache to prevent any loading screen delay
  const getCachedState = () => {
    try {
      const cached = localStorage.getItem('antigravity_token_balances');
      if (cached) {
        const balances = JSON.parse(cached);
        const activeUnlock = balances.unlocked_features?.some(f => f.feature_id === featureId);
        if (activeUnlock) {
          return { isUnlocked: true, loading: false, lives: balances.lives };
        }
        
        // Optimistic check: if we have enough lives, unlock instantly!
        if (balances.lives >= cost) {
          // Decrement cached lives optimistically so other components see it
          balances.lives -= cost;
          if (!balances.unlocked_features) balances.unlocked_features = [];
          balances.unlocked_features.push({ feature_id: featureId, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
          localStorage.setItem('antigravity_token_balances', JSON.stringify(balances));
          
          // Trigger background fetch to lock in DB
          triggerBackgroundUnlock(featureId);
          return { isUnlocked: true, loading: false, lives: balances.lives };
        }
        
        return { isUnlocked: false, loading: false, lives: balances.lives };
      }
    } catch (e) {
      console.error('Failed to parse cached balances:', e);
    }
    
    // Default fallback if no cache
    return { isUnlocked: false, loading: true, lives: 0 };
  };

  const initialState = getCachedState();
  const [loading, setLoading] = useState(initialState.loading);
  const [isUnlocked, setIsUnlocked] = useState(initialState.isUnlocked);
  const [lives, setLives] = useState(initialState.lives);

  // Background unlock trigger
  async function triggerBackgroundUnlock(fid) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const unlockRes = await fetch(`${API_BASE}/api/tokens/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, featureId: fid })
      });
      
      if (unlockRes.ok) {
        // Fetch fresh balances in background to sync state fully
        const res = await fetch(`${API_BASE}/api/tokens/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        if (res.ok) {
          const freshBalances = await res.json();
          localStorage.setItem('antigravity_token_balances', JSON.stringify(freshBalances));
        }
      }
    } catch (e) {
      console.error('Background unlock sync failed:', e);
    }
  }

  useEffect(() => {
    // If we loaded from cache successfully, we don't need to do anything else!
    if (!loading) return;

    let active = true;

    async function checkAccessDirect() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/tokens/balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });

        if (!res.ok) throw new Error('Failed to fetch balances');
        const balances = await res.json();
        
        // Save to cache
        localStorage.setItem('antigravity_token_balances', JSON.stringify(balances));

        if (!active) return;
        setLives(balances.lives);

        const activeUnlock = balances.unlocked_features?.some(f => f.feature_id === featureId);
        if (activeUnlock) {
          setIsUnlocked(true);
          setLoading(false);
        } else {
          if (balances.lives >= cost) {
            // Deduct lives and unlock
            const unlockRes = await fetch(`${API_BASE}/api/tokens/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, featureId })
            });

            if (unlockRes.ok) {
              // Fetch fresh balances to update cache
              const freshRes = await fetch(`${API_BASE}/api/tokens/balances`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              });
              if (freshRes.ok) {
                const freshBalances = await freshRes.json();
                localStorage.setItem('antigravity_token_balances', JSON.stringify(freshBalances));
                setLives(freshBalances.lives);
              }
              setIsUnlocked(true);
            }
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('LifeGate direct check failed:', err);
        if (active) setLoading(false);
      }
    }

    checkAccessDirect();

    return () => {
      active = false;
    };
  }, [featureId, cost, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#020005] text-white select-none">
        <div className="w-12 h-12 rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500 animate-spin mb-4" />
        <p className="text-sm font-light tracking-widest text-fuchsia-300 uppercase animate-pulse">
          Syncing companion...
        </p>
      </div>
    );
  }

  if (isUnlocked) {
    return children;
  }

  // Blocked Screen
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#020005] px-6 text-center select-none animate-fade-in">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-fuchsia-500/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-sm w-full p-8 rounded-3xl bg-white/[0.01] border border-fuchsia-500/20 backdrop-blur-3xl shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent" />
        
        <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.15)]">
          <span className="text-2xl select-none">☯️</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-widest text-white uppercase bg-gradient-to-r from-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">
            Feature Locked
          </h2>
          <p className="text-xs text-white/50 leading-relaxed">
            Opening this feature requires <span className="text-fuchsia-400 font-semibold">{cost} Lives (☯️)</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 w-full text-center">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block">Your Balance</span>
          <span className="text-xl font-light text-fuchsia-300 block mt-1">{lives} Lives (☯️)</span>
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
