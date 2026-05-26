// Course catalog + accordion renderer with gating.
// Depends on window.cambphysAuth (auth.js) and window.cambphysSupabase (supabase-config.js).
(function () {
  const COURSES = {
    ap:     { title: "AP Course Series",     short: "AP" },
    fma:    { title: "F=ma Course Series",   short: "F=ma" },
    usapho: { title: "USAPhO Course Series", short: "USAPhO" },
  };

  // Build 16 placeholder lessons per course. Replace title/links later.
  function buildLessons(courseId) {
    const lessons = [];
    for (let i = 1; i <= 16; i++) {
      const n = String(i).padStart(2, "0");
      lessons.push({
        id: `${courseId}-${n}`,
        number: i,
        title: `Lesson ${i}`,
        video:     "#",   // YouTube embed URL
        slideshow: "#",   // Google Slides / PDF link
        notes:     "#",   // PDF or page link
        pset:      "#",   // PDF link
      });
    }
    return lessons;
  }

  window.cambphysCourses = { COURSES, buildLessons, renderCourse };

  // ---- Rendering -----------------------------------------------------------

  async function renderCourse(courseId, mountEl) {
    const course = COURSES[courseId];
    if (!course) { mountEl.textContent = "Unknown course."; return; }

    const user = await window.cambphysAuth.requireAuth();
    if (!user) return;

    const upgraded = await window.cambphysAuth.isUpgraded(courseId);
    const lessons = buildLessons(courseId);

    const header = document.createElement("div");
    header.className = "course-header";
    header.innerHTML = `
      <h1>${course.title}</h1>
      <p class="course-status">
        ${upgraded
          ? '<span class="badge ok">Full access</span>'
          : '<span class="badge locked">Free preview — Lesson 1 only</span>'}
      </p>`;
    mountEl.appendChild(header);

    const list = document.createElement("div");
    list.className = "lesson-list";

    for (const lesson of lessons) {
      const locked = !upgraded && lesson.number > 1;

      const det = document.createElement("details");
      det.className = "lesson" + (locked ? " locked" : "");
      det.innerHTML = `
        <summary>
          <span class="lesson-num">${String(lesson.number).padStart(2, "0")}</span>
          <span class="lesson-title">${lesson.title}</span>
          ${locked ? '<span class="lock-icon" aria-label="locked">🔒</span>' : ""}
        </summary>
        <div class="lesson-body">
          <a href="${lesson.video}"     class="resource">▶ Video</a>
          <a href="${lesson.slideshow}" class="resource">▥ Slideshow</a>
          <a href="${lesson.notes}"     class="resource">≡ Notes</a>
          <a href="${lesson.pset}"      class="resource">✎ Problem Set</a>
        </div>`;

      if (locked) {
        const summary = det.querySelector("summary");
        summary.addEventListener("click", (e) => {
          e.preventDefault();
          showUpgradeModal(course.title);
        });
      }
      list.appendChild(det);
    }
    mountEl.appendChild(list);
  }

  function showUpgradeModal(courseTitle) {
    // One modal at a time
    document.querySelectorAll(".cp-modal-backdrop").forEach(n => n.remove());

    const backdrop = document.createElement("div");
    backdrop.className = "cp-modal-backdrop";
    backdrop.innerHTML = `
      <div class="cp-modal" role="dialog" aria-modal="true">
        <h2>Upgrade required</h2>
        <p>This lesson is part of the full <strong>${courseTitle}</strong>.
           You currently have free preview access (Lesson 1 only).</p>
        <p>To unlock all 16 lessons, please contact us to upgrade your account.</p>
        <button type="button" class="cp-modal-close">Close</button>
      </div>`;
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.classList.contains("cp-modal-close")) {
        backdrop.remove();
      }
    });
    document.body.appendChild(backdrop);
  }
})();
