/**
 * THE BOARDS: every dump text, netlist and `--check` report the climb tests are
 * driven over, and the geometry derived from them.
 *
 * **SPLIT FROM `./climb-fixtures.ts` FOR THE LINE CEILING, AT THE SEAM THAT FILE
 * ALREADY HAD**: this one is the MATERIAL - board texts and the parses of them -
 * and that one is the HARNESS: the injected spawn, the rules, the targets, the
 * hand-built `Evaluation` and the climb inputs. `./climb-fixtures.ts` re-exports
 * everything here, so `./climb.test.ts` and `./moves.test.ts` import one module
 * exactly as before and no test's import list changed with the split.
 *
 * Every claim about WHY a board is shaped as it is lives on that board, and the
 * two general ones live in `./climb-fixtures.ts`'s module comment: why the
 * strips are vertical, and that the spawn does not simulate a gesture.
 */
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { occupancyOf } from "../../tools/stripboard/seed-geometry.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"

/**
 * The start: two resistors on four strips, each net's two holes on two
 * different strips and a wire bridging each pair.
 *
 * `R1` spans columns 1-6 at row 2 and `R2` columns 2-7 at row 7, so net `left`
 * sits on strips 1 and 2 and net `right` on strips 6 and 7, and `W1` and `W2`
 * join each pair. `F = 0 + 0.25*2 + 0 = 0.5` at the committed weights, with
 * `C = 0` because no strip carries two nets.
 *
 * The parts are at rows 2 and 7 rather than at the top edge because
 * `Board::RotateComps` turns about the rect's centre: a `1 x 6` part's centring
 * shift is `trunc((1 - 6) / 2) = -2` rows, so a part at row 0 or 1 would turn
 * to a negative row and the verb would refuse - and no `rotate` move would be
 * enumerated at all. The tempting summary *"every part is in row 0"* is false
 * in detail on the real boards too, so there is no row-0 case anywhere.
 */
export const BASE_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,7",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,2 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,2",
  "PIN R2 2 AT 7,7",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "WIRE W1 AT 3,1 ENDS 3,1,0,0 3,2,0,0",
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0",
  "",
].join("\n")

/**
 * The same circuit with `R2` aligned under `R1`, so each net sits on ONE strip
 * and neither wire is needed: `F = 0`.
 *
 * It is the improved candidate the scripted climb reaches, and it is a
 * different board rather than the same board with a line deleted - both nets'
 * holes move - so a test comparing the two is comparing two layouts.
 */
export const BETTER_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
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
 * One part at the TOP EDGE, which is the board on which no turn is takeable.
 *
 * `turnedRect` on a `1 x 6` rect at row 0 lands it at row -2, which pans the
 * board, so `--rotate` refuses - the same arithmetic that forces the two boards
 * above to put their parts at interior rows. It exists so the enumeration's
 * `turnsTakeable` guard has a board where it must say NO: on `BASE_DUMP` and
 * `BETTER_DUMP` every part turns, so a guard deleted outright would leave both
 * their rotate counts unchanged and no test would notice. A mutation run proved
 * that gap rather than it being foreseen.
 *
 * It is not graded and nothing scores it; `moves.test.ts` reads its enumeration
 * only.
 */
export const TOP_EDGE_DUMP = [
  "GRID 12 40",
  "BOUNDS 0,1 0,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,1 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 0,1",
  "PIN R1 2 AT 0,6",
  "NODE 1 NAME left R1.1",
  "NODE 2 NAME right R1.2",
  "",
].join("\n")

/**
 * `BASE_DUMP` with one REDUNDANT wire added, so a third distinct `F` exists
 * without changing connectivity.
 *
 * `W3` joins `4,1` to `4,2` - strips 1 and 2, which `W1` already joins - so the
 * copper partition is identical to `BASE_DUMP`'s and `HC8` holds exactly as it
 * does there. Only `F` moves: three `WIRE` lines give `0 + 0.25*3 + 0 = 0.75`.
 *
 * It exists for the sibling-order test, which needs three boards whose `F`
 * strictly decreases while one of them repairs a constraint.
 */
export const BASE_PLUS_WIRE_DUMP = BASE_DUMP.replace(
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0\n",
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0\nWIRE W3 AT 4,1 ENDS 4,1,0,0 4,2,0,0\n",
)

/**
 * `BETTER_DUMP` with `R2` moved down to row 45, so the board DOES NOT FIT THE
 * STOCK and its connectivity is untouched: `F = 0` and `HC6` is the constraint
 * that fails.
 *
 * Both parts still sit on strips 1 and 6 - the strips are the COLUMNS here
 * (`VERTICAL_STRIPS 1`) - so each net is whole on one strip exactly as in
 * `BETTER_DUMP`, no wire is needed and `HC8`'s partition is the same. What
 * changes is the row extent: `45 - 2 + 1 = 44` rows against the 34 the rules
 * declare, which `HC6` refuses.
 *
 * **IT EXISTS SO THE SIBLING-ORDER TEST HAS A CONSTRAINT THE ACCEPTANCE RULE'S
 * FIRST KEY IS BLIND TO.** That test needs a constraint one sibling repairs and
 * a later sibling merely inherits broken, and `HC1` can no longer serve: the
 * open-net count is the ordering's first key, so a candidate that leaves a net
 * open is rejected against an incumbent that closed it - deliberately, and not
 * because a regression was mis-measured. `HC6` is a fact about the extent, the
 * scripted `--check` reports every net complete on all three boards, and the
 * key is therefore constant across the round.
 */
