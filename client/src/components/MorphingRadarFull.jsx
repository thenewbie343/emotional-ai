import React, { useMemo, useState, useEffect } from 'react';
import { interpolateNumber } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { lineRadial } from 'd3-shape';
import { motion, useMotionValue } from 'framer-motion';

const radius = 120;

function interpolateDimensions(a, b, t) {
  if (!a || !b) return a || b || {};
  const keys = Object.keys(a);
  const out = {};
  keys.forEach(k => {
    out[k] = interpolateNumber(a[k] ?? 0, b[k] ?? 0)(t);
  });
  return out;
}

function dimsToPath(dims, keys) {
  if (!dims || !keys || keys.length === 0) return '';
  const scale = scaleLinear().domain([0, 100]).range([0, radius]);
  const angleStep = (2 * Math.PI) / keys.length;
  const points = keys.map((k, i) => [scale(dims[k] ?? 0), i * angleStep]);
  const radial = lineRadial().radius(d => d[0]).angle(d => d[1]);
  return radial(points) || '';
}

export default function MorphingRadarFull({ snapshots }) {
  // Guard: no snapshots or first snapshot has no dimensions
  if (!snapshots || snapshots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        Complete more check-ins to unlock the Emotional Time Machine 🌱
      </div>
    );
  }

  const validSnapshots = snapshots.filter(s => s && s.dimensions && typeof s.dimensions === 'object');
  if (validSnapshots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        Processing your wellness data... ✨
      </div>
    );
  }

  return <RadarInner snapshots={validSnapshots} />;
}

// Inner component — only renders when snapshots are confirmed valid
function RadarInner({ snapshots }) {
  const keys = useMemo(() => Object.keys(snapshots[0].dimensions), [snapshots]);
  const n = snapshots.length;

  const pos = useMotionValue(0);
  const [posState, setPosState] = useState(0);
  useEffect(() => {
    const unsub = pos.on('change', v => setPosState(Number(v)));
    return unsub;
  }, [pos]);

  const floatIndex = Math.max(0, Math.min(n - 1, posState));
  const i0 = Math.floor(floatIndex);
  const i1 = Math.min(i0 + 1, n - 1);
  const t = floatIndex - i0;
  const dims = interpolateDimensions(
    snapshots[i0]?.dimensions,
    snapshots[i1]?.dimensions,
    t
  );
  const pathD = dimsToPath(dims, keys);

  const nowSnap  = snapshots[n - 1];
  const pastSnap = snapshots[0];

  function generateInsight(a, b) {
    if (!a || !b) return 'Not enough data yet.';
    const aKeys = Object.keys(a);
    const deltas = aKeys.map(k => ({ k, delta: Math.round((a[k] - (b[k] ?? 0)) * 100) / 100 }));
    deltas.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    const top = deltas.slice(0, 2).filter(d => Math.abs(d.delta) >= 3);
    if (top.length === 0) return 'Steady as ever — no major changes.';
    return top.map(d => `${d.k} ${d.delta > 0 ? '↑' : '↓'} ${Math.abs(d.delta)}pts`).join(' · ');
  }

  const insight = generateInsight(nowSnap?.dimensions, pastSnap?.dimensions);
  const currentDateStr = snapshots[Math.round(posState)]?.snapshot_date?.split?.('T')?.[0] ?? '';

  const onKey = (e) => {
    if (e.key === 'ArrowLeft')  pos.set(Math.max(0, pos.get() - 0.1));
    if (e.key === 'ArrowRight') pos.set(Math.min(n - 1, pos.get() + 0.1));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
      <svg width={280} height={280} viewBox="-140 -140 280 280" aria-label="Wellness radar">
        {/* Grid rings */}
        {[25, 50, 75, 100].map(pct => (
          <circle key={pct} r={(pct / 100) * radius} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        ))}
        <motion.path
          d={pathD}
          fill="rgba(16,185,129,0.18)"
          stroke="#10b981"
          strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        />
        {keys.map((k, i) => {
          const angle = i * (2 * Math.PI / keys.length) - Math.PI / 2;
          const x = Math.cos(angle) * (radius + 20);
          const y = Math.sin(angle) * (radius + 20);
          return (
            <text key={k} x={x} y={y} fontSize={9} textAnchor="middle"
              dominantBaseline="middle" fill="rgba(255,255,255,0.6)">
              {k}
            </text>
          );
        })}
      </svg>

      {n > 1 && (
        <div style={{ width: '100%' }}>
          <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
            Timeline — {currentDateStr}
          </label>
          <input
            type="range" min={0} max={n - 1} step={0.01}
            onChange={e => pos.set(Number(e.target.value))}
            onKeyDown={onKey}
            style={{ width: '100%', accentColor: '#10b981' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 12, padding: '12px 16px', fontSize: 13,
        color: 'rgba(255,255,255,0.8)', width: '100%', lineHeight: 1.5,
      }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>✨ Insight: </span>{insight}
      </div>
    </div>
  );
}
