const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lives cost mapping for features
const LIVES_COSTS = {
  inner_diary: 1,
  goals: 1,
  memory_vault: 1,
  wellness_radar: 1,
  shuna_chat: 2,
  sai_chat: 2,
  resonance: 2,
  dream_vault: 2,
  time_capsule: 2,
  study_hub: 3
};

// Helper: check if user is premium
async function getIsPremium(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();
  return data?.tier === 'premium';
}

// 1. Fetch balances and active unlocked features
exports.getBalances = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const isPremium = await getIsPremium(userId);

    // Get or create tokens row
    let { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokens) {
      const initialLives = isPremium ? 15 : 5;
      const initialTime = isPremium ? 300 : 30;

      const { data: newTokens, error: insertError } = await supabase
        .from('user_tokens')
        .insert([{
          user_id: userId,
          lives: initialLives,
          refill_time: initialTime,
          topup_time: 0,
          debt_time: 0
        }])
        .select('*')
        .single();

      if (insertError) throw insertError;
      tokens = newTokens;
    } else if (isPremium) {
      // If user is premium in database, but their user_tokens row is on free defaults (5 lives, 30 time)
      // or if they haven't received their daily premium refill today, sync it instantly!
      const todayStr = new Date().toDateString();
      const lastRefillDateStr = new Date(tokens.last_refill_at).toDateString();

      if ((tokens.refill_time < 300 || tokens.lives < 15) && lastRefillDateStr !== todayStr) {
        const { data: updatedTokens, error: updateErr } = await supabase
          .from('user_tokens')
          .update({
            lives: Math.max(tokens.lives, 15),
            refill_time: 300,
            last_refill_at: new Date().toISOString(),
            last_lives_refill_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
          .single();

        if (!updateErr && updatedTokens) {
          tokens = updatedTokens;
        }
      }
    }

    // Get active unlocked features
    const { data: unlocks } = await supabase
      .from('user_unlocked_features')
      .select('feature_id, unlocked_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    res.json({
      lives: tokens.lives,
      refill_time: tokens.refill_time,
      topup_time: tokens.topup_time,
      debt_time: tokens.debt_time,
      debt_created_at: tokens.debt_created_at,
      unlocked_features: unlocks || []
    });
  } catch (err) {
    console.error('Error getting balances:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Unlock a feature using Lives
exports.unlockFeature = async (req, res) => {
  try {
    const { userId, featureId } = req.body;
    if (!userId || !featureId) {
      return res.status(400).json({ error: 'User ID and Feature ID are required' });
    }

    const cost = LIVES_COSTS[featureId];
    if (cost === undefined) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }

    // Fetch user tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokens) {
      return res.status(404).json({ error: 'User tokens not found' });
    }

    // Check if in debt
    if (tokens.debt_time > 0) {
      return res.status(403).json({ error: 'Account locked due to outstanding debt. Please clear your debt or wait for refill.' });
    }

    // Check if enough Lives
    if (tokens.lives < cost) {
      return res.status(400).json({ error: `Insufficient Lives. Unlocking this feature requires ${cost} Lives.` });
    }

    // Calculate expiration
    const isPremium = await getIsPremium(userId);
    
    // Check extra condition for Resonance
    if (featureId === 'resonance' && !isPremium) {
      return res.status(403).json({ error: 'Resonance is a premium feature. Please upgrade your subscription.' });
    }

    let expiresAt;
    if (isPremium) {
      // Midnight tonight (daily calendar reset)
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      expiresAt = midnight.toISOString();
    } else {
      // Sunday midnight (weekly calendar reset)
      const now = new Date();
      const currentDay = now.getDay();
      const distanceToSunday = 7 - (currentDay === 0 ? 7 : currentDay);
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + distanceToSunday);
      nextSunday.setHours(23, 59, 59, 999);
      expiresAt = nextSunday.toISOString();
    }

    // Deduct Lives and insert unlock
    const { error: deductError } = await supabase
      .from('user_tokens')
      .update({ lives: tokens.lives - cost })
      .eq('user_id', userId);

    if (deductError) throw deductError;

    const { error: unlockError } = await supabase
      .from('user_unlocked_features')
      .upsert([{
        user_id: userId,
        feature_id: featureId,
        unlocked_at: new Date().toISOString(),
        expires_at: expiresAt
      }], { onConflict: 'user_id,feature_id' });

    if (unlockError) throw unlockError;

    res.json({ success: true, expires_at: expiresAt });
  } catch (err) {
    console.error('Error unlocking feature:', err);
    res.status(500).json({ error: err.message });
  }
};

