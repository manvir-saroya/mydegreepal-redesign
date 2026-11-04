---
name: MyDegreePal
description: A degree plan set as a commencement program: navy cover stock with gold foil, a white printed interior, status written as reference marks.
colors:
  cover-navy: "#13284c"
  cover-deep: "#0c1c38"
  foil-gold: "#e2b547"
  foil-bright: "#f0c95f"
  ivory: "#f4efe2"
  ivory-mist: "#c3cfe8"
  program-white: "#ffffff"
  desk-grey: "#e9ecf2"
  ink: "#14213d"
  ink-soft: "#4a5571"
  hairline: "#d5dae4"
  hairline-strong: "#858fa3"
  flag-red: "#a3311f"
  hood-engineering: "#e8742a"
  hood-science: "#f2b705"
  hood-arts: "#f7f5f0"
  hood-economics: "#b8692f"
  hood-business: "#c4ad7c"
  hood-health: "#f2907c"
typography:
  display:
    fontFamily: "Caslon Display, Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(46px, 6.4vw, 80px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Caslon Display, Libre Caslon Display, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "16.5px"
    fontWeight: 500
    lineHeight: 1.55
  body:
    fontFamily: "Public Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "Public Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 650
    lineHeight: 1.55
    letterSpacing: "0.14em"
rounded:
  control: "3px"
  seal: "50%"
spacing:
  xs: "6px"
  sm: "12px"
  md: "24px"
  lg: "44px"
  gutter: "24px"
  gutter-mobile: "16px"
components:
  button-gold:
    backgroundColor: "{colors.foil-gold}"
    textColor: "{colors.cover-deep}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-gold-hover:
    backgroundColor: "{colors.foil-bright}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-plain:
    backgroundColor: "{colors.program-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  segment-selected:
    backgroundColor: "{colors.cover-navy}"
    textColor: "{colors.ivory}"
    padding: "7px 15px"
  course-row:
    textColor: "{colors.ink}"
    padding: "12px 4px"
  sheet:
    backgroundColor: "{colors.program-white}"
    textColor: "{colors.ink}"
    padding: "34px 40px 44px"
  site-header:
    backgroundColor: "{colors.cover-navy}"
    textColor: "{colors.ivory}"
    height: "64px"
---

# Design System: MyDegreePal

## Overview

**Creative North Star: "The Commencement Program"**

The plan is the printed program for the student's own commencement: an Order of Exercises, one exercise per semester, closing on the Conferral of the Degree. A navy cover with gold foil frames the interior; the interior is a white sheet of program stock laid on a cool grey desk, so the page reads as an object. Hairline rules and dotted leaders set each course to its units, as in a printed programme.

Density is a calm reading column, not a dashboard. There are no status pills, no progress ring, no rounded cards. State is carried by printed reference marks and by stroke (solid, hatched, outlined), never by hue. The only discipline colour is the hood band under the cover.

**Key Characteristics:**
- Two stocks: navy cover (header, landing cover, plan band, page titles) and white interior.
- Gold foil is the only accent: double rules, the one primary button, the active nav underline, panel headings.
- Engraved display serif for headings and numerals of ceremony; one sans for every working word.
- Reference marks (`*` `†` `‡` `°`) instead of coloured status.
- Flat by default; a single paper shadow lifts the sheet and the specimen page.

## Colors

Strategy: committed navy cover, ink-on-white interior, one gold. Everything else is a tint of navy ink.

### Primary
- **Regalia Navy** (cover-navy): header, landing cover, plan-cover band, page-cover bands, selected segment, focus ring on light surfaces.
- **Deep Navy** (cover-deep): text on gold buttons, the What-If panel, selection text.
- **Foil Gold** (foil-gold): double rules, gold button, byline, active nav underline, seal ring, panel heading rules, focus ring on navy. **Foil Bright** is the gold button's hover.

### Neutral
- **Program White** (program-white): sheet, specimen page, landing instruction band, inputs.
- **Desk Grey** (desk-grey): page background behind every sheet (plan, catalog, privacy) and the footer.
- **Ink** (ink) and **Soft Ink** (ink-soft): body and secondary text, units measure fill, rules under semester heads (1px ink).
- **Ivory** and **Ivory Mist**: text on navy (headings and lede/secondary).
- **Hairline** (hairline) divides rows; **Hairline Strong** (hairline-strong) draws form-control borders and dotted leaders.
- **Flag Red** (flag-red): upload error text and border only.

