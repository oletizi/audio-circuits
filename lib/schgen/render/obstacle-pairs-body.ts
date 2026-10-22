/**
 * Matrix rows `body` and `pin-line` — 27 of the 105 cells.
 *
 * Hand-written data for `obstacle-matrix.ts`; see that file for what each
 * category means in this tree and for why `asymmetric` is widened from the
 * brief's wording. Every `checkedBy` here was traced to the lines that compare
 * those two categories.
 *
 * **The recurring shape of these two rows** is that `overlapProblems`
 * (`layout-check.ts`) compares `LibSymbol.boxes` — graphics plus BOTH pin ends,
 * so the box spans out to the pin tips (`lib-pins.ts`'s `unitBoxes`). Anything
 * a unit draws between its graphics and its pin tips is therefore inside that
 * box, and a FOREIGN unit's item reaching it makes two boxes overlap. That
 * buys a great deal cheaply and it is box-level, never item-level, and it is
 * silent about one unit against itself. Each cell says which of those limits
 * it carries.
 */
import type { PairCoverage } from "./obstacle-matrix.ts"
import {
  CLEARANCE_BOX, CROSS_BOUND, FRAME_DERIVED, JUNCTION_DERIVED, NO_FLAG_PRODUCER, NUMBER_BOX_RESOLUTION,
} from "./obstacle-pairs-reasons.ts"

