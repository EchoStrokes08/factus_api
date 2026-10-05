---
name: Factus Voz
description: Factura y anula hablando con el agente; banknote security printing for a voice-issued fiscal document.
colors:
  intaglio-950: "#0b1a15"
  intaglio-900: "#10231c"
  intaglio-800: "#17322a"
  intaglio-700: "#1f4337"
  intaglio-600: "#2c5a4a"
  intaglio-line: "#8fb9a4"
  intaglio-text: "#e7efe8"
  intaglio-text-soft: "#b5cdbf"
  intaglio-text-faint: "#87a898"
  paper: "#e9ece3"
  paper-raised: "#f6f7f2"
  paper-sunken: "#dde2d6"
  paper-rule: "#c3ccbc"
  paper-rule-strong: "#9eab97"
  ink: "#14201b"
  ink-soft: "#3d4c44"
  ink-faint: "#5f6e66"
  serial: "#b3262d"
  serial-deep: "#8e1c22"
  serial-wash: "#f3dcd9"
  ochre: "#c78a2c"
  ochre-ink: "#7a5212"
  ochre-wash: "#f4e6c8"
  violet: "#6d4c8f"
  violet-wash: "#e6def0"
  valid: "#2f7a4f"
  valid-ink: "#1d5636"
  valid-wash: "#d6eadb"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 7vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 62"
  denomination:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 70"
  title:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Archivo Variable', 'Archivo', system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.06em"
  serial:
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, Consolas, monospace"
    fontSize: "0.74rem"
    fontWeight: 400
    letterSpacing: "0.02em"
    fontFeature: "'tnum' 1, 'zero' 1"
rounded:
  base: "4px"
  round: "50%"
spacing:
  xs: "0.35rem"
  sm: "0.85rem"
  md: "1.25rem"
  lg: "1.75rem"
  xl: "2.5rem"
components:
  call-button:
    backgroundColor: "{colors.intaglio-text}"
    textColor: "{colors.intaglio-900}"
    rounded: "{rounded.round}"
    width: "38%"
  call-button-hangup:
    backgroundColor: "{colors.serial}"
    textColor: "#ffffff"
    rounded: "{rounded.round}"
  call-button-hangup-hover:
    backgroundColor: "{colors.serial-deep}"
  button-primary:
    backgroundColor: "{colors.intaglio-900}"
    textColor: "{colors.intaglio-text}"
    typography: "{typography.title}"
    rounded: "{rounded.base}"
    padding: "0.3rem 0.7rem"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.intaglio-700}"
    textColor: "#ffffff"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.base}"
    padding: "0.3rem 0.7rem"
    height: "32px"
  button-outline-hover:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.serial}"
    rounded: "{rounded.base}"
    padding: "0.3rem 0.7rem"
  button-danger-hover:
    backgroundColor: "{colors.serial-wash}"
    textColor: "{colors.serial-deep}"
  button-danger-solid:
    backgroundColor: "{colors.serial}"
    textColor: "#ffffff"
    rounded: "{rounded.base}"
    padding: "0.3rem 0.7rem"
  tag-valid:
    backgroundColor: "{colors.valid-wash}"
    textColor: "{colors.valid-ink}"
    rounded: "{rounded.base}"
    padding: "0.15rem 0.5rem"
  tag-mock:
    backgroundColor: "{colors.ochre-wash}"
    textColor: "{colors.ochre-ink}"
    rounded: "{rounded.base}"
    padding: "0.15rem 0.5rem"
  tag-draft:
    backgroundColor: "{colors.paper-sunken}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.base}"
    padding: "0.15rem 0.5rem"
  document-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "1rem 1.1rem"
  text-field-engraved:
    backgroundColor: "{colors.intaglio-950}"
    textColor: "{colors.intaglio-text}"
    rounded: "{rounded.base}"
    padding: "0.35rem 0.35rem 0.35rem 1rem"
---

# Design System: Factus Voz

## Overview

**Creative North Star: "The Security Press"**

Speaking issues a document of value, so the interface is printed like one. The system borrows the grammar of Colombian banknote and fiscal-paper security printing: intaglio green ink fields, guilloche line-work, hairline double frames, red serial numbering, and denomination numerals set condensed and heavy. It refuses the category default of a dark SaaS voice panel with a glowing orb and chat bubbles; the conversation is a ledger, the agent's presence is a guilloche rosette, and every issued document carries its own engraved seal.

