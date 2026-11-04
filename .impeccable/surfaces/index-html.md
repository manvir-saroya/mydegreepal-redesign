---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["catalog.html","privacy.html"]
---

# Surface: Planner (index.html), plus Catalog and Privacy in the same world

Scope: full redesign of all three pages. Mode: Persuade on the landing state of index.html (visitor must upload or try the sample); Operate on the plan state and the catalog (scan, adjust, register). Privacy is Read.

Audience/job: UC Merced undergrad in registration week on a laptop, audit just run in MyDegreePath; wants the exact classes per semester. Proof: the real sample plan (CSE, B.S.), labelled as a sample. Constraints: static HTML/CSS/vanilla JS, strict CSP (no inline styles/scripts, self-hosted fonts), independent of UC Merced, keep advisor caveats, invent no claims.

## Direction contract

THESIS: The plan is the printed program for the student's own commencement: an Order of Exercises, one exercise per semester, ending in the Conferral of the Degree. Refuses the category default of a SaaS dashboard of rounded cards, coloured status chips and a progress widget.

OWN-WORLD: Cover stock in deep regalia navy (#13284c) with gold foil (#e2b547) rules and lettering; interior on bright white program stock with navy ink. Discipline hood velvet (Engineering orange, Science golden yellow, Arts white, Economics copper...) appears as the hood band once a plan loads. Libre Caslon Display for engraved display lines, Public Sans for every working word with tabular numerals. Double gold rules frame the cover; hairline rules and leader dots set course to units. Status is printed reference marks (* published schedule, † projected, ‡ swappable, ° your pick) explained in a legend, never coloured pills.

STORY: The visitor sees, in one viewport, that their own audit becomes this program (a real sample spread beside the cover), believes it because the sample is specific and private, and uploads or opens the sample. In the plan they read their conferral term first, then each exercise, adjust units/summer/target, and print it for their advisor.

FIRST VIEWPORT: Desktop: full-width navy cover band, ~640px tall. Left 6 columns: wordmark in gold small caps on a gold double rule; H1 "Your exact path to graduation" in Caslon Display ~76px ivory; lede; the upload as a gold-double-ruled frame containing the primary gold button and the privacy hint; "See a sample plan" link. Right 6 columns: the opened program interior (white page, slight rotation -2deg, real shadow) showing the sample's Order of Exercises: Spring 2027 with 4 courses and leader dots, Fall 2027 start, and "Conferral of the Degree · Spring 2028" at its foot, labelled "Sample". Mobile: the cover stacks, the program page shows below the upload, cropped to Spring 2027.

FORM: Commencement program booklet; grounded list position 4 of 7 (assigned by the roll); seed key d9eb1f9f. Raises: from the jackfield schedule, state drawn by mark and stroke, not hue; from the silk canopy, total palette commitment, so the cover drenches its whole band; from the linocut broadside, one monumental line per sheet, the conferral term set largest on the plan.

Signature interaction: when a plan loads, the cover closes upward to a band and the exercises unfold in sequence (staggered reveal, expo ease-out, 60ms steps, all content visible without motion under prefers-reduced-motion). Motion grammar: only this unfold plus row open/close; nothing else moves.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
