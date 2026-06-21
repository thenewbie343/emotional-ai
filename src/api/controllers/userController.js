const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase Client with the secret service role key
// to perform administrative auth actions like deleting a user.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Controller to handle permanent account erasure (compliance with Right to Erasure / GDPR / DPDP).
 * Triggers cascade deletion of all user records linked to auth.users.
 */
exports.deleteUserAccount = async (req, res) => {
  try {
    // req.user.id is securely verified and populated by userAuth middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'User ID is missing from session.' 
      });
    }

    console.log(`[Privacy Erasure] Request received to delete user: ${userId}`);

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
      'sai_time_capsules'
    ];

    for (const table of tables) {
      try {
        await supabaseAdmin.from(table).delete().eq('user_id', userId);
      } catch (err) {
        console.warn(`[Privacy Erasure Cleanup Warning] Failed to delete from ${table}:`, err.message);
      }
    }

    // Call Supabase Auth Admin API to delete the user from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error(`[Privacy Erasure] Supabase Admin API failed for user ${userId}:`, error.message);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Failed to erase account.', 
        detail: error.message 
      });
    }

    console.log(`[Privacy Erasure] Successfully deleted user and triggered cascade: ${userId}`);
    return res.json({ 
      success: true, 
      message: 'Account and all associated psychological data have been permanently erased.' 
    });
  } catch (err) {
    console.error('[Privacy Erasure Error]:', err.message);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      detail: err.message 
    });
  }
};