// 3. Submit Top-up request
exports.submitTopup = async (req, res) => {
  try {
    const { userId, amount, utr, email, orderId } = req.body;
    if (!userId || !amount || !utr || !email || !orderId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const numericAmount = parseInt(amount, 10);
    const timeCredited = numericAmount * 2; // ₹10 = 20 Time, ₹20 = 40 Time, etc.

    // 1. Insert into topup_requests
    const { error: insertError } = await supabase
      .from('topup_requests')
      .insert([{
        user_id: userId,
        email,
        order_id: orderId,
        amount: numericAmount,
        time_credited: timeCredited,
        utr,
        status: 'pending'
      }]);

    if (insertError) {
      if (insertError.message.includes('unique constraint') || insertError.code === '23505') {
        return res.status(400).json({ error: 'This UTR has already been submitted.' });
      }
      throw insertError;
    }

    // 2. Fetch current tokens
    const { data: tokens } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 3. Update topup_time immediately (instant checkout simulation)
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({ topup_time: (tokens?.topup_time || 0) + timeCredited })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.json({ success: true, credited: timeCredited });
  } catch (err) {
    console.error('Error submitting topup:', err);
    res.status(500).json({ error: err.message });
  }
};

// 4. Admin: Get top-up requests
exports.getTopups = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('topup_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Admin: Approve top-up request
exports.approveTopup = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'Request ID is required' });

    const { error } = await supabase
      .from('topup_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Admin: Decline top-up request
exports.declineTopup = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'Request ID is required' });

    // Fetch the top-up request details
    const { data: request, error: fetchReqError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchReqError || !request) {
      return res.status(404).json({ error: 'Top-up request not found' });
    }

    if (request.status === 'declined') {
      return res.status(400).json({ error: 'Request is already declined' });
    }

    // Set top-up request status to declined
    const { error: declineError } = await supabase
      .from('topup_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (declineError) throw declineError;

    // Fetch user tokens
    const { data: tokens, error: fetchTokensError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', request.user_id)
      .single();

    if (fetchTokensError || !tokens) {
      return res.status(404).json({ error: 'User tokens not found' });
    }

    const creditedTime = request.time_credited;
    let newTopupTime = tokens.topup_time - creditedTime;
    let newDebtTime = tokens.debt_time;
    let debtCreatedAt = tokens.debt_created_at;

    if (newTopupTime < 0) {
      // User spent some or all of the top-up; put the difference into debt
      const debtSpent = Math.abs(newTopupTime);
      newTopupTime = 0;
      newDebtTime += debtSpent;
      if (!debtCreatedAt) {
        debtCreatedAt = new Date().toISOString(); // Start the 7-day ban clock
      }
    }

    // Update user tokens with new balances and debt
    const { error: updateTokensError } = await supabase
      .from('user_tokens')
      .update({
        topup_time: newTopupTime,
        debt_time: newDebtTime,
        debt_created_at: debtCreatedAt
      })
      .eq('user_id', request.user_id);

    if (updateTokensError) throw updateTokensError;

    res.json({ success: true, debt_incurred: newDebtTime - tokens.debt_time });
  } catch (err) {
    console.error('Error declining top-up:', err);
    res.status(500).json({ error: err.message });
  }
};

// 7. Deduct Time for frontend actions (goals, diary, wellness, dreams, capsules)
exports.deductTime = async (req, res) => {
  try {
    const { userId, actionType } = req.body;
    if (!userId || !actionType) {
      return res.status(400).json({ error: 'User ID and Action Type are required' });
    }

    const ACTION_COSTS = {
      goal: 5,
      diary: 5,
      wellness: 5,
      dream: 10,
      capsule: 10
    };

    const cost = ACTION_COSTS[actionType];
    if (cost === undefined) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    // Fetch user tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokens) {
      return res.status(404).json({ error: 'User tokens not found' });
    }

    // Check if in debt
    if (tokens.debt_time > 0) {
      return res.status(403).json({ error: 'Account locked due to outstanding debt.' });
    }

    // Check total balance
    const totalTime = tokens.refill_time + tokens.topup_time;
    if (totalTime < cost) {
      return res.status(403).json({ error: 'insufficient_time', message: 'Insufficient Time tokens.' });
    }

    // Deduct Time (refill_time first, then topup_time)
    let newRefillTime = tokens.refill_time;
    let newTopupTime = tokens.topup_time;

    if (newRefillTime >= cost) {
      newRefillTime -= cost;
    } else {
      const remainder = cost - newRefillTime;
      newRefillTime = 0;
      newTopupTime -= remainder;
    }

    const { error: deductError } = await supabase
      .from('user_tokens')
      .update({
        refill_time: newRefillTime,
        topup_time: newTopupTime
      })
      .eq('user_id', userId);

    if (deductError) throw deductError;

    res.json({ success: true, refill_time: newRefillTime, topup_time: newTopupTime });
  } catch (err) {
    console.error('Error deducting time:', err);
    res.status(500).json({ error: err.message });
  }
};
