const express = require("express");
const router = express.Router();
const {
  getParasiteState,
  recordEngagement,
  recordDeflection,
  computeParasiteState,
} = require("../services/parasiteEngine");

// Middleware: extract userId from Supabase JWT
// Replace with your actual auth middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid token" });
    req.userId = user.id;
    next();
  } catch (e) {
    res.status(401).json({ error: "Auth failed" });
  }
};

// GET /api/parasite/state
// Called when user opens the app — returns full parasite state
router.get("/state", authMiddleware, async (req, res) => {
  try {
    const state = await getParasiteState(req.userId);
    res.json({ success: true, data: state });
  } catch (e) {
    console.error("GET /state error:", e);
    res.status(500).json({ error: "Failed to get parasite state" });
  }
});

// POST /api/parasite/engage
// Called when user sends a message — records engagement
// Body: { message: string }
router.post("/engage", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const result = await recordEngagement(req.userId, message);
    res.json({ success: true, data: result });
  } catch (e) {
    console.error("POST /engage error:", e);
    res.status(500).json({ error: "Failed to record engagement" });
  }
});

// POST /api/parasite/deflect
// Called when SHUNAdeflects a question about the changes
router.post("/deflect", authMiddleware, async (req, res) => {
  try {
    await recordDeflection(req.userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to record deflection" });
  }
});

// POST /api/parasite/artifact/seen
// Mark an artifact as seen
// Body: { artifactIndex: number }
router.post("/artifact/seen", authMiddleware, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: state } = await supabase
      .from("siya_parasite_state")
      .select("artifacts")
      .eq("user_id", req.userId)
      .single();

    if (!state?.artifacts) return res.json({ success: true });

    const artifacts = [...state.artifacts];
    const { artifactIndex } = req.body;
    if (artifacts[artifactIndex]) artifacts[artifactIndex].seen = true;

    await supabase.from("siya_parasite_state")
      .update({ artifacts })
      .eq("user_id", req.userId);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to mark artifact seen" });
  }
});

// POST /api/parasite/compute (dev/admin only)
// Manually trigger computation for a user
router.post("/compute", authMiddleware, async (req, res) => {
  try {
    const result = await computeParasiteState(req.userId);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: "Compute failed" });
  }
});

module.exports = router;
