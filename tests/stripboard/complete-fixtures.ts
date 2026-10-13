/**
 * The boards and the inputs `tests/stripboard/complete.test.ts` reads: five
 * dumps - a net split across two strips, a net split by a cut on ONE strip, a
 * net too far apart for any wire to reach, a net whose second pin is an expanded
 * PAD, and a joined board that does not fit the stock - plus the run directory,
 * the netlist file and the handover the pass takes.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper, following `./climb-fixtures.ts`,
 * `./score-fixtures.ts` and the four others. The assertions are in the test file
 * and the material is here.
 *
 * **IT REUSES `./climb-fixtures.ts`'s HARNESS AND DEFINES ITS OWN BOARDS.** The
 * scripted spawn, the netlist, the reference, the footprints, the targets and
 * the committed-rules fixture are all that one's, so there is one injected
 * spawn in this suite and one set of claims about what it does and does not
 * simulate. What is new is the dumps, because the completion pass needs a board
 * with an OPEN net and `./climb-boards.ts`'s two are both complete.
 *
 * **VERTICAL STRIPS, FOR `./climb-boards.ts`'s OWN FORCED REASON** - under
 * horizontal strips a two-lead part laid along a row shorts its own two nets,
 * and `occupancyOf` refuses a part facing `N` or `S`. So the strips are the
 * COLUMNS here, and a wire ACROSS the strips runs along a row.
 *
 * **THE SPAWN DOES NOT SIMULATE A GESTURE, which bounds what these tests
 * assert.** `./climb-fixtures.ts` states it: the dump a candidate reports comes
 * from a script keyed by evaluation index, not from the wire the pass applied.
 * So what is asserted here is the pass's OBJECTIVE and its BOOKKEEPING - which
 * candidates it proposes, which it accepts, what it reports about a net it could
 * not close - and never the fork's geometry, which
 * `tests/stripboard/seed-geometry.test.ts` holds against the real binary. In
 * particular the candidate dumps below name their wire `W1` while the pass asks
 * the fork for `Wire2`: the script answers by index and the name never meets the
 * gesture, and a test that asserted the name would be asserting the script.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"
import type { CompletionInput } from "../../tools/stripboard/complete.ts"
import type { SeedStart } from "../../tools/stripboard/seed.ts"
import {
  BASE_DUMP,
  FOOTPRINTS,
  NETLIST,
  REFERENCE,
  TARGETS,
  rulesWithoutWorseAcceptance,
} from "./climb-fixtures.ts"

const LOW_BOOST_DECLARATION = path.join(
  import.meta.dir,
  "..",
  "..",
  "boards",
  "pultec-low-boost",
  "perfboard.json",
)

/**
 * `BASE_DUMP` WITHOUT `W1`: the net `left` is split across strips 1 and 2 with
 * nothing joining them, and `right` is still whole over `W2`.
 *
 * So `--check` reports exactly one net incomplete, the net's pins fall into two
 * copper components, and the one join it needs is a wire across the strips. It
 * is `BASE_DUMP` with a line removed rather than a board of its own, because
 * the pass's candidate is then `BASE_DUMP` itself - the board the fixtures
 * already grade as passing all ten constraints - so "the wire closed the net"
 * is a step between two boards whose grades are both known.
 */
export const SPLIT_DUMP = BASE_DUMP.replace("WIRE W1 AT 3,1 ENDS 3,1,0,0 3,2,0,0\n", "")

/**
 * Two parts twenty strips apart, so NEITHER net can be reached by one wire.
 *
 * `left` is `R1.1` on strip 1 and `R2.1` on strip 20 - a span of twenty holes
 * against the fork's sixteen - and `right` is `R1.2` on strip 6 and `R2.2` on
 * strip 25, the same twenty. The two parts share no row, so there is no
 * along-strip pair either. It exists so the generator has a board where it must
 * propose NOTHING and report why, which is the result this pass exists to be
 * able to state: on `BASE_DUMP` and `SPLIT_DUMP` every pair is reachable, so a
 * shortfall branch deleted outright would leave both their plans unchanged.
 *
 * The occupied extent is strips 1 to 25, inside the 27 the rules declare, so
 * `HC6` holds and nothing refuses the board before the plan is read.
 */
export const FAR_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,25",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,20 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,20",
  "PIN R2 2 AT 7,25",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "",
].join("\n")

/**
 * A net split ACROSS A CUT ON ONE STRIP: both of `left`'s pins sit in column 1
 * and a cut severs that column between rows 4 and 5.
 *
 * It is the case the `--import`-placed board produces for real - every part
 * packed into rows 0 to 4, every open net's components on a single strip - and
 * the only board here on which `wireAlong` can be proposed at all. Without it
 * that whole search is unreached by any test, which is how the case was missed
 * in the first place: the generator shipped with only `wireBridge`, planned not
 * one wire on the import arm, and nothing in the suite said so.
 *
 * **THE CUT IS PLACED BY HAND AND NO AUTOFILL WOULD PUT IT THERE**, because the
 * two holes it separates are on the same net. That is stated rather than hidden:
 * the board is a fixture for the GENERATOR, which reads copper components and
 * reference pins and knows nothing about why a cut exists, and the real boards
 * reach the same component shape by a cut that separates two DIFFERENT nets
 * sharing a strip.
 *
 * `right` is `R1.2` and `R2.2`, both in column 6 with no cut, so it is one
 * component and whole.
 */
