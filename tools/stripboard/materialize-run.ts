/**
 * `materializeRun`: the run directory a MATERIALISATION produces, assembled so
 * that `./adopt.ts`'s gate can read it without being relaxed.
 *
 * THE AUTHORITY is CRITERIA `G2.1`-`G2.5`
 * (`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` §9) as
 * `./adopt-checks.ts` implements it, and the plan's Task 6
 * (`docs/superpowers/plans/2026-10-16-low-boost-to-adoption.md`). Where this
 * module and those differ they win and this comment is the defect.
 *
 * **IT IS THE SECOND PRODUCER OF A RUN DIRECTORY, NOT A SECOND GATE.** `./place.ts`
 * runs the fork-gesture search and writes `run.json` through
 * `./place-manifest.ts`; this writes the same record for the pipeline the Pultec
 * sections actually go through - the candidate CONSTRUCTED in the model, then
 * `--materialize`d onto a base built fresh by `--import`. Nothing here was added
 * to or taken out of the gate: the gate's checks are
 * untouched, and the run directory this writes is read by exactly the functions
 * `adoptLayout` calls.
 *
 * **WHAT IT WRITES, AND WHERE.** Only under `build/stripboard/<board>/<stamp>/`:
 *
 *   - `<board>.net` - the netlist every candidate was graded against, the
 *     chain's second link and the file `inputs.netlistSha256` is taken from;
 *   - `imported.vrt` - the base built fresh by `--import` from that netlist,
 *     which is the board every materialisation starts from
 *     (`./materialize-base.ts` states that rule and why the committed `.vrt` is
 *     never it);
 *   - `seed-<n>/layout.txt`, `seed-<n>/materialized.vrt`, `seed-<n>/candidate.vrt`
 *     per seed of the reviewed list - the declarative document, the board the
 *     fork wrote from it, and the painted board the grade was read off;
 *   - `run.json`;
 *   - `owner-approval.txt` - what `stripboard/render-approvals.json` says about
 *     this board at this candidate's hash, with his words quoted in full when it
 *     says anything. See the paragraph on it below.
 *
 * **IT NEVER WRITES UNDER `boards/`.** `./adopt.ts` is still the only thing in
 * this pipeline that does. It reads the declaration, the circuit module and -
 * read-only, through `prepare` - one `--dump-board` of the committed layout for
 * the strip direction.
 *
 * **EVERY HASH IS COMPUTED FROM THE FILE THE GATE WILL HASH, NEVER COPIED.**
 * `./place-manifest.ts` takes the netlist's path rather than its text and the
 * rules file's path rather than a figure, and the two closure hashes come from
 * `./geometry-inputs.ts`'s own functions - the SAME functions
 * `./adopt-checks.ts` recomputes with, so producer and gate cannot disagree
 * about what was covered.
 *
 * **THIS RUN PERFORMS NO SEARCH AND THE RECORD NOW SAYS SO.** A materialisation
 * run's only dimension is the restart schedule: it constructs one candidate per
 * seed of `rules.seeds`, grades each, and keeps the cheapest. **There is no
 * move-set round in it at all**, because nothing in this repository can propose
 * a move on a materialised board - `./seed-geometry.ts`'s `occupancyOf` refuses
 * a part facing `N` or `S`, which is most of a materialised board, and
 * `lib/stripboard/moves.ts` refuses a model candidate carrying an off-board pad
 * (`docs/known-gaps.md` G22).
 *
 * So it records `./termination.ts`'s `NO_SEARCH` where a search records its
 * rule, and it calls `evaluateStop` NOT AT ALL. **What that replaced was a false
 * claim, and naming it is the point of this paragraph.** Until 2026-10-16 this
 * module built a `StopState` whose `acceptedThisRound` was `0` - *"a full sweep
 * of the move set that produced no accepted move"*, about a move set nobody
 * swept - handed it to `evaluateStop`, got `Q3`, and then had to refuse to write
 * the run at all, because `exitCodeFor("admissible", "Q3")` is zero and `G2.5`
 * would have admitted the board on that clause. The counters are gone with the
 * claim: a producer with no round to report now says it has none instead of
 * reporting an empty one.
 *
 * **WHAT RECORDING `NO_SEARCH` DOES NOT BUY.** It earns no bound and no
 * admission of its own: `G2.5` admits through `exitCodeFor(outcome, rule)` over
 * `Q1`-`Q6`, so a run carrying it is adopted only on the OWNER'S RECORDED CALL
 * ON A RENDER of that board - acceptance channel 4 of
 * `docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, recorded per
 * board and per candidate hash in `stripboard/render-approvals.json`. With no
 * such record `./adopt-verdict.ts` refuses the run directory, which is where the
 * old unconditional refusal left it. `./termination.ts`'s `NO_SEARCH_NOTE` is
 * the sentence, and `docs/known-gaps.md` G21 and G27 carry the state.
 *
 * **SO THE RUN DIRECTORY SAYS WHAT THAT REGISTRY SAYS ABOUT THIS BOARD**, in
 * `owner-approval.txt` - a record for a person and not a second gate.
 * `./materialize-approval.ts` is the one write and carries why it decides
 * nothing.
 */
