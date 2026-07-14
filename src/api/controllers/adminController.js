const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = 'sns@mayhere.com';

const isAdmin = (req) => req.user && req.user.email === ADMIN_EMAIL;

exports.getRequests = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    // Join with auth.users if possible, but since we are using service_role, we might need to fetch users separately
    const { data: requests, error } = await supabase
      .from('subscription_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    let usersMap = {};
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authData && authData.users) {
        authData.users.forEach(u => usersMap[u.id] = u.email);
      }
    } catch (e) {
      console.warn("Could not load users map from auth admin API:", e.message);
    }

    const enrichedRequests = requests.map(req => ({
      ...req,
      user_email: usersMap[req.user_id] || req.email || 'Unknown'
    }));

    res.json(enrichedRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { requestId, userId, tier } = req.body;

    // 1. Update request status
    await supabase.from('subscription_requests').update({ status: 'approved' }).eq('id', requestId);

    // 2. Upsert user subscription (Premium is 14 days)
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 14);

    const { error: subError } = await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      tier: tier || 'premium',
      status: 'active',
      ends_at: endsAt.toISOString(),
      updated_at: new Date().toISOString()
    });

    if (subError) throw subError;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { requestId } = req.body;
    await supabase.from('subscription_requests').update({ status: 'rejected' }).eq('id', requestId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { data: subs, error: subsError } = await supabase.from('user_subscriptions').select('*');
    if (subsError) throw subsError;

    const subsMap = {};
    subs.forEach(s => subsMap[s.user_id] = s);

    let authUsers = [];
    let usingFallback = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;
      authUsers = authData.users;
    } catch (authErr) {
      console.warn('Fallback users list used in getUsers:', authErr.message);
      usingFallback = true;
    }

    let users = [];
    if (usingFallback) {
      // Fallback: build user list from subscription, request, messages, and XP records
      const { data: reqs } = await supabase.from('subscription_requests').select('user_id, email');
      const { data: msgs } = await supabase.from('messages').select('user_id');
      const { data: xp } = await supabase.from('sai_xp').select('user_id');

      const userIds = new Set();
      subs.forEach(s => { if (s.user_id) userIds.add(s.user_id); });
      if (reqs) reqs.forEach(r => { if (r.user_id) userIds.add(r.user_id); });
      if (msgs) msgs.forEach(m => { if (m.user_id) userIds.add(m.user_id); });
      if (xp) xp.forEach(x => { if (x.user_id) userIds.add(x.user_id); });

      const emailMap = {};
      if (reqs) {
        reqs.forEach(r => {
          if (r.user_id && r.email) emailMap[r.user_id] = r.email;
        });
      }

      users = Array.from(userIds).map(uid => ({
        id: uid,
        email: emailMap[uid] || `User (${uid.substring(0, 8)})`,
        created_at: subsMap[uid]?.created_at || new Date().toISOString(),
        subscription: subsMap[uid] || { tier: 'free', status: 'active' },
        is_blocked: false
      }));
    } else {
      users = authUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        subscription: subsMap[u.id] || { tier: 'free', status: 'active' },
        is_blocked: u.user_metadata?.is_blocked || false
      }));
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.toggleBlockUser = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { userId, block } = req.body;
    
    // Update user metadata to reflect block status
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { is_blocked: block }
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changeUserPassword = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { userId, newPassword } = req.body;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserTier = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { userId, tier } = req.body;
    
    if (tier === 'premium') {
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 14); // 14 days

      const { error } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier: 'premium',
        status: 'active',
        ends_at: endsAt.toISOString(),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier: 'free',
        status: 'expired',
        ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    console.log(`[Admin User Erasure] Admin request to delete user: ${userId}`);

    // Pre-deletion cleanup of all related user data tables to prevent foreign key constraint violations
    const tables = [
      'user_subscriptions',
      'subscription_requests',
      'messages',
      'sai_xp',
      'sai_personality',
      'study_roadmaps',
      'study_logs',
      'sai_timetables',
      'study_tasks',
      'sai_pomodoro_sessions',
      'sai_missions',
      'sai_subject_mastery',
      'sai_challenges',
      'siya_parasite_state',
      'sai_diary',
      'sai_memories',
      'sai_dreams',
      'sai_wellness',
      'sai_time_capsules',
      'sai_moods',
      'sai_goals',
      'sai_streaks',
      'island_achievements',
      'quiz_results'
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq('user_id', userId);
      } catch (err) {
        console.warn(`[Admin User Delete Cleanup Warning] Failed to delete from ${table}:`, err.message);
      }
    }

    // Call Supabase Auth Admin API to delete the user
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    res.json({ success: true, message: 'User permanently deleted and all data cascaded.' });
  } catch (error) {
    console.error(`[Admin User Erasure Error] Failure deleting user ${userId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
};

const { generateUserExportZip } = require('../utils/exportGenerator');
const { sendDataExportEmail } = require('../utils/emailService');

exports.approveExport = async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId is required' });
  try {
    // 1. Get the request details to know the user_id and email
    const { data: request, error: reqError } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .single();
      
    if (reqError || !request) throw new Error("Request not found");

    if (request.request_type === 'data_export') {
      try {
        // Generate ZIP buffer
        const zipBuffer = await generateUserExportZip(request.user_id);
        
        // Upload to Supabase Storage
        const filename = `${request.user_id}_export.zip`;
        const { error: uploadErr } = await supabase.storage.from('exports').upload(filename, zipBuffer, {
          contentType: 'application/zip',
          upsert: true
        });
        
        if (uploadErr) throw uploadErr;
        
      } catch (err) {
        console.error("Failed to generate or upload export ZIP:", err);
        return res.status(500).json({ error: 'Failed to process export: ' + err.message });
      }
    }

    // 2. Mark as approved
    const { error } = await supabase.from('data_export_requests').update({ status: 'approved' }).eq('id', requestId);
    if (error) throw error;
    
    res.json({ success: true, message: 'Export approved and email sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getExports = async (req, res) => {
  try {
    const { data, error } = await supabase.from('data_export_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
