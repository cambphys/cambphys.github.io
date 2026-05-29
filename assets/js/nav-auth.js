// Swap the nav's "Log In" link for "Log Out" when the user is signed in.
// Runs on every page (included via _includes/scripts.html).
(async function () {
  if (!window.cambphysAuth) return;

  let isSigningOut = false;

  function applyState(user) {
    // Don't redraw mid-sign-out — otherwise the button flips back to "Log In"
    // before the redirect fires, which looks broken and lets the user re-click.
    if (isSigningOut) return;

    // Hide nav links that only make sense when logged in (e.g. "My Courses").
    document.querySelectorAll('#site-nav a').forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/$/, "");
      if (href.endsWith("/courses")) {
        const li = a.closest("li");
        if (li) li.style.display = user ? "" : "none";
      }
    });

    document.querySelectorAll('#site-nav a').forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/$/, "");
      const isLogin  = href.endsWith("/login");
      const isLogout = a.dataset.cpAuthLink === "logout";
      if (!isLogin && !isLogout) return;

      if (user) {
        a.textContent = "Log Out";
        a.setAttribute("href", "#");
        a.dataset.cpAuthLink = "logout";
        a.onclick = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (isSigningOut) return;
          isSigningOut = true;
          a.textContent = "Logging out…";
          a.style.pointerEvents = "none";
          // Fire signOut in the background — don't block the redirect on it.
          // Supabase clears the local session synchronously; the network call
          // to invalidate the refresh token can finish (or fail) after we've
          // already navigated away.
          try {
            const p = window.cambphysAuth.signOut();
            if (p && typeof p.catch === "function") p.catch(err => console.error("signOut error:", err));
          } catch (err) {
            console.error("signOut threw:", err);
          }
          // Tiny delay lets the local session clear before the new page loads.
          setTimeout(() => window.location.replace("/"), 50);
        };
      } else {
        a.textContent = "Log In";
        a.setAttribute("href", "/login/");
        delete a.dataset.cpAuthLink;
        a.onclick = null;
      }
    });
  }

  // Insert/remove an "Admin" nav link based on isAdmin().
  async function applyAdminLink() {
    const links = document.querySelector("#site-nav .visible-links");
    if (!links) return;
    const existing = links.querySelector('[data-cp-admin-link]');
    const isAdmin = await window.cambphysAuth.isAdmin();
    if (isAdmin && !existing) {
      const li = document.createElement("li");
      li.className = "masthead__menu-item";
      li.dataset.cpAdminLink = "1";
      li.innerHTML = '<a href="/admin/" data-cp-admin-link="1">Admin</a>';
      links.appendChild(li);
    } else if (!isAdmin && existing) {
      existing.closest("li")?.remove();
    }
  }

  const user = await window.cambphysAuth.currentUser();
  applyState(user);
  await applyAdminLink();

  // Re-apply on auth changes (login/logout in another tab, token refresh, etc.)
  window.cambphysSupabase.auth.onAuthStateChange(async (_event, session) => {
    applyState(session ? session.user : null);
    await applyAdminLink();
  });
})();