import fs from "node:fs"
import path from "node:path"
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../lib/stripboard/board.ts"
import { seedPartsFrom } from "../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../lib/stripboard/seed.ts"
import { builtCommit, readPin } from "../perfboard/acquire.ts"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { measure, type Evaluation } from "./climb-evaluate.ts"
import { boardGeometry } from "./copper.ts"
import { writeApprovalRecord } from "./materialize-approval.ts"
import { freshImportBase } from "./materialize-base.ts"
import { prepare, type Prepared } from "./place-inputs.ts"
import { manifestFor, pipelineCommit } from "./place-manifest.ts"
import { exitCodeFor, outcomeOf, type Outcome } from "./report.ts"
import type { StripboardRules } from "./rules.ts"
import { runDirectory, writeManifest, type RunManifest } from "./run-dir.ts"
import { assignStrips } from "./seed-arrangement.ts"
import type { SpawnVeroroute } from "./seed.ts"
import { isStoppingRule, NO_SEARCH, type Termination } from "./termination.ts"
import { admissible } from "./verdict.ts"
import { materialize } from "./vero-export.ts"

/** The refusals this producer raises. One arm each in `notDefaultedBecause`. */
export type MaterializeRunRefusal =
  | "materialize-run-no-candidate"
  | "materialize-run-strips-disagree"
  | "materialize-run-rule-load-bearing"

/** What is missing, where to fix it, and why nothing is substituted. */
export function notDefaultedBecause(refusal: MaterializeRunRefusal): string {
  switch (refusal) {
    case "materialize-run-no-candidate":
      return (
        "lib/stripboard/seed.ts's seedsFrom returns one candidate per ordering and this run " +
        "hands it exactly one, so an empty list means the constructor stopped having a result " +
        "without refusing. It is NOT defaulted to another seed's candidate: every figure this " +
        "run records would then be a statement about an ordering it did not name, and " +
        "run.json's canonical seed is the field that makes a result reproducible. Fix seedsFrom " +
        "or the ordering."
      )
    case "materialize-run-strips-disagree":
      return (
        "Which way the strips run is a fact about the board in hand, and the model has no " +
        "field for it: Candidate.grid is {strips, columns} with no axis, and " +
        "tools/stripboard/vero-export.ts writes STRIPS as the constant `horizontal` with that " +
        "reasoning beside it. So a board whose committed layout runs its strips the other way " +
        "would be materialised TRANSPOSED - every cut, bridge and run naming the wrong " +
        "conductor - and the result would score perfectly, because the dump it is scored from " +
        "is the transposed board's own. This holds the produced board's axis against the one " +
        "the committed layout states, which is the direction prepare() read off it. It is NOT " +
        "corrected here by transposing anything: the importer refuses a VERTICAL_STRIPS 1 dump " +
        "outright, so the model cannot express the other axis at all, and a fix belongs there " +
        "with a test beside it. Until then a vertical-strip board is one this producer refuses " +
        "rather than one it gets wrong."
      )
    case "materialize-run-rule-load-bearing":
      return (
        "EVERY ONE OF Q1-Q6 DESCRIBES HOW A SEARCH TERMINATED, AND THIS RUN SWEEPS NO MOVE SET " +
        "- nothing can propose a move on a materialised board (docs/known-gaps.md G22) - so a " +
        "Q-rule recorded by this producer is earned over the restart schedule alone. CRITERIA " +
        "G2.5 admits a run through exitCodeFor(outcome, rule), so a zero exit code here would " +
        "mean an unearned clause had carried a board into boards/. The producer refuses to " +
        "write a record it would be admitted on. It is NOT relaxed by weakening the gate and " +
        "NOT by picking a different rule, which would be choosing a stopping reason to fit a " +
        "verdict. What this path records instead is tools/stripboard/termination.ts's " +
        "NO_SEARCH, which earns no bound and no admission; reaching this refusal means " +
        "something handed the record a Q-rule again. Fix TERMINATION in " +
        "tools/stripboard/materialize-run.ts, or run a search this path can actually run, " +
        "which is G22."
      )
  }
}

