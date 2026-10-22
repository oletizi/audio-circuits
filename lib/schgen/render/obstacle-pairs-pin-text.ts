/**
 * Matrix rows `pin-number` and `pin-name` — 23 of the 105 cells.
 *
 * **These two rows are where the up-front matrix earned its keep**, and the
 * answer is uncomfortable: a pin number and a pin name are obstacles for TEXT
 * and for nothing else. `textProblems` (text-scene.ts) crosses `texts` with
 * `pinTexts` and never crosses `pinTexts` with `segments`, `bodies` or
 * `strokes`, so a wire, a body or a power glyph over a pin number is refused
 * by nothing. `symbol-self-text.ts` closes the pin-text-against-pin-text case
 * and only within one unit of one symbol.
 *
 * The reason that is not simply a hole is `NUMBER_BOX_RESOLUTION`: the model's
 * pin-number box is 3.81 mm across against a 2.54 mm pin pitch, so any such
 * test would refuse every multi-pin symbol against itself. Whether that is a
 * reason or an excuse is the question docs/known-gaps.md puts, with the
 * residual stated.
 *
 * Supporting data for `obstacle-matrix.ts`.
 */
import type { PairCoverage } from "./obstacle-matrix.ts"
import {
  CLEARANCE_BOX, CROSS_BOUND, FRAME_DERIVED, JUNCTION_DERIVED, NO_FLAG_PRODUCER,
  NUMBER_BOX_RESOLUTION, SELF_TEXT_ONLY,
} from "./obstacle-pairs-reasons.ts"

const SELF_TEXT_CHECK =
  "symbolTextOverlaps and placedSymbolTextOverlaps (lib/schgen/render/symbol-self-text.ts), through " +
  "`unitOverlaps`: it takes every visible pin's `pinTexts` of one unit and refuses any pair closer than " +
  "`MIN_GAP = 254` µm (0.254 mm), relaxed to 0 for a pin against ITSELF because KiCad puts an offset-0 " +
  "pin's own name and number on opposite sides of its line"

const CROSS_BY_DESIGN =
  "KiCad draws the cross over its own part's body and pins, so a DNP part that shows pin numbers or " +
  "names has them under the cross BY DESIGN. `pin-marks.ts` exists precisely because of that — it prints " +
  "each pin's identity `OFFSET = 2 * GRID` off the pin line, OUTSIDE the cross — and `textProblems`'s " +
  "`if (t.mark === true)` clause is what holds those marks clear. Against a FOREIGN part's pin text the " +
  "bound in the body/dnp-cross cell applies"

