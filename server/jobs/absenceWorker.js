// server/jobs/absenceWorker.js
// Runs every 6 hours. Checks all users and updates their parasite state.
// npm install node-cron @supabase/supabase-js

const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");
const { computeParasiteState } = require("../services/parasiteEngine");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runAbsenceCheck() {
  console.log(`[ParasiteWorker] Running absence check at ${new Date().toISOString()}`);

  try {
    // Get all users who have a parasite state record
    // (i.e. users who have interacted with SIYA at least once)
    const { data: users, error } = await supabase
      .from("siya_parasite_state")
      .select("user_id, last_genuine_engagement, absence_tier");

    if (error) throw error;
    if (!users || users.length === 0) {
      console.log("[ParasiteWorker] No users to process.");
      return;
    }

    console.log(`[ParasiteWorker] Processing ${users.length} users...`);

    // Process in batches of 10 to avoid rate limiting
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const result = await computeParasiteState(user.user_id);
            if (result.tierIncreased) {
              console.log(
                `[ParasiteWorker] User ${user.user_id} moved to tier ${result.newTier}`
              );
            }
          } catch (e) {
            console.error(`[ParasiteWorker] Failed for user ${user.user_id}:`, e.message);
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`[ParasiteWorker] Done. Processed ${users.length} users.`);
  } catch (e) {
    console.error("[ParasiteWorker] Fatal error:", e);
  }
}

// Also initialize parasite state for new users who don't have a record yet
async function initNewUsers() {
  try {
    // Find users in sai_xp who don't have a parasite state yet
    const { data: xpUsers } = await supabase.from("sai_xp").select("user_id");
    const { data: parasiteUsers } = await supabase.from("siya_parasite_state").select("user_id");

    if (!xpUsers) return;

    const parasiteIds = new Set((parasiteUsers || []).map(p => p.user_id));
    const newUsers = xpUsers.filter(u => !parasiteIds.has(u.user_id));

    if (newUsers.length === 0) return;

    console.log(`[ParasiteWorker] Initializing ${newUsers.length} new users...`);

    await supabase.from("siya_parasite_state").insert(
      newUsers.map(u => ({
        user_id: u.user_id,
        last_genuine_engagement: new Date().toISOString(),
        absence_tier: 0,
        active_changes: [],
        artifacts: [],
      }))
    );
  } catch (e) {
    console.error("[ParasiteWorker] Init error:", e.message);
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function startAbsenceWorker() {
  // Run every 6 hours: 0:00, 6:00, 12:00, 18:00
  cron.schedule("0 */6 * * *", async () => {
    await initNewUsers();
    await runAbsenceCheck();
  });

  // Also run once on startup
  setTimeout(async () => {
    await initNewUsers();
    await runAbsenceCheck();
  }, 3000);

  console.log("[ParasiteWorker] Scheduled. Runs every 6 hours.");
}

module.exports = { startAbsenceWorker, runAbsenceCheck };
