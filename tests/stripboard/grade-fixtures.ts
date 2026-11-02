/**
 * The boards `tests/stripboard/grade.test.ts` grades, and how a `CheckInput` is
 * built from one.
 *
 * ONE BOARD, TWELVE SINGLE-FAULT VARIATIONS. `healthy` is a three-part layout
 * on which all ten hard constraints hold; every negative fixture under
 * `tests/fixtures/stripboard/negative/` is either that board with one thing
 * wrong or a committed capture, and each is named for the constraint it must
 * fail. A fixture directory is the grader's real input seam: the grader reads
 * dump text, a `--check` report and a netlist export, so the fixtures are those
 * three things and no test spawns a binary to produce them.
 *
 * EVERY `CheckInput` READS THE DUMP TEXT ONCE AND SETS BOTH `dumpText` AND
 * `dump` FROM IT. That is not a convenience: `HC8`'s contract is about the text
 * and the other nine read parsed structure, so a helper that parsed one string
 * and read another could hand the grader two different boards.
 *
 * A FIXTURE'S FOUR PARTS, each falling back to `healthy`'s when absent, so a
 * fixture declares only what it changes:
 *   `<name>.dump`              the board
 *   `<name>.footprints.json`   designator -> KiCad footprint
 *   `<name>.netlist`           the reference export, read by referenceNetsFromExport
 *   `<name>.report`            `--check`'s output, with `<name>.status` beside it
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper several test files import,
 * following `tests/stripboard/score-fixtures.ts`.
 */
import fs from "node:fs"
import path from "node:path"
import { freshTempScratch } from "../support/temp-scratch.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { classifyPads, type PadPosition, type PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import {
  TOOL_MAX_SPAN_HOLES,
  TOOL_MIN_SPAN_HOLES,
  type LeadSpan,
} from "../../lib/kicad/lead-span-model.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { parseCheckReport, type CheckInput } from "../../tools/stripboard/constraints.ts"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import {
  INJECTED_PATTERNS,
  INJECTED_SPANS,
  ringSpan,
} from "./synthetic-footprints.ts"

/**
 * The synthetic pad fields, re-exported because the tests import them from
 * here. `./synthetic-footprints.ts` declares them and says why they exist.
 */
export { INJECTED_PATTERNS, INJECTED_SPANS, ringPattern } from "./synthetic-footprints.ts"

const DIR = path.join(import.meta.dir, "..", "fixtures", "stripboard", "negative")

/** The declaration every fixture reads its stock from: it declares none, so the rules default answers. */
const LOW_BOOST_DECLARATION = path.join(
  import.meta.dir,
  "..",
  "..",
  "boards",
  "pultec-low-boost",
  "perfboard.json",
)

export function read(name: string, extension: string): string {
  const own = path.join(DIR, `${name}.${extension}`)
  if (fs.existsSync(own)) return fs.readFileSync(own, "utf8")
  const shared = path.join(DIR, `healthy.${extension}`)
  if (fs.existsSync(shared)) return fs.readFileSync(shared, "utf8")
  throw new Error(
    `fixture "${name}" has no .${extension} and neither does healthy, so there is nothing to ` +
      `build a CheckInput from. This refuses rather than defaulting: a grader handed a blank ` +
      `report or an empty netlist produces a verdict about nothing.`,
  )
}

