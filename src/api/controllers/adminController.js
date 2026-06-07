const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Admin Email from User Instructions
const ADMIN_EMAIL = 'sns@mayhere.com';

const isAdmin = (email) => email === ADMIN_EMAIL;

exports.getRequests = async (req, res) => {
  if (!isAdmin(req.body.userEmail)) return res.status(403).json({ error: 'Unauthorized' });

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
  if (!isAdmin(req.body.userEmail)) return res.status(403).json({ error: 'Unauthorized' });

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
  if (!isAdmin(req.body.userEmail)) return res.status(403).json({ error: 'Unauthorized' });

  try {
    const { requestId } = req.body;
    await supabase.from('subscription_requests').update({ status: 'rejected' }).eq('id', requestId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  if (!isAdmin(req.body.userEmail)) return res.status(403).json({ error: 'Unauthorized' });

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
      // Fallback: build user list from subscription and request records
      const { data: reqs } = await supabase.from('subscription_requests').select('user_id, email, created_at');
      const userIds = new Set([
        ...subs.map(s => s.user_id),
        ...(reqs ? reqs.map(r => r.user_id) : [])
      ]);
      
      const emailMap = {};
      if (reqs) {
        reqs.forEach(r => {
          if (r.user_id && r.email) emailMap[r.user_id] = r.email;
        });
      }
      
      users = Array.from(userIds).map(uid => ({
        id: uid,
        email: emailMap[uid] || 'Subscribed User',
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
  if (!isAdmin(req.body.userEmail)) return res.status(403).json({ error: 'Unauthorized' });

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