export const BODY_PAIRS: readonly PairCoverage[] = [
  {
    a: "body",
    b: "body",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Within ONE block only. `checkLayout` runs per block, so two bodies in different blocks of one " +
      "sheet are kept apart by frame packing (`packFrames`, pack.ts) rather than by this check. " +
      "**THE SHEET-LEVEL CALLER IS NOW IN THIS TREE AND IT DOES COMPARE THEM**: Task 6b ported " +
      "`render/sheet-check.ts`, whose `bodyOverlaps` places every block's `LibSymbol.boxes` in sheet " +
      "coordinates and runs `boxesOverlap` over all pairs ACROSS blocks, and `assertSheetSafe` throws " +
      "`sheet <id>: body clearance:` on one. So this caveat is now about which check catches it, not " +
      "about a gap: the cross-block case is covered, by a different function, over the same geometry.",
  },
  {
    a: "body",
    b: "pin-line",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}, so a foreign unit's pin line lying in a body means the two boxes overlap.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level, and FOREIGN units only. A unit's own pin lines meet its own body by construction — " +
      "`bodyBoxes` is built from the body-side pin ends — so the self-pair cannot fail and is not tested.",
  },
  {
    a: "body",
    b: "pin-number",
    checkedBy: null,
    meaninglessBecause: `${NUMBER_BOX_RESOLUTION}. For a FOREIGN body the residual is real and bounded only by \`overlapProblems\`, which keeps clearance boxes from overlapping but not 1.905 mm apart; recorded in docs/known-gaps.md.`,
    asymmetric: null,
  },
  {
    a: "body",
    b: "pin-name",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level, FOREIGN units only, and only for an INSIDE name. `unitText` places a name with " +
      "`namesOffset > 0` from the body-side pin end INWARD, so it lies within its own body by " +
      "construction and the self-pair cannot fail; `symbolTextOverlaps` (symbol-self-text.ts) is what " +
      "holds a symbol's own pin text to account instead. An offset-0 name is modelled as a `decoration`, " +
      "so it falls under the body/pin-number cell, not here.",
  },
  {
    a: "body",
    b: "interior-graphic",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only, and trivial for the self-pair: both `LibSymbol.boxes` " +
      "(`boxesOf` via `graphicPoints`) and `graphicsBox` (lib-graphics.ts) are BUILT from the unit's " +
      "interior graphics, so a unit's graphics are inside its own body by definition.",
  },
  {
    a: "body",
    b: "wire",
    checkedBy:
      "clearanceProblems → sceneClearanceProblems (lib/schgen/render/body-clearance.ts), reached from " +
      "`checkLayout`: `segmentThroughBox(w.a, w.b, u.box)` refuses a wire whose segment meets the open " +
      "interior of a unit's clearance box, and `insideBox` refuses an anchor inside one.",
    meaninglessBecause: null,
    asymmetric:
      "A wire ATTACHED to the unit at either end on the wire's own net is exempt from the body test " +
      "entirely — `if (attached(u, w.a, w.net) || attached(u, w.b, w.net)) continue` — so such a wire may " +
      "cross a DIFFERENT pin's line or body region of that same unit undetected. Recorded in " +
      "docs/known-gaps.md.",
  },
  {
    a: "body",
    b: "junction",
    checkedBy: null,
    meaninglessBecause: `${JUNCTION_DERIVED}. The residual here is exactly the attached-wire exemption the body/wire cell records, not a second thing.`,
    asymmetric: null,
  },
  {
    a: "body",
    b: "power-glyph",
    checkedBy:
      "bodyGlyphProblems (lib/schgen/render/glyph-clearance.ts): `bodies(scene)` × `glyphs(scene)` with " +
      "`boxesOverlap`, one line per offending pair. This is the check the pedals history's " +
      "\"C_NR's body was drawn over the GND symbol of the regulator's neighbouring pin\" defect produced.",
    meaninglessBecause: null,
    asymmetric:
      "The body here is `graphicsBox(graphics)` — the drawn strokes and text areas alone, NOT the " +
      "clearance box — so a glyph in the gap between a unit's graphics and its pin tips is not refused by " +
      "this check, and a unit that draws nothing but pins has no body at all (`if (lib === null) " +
      "return []`). A glyph at one of that unit's OWN pin ends on that pin's net is exempt by " +
      "`ownConnection`, which is the connection itself.",
  },
  {
    a: "body",
    b: "pwr-flag-glyph",
    checkedBy:
      "bodyGlyphProblems (lib/schgen/render/glyph-clearance.ts). `powerGlyphs` maps every `scene.powers` " +
      "entry whatever its `flag`, so a PWR_FLAG's glyph is a glyph for this check and is named " +
      "\"the glyph of PWR_FLAG <net> <i>\".",
    meaninglessBecause: null,
    asymmetric: `The \`graphicsBox\` and own-connection limits of the body/power-glyph cell apply. ${NO_FLAG_PRODUCER}.`,
  },
  {
    a: "body",
    b: "label-outline",
    checkedBy:
      "bodyGlyphProblems (glyph-clearance.ts), whose `glyphs()` mixes `labelBox(l)` in with the power " +
      "glyphs; AND textProblems (lib/schgen/render/text-scene.ts), because `textScene` pushes each label " +
      "into `texts` and each unit body into `bodies`, which its `texts × bodies` loop compares.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  {
    a: "body",
    b: "field-text",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `for (const b of scene.bodies) if ((t.owner === " +
      "undefined || t.owner !== b.owner) && boxesOverlap(t.box, b.box))`.",
    meaninglessBecause: null,
    asymmetric:
      "Fields the placer put INSIDE their own body are exempt by `Named.owner`. `placeFields` " +
      "(field-placement.ts) is what holds them instead: an inside candidate must satisfy " +
      "`within(b, p.body)` and clear that unit's own `interiorBoxes` and `strokes`, and the block is " +
      "refused when no candidate fits.",
  },
  { a: "body", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. The placed \`LibSymbol.boxes\` are the FIRST thing \`blockContent\` unions, so a body is the one category whose containment needs neither the margin nor an indirection. Re-read at Task 6b against the landed \`frames.ts\`; unchanged.`, asymmetric: null },
  {
    a: "body",
    b: "no-connect-marker",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level, FOREIGN units only, and the clearance box stops AT the pin tip while the marker's box " +
      "reaches `GRID / 2` = 0.635 mm beyond it (`unitText`'s no-connect loop), so a foreign body within " +
      "0.635 mm of an NC pin tip is not refused. The self-pair is exempt: the marker sits on its own " +
      "unit's pin by construction.",
  },
  { a: "body", b: "dnp-cross", checkedBy: null, meaninglessBecause: `${CROSS_BOUND}.`, asymmetric: null },
]

