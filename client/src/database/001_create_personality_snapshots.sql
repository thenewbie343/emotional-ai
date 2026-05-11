-- 001_create_personality_snapshots.sql
create extension if not exists pgcrypto;

create table personality_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  snapshot_date timestamptz not null default now(),
  dimensions jsonb not null, -- e.g. {"openness":72,"empathy":45,...}
  source text not null, -- 'weekly_aggregate' | 'milestone' | 'manual'
  meta jsonb default '{}' -- optional: {messages_count:42, avg_sentiment:0.12}
);

-- Example RLS: only allow owner to read/write
alter table personality_snapshots enable row level security;

create policy "users can manage own snapshots" on personality_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
