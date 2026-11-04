/* Catalog page: search and filter every course. */
(function () {
  'use strict';

  const PAGE = 60;
  const BIT = { s27: 1, fall: 2 | 8, spring: 1 | 4 | 16, summer: 32 };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { readablePrereq, usualTerms } = window.DegreePlanner;

  let courses = [];
  let shown = PAGE;

  function matches() {
    const q = $('q').value.trim().toLowerCase().replace(/\s+/g, '');
    // course codes are zero-padded, so "CSE 30" also searches for "CSE 030"
    const qCode = window.DegreeAudit.normalizeCode($('q').value).toLowerCase().replace(/\s+/g, '');
    const subject = $('subject').value;
    const when = $('when').value;
    return courses.filter(([code, c]) => {
      if (subject && !code.startsWith(`${subject} `)) return false;
      if (when !== 'all' && !(c.m & BIT[when])) return false;
      if (!q) return true;
      const text = `${code}${c.t}${(c.crn || []).join('')}`.toLowerCase().replace(/\s+/g, '');
      return text.includes(q) || text.includes(qCode);
    });
  }

  function row([code, c]) {
    const terms = usualTerms(c);
    const lines = [];
    if (c.d) lines.push(`<p>${esc(c.d)}</p>`);
    lines.push(`<p><b>Prerequisites:</b> ${c.p ? esc(readablePrereq(c.p)) : 'None listed'}</p>`);
    if (c.co) lines.push(`<p><b>Taken with:</b> ${esc(c.co.join(', '))}</p>`);
    lines.push(`<p><b>Recently offered:</b> ${terms.length ? esc(terms.join(', ')) : 'No recent record'}</p>`);
    if (c.crn) lines.push(`<p><b>Spring 2027 CRNs:</b> ${esc(c.crn.join(', '))}</p>`);
    return `<details><summary>
        <span class="c-code">${esc(code)}</span>
        <span class="c-lead"><span class="c-title">${esc(c.t)}</span>${c.m & 1 ? '<span class="mark" aria-hidden="true">*</span><span class="sr-only">, on the Spring 2027 schedule</span>' : ''}</span>
        <span class="catalog-units">${esc(c.u)} ${c.u === 1 ? 'unit' : 'units'}</span>
      </summary><div class="catalog-body">${lines.join('')}</div></details>`;
  }

  function render() {
    const hits = matches();
    $('count').textContent = `${hits.length.toLocaleString()} ${hits.length === 1 ? 'course' : 'courses'}`;
    $('list').innerHTML = hits.slice(0, shown).map(row).join('') || '<p class="catalog-empty">' + ($('when').value === 'all' ? 'No courses match. Try a broader search.' : 'No courses match in this list. Try “All undergraduate courses”.') + '</p>';
    $('more').hidden = hits.length <= shown;
  }
  function refresh() { shown = PAGE; render(); }

  fetch('data/courses.json').then((r) => r.json()).then((data) => {
    courses = Object.entries(data.courses).filter(([, c]) => !c.g)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    $('catalog-sub').textContent = `Schedule snapshot from ${data.meta.scheduleDate}. Confirm seats and eligibility in UC Merced Connect.`;
    const subjects = [...new Set(courses.map(([k]) => k.split(' ')[0]))];
    $('subject').insertAdjacentHTML('beforeend', subjects.map((s) => `<option>${esc(s)}</option>`).join(''));
    render();
  }).catch(() => { $('catalog-sub').textContent = 'Courses couldn’t be loaded. Refresh and try again.'; });

  // wait for a pause in typing so the result count isn't announced on every keystroke
  let typing = null;
  $('q').addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(refresh, 250); });
  $('subject').addEventListener('change', refresh);
  $('when').addEventListener('change', refresh);
  $('more').addEventListener('click', () => { shown += PAGE; render(); });
})();
