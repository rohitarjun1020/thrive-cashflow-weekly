---
name: Thrive Living Cash Flow
description: Bright, tile-based cash-flow analytics for Thrive Living's weekly finance review.
colors:
  canvas: "#F4F5F9"
  card: "#FFFFFF"
  sunk: "#F7F8FB"
  control-well: "#ECEDF3"
  line: "#E7E8EF"
  line-strong: "#D9DBE5"
  ink: "#10132A"
  ink-2: "#464B63"
  ink-3: "#62677E"
  accent: "#6D4AFF"
  accent-deep: "#4B2FD1"
  accent-ink: "#5532E6"
  accent-soft: "#F0ECFF"
  gain: "#0E9F6E"
  gain-ink: "#047857"
  gain-soft: "#E6F6EF"
  loss: "#E5484D"
  loss-ink: "#C42F35"
  loss-soft: "#FDECEC"
typography:
  display:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  headline:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  label:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  column-head:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  control-inner: "8px"
  control: "10px"
  inset: "12px"
  card: "16px"
  sheet: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  tile-gap: "16px"
  grid-gap: "20px"
  gutter: "28px"
components:
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "20px 22px"
  kpi-tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  kpi-hero:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.card}"
    typography: "{typography.display}"
    rounded: "{rounded.card}"
    padding: "22px 24px"
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "38px"
  button-hover:
    backgroundColor: "{colors.sunk}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.control}"
    height: "38px"
  button-ghost-hover:
    backgroundColor: "{colors.control-well}"
  select:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 32px 0 12px"
    height: "38px"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  segmented:
    backgroundColor: "{colors.control-well}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-option-on:
    backgroundColor: "{colors.card}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control-inner}"
    height: "32px"
  chip-filter:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 8px 5px 12px"
  tag-gain:
    backgroundColor: "{colors.gain-soft}"
    textColor: "{colors.gain-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  tag-loss:
    backgroundColor: "{colors.loss-soft}"
    textColor: "{colors.loss-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  drawer:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sheet}"
    width: "min(580px, calc(100vw - 24px))"
---

# Design System: Thrive Living Cash Flow

## Overview

**Creative North Star: "The Bright Bento Ledger"**

A bright, modern analytics surface in the Stripe and Linear lineage: a pale cool canvas, white rounded tiles floating on soft navy-tinted shadows, and one saturated violet block that holds the answer to the first question (where does cash stand now). Every other surface stays white and quiet so the violet block, the green/red money bars and the violet net-cash line carry the colour.

Density is medium-high and figure-first. Numbers are set heavy (800) in Manrope with tabular lining figures, labels sit above them at 600 in a muted slate, and supporting detail falls away in the lightest ink. Structure comes from tiles and gaps, never from rules between sections; hairlines live only inside tables. The build replaced an earlier sand-and-forest world in full; nothing from it carries over.

**Key Characteristics:**
- Pale cool canvas, white 16px-radius tiles, soft two-layer shadow, no card borders on screen.
- A bento KPI grid led by one violet-gradient hero tile with a white sparkline.
- Violet for selection, focus, the net-cash line and the hero; green and red only for money direction.
- One family (Manrope 400 to 800), tabular figures everywhere.
- Print rebuilds the page on white: shadows become 1px borders, the hero becomes a white tile with a violet frame.

## Colors

A cool near-white field with one violet voice and a strictly semantic green/red pair.

### Primary
- **Signal Violet** (accent): the hero tile's gradient core, the net-cash and running-balance lines, brush windows, toggles, focus rings and text selection.
- **Deep Violet** (accent-deep): the dark end of the hero gradient only.
- **Violet Ink** (accent-ink): violet set as text on white or soft violet (active segment, selected row name, links, scope note, chips).
- **Violet Mist** (accent-soft): selected table rows, filter chips, the selected-period legend swatch, violet icon wells.

