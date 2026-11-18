---
name: Thrive Front Desk
description: Weekly cash-flow dashboard for Thrive Living, set as a co-living front desk.
colors:
  desk-charcoal: "#22262A"
  head-ink: "#F4F2EE"
  head-ink-2: "#C3C0B9"
  brass: "#8C5A26"
  brass-ink: "#7A4C1C"
  brass-soft: "#F4E9DB"
  oak: "#E8DBC9"
  oak-deep: "#DFCDB6"
  oak-ink: "#5A4632"
  oak-line: "#CDB79C"
  ground: "#F2F1EE"
  card: "#FFFFFF"
  sunk: "#F7F6F3"
  line: "#E4E2DD"
  line-strong: "#D3CFC7"
  rule: "#ECEAE6"
  ink: "#1F2326"
  ink-2: "#484D52"
  ink-3: "#676C71"
  gain: "#0E9F6E"
  gain-ink: "#047857"
  gain-soft: "#E3F4EC"
  loss: "#E5484D"
  loss-ink: "#C42F35"
  loss-soft: "#FCE9E9"
  warn-ink: "#9A5B0B"
  dark-ground: "#131517"
  dark-card: "#1C1F22"
  dark-ink: "#ECEDEE"
  dark-head: "#0D0F10"
  dark-oak: "#2A241E"
  dark-brass: "#D9A367"
  dark-gain: "#2AAE7B"
  dark-loss: "#DC3F46"
typography:
  wordmark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 112"
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 750
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "15.5px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  hint:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "11.5px"
    fontWeight: 700
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 78"
  stamp:
    fontFamily: "Archivo, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 75"
rounded:
  stamp: "3px"
  control: "8px"
  tag: "10px"
  card: "12px"
  band: "16px"
  pill: "13px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "34px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "34px"
  segment-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "7px"
    padding: "0 11px"
    height: "28px"
  select:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "34px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "16px 18px 18px"
  key-tag:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "10px 10px 10px 30px"
    padding: "13px 14px 12px 38px"
  filter-chip:
    backgroundColor: "{colors.brass-soft}"
    textColor: "{colors.brass-ink}"
    rounded: "{rounded.pill}"
    padding: "0 6px 0 10px"
    height: "26px"
  header:
    backgroundColor: "{colors.desk-charcoal}"
    textColor: "{colors.head-ink}"
    height: "56px"
---

# Design System: Thrive Front Desk

## Overview

**Creative North Star: "The Front Desk"**

The page is the reception desk of a co-living house. A charcoal header carries the THRIVE wordmark; one oak desk band holds the verdict sentence and five enamel key tags, each with a rubber status stamp; the latest weeks hang as tags on a key rack; everything else is the register: white cards with hairline borders on a warm grey ground. The world lives in a few objects (tag, stamp, rack, building, keycard). The rest stays quiet so the numbers carry the page.

Density is moderate and type is deliberately modest: the largest figure on the page is 24px. One family, Archivo, does every job by changing its width: condensed for stamps and labels, normal for reading, expanded for the wordmark. Figures are always tabular.

Rejected by the user and not to return: the v1 bright bento SaaS board, Poppins with serif capitals, oversized titles, emoji, and decoration that carries no meaning.

**Key Characteristics:**
- Charcoal header, oak desk band, warm ground, white cards.
- Brass marks whatever is live: selection, focus, current week, links, active tab.
- Green and red appear only for money in/out, gain/loss and overdrawn state, always paired with a sign, a stamp or a position.
- Archivo variable (wdth 62-125, wght 400-800) only, with tabular figures.
- Charts drawn to scale on one axis; planned data is dashed or hatched, never a different hue.

## Colors

A neutral warm-grey register, one oak material, one brass signal, and a money pair kept for money.

### Primary
- **Front Desk Charcoal** (desk-charcoal): the sticky header and the passcode gate background. Thrive's own wordmark colour. Text on it uses head-ink and head-ink-2.

### Secondary
- **Brass** (brass; dark-brass in dark mode): the live-state colour. Focus outlines (2px, 2px offset), the active view tab underline, the selected register tab, the current week ring on the key rack, chart hover and selection bands (via brass-soft), the selected spend bar, range-slider accent, filter chips.
- **Brass Ink** (brass-ink): link text and chip text.
- **Brass Wash** (brass-soft): selection fill, highlighted table rows, hovered chart bands.

### Tertiary
- **Oak** (oak to oak-deep, as a top-to-bottom gradient): the desk band and the passcode keycard. Oak Ink (oak-ink) for meta text on the band; Oak Line (oak-line) for the key rack rail, pegs and the print border of the band. Landlord floors are drawn in oak.

### Neutral
- **Warm Ground** (ground): page background; also the inner fill of week cards on the rack.
- **Card White** (card): every card, tag, input and table header.
- **Sunk** (sunk): table hover, total rows, segmented-control hover, source badges.
- **Hairline** (line), **Strong Hairline** (line-strong), **Rule** (rule): card borders; control borders and table header underline; row dividers.
- **Ink** (ink), **Ink 2** (ink-2), **Ink 3** (ink-3): text, secondary text, hints/axes/labels. Ink also fills primary buttons, the pressed segment, the net line and the balance line.

