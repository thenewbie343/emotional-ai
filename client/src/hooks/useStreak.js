import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export function useStreak(userId) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const checkIn = useCallback(async () => {
    if (!userId) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("sai_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.last_check_in === today) {
      setJustCheckedIn(false);
      return { alreadyCheckedIn: true, streak: existing };
    }

    const isConsecutive = existing?.last_check_in === yesterday;
    const newStreak = isConsecutive ? (existing?.current_streak || 0) + 1 : 1;
    const newLongest = Math.max(newStreak, existing?.longest_streak || 0);
    const newTotal = (existing?.total_check_ins || 0) + 1;

    const payload = {
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_check_in: today,
      total_check_ins: newTotal,
    };

    const { data, error } = await supabase
      .from("sai_streaks")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (!error) {
      setStreak(data);
      setJustCheckedIn(true);
      return { alreadyCheckedIn: false, streak: data, isNewRecord: newStreak === newLongest };
    }

    console.error("Check-in error:", error);
    return null;
  }, [userId]);

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("sai_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) console.error("Streak fetch error:", error);
    else setStreak(data || null);
    setLoading(false);
  }, [userId]);

  // Load streak data, then auto-record today's visit
  useEffect(() => {
    if (!userId) return;
    fetchStreak().then(() => {
      // Auto check-in: opening the app counts as a daily visit
      checkIn();
    });
  }, [fetchStreak, checkIn, userId]);

  return { streak, loading, checkIn, justCheckedIn };
}