### Secondary
- **Inflow Green** (gain) and **Outflow Red** (loss): bar fills, dots and swatches for money moving in and out, and closing balances above or below the minimum. Validated with the CVD checker (deutan dE 6.2, in the floor band); this is legal only because outflows are also encoded by position below the zero axis and by sign.
- **Inflow Green Ink** (gain-ink) and **Outflow Red Ink** (loss-ink): the same meanings set as text (net figures, signed table cells, tag text).
- **Green Wash** (gain-soft) and **Red Wash** (loss-soft): tag and icon-well backgrounds.

### Neutral
- **Cool Canvas** (canvas): the page ground behind all tiles.
- **Card White** (card): every tile, card, control and the drawer.
- **Sunk Grey** (sunk): table headers, section and total rows, drawer figure tiles, button hover.
- **Control Well** (control-well): the track of segmented controls and tabs, neutral tags, ghost hover.
- **Hairline** (line) and **Strong Hairline** (line-strong): table rules and control borders respectively.
- **Midnight Ink** (ink), **Slate** (ink-2), **Muted Slate** (ink-3): figures and headings; secondary labels and inactive options; hints, units, axis labels.

### Named Rules
**The Money-Only Rule.** Green and red mean money in and money out (or above and below the minimum), nothing else, and never alone: every gain/loss encoding also carries position, sign or a label.