### Money
- **Gain** (gain, gain-ink, gain-soft): money in bars, in-credit key-rack tags, positive figures.
- **Loss** (loss, loss-ink, loss-soft): money out bars, overdrawn tags and stamps, the overdrawn shading under the zero/alert line, critical watch items.
- **Mixed** (warn-ink): the "Incl. planned" stamp only.

Dark mode (prefers-color-scheme or data-theme=dark) remaps every token: ground dark-ground, cards dark-card, header dark-head, oak becomes a dark walnut (dark-oak), brass lightens to dark-brass, gain and loss shift to dark-gain and dark-loss; card shadows switch off.

### Named Rules
**The Money Pair Rule.** Green and red mean money in/gain and money out/loss/overdrawn, nothing else. Every use is paired with a sign, a stamp or a position above/below the line, never colour alone.

**The Brass Is Live Rule.** If the reader can act on it or it is the current selection, it is brass. Brass is not used for decoration.

**The Clear Figures Rule.** Theme material (oak, charcoal, line art, gradients) never sits behind a number. Figures sit on card white or the ground.

## Typography

**Display Font:** Archivo (with ui-sans-serif, system-ui, Segoe UI)
**Body Font:** Archivo
**Label/Mono Font:** Archivo at condensed width (wdth 75-80)

**Character:** One grotesque used at three widths. Condensed caps read as stamped and printed; the expanded wordmark reads as signage.

### Hierarchy
- **Wordmark** (800, 21px, wdth 112, +0.06em): THRIVE in the header (18px on the keycard).
- **Display** (750, 24px; 19px under 760px): key-tag figures. Landlord headline figures use 18px/750.
- **Headline** (700, 18px; 16.5px under 760px): the verdict sentence and view titles, max 70ch, balanced wrap.
- **Title** (700, 15.5px): card titles. Drawer title 17px.
- **Body** (400, 14px/1.45): running text; tables at 13px, controls at 13px.
- **Hint** (400, 12.5px, ink-3): the one-line explanation under each card title.
- **Label** (700, 11.5px, wdth 78, +0.08em, uppercase): key-tag captions and week group rows in Upcoming payments.
- **Stamp** (700, 10.5px, wdth 75, +0.1em, uppercase, 16px line): status stamps.

### Named Rules
**The Modest Scale Rule.** Nothing on the page exceeds 24px. A larger number earns weight, not size.

**The One Family Rule.** Archivo only. Width and weight carry the hierarchy; no second face, no serif, no Poppins.

**The Tabular Rule.** All figures use tabular numerals (set on body), so columns of lakh values align.

## Layout

A centred 1320px container with 24px side padding (16px under 760px). Below the sticky 56px header sits a sticky filter row (ground at 92% with an 8px blur, hairline below; static on phones). The desk band bleeds 24px past the container on each side. Below it, a 12-column grid with 16px gaps (12px on phones) in rows of 7+5, 8+4, 8+4, 12, 12. At 1180px every card spans 12 and the key tags drop to three columns; at 760px tags go to two (an odd last tag spans both), the week pair stacks, and the drawer becomes a bottom sheet. Card padding is 16/18/18px. Print is A4 landscape: header, filters, What if, Ask AI and the gate are hidden, cards pair at 6 columns, and the desk band becomes white with an oak-line border.

## Elevation & Depth

Mostly flat: cards are separated by hairlines, with a near-invisible 1px card shadow in light mode and none in dark. Real shadow is reserved for objects that hang or float.

### Shadow Vocabulary
- **Hanging tag** (`0 1px 0 rgba(60,44,28,.10), 0 8px 18px -10px rgba(60,44,28,.45)`): key tags on the desk band only.
- **Card** (`0 1px 2px rgba(31,35,38,.05)`): cards, light mode only.
- **Tooltip** (`0 10px 28px -10px rgba(0,0,0,.35)`), **Drawer** (`0 24px 60px -20px rgba(0,0,0,.5)`), **Keycard** (`0 30px 60px -24px rgba(0,0,0,.7)`): floating layers.

### Named Rules
**The Only Things That Hang Rule.** Soft warm drop shadows belong to tags and the keycard. Cards don't lift; no hard offset shadows.

## Shapes

Gentle corners throughout: controls 8px, cards 12px, desk band and drawer 16px, stamps 3px. The world's own shapes are carried by a few objects: the key tag (10px corners with a 30px lower-left curve and a punched hole drawn as an inset circle), the rack tag (6px top, 16px bottom, with a punched hole and a hanging peg), and the building in the landlord chart (floors at 3px radius, windows at 1.5px, dashed windows for unpaid months). Pills (13-16px) are kept for filter chips, Ask suggestions and badges.

