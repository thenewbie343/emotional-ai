const { createClient } = require("@supabase/supabase-js");
const redis = require("../../redisClient");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware to check subscription limits for AI messages using Redis
async function checkMessageLimit(req, res, next) {
  try {
    const { userEmail } = req.body;
    
    // Admin is always allowed
    if (userEmail === 'sns@mayhere.com' || req.user?.email === 'sns@mayhere.com') {
      return next();
    }

    // 1. Get user ID and check if blocked
    let userId = req.body.userId || req.user?.id;
    let isBlocked = false;
    
    if (userId) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (!userError && userData && userData.user) {
          isBlocked = userData.user.user_metadata?.is_blocked || false;
        }
      } catch (e) {
        console.error('Failed to get user in subscription middleware:', e.message);
      }
    } else if (userEmail) {
      try {
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        if (!userError && users && users.users) {
          const user = users.users.find(u => u.email === userEmail);
          if (user) {
            userId = user.id;
            isBlocked = user.user_metadata?.is_blocked || false;
          }
        }
      } catch (e) {
        console.error('Failed to list users in subscription middleware:', e.message);
      }
    }

    if (isBlocked) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Your account has been blocked by the admin.',
        blocked: true
      });
    }

    if (!userId) return next();

    // 2. Check if user has active premium/standard subscription
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status, tier")
      .eq("user_id", userId)
      .single();

    const tier = (sub && sub.status === 'active') ? sub.tier : 'free';

    // Premium users have unlimited messages
    if (tier === 'premium') {
      return next();
    }

    // 3. Enforce Redis Rate Limiting
    let limit = 5;
    let windowSeconds = 86400; // 24h
    let key = `user:${userId}:msg_count`;
    let durationLabel = 'day';

    if (tier === 'standard') {
      limit = 100;
      windowSeconds = 2592000; // 30 days (monthly)
      key = `user:${userId}:msg_count:monthly`;
      durationLabel = 'month';
    }

    try {
      // Pipelined increment and TTL check for atomic operation
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      const count = results[0][1];
      const ttl = results[1][1];

      // If the key has no TTL (first increment in window), set the expiry window
      if (ttl === -1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > limit) {
        return res.status(429).json({ 
          error: 'Too Many Requests', 
          message: `You have reached your limit of ${limit} messages per ${durationLabel} on the ${tier.toUpperCase()} tier. Upgrade to Premium for unlimited access.`,
          requiresUpgrade: true,
          limit,
          resetInSeconds: ttl > 0 ? ttl : windowSeconds
        });
      }
    } catch (redisErr) {
      console.error('[Redis Rate Limiter Error] Bypassing limit checks (fail-open):', redisErr.message);
    }

    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    next(); // Fail open so we don't break the app if DB/middleware crashes
  }
}

module.exports = {
  checkMessageLimit
};
