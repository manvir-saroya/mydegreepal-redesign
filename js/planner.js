/* Turns a parsed audit into a semester-by-semester class list through graduation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./audit.js'));
  else root.DegreePlanner = factory(root.DegreeAudit);
})(typeof self !== 'undefined' ? self : this, function (Audit) {
  'use strict';

  const { normalizeCode, classifyEntry, GRADE_POINTS } = Audit;
  const FIRST_TERM = 'Spring 2027'; // the term with a real published schedule
  const BIT = { S27: 1, F26: 2, S26: 4, F25: 8, S25: 16, U26: 32 };
  const SPRING = BIT.S27 | BIT.S26 | BIT.S25;
  const FALL = BIT.F26 | BIT.F25;
  const SEASONS = ['Spring', 'Summer', 'Fall'];
  const STANDING = { Freshman: 0, Sophomore: 30, Junior: 60, Senior: 90 };
  const FULL_TIME = 12;
  const MAX_TERMS = 16;
  const LOW_PRIORITY_TITLE = /\b(?:special topics|directed|independent|undergraduate research|internship|thesis|field study|practicum|tutor|learning assistant|service learning)\b/i;
  const NON_COURSE_RULE = /\bgpa\b|grade point|residen|total units|units required|minimum.*units.*degree|bachelor|university requirement.*complete|catalog/i;
  const ADMIN_RULE = /^(?:REQ-UNITS|REQ-GPA|REQ-RES|UNDECIDE)$/; // tracked by the audit, not met by picking a class
  const OVERLAY_RULE = /writing in the discipline|culminating experience/i; // can share a class with the major
  const PLACEMENT = /placement/i;
  const UPPER_DIVISION_RULE = /upper[- ]division\s+(?:units|hours|credits)/i;

  // ---- terms ---------------------------------------------------------------
  function termIndex(name) {
    const m = /^(Spring|Summer|Fall)\s+(\d{4})$/.exec(String(name).trim());
    return m ? Number(m[2]) * 3 + SEASONS.indexOf(m[1]) : null;
  }
  const termName = (i) => `${SEASONS[i % 3]} ${Math.floor(i / 3)}`;
  const nextTerm = (i, summers) => (i % 3 === 0 && !summers ? i + 2 : i + 1);

  function parseTerm(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    let m = /(Spring|Summer|Fall)\D*(\d{4})/i.exec(s);
    if (m) return termIndex(`${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`);
    m = /^(SP|SU|FA)\s*(\d{2})$/i.exec(s);
    if (m) return (2000 + Number(m[2])) * 3 + { SP: 0, SU: 1, FA: 2 }[m[1].toUpperCase()];
    m = /^(\d{1,2})[/-](?:\d{1,2}[/-])?(\d{4})$/.exec(s);
    if (m) {
      const month = Number(m[1]);
      return Number(m[2]) * 3 + (month <= 6 ? 0 : month <= 8 ? 1 : 2);
    }
    return null;
  }

  /** The semester a student on a standard 4-year path finishes. */
  function onTimeTerm(audit) {
    const expected = parseTerm(audit.expectedGraduation);
    if (expected) return { index: expected, source: 'audit' };
    let start = parseTerm(audit.startYear);
    if (!start && /^\d{4}$/.test(String(audit.startYear || '').trim())) start = Number(audit.startYear) * 3 + 2;
    if (!start) {
      const terms = audit.entries.filter((e) => classifyEntry(e) === 'earned').map((e) => parseTerm(e.term)).filter(Boolean);
      // a summer bridge class before the first Fall or Spring doesn't start the 8 semesters
      const regular = terms.filter((t) => t % 3 !== 1);
      if (terms.length) start = regular.length ? Math.min(...regular) : Math.min(...terms) + 1;
    }
    if (!start) return null;
    let i = start;
    for (let n = 1; n < 8; n++) i = nextTerm(i, false);
    return { index: i, source: 'start' };
  }

  // ---- catalog helpers ---------------------------------------------------------
  const courseNumber = (code) => Number((code.match(/\d+/) || [0])[0]);
  const isUpper = (code) => courseNumber(code) >= 100 && courseNumber(code) < 200;
  const isHonors = (code) => /\d+H$/.test(code);
  const recentCount = (c) => { let n = 0; for (let m = c ? c.m : 0; m; m >>= 1) n += m & 1; return n; };

  function offeredIn(course, index, firstIndex) {
    if (!course) return false;
    if (index === firstIndex) return !!(course.m & BIT.S27);
    if (!course.m) return true; // no recent record: allowed later, flagged in notes
    const season = index % 3;
    if (season === 0) {
      // a Spring run from two years ago doesn't count if the class has since moved to other terms
      const recent = course.m & (BIT.S27 | BIT.S26);
      return !!recent || (!!(course.m & BIT.S25) && !(course.m & FALL));
    }
    if (season === 2) return !!(course.m & FALL);
    return !!(course.m & BIT.U26);
  }
  const usualTerms = (c) => {
    const out = [];
    if ((c.m & (BIT.S27 | BIT.S26)) || ((c.m & BIT.S25) && !(c.m & FALL))) out.push('Spring');
    if (c.m & FALL) out.push('Fall');
    if (c.m & BIT.U26) out.push('Summer');
    return out;
  };

  const summerOnly = (c) => !!c && c.m === BIT.U26;
  const prereqCodes = (n) => (typeof n === 'string' ? [n.split('|')[0]] : n.x ? [] : (n.a || n.o).flatMap(prereqCodes));
  /** True when `from` depends on `to`, directly or through a chain of prerequisites. */
  function dependsOn(all, from, to, seen = new Set()) {
    const course = all[from];
    if (!course || !course.p || seen.has(from)) return false;
    seen.add(from);
    return prereqCodes(course.p).some((code) => code === to || dependsOn(all, code, to, seen));
  }

  const flatten = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]+/g, ' ').trim();
  function majorAllowed(course, program) {
    if (!course.rm || !program) return true;
    const p = flatten(program);
    return course.rm.some((name) => { const n = flatten(name); return p.includes(n) || n.includes(p.replace(/ b [sa]$/, '')); });
  }

  // ---- requirement needs -------------------------------------------------------
  function isOpen(rule) {
    if (rule.status === 'unfulfilled') return true;
    return rule.status === 'in-progress' && Number((rule.needs.match(/NEEDS:\s*([\d.]+)/i) || [])[1]) > 0;
  }
  function needOf(rule) {
    // "NEEDS: 6.0 HOURS 2 SETS" means both must be met, and the sets decide what to take
    const sets = /(\d+)\s*(?:COURSES?|SETS?)\b/i.exec(rule.needs);
    if (sets) return { kind: 'courses', n: Number(sets[1]), known: true };
    const m = /NEEDS:\s*([\d.]+)\s*(HOURS?|UNITS?|SUB-GROUPS?)/i.exec(rule.needs);
    if (m) return { kind: /SUB/i.test(m[2]) ? 'groups' : 'units', n: Number(m[1]), known: true };
    const u = /(\d+(?:\.\d+)?)\s*units/i.exec(rule.label);
    if (u) return { kind: 'units', n: Number(u[1]), known: false };
    return { kind: 'courses', n: 1, known: false };
  }

  /** Audit choice text marks retired options "CSE 021(THROUGH SP22)", "A OR B" pairs, and "A & B" sets taken together. */
  function readChoiceText(rule) {
    const pairs = [];
    const retired = new Set();
    const links = new Map();
    const link = (a, b) => { links.set(a, [...(links.get(a) || []), b]); };
    const text = rule.choiceText || '';
    let subject = '';
    let prev = null;
    for (const m of text.matchAll(/(?:([A-Z]{2,8})\s*)?(\d{3}[A-Z]{0,2})(\([^)]*\))?/g)) {
      if (m[1] && !['OR', 'AND'].includes(m[1])) subject = m[1];
      const code = normalizeCode(`${subject} ${m[2]}`);
      if (m[3] && /THROUGH/.test(m[3])) retired.add(code);
      if (prev && /\bOR\b/.test(`${text.slice(prev.end, m.index)} ${m[1] || ''}`)) pairs.push([prev.code, code]);
      if (prev && text.slice(prev.end, m.index).includes('&')) { link(prev.code, code); link(code, prev.code); }
      prev = { code, end: m.index + m[0].length };
    }
    return { pairs, retired, links };
  }

  // ---- main ----------------------------------------------------------------------
  function buildPlan(audit, catalog, options = {}) {
    const opts = { maxUnits: 16, summers: false, target: null, prefer: [], avoid: [], ...options };
    const courses = catalog.courses;
    const prefer = new Set(opts.prefer);
    const avoid = new Set(opts.avoid);
    const firstIndex = termIndex(FIRST_TERM);
    const warnings = [];

    // what the student has
    const history = new Map();
    for (const e of audit.entries) {
      const list = history.get(e.code) || [];
      list.push({ ...e, how: classifyEntry(e) });
      history.set(e.code, list);
    }
    const inProgress = new Set();
    const assumed = new Set();
    function hasCredit(code, minGrade) {
      const need = minGrade && minGrade in GRADE_POINTS ? GRADE_POINTS[minGrade] : 0;
      for (const e of history.get(code) || []) {
        if (e.how === 'earned' && GRADE_POINTS[e.grade] >= need) return true;
        if (e.how === 'in-progress') { inProgress.add(code); return true; }
        if (e.how === 'review') { assumed.add(code); return true; }
      }
      return false;
    }
    // the Entry Level Writing Requirement needs WRI 001 at C or better (General Catalog 2026-27, navoid 3664)
    const satisfiedByHistory = (code) => hasCredit(code, code === 'WRI 001' ? 'C' : 'C-');
    const takenTitles = new Set();
    for (const [code, list] of history) {
      if (satisfiedByHistory(code) && courses[code]) takenTitles.add(`${courses[code].t}|${courses[code].u}`);
      void list;
    }

    // items in the plan
    const plan = new Map(); // code -> item
    function addCourse(code, fields, later = false) {
      if (plan.has(code)) return plan.get(code);
      const c = courses[code];
      const item = {
        code, title: c ? c.t : 'Check title in the catalog', units: c ? c.u || 0 : 4,
        kind: 'required', reason: '', ruleId: null, options: [], notes: [], ...fields,
      };
      plan.set(code, item);
      if (!later) linkCourse(item);
      return item;
    }
    /** Pulls in co-requisites and prerequisites. Runs after a rule's picks are all in the plan. */
    function linkCourse(item) {
      const { code } = item;
      const c = courses[code];
      for (const co of (c && c.co) || []) {
        // no scheduled offering means it's arranged individually, like independent study
        if (courses[co] && !courses[co].m) item.notes.push(`Also requires ${co}, arranged with the department.`);
        else ensureCoreq(co, code);
      }
      ensurePrereqs(code, new Set([code]));
      return item;
    }
    function ensureCoreq(code, parent) {
      if (plan.has(code) || satisfiedByHistory(code) || !courses[code]) return;
      addCourse(code, { kind: 'coreq', reason: `Taken together with ${parent}` });
    }

    function pathCost(node, seen) {
      if (typeof node === 'string') {
        const [code, min] = node.split('|');
        if (hasCredit(code, min) || plan.has(code)) return 0;
        const c = courses[code];
        if (!c || c.g || seen.has(code) || isHonors(code) || avoid.has(code)) return 50;
        const penalty = c.m ? 0 : 20;
        if (!c.p) return 1 + penalty;
        const next = new Set(seen); next.add(code);
        return 1 + penalty + pathCost(c.p, next);
      }
      if (node.x) return PLACEMENT.test(node.x) ? 0 : 30;
      if (node.a) return node.a.reduce((s, n) => s + pathCost(n, seen), 0);
      if (node.o) return Math.min(...node.o.map((n) => pathCost(n, seen)));
      return 0;
    }
    /** True when this prerequisite expression can't be met without `code`, given the other classes in `have`. */
    function dependsOnNode(node, code, have) {
      if (typeof node === 'string') return node.split('|')[0] === code;
      if (node.x) return false;
      if (node.a) return node.a.some((n) => dependsOnNode(n, code, have));
      if (node.o.some((n) => nodeMet(n, have) || (n.x && PLACEMENT.test(n.x)))) return false;
      return node.o.some((n) => dependsOnNode(n, code, have));
    }
    /** Semesters of prerequisites still ahead of a class. Long chains are what delay graduation. */
    function chainLength(node, seen = new Set()) {
      if (typeof node === 'string') {
        const [code, min] = node.split('|');
        if (hasCredit(code, min) || seen.has(code)) return 0;
        const c = courses[code];
        if (!c || c.g) return 0;
        const next = new Set(seen); next.add(code);
        return 1 + (c.p ? chainLength(c.p, next) : 0);
      }
      if (node.x) return 0;
      if (node.a) return Math.max(0, ...node.a.map((n) => chainLength(n, seen)));
      if (node.o) {
        if (node.o.some((n) => n.x && PLACEMENT.test(n.x))) return 0;
        return Math.min(...node.o.filter((n) => !n.x).map((n) => chainLength(n, seen)), 9);
      }
      return 0;
    }
    function nodeMet(node, extra) {
      if (typeof node === 'string') {
        const [code, min] = node.split('|');
        return hasCredit(code, min) || (extra && extra.has(code));
      }
      if (node.x) return false;
      if (node.a) return node.a.every((n) => nodeMet(n, extra) || !!n.x);
      if (node.o) return node.o.some((n) => nodeMet(n, extra)) || node.o.every((n) => n.x);
      return true;
    }
    function ensureNode(node, owner, seen) {
      if (typeof node === 'string') {
        const [code, min] = node.split('|');
        if (hasCredit(code, min) || plan.has(code) || seen.has(code)) return;
        const c = courses[code];
        if (!c || c.g) { noteFor(owner, `Prerequisite ${code} isn’t in the catalog data. Confirm it with your advisor.`); return; }
        if (!c.m) noteFor(owner, `Prerequisite ${code} hasn’t run recently. Ask your advisor about a substitute.`);
        addCourse(code, { kind: 'prereq', reason: `Needed before ${owner}` });
        return;
      }
      if (node.x) { noteFor(owner, `Lists ${node.x} as a prerequisite. If you don’t have this score, confirm with your advisor.`); return; }
      if (node.a) { node.a.forEach((n) => ensureNode(n, owner, seen)); return; }
      if (node.o) {
        const planned = new Set(plan.keys());
        if (node.o.some((n) => nodeMet(n, planned))) return;
        // a placement exam stands in for a remedial class, so don't assume the student needs that class
        const exam = node.o.find((n) => n.x && PLACEMENT.test(n.x));
        if (exam) { noteFor(owner, `Requires ${exam.x} or a lower-level class. If you haven’t placed in, confirm with your advisor.`); return; }
        const best =[...node.o].filter((n) => !n.x).sort((a, b) => pathCost(a, seen) - pathCost(b, seen))[0];
        if (best) ensureNode(best, owner, seen);
      }
    }
    function ensurePrereqs(code, seen) {
      const c = courses[code];
      if (!c || !c.p) return;
      ensureNode(c.p, code, seen);
    }
    function noteFor(code, text) {
      const item = plan.get(code);
      if (item && !item.notes.includes(text)) item.notes.push(text);
    }

    // ---- 1. decide which classes satisfy each open requirement
    let open = audit.rules.filter(isOpen);

    // "complete N of these groups": only plan the N easiest
    const byParent = new Map();
    for (const r of open) { const l = byParent.get(r.rname) || []; l.push(r); byParent.set(r.rname, l); }
    for (const [, list] of byParent) {
      const m = /NEEDS:\s*(\d+)\s*SUB-GROUPS?/i.exec(list[0].reqNeeds || '');
      if (!m || list.length <= Number(m[1])) continue;
      const keep = new Set([...list].sort((a, b) => needOf(a).n - needOf(b).n).slice(0, Number(m[1])));
      open = open.filter((r) => !list.includes(r) || keep.has(r));
    }

    const courseRules = [];
    const slotRules = [];
    const upperRules = [];
    const skipped = [];
    for (const rule of open) {
      if (ADMIN_RULE.test(rule.rname)) continue;
      const label = `${rule.group} ${rule.label}`;
      const hasChoices = rule.choices.some((c) => /\d/.test(c));
      if (hasChoices) courseRules.push(rule);
      else if (UPPER_DIVISION_RULE.test(label) && needOf(rule).kind === 'units') upperRules.push(rule);
      else if (NON_COURSE_RULE.test(label)) skipped.push(rule);
      else slotRules.push(rule);
    }

    function candidatesFor(rule) {
      const { retired } = readChoiceText(rule);
      const out = new Map();
      for (const raw of rule.choices) {
        const code = normalizeCode(raw);
        if (code.includes('*')) {
          if (!/^[A-Z]{2,8} [\d*]{3}[A-Z]{0,2}$/.test(code)) continue;
          const re = new RegExp(`^${code.replace(/\*/g, '[0-9]')}[A-Z]?$`);
          for (const k of Object.keys(courses)) if (re.test(k)) out.set(k, true);
        } else if (courses[code] && !out.has(code)) out.set(code, false);
        else if (!courses[code] && /^[A-Z]{2,8} \d{3}[A-Z]{0,2}$/.test(code)) out.set(code, false);
      }
      return [...out].filter(([code]) => {
        const c = courses[code];
        if (retired.has(code) || (c && c.g)) return false;
        if (satisfiedByHistory(code)) return false;
        return !(c && takenTitles.has(`${c.t}|${c.u}`));
      }).map(([code, wild]) => ({ code, wild }));
    }

    const credited = new Map(); // code -> rule id
    const programName = flatten(audit.program || '');
    const majorSubjects = new Set((catalog.majors || []).filter((m) => programName.startsWith(flatten(m.n))).flatMap((m) => m.a));
    let chainBudget = 3; // semesters of prerequisites that fit before the target
    if (opts.target && opts.target >= firstIndex) {
      chainBudget = 0;
      for (let i = firstIndex; i < opts.target; i = nextTerm(i, opts.summers)) chainBudget += 1;
    }
    function score(cand, need, left, links) {
      const { code, wild } = cand;
      const c = courses[code];
      if (!c) return 900;
      let s = 0;
      for (const partner of links.get(code) || []) s += 3 * ((courses[partner] && courses[partner].u) || 0);
      if (need.kind !== 'units' && /\d[A-Z]*L$/.test(code)) s += 60; // lead with the lecture, not its lab
      if (majorSubjects.has(code.split(' ')[0])) s -= 20;
      if (need.kind !== 'units' && wild && (c.u || 0) < 3) s += 60;
      if (prefer.has(code)) s -= 1000;
      if (avoid.has(code)) s += 1000;
      if (plan.has(code)) s -= 40;
      s += 12 * pathCost(c.p || { a: [] }, new Set([code]));
      if (c.p && !plan.has(code)) {
        const chain = chainLength(c.p, new Set([code]));
        s += 3 * chain + 25 * Math.max(0, chain - chainBudget); // only chains that outrun the time left are costly
      }
      if (c.m && recentCount(c) === 1 && !(c.m & (BIT.S27 | BIT.F26))) s += 40; // ran once and not lately
      if (c.rc && !c.rc.includes('Junior') && c.rc.includes('Senior')) s += 15;
      if (!c.m) s += 250; else s -= 3 * recentCount(c);
      if (c.m === BIT.U26 && !opts.summers) s += 200;
      if (!majorAllowed(c, audit.program)) s += 400;
      if (isHonors(code)) s += 60;
      if (LOW_PRIORITY_TITLE.test(c.t)) s += 300;
      if (need.kind === 'units') s += 2 * Math.max(0, (c.u || 0) - left) + (left <= 4 ? 8 * Math.max(0, left - (c.u || 0)) : 0);
      if (!c.u) s += 100;
      return s + courseNumber(code) / 1000;
    }

    const ordered = courseRules.map((rule) => ({ rule, cands: candidatesFor(rule) }))
      .sort((a, b) => Number(OVERLAY_RULE.test(a.rule.label)) - Number(OVERLAY_RULE.test(b.rule.label)) || a.cands.length - b.cands.length);

    const unresolved = [];
    for (const { rule, cands } of ordered) {
      const overlay = OVERLAY_RULE.test(rule.label);
      const need = needOf(rule);
      const { pairs, links } = readChoiceText(rule);
      const wide = cands.some((c) => c.wild);
      const pool = cands.filter((c) => overlay || !credited.has(c.code));
      const picked = [];
      let left = need.n;
      while (left > 0 && pool.length) {
        pool.sort((a, b) => score(a, need, left, links) - score(b, need, left, links));
        const cand = pool.shift();
        const c = courses[cand.code];
        if (!c) continue;
        if (avoid.has(cand.code) && pool.some((p) => !avoid.has(p.code))) { pool.push(cand); continue; }
        picked.push(cand.code);
        credited.set(cand.code, rule.id);
        left -= need.kind === 'units' ? (c.u || 0) : 1;
        // lab partners count toward unit totals; "A or B" means never both
        for (const co of c.co || []) {
          const i = pool.findIndex((p) => p.code === co);
          if (i >= 0) { pool.splice(i, 1); credited.set(co, rule.id); if (need.kind === 'units') left -= courses[co].u || 0; }
        }
        // "A & B" counts as one choice, so both go in the plan
        for (const partner of links.get(cand.code) || []) {
          const i = pool.findIndex((p) => p.code === partner);
          if (i < 0) continue;
          pool.splice(i, 1);
          picked.push(partner);
          credited.set(partner, rule.id);
          if (need.kind === 'units') left -= courses[partner].u || 0;
        }
        const twins = pairs.filter((p) => p.includes(cand.code)).flat();
        for (let i = pool.length - 1; i >= 0; i--) {
          const other = pool[i].code;
          const sameCourse = other.replace(/H$/, '') === cand.code.replace(/H$/, '');
          if (twins.includes(other) || sameCourse || (courses[other] && courses[other].t === c.t && courses[other].u === c.u)) pool.splice(i, 1);
        }
      }
      const others = pool.filter((p) => courses[p.code] && courses[p.code].m && !avoid.has(p.code) && !(links.has(p.code) && /\d[A-Z]*L$/.test(p.code)))
        .sort((a, b) => score(a, need, 4, links) - score(b, need, 4, links)).slice(0, 12).map((p) => p.code);
      const fresh = [];
      for (const code of picked) {
        const existing = plan.get(code);
        const fields = {
          kind: others.length ? 'choice' : 'required', reason: rule.label || rule.group, ruleId: rule.id, options: others,
        };
        if (existing) {
          if (overlay) { existing.notes.push(`Also counts for ${rule.label}.`); continue; }
          if (existing.kind === 'prereq') existing.notes.push(`${existing.reason}.`);
          Object.assign(existing, fields);
        } else fresh.push(addCourse(code, fields, true));
        const item = plan.get(code);
        if (wide) item.notes.push('Picked from a broad list. Check on your audit that it counts.');
        if (!need.known) item.notes.push('The audit doesn’t state how much is left here. Confirm with your advisor.');
      }
      fresh.forEach(linkCourse);
      if (left > 0) unresolved.push({ rule, left, kind: need.kind });
    }

    // a prerequisite added early may be unnecessary once later picks cover it (CSE 022 vs EE 021)
    for (let changed = true; changed;) {
      changed = false;
      const all = new Set(plan.keys());
      for (const item of [...plan.values()]) {
        if (item.kind === 'prereq') {
          const without = new Set(all); without.delete(item.code);
          const needed = [...plan.keys()].some((k) => {
            const p = courses[k] && courses[k].p;
            if (k === item.code) return false;
            // a lab that stays in the plan keeps its lecture, unless the lab is only there for that lecture
            const companion = plan.get(k).kind !== 'coreq' && ((courses[k] && courses[k].co) || []).includes(item.code);
            return companion || (p && dependsOnNode(p, item.code, without));
          });
          if (!needed) { plan.delete(item.code); credited.delete(item.code); changed = true; break; }
        }
        if (item.kind === 'coreq' && ![...plan.keys()].some((k) => ((courses[k] && courses[k].co) || []).includes(item.code))) {
          plan.delete(item.code); changed = true; break;
        }
      }
    }

    // ---- 2. requirements the audit doesn't list classes for
    let slotCount = 0;
    function addSlot(reason, units, kind = 'slot', upper = false) {
      slotCount += 1;
      plan.set(`SLOT ${slotCount}`, {
        code: `SLOT ${slotCount}`, title: reason, units, kind, reason, ruleId: null, options: [], upper, notes: [],
      });
    }
    function addSlots(reason, need, kind, upper) {
      if (need.kind === 'units') {
        let left = need.n;
        while (left > 0) { const u = Math.min(4, left); addSlot(reason, u, kind, upper); left -= u; }
      } else for (let i = 0; i < need.n; i++) addSlot(reason, 4, kind, upper);
    }
    for (const rule of slotRules) addSlots(rule.label || rule.group, needOf(rule), 'slot', false);
    for (const u of unresolved) {
      addSlots(`Class for: ${u.rule.label || u.rule.group}`, { kind: u.kind, n: u.left }, 'slot', false);
      warnings.push(`We couldn’t find enough offered classes for “${u.rule.label || u.rule.group}”. Ask your advisor what counts.`);
    }
    for (const rule of upperRules) {
      const planned = [...plan.values()].reduce((s, i) => s + ((i.upper || isUpper(i.code)) ? i.units : 0), 0);
      const left = needOf(rule).n - planned;
      if (left > 0) addSlots('Upper-division elective', { kind: 'units', n: left }, 'elective', true);
    }

    // total units to reach the degree
    const { earnedUnits, inProgressUnits, requiredUnits } = audit.metrics;
    // without the audit's totals, add up the classes it lists (a repeated class counts once)
    const listedUnits = (hows) => [...history.values()]
      .reduce((s, list) => s + Math.max(0, ...list.filter((e) => hows.includes(e.how)).map((e) => e.units || 0)), 0);
    const earned = earnedUnits ?? listedUnits(['earned', 'review']);
    const current = inProgressUnits ?? listedUnits(['in-progress']);
    if (earnedUnits == null) warnings.push('We couldn’t read your total earned units from the audit, so elective units may be off. Check the units section of your audit.');
    const degreeUnits = requiredUnits || 120;
    const plannedUnits = () => [...plan.values()].reduce((s, i) => s + i.units, 0);
    const short = degreeUnits - earned - current - plannedUnits();
    if (short > 0) addSlots(audit.undeclared ? 'Major or elective class' : 'Free elective', { kind: 'units', n: short }, 'elective', false);

    // ---- 3. schedule by semester
    const groupOf = new Map(); // lectures and labs move together
    const find = (c) => { while (groupOf.get(c) && groupOf.get(c) !== c) c = groupOf.get(c); return c; };
    for (const item of plan.values()) {
      groupOf.set(item.code, groupOf.get(item.code) || item.code);
      const c = courses[item.code];
      const together = ((c && c.co) || []).filter((co) => plan.has(co) && courses[co] && courses[co].m);
      // classes that require each other (directly or in a loop) can only be taken together
      if (c && c.p) for (const dep of collect(c.p, new Set())) if (dependsOn(courses, dep, item.code)) together.push(dep);
      for (const co of together) { groupOf.set(co, groupOf.get(co) || co); groupOf.set(find(co), find(item.code)); }
    }
    const bundles = new Map();
    for (const item of plan.values()) {
      const key = find(item.code);
      if (!bundles.has(key)) bundles.set(key, []);
      bundles.get(key).push(item);
    }

    const depthMemo = new Map();
    function collect(node, into) {
      if (typeof node === 'string') { const code = node.split('|')[0]; if (plan.has(code)) into.add(code); return into; }
      for (const n of node.a || node.o || []) collect(n, into);
      return into;
    }
    function depth(code, stack = new Set()) {
      if (depthMemo.has(code)) return depthMemo.get(code);
      if (stack.has(code)) return 0;
      stack.add(code);
      const c = courses[code];
      let d = 0;
      if (c && c.p) for (const dep of collect(c.p, new Set())) d = Math.max(d, 1 + depth(dep, stack));
      stack.delete(code);
      depthMemo.set(code, d);
      return d;
    }
    // how many later semesters depend on this class
    const dependents = new Map();
    for (const code of plan.keys()) {
      const c = courses[code];
      if (c && c.p) for (const dep of collect(c.p, new Set())) { if (!dependents.has(dep)) dependents.set(dep, new Set()); dependents.get(dep).add(code); }
    }
    const tailMemo = new Map();
    function tail(code, stack = new Set()) {
      if (tailMemo.has(code)) return tailMemo.get(code);
      if (stack.has(code)) return 0;
      stack.add(code);
      let t = 0;
      for (const next of dependents.get(code) || []) t = Math.max(t, 1 + tail(next, stack));
      stack.delete(code);
      tailMemo.set(code, t);
      return t;
    }

    const placed = new Set();
    const pending = new Map(bundles);
    const semesters = [];
    const targetIndex = opts.target;
    let index = firstIndex;
    let unitsSoFar = earned + current;

    const bundleUnits = (b) => b.reduce((s, i) => s + i.units, 0);
    const isSlot = (i) => i.code.startsWith('SLOT ');
    function bundleReady(b, idx) {
      const inBundle = new Set(b.map((i) => i.code));
      return b.every((item) => {
        if (isSlot(item)) return true;
        const c = courses[item.code];
        if (!c) return idx !== firstIndex;
        if (!offeredIn(c, idx, firstIndex)) return false;
        // standings like "Second Baccalaureate" don't apply to an undergraduate
        const ranks = (c.rc || []).map((r) => STANDING[r]).filter((n) => typeof n === 'number');
        if (ranks.length && unitsSoFar < Math.min(...ranks)) return false;
        if (!c.p) return true;
        const ok = new Set([...placed, ...inBundle]);
        return nodeMet(c.p, ok) || [...collect(c.p, new Set())].every((d) => ok.has(d));
      });
    }
    const priority = (b) => {
      const courseItems = b.filter((i) => !isSlot(i));
      const t = Math.max(0, ...courseItems.map((i) => tail(i.code)));
      const seasonal = courseItems.some((i) => { const c = courses[i.code]; return c && usualTerms(c).filter((x) => x !== 'Summer').length === 1; });
      const slotRank = b.every(isSlot) ? (b[0].kind === 'elective' ? 2 : 1) : 0;
      return { t, seasonal, slotRank, n: Math.min(...b.map((i) => courseNumber(i.code) || 999)) };
    };
    const compare = (a, b) => {
      const x = priority(a[1]); const y = priority(b[1]);
      return x.slotRank - y.slotRank || y.t - x.t || Number(y.seasonal) - Number(x.seasonal) || x.n - y.n || a[0].localeCompare(b[0]);
    };

    while (pending.size && semesters.length < MAX_TERMS) {
      const remaining = [...pending.values()].reduce((s, b) => s + bundleUnits(b), 0);
      let termsLeft = null;
      if (targetIndex && targetIndex >= index) {
        termsLeft = 1;
        for (let i = index; i < targetIndex; i = nextTerm(i, opts.summers)) termsLeft += 1;
      }
      const summer = index % 3 === 1;
      const cap = summer ? Math.min(opts.maxUnits, 12) : opts.maxUnits;
      const paced = termsLeft ? Math.ceil(remaining / termsLeft) : Math.ceil(remaining / Math.ceil(remaining / cap));
      const load = summer ? Math.min(cap, paced) : Math.min(cap, Math.max(paced, Math.min(15, remaining)));

      const hasSummerOnly = (b) => b.some((i) => summerOnly(courses[i.code]));
      const ready = [...pending]
        .filter(([, b]) => bundleReady(b, index) && (!summer || opts.summers || hasSummerOnly(b)))
        .sort(compare);
      const chosen = [];
      let units = 0;
      for (const entry of ready) {
        const u = bundleUnits(entry[1]);
        if (units + u > cap && units > 0) continue;
        if (units >= load) break;
        if (u > cap && units === 0 && !isSlot(entry[1][0])) { /* oversized single class: allow alone */ }
        chosen.push(entry);
        units += u;
      }
      for (const [key, b] of chosen) { pending.delete(key); b.forEach((i) => placed.add(i.code)); }
      // electives are flexible, so a smaller class can use up leftover room
      const room = cap - units;
      const elective = [...pending.values()].find((b) => b.length === 1 && b[0].kind === 'elective' && b[0].units > room);
      if (!summer && units < load && room >= 2 && elective) {
        slotCount += 1;
        const piece = { ...elective[0], code: `SLOT ${slotCount}`, units: room, notes: [], options: [] };
        elective[0].units -= room;
        placed.add(piece.code);
        chosen.push([piece.code, [piece]]);
        units += room;
      }
      semesters.push({
        index, term: termName(index), confirmed: index === firstIndex, summer,
        courses: chosen.flatMap(([, b]) => b), units,
      });
      unitsSoFar += units;
      // a class that only runs in summer earns its own summer term, even with summers off
      const summerNext = index % 3 === 0 && [...pending.values()].some((b) => hasSummerOnly(b) && bundleReady(b, index + 1));
      index = summerNext ? index + 1 : nextTerm(index, opts.summers);
    }
    for (let i = semesters.length - 1; i >= 0; i--) if (!semesters[i].courses.length) semesters.splice(i, 1);
    // leftover elective pieces in one semester read better as a single class
    for (const s of semesters) {
      const pieces = s.courses.filter((i) => i.kind === 'elective' && i.units < 4);
      if (pieces.length < 2) continue;
      pieces[0].units = pieces.reduce((sum, i) => sum + i.units, 0);
      s.courses = s.courses.filter((i) => !pieces.slice(1).includes(i));
    }

    const stuck = [...pending.values()].flat();
    if (stuck.length) warnings.push(`These classes couldn’t be fitted into a semester: ${stuck.map((i) => i.code).join(', ')}. Talk to your advisor.`);

    // ---- 4. notes on each class
    for (const s of semesters) {
      for (const item of s.courses) {
        if (isSlot(item)) continue;
        const c = courses[item.code];
        if (!c) { item.notes.push('Not found in the course data. Confirm it’s still offered.'); continue; }
        item.crns = s.confirmed ? c.crn || [] : [];
        item.linked = s.confirmed && !!c.lk;
        item.usually = usualTerms(c);
        if (!c.m) item.notes.push('No recent offering on record. Check with the department before counting on it.');
        else if (summerOnly(c)) item.notes.push('Recently offered in Summer only. Summer classes may have separate fees and aid rules.');
        else if (!s.confirmed && item.usually.filter((x) => x !== 'Summer').length === 1) item.notes.push(`Recently offered in ${item.usually[0]} only, so missing it can cost a year.`);
        if (c.pa) item.notes.push('The official prerequisite wording is ambiguous. Confirm your eligibility.');
        if (c.cc) item.notes.push('Some prerequisites may be taken at the same time. Check the catalog.');
        if (!majorAllowed(c, audit.program)) item.notes.push(`Restricted to ${c.rm.slice(0, 3).join(', ')}${c.rm.length > 3 ? ', and others' : ''}. You may need department approval.`);
        if (c.p) {
          const waiting = collect(c.p, new Set());
          for (const code of inProgress) if (JSON.stringify(c.p).includes(`"${code}`)) waiting.add(code);
          const current2 = [...waiting].filter((code) => inProgress.has(code));
          if (current2.length) item.notes.push(`Requires passing ${current2.join(', ')}, which you’re taking now.`);
          item.prereqText = readablePrereq(c.p);
        }
      }
    }

    const last = semesters.length ? semesters[semesters.length - 1] : null;
    const graduationIndex = last ? last.index : null;
    const allItems = semesters.flatMap((s) => s.courses);
    for (const s of semesters) {
      if (s !== last && !s.summer && s.units < FULL_TIME) {
        s.note = `Under ${FULL_TIME} units is part-time, which can affect financial aid. Fewer classes were available this term because of prerequisites and timing.`;
      }
    }
    if (inProgress.size) warnings.unshift(`This plan assumes you pass your ${inProgress.size} current ${inProgress.size === 1 ? 'class' : 'classes'}.`);
    const credits = [...assumed].filter((code) => courses[code]); // skips non-class items like ELWR and AHI
    if (credits.length) warnings.push(`Transfer or exam credit is counted as meeting prerequisites: ${credits.slice(0, 6).join(', ')}.`);
    const review = audit.rules.filter((r) => r.status === 'review').map((r) => r.label || r.group);

    return {
      semesters, warnings, graduationIndex,
      graduation: graduationIndex ? termName(graduationIndex) : null,
      target: targetIndex ? termName(targetIndex) : null,
      // without a major the audit is incomplete, so no graduation promise can be made
      undeclared: !!audit.undeclared,
      // classes that never fit mean the plan doesn't finish, whatever its last term
      onTime: targetIndex && !audit.undeclared ? (!stuck.length && (graduationIndex === null || graduationIndex <= targetIndex)) : null,
      classCount: allItems.filter((i) => !isSlot(i)).length,
      slotCount: allItems.filter(isSlot).length,
      flexibleCount: allItems.filter((i) => isSlot(i) || i.kind === 'choice').length,
      plannedUnits: allItems.reduce((s, i) => s + i.units, 0),
      earnedUnits: earned, inProgressUnits: current, degreeUnits,
      openRules: open.length, review,
      manualRules: skipped.map((r) => r.label || r.group),
      stuck,
    };
  }

  function readablePrereq(node) {
    if (typeof node === 'string') { const [c, g] = node.split('|'); return g ? `${c} (${g} or better)` : c; }
    if (node.x) return node.x;
    const parts = (node.a || node.o).map((n) => { const t = readablePrereq(n); return typeof n === 'string' || n.x ? t : `(${t})`; });
    return parts.join(node.a ? ' and ' : ' or ');
  }

  /** A flexible class can be what holds up graduation, so try the alternatives for the final semester. */
  function finishEarlier(first, audit, catalog, options) {
    if (first.onTime === true || first.undeclared) return first;
    const kept = new Set(options.prefer || []);
    const avoid = [...(options.avoid || [])];
    let best = first;
    for (let round = 0; round < 3 && best.semesters.length; round += 1) {
      const last = best.semesters[best.semesters.length - 1];
      const tries = last.courses.filter((i) => i.kind === 'choice' && i.options.length && !kept.has(i.code)).slice(0, 4);
      let better = null;
      for (const item of tries) {
        const plan = buildPlan(audit, catalog, { ...options, avoid: [...avoid, item.code] });
        if (!plan.stuck.length && plan.graduationIndex < (better ? better.plan : best).graduationIndex) better = { plan, code: item.code };
      }
      if (!better) break;
      best = better.plan;
      avoid.push(better.code);
    }
    return best;
  }

  /** Plan, and if it misses the target, what would fix it. */
  function planWithAdvice(audit, catalog, options = {}) {
    const onTime = onTimeTerm(audit);
    const target = options.target === undefined ? (onTime ? onTime.index : null) : options.target;
    const plan = finishEarlier(buildPlan(audit, catalog, { ...options, target }), audit, catalog, { ...options, target });
    plan.advice = [];
    if (plan.onTime === false) {
      // smallest change first
      const current = options.maxUnits || 16;
      const tries = [
        ...[15, 16, 18].map((u) => ({ label: `Take up to ${u} units`, change: { maxUnits: u }, when: current < u })),
        { label: 'Add summer classes', change: { summers: true }, when: !options.summers },
        { label: 'Up to 18 units and summer classes', change: { maxUnits: 18, summers: true }, when: current < 18 && !options.summers },
      ];
      for (const t of tries) {
        if (!t.when) continue;
        const p = buildPlan(audit, catalog, { ...options, target, ...t.change });
        if (p.onTime) { plan.advice.push({ label: t.label, change: t.change }); break; }
      }
    }
    return plan;
  }

  /** Independent check that a finished plan breaks no rule. Used by the test suite. */
  function verifyPlan(plan, audit, catalog, opts = {}) {
    const problems = [];
    const maxUnits = opts.maxUnits || 16;
    const done = new Set();
    for (const e of audit.entries) {
      const how = classifyEntry(e);
      if (how === 'in-progress' || how === 'review' || how === 'earned') done.add(e.code);
    }
    const first = termIndex(FIRST_TERM);
    const met = (node, have) => {
      if (typeof node === 'string') {
        const code = node.split('|')[0];
        const known = catalog.courses[code];
        return have.has(code) || !known || !!known.g; // missing courses are flagged to the student instead
      }
      if (node.x) return true;
      if (node.a) return node.a.every((n) => met(n, have));
      return node.o.some((n) => met(n, have)) || node.o.every((n) => n.x);
    };
    const seen = new Set();
    for (const s of plan.semesters) {
      const thisTerm = new Set(s.courses.map((i) => i.code));
      const single = s.courses.length === 1;
      if (s.units > maxUnits && !single) problems.push(`${s.term}: ${s.units} units over the ${maxUnits} cap`);
      for (const item of s.courses) {
        if (item.code.startsWith('SLOT')) continue;
        if (seen.has(item.code)) problems.push(`${item.code} scheduled twice`);
        seen.add(item.code);
        const c = catalog.courses[item.code];
        if (!c) continue;
        if (!offeredIn(c, s.index, first)) problems.push(`${item.code} isn’t offered in ${s.term}`);
        for (const co of c.co || []) {
          if (!done.has(co) && !thisTerm.has(co) && catalog.courses[co]?.m) problems.push(`${item.code}: co-requisite ${co} isn’t in ${s.term}`);
        }
        // only true co-requisites may share a semester with the class that needs them
        const partners = s.courses.filter((i) => {
          const other = catalog.courses[i.code];
          return (c.co || []).includes(i.code) || (other?.co || []).includes(item.code) || (dependsOn(catalog.courses, item.code, i.code) && dependsOn(catalog.courses, i.code, item.code));
        }).map((i) => i.code);
        if (c.p && !met(c.p, new Set([...done, ...partners]))) problems.push(`${item.code} in ${s.term}: prerequisites not met`);
      }
      for (const i of s.courses) done.add(i.code);
    }
    return problems;
  }

  return { buildPlan, planWithAdvice, verifyPlan, onTimeTerm, readablePrereq, usualTerms, parseTerm, termIndex, termName, nextTerm, isOpen, FIRST_TERM };
});
