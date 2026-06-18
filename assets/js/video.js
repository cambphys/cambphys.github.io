// Per-lesson video viewer. URL: /video/?lesson=ap-04
(function () {
  async function init() {
    const params = new URLSearchParams(location.search);
    const lessonId = params.get("lesson");
    const stage = document.getElementById("video-stage");
    if (!lessonId || !/^[a-z]+-\d{2}$/.test(lessonId)) {
      stage.innerHTML = '<p class="slides-loading">Missing or invalid ?lesson= parameter.</p>';
      return;
    }
    const courseId = lessonId.split("-")[0];

    const lessons = window.cambphysCourses.buildLessons(courseId);
    const lesson = lessons.find(l => l.id === lessonId);
    document.getElementById("video-title").textContent = lesson ? lesson.title : lessonId;
    const back = document.getElementById("video-back");
    back.href = `/courses/${courseId}/`;
    back.textContent = `← Back to course`;

    const res = await fetch(`/assets/psets/${courseId}/${lessonId}-video.json`);
    if (!res.ok) {
      stage.innerHTML = '<p class="slides-loading">No video available for this lesson yet.</p>';
      return;
    }
    const data = await res.json();
    if (!data.src) {
      stage.innerHTML = '<p class="slides-loading">Video manifest missing src.</p>';
      return;
    }
    stage.innerHTML = `<div class="video-embed"><iframe src="${data.src}" allow="autoplay" allowfullscreen></iframe><div class="video-corner-cover"><img src="/pictures/logo.jpg" alt=""></div></div>`;

    const user = await window.cambphysAuth.currentUser();
    if (user && user.email) {
      const wm = document.createElement("div");
      wm.className = "cp-watermark";
      wm.textContent = user.email;
      stage.appendChild(wm);
    }
  }

  window.cambphysVideo = { init };
})();
