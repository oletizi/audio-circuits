/**
 * `V5`'s MATERIAL: three good-versus-bad layout pairs over ONE netlist, and the
 * register of what each pair is supposed to make a statistic notice.
 *
 * `V5` is *"a metric that cannot distinguish a good placer from a bad one is not
 * a metric"* (PIPELINE §10). The brief's form of the test compared the four
 * import-placed boards against the pipeline's own placement and required each
 * statistic to move by more than *"its across-board variation"*. **THAT
 * THRESHOLD IS THE PLACER'S FINGERPRINT AND NOT A PROPERTY OF STRIPBOARD**, by
 * the brief's own evidence: across the four import-placed boards `C/P` reads
 * 0.92, 0.91, 0.91 and 0.85 - a coefficient of variation near 3% that *"looks
 * like a law until low-boost arrives at 0.19 and the five-board variation jumps
 * to roughly 38%"*. Laying every part along one strip makes every pin its own
 * segment, so `C ≈ P − S_occ` on every board one placer produced; a tolerance
 * computed from that spread measures how consistent that placer is with itself.
 * So the comparison here is not four boards against four boards: it is a GOOD
 * layout against a BAD layout of the SAME netlist, which is the comparison the
 * governing sentence is actually about.
 *
 * THE PAIRS ARE THE SAME CIRCUIT THROUGHOUT - `./climb-boards.ts`'s two
 * resistors and two nets, `NETLIST` being the reference export for all of them.
 * That is what makes `netCount` and `pinCount` provably blind rather than
 * merely unchanged: holding the netlist fixed is the only way a statistic that
 * reads the circuit can be told apart from one that reads the layout.
 *
 * THE GOOD LAYOUT IS `BETTER_DUMP` AND IT IS NOT MERELY "BETTER": each net is
 * whole on one strip, so no strip carries two net-segments, no cut is needed
 * and no join has to be bought. Under the identity's sharper form -
 * `C = Σ over strips of (segments on that strip − 1)`, so **a cut exists exactly
 * where two net-segments abut on one strip** - it is the layout with no
 * abutment anywhere.
 *
 * THE THREE BAD LAYOUTS EACH SPEND A DIFFERENT TERM OF `F`, which is the reason
 * there are three rather than one: a single pair leaves whichever term it does
 * not move looking like a statistic nothing can separate. `BASE_DUMP` splits
 * both nets and buys the joins with WIRES; `BAD_SOLDER_DUMP` buys the same two
 * joins with SOLDER bridges; `BAD_CUT_DUMP` puts two net-segments on one strip
 * and pays the CUT. Together they move `C`, `W` and `B` separately, and all
 * three move `F`, `J` and `kappa`.
 *
 * NO FIGURE IN THIS FILE IS ASSERTED HERE. `./discrimination.test.ts` scores
 * every board through `scoreDumpText` and compares; the numbers quoted in the
 * comments below were read off that scorer's output and are claims about what it
 * reports, not inputs to it.
 */
import { BASE_DUMP, BETTER_DUMP } from "./climb-boards.ts"

/**
 * THE GOOD LAYOUT: `./climb-boards.ts`'s `BETTER_DUMP`, re-exported under the
 * name this file's comparisons use rather than copied.
 *
 * `R1` and `R2` both span columns 1-6 at rows 2 and 7, and the strips are the
 * COLUMNS (`VERTICAL_STRIPS 1`), so net `left` is whole on column 1 and net
 * `right` whole on column 6. Measured through `scoreDumpText`: `C = 0`,
 * `W = 0`, `B = 0`, `F = 0`, `S_occ = 2`, `J = 0`, `kappa = 0`.
 */
export const GOOD_DUMP = BETTER_DUMP

/**
 * BAD, PAYING IN WIRES: `./climb-boards.ts`'s `BASE_DUMP`, where `R2` sits one
 * column across from `R1` so both nets straddle two strips and each needs a
 * wire bridge.
 *
 * Measured: `C = 0`, `W = 2`, `B = 0`, `F = 0.5`, `S_occ = 4`, `J = 2`,
 * `kappa = 1`. **`C` is zero on BOTH sides of this pair** - no strip carries two
 * nets, so there is no abutment to cut - which is why this pair alone cannot
 * show that the cut count separates anything, and why `BAD_CUT_DUMP` exists.
 */
export const BAD_WIRES_DUMP = BASE_DUMP

