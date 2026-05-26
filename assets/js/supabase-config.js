// =============================================================================
// SUPABASE CONFIGURATION
// =============================================================================
// One-time setup (do this BEFORE the login page will work):
//
// 1. Go to https://supabase.com and sign up (free).
// 2. Click "New project". Pick any name (e.g. "cambphys"), set a database
//    password, choose a region near you (e.g. us-east-1).
// 3. Wait ~2 minutes for it to spin up.
// 4. In the project dashboard, open "Project Settings" → "API".
// 5. Copy the "Project URL" and the "anon public" key into the two
//    constants below, replacing the placeholders.
// 6. Open the "SQL Editor" in the Supabase dashboard, click "New query",
//    paste the SQL block below, and click "Run". This creates the
//    `progress` table that stores per-user lesson progress.
//
//   -- ===== BEGIN SQL =====
//   create table public.progress (
//     user_id uuid references auth.users on delete cascade,
//     lesson_id text not null,
//     completed boolean default false,
//     score numeric,
//     last_accessed timestamptz default now(),
//     data jsonb default '{}'::jsonb,
//     primary key (user_id, lesson_id)
//   );
//   alter table public.progress enable row level security;
//   create policy "users read own progress"
//     on public.progress for select using (auth.uid() = user_id);
//   create policy "users write own progress"
//     on public.progress for insert with check (auth.uid() = user_id);
//   create policy "users update own progress"
//     on public.progress for update using (auth.uid() = user_id);
//
//   create table public.enrollments (
//     user_id uuid references auth.users on delete cascade,
//     course_id text not null,            -- 'ap', 'fma', 'usapho'
//     upgraded boolean default false,
//     created_at timestamptz default now(),
//     primary key (user_id, course_id)
//   );
//   alter table public.enrollments enable row level security;
//   create policy "users read own enrollments"
//     on public.enrollments for select using (auth.uid() = user_id);
//   -- Note: there is NO insert/update policy for enrollments. Regular users
//   -- cannot grant themselves upgrades from the browser. To upgrade a user
//   -- manually, run this in Supabase SQL Editor (admin/service role bypasses RLS):
//   --   insert into public.enrollments (user_id, course_id, upgraded)
//   --   values ('<user-uuid>', 'ap', true)
//   --   on conflict (user_id, course_id) do update set upgraded = true;
//   -- (Find user_uuid in Authentication → Users in the dashboard.)
//   -- ===== END SQL =====
//
// 7. (Optional) In "Authentication" → "Providers", disable "Confirm email"
//    while testing so signups work without an email link.
//
// The "anon" key is safe to commit publicly — it only allows actions
// permitted by your Row Level Security policies (which we set above).
// =============================================================================

const SUPABASE_URL = "https://eqaepshmuptfnzldfhnv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYWVwc2htdXB0Zm56bGRmaG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDc2NTcsImV4cCI6MjA5NTMyMzY1N30.vO_06pP2nhTzRWjFy8ZyLhx3XfjDjO8vXELPydHSLow";

window.cambphysSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
