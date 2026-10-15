/**
 * THE ROUND TRIP: a `Candidate` handed to the fork, materialized, dumped, and
 * read back - and what the fork then says about it on its own.
 *
 * **WHY IT IS A ROUND TRIP RATHER THAN A FILE COMPARISON.** We do not write
 * `.vrt` bytes, so there is no authored artifact to diff. The only way to ask
 * whether VeroRoute produced the board we described is to ask VeroRoute what it
 * now has: `--materialize` applies the description, `--dump-board` reports the
 * result, and `tools/stripboard/vero-import.ts` - Task 8's importer, written
 * before this task and for a different purpose - reads that report back into the
 * model. The two `Candidate`s are then comparable field by field.
 *
 * **WHAT IS COMPARED EXACTLY.** Placements, because that is the task's stated
 * requirement: the same refs, the same origin holes, the same facings and the
 * same pin-to-hole maps. Wire endpoints and wire nets, for the same reason. The
 * grid.
 *
 * **`footprint` IS NOT IN THAT LIST, AND SAYING SO IS THE POINT.** An earlier
 * revision of this comment named it among the compared fields, and it could
 * never have fired: both candidates get a placement's footprint from the SAME
 * injected map (`footprintsOf`), never from the dump, so comparing it would be
 * comparing a fixture against itself and would pass on a board that came back
 * wrong in every other way. The four fields that remain are all dump-derived -
 * `origin` and `direction` through `facingOf` over the dumped `PIN` lines, and
 * the pin map from those lines directly - so each of them can disagree, which is
 * what makes the composite key worth asserting.
 *
 * **WHAT IS COMPARED ELECTRICALLY, AND THE RULING THAT MADE IT SO.** Cuts. The
 * owner, 2026-10-14: *"the cut position doesn't matter. That's false precision."*
 * Tracks are cut before the board is populated, so the clearance argument behind
 * the old exact-position requirement has no force. So a cut's GAP is not a
 * round-trip field; a cut's STRIP, the COUNT on each strip, and WHICH PAIR OF
 * RUNS it separates are. **All three are checked, the third by walking each cut
 * to the two runs it falls between** (`separatedRunPairs` below) - an earlier
 * revision of this comment claimed the run pair while the file compared only
 * strips and counts, which do not imply it: two cuts can sit one on each side of
 * a three-run strip's middle run and produce identical per-strip counts while
 * separating different pairs. `tests/stripboard/model/cuts-agree.test.ts` holds
 * the measurement that made the ruling actionable - 54 of 54 agree on strip,
 * count and run pair, 38 of 54 on the exact gap, with identical electrical
 * results.
 *
 * **AND BRIDGES ARE IN THE SAME BUCKET AS CUTS, WHICH IS MEASURED HERE RATHER
 * THAN ASSUMED.** A `SOLDER` line is not board state in VeroRoute: `CalcSolder`
 * (`.tools/veroroute-perfboard/Src/Board.cpp`) clears every blob and re-derives
 * the whole set from the painted copper on every dump, emitting one blob per
 * contiguous run of columns where two adjacent strips carry one nodeId - and it
 * chooses the column within that run itself, preferring a hole with no pad and
 * then a hole with pins. So a bridge's COLUMN is the fork's own choice by exactly
 * the mechanism a cut's gap is, and this file compares the bridge SET - which
 * adjacent strip pair, carrying which net - and reports a column difference
 * instead of failing on one. A different SET would be a real disagreement.
 *
 * **THE AUTOFILL CASE IS THE ONE THAT MATTERS MOST.** `Board::AutoFillVero`
 * re-paints every blank hole on every strip, and the cut set a board reports is
 * derived from exactly the boundaries that paint leaves - so a materialization
 * that let it run would hand back AutoFill's layout wearing the optimizer's name.
 * The fork's declarative importer therefore never calls it, and the proof is
 * below: `transistor-preamp-feedback` is the board where our gap convention and
 * the fork's own paint agree on only ONE of five cuts (measured in
 * `cuts-agree.test.ts`), so materializing our candidate onto it and finding our
 * five gaps in the output - not the four the board arrived with - is a direct
 * demonstration that the paint we asked for survived.
 *
 * **IT FAILS RATHER THAN SKIPS WHEN THE BINARY IS ABSENT.** This repository's
 * rule, stated in `CLAUDE.md` about `kicad-cli` and applied here to VeroRoute: a
 * skipped check must never look like a passing one.
 */
