import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const STEPS = [
  {
    icon: "🏝️",
    title: "Welcome to Your Digital Sanctuary",
    desc: "This is your private world — a place to think, grow, and connect with an AI that actually remembers you. Let's show you around.",
  },
  {
    icon: "🧠",
    title: "Meet SAI — Your Second Brain",
    desc: "SAI remembers everything you tell her. She tracks your mood, wellness, memories, and personality over time. The more you talk, the smarter she gets about YOU.",
  },
  {
    icon: "✨",
    title: "Meet SHUNA— The Immersive Companion",
    desc: "SHUNAis pure magic. She reacts to your emotions with 3D animations, lets you cast runes, and shifts between Analytical, Direct, and Unhinged modes.",
  },
  {
    icon: "📊",
    title: "Your Wellness & Mood",
    desc: "Do a daily check-in to rate your sleep, energy, and stress. SAI builds a 14-day trend and gives you a personal Wellness Score. Your data is always private.",
  },
  {
    icon: "🔥",
    title: "Streaks & XP — Level Up",
    desc: "Every message earns you XP. Check in daily to build your streak. As you level up, SAI learns more about you and responds more personally.",
  },
  {
    icon: "🎯",
    title: "Goals & Daily Challenges",
    desc: "Set goals and SAI generates a small daily challenge to keep you moving forward. Growth — one day at a time.",
  },
  {
    icon: "🚀",
    title: "You're All Set!",
    desc: "Click the glowing blue building on the island to choose your companion and begin. Your sanctuary is waiting.",
  },
];

export default function OnboardingTutorial({ userId, onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    checkOnboarded();
  }, [userId]);

  const checkOnboarded = async () => {
    const { data } = await supabase
      .from("sai_xp")
      .select("onboarded")
      .eq("user_id", userId)
      .maybeSingle();

    // Show tutorial if no row yet OR onboarded is explicitly false
    if (!data || data.onboarded === false) setVisible(true);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const finish = async () => {
    setExiting(true);

    // Upsert so it works even if the row doesn't exist yet
    await supabase.from("sai_xp").upsert(
      { user_id: userId, onboarded: true },
      { onConflict: "user_id" }
    );

    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      if (onComplete) onComplete();
    }, 400);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ ...S.overlay, opacity: exiting ? 0 : 1 }}>
      <div style={S.modal}>

        {/* Progress bar */}
        <div style={S.progressBg}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>

        {/* Step counter */}
        <div style={S.stepCount}>{step + 1} / {STEPS.length}</div>

        {/* Icon */}
        <div style={S.iconCircle}>{current.icon}</div>

        {/* Content */}
        <h2 style={S.title}>{current.title}</h2>
        <p style={S.desc}>{current.desc}</p>

        {/* Progress dots */}
        <div style={S.dots}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                ...S.dot,
                background: i === step ? "#a78bfa" : i < step ? "#6d28d9" : "rgba(255,255,255,0.12)",
                width: i === step ? 22 : 8,
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={S.btnRow}>
          {step > 0 && (
            <button onClick={prev} style={S.btnSecondary}>← Back</button>
          )}
          <button onClick={isLast ? finish : next} style={S.btnPrimary}>
            {isLast ? "🚀 Enter Sanctuary" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={finish} style={S.skip}>Skip tutorial</button>
        )}
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 99999,
    background: "rgba(0,0,0,0.88)",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(10px)",
    transition: "opacity 0.4s ease",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  modal: {
    background: "linear-gradient(145deg, rgba(109,40,217,0.25), rgba(15,8,40,0.97))",
    border: "1px solid rgba(167,139,250,0.25)",
    borderRadius: 24,
    padding: "36px 30px 28px",
    maxWidth: 440,
    width: "92%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 18,
    boxShadow: "0 0 80px rgba(109,40,217,0.35), 0 20px 60px rgba(0,0,0,0.6)",
    position: "relative",
    overflow: "hidden",
  },
  progressBg: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 3, background: "rgba(255,255,255,0.07)", borderRadius: "24px 24px 0 0",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
    transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRadius: "24px 24px 0 0",
  },
  stepCount: {
    fontSize: 11, color: "rgba(255,255,255,0.28)",
    alignSelf: "flex-end", letterSpacing: "0.5px",
  },
  iconCircle: {
    fontSize: 50,
    background: "rgba(109,40,217,0.18)",
    borderRadius: "50%",
    width: 90, height: 90,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid rgba(167,139,250,0.2)",
    boxShadow: "0 0 30px rgba(109,40,217,0.2)",
  },
  title: {
    fontSize: 21, fontWeight: 700, color: "#fff",
    textAlign: "center", margin: 0, lineHeight: 1.3,
  },
  desc: {
    fontSize: 14, color: "rgba(255,255,255,0.6)",
    textAlign: "center", lineHeight: 1.75, margin: 0,
  },
  dots: { display: "flex", gap: 6, alignItems: "center" },
  dot: {
    height: 8, borderRadius: 4,
    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },
  btnRow: { display: "flex", gap: 10, width: "100%", marginTop: 4 },
  btnPrimary: {
    flex: 1, padding: "13px 20px",
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    border: "none", borderRadius: 13,
    color: "#fff", fontWeight: 700, fontSize: 15,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  btnSecondary: {
    padding: "13px 16px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 13,
    color: "rgba(255,255,255,0.55)", fontWeight: 600, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit",
  },
  skip: {
    background: "none", border: "none",
    color: "rgba(255,255,255,0.2)", fontSize: 12,
    cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
    marginTop: -6,
  },
};
