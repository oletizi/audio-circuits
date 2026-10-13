/**
 * What `tests/stripboard/rank.test.ts` is checked against: a minimal `Score`
 * factory, two minimal dump builders, and one reference netlist.
 *
 * ITS OWN MODULE following `./score-fixtures.ts` and `./extent-fixtures.ts`'s
 * own precedent: a hand-built fixture shared by several assertions is one
 * thing to keep correct rather than several copies that could drift.
 *
 * `score()` BUILDS A `Score` THAT STATES NOTHING FALSE BUT PROVES NOTHING
 * EITHER - every field defaults to zero and the caller overrides only the
 * ones the test is about (`cuts`, here). It never imports `tools/stripboard/
 * score.ts`'s own scorer, so a test using it is a test of the RANKER against
 * a hand-built number, never the ranker against its own arithmetic.
 *
 * `dumpWithBounds` BUILDS THE SMALLEST DUMP `parseBoardDump` ACCEPTS WITH A
 * GIVEN `BOUNDS` RECT: one placed part with its two leads at the rect's two
 * corners, so `pinBoundingBoxWirelength` has something to read as well as
 * `occupiedArea`. `dumpWithoutBounds` omits the `BOUNDS` line entirely,
 * proving `occupiedArea`'s refusal reaches a dump that was never captured
 * with one.
 */
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import type { Score } from "../../tools/stripboard/score.ts"

/** A `Score` with every field zero except the ones given. Test-only: this is not `scoreDump`. */
export function score(overrides: Partial<Score> = {}): Score {
  return {
    cuts: 0,
    necessaryCuts: 0,
    wires: 0,
    solder: 0,
    objective: 0,
    netCount: 0,
    pinCount: 0,
    occupied: 0,
    joins: 0,
    clustering: 0,
    ...overrides,
  }
}

/**
 * A dump whose `BOUNDS` is exactly `minRow,minCol maxRow,maxCol`, with one
 * placed part (`R1`) whose two leads sit at the rect's two corners.
 */
export function dumpWithBounds(
  minRow: number,
  minCol: number,
  maxRow: number,
  maxCol: number,
): BoardDump {
  const text = [
    `GRID ${maxRow + 1} ${maxCol + 1}`,
    `BOUNDS ${minRow},${minCol} ${maxRow},${maxCol}`,
    "VERTICAL_STRIPS 0",
    "CUT_STATE COMPUTED",
    `PART R1 RESISTOR 1k AT ${minRow},${minCol} SPAN 1`,
    `PIN R1 1 AT ${minRow},${minCol}`,
    `PIN R1 2 AT ${maxRow},${maxCol}`,
    "",
  ].join("\n")
  return parseBoardDump(text)
}

/** The smallest dump `parseBoardDump` accepts with no `BOUNDS` line at all - nothing placed. */
export function dumpWithoutBounds(): BoardDump {
  return parseBoardDump(["GRID 5 5", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED", ""].join("\n"))
}

/** One net, `R1`'s two leads - the pins `dumpWithBounds` places. */
export const REFERENCE: ReferenceNets = new Map([["n1", ["R1.1", "R1.2"]]])