**The One Violet Block Rule.** Exactly one tile per view is a saturated colour block: the closing-balance hero (gradient #7B5BFF to accent to accent-deep at 150deg). Everything else is white.

**The Ink Variant Rule.** Base gain, loss and accent are fills; text uses the -ink variants.

## Typography

**Display Font:** Manrope (self-hosted woff2, 400/500/600/700/800), falling back to system-ui
**Body Font:** Manrope, same stack

**Character:** A geometric-humanist grotesk that reads crisp at 800 for figures and stays friendly at 400 for hints; one family carries the whole page.

### Hierarchy
- **Display** (800, 3rem, 1.15, -0.02em): the hero closing-balance figure only (2.25rem under 760px).
- **Headline** (800, 1.625rem, 1.15, -0.01em): KPI tile figures and the drawer title (1.25rem under 760px).
- **Title** (700, 1.125rem): card headings and the brand name (800).
- **Body** (400, 0.9375rem, 1.5): base text and primary table cells.
- **Label** (600, 0.8125rem): KPI labels, controls, buttons, hints (hints at 400 in muted slate).
- **Column head** (700, 0.75rem, 0.05em, uppercase): table column headers and the two chart labels in the top-heads card; never above a heading.

### Named Rules
**The Tabular Rule.** `tnum` and `lnum` are on at the body level; numeric columns are right-aligned and use the true minus sign.

## Layout

A 1440px max container with 28px gutters (16px under 760px). The page stacks: a sticky translucent white top bar (brand left, filters right, wrapping), the bento KPI grid, the full-width weekly balance brush card, then two 12-column rows split 8/4, then the full-width table card. Rows use a 20px gap; the bento uses 16px (12px on mobile).

The bento is a named-area grid: 6 columns with the hero spanning 2 columns and 3 rows, four-tile pairs beside it; 4 columns under 1180px with the hero full-width on top; 2 columns under 760px. Under 1180px the 8/4 rows collapse to full width. Print forces the desktop bento and the 8/4 split onto A4 landscape.

## Elevation & Depth

Lifted, quietly. Every tile and card rests on the same soft two-layer navy-tinted shadow; there are no card borders on screen. The detail drawer floats higher on a heavier shadow over a 28% navy scrim. Active segments and tabs get a tiny inner lift.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(16,19,42,.04), 0 8px 24px rgba(16,19,42,.06)`): all cards and KPI tiles.
- **Lift** (`box-shadow: 0 2px 4px rgba(16,19,42,.06), 0 16px 40px rgba(16,19,42,.14)`): the drawer only.
- **Selected option** (`box-shadow: 0 1px 2px rgba(16,19,42,.1), 0 1px 6px rgba(16,19,42,.06)`): the active segment or tab on its well.

### Named Rules
**The Paper Swap Rule.** In print, shadows drop and every tile takes a 1px #D0D2DC border; the hero becomes white with a 2px violet border and ink text.

## Shapes

Soft and consistent: 16px tiles, 10px controls, 8px options inside wells, 12px inset panels (table frames, drawer figure tiles), a 20px drawer sheet inset 12px from the viewport, pills for tags, chips and toggles. Chart bars are rounded on their outer end only (7px on monthly flows, 6px on head bars, 3px on weekly bars), so the zero axis stays square.

## Components

### Buttons
- **Shape:** gently rounded (10px), 38px tall.
- **Default:** white with a strong-hairline border, label type in ink; hover shifts to sunk grey with a #BFC2D2 border; press nudges down 1px.
- **Ghost:** borderless, slate text, control-well hover (Print).
- **Icon:** 38px square (drawer close).

### Inputs / Fields
- **Style:** white, strong-hairline border, 10px radius; selects carry an inline chevron; the search field is 40px with a leading magnifier.
- **Focus:** 2px violet outline offset 1-2px.

### Segmented control and tabs
- **Style:** a control-well track with 3px padding; options are 32px (28px small), slate at 600; the active option is a white chip with violet-ink text and the selected-option shadow.

### Chips and tags
- **Filter chips:** violet mist pills with violet-ink text and a remove affordance; hover deepens to #E4DCFF.
- **Tags:** small 700 pills; gain and loss washes with their ink text, neutral in control-well. On the violet hero a loss tag becomes white with loss-ink text.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** card white on the cool canvas.
- **Shadow Strategy:** Rest (see Elevation).
- **Internal Padding:** 20px 22px (16px on mobile); head row with title and muted hint, controls or inline legend to the right.

### KPI bento tiles
White tiles (16px 18px padding) with a label row led by a 26px icon well (sunk, or gain/loss/violet wash by meaning), a headline figure (gain-ink or loss-ink only when the figure is directional), and a muted detail line. The months-below-minimum tile adds a row of 12px dot squares. The hero is the violet gradient block with white text, a white sparkline with a fading white area, and a reconciliation line above a translucent white rule.

### Tables
Framed in a 12px hairline panel; sticky sunk-grey column heads; 9px 12px cells; section and total rows on sunk grey at 800; signed cells in gain-ink or loss-ink, zeros in #A3A7B8; hover tints rows #F8F7FF; the selected row takes violet mist.

### Charts
Manrope 12px muted axis labels, dashed hairline split lines, white tooltip with a hairline border. Flows are stacked green (above) and red (below) gradient bars with a 3px violet net line ringed in white dots; the running balance is a violet line with a fading violet area, point dots coloured by minimum, a dashed loss-ink minimum line and a faint red band below it. Projected periods drop opacity (and take a hatched decal on monthly bars).

### Weekly balance brush (signature)
A full-width strip of weekly closing-balance bars (green above minimum, red below, projections at 40%) whose violet-bordered brush window is the date-range control; weeks outside the window fade to 28%.

### Detail drawer
A 20px-radius white sheet sliding from the right (280ms, ease-out-expo `cubic-bezier(.16,1,.3,1)`), with a three-column grid of sunk figure tiles and a framed line-item table.

## Do's and Don'ts

### Do:
- **Do** keep the canvas cool grey and every surface white; let gaps (16px bento, 20px rows) separate sections.
- **Do** reserve the violet gradient block for the single most important figure on the view.
- **Do** pair every green/red encoding with position below the axis, a sign or a text tag.
- **Do** set money figures in Manrope 800 with tabular figures, signed with a true minus.
- **Do** use the -ink variants (gain-ink, loss-ink, accent-ink) for coloured text on white.
- **Do** honour reduced motion: transitions are disabled under `prefers-reduced-motion`.

### Don't:
- **Don't** use green or red for anything other than money direction or the minimum threshold.
- **Don't** add borders to cards on screen, or put cards inside cards; inset panels use sunk grey instead.
- **Don't** add a second saturated colour block or a second accent hue.
- **Don't** place small uppercase labels above headings; uppercase tracking is for column heads only.