export const PIN_LINE_PAIRS: readonly PairCoverage[] = [
  {
    a: "pin-line",
    b: "pin-line",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}, and that box contains the whole pin line.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. Two pin lines of ONE unit are compared by nothing: that is " +
      "library geometry, and `symbolTextOverlaps` (symbol-self-text.ts) checks a symbol against itself " +
      "for TEXT only, never for its pin lines — its own doc comment is explicit that it models pin names " +
      "and numbers. A library symbol whose two pins are drawn crossing passes everything in this tree. " +
      "Recorded in docs/known-gaps.md.",
  },
  {
    a: "pin-line",
    b: "pin-number",
    checkedBy: null,
    meaninglessBecause: `${NUMBER_BOX_RESOLUTION}. The self-pair is an identity — the box is drawn ALONG its own pin line — and across units the body/pin-number cell's residual applies.`,
    asymmetric: null,
  },
  {
    a: "pin-line",
    b: "pin-name",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. The self-pair cannot fail by construction: `unitText` places an " +
      "inside name (`namesOffset > 0`) from the body-side pin end INWARD, while every pin line runs from " +
      "the body OUTWARD to its tip, so a unit's inside names and its own pin lines occupy disjoint " +
      "regions. An offset-0 name is a `decoration` and belongs to the pin-line/pin-number cell.",
  },
  {
    a: "pin-line",
    b: "interior-graphic",
    checkedBy: `checkLayout → overlapProblems (lib/schgen/render/layout-check.ts). ${CLEARANCE_BOX}.`,
    meaninglessBecause: null,
    asymmetric:
      "Box-level and FOREIGN units only. The self-pair is the same unchecked library geometry the " +
      "pin-line/pin-line cell records: `boxesOf` builds one box from the graphics AND the pin ends " +
      "together, so a symbol that draws a stroke across its own pin line produces one box and no " +
      "disagreement.",
  },
  {
    a: "pin-line",
    b: "wire",
    checkedBy:
      "checkWireSafety (lib/schgen/render/wire-safety.ts) via `wireOverPins`, which refuses a pin END " +
      "anywhere on a foreign-net wire and a same-net pin end strictly inside one; AND " +
      "sceneClearanceProblems (body-clearance.ts) via `onPinLine`, which refuses a wire END anywhere on a " +
      "pin's segment other than that pin's own end, and via `segmentThroughBox` for the clearance box " +
      "that contains the line. `onPinLine` is the \"KiCad would not join these, but a reader would\" " +
      "refusal the pedals regulator template produced.",
    meaninglessBecause: null,
    asymmetric:
      "Three partial subjects, and none of them is a line-versus-line test: pin END on wire, wire END on " +
      "pin line, wire through the clearance BOX. A wire crossing a pin line mid-both is reached only by " +
      "the third, so the attached-wire exemption the body/wire cell records applies to it.",
  },
  { a: "pin-line", b: "junction", checkedBy: null, meaninglessBecause: `${JUNCTION_DERIVED}. A junction is at a pin TIP, and every coincidence there is governed by \`pinChecks\` and \`wireOverPins\` (wire-safety.ts).`, asymmetric: null },
  {
    a: "pin-line",
    b: "power-glyph",
    checkedBy:
      "sceneClearanceProblems (lib/schgen/render/body-clearance.ts): `onPinLine(what, a.at, units)` runs " +
      "over every anchor and refuses a power symbol's ANCHOR POINT lying on any pin's segment other than " +
      "that pin's own end.",
    meaninglessBecause: null,
    asymmetric:
      "**POINT-LEVEL ONLY, AND THIS IS A BLIND SPOT THE MATRIX FOUND.** The anchor point is tested; the " +
      "GLYPH BOX never is. `bodyGlyphProblems` compares a glyph against `graphicsBox`, which carries no " +
      "pin lines; `textProblems` has the glyph in `bodies` and the pin lines in `segments` and never " +
      "crosses those two lists. So a GND glyph at one pin's tip whose box reaches a neighbouring pin's " +
      "line 2.54 mm away is refused by nothing in this tree. Recorded in docs/known-gaps.md.",
  },
  {
    a: "pin-line",
    b: "pwr-flag-glyph",
    checkedBy:
      "sceneClearanceProblems (body-clearance.ts) via `onPinLine`, for the flag's anchor point — the " +
      "check does not read `flag`.",
    meaninglessBecause: null,
    asymmetric:
      "The point-level blind spot of the pin-line/power-glyph cell applies in full. **THE SECOND HALF OF " +
      "THIS CELL WAS FALSIFIED BY TASK 6b AND IS REWRITTEN RATHER THAN SOFTENED.** It said no flag " +
      "reaches a `ClearanceScene` here, because the producer (`render/frames.ts`) was not ported. It is " +
      "ported, and a flag DOES reach one: `flagsContent` emits `flag: true` power symbols, `layoutSheet` " +
      "carries them into the sheet's `powers`, and `sheet-check.ts`'s `clearance` passes " +
      "`[...scene.powers, ...scene.labels]` as `ClearanceScene.anchors` - a `PowerSymbol` satisfies " +
      "`AnchorPoint` structurally, and `sceneClearanceProblems` never reads `flag`. **What is still " +
      "narrower than `NO_FLAG_PRODUCER`, and is this cell's own point, holds**: no BLOCK anchor becomes " +
      "a flag, because `anchorsToSymbols` hard-codes `flag: false`. So the check runs over a flag that " +
      "lives alone in the flags frame, with no placement beside it, and the refusal has never fired. " +
      "Re-read at Task 7 and again at Task 6b; see docs/known-gaps.md.",
  },
  {
    a: "pin-line",
    b: "label-outline",
    checkedBy:
      "sceneClearanceProblems (body-clearance.ts) via `onPinLine` for the label's anchor point; AND " +
      "textProblems (text-scene.ts), which puts `labelBox(l)` in `texts` and `drawn.pins` in `segments` " +
      "and runs `segmentHitsBox(s.a, s.b, t.box)` over `texts × segments`.",
    meaninglessBecause: null,
    asymmetric:
      "Covered point-level AND box-level, which is the asymmetry worth naming: a LABEL's box is tested " +
      "against pin lines, a POWER GLYPH's box is not. Same geometry, two outcomes — the shape G85 names.",
  },
  {
    a: "pin-line",
    b: "field-text",
    checkedBy:
      "textProblems (lib/schgen/render/text-scene.ts): `drawn.pins` go into `segments` and the loop is " +
      "`for (const s of scene.segments) if (segmentHitsBox(s.a, s.b, t.box))`. `placeFields` " +
      "(field-placement.ts) uses the same `p.pins` as segments when choosing a slot, so a field is placed " +
      "clear of them and then checked independently.",
    meaninglessBecause: null,
    asymmetric: null,
  },
  { a: "pin-line", b: "frame-border", checkedBy: null, meaninglessBecause: `${FRAME_DERIVED}. The old sentence named \`scene.segments\`, which is \`drawn-extent.ts\`'s route and not the one that sizes a frame. A pin line runs from its body-side end to its tip, and \`LibSymbol.boxes\` — which \`blockContent\` DOES union — is \`unitBoxes\`: graphics plus BOTH pin ends, so it spans to the tip. Same conclusion, different line of code.`, asymmetric: null },
  {
    a: "pin-line",
    b: "no-connect-marker",
    checkedBy: null,
    meaninglessBecause:
      "The marker is centred on the pin END — the tip of that same pin's line — and reaches `GRID / 2` " +
      "either way, so it overlaps its own pin's line by construction. That is what an X on a pin MEANS, " +
      "not a defect, which is why `unitText` puts the marker in the same `decorations` list as that pin's " +
      "own number rather than checking one against the other. Across units the 0.635 mm residual the " +
      "body/no-connect-marker cell records applies.",
    asymmetric: null,
  },
  {
    a: "pin-line",
    b: "dnp-cross",
    checkedBy: null,
    meaninglessBecause: `KiCad draws the cross over its own part's body AND pins — \`pin-marks.ts\`'s doc comment says so, and the pin-polarity marks exist because of it — so covering its own pin lines is the cross's purpose. Across parts: ${CROSS_BOUND}.`,
    asymmetric: null,
  },
]
