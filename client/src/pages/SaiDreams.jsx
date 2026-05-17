import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Link } from "react-router-dom";
import * as THREE from "three";
import { supabase } from "../lib/supabaseClient";

// ─── Local dream analysis (no API needed) ───────────────────────────────────
function localAnalyzeDream(dreamText) {
  const text = dreamText.toLowerCase();
  
  const darkWords = ['dark', 'shadow', 'death', 'blood', 'monster', 'scary', 'fear', 'nightmare', 'lost', 'trapped', 'alone'];
  const joyWords = ['happy', 'laugh', 'sun', 'bright', 'joy', 'love', 'beautiful', 'dance', 'fly', 'free', 'light'];
  const waterWords = ['water', 'ocean', 'sea', 'rain', 'flood', 'swim', 'wave', 'river', 'lake'];
  const skyWords = ['fly', 'cloud', 'sky', 'float', 'star', 'space', 'universe', 'fall', 'wings'];
  const anxiousWords = ['chase', 'run', 'late', 'exam', 'fail', 'teeth', 'naked', 'embarrass', 'stress', 'panic'];
  
  const darkScore = darkWords.filter(w => text.includes(w)).length;
  const joyScore = joyWords.filter(w => text.includes(w)).length;
  const waterScore = waterWords.filter(w => text.includes(w)).length;
  const skyScore = skyWords.filter(w => text.includes(w)).length;
  const anxiousScore = anxiousWords.filter(w => text.includes(w)).length;

  let mood, palette, particleStyle;
  const maxScore = Math.max(darkScore, joyScore, waterScore, skyScore, anxiousScore);
  
  if (darkScore === maxScore && darkScore > 0) {
    mood = 'dark';
    palette = { primary: '#1a0a2e', secondary: '#2d1b4e', accent: '#7c3aed', fog: '#080410' };
    particleStyle = 'storm';
  } else if (joyScore === maxScore && joyScore > 0) {
    mood = 'joyful';
    palette = { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fde68a', fog: '#1a0f00' };
    particleStyle = 'float';
  } else if (waterScore === maxScore && waterScore > 0) {
    mood = 'peaceful';
    palette = { primary: '#0ea5e9', secondary: '#0369a1', accent: '#7dd3fc', fog: '#030f1a' };
    particleStyle = 'drift';
  } else if (skyScore === maxScore && skyScore > 0) {
    mood = 'ethereal';
    palette = { primary: '#a78bfa', secondary: '#7c3aed', accent: '#c4b5fd', fog: '#0a0515' };
    particleStyle = 'spiral';
  } else if (anxiousScore === maxScore && anxiousScore > 0) {
    mood = 'anxious';
    palette = { primary: '#ef4444', secondary: '#991b1b', accent: '#fca5a5', fog: '#150505' };
    particleStyle = 'storm';
  } else {
    mood = 'mysterious';
    palette = { primary: '#7c3aed', secondary: '#1e1b4b', accent: '#a78bfa', fog: '#0f0a1e' };
    particleStyle = 'drift';
  }

  // Extract up to 3 keywords
  const allWords = dreamText.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
    .filter(w => w.length > 4 && !['about', 'there', 'their', 'where', 'which', 'these', 'those', 'would', 'could', 'should', 'with', 'from', 'that', 'this', 'have', 'were', 'what', 'when', 'then', 'into', 'than', 'some', 'your', 'been', 'also'].includes(w));
  const keywords = [...new Set(allWords)].slice(0, 3);

  const descriptions = {
    dark: 'Shadows coil through a twilight realm where ancient fears take shape...',
    joyful: 'Golden light weaves through a dreamscape alive with wonder and warmth...',
    peaceful: 'Crystalline waves carry whispered memories through a calm infinite sea...',
    ethereal: 'Stars drift softly through the boundless space of your subconscious sky...',
    anxious: 'Electric currents surge through a labyrinth of urgent, shifting pathways...',
    mysterious: 'Mist parts to reveal fragments of a world balanced between worlds...',
  };

  return {
    mood,
    intensity: 0.4 + (maxScore * 0.1),
    keywords: keywords.length > 0 ? keywords : ['dream', 'vision', 'memory'],
    palette,
    particleStyle,
    description: descriptions[mood],
  };
}

// ─── Particle System ─────────────────────────────────────────────────────────
function DreamParticles({ analysis }) {
  const mesh = useRef()
  const count = 2500

  const { positions, colors } = useMemo(() => {
    // Guard: return 1 invisible dummy particle when analysis isn't ready
    if (!analysis || !analysis.palette) {
      return { positions: new Float32Array(3), colors: new Float32Array(3) }
    }

    const positions = new Float32Array(count * 3)
    const colors    = new Float32Array(count * 3)
    const primary   = new THREE.Color(analysis.palette.primary   || '#7c3aed')
    const secondary = new THREE.Color(analysis.palette.secondary || '#1e1b4b')
    const accent    = new THREE.Color(analysis.palette.accent    || '#a78bfa')
    const style     = analysis.particleStyle || 'drift'

    for (let i = 0; i < count; i++) {
      let x, y, z
      if (style === 'storm') {
        const angle  = Math.random() * Math.PI * 2
        const radius = Math.random() * 18
        x = Math.cos(angle) * radius + (Math.random() - 0.5) * 4
        y = (Math.random() - 0.5) * 28
        z = Math.sin(angle) * radius + (Math.random() - 0.5) * 4
      } else if (style === 'spiral') {
        const t2 = Math.random() * Math.PI * 8
        x = Math.cos(t2) * (t2 / 3) + (Math.random() - 0.5) * 2
        y = (Math.random() - 0.5) * 18
        z = Math.sin(t2) * (t2 / 3) + (Math.random() - 0.5) * 2
      } else {
        x = (Math.random() - 0.5) * 40
        y = (Math.random() - 0.5) * 40
        z = (Math.random() - 0.5) * 40
      }
      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const t = Math.random()
      const c = t < 0.5
        ? primary.clone().lerp(secondary, t * 2)
        : secondary.clone().lerp(accent, (t - 0.5) * 2)
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [analysis])

  useFrame(({ clock }) => {
    if (!mesh.current || !analysis || !analysis.palette) return
    const t         = clock.elapsedTime
    const style     = analysis.particleStyle || 'drift'
    const intensity = analysis.intensity || 0.5
    const pos       = mesh.current.geometry.attributes.position.array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      if (style === 'storm') {
        pos[i3]     += Math.sin(t * 0.5 + i) * 0.015 * intensity
        pos[i3 + 1] += Math.cos(t * 0.3 + i * 0.5) * 0.02 * intensity
        pos[i3 + 2] += Math.sin(t * 0.4 + i * 0.3) * 0.015 * intensity
      } else if (style === 'spiral') {
        const angle = t * 0.08 * intensity
        const ox = pos[i3], oz = pos[i3 + 2]
        pos[i3]     = ox * Math.cos(angle * 0.01) - oz * Math.sin(angle * 0.01)
        pos[i3 + 2] = ox * Math.sin(angle * 0.01) + oz * Math.cos(angle * 0.01)
      } else {
        pos[i3 + 1] += Math.sin(t * 0.2 + i) * 0.004 * intensity
        pos[i3]     += Math.cos(t * 0.15 + i * 0.3) * 0.002 * intensity
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
    mesh.current.rotation.y = t * 0.02
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
      </bufferGeometry>
      <pointsMaterial
        vertexColors size={0.18} sizeAttenuation transparent
        opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function LightOrbs({ palette }) {
  const orbs = useRef([])
  useFrame(({ clock }) => {
    if (!palette) return
    const t = clock.elapsedTime
    orbs.current.forEach((orb, i) => {
      if (!orb) return
      orb.position.x = Math.sin(t * 0.3 + i * 2) * 10
      orb.position.y = Math.cos(t * 0.2 + i) * 5
      orb.position.z = Math.cos(t * 0.4 + i * 1.5) * 10
    })
  })
  if (!palette) return null
  return [0, 1, 2].map(i => (
    <pointLight
      key={i}
      ref={el => orbs.current[i] = el}
      color={i === 0 ? palette.primary : i === 1 ? palette.accent : palette.secondary}
      intensity={2} distance={20}
    />
  ))
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiDreams({ session }) {
  const userId = session?.user?.id;
  const [dreams, setDreams]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [analysis, setAnalysis]   = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [newDream, setNewDream]   = useState("");
  const [showInput, setShowInput] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase.from("sai_dreams").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (error) console.error("Load dreams error:", error);
        setDreams(data || []);
      });
  }, [userId]);

  const selectDream = async (dream) => {
    if (analyzing) return;
    setSelected(dream);
    setAnalysis(null);

    // Use cached analysis if available
    if (dream.dream_analysis && dream.dream_analysis.mood) {
      setAnalysis(dream.dream_analysis);
      return;
    }

    setAnalyzing(true);
    const dreamText = dream.dream_text || dream.dream_content || "";
    
    // Use local analysis (instant, no API needed)
    const result = localAnalyzeDream(dreamText);
    setAnalysis(result);

    // Cache the result in the database
    await supabase.from("sai_dreams")
      .update({ dream_analysis: result })
      .eq("id", dream.id);
    
    setDreams(d => d.map(dr => dr.id === dream.id ? { ...dr, dream_analysis: result } : dr));
    setAnalyzing(false);
  };

  const saveDream = async () => {
    if (!newDream.trim() || !userId) return;
    setSaving(true);
    setError(null);

    const dreamContent = newDream.trim();

    // Analyze locally first (instant)
    const result = localAnalyzeDream(dreamContent);

    const { data, error: saveError } = await supabase.from("sai_dreams")
      .insert({ user_id: userId, dream_text: dreamContent, dream_analysis: result })
      .select()
      .single();

    if (saveError) {
      console.error("Save dream error:", saveError);
      setError("Failed to save dream. Please try again.");
      setSaving(false);
      return;
    }

    if (data) {
      const dreamWithAnalysis = { ...data, dream_analysis: result };
      setDreams(d => [dreamWithAnalysis, ...d]);
      setNewDream("");
      setShowInput(false);
      // Show the visualizer immediately
      setSelected(dreamWithAnalysis);
      setAnalysis(result);
    }
    setSaving(false);
  };

  const fogColor = analysis?.palette?.fog || "#0a0a1a";

  return (
    <div style={styles.container}>
      {/* Back link + header */}
      <div style={styles.topBar}>
        <Link to="/sai" style={styles.backLink}>← SAI</Link>
        <h1 style={styles.pageTitle}>🌙 Dream Vault</h1>
      </div>

      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sideTitle}>My Dreams</span>
            <button onClick={() => { setShowInput(!showInput); setError(null); }} style={styles.newBtn}>
              {showInput ? "✕" : "+ Log Dream"}
            </button>
          </div>

          {showInput && (
            <div style={styles.inputBox}>
              <textarea
                style={styles.textarea}
                placeholder="Describe your dream in as much detail as you remember..."
                value={newDream}
                onChange={e => setNewDream(e.target.value)}
                rows={6}
                autoFocus
              />
              {error && (
                <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>
              )}
              <button
                onClick={saveDream}
                disabled={saving || !newDream.trim()}
                style={{ ...styles.saveBtn, opacity: saving || !newDream.trim() ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "🌙 Save & Visualize"}
              </button>
            </div>
          )}

          <div style={styles.dreamList}>
            {dreams.length === 0 && (
              <div style={styles.empty}>
                No dreams yet.<br />
                <span style={{ opacity: 0.6, fontSize: 12 }}>Tap "+ Log Dream" to begin</span>
              </div>
            )}
            {dreams.map(dream => (
              <div
                key={dream.id}
                onClick={() => selectDream(dream)}
                style={{
                  ...styles.dreamItem,
                  background: selected?.id === dream.id ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)",
                  borderColor: selected?.id === dream.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.07)",
                  cursor: analyzing ? 'not-allowed' : 'pointer',
                }}
              >
                <div style={styles.dreamDate}>
                  {new Date(dream.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {dream.dream_analysis?.mood && (
                    <span style={{ fontSize: 10, color: dream.dream_analysis.palette?.accent || "#a78bfa", marginLeft: 6 }}>
                      ● {dream.dream_analysis.mood}
                    </span>
                  )}
                </div>
                <div style={styles.dreamPreview}>
                  {(dream.dream_text || dream.dream_content || "").substring(0, 70)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Canvas */}
        <div style={styles.canvasWrap}>
          {analyzing && (
            <div style={styles.analyzingOverlay}>
              <div style={styles.analyzingText}>
                <span style={{ fontSize: 36 }}>✨</span>
                <div>Building your dreamscape...</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>SAI is weaving the world</div>
              </div>
            </div>
          )}

          {analysis && !analyzing && (
            <div style={styles.analysisOverlay}>
              <div style={{ fontSize: 11, color: analysis.palette?.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {analysis.mood} · {Math.round((analysis.intensity || 0.5) * 100)}% intensity
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", maxWidth: 300, lineHeight: 1.6 }}>
                {analysis.description}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {analysis.keywords?.map(k => (
                  <span key={k} style={{ ...styles.keyword, background: (analysis.palette?.primary || "#7c3aed") + "33", color: analysis.palette?.accent }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!selected && !analyzing && (
            <div style={styles.placeholder}>
              <div style={{ fontSize: 52 }}>🌙</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: 'center', maxWidth: 200 }}>
                Log a dream or select one to enter its world
              </div>
            </div>
          )}

          <Canvas
            camera={{ position: [0, 0, 20], fov: 75 }}
            style={{ background: fogColor, transition: "background 2s ease" }}
          >
            <Suspense fallback={null}>
              <fog attach="fog" args={[fogColor, 20, 80]} />
              <ambientLight intensity={0.1} />
              {analysis && !analyzing && (
                <>
                  <DreamParticles analysis={analysis} />
                  <LightOrbs palette={analysis.palette} />
                  <Stars radius={80} depth={50} count={1500} factor={3} fade />
                </>
              )}
              <OrbitControls
                enablePan={false} autoRotate autoRotateSpeed={0.3}
                minDistance={5} maxDistance={40}
              />
            </Suspense>
          </Canvas>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex", flexDirection: "column",
    height: "100dvh",
    background: "#0a0a1a", color: "#fff",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
  },
  topBar: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "16px 20px",
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0, zIndex: 20,
  },
  backLink: {
    color: "rgba(255,255,255,0.5)", textDecoration: "none",
    fontSize: 14, padding: "6px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.2s",
  },
  pageTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  layout: { display: "flex", flex: 1, minHeight: 0 },
  sidebar: {
    width: 280, flexShrink: 0,
    background: "rgba(0,0,0,0.6)", borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", backdropFilter: "blur(20px)",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "16px 14px 12px", display: "flex",
    justifyContent: "space-between", alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  sideTitle: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" },
  newBtn: {
    padding: "7px 12px", background: "rgba(167,139,250,0.15)",
    border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8,
    color: "#a78bfa", fontSize: 12, cursor: "pointer", fontWeight: 600,
    fontFamily: "inherit",
  },
  inputBox: {
    padding: "14px 14px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10,
    padding: 10, color: "#fff", fontSize: 13, resize: "vertical",
    outline: "none", boxSizing: "border-box", lineHeight: 1.6,
    fontFamily: "inherit",
  },
  saveBtn: {
    width: "100%", marginTop: 10, padding: "10px",
    background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
    border: "none", borderRadius: 10, color: "#fff",
    fontWeight: 600, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit", transition: "opacity 0.2s",
  },
  dreamList: { flex: 1, overflowY: "auto", padding: "10px 8px", WebkitOverflowScrolling: "touch" },
  dreamItem: {
    padding: "10px 12px", borderRadius: 10, marginBottom: 6,
    border: "1px solid", transition: "all 0.2s",
  },
  dreamDate: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  dreamPreview: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 },
  empty: {
    color: "rgba(255,255,255,0.3)", fontSize: 13,
    padding: "24px 16px", textAlign: "center", lineHeight: 2,
  },
  canvasWrap: { flex: 1, position: "relative", overflow: "hidden" },
  analyzingOverlay: {
    position: "absolute", inset: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
  },
  analyzingText: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    color: "#fff", fontSize: 16, fontWeight: 600,
  },
  analysisOverlay: {
    position: "absolute", bottom: 20, left: 16, zIndex: 10,
    display: "flex", flexDirection: "column", gap: 8, maxWidth: 320,
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16,
  },
  keyword: {
    padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600,
  },
  placeholder: {
    position: "absolute", inset: 0, zIndex: 5,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 14, pointerEvents: "none",
  },
};
