// USAPhO per-lesson mock: free-response, 1-hour timer, no auto-grading.
// Rules → timed problem set with solutions hidden → results (solutions revealed).
(function () {
  let lessonId = null;
  let lessonTitle = "";
  const STORAGE_KEY_PREFIX = "cambphys.usapho-mock.";
  let STORAGE_KEY = "";
  const STAGE = () => document.getElementById("exam-stage");

  let data = null;
  let state = null;
  let tickTimer = null;

  async function init() {
    const params = new URLSearchParams(window.location.search);
    lessonId = params.get("lesson");
    if (!lessonId || !/^usapho-\d{2}$/.test(lessonId)) {
      STAGE().innerHTML = "<p>Missing or invalid ?lesson= parameter.</p>";
      return;
    }
    STORAGE_KEY = STORAGE_KEY_PREFIX + lessonId;

    // Look up lesson title from catalog
    const lessons = window.cambphysCourses.buildLessons("usapho");
    const lesson = lessons.find(l => l.id === lessonId);
    lessonTitle = lesson ? lesson.title : lessonId;

    const res = await fetch(`/assets/psets/usapho/${lessonId}-mock.json`);
    if (!res.ok) { STAGE().innerHTML = "<p>No mock available for this lesson yet.</p>"; return; }
    data = await res.json();

    // Restore in-progress OR finished state. Finished sticks until Retake.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.started_at && !saved.finished) {
          const elapsed = (Date.now() - saved.started_at) / 1000;
          if (elapsed < data.time_limit_seconds) {
            state = saved;
            renderExam();
            return;
          }
          sessionStorage.removeItem(STORAGE_KEY);
        } else if (saved && saved.finished) {
          state = saved;
          renderResults();
          return;
        }
      }
    } catch (_) { /* ignore corrupt state */ }

    renderRules();
  }

  function persist()    { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_){} }
  function clearStored(){ try { sessionStorage.removeItem(STORAGE_KEY); } catch(_){} }
  function typeset(el)  { if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([el]).catch(()=>{}); }

  // ---- LaTeX → HTML rendering (same logic as pset.js) --------------------
  function imgBase() { return `/assets/psets/usapho/${lessonId}`; }

  function escapeHtmlPreservingMath(s) {
    const tokens = [];
    const re = /\$\$[\s\S]*?\$\$|\$[^$]*\$|<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^<>]*)?>|&(?:[a-zA-Z]+|#\d+);/g;
    let last = 0; let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) tokens.push({ keep: false, text: s.slice(last, m.index) });
      tokens.push({ keep: true, text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < s.length) tokens.push({ keep: false, text: s.slice(last) });
    return tokens.map(t => t.keep ? t.text
      : t.text.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")).join("");
  }

  function hasOrphanItem(text) {
    // Strip recognized list envs, then check whether any \item remains.
    const stripped = text.replace(
      /\\begin\{(anum|enumerate|itemize|alphasol|choices)\}[\s\S]*?\\end\{\1\}/g, " ");
    return /\\item\b/.test(stripped);
  }

  function renderRichText(raw, imageList) {
    let s = raw || "";
    // Treat custom \begin{alphasol} as \begin{anum}.
    s = s.replace(/\\begin\{alphasol\}/g, "\\begin{anum}")
         .replace(/\\end\{alphasol\}/g,   "\\end{anum}");
    // If the text has top-level \item's (not inside any list env), wrap.
    if (hasOrphanItem(s)) s = "\\begin{anum}\n" + s.trim() + "\n\\end{anum}";

    s = escapeHtmlPreservingMath(s);
    const byName = {};
    for (const ref of imageList || []) {
      const fname = ref.split("/").pop();
      const base  = fname.replace(/\.[a-z0-9]+$/i, "");
      byName[base]  = `${imgBase()}/${fname}`;
      byName[fname] = `${imgBase()}/${fname}`;
    }
    const usedImages = new Set();
    s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g, (m, name) => {
      const key = name.trim();
      const url = byName[key] || byName[key.replace(/\.[a-z0-9]+$/i, "")] || `${imgBase()}/${key}.png`;
      usedImages.add(key); usedImages.add(key.replace(/\.[a-z0-9]+$/i, ""));
      return `<img src="${url}" alt="">`;
    });
    s = s.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
      (m, body) => `<div style="text-align:center">${body}</div>`);
    s = s.replace(/\\begin\{enumerate\}(?:\s*\[([^\]]*)\])?([\s\S]*?)\\end\{enumerate\}/g,
      (m, opts, body) => {
        let type = "1";
        if (opts) {
          if (/\\Roman/.test(opts)) type = "I";
          else if (/\\roman/.test(opts)) type = "i";
          else if (/\\Alph/.test(opts))  type = "A";
          else if (/\\alph/.test(opts))  type = "a";
        }
        const items = body.split(/\\item\s+/).map(x=>x.trim()).filter(Boolean).map(x=>`<li>${x}</li>`).join("");
        return `<ol type="${type}">${items}</ol>`;
      });
    s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (m, body) => {
      const items = body.split(/\\item\s+/).map(x=>x.trim()).filter(Boolean).map(x=>`<li>${x}</li>`).join("");
      return `<ul>${items}</ul>`;
    });
    s = s.replace(/\\begin\{anum\}([\s\S]*?)\\end\{anum\}/g, (m, body) => {
      const items = body.split(/\\item\s+/).map(x=>x.trim()).filter(Boolean).map(x=>`<li>${x}</li>`).join("");
      return `<ol type="a" class="anum">${items}</ol>`;
    });

    // Text-mode LaTeX commands that were not pre-processed in the JSON.
    s = s.replace(/\\officialsol\{([^{}]+)\}/g,
      (m, url) => `<p>See official solutions <a href="${url}" target="_blank" rel="noopener">here</a>.</p>`);
    s = s.replace(/\\href\{([^{}]+)\}\{([^{}]+)\}/g,
      (m, url, text) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`);
    s = s.replace(/\\url\{([^{}]+)\}/g,
      (m, url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
    s = s.replace(/\\textit\{([^{}]+)\}/g,    "<em>$1</em>");
    s = s.replace(/\\emph\{([^{}]+)\}/g,      "<em>$1</em>");
    s = s.replace(/\\textbf\{([^{}]+)\}/g,    "<strong>$1</strong>");
    s = s.replace(/\\underline\{([^{}]+)\}/g, "<u>$1</u>");
    s = s.replace(/\\fbox\{([^{}]+)\}/g,
      (m, x) => `<span style="border:1px solid #555;padding:.1em .4em;font-weight:600;">${x}</span>`);
    // Strip leftover artifacts
    s = s.replace(/\\addtocounter\{[^}]+\}\{[^}]+\}\s*/g, "");
    s = s.replace(/\\ref\{[^}]+\}/g, "(another problem)");
    s = s.replace(/\\label\{[^}]+\}\s?/g, "");
    s = s.replace(/\\(?:noindent|centering|smallskip|medskip|bigskip|par)\b\s*/g, "");
    // Quote normalization
    s = s.replace(/``\s*([\s\S]*?)\s*''/g, '"$1"');

    s = s.replace(/\n\s*\n/g, "</p><p>");
    s = `<p>${s}</p>`;
    if (imageList && imageList.length) {
      for (const imgRef of imageList) {
        const fname = imgRef.split("/").pop();
        const base  = fname.replace(/\.[a-z0-9]+$/i, "");
        if (usedImages.has(base) || usedImages.has(fname)) continue;
        s += `<img src="${imgBase()}/${fname}" alt="">`;
      }
    }
    return s;
  }

  // ---- Rules screen ------------------------------------------------------
  function renderRules() {
    const mins = Math.floor(data.time_limit_seconds / 60);
    STAGE().innerHTML = `
      <div class="exam-rules">
        <h1>Mock USAPhO: ${escapeHtml(lessonTitle)}</h1>
        <ul>
          <li>You have <strong>${mins} minutes</strong> to work through <strong>${data.total} mock USAPhO problem${data.total === 1 ? "" : "s"}</strong>.</li>
          <li>For the best mock experience, write out your solutions to each problem on blank pieces of paper.</li>
          <li>Solutions are hidden during the exam and revealed when you finish.</li>
          <li>You may finish early by clicking <strong>Finish Mock</strong> at the bottom.</li>
          <li>You may exit at any time — your timer will reset and you can restart.</li>
          <li>When the timer reaches <strong>00:00</strong>, the mock ends automatically and solutions are shown.</li>
        </ul>
        <p>The timer begins the moment you press <strong>Begin Now</strong>.</p>
        <button type="button" class="exam-begin-btn" id="begin-btn">Begin Now</button>
      </div>`;
    document.getElementById("begin-btn").addEventListener("click", () => {
      state = { started_at: Date.now(), finished: false };
      persist();
      renderExam();
    });
  }

  // ---- Active mock --------------------------------------------------------
  function renderExam() {
    const html = [];
    html.push(`
      <div class="exam-topbar">
        <h2>Mock USAPhO — ${escapeHtml(lessonTitle)}</h2>
        <span class="exam-timer" id="exam-timer">--:--</span>
        <button type="button" class="exit-btn" id="exit-btn">Exit Mock</button>
      </div>`);

    for (let i = 0; i < data.problems.length; i++) {
      const p = data.problems[i];
      const probHtml = renderRichText(p.problem, p.problem_images || []);
      html.push(`
        <div class="exam-question" data-q="${i}">
          <div class="stem">
            <span class="qnum">${p.num}.</span>${probHtml}
          </div>
        </div>`);
    }

    html.push(`
      <div class="exam-bottom">
        <button type="button" class="finish-exam-btn" id="finish-btn">Finish Mock</button>
      </div>`);

    STAGE().innerHTML = html.join("");
    document.getElementById("exit-btn").addEventListener("click", () => {
      if (!confirm("Exit the mock? Your timer will reset and your attempt will be discarded.")) return;
      clearStored();
      window.location.href = "/courses/usapho/";
    });
    document.getElementById("finish-btn").addEventListener("click", () => {
      if (!confirm("Finish the mock now? Solutions will be revealed.")) return;
      finalize();
    });

    if (tickTimer) clearInterval(tickTimer);
    tick();
    tickTimer = setInterval(tick, 1000);
    typeset(STAGE());
  }

  function tick() {
    if (!state || state.finished) return;
    const elapsed = Math.floor((Date.now() - state.started_at) / 1000);
    const remaining = Math.max(0, data.time_limit_seconds - elapsed);
    const el = document.getElementById("exam-timer");
    if (el) {
      const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
      const ss = String(remaining % 60).padStart(2, "0");
      el.textContent = `${mm}:${ss}`;
      el.classList.toggle("urgent", remaining <= 300);
    }
    if (remaining <= 0) {
      clearInterval(tickTimer); tickTimer = null;
      finalize(true);
    }
  }

  function finalize(timeUp) {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    state.finished = true;
    state.finished_at = Date.now();
    state.timeUp = !!timeUp;
    persist();
    renderResults();
    window.scrollTo(0, 0);
  }

  // ---- Results screen -----------------------------------------------------
  function renderResults() {
    const html = [];
    html.push(`
      <div class="results-top-actions">
        <a class="pset-back" href="/courses/usapho/">← Back to course</a>
        <div class="mock-results-header">Mock USAPhO Solutions</div>
        <button type="button" class="retake-btn" id="retake-btn-top">Retake Mock</button>
      </div>`);

    for (let i = 0; i < data.problems.length; i++) {
      const p = data.problems[i];
      const probHtml = renderRichText(p.problem,  p.problem_images  || []);
      const solHtml  = renderRichText(p.solution, p.solution_images || []);
      html.push(`
        <div class="result-question right" data-q="${i}">
          <div class="stem">
            <span class="qnum">${p.num}.</span>${probHtml}
          </div>
          <div class="solution-box">
            <h4>Solution</h4>
            <div>${solHtml}</div>
          </div>
        </div>`);
    }

    STAGE().innerHTML = html.join("");
    document.getElementById("retake-btn-top").addEventListener("click", () => {
      if (!confirm("Retake the mock? Your view of the solutions will be hidden again.")) return;
      clearStored();
      state = null;
      renderRules();
      window.scrollTo(0, 0);
    });
    typeset(STAGE());
  }

  function escapeHtml(s) {
    return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  window.cambphysUsaphoMock = { init };
})();
