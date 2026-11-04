// Regression tests for the audit parser and planner. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const A = require(path.join(root, 'js/audit.js'));
const P = require(path.join(root, 'js/planner.js'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/courses.json'), 'utf8'));
const sampleHtml = fs.readFileSync(path.join(root, 'samples/sample-audit.html'), 'utf8');
const settings = { maxUnits: 16, summers: false, prefer: [], avoid: [] };

const plan = (html) => P.planWithAdvice(A.parseAudit(html), catalog, settings);
const summary = (p) => p.semesters.map((s) => `${s.term}: ${s.courses.map((c) => c.code).join(', ')}`);

test('the sample audit produces the published sample plan', () => {
  const p = plan(sampleHtml);
  assert.deepEqual(summary(p), [
    'Spring 2027: CSE 100, CSE 140, CSE 108, MATH 131',
    'Fall 2027: CSE 107, CSE 111, CSE 160, CSE 120',
    'Spring 2028: CSE 150, ENGR 180, SLOT 1, SLOT 2',
  ]);
  assert.equal(p.graduation, 'Spring 2028');
  assert.equal(p.onTime, true);
  assert.deepEqual(P.verifyPlan(p, A.parseAudit(sampleHtml), catalog, settings), []);
});

test('an audit saved without closing </td> and </tr> tags still parses the same', () => {
  const loose = sampleHtml.replace(/<\/t[dr]>/gi, '');
  assert.deepEqual(summary(plan(loose)), summary(plan(sampleHtml)));
});

test('requirement text hidden inside <textarea> or <template> is ignored', () => {
  // a second copy of the whole audit, hidden where a browser would never render it
  // (terms shifted so the hidden rows aren't de-duplicated against the real ones)
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(sampleHtml)[1].replace(/class="term">(FA|SP|SU)2/g, 'class="term">$11');
  const withNoise = sampleHtml.replace(/<\/body>/i, `<textarea>${body}</textarea><template>${body}</template></body>`);
  const a = A.parseAudit(withNoise);
  const b = A.parseAudit(sampleHtml);
  assert.equal(a.rules.length, b.rules.length);
  assert.equal(a.entries.length, b.entries.length);
});

test('catalog codes are zero-padded so "CSE 30" finds CSE 030', () => {
  assert.equal(A.normalizeCode('CSE 30'), 'CSE 030');
  assert.ok(catalog.courses['CSE 030']);
});

test('UC Merced class standing thresholds match the 2026-27 General Catalog', () => {
  // Freshman 0-29.9, Sophomore 30-59.9, Junior 60-89.9, Senior 90+ (docs/uc-merced-policies/class-standing.md)
  const src = fs.readFileSync(path.join(root, 'js/planner.js'), 'utf8');
  assert.match(src, /STANDING = \{ Freshman: 0, Sophomore: 30, Junior: 60, Senior: 90 \}/);
});
