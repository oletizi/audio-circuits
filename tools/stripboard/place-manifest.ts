/**
 * WHAT A RUN RECORDS ABOUT ITSELF: `run.json`'s two blocks, assembled.
 *
 * **ITS OWN FILE AT THE SEAM BETWEEN RUNNING AND RECORDING**, which is the third
 * cut in this area after `./place-model.ts` (what a run IS) and
 * `./place-inputs.ts` (what a run is graded AGAINST); this holds what a run
 * SAYS ABOUT ITSELF afterwards, and `./place.ts` is left as the run. It also put
 * `place.ts` back under the 500-line ceiling, which the invocation counting took
 * it past.
 *
 * **IT DECIDES NOTHING AND GRADES NOTHING.** Every verdict here is handed in:
 * the scores are the candidate's, the rule and the bound are `./stop.ts`'s and
 * `./report.ts`'s, the hashes are `./geometry-inputs.ts`'s and the commits are
 * `tools/perfboard/acquire.ts`'s. What this file owns is that `canonical` and
 * `provenance` stay separate - a run that reproduces in twice the machine time
 * has still reproduced - and `./run-dir.ts` is where that separation is stated.
 *
 * **WHAT IT DOES COMPUTE IS TWO HASHES AND ONE READ, AND EACH IS HERE SO THERE
 * IS ONE OF IT.** The netlist's and the rules file's `sha256` are taken from the
 * FILES the gate will hash (`./adopt-checks.ts`), not from text a caller held;
 * and `A_occ` is read off the candidate's own ranking tuple by
 * `occupiedAreaOf`, which moved here from `./place.ts` when a second producer
 * arrived - see that function.
 *
 * **IT SERVES TWO PRODUCERS, WHICH IS WHY `ManifestFacts` NAMES NO `RunResult`.**
 * `./place.ts` runs the fork-gesture search; `./materialize-run.ts` constructs a
 * candidate per seed in the model and materialises the best. Both end holding an
 * `Evaluation`, a restart schedule and an evaluation count, so those are the
 * three fields this file takes - a `RunResult` here would have made the record
 * reachable only from a search.
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import { boundFor } from "./report.ts"
import { pinPatternClosureHash, spanClosureHash } from "./geometry-inputs.ts"
import { refuse } from "./place-model.ts"
import { A_OCC_POSITION, RANKING_POSITIONS } from "./rank.ts"
import { RULES_PATH } from "./rules.ts"
import {
  canonicalHash,
  type CanonicalInputs,
  type CanonicalMetrics,
  type RunManifest,
} from "./run-dir.ts"
import type { Evaluation } from "./climb.ts"
import type { Outcome } from "./report-model.ts"
import type { SeedArm } from "./seed.ts"
import type { StoppingRule } from "./stop-model.ts"
import type { StripboardRules } from "./rules.ts"

function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/**
 * This repository's own commit, for `run.json`'s canonical inputs.
 *
 * **IT LIVES BESIDE THE RECORD RATHER THAN BESIDE ONE PRODUCER.** It was
 * private to `./place.ts` until `./materialize-run.ts` needed the same figure;
 * two `git rev-parse` calls with two refusals would be two places for one
 * provenance claim to be wrong.
 */
export function pipelineCommit(repoRoot: string): string {
  const run = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" })
  const text = typeof run.stdout === "string" ? run.stdout.trim() : ""
  if (run.status !== 0 || text === "") {
    throw new Error(
      `pipelineCommit: git rev-parse HEAD in ${repoRoot} exited ${String(run.status)}, so this ` +
        "run cannot record which pipeline commit produced it. run-dir.ts refuses a blank " +
        "pipelineCommit for the reason it refuses a blank builtCommit: a provenance claim that " +
        "says nothing. It is not defaulted.",
    )
  }
  return text
}

/**
 * `A_occ` off the candidate's own ranking tuple, with the tuple's shape checked
 * rather than assumed.
 *
 * `Evaluation` CARRIES NO DUMP, so the area cannot be re-measured here - the
 * figure reaches a record as the fourth position of the tuple `./rank.ts`'s
 * `rankingTuple` built. The first three positions ARE the score's three line
 * counts, so holding them against the score proves this tuple is that tuple: an
 * index read off a reordered tuple would otherwise put wirelength in the
 * manifest under `A_occ`'s name and pass.
 *
 * **IT LIVES HERE BECAUSE THERE WERE THREE COPIES OF IT AND ONE RECORD.**
 * `./place.ts` and `tests/stripboard/determinism-fixtures.ts` each carried their
 * own, and `./materialize-run.ts` would have been the third; one index into one
 * tuple with three owners is two owners too many. The refusal is
 * `place-ranking-shape`, which is where it was raised from before the move.
 */
