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
 * requirement: the same refs, the same footprints, the same origin holes, the
 * same facings and the same pin-to-hole maps. Wire endpoints and wire nets, for
 * the same reason. The grid.
 *
 * **WHAT IS COMPARED ELECTRICALLY, AND THE RULING THAT MADE IT SO.** Cuts. The
 * owner, 2026-10-14: *"the cut position doesn't matter. That's false precision."*
 * Tracks are cut before the board is populated, so the clearance argument behind
 * the old exact-position requirement has no force. So a cut's GAP is not a
 * round-trip field; a cut's STRIP, the COUNT on each strip, and WHICH PAIR OF
 * RUNS it separates are. `tests/stripboard/model/cuts-agree.test.ts` holds the
 * measurement that made the ruling actionable - 54 of 54 agree on strip, count
 * and run pair, 38 of 54 on the exact gap, with identical electrical results.
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
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../lib/stripboard/board.ts"
import { derivedCuts, type Cut, type ReferenceNets } from "../../lib/stripboard/cuts.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { candidateFromDump } from "../../tools/stripboard/vero-import.ts"
import {
  layoutDocument,
  materialize,
  type MaterializeResult,
} from "../../tools/stripboard/vero-export.ts"
import { COMMITTED_BOARDS, footprintsOf, referenceOf } from "./vero-import-fixtures.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()

// ARMED IN THE SPELLING `./temp-scratch.test.ts` LOOKS FOR, which is a bare reference
// and not a closure around one: that guard reads the hook out of this file's own
// source text, and a wrapper reads to it as a file that registers scratch and never
// cleans it up. The leak it is guarding against filled the owner's disk once.
afterAll(cleanUpTempScratch)

/**
 * The two committed `.vrt` boards this file round-trips, and why only two.
 *
 * A round trip needs a `.vrt` AND an importable dump: the `.vrt` is the component
 * set `--materialize` places, and the dump is the candidate it places. Five of
 * the seven committed boards have no importable dump - their refusal keys are
 * asserted in `tests/stripboard/model/cuts-agree.test.ts`, which owns that
 * accounting - so the same two boards reach this file.
 *
 * `transistor-preamp-loop` carries no wire at all, so its 49 cuts are derived
 * from `PIN` lines and the KiCad export alone; `transistor-preamp-feedback`
 * carries four wires and is the AutoFill-divergence case. Neither is a substitute
 * for the other.
 */
const ROUND_TRIP: readonly string[] = ["transistor-preamp-feedback", "transistor-preamp-loop"]

function vrtOf(name: string): string {
  return path.join(REPO, "boards", name, `${name}.perfboard.vrt`)
}

/** One fork invocation, failing loudly rather than returning something readable as a board. */
function fork(args: readonly string[]): { readonly stdout: string; readonly stderr: string } {
  const binary = verorouteBinary(process.env, REPO)
  const run = spawnSync(binary, [...args], { encoding: "utf8" })
  if (run.error !== undefined) {
    throw new Error(
      `could not run ${binary} ${args.join(" ")}: ${run.error.message}. This test does not skip ` +
        "when the fork is unavailable: a skipped check that looks like a passing one is the " +
        "failure mode the whole stripboard workflow exists to prevent.",
    )
  }
  if (run.status !== 0) {
    throw new Error(
      `veroroute ${args.join(" ")} exited ${String(run.status)}.\n${run.stdout}\n${run.stderr}`,
    )
  }
  return { stdout: run.stdout, stderr: run.stderr ?? "" }
}

function committed(name: string): {
  readonly candidate: Candidate
  readonly reference: ReferenceNets
  readonly dumpText: string
} {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) throw new Error(`${name} is not a committed board`)
  const dumpText = fork(["--dump-board", vrtOf(name)]).stdout
  const reference = referenceOf(board)
  return {
    candidate: candidateFromDump(dumpText, reference, footprintsOf(board), PIN_PATTERNS),
    reference,
    dumpText,
  }
}

