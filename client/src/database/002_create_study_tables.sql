-- 002_create_study_tables.sql
-- Create Study Roadmaps Table
create table if not exists study_roadmaps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  syllabus jsonb not null, -- Contains [{"stage": "...", "lessons": [{"name": "...", "completed": false}]}]
  created_at timestamptz not null default now()
);

-- Enable RLS for study_roadmaps
alter table study_roadmaps enable row level security;

create policy "Users can manage own roadmaps" on study_roadmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Study Tasks Table
create table if not exists study_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_name text not null,
  scheduled_date date not null default current_date,
  completed boolean not null default false,
  duration_mins integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS for study_tasks
alter table study_tasks enable row level security;

create policy "Users can manage own study tasks" on study_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Study Logs Table (for contribution heatmap)
create table if not exists study_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  duration_mins integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS for study_logs
alter table study_logs enable row level security;

create policy "Users can manage own study logs" on study_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create Quiz Results Table
create table if not exists quiz_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  score integer not null,
  total_questions integer not null,
  created_at timestamptz not null default now()
);

-- Enable RLS for quiz_results
alter table quiz_results enable row level security;

create policy "Users can manage own quiz results" on quiz_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