export function occupiedAreaOf(best: Evaluation): number {
  const expected = [best.score.cuts, best.score.wires, best.score.solder]
  const leading = best.ranking.slice(0, expected.length)
  if (best.ranking.length !== RANKING_POSITIONS || leading.join(",") !== expected.join(",")) {
    refuse(
      "place-ranking-shape",
      `this candidate's ranking tuple is [${best.ranking.join(", ")}] against a score of ` +
        `C = ${best.score.cuts}, W = ${best.score.wires}, S = ${best.score.solder}`,
    )
  }
  const area = best.ranking[A_OCC_POSITION]
  if (area === undefined) {
    refuse("place-ranking-shape", `position ${A_OCC_POSITION} of the ranking tuple is absent`)
  }
  return area
}

/** Everything `manifestFor` needs that it does not compute. */
export interface ManifestFacts {
  /** The candidate this record is about, already scored, graded and ranked. */
  readonly best: Evaluation
  /** Where each restart began, in evaluations - one shorter than the restart count. */
  readonly restartBoundaries: readonly number[]
  /** How many candidates the run evaluated, summed across its restarts. */
  readonly evaluations: number
  /**
   * The netlist file in the run directory, hashed HERE rather than handed in.
   *
   * `./adopt-checks.ts` hashes `<runDir>/<board>.net` and compares it with
   * `inputs.netlistSha256`, so the recorded hash is taken from that same file -
   * never from the text a caller happened to write into it, which would be two
   * readings of one quantity and one encoding accident away from a refusal
   * nobody could explain.
   */
  readonly netlistFile: string
  readonly rules: StripboardRules
  readonly arm: SeedArm
  readonly rule: StoppingRule
  readonly outcome: Outcome
  readonly stamp: string
  readonly startedAt: Date
  /** Every fork invocation this run made, counted at the producer's one choke point. */
  readonly invocations: number
  readonly seed: number
  readonly verorouteCommit: string
  readonly builtCommit: string
  readonly pipelineCommit: string
}

export function manifestFor(facts: ManifestFacts): RunManifest {
  const inputs: CanonicalInputs = {
    candidateSha256: sha256OfFile(facts.best.candidate),
    rulesSha256: sha256OfFile(RULES_PATH),
    netlistSha256: sha256OfFile(facts.netlistFile),
    // THE CLOSURE, NOT THE FILE, and `lib/import-closure.ts` carries why: the
    // bounds HC4/HC5/HC9/HC10 grade a candidate by are computed at module load
    // by files neither entry point IS, so a one-file hash let the bend
    // arithmetic and the hole clamp move after a run with the hash still
    // matching. The gate recomputes the same two numbers with the same
    // function, so producer and gate cannot disagree about what was covered.
    spanClosureSha256: spanClosureHash(),
    pinPatternClosureSha256: pinPatternClosureHash(),
    seeds: facts.rules.seeds,
    // THE SEED THAT PRODUCED `best`, read off the candidate's own directory
    // rather than guessed: both producers write each restart under `seed-<n>/`,
    // so the winning board's path names its seed and a run whose best came from
    // the third restart does not record the first.
    seed: facts.seed,
    seedArm: facts.arm,
    verorouteCommit: facts.verorouteCommit,
    builtCommit: facts.builtCommit,
    pipelineCommit: facts.pipelineCommit,
  }
  const metrics: CanonicalMetrics = {
    cuts: facts.best.score.cuts,
    wires: facts.best.score.wires,
    solder: facts.best.score.solder,
    objective: facts.best.score.objective,
    netCount: facts.best.score.netCount,
    joins: facts.best.score.joins,
    occupied: facts.best.score.occupied,
    clustering: facts.best.score.clustering,
    occupiedArea: occupiedAreaOf(facts.best),
    constraints: Object.fromEntries(
      facts.best.results.map((entry) => [entry.id, entry.held] as const),
    ),
    ranking: facts.best.ranking,
    stoppingRule: facts.rule,
    bound: boundFor(facts.rule),
    outcome: facts.outcome,
    restartBoundaries: facts.restartBoundaries,
  }
  const finished = new Date()
  const durationMs = finished.getTime() - facts.startedAt.getTime()
  return {
    canonical: { inputs, metrics, hash: canonicalHash(inputs, metrics) },
    provenance: {
      stamp: facts.stamp,
      startedAt: facts.startedAt.toISOString(),
      durationMs,
      host: process.platform,
      // MEASURED, NOT PREDICTED: `invocations` is every call this run made
      // through the one spawn choke point - the import, every arm gesture,
      // every gesture and paint and dump of every candidate including the
      // unscoreable ones, and the final --dump-board. The comment at the top of
      // `place` carries the four ways the old `evaluations * 4` divisor was
      // wrong.
      msPerInvocation: facts.invocations === 0 ? 0 : durationMs / facts.invocations,
      invocations: facts.invocations,
      evaluations: facts.evaluations,
    },
  }
}
