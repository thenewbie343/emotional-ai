import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Line, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "../lib/supabaseClient";

// ─── Constants ────────────────────────────────────────────────────────────────
const CAT_COLORS = {
  food:          "#f97316",
  people:        "#ec4899",
  goals:         "#a78bfa",
  health:        "#34d399",
  work:          "#60a5fa",
  hobby:         "#facc15",
  travel:        "#2dd4bf",
  personal:      "#f472b6",
  learning:      "#818cf8",
  relationships: "#fb7185",
  default:       "#94a3b8",
};

const CLUSTER_POSITIONS = {
  food:          [15, 2, 5],
  people:        [-14, 5, -3],
  goals:         [0, 12, -10],
  health:        [8, -8, 12],
  work:          [-10, -5, 10],
  hobby:         [12, 8, -8],
  travel:        [-5, 10, 8],
  personal:      [-12, 2, -12],
  learning:      [5, -12, -5],
  relationships: [-8, 8, 5],
  default:       [0, 0, 0],
};

function getClusterPos(category) {
  return CLUSTER_POSITIONS[category?.toLowerCase()] || CLUSTER_POSITIONS.default;
}

function starPosition(category, index, total) {
  const [cx, cy, cz] = getClusterPos(category);
  const spread = 4;
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const r = 1.5 + Math.random() * spread;
  return [
    cx + Math.cos(angle) * r + (Math.random() - 0.5),
    cy + Math.sin(angle * 0.7) * r * 0.6 + (Math.random() - 0.5),
    cz + Math.sin(angle) * r + (Math.random() - 0.5),
  ];
}

