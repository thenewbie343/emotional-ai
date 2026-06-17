const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function userAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or malformed Authorization header.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Server-side verification of the token directly via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired session token.' 
      });
    }

    // Attach verified user object to request
    req.user = user;
    next();
  } catch (err) {
    console.error('[User Auth Middleware Error]:', err.message);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      detail: err.message 
    });
  }
}

module.exports = userAuth;
