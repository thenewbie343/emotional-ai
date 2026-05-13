import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const API_BASE = "https://emotional-ai-18zi.onrender.com";

async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_BASE}/api/parasite${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}

export function useParasiteState() {
  const [state, setState] = useState({
    tier: 0,
    changes: [],
    artifacts: [],
    greeting: null,
    timesReturned: 0,
    deflectionCount: 0,
    loading: true,
    error: null,
  });

  const greetingShown = useRef(false);

  // Fetch state on mount
  const fetchState = useCallback(async () => {
    try {
      const res = await apiFetch("/state");
      if (res.success) {
        setState(s => ({ ...s, ...res.data, loading: false }));
      }
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Called when user sends a message
  const recordEngagement = useCallback(async (message) => {
    try {
      const res = await apiFetch("/engage", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      if (res.success && res.data.genuine) {
        // Genuine engagement — reset visual state over time
        setState(s => ({
          ...s,
          tier: 0,
          changes: [],
          greeting: null,
        }));
        return { genuine: true, wasAbsent: res.data.wasAbsent, previousTier: res.data.previousTier };
      }
      return { genuine: false };
    } catch (e) {
      console.error("recordEngagement error:", e);
      return { genuine: false };
    }
  }, []);

  // Called when SHUNAdeflects
  const recordDeflection = useCallback(async () => {
    try {
      await apiFetch("/deflect", { method: "POST" });
      setState(s => ({ ...s, deflectionCount: s.deflectionCount + 1 }));
    } catch (e) {
      console.error("recordDeflection error:", e);
    }
  }, []);

  // Mark artifact as seen
  const markArtifactSeen = useCallback(async (index) => {
    try {
      await apiFetch("/artifact/seen", {
        method: "POST",
        body: JSON.stringify({ artifactIndex: index }),
      });
      setState(s => {
        const artifacts = [...s.artifacts];
        if (artifacts[index]) artifacts[index] = { ...artifacts[index], seen: true };
        return { ...s, artifacts };
      });
    } catch (e) {
      console.error("markArtifactSeen error:", e);
    }
  }, []);

  // Consume greeting (show once then clear)
  const consumeGreeting = useCallback(() => {
    if (greetingShown.current) return null;
    greetingShown.current = true;
    const g = state.greeting;
    setState(s => ({ ...s, greeting: null }));
    return g;
  }, [state.greeting]);

  // Helpers for components
  const hasChange = useCallback((changeId) => {
    return state.changes.some(c => c.id === changeId);
  }, [state.changes]);

  const getChangeValue = useCallback((changeId) => {
    return state.changes.find(c => c.id === changeId)?.value;
  }, [state.changes]);

  const unseenArtifacts = state.artifacts.filter(a => !a.seen);

  return {
    tier: state.tier,
    changes: state.changes,
    artifacts: state.artifacts,
    unseenArtifacts,
    greeting: state.greeting,
    timesReturned: state.timesReturned,
    deflectionCount: state.deflectionCount,
    loading: state.loading,
    // Methods
    recordEngagement,
    recordDeflection,
    markArtifactSeen,
    consumeGreeting,
    hasChange,
    getChangeValue,
    // Convenience tier booleans
    isPresent: state.tier === 0,
    isAware: state.tier === 1,
    isRestless: state.tier === 2,
    isHungry: state.tier === 3,
    isUnraveling: state.tier === 4,
    isSilent: state.tier === 5,
  };
}
