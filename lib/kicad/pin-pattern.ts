/**
 * Every footprint this repository may place on stripboard, with the pads its
 * `.kicad_mod` declares, what those pads decompose into, and what - if
 * anything - is done to the leads first.
 *
 * WHY IT EXISTS. `HC10` is in `A1`, the verdict's hard-constraint conjunction,
 * and until this module existed nothing classified a footprint's pin pattern:
 * the verdict would have claimed a constraint held that was never checked. A
 * hard constraint whose check silently passes is worse than no constraint.
 *
 * EVERY NUMBER CAME FROM A `.kicad_mod` ON DISK AND NONE FROM MEMORY. Each
 * entry names the file it was read from and that file's own `(version <n>)`
 * token, and `tests/kicad/pin-pattern.test.ts` OPENS those files and compares
 * pad by pad - it does not skip when KiCad is absent, it fails. This
 * repository has twice shipped a footprint that does not exist, which is why
 * the test opens the file rather than comparing two fields of the same
 * literal.
 *
 * NOTHING IS DEFAULTED. An unlisted footprint throws, and the entries here are
 * exactly the thirteen `./lead-span.ts` records a span for - an entry for a
 * footprint nothing places is an entry nobody can check.
 *
 * ACROSS THE STRIPS, the row separation must be a whole number of 2.54mm
 * steps: a row of pads lands on one strip and the next row on another, and no
 * bending puts a lead between two strips. That clause refuses outright.
 *
 * ALONG A ROW there is latitude, because a lead moves along its own strip by
 * entering a different hole in it - and AN OFF-GRID ALONG-ROW PITCH IS A
 * FORMED-LEADS ACCOMMODATION RECORDED HERE, NOT AN INFERENCE FROM
 * COLLINEARITY. `Package_TO_SOT_THT:TO-92_Inline` is the worked case: its
 * three pads are collinear at 1.27mm, which is HALF a grid step, so two of the
 * three are between holes as moulded. What puts them in holes is forming the
 * leads, a physical operation performed once with pliers, and that is a claim
 * with provenance rather than something read off the pad coordinates. Three
 * entries carry such an accommodation - TO-92_Inline, CP_Radial_D5.0mm_P2.00mm
 * and CP_Radial_D8.0mm_P3.50mm - each with a basis and a `DatasheetRef`, and
 * `admitPattern` cross-checks each against `leadSpanFor`.
 *
 * The arithmetic, the refusals and the three-clause forming rule are in
 * `./pin-pattern-model.ts`; the four documents the forming accommodations cite
 * are in `./pin-pattern-sources.ts`. The reasoning, the per-footprint table and the
 * stated weaknesses are in `docs/stripboard/pin-pattern.md`. This file is the
 * data, and holds no logic: a transcription error here is caught by arithmetic
 * that cannot have been written to match it, which is the same split
 * `./lead-span.ts` and `./lead-span-model.ts` use and for the same reason.
 */
import {
  KICAD_PREPARED_PITCH_VARIANTS,
  KICAD_TO92_INLINE_WIDE,
  LIBRARY_ROOT,
  MIDPOINT_ANCHOR_BASIS,
  NICHICON_PS_AS_RECORDED,
} from "./pin-pattern-sources.ts"
import type { GridAccommodation, PadPosition, PadSource, PinPattern }
  from "./pin-pattern-model.ts"

/**
 * All thirteen files carry the same `(version 20260206)` token, so it is
 * recorded once. The test compares each entry against ITS OWN file, so a
 * library update that moves one of them fails loudly rather than silently.
 */
const VERSION = "20260206"

const pad = (name: string, xMm: number, yMm: number): PadPosition => ({ pad: name, xMm, yMm })

/**
 * `excludedPads` is empty for all thirteen because every `(pad ...)` form in
 * all thirteen files is named and classified - a measurement, not a rule.
 */
const source = (relativePath: string, padCount: number): PadSource => ({
  file: `${LIBRARY_ROOT}/${relativePath}`,
  version: VERSION,
  padCount,
  excludedPads: [],
})

const AS_MOULDED: GridAccommodation = { kind: "as-moulded" }

const TWO_TERMINAL_ON_GRID =
  "One row of two pads, so the across-strip clause is satisfied by having a single row, and " +
  "the pair spans a whole number of strip holes along it."