// ─── Single Star ─────────────────────────────────────────────────────────────
function MemoryStar({ memory, position, color, selected, hovered, onClick, onHover }) {
  const mesh    = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const pulse = selected ? 1 + Math.sin(t * 3) * 0.3 : hovered ? 1.4 : 1;
    mesh.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse * 2.5);
      glowRef.current.material.opacity = selected ? 0.4 : hovered ? 0.25 : 0.1;
    }
  });

  return (
    <group
      position={position}
      onClick={e => { e.stopPropagation(); onClick(memory); }}
      onPointerOver={e => { e.stopPropagation(); onHover(memory); }}
      onPointerOut={e => { e.stopPropagation(); onHover(null); }}
    >
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={selected ? 3 : hovered ? 2 : 1}
          roughness={0} metalness={0.5}
        />
      </mesh>
      {(selected || hovered) && (
        <Html distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div style={{
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            border: `1px solid ${color}44`, borderRadius: 8, padding: "6px 10px",
            color: "#fff", fontSize: 11, maxWidth: 180,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            boxShadow: `0 0 12px ${color}44`,
          }}>
            <div style={{ color, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>
              {memory.category || "memory"}
            </div>
            {memory.fact?.substring(0, 60)}{memory.fact?.length > 60 ? "..." : ""}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Cluster Labels ───────────────────────────────────────────────────────────
function ClusterLabel({ category, position, color, count }) {
  const group = useRef();
  useFrame(({ clock }) => {
    if (group.current)
      group.current.position.y = position[1] + 3 + Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
  });
  return (
    <group ref={group} position={[position[0], position[1], position[2]]}>
      <Html distanceFactor={20} style={{ pointerEvents: "none" }}>
        <div style={{
          color, fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2,
          textShadow: `0 0 10px ${color}`, opacity: 0.7, whiteSpace: "nowrap",
        }}>
          {category} ({count})
        </div>
      </Html>
    </group>
  );
}

// ─── Connection Lines ─────────────────────────────────────────────────────────
function ConstellationLines({ stars, memories }) {
  return stars.flatMap((star, i) => {
    const mem = memories[i];
    const peers = stars.filter((_, j) => j !== i && memories[j]?.category === mem?.category);
    if (!peers.length) return [];
    return peers.slice(0, 2).map((peer, k) => (
      <Line
        key={`${i}-${k}`}
        points={[star, peer]}
        color={CAT_COLORS[mem?.category] || CAT_COLORS.default}
        lineWidth={0.3} transparent opacity={0.2}
      />
    ));
  });
}

// ─── Camera Flight ────────────────────────────────────────────────────────────
function CameraFlight({ target }) {
  const { camera } = useThree();
  const targetVec = useMemo(
    () => target ? new THREE.Vector3(...target).add(new THREE.Vector3(3, 2, 5)) : null,
    [target]
  );
  useFrame(() => {
    if (!targetVec) return;
    camera.position.lerp(targetVec, 0.03);
    camera.lookAt(target[0], target[1], target[2]);
  });
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaiConstellation({ session }) {
  const userId = session?.user?.id;
  const [memories, setMemories]         = useState([]);
  const [starPositions, setStarPositions] = useState([]);
  const [selected, setSelected]         = useState(null);
  const [hovered, setHovered]           = useState(null);
  const [filter, setFilter]             = useState("all");
  const [loading, setLoading]           = useState(true);
  const [flightTarget, setFlightTarget] = useState(null);
  const [isFlying, setIsFlying]         = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("sai_memories").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const mems = data || [];
        setMemories(mems);

        const byCategory = {};
        mems.forEach(m => {
          const cat = m.category?.toLowerCase() || "default";
          byCategory[cat] = (byCategory[cat] || 0) + 1;
        });
        const catCounts = {};
        const positions = mems.map(m => {
          const cat = m.category?.toLowerCase() || "default";
          if (!catCounts[cat]) catCounts[cat] = 0;
          const pos = starPosition(cat, catCounts[cat], byCategory[cat]);
          catCounts[cat]++;
          return pos;
        });
        setStarPositions(positions);
        setLoading(false);
      });
  }, [userId]);

  const categories = useMemo(() => {
    const cats = [...new Set(memories.map(m => m.category?.toLowerCase()).filter(Boolean))];
    return ["all", ...cats];
  }, [memories]);

  const filteredIndices = useMemo(() =>
    memories.map((m, i) => ({ m, i }))
      .filter(({ m }) => filter === "all" || m.category?.toLowerCase() === filter)
      .map(({ i }) => i),
    [memories, filter]
  );

  const clusterMeta = useMemo(() => {
    const meta = {};
    memories.forEach((m, i) => {
      const cat = m.category?.toLowerCase() || "default";
      if (!meta[cat]) meta[cat] = { count: 0, positions: [] };
      meta[cat].count++;
      if (starPositions[i]) meta[cat].positions.push(starPositions[i]);
    });
    return meta;
  }, [memories, starPositions]);

  const handleStarClick = useCallback((memory) => {
    const idx = memories.findIndex(m => m.id === memory.id);
    setSelected(memory);
    if (starPositions[idx]) {
      setFlightTarget(starPositions[idx]);
      setIsFlying(true);
      setTimeout(() => setIsFlying(false), 2000);
    }
  }, [memories, starPositions]);

  if (loading) return (
    <div style={styles.loading}>
      <div style={{ fontSize: 32 }}>⭐</div>
      <div>Mapping your memory constellation...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* HUD */}
      <div style={styles.hud}>
        <div style={styles.hudTitle}>⭐ Memory Constellation</div>
        <div style={styles.hudSub}>{memories.length} memories · {categories.length - 1} clusters</div>
        <div style={styles.filters}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                ...styles.filterBtn,
                background: filter === cat ? (CAT_COLORS[cat] || "rgba(255,255,255,0.2)") : "rgba(255,255,255,0.05)",
                color: filter === cat ? "#000" : "rgba(255,255,255,0.6)",
              }}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Selected panel */}
      {selected && (
        <div style={styles.selectedPanel}>
          <div style={{ fontSize: 10, color: CAT_COLORS[selected.category] || "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            {selected.category || "memory"}
          </div>
          <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.7 }}>{selected.fact}</div>
          {selected.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {selected.tags.map(t => (
                <span key={t} style={{ ...styles.tag, background: (CAT_COLORS[selected.category] || "#94a3b8") + "22" }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            {new Date(selected.created_at).toLocaleDateString()}
          </div>
          <button onClick={() => setSelected(null)} style={styles.closeBtn}>✕ Close</button>
        </div>
      )}

      {!selected && (
        <div style={styles.hint}>🖱 Drag to orbit · Scroll to zoom · Click a star to explore</div>
      )}

      <Canvas camera={{ position: [0, 5, 35], fov: 60 }} style={{ background: "#020208" }}>
        <Suspense fallback={null}>
          <fog attach="fog" args={["#020208", 40, 100]} />
          <ambientLight intensity={0.05} />
          <Stars radius={120} depth={60} count={5000} factor={4} fade />

          {Object.entries(clusterMeta).map(([cat, { count }]) => {
            if (filter !== "all" && filter !== cat) return null;
            const [cx, cy, cz] = getClusterPos(cat);
            return (
              <ClusterLabel key={cat} category={cat} position={[cx, cy, cz]}
                color={CAT_COLORS[cat] || CAT_COLORS.default} count={count} />
            );
          })}

          <ConstellationLines
            stars={filteredIndices.map(i => starPositions[i]).filter(Boolean)}
            memories={filteredIndices.map(i => memories[i])}
          />

          {filteredIndices.map(i => {
            if (!starPositions[i]) return null;
            const mem = memories[i];
            const color = CAT_COLORS[mem.category?.toLowerCase()] || CAT_COLORS.default;
            return (
              <MemoryStar
                key={mem.id} memory={mem} position={starPositions[i]} color={color}
                selected={selected?.id === mem.id} hovered={hovered?.id === mem.id}
                onClick={handleStarClick} onHover={setHovered}
              />
            );
          })}

          {Object.entries(CLUSTER_POSITIONS).slice(0, 5).map(([cat, pos]) => (
            <pointLight key={cat} position={pos} color={CAT_COLORS[cat] || "#fff"} intensity={0.5} distance={12} />
          ))}

          {isFlying && flightTarget && <CameraFlight target={flightTarget} />}
          {!isFlying && <OrbitControls enablePan autoRotate autoRotateSpeed={0.1} minDistance={5} maxDistance={60} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

const styles = {
  container: { width: "100%", height: "100vh", position: "relative", background: "#020208", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif" },
  loading: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 12, color: "#fff", background: "#020208", fontSize: 16,
  },
  hud: {
    position: "absolute", top: 20, left: 20, zIndex: 10,
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, maxWidth: 340,
  },
  hudTitle: { fontSize: 16, fontWeight: 700, color: "#fff" },
  hudSub:   { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  filters:  { display: "flex", gap: 6, flexWrap: "wrap" },
  filterBtn: {
    padding: "4px 10px", border: "none", borderRadius: 20,
    fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
  },
  selectedPanel: {
    position: "absolute", bottom: 24, left: 24, zIndex: 10,
    background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 20, maxWidth: 320,
    display: "flex", flexDirection: "column",
  },
  tag: { padding: "2px 8px", borderRadius: 20, fontSize: 10, color: "rgba(255,255,255,0.6)" },
  closeBtn: {
    marginTop: 12, background: "none", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 11,
    padding: "4px 10px", cursor: "pointer", alignSelf: "flex-start",
  },
  hint: {
    position: "absolute", bottom: 24, right: 24, zIndex: 10,
    color: "rgba(255,255,255,0.25)", fontSize: 12,
    background: "rgba(0,0,0,0.4)", padding: "8px 14px", borderRadius: 20,
  },
};
