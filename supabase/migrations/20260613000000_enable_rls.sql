-- Enable Row Level Security
ALTER TABLE public.sai_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sai_time_capsules ENABLE ROW LEVEL SECURITY;

-- 1. Policies for sai_diary
DROP POLICY IF EXISTS "Users can manage their own diary entries" ON public.sai_diary;
CREATE POLICY "Users can manage their own diary entries"
  ON public.sai_diary
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Policies for sai_memories
DROP POLICY IF EXISTS "Users can manage their own memories" ON public.sai_memories;
CREATE POLICY "Users can manage their own memories"
  ON public.sai_memories
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Policies for sai_time_capsules
DROP POLICY IF EXISTS "Users can manage their own time capsules" ON public.sai_time_capsules;
CREATE POLICY "Users can manage their own time capsules"
  ON public.sai_time_capsules
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