function footprintsOf(name: string): ReadonlyMap<string, string> {
  const parsed: unknown = JSON.parse(read(name, "footprints.json"))
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${name}.footprints.json must be an object mapping designator to footprint`)
  }
  const map = new Map<string, string>()
  for (const [ref, footprint] of Object.entries(parsed)) {
    if (typeof footprint !== "string") {
      throw new Error(`${name}.footprints.json: "${ref}" must name a footprint string`)
    }
    map.set(ref, footprint)
  }
  return map
}

const RESISTOR = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const FILM = "Capacitor_THT:C_Rect_L7.2mm_W2.5mm_P5.00mm"
const FILM_WIDE = "Capacitor_THT:C_Rect_L7.2mm_W4.5mm_P5.00mm"

/**
 * The three span fixtures, whose offending figure is COMPUTED from the family's
 * own recorded bound and never stored anywhere.
 *
 * WHY THEY ARE BUILT RATHER THAN READ, and this is a correction: these three
 * were static `.dump` files, which baked the derived row into the fixture
 * (`AT 17,1`, `AT 5,1`, `AT 4,1`) while this directory's provenance claimed no
 * span figure appeared in any fixture. The claim was false and the files are
 * gone. The brief's own instruction is what is implemented here: *"the fixture
 * names a footprint, the test reads the bound through `leadSpanFor` and
 * constructs the offending span from it, so a datasheet revision moves the
 * fixture with the module rather than stranding it."*
 *
 * `span-above-reach` NAMES A FILM CAPACITOR AND NOT THE RESISTOR, and that is
 * forced rather than chosen: the resistor's own `maxSpanHoles` IS
 * `TOOL_MAX_SPAN_HOLES`, so no span on it can separate `HC5` from `HC4`.
 *
 * `span-below-minimum` NAMES THE WIDE FILM CAPACITOR FOR THE MIRRORED REASON,
 * and it named the resistor until 2026-10-13. `lead-span.ts` now derives an
 * axial family's floor from the mounting the owner actually uses - stood on end,
 * where the body is not between the holes - so the DIN0207's `minSpanHoles` is
 * `TOOL_MIN_SPAN_HOLES`, and no span on it can separate `HC9` from `HC4` either.
 * `spanFixture`'s own `offends` guard CAUGHT THAT rather than letting the
 * fixture go quiet: the derived span fell to 1 hole, below the tool's floor, and
 * the fixture refused by name. The WIMA FKP2 is the one remaining recorded
 * two-lead family whose floor is strictly above the tool's - it cannot be formed
 * at all, so both its bounds are its footprint's own 3 holes.
 */
const SPAN_FIXTURES: Readonly<
  Record<
    string,
    {
      readonly ref: string
      readonly dumpType: string
      readonly footprint: string
      readonly importType: string
      /** The second lead's row, derived. Row 1 holds the first, so the span is this minus 0. */
      readonly pin2Row: (span: LeadSpan) => number
    }
  >
> = {
  "span-above-tool-range": {
    ref: "R1",
    dumpType: "RESISTOR",
    footprint: RESISTOR,
    importType: "RESISTOR4",
    // One hole past the tool's own ceiling, read from the tool's constant.
    pin2Row: () => 1 + TOOL_MAX_SPAN_HOLES,
  },
  "span-above-reach": {
    ref: "C1",
    dumpType: "CAP_FILM",
    footprint: FILM,
    importType: "CAP_FILM2",
    // One hole past the family's reach, and still inside the tool's range.
    pin2Row: (span) => 1 + span.maxSpanHoles,
  },
  "span-below-minimum": {
    ref: "C2",
    dumpType: "CAP_FILM_WIDE",
    footprint: FILM_WIDE,
    importType: "CAP_FILM_WIDE2",
    // One hole under the family's own minimum, and still at or above the tool's.
    pin2Row: (span) => span.minSpanHoles - 1,
  },
}

/** A one-part board whose two leads sit a derived number of holes apart. */
function spanFixture(name: string): {
  readonly dump: string
  readonly netlist: string
  readonly footprints: ReadonlyMap<string, string>
} {
  const entry = SPAN_FIXTURES[name]
  if (entry === undefined) throw new Error(`"${name}" is not a span fixture`)
  const bound = leadSpanFor(entry.footprint)
  const pin2Row = entry.pin2Row(bound)
  const span = pin2Row - 1 + 1
  // THE CONSTRUCTED SPAN MUST ACTUALLY OFFEND, asserted here rather than
  // assumed: a datasheet revision that moved a bound such that the derived
  // span no longer broke its constraint would otherwise leave a fixture that
  // quietly tests nothing, which is the shape of defect this suite exists
  // against.
  const offends =
    name === "span-above-tool-range"
      ? span > TOOL_MAX_SPAN_HOLES
      : name === "span-above-reach"
        ? span > bound.maxSpanHoles && span <= TOOL_MAX_SPAN_HOLES
        : span < bound.minSpanHoles && span >= TOOL_MIN_SPAN_HOLES
  if (!offends) {
    throw new Error(
      `fixture "${name}" no longer offends the constraint it exists for: the span derived from ` +
        `${entry.footprint}'s recorded bound [${bound.minSpanHoles}, ${bound.maxSpanHoles}] is ` +
        `${span} holes, against the tool's [${TOOL_MIN_SPAN_HOLES}, ${TOOL_MAX_SPAN_HOLES}].\n` +
        "A datasheet revision has moved the bound far enough that this fixture tests nothing. " +
        "Re-derive the offending span in SPAN_FIXTURES rather than hard-coding one.",
    )
  }
  return {
    dump: [
      `GRID ${pin2Row + 4} 10`,
      `BOUNDS 1,1 ${pin2Row},1`,
      "VERO_TRACKS 1",
      "VERTICAL_STRIPS 0",
      "CUT_STATE COMPUTED",
      `PART ${entry.ref} ${entry.dumpType} 10K AT 1,1 SPAN 1 DIRECTION N`,
      `PIN ${entry.ref} 1 AT 1,1`,
      `PIN ${entry.ref} 2 AT ${pin2Row},1`,
      `NODE 1 NAME a ${entry.ref}.1`,
      `NODE 2 NAME b ${entry.ref}.2`,
      "",
    ].join("\n"),
    netlist: [
      "( { EESchema Netlist Version 1.1 created  2026-10-11T00:00:00 }",
      ` ( /${entry.ref} ${entry.importType}  ${entry.ref} 10K`,
      "  (    1 a )",
      "  (    2 b )",
      " )",
      ")",
      "*",
      "",
    ].join("\n"),
    footprints: new Map([[entry.ref, entry.footprint]]),
  }
}

