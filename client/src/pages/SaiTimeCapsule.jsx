import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const MOODS = ["🌟 Thriving", "😊 Good", "😐 Okay", "😔 Struggling", "🌑 Dark"];
const MOOD_COLORS = ["#facc15", "#34d399", "#94a3b8", "#f97316", "#6d28d9"];

// ─── AI: Generate comparison ─────────────────────────────────────────────────
async function generateComparison(capsule, currentSnapshot) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are SIYA, a deeply empathetic AI companion. 
A user just opened their emotional time capsule. Compare who they were vs who they are now.

PAST (${new Date(capsule.sealed_at).toLocaleDateString()}):
- Mood: ${capsule.mood}
- Message to future self: "${capsule.message}"
- Wellness score: ${capsule.snapshot?.wellness || "unknown"}
- Personality: empathy ${capsule.snapshot?.personality?.empathy || "?"}, humor ${capsule.snapshot?.personality?.humor || "?"}, curiosity ${capsule.snapshot?.personality?.curiosity || "?"}

PRESENT (Today):
- Wellness score: ${currentSnapshot?.wellness || "unknown"}  
- Personality: empathy ${currentSnapshot?.personality?.empathy || "?"}, humor ${currentSnapshot?.personality?.humor || "?"}, curiosity ${currentSnapshot?.personality?.curiosity || "?"}
- XP Level: ${currentSnapshot?.level || "unknown"}

