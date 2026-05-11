import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SNAPSHOT_ENDPOINT = process.env.SNAPSHOT_ENDPOINT; // e.g., https://your-edge-fn.example/insertSnapshot
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getActiveUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true);
  if (error) throw error;
  return (data || []).map((r) => r.id);
}

async function computeAveragesForUser(userId) {
  // Replace 'sentiment_logs' with your table that stores per-message dimension scores
  const { data, error } = await supabase.rpc('get_user_sentiment_last_7_days', { p_user_id: userId });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Example data shape: [{openness:70,empathy:40,...}, ...]
  const dimsSum = {};
  let count = 0;
  data.forEach((row) => {
    Object.keys(row).forEach(k => {
      dimsSum[k] = (dimsSum[k] || 0) + Number(row[k] || 0);
    });
    count++;
  });
  const dimsAvg = {};
  Object.keys(dimsSum).forEach(k => dimsAvg[k] = Math.round((dimsSum[k] / count) * 100) / 100);
  return { dimensions: dimsAvg, meta: { messages_count: count } };
}

async function postSnapshot(userId, dims, meta) {
  const res = await fetch(SNAPSHOT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-service-key': process.env.SNAPSHOT_SERVICE_KEY || '' },
    body: JSON.stringify({ user_id: userId, dimensions: dims, source: 'weekly_aggregate', meta })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Snapshot post failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function run() {
  const users = await getActiveUsers();
  for (const u of users) {
    try {
      const result = await computeAveragesForUser(u);
      if (!result) continue;
      await postSnapshot(u, result.dimensions, result.meta);
      console.log(`Snapshot posted for ${u}`);
    } catch (err) {
      console.error('Error for user', u, err);
    }
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error(e); process.exit(1); });
}
