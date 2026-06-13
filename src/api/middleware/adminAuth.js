const { createClient } = require("@supabase/supabase-js");

// Initialize client using service role key to allow admin operations if needed
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = 'sns@mayhere.com';

async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Server-side verification of the token directly via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session token.' });
    }

    // Strictly check email from the verified JWT token payload
    if (user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin access required.' });
    }

    // Attach verified user object to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[Admin Auth Middleware Error]:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', detail: err.message });
  }
}

module.exports = adminAuth;
