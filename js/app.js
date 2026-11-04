/* Planner page: upload, settings, and the semester-by-semester result. */
(function () {
  'use strict';

  const { parseAudit } = window.DegreeAudit;
  const P = window.DegreePlanner;
  const STORE = 'mydegreepal-session';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    catalog: null, audit: null, plan: null, sample: false,
    settings: { target: 'auto', maxUnits: 16, summers: false, prefer: [], avoid: [] },
    open: new Set(),
  };

  let catalogPromise = null;
  function loadCatalog() {
    catalogPromise = catalogPromise || fetch('data/courses.json').then((r) => {
      if (!r.ok) throw new Error('Course data could not be loaded. Refresh and try again.');
      return r.json();
    }).then((d) => { state.catalog = d; return d; });
    return catalogPromise;
  }

  function showError(message) {
    const el = $('upload-error');
    el.textContent = message;
    el.hidden = !message;
  }

  async function startFrom(html, sample) {
    showError('');
    try {
      await loadCatalog();
      state.audit = parseAudit(html);
      state.sample = sample;
      state.settings = { target: 'auto', maxUnits: 16, summers: false, prefer: [], avoid: [] };
      state.open.clear();
      render();
      window.scrollTo(0, 0);
    } catch (err) {
      showError(err.message || 'That file couldn’t be read.');
    }
  }

  function readFile(file) {
    if (!file) return;
    if (!/\.html?$/i.test(file.name)) {
      showError('Please choose the audit saved as an .html file. PDFs can’t be read.');
      return;
    }
    file.text().then((t) => startFrom(t, false));
  }

  function save() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ audit: state.audit, sample: state.sample, settings: state.settings }));
    } catch { /* private mode: the plan still works, it just won't survive a refresh */ }
  }
  function reset() {
    sessionStorage.removeItem(STORE);
    state.audit = null; state.plan = null;
    $('audit-file').value = '';
    $('plan').hidden = true;
    $('landing').hidden = false;
    window.scrollTo(0, 0);
  }

  function targetOption() {
    const t = state.settings.target;
    if (t === 'auto') return undefined;
    return t === 'asap' ? null : Number(t);
  }
  function compute() {
    const first = P.termIndex(P.FIRST_TERM);
    let target = targetOption();
    if (target === undefined) {
      const auto = P.onTimeTerm(state.audit);
      target = auto && auto.index >= first ? auto.index : null;
    }
    return P.planWithAdvice(state.audit, state.catalog, { ...state.settings, target });
  }

  function semestersLate(plan) {
    let n = 0;
    for (let i = P.parseTerm(plan.target); i < plan.graduationIndex; i = P.nextTerm(i, false)) n += 1;
    return n;
  }

  // ---- rendering -------------------------------------------------------------
  function render() {
    const plan = compute();
    state.plan = plan;
    save();
    $('landing').hidden = true;
    const root = $('plan');
    root.hidden = false;
    root.innerHTML = headerHtml(plan) + progressHtml(plan) + controlsHtml(plan) + adviceHtml(plan)
      + `<div class="plan-grid"><div class="semesters">${plan.semesters.length ? plan.semesters.map(semesterHtml).join('') : doneHtml()}</div>${railHtml(plan)}</div>`;
  }

  function headerHtml(plan) {
    const a = state.audit;
    const who = [state.sample ? 'Sample plan' : null, a.program, a.emphasis].filter(Boolean).join(' · ');
    const count = plan.semesters.length;
    let title; let chip = '';
    if (plan.undeclared) {
      return `<div class="result-head">
        <div>
          <p class="eyebrow">${esc(who)}</p>
          <div class="result-title"><h1>Add a major to see your full plan</h1><span class="chip chip-gold">No major on this audit</span></div>
          <p class="result-sub">This audit only covers university and general education requirements, so we can’t give you a graduation date yet. Your ${esc(plan.plannedUnits)} remaining units are shown below, but most of them depend on your major.</p>
        </div>
        <div class="head-actions">
          <button class="btn" data-action="print" type="button">Print or save PDF</button>
          <button class="btn" data-action="reset" type="button">Start over</button>
        </div>
      </div>
      <div class="whatif">
        <h2>Get your exact class list with a What-If audit</h2>
        <p>It shows how your classes count toward any major, and it doesn’t change your record.</p>
        <ol>
          <li>In <a href="https://ucmerced.uachieve.com/selfservice/" target="_blank" rel="noreferrer">MyDegreePath</a>, choose <b>Select a Different Program</b>.</li>
          <li>Pick the major and your catalog year, then choose <b>Run Program</b>.</li>
          <li>Open the audit and save it as “Webpage, HTML Only”.</li>
        </ol>
        <button class="btn btn-primary" data-action="reset" type="button">Upload my What-If audit</button>
      </div>`;
    }
    if (!plan.graduation) { title = 'You’re on track to finish'; }
    else if (plan.onTime === false) {
      const late = semestersLate(plan);
      title = `Earliest finish: ${plan.graduation}`;
      chip = `<span class="chip chip-warn">${late} ${late === 1 ? 'semester' : 'semesters'} after ${esc(plan.target)}</span>`;
    } else {
      title = `You can graduate ${plan.onTime ? 'by' : 'in'} ${plan.onTime ? plan.target : plan.graduation}`;
      if (plan.onTime) chip = '<span class="chip chip-good">On time</span>';
    }
    const classes = plan.classCount + plan.slotCount;
    const sub = count
      ? `${classes} ${classes === 1 ? 'class' : 'classes'} left over ${count} ${count === 1 ? 'semester' : 'semesters'}. Spring 2027 uses the published schedule. Later semesters are projected from recent offerings.`
      : 'Your audit shows no classes left to plan. Confirm with your advisor and apply to graduate.';
    return `<div class="result-head">
      <div>
        <p class="eyebrow">${esc(who)}</p>
        <div class="result-title"><h1>${esc(title)}</h1>${chip}</div>
        <p class="result-sub">${esc(sub)}</p>
      </div>
      <div class="head-actions">
        <button class="btn" data-action="print" type="button">Print or save PDF</button>
        <button class="btn" data-action="reset" type="button">Start over</button>
      </div>
    </div>`;
  }

  function progressHtml(plan) {
    const total = Math.max(plan.degreeUnits, plan.earnedUnits + plan.inProgressUnits + plan.plannedUnits);
    const pct = (n) => `${(n / total) * 100}%`;
    return `<div class="progress">
      <div class="bar" role="img" aria-label="${plan.earnedUnits} units earned, ${plan.inProgressUnits} in progress, ${plan.plannedUnits} planned, of ${plan.degreeUnits} required">
        <span class="b-done" style="width:${pct(plan.earnedUnits)}"></span>
        <span class="b-now" style="width:${pct(plan.inProgressUnits)}"></span>
        <span class="b-plan" style="width:${pct(plan.plannedUnits)}"></span>
      </div>
      <div class="legend">
        <span><i style="background:var(--navy)"></i><b>${plan.earnedUnits}</b> units earned</span>
        <span><i style="background:#6f8ab3"></i><b>${plan.inProgressUnits}</b> in progress</span>
        <span><i style="background:var(--gold)"></i><b>${plan.plannedUnits}</b> planned</span>
        <span><b>${plan.degreeUnits}</b> required</span>
      </div>
    </div>`;
  }

  function controlsHtml() {
    const s = state.settings;
    const first = P.termIndex(P.FIRST_TERM);
    const options = [];
    for (let i = first, n = 0; n < 11; i = P.nextTerm(i, false), n += 1) {
      options.push(`<option value="${i}" ${String(s.target) === String(i) ? 'selected' : ''}>${P.termName(i)}</option>`);
    }
    const auto = P.onTimeTerm(state.audit);
    const autoLabel = auto && auto.index >= first ? `On time (${P.termName(auto.index)})` : 'As soon as possible';
    const units = [12, 15, 16, 18].map((u) => `<button type="button" data-units="${u}" aria-pressed="${s.maxUnits === u}">${u}</button>`).join('');
    return `<div class="controls">
      <div class="control">
        <label for="target">Graduate by</label>
        <select id="target">
          <option value="auto" ${s.target === 'auto' ? 'selected' : ''}>${esc(autoLabel)}</option>
          <option value="asap" ${s.target === 'asap' ? 'selected' : ''}>As soon as possible</option>
          ${options.join('')}
        </select>
      </div>
      <div class="control">
        <span class="label" id="units-label">Max units per semester</span>
        <div class="segments" role="group" aria-labelledby="units-label">${units}</div>
      </div>
      <div class="control">
        <span class="label">Summer</span>
        <label class="switch"><input id="summers" type="checkbox" ${s.summers ? 'checked' : ''}> Include summer classes</label>
      </div>
      ${s.prefer.length || s.avoid.length ? '<button class="link-btn" data-action="undo-swaps" type="button">Undo my class changes</button>' : ''}
    </div>`;
  }

  function adviceHtml(plan) {
    if (plan.onTime !== false) return '';
    const fix = plan.advice[0];
    if (!fix) {
      return `<div class="fix"><span>This plan can’t reach ${esc(plan.target)} with these settings, even with summer classes. Talk with your advisor about options.</span></div>`;
    }
    return `<div class="fix"><span>You can still finish by <b>${esc(plan.target)}</b>: ${esc(fix.label.toLowerCase())}.</span>
      <button class="btn" type="button" data-fix='${esc(JSON.stringify(fix.change))}'>Apply this</button></div>`;
  }

  const chevron = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  function tagFor(item) {
    if (item.code.startsWith('SLOT')) return '<span class="chip chip-gold">Your pick</span>';
    if (item.kind === 'prereq') return '<span class="chip chip-plain">Prerequisite</span>';
    if (item.kind === 'coreq') return '<span class="chip chip-plain">Taken together</span>';
    if (item.kind === 'choice') return '<span class="chip chip-info">Swappable</span>';
    return '<span class="chip chip-plain">Required</span>';
  }

  function detailHtml(item, semester) {
    const parts = [];
    const slot = item.code.startsWith('SLOT');
    if (slot) {
      parts.push(state.plan && state.plan.undeclared && item.kind === 'elective'
        ? '<p>This spot will likely go to a class for your major. Upload a What-If audit to see exactly which one.</p>'
        : item.kind === 'elective'
        ? '<p>Choose any class you like here. It only needs to bring you to the required total units.</p>'
        : '<p>Your audit doesn’t list specific classes for this. Check the requirement on your audit to see what counts, then pick one.</p>');
    } else {
      if (item.reason) parts.push(`<p><b>Why:</b> ${esc(item.reason)}</p>`);
      if (item.prereqText) parts.push(`<p><b>Prerequisites:</b> ${esc(item.prereqText)}</p>`);
      if (item.usually && item.usually.length) parts.push(`<p><b>Recently offered:</b> ${esc(item.usually.join(', '))}</p>`);
      if (semester.confirmed && item.crns && item.crns.length) {
        parts.push(`<p><b>Spring 2027 CRNs:</b> ${esc(item.crns.join(', '))}${item.linked ? ' (pick a linked lab or discussion when you register)' : ''}</p>`);
      }
    }
    if (item.notes.length) parts.push(`<ul>${[...new Set(item.notes)].map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`);
    if (item.options.length) {
      const opts = item.options.map((code) => {
        const c = state.catalog.courses[code];
        return `<option value="${esc(code)}">${esc(code)}: ${esc(c ? c.t : '')}</option>`;
      }).join('');
      parts.push(`<div class="swap"><label for="swap-${esc(item.code)}"><b>Swap for:</b></label>
        <select id="swap-${esc(item.code)}" data-swap="${esc(item.code)}"><option value="">Choose a class</option>${opts}</select></div>`);
    }
    return parts.join('');
  }

  function courseHtml(item, semester) {
    const slot = item.code.startsWith('SLOT');
    const open = state.open.has(item.code);
    const code = slot ? (item.kind === 'elective' ? (state.plan.undeclared ? 'To be decided' : 'Elective') : 'Open class') : item.code;
    const title = slot ? item.title : item.title;
    const why = slot ? 'You choose this class' : item.reason;
    return `<li class="course ${slot ? 'slot' : ''}">
      <button class="course-row" type="button" data-row="${esc(item.code)}" aria-expanded="${open}">
        <span class="c-code">${esc(code)}</span>
        <span class="c-main"><span class="c-title">${esc(title)}</span><span class="c-why">${esc(why)}</span></span>
        <span class="c-tag">${tagFor(item)}</span>
        <span class="c-units">${esc(item.units)}</span>
        ${chevron}
      </button>
      <div class="course-detail" ${open ? '' : 'hidden'}>${detailHtml(item, semester)}</div>
    </li>`;
  }

  function semesterHtml(s) {
    const badge = s.confirmed
      ? '<span class="chip chip-good">Published schedule</span>'
      : '<span class="chip chip-plain">Projected</span>';
    return `<section class="semester" aria-label="${esc(s.term)}">
      <div class="semester-head">
        <h2>${esc(s.term)}</h2>
        <div class="semester-meta">${badge}<span>${esc(s.units)} units</span></div>
      </div>
      ${s.note ? `<p class="semester-note">${esc(s.note)}</p>` : ''}
      <ul class="course-list">${s.courses.map((i) => courseHtml(i, s)).join('')}</ul>
    </section>`;
  }

  function doneHtml() {
    return '<div class="done"><h2>No classes left to plan</h2><p class="result-sub">Check your audit with your advisor, then apply to graduate.</p></div>';
  }

  function railHtml(plan) {
    const checks = [...plan.warnings];
    if (state.audit.preparedOn) checks.push(`Based on your audit from ${state.audit.preparedOn}. Rerun it after grades post.`);
    const manual = [...new Set([...plan.review, ...plan.manualRules])].slice(0, 8);
    return `<aside class="rail" aria-label="Plan notes">
      <div class="panel">
        <h2>Keep in mind</h2>
        <ul>${checks.map((w) => `<li>${esc(w)}</li>`).join('')}
          <li>Schedules change. Check each semester’s classes in UC Merced Connect before you register.</li>
          <li>Review this plan with your advisor. It doesn’t replace official advising.</li></ul>
      </div>
      ${manual.length ? `<div class="panel"><h2>Check on your audit</h2><p>We couldn’t plan these automatically:</p><ul style="margin-top:6px">${manual.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <div class="panel no-print">
        <h2>Before you register</h2>
        <ul>
          <li>Complete My Checklist</li>
          <li>Clear any registration holds</li>
          <li>Pay any balance in My Bill</li>
          <li>Check your appointment time in My Registration</li>
        </ul>
      </div>
    </aside>`;
  }

  // ---- events ---------------------------------------------------------------
  function bind() {
    const input = $('audit-file');
    const zone = $('dropzone');
    input.addEventListener('change', () => readFile(input.files[0]));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('over'));
    zone.addEventListener('drop', () => zone.classList.remove('over'));
    // a file dropped just outside the box would otherwise open in the tab and leave the site
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!$('landing').hidden) readFile(e.dataTransfer.files[0]);
    });
    $('sample-btn').addEventListener('click', async () => {
      try {
        const r = await fetch('samples/sample-audit.html');
        await startFrom(await r.text(), true);
      } catch { showError('The sample couldn’t be loaded. Refresh and try again.'); }
    });
    $('home-link').addEventListener('click', (e) => { if (state.audit) { e.preventDefault(); reset(); } });

    const root = $('plan');
    root.addEventListener('click', (e) => {
      const row = e.target.closest('[data-row]');
      if (row) {
        const code = row.dataset.row;
        const open = row.getAttribute('aria-expanded') !== 'true';
        row.setAttribute('aria-expanded', String(open));
        row.nextElementSibling.hidden = !open;
        if (open) state.open.add(code); else state.open.delete(code);
        return;
      }
      const units = e.target.closest('[data-units]');
      if (units) { state.settings.maxUnits = Number(units.dataset.units); render(); return; }
      const fix = e.target.closest('[data-fix]');
      if (fix) { Object.assign(state.settings, JSON.parse(fix.dataset.fix)); render(); return; }
      const action = e.target.closest('[data-action]');
      if (!action) return;
      if (action.dataset.action === 'print') window.print();
      if (action.dataset.action === 'reset') reset();
      if (action.dataset.action === 'undo-swaps') { state.settings.prefer = []; state.settings.avoid = []; render(); }
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'target') { state.settings.target = e.target.value; render(); }
      if (e.target.id === 'summers') { state.settings.summers = e.target.checked; render(); }
      if (e.target.dataset.swap && e.target.value) {
        const out = e.target.dataset.swap;
        const next = e.target.value;
        const s = state.settings;
        s.prefer = [...s.prefer.filter((c) => c !== out), next];
        s.avoid = [...s.avoid.filter((c) => c !== next), out];
        state.open.delete(out);
        state.open.add(next);
        render();
      }
    });
  }

  async function restore() {
    const raw = sessionStorage.getItem(STORE);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      await loadCatalog();
      state.audit = saved.audit;
      state.sample = saved.sample;
      state.settings = saved.settings;
      render();
    } catch { sessionStorage.removeItem(STORE); }
  }

  bind();
  restore();
})();
