// Lecture-slideshow viewer.
// URL: /slides/?lesson=fma-01  (loads /assets/psets/<course>/<id>-slides.json)
(function () {
  let data = null;
  let currentIndex = 0;
  let lessonId = null;
  let courseId = null;

  async function init() {
    const params = new URLSearchParams(location.search);
    lessonId = params.get("lesson");
    if (!lessonId || !/^[a-z]+-\d{2}$/.test(lessonId)) {
      stage().innerHTML = '<p class="slides-loading">Missing or invalid ?lesson= parameter.</p>';
      return;
    }
    courseId = lessonId.split("-")[0];

    // Lookup lesson title for the topbar
    const lessons = window.cambphysCourses.buildLessons(courseId);
    const lesson = lessons.find(l => l.id === lessonId);
    document.getElementById("slides-title").textContent = lesson ? lesson.title : lessonId;
    const courseTitles = { ap: "AP", fma: "F=ma", usapho: "USAPhO" };
    const back = document.getElementById("slides-back");
    back.href = `/courses/${courseId}/`;
    back.textContent = `← Back to course`;

    const res = await fetch(`/assets/psets/${courseId}/${lessonId}-slides.json`);
    if (!res.ok) {
      stage().innerHTML = '<p class="slides-loading">No slideshow available for this lesson yet.</p>';
      return;
    }
    data = await res.json();
    if (!data.slides || !data.slides.length) {
      stage().innerHTML = '<p class="slides-loading">Slideshow is empty.</p>';
      return;
    }

    render();
  }

  function stage() { return document.getElementById("slides-stage"); }

  function render() {
    const slide = data.slides[currentIndex];
    document.getElementById("slides-counter").textContent =
      data.slides.length > 1 ? `${currentIndex + 1} / ${data.slides.length}` : "";

    const parts = [];
    parts.push(`<div class="slide slide-${slide.type || "content"}">`);

    if (slide.type === "embed") {
      parts.push(`<div class="slide-embed"><iframe src="${slide.src}" allow="autoplay" allowfullscreen></iframe></div>`);
    } else if (slide.type === "title") {
      parts.push(`<div class="title-slide">`);
      parts.push(`<h1>${slide.title || ""}</h1>`);
      if (slide.subtitle) parts.push(`<h2>${slide.subtitle}</h2>`);
      if (slide.footer)   parts.push(`<div class="title-footer">${slide.footer}</div>`);
      parts.push(`</div>`);
    } else {
      if (slide.title)    parts.push(`<h2 class="slide-title">${slide.title}</h2>`);
      if (slide.subtitle) parts.push(`<h3 class="slide-subtitle">${slide.subtitle}</h3>`);
      if (slide.callout)  parts.push(`<div class="slide-callout">${slide.callout}</div>`);
      if (slide.body)     parts.push(`<div class="slide-body">${slide.body}</div>`);
      if (slide.answer)   parts.push(`<div class="slide-answer">${slide.answer}</div>`);
      if (slide.image)    parts.push(`<div class="slide-image"><img src="${slide.image}" alt=""></div>`);
    }
    parts.push(`</div>`);

    stage().innerHTML = parts.join("");

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([stage()]).catch(() => {});
    }
  }

  window.cambphysSlides = { init };
})();
