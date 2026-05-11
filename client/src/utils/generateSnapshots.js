export function randomDims(keys) {
  const out = {};
  keys.forEach(k => {
    out[k] = Math.round(Math.random() * 100);
  });
  return out;
}

export function generateSyntheticSnapshots() {
  const keys = ['openness','empathy','stress','energy','curiosity','focus'];
  const snaps = [];
  for (let i = 0; i < 60; i++) {
    snaps.push({
      id: `s${i}`,
      snapshot_date: new Date(Date.now() - (60 - i) * 24 * 3600 * 1000).toISOString(),
      dimensions: randomDims(keys),
      meta: { messages_count: Math.floor(Math.random() * 50) }
    });
  }
  return snaps;
}