### Hood velvet (discipline band)
Mapped in `hoodFor()` from the audit's program string, applied as a class on `#plan`. Order matters: first match wins.
- Engineering / bioengineering: Orange (#e8742a). Economics: Copper (#b8692f). Management or business: Drab (#c4ad7c). Public health or nursing: Salmon (#f2907c).
- Any `B.A.` degree: White (#f7f5f0). Then `B.S.`, science, biology, chemistry, physics, mathematics: Golden yellow (#f2b705). Then arts, history, English, literature, philosophy: White.
- No match: no class, band falls back to foil gold.
- Each hood class also sets `--hood-ink`, but no rule reads it (see Do's and Don'ts).

### Named Rules
**The One Gold Rule.** Gold is foil: rules, one primary action, accents on navy. It never fills a card and never marks state.
**The Hood Is Not Data Rule.** Hood colour appears only as the 14px band under the plan cover. It never tints text, bars, marks or rows.
**The Ink Measure Rule.** The units bar uses ink only: solid earned, hatched in progress, outlined planned.

## Typography

**Display Font:** Libre Caslon Display, registered as "Caslon Display" (weight 400 only; Georgia fallback)
**Body Font:** Public Sans variable (100-900, roman and italic), system sans fallback; tabular numerals set on `body`

**Character:** An engraved display serif for the ceremonial lines and a plain civic sans for everything a student has to read and act on.

### Hierarchy
- **Display** (400, clamp 46-80px, 1, -0.02em): landing H1. Plan cover: lead-in clamp 22-30px; conferral term clamp 52-96px at 0.95 ("one monumental line"); plain headline clamp 40-66px.
- **Headline** (400, 30px, 1.1): "Order of Exercises", semester names (25px on mobile), conferral line clamp 38-56px, page-cover H1 clamp 40-62px, instructions 34px, article H2 28px.
- **Title** (500, 16.5px): course titles. Course code is 700 at 14px, 0.05em; units 650 at 16px, right-aligned.
- **Body** (400, 16px, 1.55): all running text. Secondary text 14-15px in soft ink. Article measure 68ch.
- **Label** (650-750, 11.5-12.5px, 0.12-0.14em, uppercase): `.smallcaps` bylines, status words ("Published schedule"), control labels, panel headings, course tags. Despite the class name these are tracked capitals, not true small caps.

### Named Rules
**The Two Voices Rule.** Display serif for headings, numerals of ceremony (I. II. III.) and the marks; sans for everything else. No third face.
**The Tabular Rule.** Numerals are tabular everywhere so units and terms align down the leader column.

## Layout

One container: max-width 1160px, 24px side padding (16px at 680px and below). Vertical rhythm is open between exercises (30px gap between semesters) and tight inside them (12px row padding).

- Landing: two-column cover grid (1.05fr / 0.95fr, 56px gap) with the form left and the specimen page right; instructions band below on white with a 260px heading column and a three-step roman-numeral list; registration notice as a hairline box.
- Plan: cover band, 14px hood band, then a white sheet (22px below the band) holding the measure, controls, advice, and a two-column grid: Order of Exercises (fluid) and a 290px rail of notes, sticky at 86px under the 64px header, with a 1px hairline left border.
- Catalog and privacy: page-cover band, then a white sheet on the desk; catalog filters are a 3-column grid (1fr, 220px, 240px).
- Breakpoints: 960px stacks the cover grid, instructions and plan grid, and makes the rail static. 680px stacks steps and filters, makes the sheet full-bleed (margin -16px), hides semester numerals and the semester status label, and re-grids course rows so code, tag, units and chevron share line one and the title takes line two (leader dots are dropped).

## Elevation & Depth

Flat by default. Depth comes from stock change (navy cover, white sheet, grey desk), 1px hairlines and 3px double rules, not from shadow. Two shadows exist, both for "paper on a surface":
- **Sheet** (`0 1px 2px rgba(20,33,61,.06), 0 18px 40px -24px rgba(20,33,61,.35)`): the white interior on the desk.
- **Specimen page** (`0 2px 4px rgba(4,10,24,.3), 0 24px 48px -12px rgba(4,10,24,.55)`): the sample program on the navy cover, rotated -1.6deg (-1deg on mobile).

**The Paper Lift Rule.** Only a sheet of program stock is lifted. Buttons, rows and panels never cast shadows.

## Shapes

Square and printed. Controls (buttons, selects, inputs, segmented control) use 3px corners. Sheets, panels, notices, the dropzone and the What-If box are square. The only circles are the brand-mark ring and the 74px seal (62px mobile), a gold double-ruled "On time / Late" stamp. Rules are the shape language: 1px ink under semester heads and above the steps, 3px double gold under the header and cover and around the dropzone, the 4px gold `.rule-double` (two 1px lines) above the conferral and under "Order of Exercises".

## Components

### Reference-mark grammar
Status is printed, not coloured. Marks are set in the display face and are always explained in a legend.
- `*` published schedule (Spring 2027), `†` projected from recent offerings. Both sit after the semester name, and are mirrored in the catalog (`*` = on the Spring 2027 schedule).
- `‡` swappable elective: the row's tag reads "‡ Swappable" and its detail holds a swap select.
- `°` your pick (open GE or elective slot): tag reads "° Your pick"; slot rows use an italic code ("Open class", "Elective", "To be decided").
- Required courses carry no mark. Prerequisite and co-requisite rows carry a plain text tag ("Prerequisite", "Taken together") with no glyph.
- The legend (`.marks`) lists only marks present in the plan. Glyphs are `aria-hidden`; meaning is carried by the section's `aria-label` and the visible tag words.

### Cover, header and footer
- Header: navy, sticky, 64px, 3px double foil-line bottom border (42% gold). Brand = 30px ring with a gold cap glyph + wordmark in the display face, 23px ivory. Nav in tracked capitals; current page gets a 2px gold underline.
- Footer: colophon on the desk grey, 14px soft ink, independence statement and Privacy link.

### Dropzone
A 3px double gold frame on navy holding the gold button (a span; the real file input is an invisible full-cover overlay, so the zone is a normal file picker) and a one-line privacy hint. Hover and drag-over tint to 8% gold. `focus-within` draws a 2px gold outline 4px out. Busy state brightens the hint. Errors appear below in a white box with flag-red text and border.

### Buttons
- **Gold** (primary, one per view): gold fill, deep navy text, 3px radius, 650 weight; hover to foil-bright. The landing instance is 16px with 12px 22px padding.
- **Ghost**: transparent, ivory text, 42% gold border; on navy only (plan header actions: "Print or save PDF", "Start over").
- **Plain**: white with strong hairline border, ink text; border goes to ink on hover (apply-fix, Show more).
- All: 160ms colour transitions, 1px press (`translateY(1px)`), 2px focus ring (navy on light, gold on navy).

### Segmented control
Joined buttons in a 3px-radius strong-hairline frame, 1px hairline dividers; unselected soft ink, hover lifts to desk grey; selected (`aria-pressed="true"`) navy with ivory text. Selects and the checkbox (`accent-color` navy) sit beside it under small tracked-capital labels; the controls band is ruled above and below by hairlines.

### Measure
A 12px bar of three joined segments with 3px gaps: solid ink (earned), 135-degree ink hatch with 1.5px ink inset outline (in progress), outline only (planned). Legend swatches repeat the same fills; figures in bold. Segment widths come from JS (see Constraints).

### Specimen page (landing)
A white sheet rotated -1.6deg with a centred display title, tracked-capital sub, gold double rule, two semester heads, a 3-column list (code, title with leader, units) and a 30px conferral line; the Fall block hides on mobile. Labelled "A sample plan" in the caption with the mark key; the page itself is `aria-hidden`. Its `*` and `‡` glyphs are hand-set in markup, not rendered from data.

### Semester head
A 1px ink rule under a flex row: roman numeral (display, 18px soft ink, "I." "II."), semester name (30px display) with its `*` or `†` (26px soft ink), and at right a tracked-capital status word and the unit total. Notes under a head sit on a pale cream strip (#fbf6e8).

### Course row
A full-width button grid: 96px code, fluid main, tag, 34px units, 18px chevron; 12px gap. Main holds the title followed by a dotted leader (1.5px dotted strong hairline, lifted 5px) and a second line of reason in soft ink. Hover and expanded tint #f6f7fa; the chevron rotates 90deg over 200ms. The detail panel (`hidden` when closed) is indented to 112px and lists Why, Prerequisites, Recently offered, Spring 2027 CRNs and a swap select. Bottom border 1px hairline.

### Panels (rail)
Heading in 12px tracked capitals over a 3px double gold rule, then a bulleted list in soft ink at 15px. No box, no fill; the rail is separated by one vertical hairline. "Before you register" is hidden in print.

### Catalog row
A `<details>` with a 3-column summary (104px code, title with leader and optional `*`, 70px right-aligned units). The first row has a 1px ink top rule; hover and open tint #f6f7fa; body indented 120px with 68ch paragraphs. Filters are white inputs with strong hairline borders and 3px radius.

## Motion

Grammar: only the unfold, the cover morph and row open/close move.
- **Easing:** one curve, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (expo-style ease-out), used for every transition and animation.
- **Unfold** (once, when a plan first opens, `.unfold`): measure, controls, title, each semester and the conferral rise 14px while a clip-path reveals from the top, 520ms backwards-filled, staggered controls 60ms, title 120ms, semesters 180/240/300/360ms (all later ones 420ms), conferral 480ms.
- **Cover morph:** `.cover` and `.plan-cover` share `view-transition-name: cover`; JS wraps the swap in `document.startViewTransition` (group 420ms; root cross-fade 260ms) and skips it under reduced motion or when unsupported.
- **Micro:** 160ms colour/background, 120ms press, 200ms dropzone tint and chevron rotation.
- **Reduced motion:** every animation and transition is set to none; view transitions are skipped; all content is visible and complete without motion.

## Print

The plan prints as the program. `@page` margin 14mm; body 11.5pt on white. Hidden: header, footer, controls, head actions, advice strip, What-If buttons, chevrons, swap selects, and "Before you register". The plan cover turns white with ink text and a 3px ink double rule; the seal turns ink. The sheet loses its shadow and padding, the grid becomes one column, the rail flows below. Every course detail is forced open; semesters, panels, the measure and the conferral avoid page breaks. Hatched bar, hood band and legend swatches keep colour (`print-color-adjust: exact`).

## Do's and Don'ts

### Do:
- **Do** put status in a reference mark plus a word (`*` `†` `‡` `°`) and keep required items unmarked.
- **Do** keep gold to foil roles; keep one gold button per view.
- **Do** set course rows as code, title, dotted leader, units, with tabular numerals.
- **Do** use ink, hatch and outline to differentiate units; keep the sheet white on the desk grey.

### Don't:
- **Don't** use rounded cards, coloured status pills, or a progress ring or dial.
- **Don't** colour data with hood velvet; it belongs only to the band.
- **Don't** add shadows to anything but a sheet of paper.
- **Don't** use UC Merced's logo, colours as branding, or any wording that implies endorsement; the independence line stays in the footer and on the cover.
- **Don't** ship dynamic widths in a `style` attribute or `<style>` block; the CSP forbids it.

### Defects the build carries (not canonized)
- The "Late" seal uses a salmon (#f0a08f) ring and text, introduced by hue for state; this contradicts the stroke-not-hue rule and is a one-off, not a pattern to repeat.
- The hood band's colour name lives only in a `title` tooltip on an unlabelled div (not available to keyboard or touch users).
- White-ish hoods (Arts #f7f5f0) are nearly invisible against the desk grey.

## Constraints

- **Strict CSP** (vercel.json): `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'`. No inline scripts, no `<style>`, no `style=""` in markup. Dynamic values are written from JS: measure widths ride `data-w` attributes and are applied with `element.style.width` after render (CSSOM writes are allowed). Static colours go through classes (`.hood-*`).
- **Self-hosted fonts** in `fonts/` (libre-caslon-display.woff2, public-sans.woff2, public-sans-italic.woff2, latin subsets, `font-display: swap`), with `fonts/OFL.txt` stating SIL OFL 1.1 for Libre Caslon Display and Public Sans. No third-party font requests. The two upright faces are preloaded; the italic is not.
- **No build step**: plain HTML, `css/style.css`, vanilla JS (`audit.js`, `planner.js`, `app.js`, `catalog.js`). All tokens live in `:root`; hood classes override `--hood` and `--hood-ink`.
