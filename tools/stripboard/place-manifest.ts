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
 * **IT DECIDES NOTHING AND MEASURES NOTHING.** Every figure here is handed in:
 * the scores are the candidate's, the rule and the bound are `./stop.ts`'s and
 * `./report.ts`'s, the hashes are `./geometry-inputs.ts`'s and the commits are
 * `tools/perfboard/acquire.ts`'s. What this file owns is that `canonical` and
 * `provenance` stay separate - a run that reproduces in twice the machine time
 * has still reproduced - and `./run-dir.ts` is where that separation is stated.
 */
import { createHash } from "node:crypto"
import fs from "node:fs"
import { boundFor } from "./report.ts"
import { pinPatternClosureHash, spanClosureHash } from "./geometry-inputs.ts"
import { RULES_PATH } from "./rules.ts"
import {
  canonicalHash,
  type CanonicalInputs,
  type CanonicalMetrics,
  type RunManifest,
} from "./run-dir.ts"
import type { Prepared } from "./place-inputs.ts"
import type { RunResult } from "./search.ts"
import type { Outcome } from "./report-model.ts"
import type { SeedArm } from "./seed.ts"
import type { StoppingRule } from "./stop-model.ts"
import type { StripboardRules } from "./rules.ts"

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/** Everything `manifestFor` needs that it does not compute. */
export interface ManifestFacts {
  readonly result: RunResult
  readonly prepared: Prepared
  readonly rules: StripboardRules
  readonly arm: SeedArm
  readonly rule: StoppingRule
  readonly outcome: Outcome
  readonly occupiedArea: number
  readonly stamp: string
  readonly startedAt: Date
  /** Every fork invocation this run made, counted at `./place.ts`'s one choke point. */
  readonly invocations: number
  readonly seed: number
  readonly verorouteCommit: string
  readonly builtCommit: string
  readonly pipelineCommit: string
}

export function manifestFor(facts: ManifestFacts): RunManifest {
  const inputs: CanonicalInputs = {
    candidateSha256: sha256OfFile(facts.result.best.candidate),
    rulesSha256: sha256OfFile(RULES_PATH),
    netlistSha256: sha256(facts.prepared.netlistText),
    // THE CLOSURE, NOT THE FILE, and `lib/import-closure.ts` carries why: the
    // bounds HC4/HC5/HC9/HC10 grade a candidate by are computed at module load
    // by files neither entry point IS, so a one-file hash let the bend
    // arithmetic and the hole clamp move after a run with the hash still
    // matching. The gate recomputes the same two numbers with the same
    // function, so producer and gate cannot disagree about what was covered.
    spanClosureSha256: spanClosureHash(),
    pinPatternClosureSha256: pinPatternClosureHash(),
    seeds: facts.rules.seeds,
    // THE SEED OF THE CLIMB THAT PRODUCED `best`, read off the candidate's own
    // directory rather than guessed: `search` writes each climb under
    // `seed-<n>/`, so the winning board's path names its seed and a run whose
    // best came from the third restart does not record the first.
    seed: facts.seed,
    seedArm: facts.arm,
    verorouteCommit: facts.verorouteCommit,
    builtCommit: facts.builtCommit,
    pipelineCommit: facts.pipelineCommit,
  }
  const metrics: CanonicalMetrics = {
    cuts: facts.result.best.score.cuts,
    wires: facts.result.best.score.wires,
    solder: facts.result.best.score.solder,
    objective: facts.result.best.score.objective,
    netCount: facts.result.best.score.netCount,
    joins: facts.result.best.score.joins,
    occupied: facts.result.best.score.occupied,
    clustering: facts.result.best.score.clustering,
    occupiedArea: facts.occupiedArea,
    constraints: Object.fromEntries(
      facts.result.best.results.map((entry) => [entry.id, entry.held] as const),
    ),
    ranking: facts.result.best.ranking,
    stoppingRule: facts.rule,
    bound: boundFor(facts.rule),
    outcome: facts.outcome,
    restartBoundaries: facts.result.restartBoundaries,
  }
  const evaluations = facts.result.climbs.reduce((total, climb) => total + climb.evaluations, 0)
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
      evaluations,
    },
  }
}
