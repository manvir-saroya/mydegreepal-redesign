# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
UC Merced undergraduates planning their remaining classes, most intensely during registration windows (Spring 2027 registration: November 2–13, 2026). They are typically on a laptop with Chrome open to MyDegreePath (uAchieve self-service), have just run their degree audit, and want to know exactly which classes to take each semester to graduate on time. Undeclared students run a What-If audit. Secondary use: browsing the course catalog for offerings, prerequisites and Spring 2027 CRNs.

## Product Purpose
Turn a student's saved degree audit (MyDegreePath page saved as "Webpage, HTML Only") into an exact, semester-by-semester plan through graduation: remaining requirements, prerequisites in order, when classes are offered, unit limits per semester, optional summer. Success is a student leaving with a plan they can register from and take to their advisor.

## Positioning
It reads the student's own official audit, not a generic four-year map, and it does so entirely in the browser: no account, nothing uploaded. Spring 2027 uses the published schedule; later semesters are projected from recent offerings.

## Operating Context
- Audit is produced in MyDegreePath (ucmerced.uachieve.com/selfservice): Run Program → View Audit, then Save as "Webpage, HTML Only".
- Registration happens in UC Merced Connect / My Registration; the plan's "Before you register" list points there (My Checklist, holds, My Bill, appointment time).
- Students print or save the plan as PDF to keep it.
- Plan state lives in sessionStorage; closing the tab or Start over clears it.

## Capabilities and Constraints
- Static site (plain HTML, CSS, vanilla JS; no build step), hosted on Vercel. Course data: `data/courses.json` (schedule snapshot 2026-10-29). Sample audit: `samples/sample-audit.html`.
- Planner controls: Graduate by (on time / later), max units per semester (12/15/16/18), include summer. Course rows expand to show why, prerequisites, recent offerings, Spring 2027 CRNs, and a swap menu for swappable electives; "Open class" slots for student-chosen GE.
- Catalog: search by name, code or CRN; filter by subject and by when offered.
- No accounts, cookies or analytics in this version. An earlier version had Google sign-in and saved plans; this one does not connect to them.

## Brand Commitments
- Name: MyDegreePal. Existing mark: graduation-cap glyph.
- Operated by Dawood Khan as an independent student project; not affiliated with UC Merced. Must always say so and never use UC Merced's logo or imply endorsement.
- Keep the caveats: confirm the plan with your advisor; schedules change, check UC Merced Connect.

## Evidence on Hand
- The sample plan (Computer Science and Engineering, B.S.) produced from `samples/sample-audit.html` is real product output and may be shown as a demonstration, labelled as a sample.
- No user counts, testimonials, accuracy figures or press exist. Never invent them.

## Product Principles
1. The student's own audit is the source of truth; the plan never claims more certainty than the data has (published vs projected).
2. Private by construction: nothing leaves the browser.
3. Get a student from "I have my audit" to "I know what to register for" in under a minute.
4. Always defer to official advising and registration.

## Accessibility & Inclusion
WCAG 2.2 AA. Works by keyboard and screen reader; the upload is also a normal file picker; usable from 360px wide (catalog and plan reading on phones, even though producing the audit file needs a desktop browser).
