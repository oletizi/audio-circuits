/**
 * The boards `tests/stripboard/extent.test.ts` grades the fabrication extent
 * against, in two groups: hand-written dump text, and the pinned binary's own
 * dump of four committed layouts.
 *
 * BOTH GROUPS ARE NEEDED AND NEITHER IS SUFFICIENT. Hand-written text is the
 * only way to put a feature a measured distance outside `BOUNDS` on purpose -
 * no headless verb creates a text label, so the over-stating case cannot be
 * manufactured from a real board (`docs/stripboard/pipeline-verification.md`
 * section 2.3). But hand-written text can only ever agree with what this
 * repository BELIEVES the grammar to be, so the four real boards are what
 * establish that the extent arithmetic is pointed at reality: three of them
 * pass `make check` today and were laid out by hand.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper several test files import,
 * following `tests/stripboard/score-fixtures.ts` and
 * `tests/circuits/kicad-round-trip.ts`.
 *
 * THE FOUR REAL DUMPS ARE CAPTURED LIVE RATHER THAN READ FROM
 * `tests/fixtures/stripboard/`, and the reason is a fact about those fixtures:
 * every one of them was captured BEFORE the `BOUNDS` line existed, so none
 * carries one, and `fabricationExtent` refuses a dump with no `BOUNDS` by
 * design. Re-capturing them is not an option either - the frozen pair are
 * evidence with provenance - so this spawns the binary `veroroute.pin` names,
 * the way `tools/perfboard/check.ts` does. It FAILS rather than skips when the
 * binary is absent: a skipped check that looks like a passing one is the
 * failure mode this whole suite exists to prevent.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"

/**
 * A two-resistor board with a `WIRE` end one column PAST `BOUNDS`, and a pin at
 * the extent's own last column.
 *
 * TWO PROPERTIES IT IS BUILT FOR, both load-bearing in the tests:
 *
 *   - `BOUNDS` stops at column 6 and `WIRE W1` ends at column 7, so
 *     `featuresOutsideBounds` is non-empty and names the wire. This is the shape
 *     a grader reading `BOUNDS` alone cannot see.
 *   - a required feature sits at the extent's `maxCol`, so SHRINKING the extent
 *     by one column drops it. Without that, a deliberately-too-small trim would
 *     drop nothing on this board and the detection would never be exercised.
 *
 * The copper: strip 1 is cut between columns 2 and 3, so R1's two leads are in
 * two components; strip 3 is uncut, so R2's two leads are in one; a solder
 * bridge at column 6 joins strips 1 and 2, and W1 carries strip 2 to strip 4.
 * Three groups of pins, and the trim must reproduce all three.
 */
export const WIRE_PAST_BOUNDS = [
  "GRID 6 10",
  "BOUNDS 1,1 4,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 1,1 SPAN 4 DIRECTION W",
  "PART R2 RESISTOR 22K AT 3,1 SPAN 4 DIRECTION W",
  "PIN R1 1 AT 1,1",
  "PIN R1 2 AT 1,4",
  "PIN R2 1 AT 3,1",
  "PIN R2 2 AT 3,4",
  "NODE 1 NAME in R1.1",
  "NODE 2 NAME mid R1.2",
  "NODE 3 NAME out R2.1 R2.2",
  "CUT 1,2,1 1,3,2",
  "SOLDER 1,6 2,6",
  "WIRE W1 AT 2,6 ENDS 2,6,0,0 4,7,0,0",
  "",
].join("\n")

/**
 * The same shape with a `SOLDER` hole and a `CUT` end outside `BOUNDS` instead
 * of a wire end.
 *
 * It exists because `featuresOutsideBounds` carries a `kind`, and a test that
 * only ever saw `"wire"` would prove nothing about the other three. The cut's
 * FAR end is the one outside, which is the case that matters: a board trimmed
 * to exclude it has no gap to sever, so the two nets the cut separates stay
 * joined - and the bounding box says nothing about it.
 */