/** Build a `CheckInput` from a fixture, optionally rewriting its dump text. */
export function inputFor(
  name: string,
  rewrite: (text: string) => string = (text) => text,
): CheckInput {
  if (SPAN_FIXTURES[name] !== undefined) return spanInput(name, rewrite)
  const dumpText = rewrite(read(name, "dump"))
  const status = Number(read(name, "status").trim())
  if (!Number.isInteger(status)) {
    throw new Error(`${name}.status must be an integer exit code, got "${status}"`)
  }
  const rules = loadRules()
  return {
    // Both from THE SAME string, so the two can never describe different boards.
    dumpText,
    dump: parseBoardDump(dumpText),
    reference: referenceNetsFromExport(read(name, "netlist")),
    footprints: footprintsOf(name),
    checkReport: parseCheckReport({ status, output: read(name, "report") }),
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
    patterns: INJECTED_PATTERNS,
    spans: INJECTED_SPANS,
  }
}

/**
 * A board placing one part with a caller-supplied synthetic pad field, for the
 * tie-break refusal.
 *
 * **THE BOARD HAS EXACTLY AS MANY PINS AS THE FOOTPRINT HAS PADS**, and that
 * matters: this helper first reused the DIP board, whose sixteen `PIN` lines
 * against four pads made `HC10` refuse with *"16 is not a pad of ..."* instead.
 * A mutation run caught it - the refusal still named the footprint, so an
 * assertion anchored on the name alone passed for the wrong reason. The board is
 * built here so the only thing wrong with it is the pad geometry under test.
 *
 * `classifyPads` derives the classification from the pads, as it does for the
 * ring, so the footprint is a square because its coordinates are square.
 */
