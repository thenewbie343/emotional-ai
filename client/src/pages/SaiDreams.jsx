import { useState, useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "../lib/supabaseClient";

// ─── AI: Analyze dream mood + keywords ──────────────────────────────────────
async function analyzeDream(dreamText) {
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
        content: `Analyze this dream and return ONLY a JSON object, no markdown, no explanation:
Dream: "${dreamText}"

Return this exact structure:
{
  "mood": "dark|stormy|peaceful|joyful|mysterious|anxious|ethereal",
  "intensity": 0.1,
  "keywords": ["word1","word2","word3"],
  "palette": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "fog": "#hexcolor"
  },
  "particleStyle": "storm|float|explode|drift|pulse|spiral",
  "description": "One sentence poetic description of the visual world"
}`
      }]
    })
  });
  const data = await res.json();
  try {
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch { return defaultAnalysis(); }
}

function defaultAnalysis() {
  return {
    mood: "mysterious", intensity: 0.5,
    keywords: ["dream", "memory", "float"],
    palette: { primary: "#7c3aed", secondary: "#1e1b4b", accent: "#a78bfa", fog: "#0f0a1e" },
    particleStyle: "drift",
    description: "A mysterious dreamscape floats in the void..."
  };
}

// ─── Particle System ─────────────────────────────────────────────────────────
function DreamParticles({ analysis }) {
  const mesh = useRef();
  const count = 3000;

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const primary = new THREE.Color(analysis.palette?.primary || "#7c3aed");
    const secondary = new THREE.Color(analysis.palette?.secondary || "#1e1b4b");
    const accent = new THREE.Color(analysis.palette?.accent || "#a78bfa");

    for (let i = 0; i < count; i++) {
      const style = analysis.particleStyle || "drift";
      let x, y, z;

      if (style === "storm") {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 20;
        x = Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
        y = (Math.random() - 0.5) * 30;
        z = Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
      } else if (style === "spiral") {
        const t = Math.random() * Math.PI * 8;
        x = Math.cos(t) * (t / 3) + (Math.random() - 0.5) * 3;
        y = (Math.random() - 0.5) * 20;
        z = Math.sin(t) * (t / 3) + (Math.random() - 0.5) * 3;
      } else if (style === "explode") {
        const dir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        const dist = Math.random() * 25;
        x = dir.x * dist; y = dir.y * dist; z = dir.z * dist;
      } else {
        x = (Math.random() - 0.5) * 40;
        y = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 40;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const t = Math.random();
      const c = t < 0.5
        ? primary.clone().lerp(secondary, t * 2)
        : secondary.clone().lerp(accent, (t - 0.5) * 2);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 0.3 + 0.05;
    }
    return { positions, colors, sizes };
  }, [analysis]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const style = analysis.particleStyle;
    const intensity = analysis.intensity || 0.5;
    const pos = mesh.current.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (style === "storm") {
        pos[i3]     += Math.sin(t * 0.5 + i) * 0.02 * intensity;
        pos[i3 + 1] += Math.cos(t * 0.3 + i * 0.5) * 0.03 * intensity;
        pos[i3 + 2] += Math.sin(t * 0.4 + i * 0.3) * 0.02 * intensity;
      } else if (style === "float" || style === "drift") {
        pos[i3 + 1] += Math.sin(t * 0.2 + i) * 0.005 * intensity;
        pos[i3]     += Math.cos(t * 0.15 + i * 0.3) * 0.003 * intensity;
      } else if (style === "pulse") {
        const scale = 1 + Math.sin(t * 0.5 + i * 0.1) * 0.1 * intensity;
        pos[i3]     *= scale / (scale - 0.001);
        pos[i3 + 1] *= scale / (scale - 0.001);
      } else if (style === "spiral") {
        const angle = t * 0.1 * intensity;
        const ox = pos[i3], oz = pos[i3 + 2];
        pos[i3]     = ox * Math.cos(angle * 0.01) - oz * Math.sin(angle * 0.01);
        pos[i3 + 2] = ox * Math.sin(angle * 0.01) + oz * Math.cos(angle * 0.01);
      }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
        <bufferAttribute attach="attributes-size"     args={[sizes, 1]}     />
      </bufferGeometry>
      <pointsMaterial
        vertexColors size={0.15} sizeAttenuation transparent
        opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function KeywordMesh({ position, color, delay }) {
  const mesh = useRef();
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.5 + delay) * 0.5;
    mesh.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function FloatingKeywords({ keywords, palette }) {
  return keywords?.map((word, i) => {
    const angle = (i / keywords.length) * Math.PI * 2;
    const r = 8 + Math.random() * 4;
    return (
      <KeywordMesh
        key={word}
        word={word}
        position={[Math.cos(angle) * r, (Math.random() - 0.5) * 6, Math.sin(angle) * r]}
        color={palette?.accent || "#a78bfa"}
        delay={i * 0.5}
      />
    );
  });
}

function LightOrbs({ palette }) {
  const orbs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    orbs.current.forEach((orb, i) => {
      if (!orb) return;
      orb.position.x = Math.sin(t * 0.3 + i * 2) * 10;
      orb.position.y = Math.cos(t * 0.2 + i) * 5;
      orb.position.z = Math.cos(t * 0.4 + i * 1.5) * 10;
    });
  });
  return [0, 1, 2].map(i => (
    <pointLight
      key={i}
      ref={el => orbs.current[i] = el}
      color={i === 0 ? palette?.primary : i === 1 ? palette?.accent : palette?.secondary}
      intensity={2} distance={20}
    />
  ));
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

  useEffect(() => {
    if (!userId) return;
    supabase.from("sai_dreams").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setDreams(data || []));
  }, [userId]);

  const selectDream = async (dream) => {
    setSelected(dream);
    if (dream.dream_analysis) { setAnalysis(dream.dream_analysis); return; }
    setAnalyzing(true);
    const result = await analyzeDream(dream.dream_content || dream.dream_text || "");
    setAnalysis(result);
    await supabase.from("sai_dreams").update({ dream_analysis: result }).eq("id", dream.id);
    setDreams(d => d.map(dr => dr.id === dream.id ? { ...dr, dream_analysis: result } : dr));
    setAnalyzing(false);
  };

  const saveDream = async () => {
    if (!newDream.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("sai_dreams")
      .insert({ user_id: userId, dream_content: newDream })
      .select().single();
    if (data) {
      setDreams(d => [data, ...d]);
      setNewDream("");
      setShowInput(false);
      selectDream(data);
    }
    setSaving(false);
  };

  const fogColor = analysis?.palette?.fog || "#0a0a1a";

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sideTitle}>🌙 Dream Vault</h2>
          <button onClick={() => setShowInput(!showInput)} style={styles.newBtn}>
            {showInput ? "✕" : "+ Log Dream"}
          </button>
        </div>

        {showInput && (
          <div style={styles.inputBox}>
            <textarea
              style={styles.textarea}
              placeholder="Describe your dream in detail..."
              value={newDream}
              onChange={e => setNewDream(e.target.value)}
              rows={5}
            />
            <button onClick={saveDream} disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving..." : "🌙 Save & Visualize"}
            </button>
          </div>
        )}

        <div style={styles.dreamList}>
          {dreams.map(dream => (
            <div
              key={dream.id}
              onClick={() => selectDream(dream)}
              style={{
                ...styles.dreamItem,
                background: selected?.id === dream.id ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)",
                borderColor: selected?.id === dream.id ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.06)",
              }}
            >
              <div style={styles.dreamDate}>
                {new Date(dream.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {dream.dream_analysis && (
                  <span style={{ fontSize: 10, color: dream.dream_analysis.palette?.accent || "#a78bfa" }}>
                    {" "}● {dream.dream_analysis.mood}
                  </span>
                )}
              </div>
              <div style={styles.dreamPreview}>
                {(dream.dream_content || dream.dream_text || "")?.substring(0, 60)}...
              </div>
            </div>
          ))}
          {dreams.length === 0 && (
            <div style={styles.empty}>No dreams logged yet.<br />Log your first dream above.</div>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <div style={styles.canvasWrap}>
        {analyzing && (
          <div style={styles.analyzingOverlay}>
            <div style={styles.analyzingText}>
              <span style={{ fontSize: 32 }}>🌙</span>
              <div>SAI is reading your dream...</div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>Building your dreamscape</div>
            </div>
          </div>
        )}

        {analysis && !analyzing && (
          <div style={styles.analysisOverlay}>
            <div style={{ fontSize: 12, color: analysis.palette?.accent, fontWeight: 700, textTransform: "uppercase" }}>
              {analysis.mood} · intensity {Math.round((analysis.intensity || 0.5) * 100)}%
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", maxWidth: 300, lineHeight: 1.5 }}>
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
            <div style={{ fontSize: 48 }}>🌙</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
              Select a dream to enter its world
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
                <FloatingKeywords keywords={analysis.keywords} palette={analysis.palette} />
                <LightOrbs palette={analysis.palette} />
                <Stars radius={80} depth={50} count={2000} factor={3} fade />
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
  );
}

const styles = {
  container: { display: "flex", height: "100vh", background: "#0a0a1a", color: "#fff", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif" },
  sidebar: {
    width: 280, flexShrink: 0,
    background: "rgba(0,0,0,0.6)", borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", backdropFilter: "blur(20px)",
  },
  sidebarHeader: {
    padding: "20px 16px 12px", display: "flex",
    justifyContent: "space-between", alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sideTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  newBtn: {
    padding: "6px 12px", background: "rgba(167,139,250,0.15)",
    border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8,
    color: "#a78bfa", fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  inputBox: { padding: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
    padding: 10, color: "#fff", fontSize: 13, resize: "vertical",
    outline: "none", boxSizing: "border-box", lineHeight: 1.6,
  },
  saveBtn: {
    width: "100%", marginTop: 10, padding: "10px",
    background: "linear-gradient(135deg, #4c1d95, #7c3aed)",
    border: "none", borderRadius: 10, color: "#fff",
    fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  dreamList: { flex: 1, overflowY: "auto", padding: "12px 8px" },
  dreamItem: {
    padding: "10px 12px", borderRadius: 10, marginBottom: 6,
    border: "1px solid", cursor: "pointer", transition: "all 0.2s",
  },
  dreamDate: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  dreamPreview: { fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 },
  empty: { color: "rgba(255,255,255,0.25)", fontSize: 13, padding: 16, textAlign: "center", lineHeight: 1.8 },
  canvasWrap: { flex: 1, position: "relative" },
  analyzingOverlay: {
    position: "absolute", inset: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
  },
  analyzingText: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    color: "#fff", fontSize: 18, fontWeight: 600,
  },
  analysisOverlay: {
    position: "absolute", bottom: 24, left: 24, zIndex: 10,
    display: "flex", flexDirection: "column", gap: 8, maxWidth: 340,
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16,
  },
  keyword: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  placeholder: {
    position: "absolute", inset: 0, zIndex: 5,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 12, pointerEvents: "none",
  },
};