/**
 * BAD, PAYING IN SOLDER BRIDGES: `BASE_DUMP`'s geometry with its two wires
 * replaced by the solder bridges the same two joins can be made with.
 *
 * The splits are between ADJACENT strips - columns 1 and 2, and 6 and 7 - which
 * is the only case a bridge can serve at all, and it is why this board is a
 * rewrite of `BASE_DUMP` rather than a third geometry: the geometry that makes a
 * wire necessary is the geometry that makes a bridge possible.
 *
 * Measured: `C = 0`, `W = 0`, `B = 2`, `F = 0.5`, `S_occ = 4`, `J = 2`,
 * `kappa = 1`. `F` equals `BAD_WIRES_DUMP`'s because the committed weights have
 * `rho_s = rho_w = 0.25` - the owner's instruction that a blob on a layout is a
 * wire on his bench - so **`F` cannot tell these two boards apart and `B` is the
 * only statistic that can.** That is the point of including it: `B` is a
 * separately reported fact about a board precisely because the price no longer
 * distinguishes it (`stripboard/rules.json`'s `rhoSolder` note).
 *
 * It is built by replacing `BASE_DUMP`'s two `WIRE` lines rather than by
 * restating the board, so a change to that board reaches this one.
 */
export const BAD_SOLDER_DUMP = BASE_DUMP.replace(
  "WIRE W1 AT 3,1 ENDS 3,1,0,0 3,2,0,0\nWIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0\n",
  "SOLDER 3,1 3,2\nSOLDER 3,6 3,7\n",
)

/**
 * BAD, PAYING A CUT: `R2` shifted so that its left-hand pin lands on `R1`'s
 * right-hand strip, which puts two net-segments on column 6 and forces the one
 * cut that separates them.
 *
 * `R1` spans columns 1-6 at row 2 and `R2` columns 6-11 at row 7, so column 6
 * carries `R1.2` (net `right`, row 2) and `R2.1` (net `left`, row 7): **two
 * net-segments abutting on one strip, which is exactly where a cut exists.**
 * The cut is written between rows 4 and 5 of that column, the node ids on the
 * two sides being `2` (`right`, the row-2 segment) and `1` (`left`, the row-7
 * segment).
 *
 * Both nets are still split across two strips, so both joins still have to be
 * bought, and the wires are placed on the correct side of the cut: `W1` joins
 * column 1 to column 6 at row 8, BELOW the cut and therefore on the `left`
 * segment; `W2` joins column 6 to column 11 at row 3, ABOVE it and therefore on
 * the `right` segment. A wire on the wrong side would short the two nets, and
 * the board would be a fixture whose geometry contradicts its own netlist.
 *
 * Measured: `C = 1`, `W = 2`, `B = 0`, `F = 1.5`, `S_occ = 3`, `J = 2`,
 * `kappa = 1`.
 *
 * **IT IS ALSO THE PAIR THAT MEASURES THE SPREADING RULE.** Against
 * `BAD_WIRES_DUMP` - same netlist, same two joins bought with wires, one more
 * strip spent - `C` falls from 1 to 0 while `S_occ` rises from 3 to 4: moving a
 * net-segment onto an EMPTY strip is cut-neutral, onto an OCCUPIED one it costs
 * `+1`, and the cut reduction comes from VACATING an abutment rather than from
 * occupying a strip.
 */
export const BAD_CUT_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,11",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,6 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,6",
  "PIN R2 2 AT 7,11",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "CUT 4,6,2 5,6,1",
  "WIRE W1 AT 8,1 ENDS 8,1,0,0 8,6,0,0",
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,11,0,0",
  "",
].join("\n")

/** One good-versus-bad comparison, and what makes the bad side worse. */
export interface PlacementPair {
  /** How a failing row names itself. */
  readonly name: string
  /** The layout with no abutment and no join to buy. */
  readonly good: string
  /** The layout of the same netlist that is worse, and in a stated way. */
  readonly bad: string
  /** Which term of `F` the bad side spends, for a refusal to quote. */
  readonly spends: string
}

/**
 * The three pairs, which is the whole input to `V5`.
 *
 * ORDER IS THE ORDER OF THE TERM EACH ONE SPENDS - `W`, `B`, then `C` - and
 * nothing depends on it; it is listed so a reader comparing a failure against
 * this table reads the rows in the order they appear there.
 */
export const PLACEMENT_PAIRS: readonly PlacementPair[] = [
  {
    name: "split nets bridged by wires",
    good: GOOD_DUMP,
    bad: BAD_WIRES_DUMP,
    spends: "W, two wire bridges for two splits",
  },
  {
    name: "split nets bridged by solder",
    good: GOOD_DUMP,
    bad: BAD_SOLDER_DUMP,
    spends: "B, two solder bridges for the same two splits",
  },
  {
    name: "two net-segments abutting on one strip",
    good: GOOD_DUMP,
    bad: BAD_CUT_DUMP,
    spends: "C, one cut for one abutment, with both joins still bought",
  },
]