export const SOLDER_AND_CUT_PAST_BOUNDS = [
  "GRID 6 10",
  "BOUNDS 1,1 3,4",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 1,1 SPAN 4 DIRECTION W",
  "PART R2 RESISTOR 22K AT 3,1 SPAN 4 DIRECTION W",
  "PIN R1 1 AT 1,1",
  "PIN R1 2 AT 1,4",
  "PIN R2 1 AT 3,1",
  "PIN R2 2 AT 3,4",
  "NODE 1 NAME in R1.1",
  "NODE 2 NAME mid R1.2 R2.1 R2.2",
  "CUT 1,4,1 1,5,2",
  "SOLDER 2,5 3,5",
  "",
].join("\n")

/** Every hand-written extent board, in the order the tests iterate them. */
export const HAND_WRITTEN: readonly (readonly [string, string])[] = [
  ["wire-past-bounds", WIRE_PAST_BOUNDS],
  ["solder-and-cut-past-bounds", SOLDER_AND_CUT_PAST_BOUNDS],
]

/**
 * The four committed layouts PIPELINE 3.5 names, each as the pinned binary's
 * own `--dump-board` output.
 *
 * `transistor-preamp-lab` is deliberately absent: its dump reports
 * `CUT_STATE UNRESOLVED`, so its cut list is absent rather than empty and
 * `copperGraph` refuses it by name - which `trimPreservesConnectivity` leans
 * on. Naming the exclusion here keeps it a decision rather than an omission.
 */
export const REAL_BOARDS: readonly (readonly [string, string])[] = [
  ["pt2399-core", "boards/pt2399-core/pt2399-core.perfboard.vrt"],
  [
    "transistor-preamp-feedback",
    "boards/transistor-preamp-feedback/transistor-preamp-feedback.perfboard.vrt",
  ],
  [
    "transistor-preamp-staged",
    "boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt",
  ],
  ["pultec-low-boost", "boards/pultec-low-boost/pultec-low-boost.perfboard.vrt"],
]

/**
 * `--dump-board` on one committed layout, refusing rather than returning
 * something a test could mistake for a board.
 */
export function dumpOf(relativeVrt: string): string {
  const root = moduleRepoRoot()
  const binary = verorouteBinary(process.env, root)
  const run = spawnSync(binary, ["--dump-board", path.join(root, relativeVrt)], {
    encoding: "utf8",
  })
  if (run.error !== undefined) {
    throw new Error(`could not run ${binary}: ${run.error.message}`)
  }
  if (run.status !== 0) {
    throw new Error(
      `veroroute --dump-board ${relativeVrt} exited ${String(run.status)}, so this board could ` +
        `not be read and no extent may be concluded from it.\n${run.stderr ?? ""}`,
    )
  }
  return run.stdout
}

/**
 * Every board the extent tests iterate, hand-written first.
 *
 * THE HAND-WRITTEN ONE COMES FIRST ON PURPOSE: the too-small-trim test shrinks
 * the FIRST entry's extent by one column, and `WIRE_PAST_BOUNDS` is the board
 * built so that one column holds a required feature. On a board whose `maxCol`
 * comes from `BOUNDS` alone - `transistor-preamp-feedback` is one, measured:
 * `BOUNDS 0,0 15,17` against an all-holes extent of `0,0 15,16` - shrinking by
 * one column drops nothing, and the test would pass while exercising nothing.
 */
export function everyExtentFixture(): readonly (readonly [string, BoardDump])[] {
  return [
    ...HAND_WRITTEN.map(([name, text]): readonly [string, BoardDump] => [
      name,
      parseBoardDump(text),
    ]),
    ...REAL_BOARDS.map(([name, vrt]): readonly [string, BoardDump] => [
      name,
      parseBoardDump(dumpOf(vrt)),
    ]),
  ]
}
