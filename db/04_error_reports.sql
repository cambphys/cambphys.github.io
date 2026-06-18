-- Error reports submitted from /courses/ "Report an error" form.
-- Any signed-in user can insert; only admin (cambphys@gmail.com) can read.

create table public.error_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users on delete set null,
  email text not null,
  category text not null,
  description text not null,
  resolved boolean default false
);

alter table public.error_reports enable row level security;

-- Anyone signed in can submit a report.
create policy "auth users can insert error reports"
  on public.error_reports for insert
  with check (auth.uid() is not null);

-- Only admin can read / update / delete.
create policy "admin reads error reports"
  on public.error_reports for select
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

create policy "admin updates error reports"
  on public.error_reports for update
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

create policy "admin deletes error reports"
  on public.error_reports for delete
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

-- ---------------------------------------------------------------------------
-- Email notification: send to cambphys@gmail.com whenever a report is filed.
-- Reuses the same Resend setup as 02_resend_email_trigger.sql. Paste your
-- Resend API key below (same key — starts with "re_...").
-- ---------------------------------------------------------------------------

create extension if not exists pg_net;

create or replace function public.notify_error_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resend_key text := '<PASTE_RESEND_API_KEY_HERE>';
  html text;
begin
  html := format(
    '<h2>New error report</h2>'
    '<p><b>From:</b> %s</p>'
    '<p><b>Category:</b> %s</p>'
    '<p><b>Description:</b></p>'
    '<pre style="white-space:pre-wrap;background:#f6f8fa;padding:10px;border-radius:6px;">%s</pre>'
    '<p style="font-size:12px;color:#666;">Report id: %s — view in Table Editor → error_reports.</p>',
    NEW.email,
    NEW.category,
    NEW.description,
    NEW.id::text
  );

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_key,
      'Content-Type',  'application/json'
    ),
    body := jsonb_build_object(
      'from', 'CambPhys <onboarding@resend.dev>',
      'to',   jsonb_build_array('cambphys@gmail.com'),
      'subject', 'Error report — ' || NEW.category,
      'html', html
    )
  );
  return NEW;
end;
$$;

drop trigger if exists error_report_email on public.error_reports;
create trigger error_report_email
  after insert on public.error_reports
  for each row execute function public.notify_error_report();
