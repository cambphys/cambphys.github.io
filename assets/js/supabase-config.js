// =============================================================================
// SUPABASE CONFIGURATION
// =============================================================================
// One-time setup:
//
// 1. Sign up at https://supabase.com, create a new project (~2 min).
// 2. Project Settings → API → copy "Project URL" and "anon public" key into
//    the two constants below.
// 3. Open db/01_setup.sql in this repo. Paste the whole file into Supabase
//    SQL Editor and run it. (Creates `progress`, `enrollments`,
//    `upgrade_requests`, the `payment-proofs` storage bucket, and all RLS.)
// 4. Authentication → Providers → Email: turn off "Confirm email" while
//    testing (so signups create a session immediately).
// 5. (Optional, for upgrade-request email notifications):
//    a. Sign up at https://resend.com using cambphys@gmail.com.
//    b. Create an API key (starts with "re_..."). Keep it private.
//    c. Open db/02_resend_email_trigger.sql, replace
//       <PASTE_RESEND_API_KEY_HERE> with your real key, then paste the whole
//       file into Supabase SQL Editor and run.
//
// The "anon" key below is safe to commit — RLS policies prevent abuse.
// =============================================================================

// Wrapped in an IIFE so the file can be loaded more than once on a page
// (e.g., explicitly by a page AND globally via _includes/scripts.html) without
// throwing "Identifier has already been declared".
(function () {
  if (window.cambphysSupabase) return;
  const SUPABASE_URL = "https://eqaepshmuptfnzldfhnv.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYWVwc2htdXB0Zm56bGRmaG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDc2NTcsImV4cCI6MjA5NTMyMzY1N30.vO_06pP2nhTzRWjFy8ZyLhx3XfjDjO8vXELPydHSLow";
  window.cambphysSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
