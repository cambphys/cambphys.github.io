-- Send an email to cambphys@gmail.com whenever someone submits the upgrade form.
-- Prereq: sign up at https://resend.com using cambphys@gmail.com, create an
-- API key (starts with "re_..."), and paste it below where indicated.
-- Then run this whole file in Supabase SQL Editor.

create extension if not exists pg_net;

-- For existing installs that pre-date the inline-image feature:
alter table public.upgrade_requests
  add column if not exists proof_signed_url text;

create or replace function public.notify_upgrade_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resend_key text := '<PASTE_RESEND_API_KEY_HERE>';
  html text;
  image_block text;
begin
  if NEW.proof_signed_url is not null then
    image_block := format(
      '<p><b>Payment screenshot:</b></p>'
      '<a href="%s" target="_blank">'
      '<img src="%s" alt="Payment proof" '
      'style="max-width:520px;width:100%%;height:auto;'
      'border:1px solid #ddd;border-radius:6px;display:block;"/>'
      '</a>'
      '<p style="font-size:12px;color:#666;">'
      'If the image doesn''t load, '
      '<a href="%s">click here to view it</a> '
      '(link valid ~90 days; admin page always has a fresh link).</p>',
      NEW.proof_signed_url, NEW.proof_signed_url, NEW.proof_signed_url
    );
  else
    image_block := format(
      '<p><b>Payment screenshot:</b> %s (open in Supabase Storage)</p>',
      coalesce(NEW.proof_image_path, '(none)')
    );
  end if;

  html := format(
    '<h2>New upgrade request</h2>'
    '<p><b>Course:</b> %s</p>'
    '<p><b>Student:</b> %s %s (Grade %s) — %s</p>'
    '<p><b>State:</b> %s</p>'
    '<p><b>Parent:</b> %s &lt;%s&gt;</p>'
    '<p><b>Heard from:</b> %s%s</p>'
    '%s'
    '<p>Review in dashboard → /admin/ or Table Editor → upgrade_requests (id %s).</p>',
    NEW.course_id,
    NEW.student_first_name, NEW.student_last_name,
    NEW.student_grade, NEW.student_email,
    NEW.state,
    NEW.parent_name, NEW.parent_email,
    coalesce(array_to_string(NEW.referral_sources, ', '), '(none)'),
    case when NEW.referral_other is not null and NEW.referral_other <> ''
         then ' — ' || NEW.referral_other else '' end,
    image_block,
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
      'subject',
          'New upgrade request — ' || NEW.course_id || ' — '
          || NEW.student_first_name || ' ' || NEW.student_last_name,
      'html', html
    )
  );
  return NEW;
end;
$$;

drop trigger if exists upgrade_request_email on public.upgrade_requests;
create trigger upgrade_request_email
  after insert on public.upgrade_requests
  for each row execute function public.notify_upgrade_request();

-- Later (when sending from noreply@cambphys.com instead of onboarding@resend.dev):
-- add cambphys.com as a verified domain in Resend, add the 3 DNS records they
-- show you, then change the 'from' line above.
