import { useState } from "react";
import { useStreak } from "../hooks/useStreak";

function WeekDots({ lastCheckIn, streak }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0

  return (
    <div style={styles.weekRow}>
      {days.map((d, i) => {
        const diff = todayIndex - i;
        const active = diff >= 0 && diff < streak;
        const isToday = i === todayIndex;
        return (
          <div key={i} style={styles.dayCol}>
            <div style={{
              ...styles.dot,
              background: active ? "#f97316" : "rgba(255,255,255,0.08)",
              boxShadow: active ? "0 0 8px rgba(249,115,22,0.5)" : "none",
              border: isToday ? "1px solid rgba(249,115,22,0.5)" : "1px solid transparent",
            }} />
            <span style={{ ...styles.dayLabel, color: isToday ? "#f97316" : "rgba(255,255,255,0.3)" }}>{d}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StreakBadge({ userId, onCheckIn }) {
  const { streak, loading, checkIn } = useStreak(userId);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckIn = async () => {
    if (isChecking) return;
    setIsChecking(true);
    const result = await checkIn();
    setIsChecking(false);
    if (!result) return;

    if (result.alreadyCheckedIn) {
      setPopupMsg("✅ Already checked in today!");
    } else if (result.isNewRecord) {
      setPopupMsg(`🏆 NEW RECORD! ${result.streak.current_streak} day streak!`);
    } else {
      setPopupMsg(`🔥 ${result.streak.current_streak} day streak! Keep going!`);
    }

    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
    if (onCheckIn) onCheckIn(result);
  };

  if (loading) return (
    <div style={{ ...styles.card, opacity: 0.4, minHeight: 100 }} />
  );

  const s = streak;
  const today = new Date().toISOString().split("T")[0];
  const checkedInToday = s?.last_check_in === today;
  const currentStreak = s?.current_streak ?? 0;

  // Milestone thresholds for badge color
  const streakColor = currentStreak >= 30 ? "#a855f7"
    : currentStreak >= 14 ? "#00d4ff"
    : currentStreak >= 7  ? "#10b981"
    : "#f97316";

  return (
    <div style={styles.wrapper}>
      <div style={{ ...styles.card, borderColor: checkedInToday ? `${streakColor}33` : "rgba(255,255,255,0.08)" }}>

        {/* Header row */}
        <div style={styles.flameRow}>
          <div style={{ ...styles.flameCircle, background: `${streakColor}18`, border: `1px solid ${streakColor}44` }}>
            <span style={{ fontSize: 26 }}>{checkedInToday ? "🔥" : "🌑"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...styles.streakNum, color: streakColor }}>{currentStreak}</div>
            <div style={styles.label}>day streak</div>
          </div>
          {/* Milestone badge */}
          {currentStreak >= 7 && (
            <div style={{ ...styles.milestoneBadge, background: `${streakColor}22`, color: streakColor, border: `1px solid ${streakColor}44` }}>
              {currentStreak >= 30 ? "💎 Legend" : currentStreak >= 14 ? "🌊 Dedicated" : "⚡ Building"}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statVal}>{s?.longest_streak ?? 0}</span>
            <span style={styles.statLabel}>Best</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.stat}>
            <span style={styles.statVal}>{s?.total_check_ins ?? 0}</span>
            <span style={styles.statLabel}>Total Days</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.stat}>
            <span style={styles.statVal}>{checkedInToday ? "✓" : "—"}</span>
            <span style={styles.statLabel}>Today</span>
          </div>
        </div>

        {/* Check-in button */}
        <button
          onClick={handleCheckIn}
          disabled={checkedInToday || isChecking}
          style={{
            ...styles.btn,
            background: checkedInToday
              ? "rgba(255,255,255,0.06)"
              : `linear-gradient(135deg, ${streakColor}, ${streakColor}bb)`,
            cursor: checkedInToday ? "default" : "pointer",
            opacity: isChecking ? 0.6 : 1,
          }}
        >
          {isChecking ? "..." : checkedInToday ? "✓ Checked In Today" : "🔥 Check In"}
        </button>
      </div>

      {/* Week dots */}
      <WeekDots lastCheckIn={s?.last_check_in} streak={currentStreak} />

      {/* Toast popup */}
      {showPopup && (
        <div style={styles.toast}>{popupMsg}</div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: 8 },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    backdropFilter: "blur(12px)",
    transition: "border-color 0.3s",
  },
  flameRow: { display: "flex", alignItems: "center", gap: 14 },
  flameCircle: {
    width: 52, height: 52, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  streakNum: { fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: "'Inter', sans-serif" },
  label: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, letterSpacing: "0.5px" },
  milestoneBadge: {
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
    whiteSpace: "nowrap",
  },
  stats: { display: "flex", gap: 0, alignItems: "center", justifyContent: "space-around" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontWeight: 700, color: "#fff" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px" },
  divider: { width: 1, height: 28, background: "rgba(255,255,255,0.08)" },
  btn: {
    border: "none", borderRadius: 12,
    padding: "11px 16px", color: "#fff",
    fontWeight: 700, fontSize: 13,
    transition: "all 0.2s", fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.3px",
  },
  weekRow: { display: "flex", justifyContent: "space-between", padding: "4px 6px" },
  dayCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  dot: { width: 10, height: 10, borderRadius: "50%", transition: "all 0.3s" },
  dayLabel: { fontSize: 9, letterSpacing: "0.3px", fontWeight: 600, transition: "color 0.3s" },
  toast: {
    position: "absolute",
    top: -48, left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(249,115,22,0.92)",
    color: "#fff",
    padding: "9px 18px",
    borderRadius: 12,
    fontWeight: 700, fontSize: 13,
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px)",
    zIndex: 100,
    boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
    animation: "fadeInDown 0.3s ease",
  },
};
