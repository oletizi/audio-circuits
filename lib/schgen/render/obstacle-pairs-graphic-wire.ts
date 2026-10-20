/**
 * Matrix rows `interior-graphic`, `wire` and `junction` — 27 of the 105 cells.
 *
 * `interior-graphic` is the best-covered row in the matrix for one reason:
 * `graphicsBox(graphics)` IS the bounding box of a unit's interior graphics,
 * and it is what `bodyGlyphProblems` compares every glyph against. For text it
 * is better still, because `textProblems` crosses `texts` with `strokes` at
 * SEGMENT level rather than box level.
 *
 * `wire` is the one class of refusal the pedals spec anticipated (the history's
 * §6: "The spec anticipated exactly one class of them (wire safety);
 * everything else was discovered"), and it shows: `checkWireSafety` decides
 * wire against wire, pin end and anchor with named rules. What it does NOT
 * decide is a glyph's BOX against a wire, and that is this row's finding.
 *
 * `junction` has no check in any cell, and the reason is the same in all of
 * them: `junctionPoints` is derived from items that are already checked.
 *
 * Supporting data for `obstacle-matrix.ts`.
 */
import type { PairCoverage } from "./obstacle-matrix.ts"
import {
  CLEARANCE_BOX, CROSS_BOUND, FRAME_DERIVED, JUNCTION_DERIVED, NO_FLAG_PRODUCER,
} from "./obstacle-pairs-reasons.ts"

const GLYPH_BOX_BLIND_SPOT =
  "**POINT-LEVEL ONLY, AND THIS IS THE BLIND SPOT THE MATRIX FOUND.** The anchor point is tested; the " +
  "GLYPH BOX never is. `bodyGlyphProblems` compares a glyph against `graphicsBox` alone, `glyphGlyphProblems` " +
  "compares it only against other power glyphs, and `textProblems` has the glyph in `bodies` and the " +
  "wires and pin lines in `segments` and never crosses those two lists. A label's box IS tested against " +
  "segments, because a label is in `texts`; a power glyph's box is not. Same geometry, two outcomes — " +
  "which is precisely the shape G85 names. Recorded in docs/known-gaps.md"

export const INTERIOR_GRAPHIC_PAIRS: readonly PairCoverage[] = [
  {
    a: "interior-graphic",
    b: "interior-graphic",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}, and it is built from those very graphics.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. One symbol's graphics crossing each other IS the drawing — a " +
      "transistor's arrow crosses its base bar — and `lib-graphics.ts`'s `unitGraphics` deliberately " +
      "collects every sub-symbol's strokes and blocked areas of that unit into one `UnitGraphics` rather " +
      "than keeping them apart to compare.",
  },
  {
    a: "interior-graphic",
    b: "wire",
    checkedBy:
      "clearanceProblems → sceneClearanceProblems (lib/schgen/render/body-clearance.ts): " +
      "`segmentThroughBox(w.a, w.b, u.box)` refuses a wire that meets the open interior of the clearance " +
      "box, which contains the graphics.",
    meaninglessBecause: null,
    asymmetric:
      "Box-level, not stroke-level, and it carries the body/wire cell's attached-wire exemption. " +
      "`textProblems` DOES compare strokes at segment level, but only against `texts`: " +
      "`for (const s of scene.strokes) if (segmentHitsBox(s.a, s.b, t.box))` iterates texts, never wires.",
  },
  { a: "interior-graphic", b: "junction", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. A junction is at a wire or pin end, and \`sceneClearanceProblems\` already keeps wires out of the box that contains the graphics.`, asymmetric: null },
  {
    a: "interior-graphic",
    b: "power-glyph",
    checkedBy:
      "bodyGlyphProblems (lib/schgen/render/glyph-clearance.ts). This is the most direct cell in the " +
      "matrix: the box it compares every glyph against IS `graphicsBox(graphics)` (lib-graphics.ts), the " +
      "union of the unit's graphic segment boxes and its interior blocks.",
    meaninglessBecause: null,
    asymmetric:
      "Bounding box, not stroke: a glyph in the box's empty region — the corner outside a transistor's " +
      "circle — is refused although no stroke is touched, which errs toward refusing. `ownConnection` " +
      "exempts a glyph at one of the unit's own pin ends on that pin's net, and a unit that draws nothing " +
      "but pins has no box and is exempt entirely (`if (lib === null) return []`).",
  },
  {
    a: "interior-graphic",
    b: "pwr-flag-glyph",
    checkedBy: "bodyGlyphProblems (glyph-clearance.ts), by the same comparison; `powerGlyphs` does not read `flag`.",
    meaninglessBecause: null,
    asymmetric: `The bounding-box and exemption limits of the interior-graphic/power-glyph cell apply. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "interior-graphic",
    b: "label-outline",
    checkedBy:
      "bodyGlyphProblems (glyph-clearance.ts), whose `glyphs()` mixes `labelBox(l)` in with the power " +
      "glyphs and compares it against `graphicsBox`; AND textProblems (text-scene.ts) at SEGMENT level, " +
      "`for (const s of scene.strokes) if (segmentHitsBox(s.a, s.b, t.box))`, because a label is in " +
      "`texts` and the unit's strokes are in `strokes`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "interior-graphic",
    b: "field-text",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `texts × strokes` at segment level, and " +
      "`texts × pinTexts` for the interior text and arc areas (`graphics.blocks`, which `unitText` puts " +
      "in `interiorBoxes`); AND tryPlaceFields (field-placement.ts), where an INSIDE candidate's " +
      "`strokes` list is `[...segments, ...p.strokes]` and its blockers carry `p.interiorBoxes`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  { a: "interior-graphic", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. An interior graphic is in \`scene.strokes\`, which \`blockContent\`'s \`drawnBoxes\` does not union — but \`LibSymbol.boxes\`, which it does, is \`unitBoxes\`: the symbol's GRAPHICS plus both pin ends. A stroke is one of those graphics, so it is inside the extent already. Re-read at Task 6b.`, asymmetric: null },
  {
    a: "interior-graphic",
    b: "no-connect-marker",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. Within one unit the marker sits on a pin TIP, outside the " +
      "graphics, except for the zero-length pin the pin-name/no-connect-marker cell records.",
  },
  {
    a: "interior-graphic",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause: `A DNP part's cross is drawn over its own graphics by design — that is what \`pin-marks.ts\` records KiCad doing (SCH_SYMBOL::PlotDNP) and why the pin-polarity marks exist. Across parts: ${CROSS_BOUND}.`,
    asymmetric: null,
  },
]