/** Materialize one candidate onto its own committed board, and read the result back. */
function roundTrip(name: string): {
  readonly before: Candidate
  readonly after: Candidate
  readonly reference: ReferenceNets
  readonly result: MaterializeResult
  readonly afterDump: string
  readonly beforeDump: string
} {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) throw new Error(`${name} is not a committed board`)
  const { candidate, reference, dumpText } = committed(name)
  const scratch = freshTempScratch("stripboard-vero-export-")
  const result = materialize(
    {
      candidate,
      reference,
      base: vrtOf(name),
      layoutPath: path.join(scratch, "layout.txt"),
      outPath: path.join(scratch, "materialized.vrt"),
    },
    (args) => {
      const binary = verorouteBinary(process.env, REPO)
      const run = spawnSync(binary, [...args], { encoding: "utf8" })
      return { status: run.status ?? -1, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
    },
  )
  const afterDump = fork(["--dump-board", result.outPath]).stdout
  return {
    before: candidate,
    after: candidateFromDump(afterDump, reference, footprintsOf(board), PIN_PATTERNS),
    reference,
    result,
    afterDump,
    beforeDump: dumpText,
  }
}

/** A placement as one comparable string: every field of it, pins included. */
function placementKeys(candidate: Candidate): readonly string[] {
  return candidate.placements
    .map((placement) => {
      const pins = [...placement.pins]
        .map(([pin, hole]) => `${pin}@${hole.strip},${hole.column}`)
        .sort()
        .join(" ")
      return [
        placement.ref,
        placement.footprint,
        `${placement.origin.strip},${placement.origin.column}`,
        placement.direction,
        pins,
      ].join("|")
    })
    .sort()
}

/** A wire as its two end holes, unordered, with the net it carries. */
function wireKeys(candidate: Candidate): readonly string[] {
  return candidate.wires
    .map((wire) => {
      const ends = [
        `${wire.from.strip},${wire.from.column}`,
        `${wire.to.strip},${wire.to.column}`,
      ].sort()
      return `${ends[0]} ${ends[1]} ${wire.net}`
    })
    .sort()
}

/**
 * A bridge as the pair of strips it joins and the net it carries - and NOT its
 * column. See this module's comment: `Board::CalcSolder` re-derives the whole
 * bridge set from the painted copper on every dump and picks the column itself.
 */
function bridgeKeys(candidate: Candidate): readonly string[] {
  return candidate.bridges
    .map((bridge) => `${bridge.strips[0]}-${bridge.strips[1]} ${bridge.net}`)
    .sort()
}

/** The fork's own `CUT` lines, as this model's `Cut`. */
function forkCuts(dumpText: string): readonly Cut[] {
  return parseBoardDump(dumpText).cuts.map((cut) => ({
    strip: cut.a.row,
    afterColumn: Math.min(cut.a.col, cut.b.col),
  }))
}

const canonicalCuts = (cuts: readonly Cut[]): readonly string[] =>
  cuts.map((cut) => `${cut.strip}:${cut.afterColumn}`).sort()

/** How many cuts each strip carries - the electrical half of the comparison. */
const cutsPerStrip = (cuts: readonly Cut[]): readonly string[] => {
  const counts = new Map<number, number>()
  for (const cut of cuts) counts.set(cut.strip, (counts.get(cut.strip) ?? 0) + 1)
  return [...counts].sort((a, b) => a[0] - b[0]).map(([strip, n]) => `strip ${strip}: ${n}`)
}

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
  })
}

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
  // filled, so that is read rather than assumed - and no pin was found on no net,
  // which is the other thing its stdout would have said.
  const feedback = roundTrip("transistor-preamp-feedback")
  expect(feedback.result.painted, "blank holes filled on the feedback board").toBe(104)
  expect(feedback.result.unpaintedPins, "no pin was on no net").toEqual([])
  const loop = roundTrip("transistor-preamp-loop")
  expect(loop.result.painted, "blank holes filled on the loop board").toBe(60)
  expect(loop.result.unpaintedPins, "no pin was on no net").toEqual([])
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
