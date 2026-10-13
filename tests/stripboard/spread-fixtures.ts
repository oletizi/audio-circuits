/**
 * The board `./spread.test.ts` reads, and the reference netlist that goes with
 * it: one strip carrying three nets' pins, two strips carrying one net's each,
 * and five empty strips.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper a test file imports, following
 * `./climb-fixtures.ts` and six others.
 *
 * **IT IS A SEPARATE BOARD FROM `./climb-fixtures.ts`'s `BASE_DUMP` BECAUSE
 * THAT BOARD HAS NO CROWDED STRIP AT ALL.** Under `VERTICAL_STRIPS 1` its two
 * nets hold one column each - `left` at columns 1 and 2, `right` at 6 and 7 -
 * so no strip there carries two nets' pins and `spreadSourceStrips` correctly
 * offers nothing. `./moves.test.ts` asserts exactly that about it, and this
 * board is what exercises the kind.
 *
 * **THE LAYOUT, AND EVERY FACT THE TESTS ASSERT IS DERIVED FROM IT BY HAND:**
 * eight rows by twelve columns, strips running along the ROWS
 * (`VERTICAL_STRIPS 0`), four two-lead parts and four nets.
 *
 * ```
 *          col 0  1  2  3  4  5
 *   row 0   .  .  .  .  .  .        <- empty
 *   row 1  R1 R1  .  . R2 R2        <- THE CROWDED STRIP: three nets
 *   row 2   .  .  .  .  .  .        <- empty
 *   row 3  R3 R3  .  .  .  .        <- one net's pins only
 *   row 4   .  .  .  .  .  .        <- empty
 *   row 5   .  .  .  .  .  .        <- empty
 *   row 6  R4 R4  .  .  .  .        <- one net's pins only
 *   row 7   .  .  .  .  .  .        <- empty
 * ```
 *
 * Nets: `shared` joins `R1.1` (row 1) to `R3.1` (row 3); `crowd` joins `R1.2`
 * to `R2.1`, BOTH on row 1; `far` joins `R2.2` (row 1) to `R4.1` (row 6);
 * `lone` joins `R3.2` (row 3) to `R4.2` (row 6).
 *
 * **THE FOUR NETS ARE FOUR DIFFERENT ANSWERS, which is why there are four:**
 *
 *   - `shared` has one crowded strip (row 1, where `R2` carries two other nets'
 *     pins) and one PRIVATE strip (row 3, where only `R3` sits) - so exactly one
 *     of its two strips may be spread off;
 *   - `crowd` sits entirely on row 1 and the only parts there are its own, so
 *     the strip is not crowded ONCE ITS OWN MOVERS ARE DISCOUNTED - vacating it
 *     would empty the strip, `S_occ` would fall as the target's rose, and the
 *     identity's `-1` would cancel. It is also the whole-net case, which is a
 *     `gather` and not a spread;
 *   - `far` is `shared`'s mirror: crowded source on row 1, private strip on
 *     row 6, and the wire it needs is the longer one;
 *   - `lone` spans two PRIVATE strips, so no spread is proposable for it at all.
 *     A net like this needs a wire and nothing else, which is the completion
 *     pass's business rather than this kind's.
 */
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import type { ReferenceNets } from "../../tools/stripboard/equivalence.ts"
import { occupancyOf, type Occupancy } from "../../tools/stripboard/seed-geometry.ts"
import type { BoardDump } from "../../tools/guide/dump.ts"

/** The dump text, exactly as `--dump-board` would print this board. */
export const CROWDED_TEXT = [
  "GRID 8 12",
  "BOUNDS 1,0 6,5",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 1,0 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 10K AT 1,4 SPAN 2 DIRECTION W",
  "PART R3 RESISTOR 10K AT 3,0 SPAN 2 DIRECTION W",
  "PART R4 RESISTOR 10K AT 6,0 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 1,0",
  "PIN R1 2 AT 1,1",
  "PIN R2 1 AT 1,4",
  "PIN R2 2 AT 1,5",
  "PIN R3 1 AT 3,0",
  "PIN R3 2 AT 3,1",
  "PIN R4 1 AT 6,0",
  "PIN R4 2 AT 6,1",
  "NODE 1 NAME shared R1.1 R3.1",
  "NODE 2 NAME crowd R1.2 R2.1",
  "NODE 3 NAME far R2.2 R4.1",
  "NODE 4 NAME lone R3.2 R4.2",
  "",
].join("\n")

/**
 * The parsed board, through `boardGeometry` and not the bare parser - which is
 * the correction Tasks 3, 4, 5, 11 and 12 each needed: a parsed dump skips every
 * geometry refusal, so text fed through the bare reader never exercises the
 * contract `HC8` is stated in.
 */
export const CROWDED: BoardDump = boardGeometry(CROWDED_TEXT)

/** Its part geometry, read once off a board nobody has turned a part on. */
export const CROWDED_OCC: Occupancy = occupancyOf(CROWDED)

/**
 * The reference netlist for it, **in the netlist's own order**, which is what
 * the enumeration's net order is asserted against: a `Map` iterates in
 * INSERTION order and `referenceNetsFromExport` fills one in the order the
 * export lists its nets.
 */
export const CROWDED_NETS: ReferenceNets = new Map([
  ["shared", ["R1.1", "R3.1"]],
  ["crowd", ["R1.2", "R2.1"]],
  ["far", ["R2.2", "R4.1"]],
  ["lone", ["R3.2", "R4.2"]],
])
