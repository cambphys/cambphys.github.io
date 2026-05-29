-- Cambridge Physics Academy — initial Supabase setup.
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses "if not exists" / "on conflict" where possible.

-- ---------------------------------------------------------------------------
-- progress: per-user, per-lesson tracking
-- ---------------------------------------------------------------------------
create table if not exists public.progress (
  user_id uuid references auth.users on delete cascade,
  lesson_id text not null,
  completed boolean default false,
  score numeric,
  last_accessed timestamptz default now(),
  data jsonb default '{}'::jsonb,
  primary key (user_id, lesson_id)
);
alter table public.progress enable row level security;

drop policy if exists "users read own progress"   on public.progress;
drop policy if exists "users write own progress"  on public.progress;
drop policy if exists "users update own progress" on public.progress;

create policy "users read own progress"
  on public.progress for select using (auth.uid() = user_id);
create policy "users write own progress"
  on public.progress for insert with check (auth.uid() = user_id);
create policy "users update own progress"
  on public.progress for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- enrollments: who has been "upgraded" for which course
-- ---------------------------------------------------------------------------
create table if not exists public.enrollments (
  user_id uuid references auth.users on delete cascade,
  course_id text not null,                  -- 'ap', 'fma', 'usapho'
  upgraded boolean default false,
  created_at timestamptz default now(),
  primary key (user_id, course_id)
);
alter table public.enrollments enable row level security;

drop policy if exists "users read own enrollments" on public.enrollments;
create policy "users read own enrollments"
  on public.enrollments for select using (auth.uid() = user_id);
-- No insert/update policy — only admin (SQL Editor / service role) grants upgrades:
--   insert into public.enrollments (user_id, course_id, upgraded)
--   values ('<user-uuid>', 'ap', true)
--   on conflict (user_id, course_id) do update set upgraded = true;

-- ---------------------------------------------------------------------------
-- upgrade_requests: form submissions from /upgrade/
-- ---------------------------------------------------------------------------
create table if not exists public.upgrade_requests (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  course_id text not null,
  parent_email text not null,
  parent_name text not null,
  student_email text not null,
  student_first_name text not null,
  student_last_name text not null,
  student_grade text not null,
  state text not null,
  referral_sources text[],
  referral_other text,
  proof_image_path text,
  proof_signed_url text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table public.upgrade_requests enable row level security;

drop policy if exists "users insert own upgrade requests" on public.upgrade_requests;
create policy "users insert own upgrade requests"
  on public.upgrade_requests for insert
  with check (auth.uid() = user_id);
-- No SELECT policy — admin views these in Table Editor → upgrade_requests.

-- ---------------------------------------------------------------------------
-- Storage bucket for payment screenshots
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('payment-proofs', 'payment-proofs', false)
  on conflict (id) do nothing;

drop policy if exists "users upload own proofs" on storage.objects;
create policy "users upload own proofs"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users read own proofs" on storage.objects;
create policy "users read own proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
