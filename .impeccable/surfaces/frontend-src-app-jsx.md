---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/features/voiceAgent/CallScreen.jsx","frontend/src/features/documents/HistoryPanel.jsx"]
---

# Surface: Factus Voz app (call screen + document history)

Mode: Operate. Audience: hackathon judges / evaluators watching or trying a live demo on laptop or projector, sometimes phone. Task: start a voice call, watch a spoken request become a DIAN invoice, inspect/print/annul documents in the history.
Constraints: Spanish (es-CO), COP, keep all current functions and copy facts; typing fallback always available; simulated (mock) documents must be labeled.

## Direction contract

THESIS: Speaking issues a document of value. The screen borrows the grammar of Colombian banknote security printing — guilloche, intaglio ink, red serial numbering — and refuses the category default of a dark SaaS panel with a glowing blue voice orb and chat bubbles.

OWN-WORLD: Intaglio green (#10231c–#2c5a4a) owns the whole call column; history sits on a cool green-grey security paper (#e9ece3) with a faint line pattern. Serial red (#b3262d) only for folio numbers and destructive actions; ochre (#c78a2c) for "Simulada"; violet (#6d4c8f) as the credit-note denomination colour. Archivo (condensed widths for display state words, normal for UI), JetBrains Mono for serials, CUFE, amounts' metadata, timestamps. Hairline double-rule frames like a banknote border; no glass, no gradients-as-decoration, no emoji.

STORY: The evaluator sees one unmistakable action (call), hears the agent, watches the rosette react to every word, and sees the issued invoice arrive stamped with its own seal and red folio; the history confirms DIAN state, CUFE, DANE code and lets them open, print or annul with the consequence spelled out.

FIRST VIEWPORT: Desktop: left ~58% green column — wordmark + engine badge top bar; centred 280px guilloche rosette wrapping the call button; state word in condensed display (~4.5rem) under it; transcript ledger rows (speaker label, text, right-aligned time) below once active; engraved text input pinned at bottom. Right ~42% paper column: "Documentos" heading, segmented tabs with counts, refresh icon, document fichas each with its seal, red folio, total. Primary action = the call button, dead centre of the green field.

FORM: Banknote security printing (Colombian peso bills + fiscal paper); my ordered list position 4 of 7; seed key b41ccb8b. Signature move: a live guilloche rosette driven by voice events (recognition interim words, synthesis word boundaries, thinking phase), plus a unique guilloche seal deterministically derived from each document's CUFE/reference, reused in transcript, history and viewer. Raises: scale-contrast hierarchy (variable-font specimen); total colour commitment per region (zoo map); fixed-scale state ficha (botanical folio); current-turn band (labanotation); tabular right-aligned turn times (cassette).

ADAPTATION (cited after finish review): during an active call the dial shrinks to 220px desktop / 140px mobile and sits beside the state word, with the ledger below; 280px + the display word + ledger + input do not fit a 900px-tall viewport. Engine badge lives in the top bar from idle onward.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