export function squareFootprintInput(
  footprint: string,
  pads: readonly PadPosition[],
): CheckInput {
  const refs = pads.map((pad) => pad.pad)
  const dumpText = [
    "GRID 6 6",
    "BOUNDS 1,1 2,2",
    "VERO_TRACKS 1",
    "VERTICAL_STRIPS 0",
    "CUT_STATE COMPUTED",
    "PART U1 DIP4 SQ AT 1,1 SPAN 2 DIRECTION W",
    // Two pins per strip, one strip per footprint row under either reading -
    // which is the point: the pin holes cannot settle the tie either.
    ...refs.map((ref, index) => `PIN U1 ${ref} AT ${1 + Math.floor(index / 2)},${1 + (index % 2)}`),
    `NODE 1 NAME a ${refs.slice(0, 2).map((ref) => `U1.${ref}`).join(" ")}`,
    `NODE 2 NAME b ${refs.slice(2).map((ref) => `U1.${ref}`).join(" ")}`,
    "",
  ].join("\n")
  const netlist = [
    "( { EESchema Netlist Version 1.1 created  2026-10-11T00:00:00 }",
    " ( /U1 DIP4  U1 SQ",
    ...refs.map((ref, index) => `  (    ${ref} ${index < 2 ? "a" : "b"} )`),
    " )",
    ")",
    "*",
    "",
  ].join("\n")
  const rules = loadRules()
  const base: CheckInput = {
    dumpText,
    dump: parseBoardDump(dumpText),
    reference: referenceNetsFromExport(netlist),
    footprints: new Map([["U1", footprint]]),
    checkReport: parseCheckReport({ status: 0, output: read("healthy", "report") }),
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
  }
  const pattern: PinPattern = {
    footprint,
    pads,
    source: {
      file: "tests/stripboard/grade-fixtures.ts - SYNTHETIC, not a KiCad footprint",
      version: "none",
      padCount: pads.length,
      excludedPads: [],
    },
    classification: classifyPads(pads),
    accommodation: { kind: "as-moulded" },
    basis: "SYNTHETIC: a square pad field, which has no longer-row axis.",
  }
  return {
    ...base,
    footprints: new Map([["U1", footprint]]),
    // The pattern REPLACES the recorded one for this key. See the note on
    // INJECTED_PATTERNS: `admitPattern` reads the module-level LEAD_SPANS
    // directly, so the key has to be a footprint that is really in it, or the
    // footprint half refuses on the missing-span guard and the placement half -
    // the thing under test - is never reached. That is finding 5 of the review,
    // demonstrated.
    patterns: new Map([...INJECTED_PATTERNS, [footprint, pattern]]),
    spans: INJECTED_SPANS,
  }
}

/** A span fixture's `CheckInput`, over the constructed board rather than a file. */
function spanInput(name: string, rewrite: (text: string) => string): CheckInput {
  const built = spanFixture(name)
  const dumpText = rewrite(built.dump)
  const rules = loadRules()
  return {
    dumpText,
    dump: parseBoardDump(dumpText),
    reference: referenceNetsFromExport(built.netlist),
    footprints: built.footprints,
    checkReport: parseCheckReport({ status: 0, output: read("healthy", "report") }),
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
    patterns: INJECTED_PATTERNS,
    spans: INJECTED_SPANS,
  }
}

/** The board on which all ten hold. */
export function healthyInput(): CheckInput {
  return inputFor("healthy")
}

/** One negative fixture, by the name the V4 table uses. */
export function negativeInput(name: string): CheckInput {
  return inputFor(name)
}

/** The healthy board with its `BOUNDS` line removed - `HC6` must refuse, not substitute. */
export function inputWithoutBounds(): CheckInput {
  return inputFor("healthy", (text) =>
    text.split("\n").filter((line) => !line.startsWith("BOUNDS ")).join("\n"),
  )
}

/**
 * A one-part board carrying a named footprint, so a footprint with no recorded
 * span or pattern refuses BY NAME.
 */