## Components

### Buttons
- **Shape:** gently rounded (8px), 34px tall (42px in the Ask form and keycard).
- **Default:** card white, strong hairline border, ink text at 600; hover darkens the border to ink-3.
- **Primary:** ink fill, card-white text.
- **Icon buttons:** 36px square, line icons drawn inline as SVG at 18px, stroke 1.6-1.8. In the header they use head-ink-2, brightening on hover with a 6-8% white wash.
- **Text links:** brass-ink, 600, 1px underline at 3px offset; 2px on hover.

### Chips
- **Filter chips:** brass wash, brass-ink text, 26px pill with a round remove button.
- **Source badges:** condensed 11px on sunk with a hairline, for bank vs Razorpay.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** card white on ground.
- **Border:** 1px hairline.
- **Internal Padding:** 16px top, 18px sides and bottom.
- **Header:** title plus one hint line; legends and segmented controls sit on the right.

### Inputs / Fields
- **Style:** 34px, card white, strong hairline, 8px corners, 13px text.
- **Focus:** 2px brass outline at 1-2px offset (applied to the wrapper for search and alert fields).
- **Segmented control:** card-white track with 2px inset; the pressed segment is ink with card-white text.
- **Switch:** 32x18 track, ink when on.

### Navigation
View tabs (Front desk, What if, Ask AI) in the charcoal header at 13.5px/500 in head-ink-2; the current view turns head-ink with a 2px brass underline. The register uses the same pattern on light: ink-3 tabs, the selected one ink with a brass underline. On phones the view tabs move to their own scrolling row.

### Key Tag (signature)
Five hanging tags on the oak band: Opening, Money in, Money out, Net, Closing. Condensed caption, 24px figure, a stamp, one short explanatory line. A negative figure turns loss-ink.

### Stamp (signature)
A rubber stamp: condensed caps in a 1.5px currentColor border, rotated -2deg. Overdrawn/below alert in loss-ink; Planned in ink-3 with a dashed border; Incl. planned in warn-ink. In credit may use gain-ink (a balance state). The plain Actual stamp is in ink-2: a status, not money.

### Key Rack (signature)
A 5px oak-line rail with pegs; each week hangs as a tag showing its closing balance in lakh. In credit: gain-soft with a gain border. Overdrawn: solid loss with white text. Planned: card white with a dashed ink-3 border (loss border if it plans to go overdrawn). The current week is ringed in brass. Hover/focus swings the tag -4deg from its peg (0.2s). Two week cards (latest, next) sit beneath.

### Charts
Hand-built SVG on one to-scale axis. Cash flow: money-in bars above zero in gain, money-out below in loss, net as a 2px ink line with card-white dots; planned bars are hatched with an outline. Closing balance: a 2px ink line (dashed when planned), loss shading at 16% below the zero line, or below a dashed brass alert line when an alert level is set. Landlords: a building whose floors are each property's monthly rent, one window per landlord. Axes 11px ink-3 (planned labels italic); labels get a card-coloured halo. Hover/selection uses the brass-wash band. A fixed tooltip (10px corners, strong hairline) carries the breakdown.

### Watch List
Rows divided by rules: a 10px dot, a 650-weight title, a hint line, and an "Open week" link. Critical (overdrawn streaks) is a loss dot; info is an ink-3 ring. Warning items use a solid ink-2 dot, so brass stays reserved for live states.

### Drawer
A right-side panel up to 560px with 16px corners over a 38% charcoal scrim, sliding in 24px over 0.28s; a bottom sheet on phones.

### Passcode Gate
Full charcoal screen with Charminar line art (150px, oak, 1.3 stroke) above an oak keycard with a magnetic stripe, the wordmark, a passcode field and a charcoal Enter button. A wrong code shakes the card. The same Charminar mark appears at 34px in ink-3 in the footer; nowhere else.

## Do's and Don'ts

### Do:
- **Do** set every figure in Archivo with tabular numerals on card white or ground.
- **Do** use brass for focus, selection, current week, active tabs and links.
- **Do** pair green or red with a sign, a stamp or a position above/below the line.
- **Do** show planned data with dashes, hatching or a dashed stamp, in the same hue as actual.
- **Do** draw charts to scale on one axis and give each card a title and one hint line.
- **Do** honour reduced motion: all animation and transition is switched off.

### Don't:
- **Don't** use Poppins, serif capitals or any second family.
- **Don't** set titles or figures above 24px.
- **Don't** use emoji or glyph icons; icons are inline line SVGs.
- **Don't** add decoration that carries no meaning; tags, stamps, the rack, the building and the Charminar each stand for something.
- **Don't** put oak, charcoal, line art or gradients behind numbers.
- **Don't** use green or red for anything except money direction, gain/loss and overdrawn state: not for actual/planned status, success, errors or emphasis.
- **Don't** use the Charminar outside the gate and the footer.
- **Don't** bring back the v1 bento layout or its bright card palette.