Colour is committed per region rather than sprinkled. The call column is entirely intaglio ink, light text on deep green, with a faint cross-hatched line pattern and a guilloche band framing it. Documents live on cool green-grey security paper with a fine horizontal rule pattern. Accent inks are denominational: serial red means a number or an irreversible act, ochre means simulated, violet means credit note. Density is moderate and legible from across a room: one oversized state word, a quiet ledger, cards at a fixed scale.

Depth is mostly printed, not lifted. Frames are drawn with borders, inset outlines, double rules and border-image bands; shadows are soft and reserved for objects that sit on top of the ink field (the call button, the issued slip, the viewer dialog).

**Key Characteristics:**
- Two-region colour commitment: intaglio ink field (call) versus security paper (documents).
- Guilloche as the signature material: a live voice-driven rosette, deterministic per-document seals, and a 9-slice guilloche border band.
- Archivo variable with the width axis: condensed heavy display for states and amounts, normal width for UI.
- JetBrains Mono, tabular and slashed-zero, for every serial, CUFE, reference, DANE code, count and timestamp.
- One radius (4px) everywhere except true circles.

## Colors

Two inks on two substrates, with three denominational accents that each mean exactly one thing.

### Primary
- **Intaglio Green** (intaglio-900, with the 950 to 600 ramp): the whole call column, primary document buttons, active tab underline and count chip, viewer double rules and grand total. The 700 step marks the current transcript turn and the invoice seal; 950 is the engraved text-field well.
- **Guilloche Line** (intaglio-line): the line colour of the rosette, the green border band and the background hatch; also the user's speaker label, the listening state word and focus-within borders on the ink field.
- **Ink-Field Text** (intaglio-text, -soft, -faint): text on green, in three steps of emphasis. intaglio-text is also the call button's face.

### Secondary
- **Serial Red** (serial, serial-deep, serial-wash): folio numbers, the hang-up button, destructive actions and their confirmation copy, global focus rings and text selection on paper.
- **Credit-Note Violet** (violet, violet-wash): the denomination colour of credit notes; tints the card seal and the active tab marker when credit notes are shown.

### Tertiary
- **Simulation Ochre** (ochre-ink on ochre-wash): the "Simulada" tag and badge, nothing else.
- **Validation Green** (valid, valid-ink, valid-wash): "Validada DIAN" tags, the issued-slip seal and call to action, and the Factus Pay button outline.

### Neutral
- **Security Paper** (paper): the history column substrate, under a 4px horizontal rule pattern.
- **Raised Paper** (paper-raised): document cards, the issued slip and the invoice sheet.
- **Sunken Paper** (paper-sunken): count chips, draft tags, the CUFE well.
- **Paper Rules** (paper-rule, paper-rule-strong): dividers, card inner frames, outer borders, table rules, skeletons.
- **Print Ink** (ink, ink-soft, ink-faint): text on paper in three steps.

### Named Rules
**The Region Commitment Rule.** Intaglio green owns the call surface entirely and paper owns the documents. Do not drop paper cards onto green except for an issued document arriving (the slip), and do not paint green panels inside the paper column beyond buttons and markers.

**The Denomination Rule.** Each accent has one meaning: red is serial numbers and irreversible acts, ochre is simulated, violet is credit note, validation green is DIAN-validated. Never use an accent for decoration.

## Typography

**Display Font:** Archivo Variable, width axis (with Archivo, system-ui)
**Body Font:** Archivo Variable at normal width
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, Consolas)

**Character:** A grotesque that condenses like banknote numerals, paired with a mono that reads like a printed serial. Scale contrast is the hierarchy: the state word and the totals are far heavier and narrower than everything around them.

### Hierarchy
- **Display** (800, clamp(3.25rem, 7vw, 5.5rem), 0.88, width 62%, uppercase): the call state word only (LLAMAR, CONECTANDO, ESCUCHANDO, PENSANDO, HABLANDO, EN LLAMADA). Drops to clamp(2.5rem, 4.5vw, 3.5rem) while a call is live.
- **Denomination** (800, 1.7rem on cards, 1.9rem on the slip, 2.6rem in the viewer grand total; width 66 to 68%; tabular figures): money totals. The total is the strongest number on any document.
- **Headline** (800, 1.6rem, width 70%, uppercase): column headings such as DOCUMENTOS. The wordmark uses the same voice at 1.35rem, width 72%, with a 300-weight second word.
- **Title** (700, 1rem): document titles ("Factura" plus folio), party names.
- **Body** (400, 15px, 1.45): UI text; transcript turns at 0.98rem / 1.5; hints capped at 44ch.
- **Label** (700, 0.72rem, 0.05 to 0.08em, uppercase): functional field labels only: transcript speaker (with width 80%), table headers, CUFE label, invoice field labels.
- **Serial** (JetBrains Mono, tabular and slashed zero, 0.02em): folios, references, CUFE, DANE code, tab counts, step indices, timestamps.