export const PIN_NUMBER_PAIRS: readonly PairCoverage[] = [
  {
    a: "pin-number",
    b: "pin-number",
    checkedBy: `${SELF_TEXT_CHECK}. Two pin numbers meeting at a corner is the shape it names ("pin number \\"10\\" (pin 10) overlaps pin number \\"11\\" (pin 11)").`,
    meaninglessBecause: null,
    asymmetric: `${SELF_TEXT_ONLY}.`,
  },
  {
    a: "pin-number",
    b: "pin-name",
    checkedBy: `${SELF_TEXT_CHECK}. \`pinTexts\` emits a name box and a number box per pin and \`tooClose\` compares every pair of them; the 0.254 mm minimum is the rule the stock W25Q128JVS forced, which drew GND 0.13 mm under HOLD/RESET/IO3 and passed a strict-overlap test.`,
    meaninglessBecause: null,
    asymmetric: `${SELF_TEXT_ONLY}.`,
  },
  {
    a: "pin-number",
    b: "interior-graphic",
    checkedBy: null,
    meaninglessBecause:
      "Nothing compares them, and `symbol-self-text.ts` says why it does not: its doc comment scopes it " +
      "to \"every visible pin name and pin number of one unit … must not overlap another\" — pin text " +
      "against pin text, never against the symbol's own strokes. Both are properties of the library " +
      "drawing, placed by KiCad from the same geometry, and at this model's resolution a pin number " +
      "reaches 1.905 mm across its own pin line, which is inside the body outline of most stock symbols: " +
      "a test would refuse the stock library. Across units `overlapProblems` keeps the clearance boxes " +
      "apart, which contains both. **A symbol whose interior stroke crosses its own pin number is refused " +
      "by nothing here**, and that is recorded in docs/known-gaps.md rather than dressed up.",
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "wire",
    checkedBy: null,
    meaninglessBecause: `${NUMBER_BOX_RESOLUTION}. \`segments\` (wires and pin lines) is one of the lists \`pinTexts\` is never crossed with, and at the 2.54 mm pitch a number box always covers the neighbouring pin's line and every wire leaving it, so a wire-versus-pin-number test would refuse every adjacent-pin fanout this generator draws. **The residual — a wire genuinely drawn over a pin number — is real**, and it is recorded in docs/known-gaps.md.`,
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "junction",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. A junction is at a pin END, which is the tip the number box starts from, so the dot lies inside that box by construction — the coincidence is the pin, not a clash.`,
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "power-glyph",
    checkedBy: null,
    meaninglessBecause: `${NUMBER_BOX_RESOLUTION}. \`bodyGlyphProblems\` compares a glyph only against \`graphicsBox\`, which carries no pin text, and \`textProblems\` has the glyph in \`bodies\` and the number in \`pinTexts\` and never crosses those two lists. A power symbol is anchored AT a pin tip, so its glyph starts where that pin's own number box starts, and at 2.54 mm pitch it starts inside the neighbour's too. **That argument does NOT bound a glyph on a distant pin covering a number**, and the unbounded residual is recorded in docs/known-gaps.md.`,
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "pwr-flag-glyph",
    checkedBy: null,
    meaninglessBecause: `The pin-number/power-glyph cell's reason applies unchanged — \`pinTexts\` is crossed with \`texts\` alone. ${NO_FLAG_PRODUCER}, so no flag glyph reaches a scene here to clash with anything.`,
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "label-outline",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): a label is pushed into `texts` by `textScene`, a " +
      "pin number into `pinTexts` (as a `drawn.decorations` entry), and the loop is " +
      "`for (const p of scene.pinTexts) if (boxesOverlap(t.box, p.box))`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "pin-number",
    b: "field-text",
    checkedBy:
      "textProblems (text-scene.ts), the same `texts × pinTexts` loop; AND placeFields " +
      "(field-placement.ts), whose `fixedMarks` obstacles open with " +
      "`...prepared.flatMap((p) => p.decorations)`, so a field is PLACED clear of every pin number and " +
      "then checked independently. A unit with no clear slot refuses the block.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  { a: "pin-number", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. **THIS CELL'S OWN SENTENCE WAS FALSE AND THE TASK 6b RE-READ IS WHAT FOUND IT**: it said \`drawnBoxes\` includes \`scene.pinTexts\`, which is true of \`drawn-extent.ts\`'s and NOT of the one \`blockContent\` uses, so a pin number is in NO extent a frame is sized from. It is inside the border by the margin instead: ${NUMBER_BOX_RESOLUTION} — 1.905 mm either side of a pin line whose tip is in \`LibSymbol.boxes\`, against a 2.54 mm margin.`, asymmetric: null },
  {
    a: "pin-number",
    b: "no-connect-marker",
    checkedBy: null,
    meaninglessBecause:
      "Both are `unitText` `decorations` and both are drawn at the same pin: the marker is a one-grid-step " +
      "box centred on the pin end, and the number box starts at that same end and runs along the pin. " +
      "They overlap by construction at every NC pin whose number is shown, which is why `unitText` puts " +
      "them in one list rather than checking one against the other. Across units the pin-number " +
      "resolution argument applies.",
    asymmetric: null,
  },
  { a: "pin-number", b: "dnp-cross", checkedBy: null, meaninglessBecause: `${CROSS_BY_DESIGN}. ${CROSS_BOUND}.`, asymmetric: null },
]

