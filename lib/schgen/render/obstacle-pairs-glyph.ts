/**
 * Matrix rows `power-glyph`, `pwr-flag-glyph` and `label-outline` — 18 of the
 * 105 cells.
 *
 * **The finding in these rows is that a power glyph and a label outline are
 * NOT held to the same rule, although they are the same kind of thing: a box
 * hung off an anchor.** `glyphGlyphProblems` reads `scene.powers` alone, so
 * its stricter different-net rule — `touching`, which refuses an edge or a
 * corner — governs glyph against glyph and never glyph against label.
 * `glyphs()` in the same module DOES mix labels in, but only for
 * `bodyGlyphProblems`. A label is then caught a second way, because
 * `textScene` puts it in `texts` while a glyph goes into `bodies`: so a
 * label's box is compared against wires, pin lines, pin text, strokes and
 * frames, and a glyph's box is compared against none of them.
 *
 * That asymmetry is recorded in each affected cell and in docs/known-gaps.md.
 * It is exactly G85's shape — A modelled as an obstacle for B but not for C.
 *
 * Supporting data for `obstacle-matrix.ts`.
 */
import type { PairCoverage } from "./obstacle-matrix.ts"
import { CROSS_BOUND, FRAME_DERIVED, NO_FLAG_PRODUCER } from "./obstacle-pairs-reasons.ts"

const GLYPH_GLYPH =
  "glyphGlyphProblems (lib/schgen/render/glyph-clearance.ts) via `glyphPairProblem`, with `glyphsClash` " +
  "as the one-pair form: glyphs of DIFFERENT nets may not overlap or touch at all (`touching`, which " +
  "admits edges and corners — `a.minX <= b.maxX && …`), because two that meet read as joined; glyphs of " +
  "ONE net may touch but not overlap (`boxesOverlap`), because a row of GND symbols on adjacent pins one " +
  "pitch apart meets edge to edge and is one net"

const GLYPH_NC =
  "A power symbol is anchored on a net and an NC pin has none, so the two never share a point: " +
  "`anchorChecks` (wire-safety.ts) refuses an anchor coincident with a pin end of another net and " +
  "`o.net === a.net` is false for `null`, while `componentProblems` (layout-check.ts) refuses an NC pin " +
  "that touches anything at all. The glyph BOX over a distant NC marker is the box-level blind spot the " +
  "wire/power-glyph and pin-line/power-glyph cells already record, not a new one"

export const POWER_GLYPH_PAIRS: readonly PairCoverage[] = [
  {
    a: "power-glyph",
    b: "power-glyph",
    checkedBy: `${GLYPH_GLYPH}. This is the check the pedals history's "the GND and VSSA symbols on U_MCU's neighbouring VSS (14) and VSSA (37) pins met corner to corner" defect produced.`,
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "power-glyph",
    b: "pwr-flag-glyph",
    checkedBy: `${GLYPH_GLYPH}. \`powerGlyphs\` maps every \`scene.powers\` entry whatever its \`flag\`, so a flag is one of the pair.`,
    meaninglessBecause: null,
    asymmetric: `\`flagOnItsRail\` exempts a PWR_FLAG drawn on its own rail's symbol at one point, because that coincidence IS the connection. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "power-glyph",
    b: "label-outline",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `textScene` pushes a power glyph into `bodies` " +
      "(\"glyph of power symbol …\") and a label into `texts`, and the `texts × bodies` loop compares them " +
      "with `boxesOverlap`.",
    meaninglessBecause: null,
    asymmetric:
      "**NOT by `glyphGlyphProblems`**, which reads `scene.powers` only. `glyphs()` in the same module " +
      "mixes labels in, but it is used solely by `bodyGlyphProblems`. The consequence is a weaker rule " +
      "for this pair than for glyph against glyph: strict overlap here, where two power glyphs of " +
      "different nets are refused for merely TOUCHING. Recorded in docs/known-gaps.md.",
  },
  {
    a: "power-glyph",
    b: "field-text",
    checkedBy:
      "textProblems (text-scene.ts), the `texts × bodies` loop; AND tryPlaceFields " +
      "(field-placement.ts), whose `fixed` obstacles carry both `{ what: `power ${p.net}`, box: t.glyph }` " +
      "and the glyph's own value box, so a field is placed clear of every glyph and then checked " +
      "independently.",
    meaninglessBecause: null,
    asymmetric:
      "A power symbol's own VALUE text is `field-text` by this matrix's definition and is placed by " +
      "`powerValueSpot` (text-boxes.ts) just beyond its own glyph, so the self-adjacency is by " +
      "construction rather than by a refusal; `valuesAlong` exists to keep the values of anchors one pin " +
      "pitch apart from overprinting each other.",
  },
  { a: "power-glyph", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. \`drawnBoxes\` includes \`scene.bodies\`, which is where a glyph is.`, asymmetric: null },
  { a: "power-glyph", b: "no-connect-marker", checkedBy: null, meaninglessBecause: `${GLYPH_NC}.`, asymmetric: null },
  {
    a: "power-glyph",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause: `A power symbol is anchored at a pin end on a net, and the cross belongs to a DNP part. ${CROSS_BOUND}.`,
    asymmetric: null,
  },
]

