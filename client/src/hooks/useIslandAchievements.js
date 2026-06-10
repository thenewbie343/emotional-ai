import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useIslandAchievements(userId) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!userId) {
      setAchievements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("island_achievements")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching achievements:", error);
      } else {
        setAchievements(data || []);
      }
    } catch (err) {
      console.error("Error fetching achievements:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unlockAchievement = useCallback(async (achievementId, metadata = {}) => {
    if (!userId) return null;

    // 1. Check if already unlocked locally
    const alreadyUnlocked = achievements.some(a => a.achievement_id === achievementId);
    if (alreadyUnlocked) {
      return null;
    }

    try {
      // Check from Supabase to prevent duplicate inserts
      const { data: existing, error: checkError } = await supabase
        .from("island_achievements")
        .select("*")
        .eq("user_id", userId)
        .eq("achievement_id", achievementId)
        .maybeSingle();

      if (checkError) {
        console.error("Error verifying achievement status:", checkError);
        return null;
      }

      if (existing) {
        // Sync state if already exists in DB but not in local state
        setAchievements(prev => {
          if (prev.some(a => a.achievement_id === achievementId)) return prev;
          return [...prev, existing];
        });
        return existing;
      }

      // 2. Insert into Supabase
      const payload = {
        user_id: userId,
        achievement_id: achievementId,
        metadata: metadata
      };

      const { data, error } = await supabase
        .from("island_achievements")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Error inserting achievement:", error);
        return null;
      }

      if (data) {
        setAchievements(prev => [...prev, data]);
        return data;
      }
    } catch (err) {
      console.error("Error unlocking achievement:", err);
    }
    return null;
  }, [userId, achievements]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements, userId]);

  return { achievements, loading, unlockAchievement, refetch: fetchAchievements };
}
