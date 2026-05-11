import React, { useMemo, useState, useEffect } from 'react';
import { interpolateNumber } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { lineRadial } from 'd3-shape';
import { motion, useMotionValue } from 'framer-motion';

const radius = 120;

function interpolateDimensions(a, b, t) {
  const keys = Object.keys(a);
  const out = {};
  keys.forEach(k => {
    out[k] = interpolateNumber(a[k] ?? 0, b[k] ?? 0)(t);
  });
  return out;
}

function dimsToPath(dims, keys) {
  const scale = scaleLinear().domain([0, 100]).range([0, radius]);
  const angleStep = (2 * Math.PI) / keys.length;
  const points = keys.map((k, i) => [scale(dims[k] ?? 0), i * angleStep]);
  const radial = lineRadial().radius(d => d[0]).angle(d => d[1]);
  return radial(points) || '';
}

export default function MorphingRadarFull({ snapshots }) {
  if (!snapshots || snapshots.length === 0) return <div>No snapshots</div>;
  const keys = useMemo(() => Object.keys(snapshots[0].dimensions), [snapshots]);
  const n = snapshots.length;

  // slider position as motion value for smooth animation
  const pos = useMotionValue(0);
  const [posState, setPosState] = useState(0);
  useEffect(() => {
    const unsub = pos.onChange(v => setPosState(Number(v)));
    return unsub;
  }, [pos]);

  // compute interpolated dims
  const floatIndex = Math.max(0, Math.min(n - 1, posState));
  const i0 = Math.floor(floatIndex);
  const i1 = Math.min(i0 + 1, n - 1);
  const t = floatIndex - i0;
  const dims = interpolateDimensions(snapshots[i0].dimensions, snapshots[i1].dimensions, t);
  const pathD = dimsToPath(dims, keys);

  // Past self comparison (30 days ago)
  const nowSnap = snapshots[n - 1];
  const pastIndex = snapshots.findIndex(s => {
    const dNow = new Date(nowSnap.snapshot_date).getTime();
    const d = new Date(s.snapshot_date).getTime();
    return d >= dNow - 30 * 24 * 3600 * 1000;
  });
  const pastSnap = pastIndex >= 0 ? snapshots[pastIndex] : snapshots[0];

  // insight generator
  function generateInsight(a, b) {
    const deltas = Object.keys(a).map(k => ({ k, delta: Math.round((a[k] - b[k]) * 100) / 100 }));
    deltas.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
    const top = deltas.slice(0, 2).filter(d => Math.abs(d.delta) >= 8);
    if (top.length === 0) return 'No major changes in the last 30 days.';
    return top.map(t => `${t.k} ${t.delta > 0 ? 'up' : 'down'} ${Math.abs(t.delta)} points`).join('; ');
  }

  const insight = generateInsight(nowSnap.dimensions, pastSnap.dimensions);

  // keyboard support for slider
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') pos.set(Math.max(0, pos.get() - 0.1));
    if (e.key === 'ArrowRight') pos.set(Math.min(n - 1, pos.get() + 0.1));
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <svg width={320} height={320} viewBox="-160 -160 320 320" aria-label="Personality radar">
        <g>
          <motion.path 
            d={pathD} 
            fill="rgba(34,150,243,0.18)" 
            stroke="#2296f3" 
            strokeWidth={2}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.3 }} 
          />
          {/* axis labels */}
          {keys.map((k, i) => {
            const angle = i * (2 * Math.PI / keys.length) - Math.PI / 2;
            const x = Math.cos(angle) * (radius + 18);
            const y = Math.sin(angle) * (radius + 18);
            return <text key={k} x={x} y={y} fontSize={10} textAnchor="middle" fill="#fff">{k}</text>;
          })}
        </g>
      </svg>

      <div style={{ width: 320, color: '#fff' }}>
        <label htmlFor="radar-slider"><strong>Timeline</strong></label>
        <input 
          id="radar-slider" 
          type="range" 
          min={0} 
          max={n - 1} 
          step={0.01}
          onChange={e => pos.set(Number(e.target.value))}
          onKeyDown={onKey}
          aria-valuemin={0} 
          aria-valuemax={n - 1} 
          aria-valuenow={posState}
          style={{ width: '100%' }} 
        />
        <div style={{ marginTop: 8 }}>
          <strong>Snapshot date:</strong> {snapshots[Math.round(posState)].snapshot_date.split('T')[0]}
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Past Self Comparison</strong>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#aaa' }}>30 days ago</div>
              <div style={{ fontWeight: 600 }}>{pastSnap.snapshot_date.split('T')[0]}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#aaa' }}>Now</div>
              <div style={{ fontWeight: 600 }}>{nowSnap.snapshot_date.split('T')[0]}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, color: '#eee' }}><strong>Insight</strong>: {insight}</div>
        </div>
      </div>
    </div>
  );
}
