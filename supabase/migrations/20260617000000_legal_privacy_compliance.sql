-- ==========================================================
-- Migration: Legal & Privacy Compliance - Right to Erasure
-- Created: June 17, 2026
-- Scope: India DPDP Act 2023 & GDPR Compliance
-- ==========================================================

-- Dynamic PL/pgSQL block to find and drop any existing foreign key constraints
-- referencing auth.users on columns 'user_id' in our psychological tables.
-- This guarantees the script executes without conflicts regardless of previous constraint names.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('sai_diary', 'sai_memories', 'sai_dreams', 'sai_wellness', 'sai_time_capsules')
            AND kcu.column_name = 'user_id'
            AND ccu.table_name = 'users'
            AND ccu.table_schema = 'auth'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 1. Table: sai_diary
-- Drop standard fkey if it was not auto-detected, and establish cascade fkey
ALTER TABLE public.sai_diary DROP CONSTRAINT IF EXISTS sai_diary_user_id_fkey;
ALTER TABLE public.sai_diary 
  ADD CONSTRAINT sai_diary_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 2. Table: sai_memories
ALTER TABLE public.sai_memories DROP CONSTRAINT IF EXISTS sai_memories_user_id_fkey;
ALTER TABLE public.sai_memories 
  ADD CONSTRAINT sai_memories_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 3. Table: sai_dreams
ALTER TABLE public.sai_dreams DROP CONSTRAINT IF EXISTS sai_dreams_user_id_fkey;
ALTER TABLE public.sai_dreams 
  ADD CONSTRAINT sai_dreams_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 4. Table: sai_wellness
ALTER TABLE public.sai_wellness DROP CONSTRAINT IF EXISTS sai_wellness_user_id_fkey;
ALTER TABLE public.sai_wellness 
  ADD CONSTRAINT sai_wellness_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 5. Table: sai_time_capsules
ALTER TABLE public.sai_time_capsules DROP CONSTRAINT IF EXISTS sai_time_capsules_user_id_fkey;
ALTER TABLE public.sai_time_capsules 
  ADD CONSTRAINT sai_time_capsules_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add indexes on user_id columns for these tables to optimize join performance and cascade operations
CREATE INDEX IF NOT EXISTS idx_sai_diary_user_id ON public.sai_diary(user_id);
CREATE INDEX IF NOT EXISTS idx_sai_memories_user_id ON public.sai_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_sai_dreams_user_id ON public.sai_dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_sai_wellness_user_id ON public.sai_wellness(user_id);
CREATE INDEX IF NOT EXISTS idx_sai_time_capsules_user_id ON public.sai_time_capsules(user_id);