export const WIRE_PAIRS: readonly PairCoverage[] = [
  {
    a: "wire",
    b: "wire",
    checkedBy:
      "checkWireSafety (lib/schgen/render/wire-safety.ts) via `wireOverWires`: a collinear overlap of " +
      "any nets is reported once (`collinearOverlap`), a foreign-net wire END on another wire is refused " +
      "(`onSegment`), and a same-net end strictly inside another wire is refused because KiCad joins it " +
      "only with a junction (`strictlyInside`, \"split the wire there\"). `connectedComponents` plus " +
      "`componentProblems` (layout-check.ts) decide the electrical consequence — shorts and split nets — " +
      "and `danglingWireEnds` the loose ends.",
    meaninglessBecause: null,
    asymmetric:
      "Two CROSSING interiors of different nets are deliberately not refused: `connectivity.ts`'s module " +
      "comment records that KiCad joins crossing wire interiors only with a junction and that the " +
      "generator never relies on it. An ANCHOR at such a crossing IS refused, by `anchorAtCrossing`, " +
      "because a label there would join both.",
  },
  {
    a: "wire",
    b: "junction",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. For this pair the derivation is total: \`junctionPoints\` is computed FROM the wire and pin ends, so a junction cannot be anywhere a wire end is not, and there is nothing left to compare.`,
    asymmetric: null,
  },
  {
    a: "wire",
    b: "power-glyph",
    checkedBy:
      "checkWireSafety (lib/schgen/render/wire-safety.ts) via `anchorChecks`: " +
      "`if (o.kind === \"wire\" && onSegment(a.at, o.a, o.b))` refuses a power symbol's anchor lying " +
      "anywhere on a foreign-net wire, and `anchorAtCrossing` refuses one at two wires' crossing.",
    meaninglessBecause: null,
    asymmetric: `${GLYPH_BOX_BLIND_SPOT}. A foreign wire may run straight through a power glyph's box without a refusal.`,
  },
  {
    a: "wire",
    b: "pwr-flag-glyph",
    checkedBy: "checkWireSafety (wire-safety.ts) via `anchorChecks`, for the flag's anchor point; the check does not read `flag`.",
    meaninglessBecause: null,
    asymmetric: `${GLYPH_BOX_BLIND_SPOT}. ${NO_FLAG_PRODUCER}, so no flag anchor reaches \`layoutItems\` here yet either.`,
  },
  {
    a: "wire",
    b: "label-outline",
    checkedBy:
      "checkWireSafety (wire-safety.ts) via `anchorChecks` for the label's anchor point; AND textProblems " +
      "(text-scene.ts) at BOX level, `for (const s of scene.segments) if (segmentHitsBox(s.a, s.b, " +
      "t.box))`, because `textScene` puts `labelBox(l)` in `texts` and `layout.wires` in `segments`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "wire",
    b: "field-text",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `texts × segments` with `segmentHitsBox`; AND " +
      "tryPlaceFields (field-placement.ts), whose `segments` list opens with " +
      "`...scene.wires.map((w, i) => ({ what: `wire ${i} (${w.net})`, a: w.a, b: w.b }))`, so a field is " +
      "placed clear of every wire and then checked independently.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  { a: "wire", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. The old sentence named \`scene.segments\`, which is \`drawn-extent.ts\`'s route; \`blockContent\` takes the wires directly instead, unioning \`pointBox(w.a)\` and \`pointBox(w.b)\` for every wire of the layout. For an axis-aligned wire those two degenerate boxes union to exactly its segment box, so the conclusion is unchanged and the mechanism is a different line of code.`, asymmetric: null },
  {
    a: "wire",
    b: "no-connect-marker",
    checkedBy:
      "checkWireSafety (wire-safety.ts) via `wireOverPins`, and componentProblems (layout-check.ts). An " +
      "NC pin has `net === null`, so `p.net !== w.net` holds for every wire and a wire passing over its " +
      "pin END on any net is refused; `componentProblems` then refuses an NC pin that touches anything at " +
      "all (\"not-connected pin … touches …\").",
    meaninglessBecause: null,
    asymmetric:
      "Decided for the pin END the marker sits on, not for the marker's box. It does not need to be: the " +
      "box is one grid step centred on that end, and the end is governed. The residual is a wire passing " +
      "within `GRID / 2` = 0.635 mm of the end without touching it, which KiCad draws as a wire beside an " +
      "X — legible, and not a connection.",
  },
  {
    a: "wire",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause: `A DNP part's own wires run to its pins, which the cross covers by design. A FOREIGN wire is reached only through the bound in the body/dnp-cross cell: ${CROSS_BOUND}.`,
    asymmetric: null,
  },
]

export const JUNCTION_PAIRS: readonly PairCoverage[] = [
  {
    a: "junction",
    b: "junction",
    checkedBy: null,
    meaninglessBecause:
      "`junctionPoints` deduplicates by `pointKey`, and every point it returns is a wire or pin END, " +
      "which `gridProblems` (layout-check.ts, via `assertOnGrid`) holds to the 1.27 mm grid. So two " +
      "junctions are at least one grid step apart, and a junction dot is a mark at a point rather than a " +
      "box with an extent of its own. There is nothing for a check to decide.",
    asymmetric: null,
  },
  {
    a: "junction",
    b: "power-glyph",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. Where the junction's point IS the glyph's own anchor the coincidence is the connection; where it is not, the point is a wire or pin end whose clearance against the glyph is the wire/power-glyph and pin-line/power-glyph cells' subject — and the box-level blind spot those cells record is the same blind spot here, not a second one.`,
    asymmetric: null,
  },
  { a: "junction", b: "pwr-flag-glyph", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. The junction/power-glyph reasoning applies unchanged. ${NO_FLAG_PRODUCER}.`, asymmetric: null },
  {
    a: "junction",
    b: "label-outline",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. Here the derivation suffices outright, because a label's BOX is tested against wires and pin lines by \`textProblems\` (\`texts × segments\`): a label reaching a junction point would already be refused for reaching the wire that makes it.`,
    asymmetric: null,
  },
  {
    a: "junction",
    b: "field-text",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. A text whose box reached a junction would already be refused by \`textProblems\` for reaching the wire or pin line that makes it.`,
    asymmetric: null,
  },
  { a: "junction", b: "frame-border", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. ${FRAME_DERIVED}. The two compose exactly: a junction is only ever at a point where three or more wire ends and pin ends coincide, and \`blockContent\` unions every wire end and every pin tip (through \`LibSymbol.boxes\`), so a dot is never outside the extent the frame was sized from. Re-read at Task 6b.`, asymmetric: null },
  {
    a: "junction",
    b: "no-connect-marker",
    checkedBy: null,
    meaninglessBecause:
      "**The two cannot coexist at a point, and that is a check that could fail rather than an " +
      "assertion.** A junction needs three or more coincident wire and pin ends; `componentProblems` " +
      "(layout-check.ts) refuses an NC pin that touches ANYTHING (\"not-connected pin … touches …\"), and " +
      "`pinChecks` (wire-safety.ts) refuses any coincidence involving an NC pin. So an NC pin end can " +
      "never be one of a junction's three.",
    asymmetric: null,
  },
  { a: "junction", b: "dnp-cross", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. ${CROSS_BOUND}.`, asymmetric: null },
]
