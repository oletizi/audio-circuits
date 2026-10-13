/**
 * The drop test: which of a dump's `CUT ` lines the board cannot do without.
 *
 * **WHAT MAKES EACH EXPECTATION HERE A DERIVATION RATHER THAN A RE-RUN OF THE
 * IMPLEMENTATION.** Every figure comes from one of three places and no fourth:
 *
 *   1. **The owner's own board.** `tests/fixtures/stripboard/
 *      pultec-low-boost-frozen.dump` is a layout a person laid out by hand and
 *      built, against its committed reference export. Its five cuts are five
 *      because `COST §1.6` derives them by hand, and that every one of them is
 *      necessary is the figure he named.
 *   2. **A hand-made board whose redundancy is visible in the text.** A cut on
 *      a strip holding no lead at all cannot be separating two nets, which a
 *      reader can see from the `PIN` lines without running anything.
 *   3. **The two nets of `./score-fixtures.ts`'s fixture**, whose one cut is
 *      the only thing keeping them off one strip.
 *
 * **AND WHAT COVERS THE FAILURE MODE THE MEASUREMENT'S OWN HARNESS HAD** - a
 * classification that would have reported success after silently dropping a
 * line it did not mean to. Without a guard, a trial text that lost NOTHING is
 * identical to the baseline, so it shorts nothing new, so every cut on every
 * board would come back REDUNDANT and every expectation here would be wrong.
 *
 * MUTATION RUN, so that is a measurement rather than an argument: with
 * `withoutCutLines`'s `lines.filter((_, index) => !dropped.has(index))`
 * replaced by `[...lines]` - the no-op removal - **four of these five tests
 * failed**, every one of them on `necessity-lines-not-dropped: dropping 1
 * line(s) took the dump from 1 CUT line(s) to 1` (or from 5, or 6). So the
 * no-op is caught by the guard rather than by the counts, which is the louder
 * of the two outcomes; the fifth test is the no-cut board, which never reaches
 * the surgery at all. Reverted.
 *
 * **THIS FILE IS THE CLASSIFIER'S OWN TESTS AND NOT THE STANDING GUARD.** `F`
 * charged the necessary count for four commits and no longer does
 * (`tools/stripboard/score.ts` carries why); what makes that revert safe is
 * `./cut-counts-agree.test.ts`, which holds the two counts against each other
 * on every real board including the import-placed start the search begins from.
 * That file rests on the mutation run above for the drop test having teeth,
 * because rows that only assert agreement would all pass on a classifier that
 * never dropped a line.
 */
import { expect, test } from "bun:test"
import { necessaryCuts } from "../../tools/stripboard/cut-necessity.ts"
import { FIXTURE_REFERENCE, FROZEN_DUMP, TEXT, frozenReference } from "./score-fixtures.ts"

test("every cut on the owner's hand-laid low-boost board is necessary", async () => {
  // THE GROUND TRUTH, AND THE ONE PLACE THE OWNER'S "5 OF 5" IS ASSERTED. It
  // was the measurement the scorer's departure rested on - charging a DERIVED
  // cut count is only defensible if that count agrees with VeroRoute's on a
  // board nobody has disturbed - and with the scorer reverted it is the
  // classifier's calibration against the one layout in this repository that was
  // built and listened to. Five of five, nothing removable.
  const necessity = necessaryCuts(await Bun.file(FROZEN_DUMP).text(), await frozenReference())
  expect([necessity.reported, necessity.necessary]).toEqual([5, 5])
})

test("a cut on a strip holding no lead is counted redundant, and the real ones are kept", async () => {
  // THE CASE THE CHANGE EXISTS FOR, in its simplest visible form. The frozen
  // board's strips are its ROWS (`VERTICAL_STRIPS 0`) and its leads sit on rows
  // 3, 5, 7, 9 and 10 (COST §1.6), so row 0 holds no lead at all: a cut there
  // severs copper nothing is connected to, and no net's leads can be on both
  // sides of it. Six reported, five necessary - and WHICH five matters as much
  // as how many: the count only falls by one, so the drop test did not go on to
  // remove any of the board's real cuts.
  const text = await Bun.file(FROZEN_DUMP).text()
  const withPhantom = `${text.trimEnd()}\nCUT 0,0,0 0,1,0\n`
  const necessity = necessaryCuts(withPhantom, await frozenReference())
  expect([necessity.reported, necessity.necessary]).toEqual([6, 5])
})

test("the fixture's one cut is necessary, because dropping it puts two nets on one strip", () => {
  // `./score-fixtures.ts`'s board: nets `a` and `b` on rows 0 and 2, and the
  // cut severs row 0 between columns 1 and 2. Removing it joins that row's two
  // segments, and the wire at column 3 carries the row-0 right-hand segment to
  // row 2 - so `a` and `b` would share one copper component. One of one.
  const necessity = necessaryCuts(TEXT, FIXTURE_REFERENCE)
  expect([necessity.reported, necessity.necessary]).toEqual([1, 1])
})

test("a cut that separates only two nets already shorted elsewhere is not counted necessary", () => {
  // THE BASELINE CLAUSE, and it is a statement about what the drop test may
  // call necessary rather than about what a board should look like. Two solder
  // bridges at column 0 join rows 0, 1 and 2, so nets `a` and `b` share a
  // copper component
  // whatever the cut does: the board is BROKEN, `HC8` rejects it, and the cut
  // is not preventing anything. Counting it necessary would report a cut that
  // buys nothing as one the copper needs - and the question the drop test asks
  // is always whether removing a cut shorts something that was not already
  // shorted, never whether the board shorts.
  const shorted = TEXT.replace(
    "SOLDER 0,2 1,2",
    "SOLDER 0,2 1,2\nSOLDER 0,0 1,0\nSOLDER 1,0 2,0",
  )
  const necessity = necessaryCuts(shorted, FIXTURE_REFERENCE)
  expect([necessity.reported, necessity.necessary]).toEqual([1, 0])
})

test("a board with no cuts at all reports zero of zero rather than refusing", () => {
  // The common case on a board the search has just spread a net on, and the one
  // where an empty loop could hide a defect: no cut lines means nothing to drop
  // and nothing to count, which is a figure and not a missing answer.
  const noCuts = TEXT.replace("CUT 0,1,1 0,2,2\n", "")
  const necessity = necessaryCuts(noCuts, FIXTURE_REFERENCE)
  expect([necessity.reported, necessity.necessary]).toEqual([0, 0])
})