export const PIN_NAME_PAIRS: readonly PairCoverage[] = [
  {
    a: "pin-name",
    b: "pin-name",
    checkedBy: `${SELF_TEXT_CHECK}. A bottom pin's name running up into a side pin's name is the shape it names ("pin name \\"NR/SS\\" (pin 6) overlaps pin name \\"DNC\\" (pin 7)"), and \`placedSymbolTextOverlaps\` extends it to every symbol a design places, stock or custom, once per placed unit, naming the parts that place it.`,
    meaninglessBecause: null,
    asymmetric: `${SELF_TEXT_ONLY}. It also measures only the characters KiCad DRAWS: \`textWidth\` strips \`~{}\`, \`_{}\` and \`^{}\` markup first, so an overbarred name is not over-measured.`,
  },
  {
    a: "pin-name",
    b: "interior-graphic",
    checkedBy: null,
    meaninglessBecause:
      "An inside pin name (`namesOffset > 0`) lies WITHIN its own body, which is where the interior " +
      "graphics are, and KiCad places both from the same library geometry; a name sitting on its own " +
      "symbol's outline is normal drawing, not a defect. `symbol-self-text.ts` models pin text against " +
      "pin text only and says so. Across units `overlapProblems` keeps the clearance boxes apart, which " +
      "contains both. The residual is the same one the pin-number/interior-graphic cell records.",
    asymmetric: null,
  },
  {
    a: "pin-name",
    b: "wire",
    checkedBy:
      "clearanceProblems → sceneClearanceProblems (lib/schgen/render/body-clearance.ts): an inside name " +
      "lies within the body, and `segmentThroughBox(w.a, w.b, u.box)` refuses a wire that meets the open " +
      "interior of the unit's clearance box.",
    meaninglessBecause: null,
    asymmetric:
      "Indirect and box-level — the name's own box is never the subject — and it carries the body/wire " +
      "cell's attached-wire exemption. It covers only `namesOffset > 0`; an offset-0 name is a " +
      "`decoration` and falls under the pin-number/wire cell's resolution argument instead.",
  },
  { a: "pin-name", b: "junction", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. An inside name is within the body and a junction is at a wire or pin end, which \`sceneClearanceProblems\` already keeps out of bodies.`, asymmetric: null },
  {
    a: "pin-name",
    b: "power-glyph",
    checkedBy:
      "bodyGlyphProblems (lib/schgen/render/glyph-clearance.ts): `unitText` places an inside name from " +
      "the body-side pin end INWARD, so it lies within `graphicsBox(graphics)` — which is exactly the box " +
      "this check compares every glyph against.",
    meaninglessBecause: null,
    asymmetric:
      "Indirect: the name's box is never the subject, it is covered because it is inside the box that is. " +
      "The `ownConnection` exemption and the \"draws nothing but pins\" exemption of the " +
      "body/power-glyph cell apply. An offset-0 name is OUTSIDE the body and is NOT covered — see the " +
      "pin-number/power-glyph cell.",
  },
  {
    a: "pin-name",
    b: "pwr-flag-glyph",
    checkedBy:
      "bodyGlyphProblems (glyph-clearance.ts), by the same containment as the pin-name/power-glyph cell; " +
      "`powerGlyphs` does not read `flag`.",
    meaninglessBecause: null,
    asymmetric: `The indirection and exemptions of the pin-name/power-glyph cell apply. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "pin-name",
    b: "label-outline",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `unitText`'s `nameBoxes` reach the scene inside " +
      "`interiorBoxes`, which `textScene` pushes into `pinTexts`, and a label is in `texts`; the loop is " +
      "`for (const p of scene.pinTexts) if (boxesOverlap(t.box, p.box))`.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "pin-name",
    b: "field-text",
    checkedBy:
      "textProblems (text-scene.ts), the `texts × pinTexts` loop; AND placeFields " +
      "(field-placement.ts), where an INSIDE field candidate must clear `p.interiorBoxes` " +
      "(`obstacles(true)` carries them when the candidate is inside) as well as lie `within` its own body.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  { a: "pin-name", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. The same correction as the pin-number/frame-border cell: \`interiorBoxes\` rides in \`scene.pinTexts\`, which \`blockContent\`'s \`drawnBoxes\` does NOT union. What puts a pin name inside the border is that \`unitText\` starts its box at \`inner\` (the body-side pin end, offset inward by \`namesOffset\`) and runs it \`textWidth(p.name)\` further inward, so it lies in the part's own graphics region — and that region IS unioned, as the placed \`LibSymbol.boxes\`.`, asymmetric: null },
  {
    a: "pin-name",
    b: "no-connect-marker",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. Within one unit the two normally cannot meet: the marker is a " +
      "one-grid-step box on a pin TIP, outside the body, and an inside name runs INWARD from the " +
      "body-side pin end. **The exception is a zero-length pin**, where tip and body-side end coincide — " +
      "`unitText` skips the pin line and the number for `p.length === 0` but runs the no-connect loop " +
      "unconditionally — so such a marker straddles the body edge and could reach an inside name. That " +
      "edge case is reasoned, not measured, and is recorded in docs/known-gaps.md.",
  },
  { a: "pin-name", b: "dnp-cross", checkedBy: null, meaninglessBecause: `${CROSS_BY_DESIGN}. ${CROSS_BOUND}.`, asymmetric: null },
]