import { afterAll, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import type { Candidate } from "../../lib/stripboard/board.ts"
import { derivedCuts, type Cut } from "../../lib/stripboard/cuts.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { layoutDocument } from "../../tools/stripboard/vero-export.ts"
import {
  bridgeKeys,
  canonicalCuts,
  committed,
  cutsPerStrip,
  forkCuts,
  placementKeys,
  roundTrip,
  ROUND_TRIP,
  separatedRunPairs,
  vrtOf,
  wireKeys,
} from "./vero-export-fixtures.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()

// ARMED IN THE SPELLING `./temp-scratch.test.ts` LOOKS FOR, which is a bare reference
// and not a closure around one: that guard reads the hook out of this file's own
// source text, and a wrapper reads to it as a file that registers scratch and never
// cleans it up. The leak it is guarding against filled the owner's disk once. The
// directories themselves are made by `./vero-export-fixtures.ts`; the hook has to be
// here, in the file that reaches it.
afterAll(cleanUpTempScratch)

test("the fork the pin names understands --materialize, by its own flag table", () => {
  // VERIFIED AGAINST THE THING ITSELF rather than written from memory: this
  // repository has twice shipped a name that does not exist, and a CLI flag is
  // checkable the same way a footprint is. `--help`'s own text is the fork's
  // flag table, and its suite asserts that every shipped flag appears in it.
  const help = spawnSync(verorouteBinary(process.env, REPO), ["--help"], { encoding: "utf8" })
  expect(help.error, "the pinned binary runs").toBeUndefined()
  expect(help.stdout, "--help documents the verb this task added").toContain(
    "--materialize BOARD --layout LAYOUT -o OUTPUT",
  )
  expect(help.stdout, "and the option it takes").toContain("--layout LAYOUT")
})

for (const name of ROUND_TRIP) {
  test(`${name}: the materialized board has the same grid, placements and wires`, () => {
    const trip = roundTrip(name)
    expect(trip.after.grid, "the same stock").toEqual(trip.before.grid)
    expect(placementKeys(trip.after), "every placement, field for field").toEqual(
      placementKeys(trip.before),
    )
    expect(wireKeys(trip.after), "every wire, by its two end holes and its net").toEqual(
      wireKeys(trip.before),
    )
  })

  test(`${name}: the fork derives the same bridge set from the board it made`, () => {
    const trip = roundTrip(name)
    expect(bridgeKeys(trip.after), "the same strip pairs carrying the same nets").toEqual(
      bridgeKeys(trip.before),
    )
  })

  test(`${name}: the fork's own cuts on the materialized board are electrically ours`, () => {
    const trip = roundTrip(name)
    const ours = derivedCuts(trip.before, trip.reference)
    const theirs = forkCuts(trip.afterDump)
    expect(parseBoardDump(trip.afterDump).cutState, "the board's strips resolve").toBe("COMPUTED")
    expect(theirs.length, "the same number of cuts").toBe(ours.length)
    expect(cutsPerStrip(theirs), "on the same strips, with the same count on each").toEqual(
      cutsPerStrip(ours),
    )
    expect(
      separatedRunPairs(trip.before, trip.reference, theirs),
      "and separating the same pairs of runs, which is what the gap does not have to match",
    ).toEqual(separatedRunPairs(trip.before, trip.reference, ours))
  })
}

test("the run-pair comparison is gap-insensitive and can still fail", () => {
  // A COMPARISON THAT CANNOT FAIL IS THE DEFECT THIS SUITE EXISTS TO PREVENT, so
  // `separatedRunPairs` is shown to discriminate rather than assumed to. Two
  // halves, and both are needed:
  //
  //   - GAP-INSENSITIVE: `transistor-preamp-feedback` arrived with cuts whose
  //     gaps agree with ours on only one of five, and they separate the SAME five
  //     run pairs. That is the owner's ruling restated as an assertion - a
  //     different gap between the same two runs is not a disagreement.
  //   - STILL ABLE TO FAIL: strip 5 carries two cuts, so moving the first of them
  //     onto the second's gap leaves the per-strip counts identical while making
  //     both cuts separate the same pair. The key changes, so a cut set that
  //     merged two runs could not pass the comparison above.
  const trip = roundTrip("transistor-preamp-feedback")
  const ours = derivedCuts(trip.before, trip.reference)
  const pairsOf = (cuts: readonly Cut[]): readonly string[] =>
    separatedRunPairs(trip.before, trip.reference, cuts)

  expect(canonicalCuts(forkCuts(trip.beforeDump)), "the as-built gaps really do differ").not.toEqual(
    canonicalCuts(ours),
  )
  expect(pairsOf(forkCuts(trip.beforeDump)), "and separate the same run pairs anyway").toEqual(
    pairsOf(ours),
  )

  const onStripFive = ours.filter((cut) => cut.strip === 5)
  expect(onStripFive.length, "strip 5 is the two-cut strip this leans on").toBe(2)
  const second = onStripFive[1]
  if (second === undefined) return
  const merged = ours.map((cut) =>
    cut.strip === 5 && cut.afterColumn === onStripFive[0]?.afterColumn ? second : cut,
  )
  expect(cutsPerStrip(merged), "the mutation keeps every per-strip count").toEqual(
    cutsPerStrip(ours),
  )
  expect(pairsOf(merged), "and the run pairs catch it").not.toEqual(pairsOf(ours))
})

test("how many derived positions also agree exactly, which is NOT the requirement", () => {
  // THE FIGURES, KEPT AS A TEST SO THAT A CHANGE SAYS SO - the pattern
  // `tests/stripboard/model/cuts-agree.test.ts` uses for the same kind of claim.
  // Neither number is a correctness claim: the requirement is the SET, asserted
  // above, and the owner has ruled an exact cut position out as false precision.
  // What they record is that the fork, left to derive both from the copper this
  // document paints, currently lands every cut and every solder blob exactly
  // where the candidate had them - 8 of 8 bridges and 54 of 54 cuts across the
  // two boards. The bridge column in particular is `CalcSolder`'s own choice
  // within a run, so a future candidate may legitimately move one, and that is
  // why this is a measurement and not an assertion of the contract.
  const agreed: string[] = []
  for (const name of ROUND_TRIP) {
    const trip = roundTrip(name)
    const before = trip.before
    const after = trip.after
    const column = (candidate: Candidate): readonly string[] =>
      candidate.bridges
        .map((bridge) => `${bridge.strips[0]}-${bridge.strips[1]}@${bridge.column} ${bridge.net}`)
        .sort()
    const sameBridges = column(after).filter((key) => column(before).includes(key)).length
    const ours = canonicalCuts(derivedCuts(before, trip.reference))
    const theirs = canonicalCuts(forkCuts(trip.afterDump))
    const sameCuts = theirs.filter((key) => ours.includes(key)).length
    agreed.push(
      `${name}: ${sameBridges} of ${before.bridges.length} bridge columns, ` +
        `${sameCuts} of ${ours.length} cut gaps`,
    )
  }
  expect(agreed).toEqual([
    "transistor-preamp-feedback: 3 of 3 bridge columns, 5 of 5 cut gaps",
    "transistor-preamp-loop: 5 of 5 bridge columns, 49 of 49 cut gaps",
  ])
})

test("the paint is not a no-op, which a run count alone would not say", () => {
  // A DOCUMENT WHOSE RUNS PAINTED NOTHING would leave the strips as the wipe left
  // them, and every assertion above about cuts would then be about a board with
  // no copper identity between the leads. The fork reports what it actually
  // filled, so that is read rather than assumed - and it reported no hole inside
  // a run that it declined to paint, which is the other thing its stdout would
  // have said. The reason tokens themselves are exercised in the fork's own
  // suite (.tools/veroroute-perfboard/tests/materialize.test.ts), on a fixture
  // built to put a pin on no net inside a run; neither board here has one.
  const feedback = roundTrip("transistor-preamp-feedback")
  expect(feedback.result.painted, "blank holes filled on the feedback board").toBe(104)
  expect(feedback.result.unpaintedHoles, "and no hole inside a run was skipped").toEqual([])
  const loop = roundTrip("transistor-preamp-loop")
  expect(loop.result.painted, "blank holes filled on the loop board").toBe(60)
  expect(loop.result.unpaintedHoles, "and no hole inside a run was skipped").toEqual([])
})

test("transistor-preamp-feedback: AutoFill's own gaps do not survive materialization", () => {
  // THE DEFENCE THIS TASK EXISTS FOR, demonstrated rather than asserted. The
  // committed board arrived with cuts at the gaps its paint implied, and
  // `cuts-agree.test.ts` measures that our convention agrees with only ONE of
  // those five. If the declarative importer ran Board::AutoFillVero - or left the
  // board's existing paint in place - the materialized board would report those
  // same five gaps. It reports ours.
  const trip = roundTrip("transistor-preamp-feedback")
  const ours = canonicalCuts(derivedCuts(trip.before, trip.reference))
  const asBuilt = canonicalCuts(forkCuts(trip.beforeDump))
  const materialized = canonicalCuts(forkCuts(trip.afterDump))

  expect(materialized, "the fork reports the gaps we asked for").toEqual(ours)
  expect(asBuilt.filter((cut) => ours.includes(cut)).length, "and four of them are new").toBe(1)
  expect(materialized).not.toEqual(asBuilt)
})

test("the layout document carries the physical state and nothing about which part is fitted", () => {
  // WHAT THE DOCUMENT IS FOR, read off the document itself. The component SET,
  // their types, their values and their net membership all come from the base
  // board - see tools/stripboard/vero-export.ts - so no VeroRoute component type
  // and no part value may appear in the text.
  const { candidate, reference } = committed("transistor-preamp-feedback")
  const document = layoutDocument(candidate, reference)
  expect(document, "the stock").toContain("GRID 16 18")
  expect(document, "the strip axis").toContain("STRIPS horizontal")
  // NO CORNER AND NO FACING ON A PART STATEMENT. The two programs' turn and
  // origin conventions are not the same vocabulary - the module comment has the
  // measurement - so the leads are the placement and the fork solves the rest.
  expect(document).toMatch(/^PART Q1$/m)
  expect(document, "no part statement states a facing").not.toMatch(/^PART \S+ .*DIRECTION/m)
  expect(document).toMatch(/^PIN Q1 1 AT \d+,\d+$/m)
  expect(document).toMatch(/^COPPER \d+ \d+ \d+ NET \S+\.\d+$/m)
  for (const forbidden of ["TO92", "RESISTOR", "TRIM_FLAT", "470K", "2N3904"]) {
    expect(document, `the document says nothing about "${forbidden}"`).not.toContain(forbidden)
  }
})

test("a document that leaves a component out is refused, and nothing is written", () => {
  // THE OWNERSHIP RULE'S OTHER HALF: it never partially applies. A document with
  // one PART statement removed describes a board whose missing part would be
  // floated and never put back, and the fork refuses rather than writing it.
  const { candidate, reference } = committed("transistor-preamp-feedback")
  const scratch = freshTempScratch("stripboard-vero-export-")
  const layoutPath = path.join(scratch, "incomplete.txt")
  const outPath = path.join(scratch, "never-written.vrt")
  const document = layoutDocument(candidate, reference)
    .split("\n")
    .filter((line) => line !== "PART Q1" && !line.startsWith("PIN Q1 "))
    .join("\n")
  fs.writeFileSync(layoutPath, document)
  const binary = verorouteBinary(process.env, REPO)
  const run = spawnSync(
    binary,
    ["--materialize", vrtOf("transistor-preamp-feedback"), "--layout", layoutPath, "-o", outPath],
    { encoding: "utf8" },
  )
  expect(run.status, "the fork refuses").toBe(1)
  expect(run.stderr, "and names the component it cannot place").toContain("Q1")
  expect(fs.existsSync(outPath), "and writes nothing at all").toBe(false)
})