export const CUT_SPLIT_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "CUT 4,1,1 5,1,0",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,1 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,1",
  "PIN R2 2 AT 7,6",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "",
].join("\n")

/**
 * `SPLIT_DUMP` with `R2`'s two terminals as EXPANDED PADS rather than a part.
 *
 * VeroRoute breaks an off-board `PADS<n>` component into one-hole pads with
 * board names of their own, so the netlist's `R2.1` is the dump's `R2_1.1` and
 * the `PAD` line's `FROM R2.1` field is the only record of which reference pin
 * it is. **On the real low-boost board ten of twenty-seven pins are pads** - the
 * level pot's three and the rotary switch's seven - so this is the common case
 * and not an exotic one, and a generator reading pins by `PIN` name alone loses
 * every one of them. It exists because a mutation run proved that gap: with
 * `referencePinHoles` swapped for `pinHoles`, every other test in the suite
 * still passed.
 *
 * `left` is `R1.1` in column 1 and `R2.1` in column 2 - two components, one join
 * - exactly as on `SPLIT_DUMP`, so the only difference between the two boards is
 * how the second pin is named.
 */
export const PAD_SPLIT_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,7",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PAD R2_1 22K AT 7,2 FROM R2.1",
  "PAD R2_2 22K AT 7,7 FROM R2.2",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2_1 1 AT 7,2",
  "PIN R2_2 1 AT 7,7",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0",
  "",
].join("\n")

/**
 * `BASE_DUMP` with `R2` dropped to row 45, so the candidate that closes `left`
 * DOES NOT FIT THE STOCK: `HC6` fails on it and held on the board the wires
 * were applied to.
 *
 * It is the board the no-regression test needs. `left` is whole on it - both
 * strips are joined by the two wires - so the candidate really does close the
 * net, and the only reason to reject it is the constraint it broke. A candidate
 * that was merely worse would prove nothing about clause 1.
 */
export const TALL_JOINED_DUMP = BASE_DUMP.replace(
  "PART R2 RESISTOR 22K AT 7,2 SPAN 6 DIRECTION W\n",
  "PART R2 RESISTOR 22K AT 45,2 SPAN 6 DIRECTION W\n",
)
  .replace("PIN R2 1 AT 7,2", "PIN R2 1 AT 45,2")
  .replace("PIN R2 2 AT 7,7", "PIN R2 2 AT 45,7")
  .replace("WIRE W1 AT 3,1 ENDS 3,1,0,0 3,2,0,0", "WIRE W1 AT 30,1 ENDS 30,1,0,0 30,2,0,0")
  .replace("WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0", "WIRE W2 AT 30,6 ENDS 30,6,0,0 30,7,0,0")
  .replace("GRID 12 40", "GRID 60 40")
  .replace("BOUNDS 2,1 7,7", "BOUNDS 2,1 45,7")

/** `--check` on `SPLIT_DUMP`: `left` incomplete, exit 1 - which is `HC1`'s own input. */
export const SPLIT_REPORT = [
  "Layout state",
  "left incomplete",
  "right complete",
  "Cuts: 0",
  "",
].join("\n")

/** `--check` on `FAR_DUMP`: both nets incomplete, exit 1. */
export const FAR_REPORT = [
  "Layout state",
  "left incomplete",
  "right incomplete",
  "Cuts: 0",
  "",
].join("\n")

/** `--check` on a board whose every net is whole, exit 0. */
export const WHOLE_REPORT = [
  "Layout state",
  "left complete",
  "right complete",
  "Cuts: 0",
  "",
].join("\n")

export const SPLIT = boardGeometry(SPLIT_DUMP)
export const FAR = boardGeometry(FAR_DUMP)
export const CUT_SPLIT = boardGeometry(CUT_SPLIT_DUMP)
export const PAD_SPLIT = boardGeometry(PAD_SPLIT_DUMP)

/**
 * The geometry of each starting board, read from its own dump.
 *
 * Both boards turn nothing, so `occupancyOf` can read them - which is exactly
 * what it cannot do on a board a real arm produced, and why
 * `CompletionResult.best` carries an occupancy rather than leaving a consumer
 * to derive one.
 */
export const SPLIT_OCC = occupancyOf(SPLIT)
export const FAR_OCC = occupancyOf(FAR)
export const CUT_SPLIT_OCC = occupancyOf(CUT_SPLIT)
export const PAD_SPLIT_OCC = occupancyOf(PAD_SPLIT)

/** A fresh run directory, so no two passes in one suite share a scratch file. */
export function freshPassDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-complete-"))
}

/** The start board, written for real so a stray write to it is visible in the bytes. */
export function startBoard(runDir: string, text: string): string {
  const file = path.join(runDir, "pass-start.vrt")
  fs.writeFileSync(file, text)
  return file
}

/** The netlist, written for real because `--check` is handed its path. */
export function netlistFile(runDir: string): string {
  const file = path.join(runDir, "reference.net")
  fs.writeFileSync(file, NETLIST)
  return file
}

/** One completion pass's input, over a fresh run directory. */
export function completionInput(runDir: string): CompletionInput {
  const rules = rulesWithoutWorseAcceptance()
  return {
    runDir,
    netlist: netlistFile(runDir),
    targets: TARGETS,
    reference: REFERENCE,
    footprints: FOOTPRINTS,
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
  }
}

/** The handover the pass takes: an unpainted board and the geometry that goes with it. */
export function passStart(runDir: string, text: string, occupancy: SeedStart["occupancy"]): SeedStart {
  return { board: startBoard(runDir, text), occupancy }
}
