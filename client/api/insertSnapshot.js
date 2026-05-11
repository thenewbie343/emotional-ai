import { createClient } from '@supabase/supabase-js';

// Vercel Edge Function
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  
  const { user_id, dimensions, source, meta } = req.body;
  if (!user_id || !dimensions || !source) return res.status(400).send('Missing fields');

  // Basic validation
  if (typeof dimensions !== 'object') return res.status(400).send('Invalid dimensions');

  const { data, error } = await supabase
    .from('personality_snapshots')
    .insert([{ user_id, dimensions, source, meta }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ snapshot: data[0] });
}