export const TALL_DUMP = [
  "GRID 60 40",
  "BOUNDS 2,1 45,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 45,1 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 45,1",
  "PIN R2 2 AT 45,6",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "",
].join("\n")

/**
 * `TALL_DUMP` with three REDUNDANT wires, so the oversized board has a third
 * distinct `F` without changing connectivity: `0 + 0.25*3 + 0 = 0.75`.
 *
 * Every wire joins two strips that carry no pin at all - 2 to 3, 7 to 8, 9 to
 * 10 - so none of them touches a reference net and the copper partition over
 * the pins is `TALL_DUMP`'s. The same argument `BASE_PLUS_WIRE_DUMP` makes for
 * its one wire, and the reason three are used rather than one is only that
 * `F = 0.75` is the figure the sibling-order test's script needs at its start.
 */
export const TALL_PLUS_WIRES_DUMP = TALL_DUMP.replace(
  "NODE 2 NAME right R1.2 R2.2\n",
  "NODE 2 NAME right R1.2 R2.2\n" +
    "WIRE W1 AT 3,2 ENDS 3,2,0,0 3,3,0,0\n" +
    "WIRE W2 AT 4,7 ENDS 4,7,0,0 4,8,0,0\n" +
    "WIRE W3 AT 5,9 ENDS 5,9,0,0 5,10,0,0\n",
)

/** The reference export both boards are checked against - two parts, two nets. */
export const NETLIST = [
  "( { EESchema Netlist Version 1.1 created  2026-10-11T00:00:00 }",
  " ( /R1 RESISTOR4  R1 10K",
  "  (    1 left )",
  "  (    2 right )",
  " )",
  " ( /R2 RESISTOR4  R2 22K",
  "  (    1 left )",
  "  (    2 right )",
  " )",
  ")",
  "*",
  "",
].join("\n")

/** `--check`'s output for a matching, complete board: no `Schematic delta` heading at all. */
export const REPORT = ["Layout state", "left complete", "right complete", "Cuts: 0", ""].join("\n")

const RESISTOR = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/** Both parts are fitted with the resistor footprint `grade-fixtures.ts` also names. */
export const FOOTPRINTS: ReadonlyMap<string, string> = new Map([
  ["R1", RESISTOR],
  ["R2", RESISTOR],
])

export const DUMP = boardGeometry(BASE_DUMP)
export const BETTER = boardGeometry(BETTER_DUMP)
export const TOP_EDGE = boardGeometry(TOP_EDGE_DUMP)
export const REFERENCE = referenceNetsFromExport(NETLIST)

/**
 * Each board's FIRST occupancy, read off its own dump.
 *
 * `enumerateMoves` takes a CARRIED occupancy rather than deriving one, because a
 * dump cannot describe a turned part's footprint - so a test that enumerates
 * reads the first one here exactly as `climb` does from its starting board, and
 * `occupancyOf` is the one and only way either of them gets it.
 */
export const OCC = occupancyOf(DUMP)
export const BETTER_OCC = occupancyOf(BETTER)
export const TOP_EDGE_OCC = occupancyOf(TOP_EDGE)

/**
 * `BASE_DUMP` with its cut state UNRESOLVED and a `CUT_CONFLICT` line: the board
 * `--author --op autofill` produces when a wire shorts two nets.
 *
 * **IT IS THE REAL SHAPE, taken from a real refusal.** On the constructed arm at
 * seed 3 of the import-placed low-boost board, an `add-wire` candidate put
 * `Wire1` from `5,3` to `6,3` and the paint came back
 * `CUT_STATE UNRESOLVED` with `CUT_CONFLICT 5,2,9 5,4,11` and
 * `CUT_CONFLICT 6,2,8 6,4,14` - no cut arrangement separates two nets a wire has
 * joined. `./score.ts` refuses to score such a board, and `climb` counts the
 * candidate as unscoreable rather than stopping the run.
 */
export const UNRESOLVED_DUMP = BASE_DUMP.replace(
  "CUT_STATE COMPUTED",
  "CUT_STATE UNRESOLVED\nCUT_CONFLICT 5,2,9 5,4,11",
)

/**
 * `--check`'s output for a board one of whose nets is not finished, and the
 * exit code that goes with it.
 *
 * `--check` EXITS 1 ON SUCH A BOARD, and that code is `HC1`'s own input rather
 * than a spawn failure. The dump text is unchanged, so `HC8`'s copper partition
 * still matches the netlist and `HC1` is the only constraint that fails - which
 * is what makes `best.admissibleA1 === false` attributable to one named cause.
 */
export const INCOMPLETE_REPORT = [
  "Layout state",
  "left incomplete",
  "right complete",
  "Cuts: 0",
  "",
].join(
  "\n",
)