export function refuse(refusal: MaterializeRunRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(tools/stripboard/materialize-run.ts is the producer; tools/stripboard/adopt-checks.ts " +
      "is the gate and is not this module's to change.)",
  )
}

/**
 * The arm this producer records, and it is a TREATMENT LABEL rather than a claim
 * about which code ran.
 *
 * `./seed-compare.ts`'s comparison is over three treatments and `SeedArm` has no
 * fourth member; adding one would be adding a treatment to somebody else's
 * experiment. What this run constructs IS the constructed treatment - one net
 * per strip, in `assignStrips`'s reverse-Cuthill-McKee order with the junction
 * gathered, perturbed by the seed - and it is the SAME `assignStrips` the
 * constructed arm derives its gestures from (`./seed-constructed.ts`). The
 * difference is the implementation: that arm reaches the arrangement by driving
 * the fork, and this one builds it in the model and materialises the result. So
 * the label is right and the mechanism is not the same, which is said here
 * rather than left for a reader of `run.json` to discover.
 */
const MATERIALISED_ARM = "constructed" as const

/**
 * What this producer records about how its run ended, and it is a CONSTANT
 * rather than a computation because there is nothing to compute.
 *
 * **A RUN THAT SWEEPS NO MOVE SET HAS NO COUNTERS TO ASK `evaluateStop` WITH**,
 * and the shape of the defect this replaces was a producer building them
 * anyway: `climbEvaluations` of one per seed, `signatures` empty, and
 * `acceptedThisRound: 0` - the last of which is `Q3`'s *"a full sweep of the
 * move set that produced no accepted move"* asserted about a move set nobody
 * swept. `evaluateStop` is not called here at all now, so there is no `null`
 * case to refuse either; `materialize-run-no-stop` went with the counters.
 *
 * **IT IS NOT A WEAKER STOPPING RULE.** `NO_SEARCH` is not in `STOPPING_RULES`
 * and cannot be handed to `boundFor`, `runFailedOn`, `exitCodeFor` or
 * `renderReport` - `./termination.ts` carries why that is the whole mechanism -
 * so a record carrying it claims nothing on its own, and `./adopt-verdict.ts`
 * adopts from it only on the owner's recorded call on a render of this board.
 */
const TERMINATION: Termination = NO_SEARCH

/** One seed's construction: what was built, what the fork made of it, and its grade. */
export interface SeedMaterialisation {
  readonly seed: number
  /** The model's candidate for this seed's ordering. */
  readonly candidate: Candidate
  /** The board `--materialize` wrote from this candidate's document. */
  readonly materialized: string
  /** How many blank holes the fork painted, from its own summary line. */
  readonly painted: number
  /** The grade of the painted board, from `./climb-evaluate.ts`'s one measurement. */
  readonly evaluation: Evaluation
}

