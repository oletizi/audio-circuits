/**
 * `place`: the run the owner would actually make - import, seed, climb, escape,
 * stop, grade, report - and the seed-set sweep beside it.
 *
 * THE AUTHORITY is the plan's Task 23 and, for `B1-frozen`, CRITERIA section 3
 * through `./seed-compare.ts`'s `FROZEN_MARK`. Where this module and those
 * documents differ they win and this comment is the defect.
 *
 * **IT IS THE FIRST PLACE THE CHAIN EXISTS AS A CHAIN**, which is what the
 * plan's CHECKPOINT 2 is about: every test of Tasks 16 to 21 drives one link
 * with a scripted spawn, and nothing before this produced a `bound` and an
 * `outcome` from the machinery rather than from a fixture. So this module
 * assembles and does not decide: the targets are `./targets.ts`'s, the arms
 * `./seed.ts`'s, the climb `./climb.ts`'s, the restarts `./search.ts`'s, the
 * stop `./stop.ts`'s, the verdict `./verdict.ts`'s through `./report.ts`'s one
 * `verdictOf`, and the run directory `./run-dir.ts`'s. **Nothing here grades, scores
 * or ranks anything.**
 *
 * **IT IS THREE FILES FOR THE 500-LINE CEILING**, at two seams this task's own
 * shape draws: `./place-model.ts` is what a run IS (its inputs, its result, its
 * refusals), `./place-inputs.ts` is what a run is graded AGAINST (the
 * declaration, the export, the footprints, the targets, the stock), and this
 * file is what running one DOES. The two below spawn nothing and write nothing.
 *
 * **WHAT IT WRITES, AND WHERE.** Only under `build/stripboard/<board>/<stamp>/`:
 * the netlist it checked against, the `--import`-placed board every arm starts
 * from, one directory per climb, and `run.json`. **It never writes under
 * `boards/`** - it reads the declaration and, read-only, the committed layout,
 * for the one fact a declaration does not carry (which way the strips run).
 *
 * **TWO FACTS THE FROZEN RUN TAKES FROM FILES BESIDE THE FIXTURE, AND WHY
 * NEITHER COMES FROM TODAY'S MODEL.** `B1-frozen` is stated against *"the exact
 * electrical model, footprints and board dimensions the hand layout was built
 * for - 9 nets, 27 pins"*, and the committed export is EESchema v1.1: a grammar
 * with no footprint field. So the footprints come from
 * `<fixture>.footprints.json`, extracted from the model at that same commit,
 * and the board's own strip count from `<fixture>.dump`'s `GRID` line - the
 * fixture's own authority, never a literal here or in a test. Reading either
 * off today's low-boost model would grade a 9-net hand layout against a 14-net
 * circuit, which that fixture's provenance forbids in those words.
 *
 * **`Q6` CANNOT FIRE IN A RUN THIS MODULE MAKES, AND THAT IS STATED RATHER THAN
 * HIDDEN.** `StopState.signatures` is *"every failure signature the run has
 * recorded"*, and `ClimbResult` carries none: `signatureOf` needs a dump per
 * evaluation and the climb keeps no dump beyond the one it is standing on. So
 * the list this module builds is empty, `Q6` is `false` on every real run, and
 * a systematic-cause stop is unreachable from here. It is NOT approximated from
 * the failing-constraint ids alone, which would be a different signature than
 * the one `Q6` is specified over. Recorded in
 * `docs/stripboard/pipeline-verification.md` as a CHECKPOINT 2 finding, because
 * *"a `StoppingRule` that never fires in a real run"* is one of the three
 * defects that checkpoint exists to catch.
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { builtCommit, readPin } from "../perfboard/acquire.ts"
import { verorouteBinary } from "../perfboard/check.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { necessaryCuts } from "./cut-necessity.ts"
import {
  notDefaultedBecause,
  refuse,
  type PlaceInput,
  type PlaceRun,
  type SeedSweep,
} from "./place-model.ts"
import { prepare } from "./place-inputs.ts"
import { A_OCC_POSITION, RANKING_POSITIONS } from "./rank.ts"
import { boundFor, outcomeOf, verdictOf, type ReportInput } from "./report.ts"
import { pinPatternClosureHash, spanClosureHash } from "./geometry-inputs.ts"
import { RULES_PATH, type StripboardRules } from "./rules.ts"
import {
  canonicalHash,
  runDirectory,
  writeManifest,
  type CanonicalInputs,
  type CanonicalMetrics,
} from "./run-dir.ts"
import { search, type RunResult } from "./search.ts"
import { FROZEN_MARK, meetsMark } from "./seed-compare.ts"
import { type SpawnVeroroute } from "./seed.ts"
import { evaluateStop, type StopState } from "./stop.ts"
import type { BoardTargets } from "./targets.ts"

export {
  notDefaultedBecause,
  type PlaceInput,
  type PlaceRefusal,
  type PlaceRun,
  type SeedSweep,
} from "./place-model.ts"

/**
 * The pinned fork, spawned for real, with stdout and stderr kept apart.
 *
 * **IT IS THE DEFAULT AND NOT A FALLBACK.** Every test injects its own spawn -
 * the posture `tools/perfboard/check.ts` set and `./seed.ts` restates - and
 * this is the one place the production path resolves a binary. It THROWS for a
 * signal death rather than reporting a status, because a killed fork wrote no
 * board and a status of `null` read as a number is a candidate scored from
 * nothing.
 */