const PATTERNS: readonly PinPattern[] = [
  {
    footprint: "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal",
    pads: [pad("1", 0, 0), pad("2", 10.16, 0)],
    source: source(
      "Resistor_THT.pretty/R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal.kicad_mod",
      2,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [10.16],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis: `${TWO_TERMINAL_ON_GRID} Here that span is 10.16mm, which is four steps exactly.`,
  },
  {
    footprint: "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm",
    pads: [pad("1", 0, 0), pad("2", 5, 0)],
    source: source("Capacitor_THT.pretty/C_Rect_L7.2mm_W2.5mm_P5.00mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      `${TWO_TERMINAL_ON_GRID} Here that span is 5.00mm, which KiCad names in rounded metric ` +
      "for a 0.2in part: it is 0.08mm from two steps, inside the pitch tolerance, so the part " +
      "drops in unformed.",
  },
  {
    footprint: "Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm",
    pads: [pad("1", 0, 0), pad("2", 5, 0)],
    source: source("Capacitor_THT.pretty/C_Rect_L7.2mm_W3.5mm_P5.00mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      `${TWO_TERMINAL_ON_GRID} The same 5.00mm two-step span as the 2.5mm-bodied footprint: a ` +
      "body width is not a pin position and does not enter this classification at all.",
  },
  {
    footprint: "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm",
    pads: [pad("1", 0, 0), pad("2", 5, 0)],
    source: source("Capacitor_THT.pretty/C_Rect_L7.2mm_W4.5mm_P5.00mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      `${TWO_TERMINAL_ON_GRID} The same 5.00mm two-step span again, and this is the family ` +
      "lead-span.ts records as unformable, which costs it nothing here: a part already at its " +
      "holes needs no forming.",
  },
  {
    footprint: "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm",
    pads: [pad("1", 0, 0), pad("2", 2, 0)],
    source: source("Capacitor_THT.pretty/CP_Radial_D5.0mm_P2.00mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [2],
      alongRowOnGrid: false,
    },
    accommodation: {
      kind: "formed-to-grid",
      preparedPitchSteps: 1,
      basis:
        "The moulded 2.00mm pitch is 0.54mm off a 2.54mm step, so neither lead sits at a hole " +
        "with the other. Both leave the same face and the can stands clear of the board, so the " +
        "pair is splayed outward by 0.27mm each to one whole step, once, before the part is " +
        "fitted. One step is the nearest whole step to the moulded pitch and is inside the reach " +
        "lib/kicad/lead-span.ts derives for this family, which this cites rather than restates.",
      source: NICHICON_PS_AS_RECORDED,
      anchor: "lead-row-midpoint",
      anchorBasis:
        `${MIDPOINT_ANCHOR_BASIS} THIS IS THE ONE OF THE THREE WHERE THE CHOICE CHANGES THE ` +
        "ANSWER: a 5.00mm can on a 2.54mm formed span covers its two lead holes under this " +
        "anchor and a third one, on opposite sides, under each alternative - by margins of " +
        "0.04mm, so it is a physical question and not a rounding one.",
      anchorSource: KICAD_PREPARED_PITCH_VARIANTS,
    },
    basis:
      "One row of two pads at the moulded 2.00mm, which is not a whole number of strip holes: " +
      "the leads are formed to one step.",
  },
  {
    footprint: "Capacitor_THT:CP_Radial_D6.3mm_P2.50mm",
    pads: [pad("1", 0, 0), pad("2", 2.5, 0)],
    source: source("Capacitor_THT.pretty/CP_Radial_D6.3mm_P2.50mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [2.5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      `${TWO_TERMINAL_ON_GRID} Here that span is 2.50mm, KiCad's rounded metric for a 0.1in ` +
      "part: 0.04mm from one step, so this can drops in unformed while its 2.00mm and 3.50mm " +
      "siblings do not.",
  },
  {
    footprint: "Capacitor_THT:CP_Radial_D8.0mm_P3.50mm",
    pads: [pad("1", 0, 0), pad("2", 3.5, 0)],
    source: source("Capacitor_THT.pretty/CP_Radial_D8.0mm_P3.50mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [3.5],
      alongRowOnGrid: false,
    },
    accommodation: {
      kind: "formed-to-grid",
      preparedPitchSteps: 1,
      basis:
        "The moulded 3.50mm pitch is 0.96mm off a 2.54mm step, so neither lead sits at a hole " +
        "with the other. Both leave the same face and the can stands clear of the board, so the " +
        "pair is brought inward by 0.48mm each to one whole step, once, before the part is " +
        "fitted. One step is the nearest whole step to the moulded pitch and is inside the reach " +
        "lib/kicad/lead-span.ts derives for this family, which this cites rather than restates.",
      source: NICHICON_PS_AS_RECORDED,
      anchor: "lead-row-midpoint",
      anchorBasis:
        `${MIDPOINT_ANCHOR_BASIS} HERE ALL THREE ANCHORS AGREE, measured: an 8.00mm can on a ` +
        "2.54mm formed span overhangs a hole at each end whichever way it is bent. That is a " +
        "property of this can's size and not of forming, so the field still records which bend " +
        "is performed - nothing else does.",
      anchorSource: KICAD_PREPARED_PITCH_VARIANTS,
    },
    basis:
      "One row of two pads at the moulded 3.50mm, which is not a whole number of strip holes: " +
      "the leads are formed to one step.",
  },
  {
    footprint: "Capacitor_THT:CP_Radial_D10.0mm_P5.00mm",
    pads: [pad("1", 0, 0), pad("2", 5, 0)],
    source: source("Capacitor_THT.pretty/CP_Radial_D10.0mm_P5.00mm.kicad_mod", 2),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      `${TWO_TERMINAL_ON_GRID} Here that span is 5.00mm, 0.08mm from two steps and inside the ` +
      "pitch tolerance, so this can drops in unformed - the same 0.2in-in-rounded-metric pitch " +
      "the C_Rect films carry, and unlike the 2.00mm and 3.50mm cans above it, whose leads are " +
      "formed to one step.",
  },
  {
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical",
    pads: [pad("1", 0, 0)],
    source: source(
      "Connector_PinHeader_2.54mm.pretty/PinHeader_1x01_P2.54mm_Vertical.kicad_mod",
      1,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "A single pad, so one row of one, with no separation across the strips and no pitch along " +
      "the row. It occupies one hole and bridges nothing.",
  },
  {
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical",
    pads: [pad("1", 0, 0), pad("2", 0, 2.54)],
    source: source(
      "Connector_PinHeader_2.54mm.pretty/PinHeader_1x02_P2.54mm_Vertical.kicad_mod",
      2,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1"], ["2"]],
      rowPitchSteps: [1],
      alongRowPitchesMm: [],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "Two pads one 2.54mm step apart, which is two rows of one: the pins land on adjacent " +
      "strips, which is what a header is for, and nothing runs along a row.",
  },
  {
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical",
    pads: [pad("1", 0, 0), pad("2", 0, 2.54), pad("3", 0, 5.08)],
    source: source(
      "Connector_PinHeader_2.54mm.pretty/PinHeader_1x03_P2.54mm_Vertical.kicad_mod",
      3,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1"], ["2"], ["3"]],
      rowPitchSteps: [1, 1],
      alongRowPitchesMm: [],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "Three pads on the moulded 2.54mm, which is three rows of one at one step each: one pin " +
      "per strip across three adjacent strips.",
  },
  {
    footprint: "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical",
    pads: [
      pad("1", 0, 0),
      pad("2", 0, 2.54),
      pad("3", 0, 5.08),
      pad("4", 0, 7.62),
      pad("5", 0, 10.16),
    ],
    source: source(
      "Connector_PinHeader_2.54mm.pretty/PinHeader_1x05_P2.54mm_Vertical.kicad_mod",
      5,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1"], ["2"], ["3"], ["4"], ["5"]],
      rowPitchSteps: [1, 1, 1, 1],
      alongRowPitchesMm: [],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "Five pads on the moulded 2.54mm, which is five rows of one at one step each: one pin per " +
      "strip across five adjacent strips.",
  },
  {
    footprint: "Package_DIP:DIP-16_W7.62mm",
    pads: [
      pad("1", 0, 0),
      pad("2", 0, 2.54),
      pad("3", 0, 5.08),
      pad("4", 0, 7.62),
      pad("5", 0, 10.16),
      pad("6", 0, 12.7),
      pad("7", 0, 15.24),
      pad("8", 0, 17.78),
      pad("9", 7.62, 17.78),
      pad("10", 7.62, 15.24),
      pad("11", 7.62, 12.7),
      pad("12", 7.62, 10.16),
      pad("13", 7.62, 7.62),
      pad("14", 7.62, 5.08),
      pad("15", 7.62, 2.54),
      pad("16", 7.62, 0),
    ],
    source: source("Package_DIP.pretty/DIP-16_W7.62mm.kicad_mod", 16),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [
        ["1", "16"],
        ["2", "15"],
        ["3", "14"],
        ["4", "13"],
        ["5", "12"],
        ["6", "11"],
        ["7", "10"],
        ["8", "9"],
      ],
      rowPitchSteps: [1, 1, 1, 1, 1, 1, 1],
      alongRowPitchesMm: [7.62, 7.62, 7.62, 7.62, 7.62, 7.62, 7.62, 7.62],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "Eight rows of two, one strip pitch apart across the strips and three strip holes apart " +
      "along each row - the DIP that CRITERIA's own HC10 names as the pattern that decomposes " +
      "and passes.",
  },
  {
    footprint: "Package_TO_SOT_THT:TO-92_Inline",
    pads: [pad("1", 0, 0), pad("2", 1.27, 0), pad("3", 2.54, 0)],
    source: source("Package_TO_SOT_THT.pretty/TO-92_Inline.kicad_mod", 3),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "2", "3"]],
      rowPitchSteps: [],
      alongRowPitchesMm: [1.27, 1.27],
      alongRowOnGrid: false,
    },
    accommodation: {
      kind: "formed-to-grid",
      preparedPitchSteps: 1,
      basis:
        "The three leads are splayed to the 2.54mm grid once, with pliers, before the part is " +
        "fitted: at the moulded 1.27mm the middle and one outer lead are BETWEEN holes, half a " +
        "step off, so collinearity is not mountability here. KiCad ships the formed pattern as " +
        "its own footprint for the same package - TO-92_Inline_Wide, pads at 0, 2.54 and 5.08 - " +
        "and the pinned VeroRoute fork agrees from the other side, its TO92 being rows = 1, " +
        "cols = 3. lead-span.ts records this family as formable: false, so this record is the " +
        "only thing that admits it, and the bend obeys BEND_RULE in lead-span-model.ts.",
      source: KICAD_TO92_INLINE_WIDE,
      anchor: "lead-row-midpoint",
      anchorBasis:
        `${MIDPOINT_ANCHOR_BASIS} THE PAIR HERE IS TO-92_Inline_Wide, which the forming basis ` +
        "above already cites for its PADS; the frame is the same file's F.Fab layer, which " +
        "nobody had looked at. ALL THREE ANCHORS AGREE, measured: a 4.96mm body on a 5.08mm " +
        "formed row never reaches past the outer lead holes, by 0.06mm at each end.",
      anchorSource: KICAD_PREPARED_PITCH_VARIANTS,
    },
    basis:
      "One row of three at the moulded 1.27mm, which is HALF a strip pitch: the row decomposes " +
      "trivially and the along-row pitch is what needs the forming.",
  },
  {
    footprint: "Potentiometer_THT:Potentiometer_Runtron_RM-065_Vertical",
    pads: [pad("1", 0, 0), pad("2", 2.5, 5), pad("3", 5, 0)],
    source: source(
      "Potentiometer_THT.pretty/Potentiometer_Runtron_RM-065_Vertical.kicad_mod",
      3,
    ),
    classification: {
      kind: "rows",
      axis: "x",
      rows: [["1", "3"], ["2"]],
      rowPitchSteps: [2],
      alongRowPitchesMm: [5],
      alongRowOnGrid: true,
    },
    accommodation: AS_MOULDED,
    basis:
      "Two rows two strip pitches apart: pins 1 and 3 share a row 5.00mm apart, and the wiper " +
      "sits alone on the strip two away, 2.50mm along it. Every one of those three dimensions " +
      "is KiCad's rounded metric for a whole 0.1in step, which is why the moulded part drops " +
      "into a 3 x 3 hole field unformed.",
  },
]

export const PIN_PATTERNS: ReadonlyMap<string, PinPattern> = new Map(
  PATTERNS.map((entry) => [entry.footprint, entry]),
)

/** Every footprint with a recorded pattern, sorted, for quoting in a refusal. */
function recorded(): string {
  return [...PIN_PATTERNS.keys()].sort().map((name) => `  ${name}`).join("\n")
}

/**
 * The pin pattern for a footprint, or a refusal that says what is missing.
 *
 * There is no default and there will not be one. `HC10` is a hard constraint,
 * so a footprint whose pattern is unknown must refuse rather than be assumed
 * mountable: a pattern the strips cannot take is a board of cuts the owner has
 * said he will not build.
 */
export function pinPatternFor(
  footprint: string,
  patterns: ReadonlyMap<string, PinPattern> = PIN_PATTERNS,
): PinPattern {
  const found = patterns.get(footprint)
  if (found !== undefined) return found
  throw new Error(
    `no pin pattern is recorded for footprint "${footprint}": it is not in PIN_PATTERNS in ` +
      "lib/kicad/pin-pattern.ts, so whether its pins decompose into rows parallel to the " +
      "strips is unknown.\nThis is not defaulted, and will not be: HC10 is a hard constraint " +
      "in A1, and a pattern the strips cannot take is a board with a cut at nearly every pin - " +
      "which the owner has said he will not build.\nFootprints with a recorded pattern:\n" +
      `${recorded()}\n` +
      "To add one, open the .kicad_mod in the installed KiCad footprint library, record every " +
      "pad with the file path and its (version <n>) token, record the classification " +
      "classifyPads derives from those pads, decide and record the GridAccommodation with its " +
      "basis and datasheet, and put the entry beside the others. " +
      "docs/stripboard/pin-pattern.md shows the reasoning.",
  )
}