### Named Rules
**The Serial Rule.** Any machine identifier or time (folio, CUFE, reference, DANE code, count, timestamp) is set in the serial mono. Folios are additionally serial red.

**The Width-Axis Rule.** Emphasis comes from condensing and weighting Archivo (width 62 to 80%, 700 to 800), not from a second display family.

## Layout

A two-column split on desktop: the call column takes 1.4fr and the documents column takes the rest with a 360px minimum, both full viewport height (100dvh) with independent scrolling. The call column centres a stage (max 640px) of dial plus state readout; at rest the stage floats vertically centred with a three-step "how it works" row below a hairline; once a call is live the dial shrinks to 220px and sits beside the state word, with the transcript ledger filling the remaining height and the engraved text field pinned at the bottom. The dial at rest is clamp(220px, 34vh, 320px).

At 900px and below the shell becomes one column: the green column is at least one small viewport tall at rest and collapses to its content during a call (dial 140px, ledger capped at 55vh), with the paper column flowing beneath it. At 520px transcript rows stack speaker and time above the text; at 420px cards drop their seal.

Spacing rhythm runs on 0.35 / 0.85 / 1.25 / 1.75 / 2.5rem: 0.85rem between cards, 1.25rem list and stage padding, 1.75rem column gutters, 2.5rem header inset on the ink field.

## Elevation & Depth

A hybrid that leans printed. Most separation comes from drawn frames: outer border plus inset outline (cards at -5px, the call button and slip at +3 to +4px), 3px double rules in the viewer, dashed rules for ledger rows and card action rows, and the guilloche border band. Soft dark shadows appear only on objects lifted off the ink field or off the page.

### Shadow Vocabulary
- **Paper rest** (`box-shadow: 0 1px 2px rgba(20, 32, 27, 0.08)`): document cards at rest on paper.
- **Call button lift** (`box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.55)`; hover `0 14px 28px -8px rgba(0, 0, 0, 0.6)`): the call button over the rosette.
- **Issued slip** (`box-shadow: 0 12px 26px -14px rgba(0, 0, 0, 0.7)`; hover `0 16px 30px -14px rgba(0, 0, 0, 0.75)`): a paper slip lying on the ink field.
- **Viewer dialog** (`box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6)`): the modal invoice sheet over an rgba(11, 26, 21, 0.78) backdrop.

### Named Rules
**The Printed Frame Rule.** Separate with lines first (border, inset outline, double rule, guilloche band); reach for a shadow only when an object physically sits on another surface.

## Shapes

One gentle corner (4px) on every rectangle: cards, buttons, tags, inputs, the dialog, count chips, the CUFE well. True circles only for the call button, step indices and thinking dots. Frames are layered: an outer 1px border with a second 1px outline offset inside or outside, which reads as the double hairline of a banknote border. The guilloche band is a 30px 9-slice SVG (period-10px sine waves) applied with `border-image: ... 10 round` at 10px width, inset 6 to 8px, at 0.32 opacity in green on the ink field (--band-green) and 0.4 in ink on the invoice sheet (--band-ink). Background hatches are repeating 1px lines: 115deg and 65deg on the ink field, 0deg every 4px on paper, 135deg every 6px on the invoice sheet.

## Components

### Buttons
Compact, printed, never pill-shaped.
- **Shape:** gentle corner (4px); document actions are 32px min height, viewer actions 42px.
- **Primary:** intaglio-900 fill with intaglio-text label, 600 weight 0.8rem, 0.3rem 0.7rem padding, optional 14px lucide icon; hover moves to intaglio-700 with white text.
- **Outline:** transparent with paper-rule-strong border and ink-soft label; hover fills white.
- **Pay:** outline in validation green.
- **Danger:** borderless serial-red text pushed to the row's end; hover adds serial-wash. Clicking it never acts directly: the row is replaced by the consequence sentence in serial-deep plus a solid red confirm button and a cancel, auto-dismissing after 6 seconds.
- **Focus:** 2px serial-red outline at 2px offset on paper; 2px intaglio-text outline on the ink field.

