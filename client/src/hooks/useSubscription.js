import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSubscription(session) {
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const checkSub = async () => {
      try {
        // Admin gets premium automatically
        if (session.user.email === 'sns@mayhere.com') {
          setTier('premium');
          return;
        }

        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('tier, status, ends_at')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        
        if (data && data.status === 'active' && data.tier === 'premium') {
          // Check if expired
          if (new Date(data.ends_at) > new Date()) {
            setTier('premium');
          } else {
            // Update status to expired
            supabase.from('user_subscriptions').update({ status: 'expired' }).eq('user_id', session.user.id).then();
            setTier('free');
          }
        } else {
          setTier('free');
        }
      } catch (e) {
        setTier('free');
      } finally {
        setLoading(false);
      }
    };

    checkSub();
  }, [session]);

  return { tier, loading, isPremium: tier === 'premium' };
}
