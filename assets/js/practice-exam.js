// Practice F=ma exam: rules → timed exam → results.
// State (in-progress) kept in sessionStorage so a refresh doesn't wipe it,
// but cleared on exit/finish. Each attempt is a fresh start.
(function () {
  const STORAGE_KEY = "cambphys.practice-exam.fma.v1";
  const STAGE = () => document.getElementById("exam-stage");
  const LETTERS = ["A","B","C","D","E","F","G"];

  let data = null;       // parsed JSON
  let state = null;      // { started_at, answers: {idx: chosenIdx}, finished }
  let tickTimer = null;

  async function init() {
    const res = await fetch("/assets/psets/fma/practice-exam.json");
    if (!res.ok) { STAGE().innerHTML = "<p>Could not load exam.</p>"; return; }
    data = await res.json();

    // Restore in-progress OR finished state. Finished results stick around
    // until the student clicks Retake Exam.
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

  function persist() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function clearStored() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function typeset(el) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([el]).catch(()=>{});
    }
  }

  // ---- Rules screen ------------------------------------------------------
  function renderRules() {
    const mins = Math.floor(data.time_limit_seconds / 60);
    STAGE().innerHTML = `
      <div class="exam-rules">
        <h1>Practice F=ma Exam</h1>
        <ul>
          <li>You have <strong>${mins} minutes</strong> to complete <strong>${data.total} multiple-choice questions</strong>.</li>
          <li>Click on the choice you believe is correct.</li>
          <li>Correct answers are worth <strong>1 point</strong>. Incorrect answers are worth <strong>0 points</strong> (no penalty for guessing).</li>
          <li>You may finish early by clicking <strong>Finish Exam</strong> at the bottom.</li>
          <li>You may exit at any time — your progress will be discarded and you can retake.</li>
          <li>When the timer reaches <strong>00:00</strong>, the exam ends automatically.</li>
        </ul>
        <p>The timer will begin the moment you press <strong>Begin Now</strong>.</p>
        <button type="button" class="exam-begin-btn" id="begin-btn">Begin Now</button>
      </div>`;
    document.getElementById("begin-btn").addEventListener("click", () => {
      state = { started_at: Date.now(), answers: {}, finished: false };
      persist();
      renderExam();
    });
  }

  // ---- Active exam --------------------------------------------------------
  function renderExam() {
    const html = [];
    html.push(`
      <div class="exam-topbar">
        <h2>Practice F=ma Exam</h2>
        <span class="exam-timer" id="exam-timer">--:--</span>
        <button type="button" class="exit-btn" id="exit-btn">Exit Exam</button>
      </div>`);

    function renderExamQuestion(p, i) {
      const chosen = state.answers[i];
      return `
        <div class="exam-question" data-q="${i}">
          <div class="stem">
            <span class="qnum">${p.num}.</span>${p.problem}
          </div>
          <div class="choices">
            ${p.choices.map((c, ci) => `
              <label>
                <input type="radio" name="q${i}" value="${ci}" ${chosen === ci ? "checked" : ""}>
                <span class="letter">${LETTERS[ci]}.</span>
                <span class="choice-body">${c}</span>
              </label>`).join("")}
          </div>
        </div>`;
    }

    for (let i = 0; i < data.problems.length; i++) {
      const p = data.problems[i];
      if (p.preamble) {
        // Wrap preamble + this problem + the next one (the pair sharing context)
        const next = data.problems[i + 1];
        html.push(`<div class="exam-group">`);
        html.push(`<div class="exam-preamble">${p.preamble}</div>`);
        html.push(renderExamQuestion(p, i));
        if (next && !next.preamble) {
          html.push(renderExamQuestion(next, i + 1));
          i++; // skip the next iteration; it's already rendered in this group
        }
        html.push(`</div>`);
      } else {
        html.push(renderExamQuestion(p, i));
      }
    }

    html.push(`
      <div class="exam-bottom">
        <button type="button" class="finish-exam-btn" id="finish-btn">Finish Exam</button>
      </div>`);

    STAGE().innerHTML = html.join("");

    // Listeners
    STAGE().querySelectorAll('input[type=radio]').forEach(inp => {
      inp.addEventListener("change", (e) => {
        const q = parseInt(inp.name.slice(1), 10);
        state.answers[q] = parseInt(inp.value, 10);
        persist();
      });
    });
    document.getElementById("exit-btn").addEventListener("click", () => {
      if (!confirm("Exit the exam? Your answers will be discarded.")) return;
      clearStored();
      window.location.href = "/courses/fma/";
    });
    document.getElementById("finish-btn").addEventListener("click", () => {
      if (!confirm("Finish the exam now?")) return;
      finalize();
    });

    // Timer
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
      el.classList.toggle("urgent", remaining <= 300); // last 5 min
    }
    if (remaining <= 0) {
      clearInterval(tickTimer); tickTimer = null;
      finalize(/*timeUp*/ true);
    }
  }

  function finalize(timeUp) {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    state.finished = true;
    state.finished_at = Date.now();
    state.timeUp = !!timeUp;
    persist();  // keep results visible across page reloads / navigation back
    renderResults();
    window.scrollTo(0, 0);
  }

  // ---- Results screen -----------------------------------------------------
  function renderResults() {
    let correct = 0;
    for (let i = 0; i < data.problems.length; i++) {
      if (state.answers[i] === data.problems[i].correct) correct++;
    }
    const total = data.problems.length;

    const html = [];
    html.push(`
      <div class="results-top-actions">
        <button type="button" class="retake-btn" id="retake-btn-top">Retake Exam</button>
      </div>
      <div class="exam-score">
        <h2>Score: ${correct} / ${total}</h2>
        <div class="sub">${((correct/total)*100).toFixed(0)}%${state.timeUp ? " — time expired" : ""}</div>
      </div>`);

    function renderResultQuestion(p, i) {
      const chosen = state.answers[i];
      const isRight = chosen === p.correct;
      return `
        <div class="result-question ${isRight ? "right" : "wrong"}" data-q="${i}">
          <div class="stem">
            <span class="qnum">${p.num}.</span>${p.problem}
          </div>
          <div class="choices">
            ${p.choices.map((c, ci) => {
              const cls = ci === p.correct ? "correct"
                        : (ci === chosen ? "user-wrong" : "");
              const mark = ci === p.correct ? " ← correct"
                        : (ci === chosen ? " ← your answer" : "");
              return `<label class="${cls}">
                <input type="radio" name="r${i}" disabled ${ci === chosen ? "checked" : ""}>
                <span class="letter">${LETTERS[ci]}.</span>
                <span class="choice-body">${c}</span>
                <span style="margin-left:auto;font-size:.85em;color:#666;">${mark}</span>
              </label>`;
            }).join("")}
          </div>
          <div class="solution-box">
            <h4>Solution</h4>
            <div>${p.solution}</div>
          </div>
        </div>`;
    }

    for (let i = 0; i < data.problems.length; i++) {
      const p = data.problems[i];
      if (p.preamble) {
        const next = data.problems[i + 1];
        html.push(`<div class="exam-group">`);
        html.push(`<div class="exam-preamble">${p.preamble}</div>`);
        html.push(renderResultQuestion(p, i));
        if (next && !next.preamble) {
          html.push(renderResultQuestion(next, i + 1));
          i++;
        }
        html.push(`</div>`);
      } else {
        html.push(renderResultQuestion(p, i));
      }
    }

    STAGE().innerHTML = html.join("");
    document.getElementById("retake-btn-top").addEventListener("click", () => {
      if (!confirm("Retake the exam? Your current score will be erased.")) return;
      clearStored();
      state = null;
      renderRules();
      window.scrollTo(0, 0);
    });
    typeset(STAGE());
  }

  window.cambphysExam = { init };
})();
