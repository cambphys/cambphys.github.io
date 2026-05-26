// Auth + progress helpers. Depends on window.cambphysSupabase from supabase-config.js.
(function () {
  const sb = window.cambphysSupabase;

  async function signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signOut() {
    return await sb.auth.signOut();
  }

  async function currentUser() {
    const { data } = await sb.auth.getUser();
    return data.user;
  }

  // Progress helpers — each user has one row per lesson_id.
  // `data` is a flexible JSONB column for whatever you want to track later
  // (e.g. { last_video_position: 312, quiz_attempts: 2, notes: "..." }).
  async function getProgress(lessonId) {
    const user = await currentUser();
    if (!user) return null;
    const { data, error } = await sb
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (error) console.error(error);
    return data;
  }

  async function getAllProgress() {
    const user = await currentUser();
    if (!user) return [];
    const { data, error } = await sb
      .from("progress")
      .select("*")
      .eq("user_id", user.id)
      .order("last_accessed", { ascending: false });
    if (error) console.error(error);
    return data || [];
  }

  async function saveProgress(lessonId, fields) {
    const user = await currentUser();
    if (!user) return { error: "not signed in" };
    const row = {
      user_id: user.id,
      lesson_id: lessonId,
      last_accessed: new Date().toISOString(),
      ...fields,
    };
    const { data, error } = await sb
      .from("progress")
      .upsert(row, { onConflict: "user_id,lesson_id" })
      .select()
      .maybeSingle();
    return { data, error };
  }

  // Returns true if the current user has been upgraded for this course.
  async function isUpgraded(courseId) {
    const user = await currentUser();
    if (!user) return false;
    const { data, error } = await sb
      .from("enrollments")
      .select("upgraded")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error) { console.error(error); return false; }
    return !!(data && data.upgraded);
  }

  // Redirects to /login/ if not signed in. Call at top of any gated page.
  async function requireAuth() {
    const user = await currentUser();
    if (!user) window.location.href = "/login/";
    return user;
  }

  window.cambphysAuth = {
    signUp,
    signIn,
    signOut,
    currentUser,
    getProgress,
    getAllProgress,
    saveProgress,
    isUpgraded,
    requireAuth,
  };
})();
