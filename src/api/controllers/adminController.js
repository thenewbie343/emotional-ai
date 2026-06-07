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

    const { data: authData } = await supabase.auth.admin.listUsers();
    const usersMap = {};
    if (authData && authData.users) {
      authData.users.forEach(u => usersMap[u.id] = u.email);
    }

    const enrichedRequests = requests.map(req => ({
      ...req,
      user_email: usersMap[req.user_id] || 'Unknown'
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
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);

    const { error: subError } = await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      tier: tier || 'premium',
      status: 'active',
      valid_until: validUntil.toISOString(),
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
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: subs, error: subsError } = await supabase.from('user_subscriptions').select('*');
    if (subsError) throw subsError;

    const subsMap = {};
    subs.forEach(s => subsMap[s.user_id] = s);

    const users = authData.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      subscription: subsMap[u.id] || { tier: 'free', status: 'active' },
      is_blocked: u.user_metadata?.is_blocked || false
    }));

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