export const PWR_FLAG_GLYPH_PAIRS: readonly PairCoverage[] = [
  {
    a: "pwr-flag-glyph",
    b: "pwr-flag-glyph",
    checkedBy: `${GLYPH_GLYPH}.`,
    meaninglessBecause: null,
    asymmetric: `\`flagOnItsRail\` requires \`a.flag !== b.flag\`, so it does NOT exempt two flags from each other — two flags of one net that overlap are refused. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "pwr-flag-glyph",
    b: "label-outline",
    checkedBy:
      "textProblems (text-scene.ts): a flag's glyph goes into `bodies` the same way a power symbol's " +
      "does (`textScene` does not branch on `flag` when pushing the glyph) and a label is in `texts`.",
    meaninglessBecause: null,
    asymmetric: `The weaker-rule asymmetry of the power-glyph/label-outline cell applies in full. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "pwr-flag-glyph",
    b: "field-text",
    checkedBy:
      "textProblems (text-scene.ts), the `texts × bodies` loop. A flag's own value text is the literal " +
      "\"PWR_FLAG\" — `powerText` returns `text: p.flag ? \"PWR_FLAG\" : p.net` — and it is pushed into " +
      "`texts` as `value of PWR_FLAG <net> <i>`, so it is checked against every other text too.",
    meaninglessBecause: null,
    asymmetric: `${NO_FLAG_PRODUCER}.`,
  },
  { a: "pwr-flag-glyph", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. ${NO_FLAG_PRODUCER}, and \`render/frames.ts\` is the module that would place both.`, asymmetric: null },
  { a: "pwr-flag-glyph", b: "no-connect-marker", checkedBy: null, meaninglessBecause: `${GLYPH_NC}. ${NO_FLAG_PRODUCER}.`, asymmetric: null },
  { a: "pwr-flag-glyph", b: "dnp-cross", checkedBy: null, meaninglessBecause: `${CROSS_BOUND}. ${NO_FLAG_PRODUCER}.`, asymmetric: null },
]

export const LABEL_OUTLINE_PAIRS: readonly PairCoverage[] = [
  {
    a: "label-outline",
    b: "label-outline",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): both labels are in `texts`, and the loop is " +
      "`for (const o of scene.texts.slice(i + 1)) if (boxesOverlap(t.box, o.box))`. `labelBox` " +
      "(text-boxes.ts) already includes the outline's arrow-shaped ends (`outlineExtent` adds two grid " +
      "steps), the `REFS_GAP` and the intersheet references, so the box is generous.",
    meaninglessBecause: null,
    asymmetric:
      "Strict overlap only. `glyphGlyphProblems`'s stricter different-net TOUCHING rule does not reach " +
      "labels (see the power-glyph/label-outline cell), so two labels of different nets that meet edge " +
      "to edge are accepted although two power glyphs that do are refused.",
  },
  {
    a: "label-outline",
    b: "field-text",
    checkedBy:
      "textProblems (text-scene.ts), the `texts × texts` loop; AND tryPlaceFields (field-placement.ts), " +
      "whose `fixed` obstacles carry `...scene.labels.map((l) => ({ what: `label ${l.net}`, box: " +
      "labelBox(l) }))`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "label-outline",
    b: "frame-border",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts), the frame clause: " +
      "`if (boxesOverlap(t.box, f.box) && !strictlyWithin(t.box, f.box)) … crosses the border of …`. A " +
      "label is in `texts`, so this is one of the few cells where a frame border is actually decided " +
      "rather than constructed.",
    meaninglessBecause: null,
    asymmetric:
      "Decided only for a label that MEETS a frame box. `strictlyWithin` lets a label wholly inside a " +
      "frame pass and `boxesOverlap` lets one wholly outside pass, which is what makes a label in frame A " +
      "free to sit anywhere outside frame B — correct, and worth stating, because it means the clause is " +
      "silent on a sheet with no frames at all.",
  },
  {
    a: "label-outline",
    b: "no-connect-marker",
    checkedBy:
      "textProblems (text-scene.ts): the marker's box reaches the scene in `pinTexts` (`unitText`'s " +
      "no-connect loop) and a label is in `texts`, so the `texts × pinTexts` loop compares them.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "label-outline",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause:
      "`textProblems` tests `scene.crosses` against `mark === true` texts only — the DNP pin-polarity " +
      "marks — and `text-scene.ts` gives the reason in the field's own doc comment: \"A DNP part's own " +
      "Reference and Value may; KiCad's cross reaches them by design.\" A global label is NOT that part's " +
      "own text, so that reason does not transfer, and the cell rests instead on the bound in the " +
      "body/dnp-cross cell: the cross leaves its part's clearance box by at most 0.3 of a pin length. A " +
      "label's anchor sits at a pin tip or wire end on that box's boundary, so a label could in principle " +
      "begin under the cross. **THIS IS THE WEAKEST REASON IN THE MATRIX** and it is recorded in " +
      "docs/known-gaps.md as such rather than left to read as settled.",
    asymmetric: null,
  },
]