export function inputWithFootprint(footprint: string): CheckInput {
  const name = "span-below-minimum"
  const entry = SPAN_FIXTURES[name]
  if (entry === undefined) throw new Error(`"${name}" is not a span fixture`)
  // Keyed on the fixture's OWN ref rather than a repeated literal: the fixture
  // changed designator once already when it changed family, and a second copy
  // of the ref would have left this helper mapping a footprint onto nothing,
  // which reads as "no footprint recorded" rather than as a broken helper.
  return { ...inputFor(name), footprints: new Map([[entry.ref, footprint]]) }
}

/** The healthy board with a wide canvas and a small `BOUNDS`: `HC6` must still hold. */
export function inputWithGridAndBounds(options: {
  readonly grid: readonly [number, number]
  readonly bounds: readonly [number, number, number, number]
}): CheckInput {
  const [rows, cols] = options.grid
  const [minRow, minCol, maxRow, maxCol] = options.bounds
  return inputFor("healthy", (text) =>
    text
      .split("\n")
      .map((line) =>
        line.startsWith("GRID ")
          ? `GRID ${rows} ${cols}`
          : line.startsWith("BOUNDS ")
            ? `BOUNDS ${minRow},${minCol} ${maxRow},${maxCol}`
            : line,
      )
      .join("\n"),
  )
}

/**
 * A board with a required feature of the given kind outside `BOUNDS`.
 *
 * The two cases are deliberately different in outcome: the WIRE end is also
 * past the stock, so `HC6` fails naming it; the SOLDER hole is outside `BOUNDS`
 * but INSIDE the stock, so `HC6` holds and the detail still reports the
 * discrepancy. A pair where both failed would not show that the reporting is
 * separate from the verdict.
 */
export function inputWithFeatureOutsideBounds(options: {
  readonly kind: "wire" | "solder"
}): CheckInput {
  return inputFor(
    options.kind === "wire" ? "over-stock-wire-outside-bounds" : "solder-outside-bounds",
  )
}

/**
 * The DIP-16 mounted the way the owner describes: its rows ACROSS the strips,
 * one pin from each row per strip, with the cut down the middle.
 *
 * NAMED FOR WHAT IT RETURNS. It was `...AlongTheStrips`, which is the opposite
 * of its own fixture and of its docstring - the inverted word that blocked this
 * task for a long stretch, left sitting in an identifier.
 */
export function inputWithMultiRowPartAcrossTheStrips(): CheckInput {
  return inputFor("rows-across-the-strips")
}

/** The same board read under the other strip axis. */
export function withStripAxisFlipped(input: CheckInput): CheckInput {
  const flipped = input.dumpText.replace(
    /^VERTICAL_STRIPS ([01])$/m,
    (_match, value: string) => `VERTICAL_STRIPS ${value === "0" ? "1" : "0"}`,
  )
  if (flipped === input.dumpText) {
    throw new Error("withStripAxisFlipped found no VERTICAL_STRIPS line to flip")
  }
  return { ...input, dumpText: flipped, dump: parseBoardDump(flipped) }
}

/**
 * A throwaway `perfboard.json` declaring a stock, written to a temp directory.
 *
 * It exists because **no board in this repository declares one** - all eleven
 * carry `circuit`, `export`, `vrt` and sometimes the `sch`/`netlist` pair - so
 * `stockFor`'s board branch has nothing in the tree to exercise it.
 *
 * Its directory is registered with `../support/temp-scratch.ts`, so
 * `grade.test.ts` arms `afterAll(cleanUpTempScratch)` - it left **10**
 * directories in `TMPDIR` a run.
 */
export function fixtureDeclaration(fields: Record<string, unknown>): string {
  const file = path.join(freshTempScratch("stripboard-stock-"), "perfboard.json")
  fs.writeFileSync(file, JSON.stringify({ circuit: "./c.ts", export: "c", vrt: "c.vrt", ...fields }))
  return file
}