export function verorouteSpawn(): SpawnVeroroute {
  const binary = verorouteBinary(process.env, moduleRepoRoot())
  return (args) => {
    const run = spawnSync(binary, [...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    if (run.error !== undefined) {
      throw new Error(`could not run veroroute at ${binary}: ${run.error.message}`)
    }
    if (run.status === null) {
      throw new Error(`veroroute at ${binary} was killed by a signal running: ${args.join(" ")}`)
    }
    return {
      status: run.status,
      stdout: typeof run.stdout === "string" ? run.stdout : "",
      stderr: typeof run.stderr === "string" ? run.stderr : "",
    }
  }
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex")
}

function sha256OfFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

/** This repository's own commit, for `run.json`'s canonical inputs. */
function pipelineCommit(repoRoot: string): string {
  const run = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" })
  const text = typeof run.stdout === "string" ? run.stdout.trim() : ""
  if (run.status !== 0 || text === "") {
    throw new Error(
      `place: git rev-parse HEAD in ${repoRoot} exited ${String(run.status)}, so this run ` +
        "cannot record which pipeline commit produced it. run-dir.ts refuses a blank " +
        "pipelineCommit for the reason it refuses a blank builtCommit: a provenance claim that " +
        "says nothing. It is not defaulted.",
    )
  }
  return text
}

/** `A_occ` off the candidate's own tuple, with the tuple's shape checked rather than assumed. */
function occupiedAreaOf(result: RunResult): number {
  const best = result.best
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

/**
 * The counters the six stopping rules read, built from what the search
 * recorded.
 *
 * `signatures` IS EMPTY AND `Q6` THEREFORE CANNOT FIRE - see the module comment.
 */
function stopStateOf(
  result: RunResult,
  seeds: number,
  frozen: boolean | undefined,
): StopState {
  const last = result.climbs.at(-1)
  if (last === undefined) {
    throw new Error(
      "place: this run reports no climb, so there is no round whose accepted count Q3 could " +
        "read. tools/stripboard/search.ts throws before returning such a run, so reaching here " +
        "means a RunResult was built by hand.",
    )
  }
  return {
    climbHistory: result.climbs.map((climb) => climb.best.score.objective),
    climbEvaluations: result.climbs.map((climb) => climb.evaluations),
    runEvaluations: result.climbs.reduce((total, climb) => total + climb.evaluations, 0),
    seedsRemaining: seeds - result.climbs.length,
    signatures: [],
    acceptedThisRound: last.acceptedPerRound.at(-1) ?? 0,
    frozen,
  }
}

/** The clock, read once per run, for the run directory's name and nothing else. */
function stampNow(): string {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

/**
 * One run: import, search, stop, grade, and `run.json`.
 *
 * `arm` is the caller's and is never chosen here - `parseSeedArm` is where text
 * becomes one, and `tools/cli/perfboard-stripboard-verbs.ts` refuses a `place`
 * with no `--seed-arm` rather than selecting the control.
 */
export async function place(
  input: PlaceInput,
  spawn: SpawnVeroroute = verorouteSpawn(),
): Promise<PlaceRun> {
  const repoRoot = moduleRepoRoot()
  const startedAt = new Date()
  const prepared = await prepare(input, repoRoot, spawn)
  const stamp = input.stamp ?? `${stampNow()}-${input.arm}${prepared.frozen === true ? "-frozen" : ""}`
  const runDir = runDirectory(prepared.board, stamp)
  fs.mkdirSync(runDir, { recursive: true })

  const netlistPath = path.join(runDir, `${prepared.board}.net`)
  fs.writeFileSync(netlistPath, prepared.netlistText)
  const imported = path.join(runDir, "imported.vrt")
  const importRun = spawn(["--import", netlistPath, "-o", imported, "--strips", prepared.strips])
  if (importRun.status !== 0) {
    refuse(
      "place-import-failed",
      `--import ${netlistPath} exited ${importRun.status}: ${importRun.stderr.trim()}`,
    )
  }

  const result = search(
    {
      importedBoard: imported,
      runDir,
      netlist: netlistPath,
      targets: prepared.targets,
      reference: prepared.reference,
      footprints: prepared.footprints,
      stock: prepared.stock,
      rules: input.rules,
      // ONE GESTURE PER CANDIDATE, never `--move-batch`: Task 9's batch *"buys
      // breadth and not correctness"*, and a run that batched would not be the
      // run every measurement in docs/stripboard/pipeline-verification.md was
      // taken on.
      batch: false,
      arm: input.arm,
    },
    spawn,
  )
  const rule = evaluateStop(
    stopStateOf(result, input.rules.seeds.length, prepared.frozen),
    result.best,
    prepared.targets,
    input.rules,
  )
  if (rule === null) {
    refuse(
      "place-no-stop",
      `${prepared.board} ran ${result.climbs.length} climb(s) of ${input.rules.seeds.length} ` +
        `seed(s) and no rule fired`,
    )
  }

  // THE DROP TEST, ONCE, ON THE CANDIDATE THE REPORT IS ABOUT - never once per
  // candidate, which is what `1aa0834` did and what the revert removed: it cost
  // a measured 17-57% of the run's wall clock and found no disagreement in
  // 2,267 scored candidates. It is a FOURTH invocation on one board rather than
  // a fifth on every board, and the recorded four-per-evaluation cost model is
  // untouched by it. The board is the painted file the climb already wrote, so
  // this reads the same copper `result.best.score` was derived from.
  const bestDump = spawn(["--dump-board", result.best.candidate])
  if (bestDump.status !== 0) {
    refuse(
      "place-best-dump-failed",
      `--dump-board ${result.best.candidate} exited ${bestDump.status}: ` +
        bestDump.stderr.trim(),
    )
  }
  const necessity = necessaryCuts(bestDump.stdout, prepared.reference)

  const reportInput: ReportInput = {
    run: result,
    rule,
    targets: prepared.targets,
    frozen: prepared.frozen,
    rules: input.rules,
    necessaryCuts: necessity.necessary,
    // NO BINDING CONSTRAINT IS CLAIMED. `K3` refuses to move `kappa_bench` on a
    // search that stopped, and naming one here would be this module asserting
    // constraint-side evidence it did not measure. `./verdict.ts` reports its
    // absence in `A2`'s detail, which is what REP2 asks for.
    binding: undefined,
  }
  const verdict = verdictOf(reportInput)
  const outcome = outcomeOf(verdict)
  const bound = boundFor(rule)
  const stampedBuild = builtCommit(repoRoot)
  if (stampedBuild === undefined) {
    refuse("place-built-commit-unknown", `no build stamp under ${repoRoot}/.tools`)
  }
  const inputs: CanonicalInputs = {
    candidateSha256: sha256OfFile(result.best.candidate),
    rulesSha256: sha256OfFile(RULES_PATH),
    netlistSha256: sha256(prepared.netlistText),
    // THE CLOSURE, NOT THE FILE, and `lib/import-closure.ts` carries why: the
    // bounds HC4/HC5/HC9/HC10 grade a candidate by are computed at module load
    // by files neither entry point IS, so a one-file hash let the bend
    // arithmetic and the hole clamp move after a run with the hash still
    // matching. The gate recomputes the same two numbers with the same
    // function, so producer and gate cannot disagree about what was covered.
    spanClosureSha256: spanClosureHash(),
    pinPatternClosureSha256: pinPatternClosureHash(),
    seeds: input.rules.seeds,
    // THE SEED OF THE CLIMB THAT PRODUCED `best`, read off the candidate's own
    // directory rather than guessed: `search` writes each climb under
    // `seed-<n>/`, so the winning board's path names its seed and a run whose
    // best came from the third restart does not record the first.
    seed: seedOfCandidate(result.best.candidate, input.rules.seeds),
    seedArm: input.arm,
    verorouteCommit: readPin(path.join(repoRoot, "veroroute.pin")).commit,
    builtCommit: stampedBuild,
    pipelineCommit: pipelineCommit(repoRoot),
  }
  const metrics: CanonicalMetrics = {
    cuts: result.best.score.cuts,
    wires: result.best.score.wires,
    solder: result.best.score.solder,
    objective: result.best.score.objective,
    netCount: result.best.score.netCount,
    joins: result.best.score.joins,
    occupied: result.best.score.occupied,
    clustering: result.best.score.clustering,
    occupiedArea: occupiedAreaOf(result),
    constraints: Object.fromEntries(
      result.best.results.map((entry) => [entry.id, entry.held] as const),
    ),
    ranking: result.best.ranking,
    stoppingRule: rule,
    bound,
    outcome,
    restartBoundaries: result.restartBoundaries,
  }
  const evaluations = result.climbs.reduce((total, climb) => total + climb.evaluations, 0)
  const finished = new Date()
  const durationMs = finished.getTime() - startedAt.getTime()
  const manifest = {
    canonical: { inputs, metrics, hash: canonicalHash(inputs, metrics) },
    provenance: {
      stamp,
      startedAt: startedAt.toISOString(),
      durationMs,
      host: process.platform,
      // FOUR INVOCATIONS PER EVALUATION is the recorded cost model
      // (`./climb-evaluate.ts`), so this is the per-invocation figure that cost
      // model predicts and not a second measurement of it.
      msPerInvocation: evaluations === 0 ? 0 : durationMs / (evaluations * 4),
      evaluations,
    },
  }
  writeManifest(runDir, manifest)
  return {
    search: result,
    // ONE STATEMENT, so the candidate a consumer reads and the run the report
    // is rendered from cannot come from two places.
    best: result.best,
    rule,
    targets: prepared.targets,
    rules: input.rules,
    frozen: prepared.frozen,
    runDir,
    manifest,
    outcome,
    // `A4`'s own verdict, which on the frozen fixture IS `B1-frozen`'s clause
    // through `meetsMark(FROZEN_MARK)` and on the scaffolded board is
    // `B1-current`'s. Read off the verdict rather than re-compared here, so the
    // sweep below counts the clause the run was graded by and not a second one.
    metClause: verdict.a4,
    // THE SAME NUMBER THE REPORT ABOVE WAS RENDERED FROM, from one drop test on
    // one dump, so `reportInputOf` rebuilding the input in the CLI cannot print
    // a second reading of this candidate's cuts.
    necessaryCuts: necessity.necessary,
  }
}

/** Which seed's climb wrote this candidate, from the directory `search` named for it. */
function seedOfCandidate(candidate: string, seeds: readonly number[]): number {
  for (const seed of seeds) {
    if (candidate.includes(`${path.sep}seed-${seed}${path.sep}`)) return seed
  }
  throw new Error(
    `place: the best candidate ${candidate} is in none of this run's seed directories ` +
      `(${seeds.map((seed) => `seed-${seed}`).join(", ")}), so which seed produced it is not in ` +
      "the data. It is not defaulted to the first: run.json's canonical seed would then record " +
      "a schedule position the result did not come from. tools/stripboard/search.ts creates one " +
      "directory per climb named for its seed; a change to that naming lands here.",
  )
}

/**
 * One `place` per seed of `rules.seeds`, each with that seed alone, and the
 * rate as a DIAGNOSTIC.
 *
 * **EACH RUN GETS THE FULL BUDGET AND THAT IS THE MEASUREMENT'S COST, STATED.**
 * `Q5`'s cap is run-level, so a sweep over five seeds is five full-cap runs
 * rather than one run's cap divided five ways - *"which would make the rate a
 * comparison between unlike runs."* It is not worked around by shortening the
 * later seeds.
 *
 * **THE VERDICT IS THE FIRST RUN'S, AND IS NOT A FUNCTION OF `reached`.** Both
 * outcome fields are set from `runs[0]` in one statement below.
 */
export async function placeAcrossSeeds(
  input: PlaceInput,
  spawn: SpawnVeroroute = verorouteSpawn(),
): Promise<SeedSweep> {
  const runs: PlaceRun[] = []
  const perSeed: SeedSweep["perSeed"][number][] = []
  for (const seed of input.rules.seeds) {
    const run = await place({ ...input, rules: { ...input.rules, seeds: [seed] } }, spawn)
    runs.push(run)
    perSeed.push({
      seed,
      cuts: run.best.score.cuts,
      wires: run.best.score.wires,
      bound: boundFor(run.rule),
      outcome: run.outcome,
    })
  }
  const first = runs[0]
  if (first === undefined) {
    throw new Error(
      "placeAcrossSeeds: the rules carry no seeds, so no run was made and there is no verdict " +
        "to report. tools/stripboard/rules.ts refuses an empty seed list when it loads one, so " +
        "reaching here means a rules object was built by hand. It is not defaulted to an empty " +
        "sweep: a rate of zero of zero is a number that came from no measurement.",
    )
  }
  return {
    perSeed,
    reached: runs.filter((run) => run.metClause).length,
    // TWO FIELDS, ONE VALUE, SET IN ONE STATEMENT. The plan requires that a
    // change deriving the reported outcome from the rate FAIL rather than pass
    // quietly, and the test that holds these two against each other is what
    // fails; writing them from one expression is what makes that test's
    // agreement a property of this module rather than a coincidence.
    singleRunVerdict: first.outcome,
    reportedOutcome: first.outcome,
    first,
  }
}

/**
 * What `renderReport` is handed, for a single run or for a sweep.
 *
 * **ONE FUNCTION FOR BOTH, BECAUSE THE SWEEP'S REPORT IS THE FIRST RUN'S
 * REPORT** with the diagnostic appended - not a second report with a second
 * verdict. The sweep carries that run whole for exactly this reason.
 */
export function reportInputOf(run: PlaceRun | SeedSweep): ReportInput {
  if ("perSeed" in run) {
    return { ...reportInputOf(run.first), sweep: run }
  }
  return {
    run: run.search,
    rule: run.rule,
    targets: run.targets,
    rules: run.rules,
    frozen: run.frozen,
    binding: undefined,
    necessaryCuts: run.necessaryCuts,
  }
}

/**
 * Whether this candidate meets `B1-frozen`'s clause, for a caller that has a
 * score and no verdict.
 *
 * **IT IS `./seed-compare.ts`'s `meetsMark` AND NOT A SECOND COMPARISON.**
 * `PlaceRun.metClause` is the verdict's `A4` and is what the sweep counts; this
 * is the same mark read off a score for a reader checking one board, and both
 * go through that module's one implementation.
 */
export function meetsFrozenMark(run: PlaceRun): boolean {
  return meetsMark(
    {
      cuts: run.best.score.cuts,
      wires: run.best.score.wires,
      netsComplete: run.best.results.some((entry) => entry.id === "HC1" && entry.held),
    },
    FROZEN_MARK,
  )
}