/** What one materialisation run is about. */
export interface MaterializeRunInput {
  /** The directory holding the board's `perfboard.json`, absolute or repo-relative. */
  readonly boardDir: string
  /** The reviewed parameters, from `./rules.ts`'s `loadRules`. Never built here. */
  readonly rules: StripboardRules
  /** The run directory's name. Provenance only; absent, it is the instant the run started. */
  readonly stamp?: string
}

/** One materialisation run: where it wrote, what it produced, and what it recorded. */
export interface MaterializeRun {
  readonly runDir: string
  readonly board: string
  /** The painted `.vrt` `inputs.candidateSha256` was taken from - what `adopt` would copy. */
  readonly candidate: string
  readonly manifest: RunManifest
  /** How this run ended, which for this producer is always `NO_SEARCH`. */
  readonly termination: Termination
  readonly outcome: Outcome
  readonly best: Evaluation
  readonly bestSeed: number
  readonly perSeed: readonly SeedMaterialisation[]
}

/** The clock, read once per run, for the run directory's name and nothing else. */
function stampNow(): string {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

/** The model's candidate for one seed's ordering, or a refusal naming the seed. */
function constructedFor(prepared: Prepared, seed: number): Candidate {
  const netlist = seedPartsFrom(
    prepared.reference,
    prepared.footprints,
    { patterns: PIN_PATTERNS, spans: LEAD_SPANS },
    prepared.offBoard,
  )
  const built = seedsFrom(
    netlist,
    { strips: prepared.stock.rows, columns: prepared.stock.cols },
    LEAD_SPANS,
    [{ name: `rcm s${seed}`, homes: assignStrips(prepared.targets, seed) }],
  )
  const candidate = built[0]
  if (candidate === undefined) {
    refuse(
      "materialize-run-no-candidate",
      `seedsFrom returned ${built.length} candidate(s) for ordering "rcm s${seed}" on ` +
        prepared.board,
    )
  }
  return candidate
}

/**
 * That the board this run PRODUCED runs its strips the way the board in hand
 * does.
 *
 * **IT IS THE PRODUCED BOARD AND NOT THE BASE, WHICH IS A CORRECTION MEASURED
 * ON THE FIRST RUN.** This checked the `--import` base first, and the base's
 * axis turns out not to matter: `freshImportBase` passes no `--strips` and the
 * fork's default gave `VERTICAL_STRIPS 1` on a board whose committed layout is
 * horizontal, while the materialised board came back `VERTICAL_STRIPS 0` at
 * `GRID 34 27` - because the document's own `STRIPS` statement sets the axis and
 * its `GRID` sets the size, so `--materialize` replaces both. Checking the base
 * therefore refused a run that was correct; the axis that decides whether a cut
 * names the right conductor is the one on the board that would be adopted.
 *
 * **A GUARD AND NOT A CORRECTION**: see `materialize-run-strips-disagree`. It
 * costs no invocation - the dump is the one `measure` already read.
 */
function assertStripsAgree(produced: string, dumpText: string, prepared: Prepared): void {
  // `boardGeometry` AND NOT A REGEX OF THIS FILE'S OWN: `./copper.ts` is the one
  // reader of the strip axis and it REFUSES a dump that does not state one,
  // where a regex here would quietly read a missing line as horizontal.
  const actual = boardGeometry(dumpText).verticalStrips ? "vertical" : "horizontal"
  if (actual !== prepared.strips) {
    refuse(
      "materialize-run-strips-disagree",
      `the board this run produced at ${produced} runs its strips ${actual} and ` +
        `${prepared.board}'s committed layout states ${prepared.strips}`,
    )
  }
}

/**
 * That what this run is about to record is not what admits the board.
 *
 * **IT FIRES ON THE STATE THAT WOULD MAKE AN UNEARNED CLAIM DECIDE SOMETHING,
 * NOT ON THE STATE THE PIPELINE HAPPENS TO BE IN**: a zero exit code from
 * `exitCodeFor(outcome, rule)` is `G2.5` admitting the run, and no `Q`-rule is
 * earned by a producer that sweeps no move set. A `NO_SEARCH` termination is
 * therefore passed through here and refused nowhere - it claims nothing, so it
 * can carry nothing - and `./adopt-checks.ts` is what declines to adopt from it.
 *
 * **SO IT IS QUIET ON EVERY PRODUCTION RUN TODAY, AND THAT IS SAID HERE RATHER
 * THAN LEFT TO BE DISCOVERED.** `TERMINATION` above is a constant, so the
 * `isStoppingRule` branch is unreachable while it holds `NO_SEARCH`. **IT IS
 * EXPORTED SO IT CAN BE SHOWN TO FIRE** - the device
 * `tools/stripboard/stop-model.ts`'s `assertOrderCoversTable` and
 * `./termination.ts`'s `assertDistinct` use, and for the same reason: a guard
 * reachable only by editing its own caller is a guard no test covers.
 * `tests/stripboard/materialize-run-perturbed.test.ts` calls it with the pair
 * that used to be live here - `admissible` beside `Q3` - and the branch is
 * additionally driven through the real producer by editing `TERMINATION`, which
 * is recorded in this task's report.
 */
export function assertRuleNotLoadBearing(
  outcome: Outcome,
  termination: Termination,
  board: string,
): void {
  if (!isStoppingRule(termination)) return
  if (exitCodeFor(outcome, termination) === 0) {
    refuse(
      "materialize-run-rule-load-bearing",
      `this run of ${board} reports the outcome "${outcome}" beside the stopping rule ` +
        `${termination}, and exitCodeFor pairs those two to a zero exit - so CRITERIA G2.5 ` +
        "would admit this candidate on a rule earned over the restart schedule alone",
    )
  }
}

/**
 * One materialisation run: prepare, import, construct per seed, materialise,
 * grade, stop, and `run.json`.
 *
 * `spawn` IS REQUIRED AND HAS NO DEFAULT - `tools/perfboard/check.ts`'s posture,
 * restated by `./seed.ts`: *"a spawn that quietly fails is the shape that reads
 * as a clean board"*, and this module resolves no binary of its own.
 */
export async function materializeRun(
  input: MaterializeRunInput,
  spawn: SpawnVeroroute,
): Promise<MaterializeRun> {
  const repoRoot = moduleRepoRoot()
  const startedAt = new Date()
  // EVERY INVOCATION THIS RUN MAKES IS COUNTED AT ITS ONE CHOKE POINT, which is
  // what makes `provenance.msPerInvocation` a measurement - `./place.ts` carries
  // the four ways the predicted divisor it replaced was wrong.
  let invocations = 0
  const counted: SpawnVeroroute = (args) => {
    invocations += 1
    return spawn(args)
  }
  const prepared = await prepare(
    { board: input.boardDir, rules: input.rules, arm: MATERIALISED_ARM },
    repoRoot,
    counted,
  )
  const stamp = input.stamp ?? `${stampNow()}-materialized`
  const runDir = runDirectory(prepared.board, stamp)
  fs.mkdirSync(runDir, { recursive: true })

  // THE NETLIST FILE IS THE CHAIN'S SECOND LINK AND THE FILE THE RECORDED HASH
  // IS TAKEN FROM. `assertProvenanceChain` looks for it at this exact name.
  const netlistFile = path.join(runDir, `${prepared.board}.net`)
  fs.writeFileSync(netlistFile, prepared.netlistText)

  // `imported.vrt` IS THE NAME THE GATE LOOKS FOR AND THE BASE EVERY
  // MATERIALISATION STARTS FROM - one file serving both because it is one board.
  const imported = freshImportBase(
    { netlist: prepared.netlistText, outPath: path.join(runDir, "imported.vrt") },
    counted,
  )

  const perSeed: SeedMaterialisation[] = []
  for (const seed of input.rules.seeds) {
    const seedDir = path.join(runDir, `seed-${seed}`)
    const candidate = constructedFor(prepared, seed)
    const result = materialize(
      {
        candidate,
        reference: prepared.reference,
        base: imported,
        layoutPath: path.join(seedDir, "layout.txt"),
        outPath: path.join(seedDir, "materialized.vrt"),
      },
      counted,
    )
    // THE FILE IS GRADED, NOT THE BOARD THE VERB VERIFIED. `--materialize`'s
    // PHASE 7 already reads every declared lead back off its grid, so a passing
    // run is itself a claim about the board; measuring the written `.vrt` is the
    // independent half, because it is what a later step consumes.
    const measured = measure(
      result.outPath,
      {
        painted: path.join(seedDir, "candidate.vrt"),
        netlist: netlistFile,
        targets: prepared.targets,
        reference: prepared.reference,
        footprints: prepared.footprints,
        stock: prepared.stock,
        rules: input.rules,
      },
      counted,
    )
    assertStripsAgree(measured.evaluation.candidate, measured.dumpText, prepared)
    perSeed.push({
      seed,
      candidate,
      materialized: result.outPath,
      painted: result.painted,
      evaluation: measured.evaluation,
    })
  }

  // THE CHEAPEST, AND THE FIRST OF EQUALS. `./climb-accepts.ts`'s rule accepts
  // only a STRICTLY better candidate, so a later seed that ties does not displace
  // an earlier one - the same ordering, applied across restarts rather than
  // within a climb, and the reason `bestSeed` is the seed that actually produced
  // the recorded board.
  const best = perSeed.reduce((carry, entry) =>
    entry.evaluation.score.objective < carry.evaluation.score.objective ? entry : carry,
  )

  const verdict = admissible({
    results: best.evaluation.results,
    score: best.evaluation.score,
    targets: prepared.targets,
    rules: input.rules,
    // `F_0` IS THE FIRST SEED'S OWN OBJECTIVE, which is the figure the run
    // started from - the same quantity `./place.ts` hands over as the first
    // climb's. `A3`'s tolerance denominator reads it, and while `tau` is unset
    // `A3` does not fire at all.
    initialObjective: perSeed[0]?.evaluation.score.objective,
    frozen: prepared.frozen,
    binding: undefined,
  })
  const outcome = outcomeOf(verdict)
  // NO `evaluateStop` CALL. This run swept no move set, so there is no stop to
  // evaluate and no counters to evaluate it from; `TERMINATION` above says what
  // that record is and why it is not one of the six.
  assertRuleNotLoadBearing(outcome, TERMINATION, prepared.board)

  const stampedBuild = builtCommit(repoRoot)
  if (stampedBuild === undefined) {
    throw new Error(
      `materializeRun: no build stamp under ${repoRoot}/.tools, so which commit the binary that ` +
        "materialised this board was built from is unknown. run-dir.ts refuses a blank " +
        "builtCommit and this run will not record one: an unknown build is never the pinned " +
        "commit. Rebuild the fork through `make veroroute` so the stamp is written, then re-run.",
    )
  }
  const manifest = manifestFor({
    best: best.evaluation,
    // ONE EVALUATION PER RESTART, so each restart after the first begins at its
    // own index. `./search.ts`'s boundaries are one shorter than the restart
    // count for the same reason: the first climb is not a restart.
    restartBoundaries: perSeed.slice(1).map((_, index) => index + 1),
    evaluations: perSeed.length,
    netlistFile,
    rules: input.rules,
    arm: MATERIALISED_ARM,
    termination: TERMINATION,
    outcome,
    stamp,
    startedAt,
    invocations,
    seed: best.seed,
    verorouteCommit: readPin(path.join(repoRoot, "veroroute.pin")).commit,
    builtCommit: stampedBuild,
    pipelineCommit: pipelineCommit(repoRoot),
  })
  writeManifest(runDir, manifest)
  writeApprovalRecord(
    runDir,
    prepared.board,
    manifest.canonical.inputs.candidateSha256,
    TERMINATION,
  )
  return {
    runDir,
    board: prepared.board,
    candidate: best.evaluation.candidate,
    manifest,
    termination: TERMINATION,
    outcome,
    best: best.evaluation,
    bestSeed: best.seed,
    perSeed,
  }
}