### Chips (tags)
- **Style:** 0.72rem 600, 0.15rem 0.5rem, 4px corner, washed fill with dark ink of the same hue: valid (validated DIAN), ochre (simulated), sunken paper (unvalidated), outlined with a 12px map-pin icon (DANE code in serial mono).
- **Counts:** tab count chips are sunken paper, switching to intaglio-900 (or violet on the credit-note tab) when active.

### Cards / Containers (document ficha)
- **Corner Style:** 4px.
- **Background:** paper-raised on the paper column.
- **Shadow Strategy:** paper rest only (see Elevation).
- **Border:** paper-rule-strong outer border plus paper-rule outline inset 5px.
- **Internal Padding:** 1rem 1.1rem; grid of seal (52px) and body. Every card shares one fixed scale: title plus red folio left, condensed total right, meta, tags, CUFE line, then a dashed-rule action row. Credit notes swap the seal ink to violet.

### Inputs / Fields
- **Style:** the engraved field: intaglio-950 well, 1px intaglio-line border at 0.3 alpha, 4px corner, 40px square send button in intaglio-text that goes white on hover and fades to 0.35 when empty.
- **Focus:** the well's border brightens to full intaglio-line; the input itself shows no outline.

### Navigation
- **Tabs:** text tabs on paper with 1.5rem gaps over a paper-rule-strong baseline; inactive ink-faint, active ink with a 3px intaglio-900 underline that scales in from the left (0.35s, ease-out). The credit-note tab's marker is violet.
- **Top bar:** wordmark and tagline left, engine badge right (outlined, 4px, brightening its border when the engine is known).

### Live Rosette and Call Button (signature)
A canvas guilloche of 16 closed 11-petal curves around the circular call button, stroked in intaglio-line with two highlight lines in intaglio-text. Each call mood (idle, connecting, active, listening, thinking, speaking) eases its amplitude, speed, spread and alpha; every recognised or spoken word pulses its energy. The call button is the intaglio-text disc with a phone icon, turning serial red (hang up) during a call. Under reduced motion the rosette redraws once per state change.

### Guilloche Seal (signature)
An SVG seal deterministically derived from the document's CUFE (or reference or folio) via an FNV-1a hash: 9 to 12 rosette lines with 7 to 15 petals inside a hairline circle, stroked in currentColor. The same seed gives the same seal in the transcript slip (56px), the history card (52px) and the viewer head. Ink follows denomination: intaglio-700 on cards, violet for credit notes, valid green on the issued slip.

### Transcript Ledger
Rows, not bubbles: speaker label (uppercase, condensed), text, right-aligned serial timestamp, separated by dashed intaglio-line rules at 0.16 alpha. The current turn sits on an intaglio-700 band with brighter text; errors use a translucent serial band. Rows rise in over 0.45s and fade out under a 2rem top mask. An issued invoice arrives in the ledger as a paper slip that unrolls with a clip-path reveal and a slight rotation.

### Invoice Viewer
A native dialog holding a raised-paper sheet with a 135deg hatch and the ink guilloche band. The head is seal, condensed document type, red serial number and status badges above a 3px double intaglio rule; items are a tabular table with alternating faint green rows; the grand total repeats the double rule and is set at the 2.6rem denomination size. Print mode hides everything but the sheet.

## Do's and Don'ts

### Do:
- **Do** keep the call surface entirely intaglio green with the guilloche band frame and line hatch, and the documents on security paper.
- **Do** set every folio, CUFE, reference, DANE code, count and timestamp in JetBrains Mono with tabular, slashed-zero figures; folios in serial red.
- **Do** set money totals in condensed heavy Archivo (800, width 66 to 68%, tabular), as the strongest figure on the document.
- **Do** give every issued document its CUFE-derived guilloche seal and reuse the same seal wherever that document appears.
- **Do** frame containers with a border plus an offset outline, double rules or the guilloche band before adding any shadow.
- **Do** spell out the consequence of a destructive action in serial-deep and require a second, solid red confirmation.
- **Do** use the 4px corner on every rectangle and the ease-out curve (cubic-bezier(0.16, 1, 0.3, 1)) for state transitions.

### Don't:
- **Don't** use a glowing orb, chat bubbles or a generic dark SaaS panel for the voice agent; the agent is the rosette and the conversation is a ledger.
- **Don't** use serial red, ochre or violet outside their meanings (serial or destructive, simulated, credit note).
- **Don't** add glass, blur or decorative colour gradients; the only repeating gradients allowed are the 1px security-line hatches, plus functional masks and loading shimmer.
- **Don't** use emoji; icons are lucide line icons at 12 to 14px (28px in the live call button) with stroke 2.
- **Don't** introduce a second display family or pill-shaped controls.
