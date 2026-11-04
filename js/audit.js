/* Reads a saved MyDegreePath (uAchieve) audit. Runs entirely in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DegreeAudit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const GRADE_POINTS = { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': 0.7, F: 0 };
  const MAX_BYTES = 5 * 1024 * 1024;
  const MAX_DEPTH = 1000; // far deeper than any audit; keeps the recursive walks below safe
  // HTML's implied end tags: a new tag closes these if still open, searching down to a boundary
  const TABLE_CELL = { close: ['td', 'th'], stop: ['tr', 'table'] };
  const TABLE_SECTION = { close: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'], stop: ['table'] };
  const PARAGRAPH = { close: ['p'], stop: ['button', 'table', 'td', 'th', 'caption', 'object'] };
  const IMPLIED = {
    td: TABLE_CELL, th: TABLE_CELL,
    tr: { close: ['tr', 'td', 'th'], stop: ['thead', 'tbody', 'tfoot', 'table'] },
    thead: TABLE_SECTION, tbody: TABLE_SECTION, tfoot: TABLE_SECTION,
    li: { close: ['li', 'p'], stop: ['ul', 'ol'] },
    option: { close: ['option'], stop: ['select', 'datalist', 'optgroup'] },
    optgroup: { close: ['option', 'optgroup'], stop: ['select'] },
  };
  for (const tag of ['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']) {
    IMPLIED[tag] = IMPLIED[tag] || PARAGRAPH;
  }

  function decode(text) {
    const named = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    return text.replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi, (m) => {
      const hit = named[m.toLowerCase()];
      if (hit) return hit;
      const n = m[2].toLowerCase() === 'x' ? parseInt(m.slice(3, -1), 16) : Number(m.slice(2, -1));
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    });
  }

  function parseHtml(html) {
    const rootNode = { tag: 'root', attrs: {}, children: [] };
    const stack = [rootNode];
    // comments and raw-text elements are skipped in document order, so neither can hide the other
    const clean = html.replace(/<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|template|noscript)(?=[\s/>])[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, (m, tag) => (tag ? '' : m));
    for (const token of clean.match(/<!--[\s\S]*?(?:-->|$)|<![^>]*>|<[^>]*>|[^<]+/g) || []) {
      if (token.startsWith('<!')) continue;
      const close = token.match(/^<\/\s*([\w:-]+)/);
      if (close) {
        const at = stack.map((n) => n.tag).lastIndexOf(close[1].toLowerCase());
        if (at > 0) stack.length = at;
        continue;
      }
      const open = token.match(/^<\s*([\w:-]+)/);
      if (!open) { stack[stack.length - 1].children.push(decode(token)); continue; }
      const attrs = {};
      for (const a of token.slice(open[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
        attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4]);
      }
      const node = { tag: open[1].toLowerCase(), attrs, children: [] };
      const implied = IMPLIED[node.tag];
      if (implied) {
        let at = 0;
        for (let i = stack.length - 1; i > 0 && !implied.stop.includes(stack[i].tag); i--) {
          if (implied.close.includes(stack[i].tag)) at = i;
        }
        if (at > 0) stack.length = at;
      }
      stack[stack.length - 1].children.push(node);
      if (!VOID_TAGS.has(node.tag) && !token.endsWith('/>')) stack.push(node);
      if (stack.length > MAX_DEPTH) throw new Error('This audit has an unsupported layout. Save the audit results page again.');
    }
    return rootNode;
  }

  const hasClass = (n, c) => (n.attrs.class || '').split(/\s+/).includes(c);
  function findAll(node, test) {
    const out = [];
    for (const child of node.children) {
      if (typeof child === 'string') continue;
      if (test(child)) out.push(child);
      out.push(...findAll(child, test));
    }
    return out;
  }
  function textOf(node) {
    if (!node || node.tag === 'svg') return '';
    return node.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join(' ').replace(/\s+/g, ' ').trim();
  }
  const firstText = (node, cls) => textOf(findAll(node, (n) => hasClass(n, cls))[0]);

  /** "CSE100", "cse 21" -> "CSE 100", "CSE 021" */
  function normalizeCode(raw) {
    const m = raw.toUpperCase().trim().match(/^([A-Z]+?)\s*(\d[\w*]*)$/);
    if (!m) return raw.toUpperCase().trim();
    return `${m[1]} ${m[2].replace(/^(\d{1,2})(?=[A-Z]|$)/, (d) => d.padStart(3, '0'))}`;
  }

  function labelled(rootNode, names) {
    const matches = (s) => names.includes(s.replace(/:$/, '').trim().toLowerCase());
    const found = [];
    for (const b of findAll(rootNode, (n) => n.tag === 'b' || n.tag === 'strong')) {
      const br = b.children.findIndex((c) => typeof c !== 'string' && c.tag === 'br');
      if (br >= 0 && matches(textOf({ ...b, children: b.children.slice(0, br) }))) {
        found.push(textOf({ ...b, children: b.children.slice(br + 1) }));
      }
    }
    for (const table of findAll(rootNode, (n) => n.tag === 'table')) {
      const heads = findAll(table, (n) => n.tag === 'th');
      const col = heads.findIndex((h) => matches(textOf(h)));
      if (col < 0) continue;
      for (const row of findAll(table, (n) => n.tag === 'tr')) {
        const cells = row.children.filter((c) => typeof c !== 'string' && c.tag === 'td');
        if (cells.length === heads.length) found.push(textOf(cells[col]));
      }
    }
    const unique = [...new Set(found.filter(Boolean))];
    return unique.length === 1 ? unique[0] : null;
  }

  function takenCourses(node) {
    return findAll(node, (n) => n.tag === 'tr' && hasClass(n, 'takenCourse')).map((row) => {
      const cells = row.children.filter((c) => typeof c !== 'string' && c.tag === 'td');
      const cell = (cls) => textOf(cells.find((c) => hasClass(c, cls)));
      const units = Number.parseFloat(cell('credit'));
      return {
        code: normalizeCode(cell('course')),
        term: cell('term'),
        grade: cell('grade').trim().toUpperCase(),
        units: Number.isFinite(units) ? units : null,
        flags: cell('ccode'),
        title: cell('description'),
      };
    }).filter((e) => e.code);
  }
  function unique(entries) {
    const seen = new Set();
    return entries.filter((e) => {
      const k = JSON.stringify([e.term, e.code, e.grade, e.units, e.flags]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function statusOf(node, parent = node) {
    const el = [node, ...findAll(node, (n) => hasClass(n, 'status'))].find((n) => /\bStatus_(OK|IP|NO)\b/.test(n.attrs.class || ''));
    if (el && hasClass(el, 'Status_OK')) return 'complete';
    if (el && hasClass(el, 'Status_IP')) return 'in-progress';
    if (el && hasClass(el, 'Status_NO')) return 'unfulfilled';
    if (hasClass(node, 'Status_PL')) return 'unfulfilled'; // satisfied only by classes not yet taken
    if (hasClass(node, 'Status_NONE') || hasClass(parent, 'Status_NONE')) return 'info'; // headings and leftover-course lists
    return 'review';
  }

  function metricsOf(rootNode) {
    const detail = (rname, rowClass, cellClass, max) => {
      const vals = [];
      for (const r of findAll(rootNode, (n) => n.attrs.rname === rname && hasClass(n, 'requirement'))) {
        for (const row of findAll(r, (n) => n.tag === 'tr' && hasClass(n, rowClass))) {
          const t = firstText(row, cellClass).trim();
          if (/^\d+(?:\.\d+)?$/.test(t) && Number(t) <= max) vals.push(Number(t));
        }
      }
      return vals.length && vals.every((v) => v === vals[0]) ? vals[0] : null;
    };
    const earnedUnits = detail('REQ-UNITS', 'reqEarned', 'hours', 1000);
    const req = findAll(rootNode, (n) => n.attrs.rname === 'REQ-UNITS' && hasClass(n, 'requirement')).map((n) => (n.attrs.rqdhours || '').trim());
    const requiredUnits = req.length && req.every((v) => v === req[0] && /^\d+(?:\.\d+)?$/.test(v)) ? Number(req[0]) : null;
    return {
      gpa: detail('REQ-GPA', 'reqGpaDetail', 'gpa', 4.3),
      earnedUnits,
      inProgressUnits: detail('REQ-UNITS', 'reqIpDetail', 'hours', 1000),
      requiredUnits,
    };
  }

  function parseAudit(html) {
    if (!html.trim() || html.length > MAX_BYTES) throw new Error('Choose a saved HTML audit smaller than 5 MB.');
    const doc = parseHtml(html);
    const rules = [];
    const seen = new Set();
    for (const req of findAll(doc, (n) => hasClass(n, 'requirement'))) {
      const group = firstText(req, 'reqTitle');
      const subs = findAll(req, (n) => hasClass(n, 'subrequirement'));
      const reqNeeds = firstText(req, 'reqNeeds');
      for (const sub of subs.length ? subs : [req]) {
        const label = firstText(sub, 'subreqTitle') || group;
        const rname = req.attrs.rname || group;
        const id = `${rname}:${sub.attrs.pseudo || ''}:${sub.attrs.id || label}`;
        const status = statusOf(sub, req);
        const key = `${id}:${status}:${textOf(sub)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const choices = [...new Set(findAll(sub, (n) => n.attrs.department && n.attrs.number)
          .map((n) => normalizeCode(`${n.attrs.department} ${n.attrs.number}`)))];
        rules.push({
          id, rname, group, label,
          status,
          needs: firstText(sub, 'subreqNeeds') || (subs.length <= 1 ? reqNeeds : ''),
          reqNeeds,
          choiceText: firstText(sub, 'fromcourselist'),
          choices,
          evidence: unique(takenCourses(sub)),
          text: textOf(sub).slice(0, 600),
        });
      }
    }
    const entries = unique(takenCourses(doc));
    if (!rules.length || !entries.length) {
      throw new Error('This file doesn’t look like a complete MyDegreePath audit. Open the audit in Chrome, then save it as “Webpage, HTML Only”.');
    }
    const all = textOf(doc);
    const headings = [...new Set(findAll(doc, (n) => /^h[1-6]$/.test(n.tag)).map(textOf)
      .filter((t) => /(?:,\s*|\s+)(?:B\.?S\.?|B\.?A\.?)\b/i.test(t)))];
    const catalog = all.match(/Catalog Year\s+(Fall|Spring|Summer)\s+Semester\s+(\d{4})/i);
    const titleCard = findAll(doc, (n) => hasClass(n, 'card-header')).map((n) => textOf(findAll(n, (h) => /^h[1-6]$/.test(h.tag))[0])).find(Boolean);
    const program = labelled(doc, ['degree program', 'program', 'major']) || titleCard || (headings.length === 1 ? headings[0].replace(/\s+audit$/i, '') : null);
    const programCode = labelled(doc, ['program code']);
    return {
      startYear: labelled(doc, ['start year', 'year started', 'admission term']),
      expectedGraduation: labelled(doc, ['graduation date', 'expected graduation']),
      program,
      programCode,
      emphasis: (rules.map((r) => /-\s*([\w ,&]+?\bEmphasis)\b/.exec(r.group)).find(Boolean) || [])[1] || null,
      undeclared: /undeclared/i.test(program || '') || /_UNS$/i.test(programCode || '') || rules.some((r) => r.rname === 'UNDECIDE' && r.status !== 'complete'),
      catalogYear: catalog ? `${catalog[1]} ${catalog[2]}` : null,
      preparedOn: (all.match(/Prepared On\s+(\d{1,2}\/\d{1,2}\/\d{4})/i) || [])[1] || null,
      metrics: metricsOf(doc),
      entries,
      rules,
    };
  }

  /** How a transcript row counts: earned, in-progress, no-credit, or review (transfer/exam). */
  function classifyEntry(e) {
    // ">D" duplicate and ">X" excluded rows don't count
    if ((e.flags || '').toUpperCase().split(/[\s,>]+/).some((f) => f === 'D' || f === 'X')) return 'no-credit';
    if (e.grade === 'PL') return 'planned';
    if (e.grade === 'IP' || e.grade === 'RG') return 'in-progress';
    if (['YES', 'TA', 'TB', 'TC', 'T', 'TR', 'AP', 'PR', 'P', 'S'].includes(e.grade)) return 'review';
    if ((e.units !== null && e.units <= 0) || ['F', 'W', 'NP', 'U', 'NC', 'I', 'NR', 'NG'].includes(e.grade)) return 'no-credit';
    return e.units !== null && e.grade in GRADE_POINTS ? 'earned' : 'review';
  }

  return { parseAudit, normalizeCode, classifyEntry, GRADE_POINTS };
});
