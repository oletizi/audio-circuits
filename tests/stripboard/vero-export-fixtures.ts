/**
 * The round-trip harness `./vero-export.test.ts` runs, and the comparison keys it
 * runs it through.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `./vero-import-fixtures.ts`,
 * `./grade-fixtures.ts` and `./score-fixtures.ts`: the test file reached 507 lines
 * against this repository's 300-500 ceiling, and the seam that falls out of it is
 * the one those files already use - the machinery that produces a measurement on
 * one side, the assertions that judge it on the other. Nothing here asserts
 * anything, and nothing in the test file spawns the fork.
 *
 * **WHAT EACH COMPARISON KEY DOES AND DOES NOT INCLUDE is argued at the key
 * itself**, because that is where a reader checking whether the round trip claims
 * more than it compares will look. The test file's own comment states the
 * contract; these functions are where it is kept.
 *
 * **THE FORK IS INVOKED HERE AND IT FAILS RATHER THAN SKIPS.** This repository's
 * rule, stated in `CLAUDE.md` about `kicad-cli` and applied to VeroRoute: a
 * skipped check must never look like a passing one. `fork` throws naming the
 * binary and the fix; nothing in this module returns something a test could
 * mistake for a board.
 */
import path from "node:path"
import { spawnSync } from "node:child_process"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../lib/stripboard/board.ts"
import {
  runsOf,
  significantContacts,
  type Cut,
  type ReferenceNets,
} from "../../lib/stripboard/cuts.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { verorouteBinary } from "../../tools/perfboard/check.ts"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { candidateFromDump } from "../../tools/stripboard/vero-import.ts"
import { materialize, type MaterializeResult } from "../../tools/stripboard/vero-export.ts"
import { COMMITTED_BOARDS, footprintsOf, referenceOf } from "./vero-import-fixtures.ts"
import { freshTempScratch } from "../support/temp-scratch.ts"

const REPO = moduleRepoRoot()

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
export const ROUND_TRIP: readonly string[] = ["transistor-preamp-feedback", "transistor-preamp-loop"]

export function vrtOf(name: string): string {
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

export function committed(name: string): {
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
export function roundTrip(name: string): {
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

/**
 * A placement as one comparable string: every DUMP-DERIVED field of it, pins
 * included.
 *
 * **`footprint` IS DELIBERATELY ABSENT** - see this module's comment. It comes
 * from the injected map on both sides rather than from the board, so it cannot
 * differ, and a key carrying a field that cannot differ reads as more coverage
 * than it is.
 */
export function placementKeys(candidate: Candidate): readonly string[] {
  return candidate.placements
    .map((placement) => {
      const pins = [...placement.pins]
        .map(([pin, hole]) => `${pin}@${hole.strip},${hole.column}`)
        .sort()
        .join(" ")
      return [
        placement.ref,
        `${placement.origin.strip},${placement.origin.column}`,
        placement.direction,
        pins,
      ].join("|")
    })
    .sort()
}

/** A wire as its two end holes, unordered, with the net it carries. */
export function wireKeys(candidate: Candidate): readonly string[] {
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
export function bridgeKeys(candidate: Candidate): readonly string[] {
  return candidate.bridges
    .map((bridge) => `${bridge.strips[0]}-${bridge.strips[1]} ${bridge.net}`)
    .sort()
}

/** The fork's own `CUT` lines, as this model's `Cut`. */
export function forkCuts(dumpText: string): readonly Cut[] {
  return parseBoardDump(dumpText).cuts.map((cut) => ({
    strip: cut.a.row,
    afterColumn: Math.min(cut.a.col, cut.b.col),
  }))
}

export const canonicalCuts = (cuts: readonly Cut[]): readonly string[] =>
  cuts.map((cut) => `${cut.strip}:${cut.afterColumn}`).sort()

/** How many cuts each strip carries - the electrical half of the comparison. */
export const cutsPerStrip = (cuts: readonly Cut[]): readonly string[] => {
  const counts = new Map<number, number>()
  for (const cut of cuts) counts.set(cut.strip, (counts.get(cut.strip) ?? 0) + 1)
  return [...counts].sort((a, b) => a[0] - b[0]).map(([strip, n]) => `strip ${strip}: ${n}`)
}

/**
 * Which PAIR OF RUNS each cut separates, named by the runs themselves rather
 * than by the gap it sits in.
 *
 * **THIS IS THE FIELD THAT MAKES "ELECTRICALLY OURS" MEAN SOMETHING.** A cut's
 * gap is the fork's own to choose; what must not change is which two runs of
 * declared net end up on two different conductors. Strips and per-strip counts
 * do not imply it: a three-run strip needs two cuts either way, and a pair that
 * moved from separating runs 1|2 and 2|3 to separating 1|2 twice would keep both
 * numbers identical. So each cut is walked to the adjacent pair of OUR runs it
 * falls between, and the pair is keyed by both runs' nets and extents.
 *
 * The runs are always this model's own (`runsOf` over the candidate the document
 * was built from), for both cut lists: the question is which of OUR runs each
 * cut separates, so re-deriving runs from the materialized board would be asking
 * a different question and could hide a disagreement behind a matching
 * re-derivation. A cut that falls between no adjacent pair returns a key saying
 * so, which fails the comparison by name rather than being dropped.
 */
export function separatedRunPairs(
  candidate: Candidate,
  reference: ReferenceNets,
  cuts: readonly Cut[],
): readonly string[] {
  const runs = runsOf(significantContacts(candidate, reference))
  return cuts
    .map((cut) => {
      const onStrip = runs
        .filter((run) => run.strip === cut.strip)
        .sort((a, b) => a.firstColumn - b.firstColumn)
      for (let index = 1; index < onStrip.length; index += 1) {
        const earlier = onStrip[index - 1]
        const later = onStrip[index]
        if (earlier === undefined || later === undefined) continue
        if (earlier.lastColumn <= cut.afterColumn && cut.afterColumn < later.firstColumn) {
          return (
            `strip ${cut.strip}: ${earlier.net}@${earlier.firstColumn}-${earlier.lastColumn} | ` +
            `${later.net}@${later.firstColumn}-${later.lastColumn}`
          )
        }
      }
      return `strip ${cut.strip}: cut after column ${cut.afterColumn} separates no pair of our runs`
    })
    .sort()
}
