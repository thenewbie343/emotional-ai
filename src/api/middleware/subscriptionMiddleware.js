const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to check subscription limits for AI messages
async function checkMessageLimit(req, res, next) {
  try {
    const { userEmail } = req.body;
    
    // Admin is always allowed
    if (userEmail === 'sns@mayhere.com') {
      return next();
    }

    if (!userEmail) {
      // If no email provided, maybe fallback to free limit logic based on IP,
      // but assuming frontend always passes userEmail for authenticated users
      return next();
    }

    // 1. Get user ID (check body first, fallback to email lookup)
    let userId = req.body.userId;
    
    if (!userId && userEmail) {
      try {
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        if (!userError && users && users.users) {
          const user = users.users.find(u => u.email === userEmail);
          if (user) userId = user.id;
        }
      } catch (e) {
        console.error('Failed to list users in subscription middleware:', e.message);
      }
    }

    if (!userId) return next();

    // 2. Check if user has active premium subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, tier")
      .eq("user_id", userId)
      .single();

    if (sub && sub.status === 'active' && sub.tier === 'premium') {
      return next(); // Premium users have unlimited messages
    }

    // 3. Free user: check daily message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .gte('created_at', today.toISOString());

    if (error) {
      console.error('Error counting messages:', error);
      return next();
    }

    if (count >= 10) {
      return res.status(403).json({ 
        error: 'Payment Required', 
        message: 'You have reached your daily limit of 10 messages on the Free tier. Upgrade to Premium for unlimited access.',
        requiresUpgrade: true
      });
    }

    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    next(); // Fail open so we don't break the app if DB is down
  }
}

module.exports = {
  checkMessageLimit
};
