-- 1. Table to store user token balances
CREATE TABLE IF NOT EXISTS public.user_tokens (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    lives INTEGER DEFAULT 5 NOT NULL,
    refill_time INTEGER DEFAULT 30 NOT NULL,
    topup_time INTEGER DEFAULT 0 NOT NULL,
    debt_time INTEGER DEFAULT 0 NOT NULL,
    chat_session_spent INTEGER DEFAULT 0 NOT NULL,
    debt_created_at TIMESTAMP WITH TIME ZONE,
    last_refill_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_lives_refill_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_tokens
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Allow individuals to read their own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Allow individuals to update their own tokens" ON public.user_tokens;

CREATE POLICY "Allow individuals to read their own tokens" 
    ON public.user_tokens FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to update their own tokens" 
    ON public.user_tokens FOR UPDATE 
    USING (auth.uid() = user_id);

-- 2. Table to store unlocked features and their expiration
CREATE TABLE IF NOT EXISTS public.user_unlocked_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    feature_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id, feature_id)
);

-- Enable RLS on user_unlocked_features
ALTER TABLE public.user_unlocked_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individuals to read their own unlocks" ON public.user_unlocked_features;
DROP POLICY IF EXISTS "Allow individuals to manage their own unlocks" ON public.user_unlocked_features;

CREATE POLICY "Allow individuals to read their own unlocks" 
    ON public.user_unlocked_features FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to manage their own unlocks" 
    ON public.user_unlocked_features FOR ALL 
    USING (auth.uid() = user_id);

-- 3. Table to store top-up transactions
CREATE TABLE IF NOT EXISTS public.topup_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    order_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    time_credited INTEGER NOT NULL,
    utr TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'declined'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on topup_requests
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individuals to read their own topups" ON public.topup_requests;
DROP POLICY IF EXISTS "Allow individuals to insert their own topups" ON public.topup_requests;

CREATE POLICY "Allow individuals to read their own topups" 
    ON public.topup_requests FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individuals to insert their own topups" 
    ON public.topup_requests FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. Function & Trigger to automatically create a user_tokens row on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_tokens (user_id, lives, refill_time, topup_time, debt_time, chat_session_spent)
    VALUES (NEW.id, 5, 30, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger check: create trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_tokens') THEN
        CREATE TRIGGER on_auth_user_created_tokens
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tokens();
    END IF;
END $$;
