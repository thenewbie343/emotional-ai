const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function performRefills() {
  console.log('[Token Refill Worker] Starting refill job...');
  try {
    const now = new Date();
    
    // 1. Fetch all user subscriptions (to know who is premium)
    const { data: subs, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier');

    if (subsError) throw subsError;
    const premiumUserIds = new Set((subs || [])
      .filter(s => s.tier === 'premium')
      .map(s => s.user_id)
    );

    // 2. Fetch all user tokens
    const { data: userTokens, error: tokensError } = await supabase
      .from('user_tokens')
      .select('*');

    if (tokensError) throw tokensError;

    for (const tokens of (userTokens || [])) {
      const userId = tokens.user_id;
      const isPremium = premiumUserIds.has(userId);

      // Check debt-ban rule:
      // If user has active debt and it was created > 7 days ago, ban them!
      if (tokens.debt_time > 0 && tokens.debt_created_at) {
        const debtAgeDays = (now - new Date(tokens.debt_created_at)) / (1000 * 60 * 60 * 24);
        if (debtAgeDays >= 7) {
          console.log(`[Token Refill Worker] Banning user ${userId} due to outstanding debt age (${debtAgeDays.toFixed(1)} days).`);
          try {
            await supabase.auth.admin.updateUserById(userId, {
              user_metadata: { is_blocked: true }
            });
          } catch (banErr) {
            console.error(`Failed to ban user ${userId}:`, banErr.message);
          }
          continue; // Skip refills for banned users
        }
      }

      let updatedFields = {};

      if (isPremium) {
        // Premium User: Daily reset to 15 Lives, 300 Time
        updatedFields = {
          lives: 15,
          refill_time: 300,
          chat_session_spent: 0,
          last_refill_at: now.toISOString(),
          last_lives_refill_at: now.toISOString()
        };
      } else {
        // Free User: 2-day refill cycle check (48 hours)
        const lastRefill = new Date(tokens.last_refill_at || 0);
        const hoursSinceRefill = (now - lastRefill) / (1000 * 60 * 60);

        if (hoursSinceRefill >= 48) {
          // Time refills to exactly 30 (non-stacking)
          let targetRefill = 30;
          let newDebt = tokens.debt_time;
          let newDebtCreatedAt = tokens.debt_created_at;

          // Recover debt if any
          if (newDebt > 0) {
            if (newDebt >= 30) {
              newDebt -= 30;
              targetRefill = 0;
            } else {
              targetRefill -= newDebt;
              newDebt = 0;
              newDebtCreatedAt = null;
            }
          }

          updatedFields = {
            refill_time: targetRefill,
            debt_time: newDebt,
            debt_created_at: newDebtCreatedAt,
            chat_session_spent: 0,
            last_refill_at: now.toISOString()
          };
        }
      }

      // If any updates, save to DB
      if (Object.keys(updatedFields).length > 0) {
        const { error: updateError } = await supabase
          .from('user_tokens')
          .update(updatedFields)
          .eq('user_id', userId);

        if (updateError) {
          console.error(`Failed to update tokens for user ${userId}:`, updateError.message);
        }
      }
    }

    // 3. Clear expired unlocks
    // Premium unlocks expire at midnight daily.
    // Free unlocks expire Sunday at midnight.
    // So we can simply delete all rows from user_unlocked_features where expires_at <= now
    const { count, error: deleteError } = await supabase
      .from('user_unlocked_features')
      .delete({ count: 'exact' })
      .lte('expires_at', now.toISOString());

    if (deleteError) {
      console.error('[Token Refill Worker] Error clearing expired unlocks:', deleteError.message);
    } else {
      console.log(`[Token Refill Worker] Cleared ${count} expired feature unlocks.`);
    }

    console.log('[Token Refill Worker] Refill job finished successfully.');
  } catch (err) {
    console.error('[Token Refill Worker] Error during refills:', err.message || err);
  }
}

function startTokenRefillWorker() {
  console.log('[Token Refill Worker] Scheduled daily cron job (0 0 * * *).');
  // Runs every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    performRefills();
  });
}

module.exports = {
  startTokenRefillWorker,
  performRefills
};