Write a warm, personal, insightful message (3-4 sentences) comparing then and now. 
Notice what changed, what stayed the same. Be poetic but grounded. Speak directly to them as "you".
Do NOT be generic. Make it feel like you actually know them.`
      }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "Time has passed, and you've carried this message through it all.";
}

// ─── Seal Form ────────────────────────────────────────────────────────────────
function SealForm({ userId, onSealed }) {
  const [message, setMessage]     = useState("");
  const [mood, setMood]           = useState(0);
  const [unlockDate, setUnlockDate] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl]   = useState(null);
  const [sealing, setSealing]     = useState(false);
  const mediaRef = useRef(null);

  const minDate = new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => { mediaRef.current?.stop(); setRecording(false); };

  const sealCapsule = async () => {
    if (!message.trim() || !unlockDate) return;
    setSealing(true);

    const [{ data: wellness }, { data: personality }, { data: xp }] = await Promise.all([
      supabase.from("sai_wellness").select("avg_score").eq("user_id", userId).order("date_key", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sai_personality").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("sai_xp").select("xp, level").eq("user_id", userId).maybeSingle(),
    ]);

    const snapshot = {
      wellness: wellness?.avg_score,
      personality: personality ? {
        empathy: personality.empathy, humor: personality.humor,
        curiosity: personality.curiosity, logic: personality.logic, trust: personality.trust,
      } : null,
      level: xp?.level, xp: xp?.xp,
    };

    let voiceUrl = null;
    if (audioBlob) {
      const fileName = `capsule_${userId}_${Date.now()}.webm`;
      const { data: upload } = await supabase.storage
        .from("voice-notes")
        .upload(fileName, audioBlob, { contentType: "audio/webm", upsert: false });
      if (upload) {
        const { data: pub } = supabase.storage.from("voice-notes").getPublicUrl(fileName);
        voiceUrl = pub?.publicUrl;
      }
    }

    const { data, error } = await supabase.from("sai_time_capsules").insert({
      user_id: userId,
      message, mood: MOODS[mood], mood_score: mood,
      voice_note_url: voiceUrl, unlock_date: unlockDate, snapshot,
    }).select().single();

    setSealing(false);
    if (!error && data) onSealed(data);
  };

  return (
    <div style={styles.sealForm}>
      <div style={styles.formHeader}>
        <div style={{ fontSize: 32 }}>🔮</div>
        <div>
          <h2 style={styles.formTitle}>Seal a Time Capsule</h2>
          <p style={styles.formSub}>A message from you, to you — locked until you're ready.</p>
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>✍️ Your message to future self</label>
        <textarea
          style={styles.textarea}
          placeholder="Dear future me... What do you want yourself to remember? What are you feeling right now? What are you hoping for?"
          value={message} onChange={e => setMessage(e.target.value)} rows={6}
        />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>{message.length} chars</div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>💫 How are you feeling right now?</label>
        <div style={styles.moodRow}>
          {MOODS.map((m, i) => (
            <button key={m} onClick={() => setMood(i)} style={{
              ...styles.moodBtn,
              background: mood === i ? MOOD_COLORS[i] + "33" : "rgba(255,255,255,0.04)",
              border: `1px solid ${mood === i ? MOOD_COLORS[i] : "rgba(255,255,255,0.08)"}`,
              color: mood === i ? MOOD_COLORS[i] : "rgba(255,255,255,0.5)",
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>🎙️ Voice note (optional)</label>
        <div style={styles.voiceRow}>
          {!audioUrl ? (
            <button onClick={recording ? stopRecording : startRecording}
              style={{ ...styles.voiceBtn, background: recording ? "#ef4444" : "rgba(255,255,255,0.06)" }}>
              {recording ? "⏹ Stop Recording" : "🎙 Start Recording"}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
              <audio controls src={audioUrl} style={{ flex: 1, height: 36 }} />
              <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} style={styles.removeBtn}>✕</button>
            </div>
          )}
          {recording && <div style={styles.recordingPulse}>● Recording...</div>}
        </div>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>🗓 Unlock date (minimum 7 days from now)</label>
        <input type="date" min={minDate} value={unlockDate}
          onChange={e => setUnlockDate(e.target.value)} style={styles.dateInput} />
        {unlockDate && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
            Opens in {Math.ceil((new Date(unlockDate) - new Date()) / 86400000)} days
          </div>
        )}
      </div>

      <button
        onClick={sealCapsule}
        disabled={!message.trim() || !unlockDate || sealing}
        style={{
          ...styles.sealBtn,
          opacity: (!message.trim() || !unlockDate) ? 0.4 : 1,
          cursor: (!message.trim() || !unlockDate) ? "not-allowed" : "pointer",
        }}
      >{sealing ? "🔮 Sealing..." : "🔮 Seal the Capsule"}</button>
    </div>
  );
}

// ─── Snapshot Diff ────────────────────────────────────────────────────────────
function SnapshotDiff({ label, past, present }) {
  if (!past) return null;
  return (
    <div style={styles.diffItem}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{past}</span>
        {present && <>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
          <span style={{ fontSize: 13, color: "#34d399", fontWeight: 700 }}>{present}</span>
        </>}
      </div>
    </div>
  );
}

// ─── Capsule Card ─────────────────────────────────────────────────────────────
function CapsuleCard({ capsule, onOpen, currentSnapshot }) {
  const [opening, setOpening]       = useState(false);
  const [comparison, setComparison] = useState(capsule.comparison?.text || null);
  const today      = new Date().toISOString().split("T")[0];
  const isUnlocked = today >= capsule.unlock_date;
  const daysLeft   = Math.ceil((new Date(capsule.unlock_date) - new Date()) / 86400000);
  const moodColor  = MOOD_COLORS[capsule.mood_score ?? 2];

  const openCapsule = async () => {
    if (!isUnlocked || capsule.opened) return;
    setOpening(true);
    const comp = await generateComparison(capsule, currentSnapshot);
    const { data } = await supabase.from("sai_time_capsules").update({
      opened: true, opened_at: new Date().toISOString(), comparison: { text: comp },
    }).eq("id", capsule.id).select().single();
    setComparison(comp);
    setOpening(false);
    if (data) onOpen(data);
  };

  return (
    <div style={{
      ...styles.capsuleCard,
      borderColor: isUnlocked
        ? (capsule.opened ? "rgba(255,255,255,0.08)" : moodColor + "66")
        : "rgba(255,255,255,0.06)",
    }}>
      <div style={styles.capsuleHeader}>
        <div style={{ fontSize: 28 }}>{capsule.opened ? "📬" : isUnlocked ? "💌" : "🔒"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: moodColor, fontWeight: 700 }}>{capsule.mood}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Sealed {new Date(capsule.sealed_at).toLocaleDateString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {isUnlocked
            ? <div style={{ fontSize: 11, color: "#34d399" }}>Unlocked ✓</div>
            : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{daysLeft}d remaining</div>
          }
        </div>
      </div>

      {!isUnlocked && (
        <div style={styles.countdown}>
          <div style={styles.countdownNum}>{daysLeft}</div>
          <div style={styles.countdownLabel}>days until this opens</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontStyle: "italic", marginTop: 8 }}>
            A message is waiting for you...
          </div>
        </div>
      )}

      {isUnlocked && !capsule.opened && !comparison && (
        <div style={styles.readyBox}>
          <div style={{ fontSize: 14, color: "#fff", marginBottom: 12 }}>
            Your past self left you something. Are you ready to see it?
          </div>
          <button onClick={openCapsule} disabled={opening} style={styles.openBtn}>
            {opening ? "✨ SIYA is preparing..." : "💌 Open Time Capsule"}
          </button>
        </div>
      )}

      {(capsule.opened || comparison) && (
        <div style={styles.openedContent}>
          <div style={styles.messageBox}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: 1 }}>
              MESSAGE FROM YOUR PAST SELF
            </div>
            <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.8, fontStyle: "italic" }}>
              "{capsule.message}"
            </div>
          </div>

          {capsule.voice_note_url && (
            <div style={styles.voicePlayback}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>🎙 VOICE NOTE</div>
              <audio controls src={capsule.voice_note_url} style={{ width: "100%" }} />
            </div>
          )}

          {comparison && (
            <div style={styles.comparisonBox}>
              <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                ✨ SIYA'S REFLECTION
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }}>{comparison}</div>
            </div>
          )}

          {capsule.snapshot && (
            <div style={styles.snapshotRow}>
              <SnapshotDiff label="Wellness" past={capsule.snapshot.wellness} present={capsule.comparison?.currentWellness} />
              <SnapshotDiff label="Level"    past={capsule.snapshot.level}    present={capsule.comparison?.currentLevel}    />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiTimeCapsule({ session }) {
  const userId = session?.user?.id;
  const [capsules, setCapsules]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState("list");
  const [currentSnapshot, setCurrentSnapshot] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: caps }, { data: wellness }, { data: personality }, { data: xp }] = await Promise.all([
      supabase.from("sai_time_capsules").select("*").eq("user_id", userId).order("sealed_at", { ascending: false }),
      supabase.from("sai_wellness").select("avg_score").eq("user_id", userId).order("date_key", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("sai_personality").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("sai_xp").select("xp, level").eq("user_id", userId).maybeSingle(),
    ]);
    setCapsules(caps || []);
    setCurrentSnapshot({ wellness: wellness?.avg_score, personality, level: xp?.level, xp: xp?.xp });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSealed = (newCapsule) => { setCapsules(c => [newCapsule, ...c]); setView("list"); };
  const handleOpen   = (updated) => setCapsules(c => c.map(cap => cap.id === updated.id ? updated : cap));

  const unlocked = capsules.filter(c => new Date().toISOString().split("T")[0] >= c.unlock_date && !c.opened);

  if (loading) return (
    <div style={styles.loading}>
      <div style={{ fontSize: 32 }}>⏳</div>
      <div>Loading your time capsules...</div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>⏳ Time Capsules</h1>
          <p style={styles.pageSub}>Messages from your past self. Letters to your future self.</p>
        </div>
        <button onClick={() => setView(v => v === "create" ? "list" : "create")} style={styles.createBtn}>
          {view === "create" ? "✕ Cancel" : "+ Seal a Capsule"}
        </button>
      </div>

      {unlocked.length > 0 && view === "list" && (
        <div style={styles.unlockedBanner}>
          <span style={{ fontSize: 20 }}>💌</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {unlocked.length} capsule{unlocked.length > 1 ? "s" : ""} ready to open!
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Your past self left you a message.</div>
          </div>
        </div>
      )}

      {view === "create"
        ? <SealForm userId={userId} onSealed={handleSealed} />
        : (
          <div style={styles.capsuleList}>
            {capsules.length === 0 && (
              <div style={styles.empty}>
                <div style={{ fontSize: 48 }}>⏳</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)" }}>No capsules yet.</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Seal your first message to your future self.</div>
              </div>
            )}
            {capsules.map(cap => (
              <CapsuleCard key={cap.id} capsule={cap} onOpen={handleOpen} currentSnapshot={currentSnapshot} />
            ))}
          </div>
        )
      }
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 680, margin: "0 auto", padding: "24px 20px 80px",
    color: "#fff", fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: "100vh", minHeight: "100dvh",
    background: "linear-gradient(180deg, #0a0a1a 0%, #120824 100%)",
    overflowY: "auto", WebkitOverflowScrolling: "touch",
  },
  loading: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, color: "#fff", background: "#0a0a1a", fontSize: 16,
  },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: 700, margin: "0 0 4px" },
  pageSub:   { fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 },
  createBtn: {
    padding: "10px 18px", background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
    border: "none", borderRadius: 12, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  unlockedBanner: {
    display: "flex", alignItems: "center", gap: 14,
    background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)",
    borderRadius: 14, padding: "14px 18px", marginBottom: 20,
  },
  capsuleList: { display: "flex", flexDirection: "column", gap: 16 },
  capsuleCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid",
    borderRadius: 18, padding: 20, transition: "border-color 0.3s",
  },
  capsuleHeader: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  countdown: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 8 },
  countdownNum: { fontSize: 48, fontWeight: 700, color: "rgba(255,255,255,0.15)" },
  countdownLabel: { fontSize: 12, color: "rgba(255,255,255,0.25)" },
  readyBox: { padding: "16px 0" },
  openBtn: {
    padding: "14px 24px", width: "100%",
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  openedContent: { display: "flex", flexDirection: "column", gap: 14 },
  messageBox: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: 16,
  },
  voicePlayback: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: 14,
  },
  comparisonBox: {
    background: "rgba(109,40,217,0.1)", border: "1px solid rgba(167,139,250,0.2)",
    borderRadius: 12, padding: 16,
  },
  snapshotRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  diffItem: {
    background: "rgba(255,255,255,0.03)", borderRadius: 10,
    padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4,
  },
  sealForm: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 24,
  },
  formHeader: { display: "flex", alignItems: "center", gap: 16 },
  formTitle: { fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
  formSub:   { fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" },
  textarea: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "14px", color: "#fff", fontSize: 14,
    resize: "vertical", outline: "none", lineHeight: 1.7, width: "100%", boxSizing: "border-box",
  },
  moodRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  moodBtn: { padding: "8px 14px", border: "1px solid", borderRadius: 20, fontSize: 13, cursor: "pointer", fontWeight: 500, transition: "all 0.2s" },
  voiceRow: { display: "flex", gap: 10, alignItems: "center" },
  voiceBtn: { padding: "10px 18px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 },
  recordingPulse: { color: "#ef4444", fontSize: 12, fontWeight: 600 },
  removeBtn: { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", padding: "4px 10px", cursor: "pointer", fontSize: 12 },
  dateInput: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14,
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  sealBtn: {
    padding: "16px", background: "linear-gradient(135deg, #4c1d95, #7c3aed, #a78bfa)",
    border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 16, transition: "opacity 0.2s",
  },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0" },
};
