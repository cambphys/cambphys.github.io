-- Admin-only policies. Run this once in Supabase SQL Editor.
-- Admin is identified by their Supabase Auth email == 'cambphys@gmail.com'.
-- If you want a different/additional admin, change the email below in each
-- policy and re-run, OR add additional policies with a different email.
-- The check uses the Postgres-side JWT, so it cannot be spoofed from the
-- browser; a user pretending to be admin would still be denied at the DB.

-- ---------------------------------------------------------------------------
-- upgrade_requests: admin can read all rows and update status
-- ---------------------------------------------------------------------------
drop policy if exists "admin reads all upgrade requests" on public.upgrade_requests;
create policy "admin reads all upgrade requests"
  on public.upgrade_requests for select
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

drop policy if exists "admin updates upgrade requests" on public.upgrade_requests;
create policy "admin updates upgrade requests"
  on public.upgrade_requests for update
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

drop policy if exists "admin deletes upgrade requests" on public.upgrade_requests;
create policy "admin deletes upgrade requests"
  on public.upgrade_requests for delete
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

-- ---------------------------------------------------------------------------
-- enrollments: admin can read all + grant upgrades from the browser
-- (Regular users still only see their own row, via the existing user policy.)
-- ---------------------------------------------------------------------------
drop policy if exists "admin reads all enrollments" on public.enrollments;
create policy "admin reads all enrollments"
  on public.enrollments for select
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

drop policy if exists "admin grants enrollments" on public.enrollments;
create policy "admin grants enrollments"
  on public.enrollments for insert
  with check ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

drop policy if exists "admin updates enrollments" on public.enrollments;
create policy "admin updates enrollments"
  on public.enrollments for update
  using ((auth.jwt() ->> 'email') = 'cambphys@gmail.com');

-- ---------------------------------------------------------------------------
-- Storage: admin can read payment screenshots (for signed URL generation).
-- ---------------------------------------------------------------------------
drop policy if exists "admin reads payment proofs" on storage.objects;
create policy "admin reads payment proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and (auth.jwt() ->> 'email') = 'cambphys@gmail.com'
  );

drop policy if exists "admin deletes payment proofs" on storage.objects;
create policy "admin deletes payment proofs"
  on storage.objects for delete
  using (
    bucket_id = 'payment-proofs'
    and (auth.jwt() ->> 'email') = 'cambphys@gmail.com'
  );
