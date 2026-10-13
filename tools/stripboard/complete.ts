/**
 * THE COMPLETION PASS: the stage whose only objective is closing the
 * connections the main search left open.
 *
 * **IT HAS NO PRODUCTION CALLER TODAY, AND THAT IS STATED HERE SO ROUTE 3 IS NOT
 * MISTAKEN FOR SOMETHING THAT RUNS.** `completionPass` below is called only by
 * `tests/stripboard/complete.test.ts`. The CLI exposes two stripboard verbs,
 * `place` and `adopt` (`tools/cli/perfboard-stripboard-verbs.ts`), and `place`
 * runs prepare -> --import -> search -> evaluateStop -> necessaryCuts -> report
 * and never reaches this file; nothing in `Makefile` or `tools/` reaches it
 * either. Two module comments used to assert that this file was the consumer of
 * `RunResult.bestStart` and `ClimbResult.bestStart` - it is not, and those
 * claims are gone.
 *
 * Three things follow, and none of them is hidden:
 *
 * - The plan's recorded figure for this pass - 103 open nets to 85, eighteen
 *   closed for forty wires - was produced by a harness that is not in the
 *   repository, so it cannot be reproduced from a committed command.
 * - A reader of `place`'s report gets route 1's result, nine or ten of fourteen
 *   nets open, with no line saying a second stage exists. `report.ts` has no
 *   completion section.
 * - `./complete-joins.ts` is the only wire planner in this repository that plans
 *   against `copperGraph` COMPONENTS rather than against strips and hole
 *   distance, and it is reachable only from here. So the planner built to fix
 *   the 7,417-enumerations-no-best finding cannot fire in a real run.
 *
 * Wiring it into `place` is a behaviour change the owner is deciding, and it is
 * deliberately NOT made here. What is fixed is the code claiming otherwise.
 *
 * **IT IS ROUTE 3, AND IT RAN BECAUSE ROUTE 1 WAS NOT ENOUGH.** The owner was
 * offered three ways out of the finding in `docs/stripboard/
 * pipeline-verification.md` §6.9 - change the scoring, add a solder-bridge
 * gesture, or run two passes - and chose, verbatim on 2026-10-12: *"1 then 3"*.
 * Route 1 landed: `Evaluation.openNets` is the acceptance ordering's first key
 * (`./climb-accepts.ts`), and it bought connections with cuts, which is the
 * right trade. It did not finish a board. §6.10 measured nine of fourteen nets
 * still open on every arm. This file is route 3, and the entry in
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` under *"Deviations
 * from the specs"* records it, because no clause of CRITERIA describes a second
 * pass at all.
 *
 * **THE OBJECTIVE, EXACTLY: `openNets`, MINIMISED; `F` ONLY AS A TIEBREAK.** The
 * main search minimises `F` with `openNets` above it. This pass does not
 * minimise anything else: it proposes only candidates that CLOSE a net, and
 * among those the acceptance rule's own ordering takes the one with fewer open
 * nets and then the cheaper `F`. **The rule is not new and not weakened - it is
 * `accepts`, imported unchanged**, so the no-regression clause still rejects a
 * candidate that breaks a hard constraint which held on the board the wires
 * were applied to, and `strictlyBetter` is still the one definition of better in
 * this pipeline.
 *
 * **THE CRITERIA CLAUSE THAT LICENSES IT** is `HC1`'s own reason - *"Every net
 * electrically whole, because a board that does not conduct has no cost worth
 * reporting"* - read together with §2's *"nothing in them is tradeable"* and
 * `A1`'s *"Nothing is tradeable."* A quantity that must not be traded against
 * the cost cannot be priced in it, and a quantity whose absence makes the cost
 * not worth reporting is the one to spend cost on. That is the same reading
 * `./climb-accepts.ts` carries for the ordering's first key; this pass is that
 * reading taken one step further, to a stage that spends cuts and wires for
 * connections and buys nothing else. **`OBJ1` is untouched**: `F` is still the
 * three line counts, this file adds no term to it and no eleventh constraint,
 * and the only quantity it optimises is `--check`'s own `incomplete` count -
 * the same field `HC1` reads, counted once per evaluation in
 * `./climb-evaluate.ts`. No number here came from an agent's judgement.
 *
 * **WHAT MAKES A WIRE ACCEPTABLE HERE WHEN IT NEVER WAS IN THE MAIN SEARCH, and
 * it is not a change to the rule.** `./complete-joins.ts` carries the
 * measurement: a net on `m` copper components needs `m - 1` joins and one wire
 * supplies one, so a single wire leaves the net open unless `m` is exactly 2 -
 * `openNets` does not fall, `F` rises by `ρ_w`, and a strictly-improving rule
 * rejects it. §6.9 counted 7,417 `add-wire` candidates and none was ever best.
 * This pass's candidate is **every wire one net needs, at once**, so `openNets`
 * really falls and the unchanged rule takes it.
 *
 * **IT CANNOT UNDO THE MAIN SEARCH'S WORK, AND THAT IS STRUCTURAL RATHER THAN
 * ASSERTED.** Clause 1 of `accepts` rejects any candidate that breaks a
 * constraint the board entering the pass held, and `strictlyBetter` rejects any
 * candidate with MORE open nets whatever its `F`. So the board leaving the pass
 * is the board entering it, or one with fewer open nets and no new broken
 * constraint. `tests/stripboard/complete.test.ts` holds both halves against a
 * board where the wires break `HC6`.
 *
 * **A SOLDER BRIDGE IS NOT AN INSTRUMENT HERE, AND THE REASON IS THE MOVE SET
 * RATHER THAN THE OWNER'S TASTE.** `B` is only ever what `AutoFillVero`
 * derives; no gesture in the move set makes one, which `stripboard/rules.json`'s
 * `rhoSolder` note states from the other side. So the pass cannot propose a
 * blob, and the blobs a board carries are the fork's - counted, priced at
 * `ρ_s = ρ_w` on the owner's words *"A solder blob will turn into a wire on my
 * bench"*, and reported. `CompletionResult` carries the solder count before and
 * after precisely so that a pass which provoked a crop of derived bridges says
 * so.
 *
 * **WHAT IT COSTS IN INVOCATIONS.** A candidate is `m - 1` wires at up to three
 * gestures each (create, turn, stretch), then ONE `--update` to assign those
 * wires to their net - `./complete-apply.ts`'s `assignNodes`, and the pass
 * closes nothing without it - and then the four invocations of one evaluation.
 * So a net on four components costs 9 + 1 + 4 against a single-part candidate's
 * 1 + 4, and a round is one candidate per open net rather than one per gesture
 * the board admits: tens of evaluations, not thousands. The pass is cheap next
 * to the climb it follows, which is why it is a separate stage rather than a
 * wider move set.
 */
import fs from "node:fs"
import path from "node:path"
import { accepts, candidateRejected, strictlyBetter, type Evaluation } from "./climb.ts"
import { measure, type Measured } from "./climb-evaluate.ts"
import { applyWires, assignNodes } from "./complete-apply.ts"
import { netJoinPlans, type NetJoinPlan } from "./complete-joins.ts"
import type { Stock } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { StripboardRules } from "./rules.ts"
import type { Occupancy } from "./seed-geometry.ts"
import type { SeedStart, SpawnVeroroute } from "./seed.ts"
import type { BoardTargets } from "./targets.ts"

/**
 * What one completion pass needs. It is `ClimbInput` without the move set's
 * knobs: there is no `batch`, because `add-wire` is not in `applyMove`'s
 * `BATCHABLE_KINDS` and never was - the ops grammar has no line for it - so a
 * transport flag here would be a parameter nothing reads.
 *
 * **`rules.evaluationCap` IS A BACKSTOP HERE AND NOT WHAT MAKES THE PASS STOP.**
 * The pass's own bound is the open-net count: a round that accepts nothing ends
 * it, and every accepted round strictly reduces a count bounded below by zero,
 * so the rounds are at most the board's net count and each round is at most one
 * candidate per open net. A board of fourteen nets is therefore bounded by order
 * 10^2 evaluations against `Q5`'s 20,000. **The caller decides what to hand
 * over**, and the two defensible choices say different things: the remainder of
 * the run's cap treats the pass as part of the run `Q5` bounds, and the full cap
 * treats it as a stage of its own. Whichever is handed over, a net left
 * unevaluated because the cap ran out is reported as exactly that
 * (`CAP_SPENT`) - never as a net that could not close.
 */
export interface CompletionInput {
  /** Every candidate board and staged wire this pass writes lands here. */
  readonly runDir: string
  readonly netlist: string
  readonly targets: BoardTargets
  readonly reference: ReferenceNets
  readonly footprints: ReadonlyMap<string, string>
  readonly stock: Stock
  readonly rules: StripboardRules
}

/**
 * One net this pass finished with still open, and why.
 *
 * **IT IS THE RESULT AND NOT AN APOLOGY FOR ONE.** A measured *"these four
 * cannot close because ..."* is the finding this pipeline is built on reporting,
 * so a net that cannot close names the cause from the board's own side -
 * component count, how many wires were plannable, and the refusal or the
 * rejection that stopped it.
 */
export interface UnclosedNet {
  readonly net: string
  /** How many copper components the net's reference pins fall into. */
  readonly components: number
  /** How many of its `components - 1` joins a wire was found for. */
  readonly wiresPlanned: number
  readonly reason: string
}

/** One board this pass is standing on: the file, its measurement and its geometry. */
interface Standing {
  /** The UNPAINTED board - what the next wire is applied to. */
  readonly board: string
  readonly measured: Measured
  readonly occupancy: Occupancy
}

/**
 * What one pass did: the board it finished on, what it spent, and every net it
 * could not close.
 *
 * **`best` IS THE BOARD AND ITS GEOMETRY, NOT ONLY AN `Evaluation`** - which is
 * where this differs from `ClimbResult`, deliberately. A completion pass exists
 * to hand a finished board onward, and a result naming only the painted
 * candidate would hand on a board no further gesture can be applied to (a
 * painted board refuses a move that overlaps a part's own footprint: see
 * `Measured.source`). So the unpainted board travels with its occupancy, in the
 * same shape `./seed.ts`'s `SeedStart` uses for the same handover.
 */
export interface CompletionResult {
  /** The best board this pass saw, by `strictlyBetter` - unpainted, with its geometry. */
  readonly best: SeedStart
  /**
   * That board's measurement.
   *
   * **`best.board` IS NOT ITS `Measured.source`**, and the pair is the one place
   * this pass differs in shape from the climb: the measurement is of the
   * `--update`d copy, which is painted, and `best.board` is the unpainted board
   * the wires were applied to. `assignNodes` carries why both files exist.
   */
  readonly evaluation: Evaluation
  /** The board the pass was handed, measured before anything was applied. */
  readonly start: Evaluation
  readonly rounds: number
  readonly evaluations: number
  /** How many candidates each round accepted. `acceptedPerRound.length === rounds`. */
  readonly acceptedPerRound: readonly number[]
  /** How many `WIRE` lines the accepted candidates added, by the dump's own count. */
  readonly wiresAdded: number
  /** How many candidates could not be SCORED, and the first one's refusal. */
  readonly unscoreable: number
  readonly firstUnscoreable: string | null
  /** Every net still open on `best`, with the cause. */
  readonly unclosed: readonly UnclosedNet[]
}

/**
 * Why a candidate that was evaluated was not accepted.
 *
 * **IT STATES WHAT THE TWO MEASUREMENTS SAY AND NOTHING MORE.** An earlier
 * wording said the wires *"closed this net and opened at least as many others,
 * which a wire does by shorting two nets onto one piece of copper"* - a
 * mechanism, asserted from two counts that cannot establish it. What the counts
 * and the two check reports DO establish is which nets changed status, so that
 * is what this names: the set that closed and the set that opened, read off the
 * two reports, with no account of why. A reader who wants the cause has the two
 * boards in the run directory.
 */
function rejection(predecessor: Measured, incumbent: Measured, candidate: Measured): string {
  const held = new Set(
    predecessor.evaluation.results.filter((result) => result.held).map((result) => result.id),
  )
  const broke = candidate.evaluation.results
    .filter((result) => !result.held && held.has(result.id))
    .map((result) => result.id)
  if (broke.length > 0) {
    return (
      `the candidate built to close it BREAKS ${broke.join(", ")}, which held on the board the ` +
      "wires were applied to. The acceptance rule's no-regression clause rejects it before F is " +
      "looked at, so closing this net BY THESE WIRES costs a hard constraint. That is a fact " +
      "about the wires this generator planned and not about every way the net could be closed: " +
      "a different set of holes, or a wire path, might not break it."
    )
  }
  const was = new Set(predecessor.checkReport.incompleteNets)
  const now = new Set(candidate.checkReport.incompleteNets)
  const closed = [...was].filter((net) => !now.has(net))
  const opened = [...now].filter((net) => !was.has(net))
  return (
    `the candidate built to close it was not better: openNets ` +
    `${incumbent.evaluation.openNets} -> ${candidate.evaluation.openNets}, F ` +
    `${incumbent.evaluation.score.objective} -> ${candidate.evaluation.score.objective}. ` +
    `Against the board the wires were applied to, --check then called these nets complete that ` +
    `were not: [${closed.join(", ")}]; and these incomplete that were not: [${opened.join(", ")}]. ` +
    "Both lists are read off the two reports; nothing here says why the second one moved."
  )
}

/**
 * The reason a net open on the reported board was never swept for.
 *
 * It is reachable one way only: an ACCEPTED candidate closed one net and opened
 * this one at an EQUAL open-net count, which the acceptance rule permits when
 * `F` improves - and the pass then stopped before a round could plan for the net
 * that opened. Nothing else changes the board, so the cause is not a guess.
 */
const NEWLY_OPEN =
  "it was NOT OPEN on the board the last round swept from, so no candidate for it was ever " +
  "proposed. An accepted candidate closed another net and opened this one at an equal open-net " +
  "count - which the acceptance rule permits when F improves - and the pass ended before a " +
  "round could plan for it."

/** The reason a net whose plan was complete never got its candidate evaluated. */
const CAP_SPENT =
  "the candidate that would close it was NOT EVALUATED, because the evaluation cap this pass " +
  "was handed ran out first. That is a budget and not a fact about the board: the net's joins " +
  "are all plannable, and a pass with a larger remainder would have tried them. The cap is " +
  "Q5's run-level backstop, divided by whoever ran the search before this pass."

/**
 * The candidate-producing half, re-exported from `./complete-apply.ts`: the
 * wires in order, and the `--update` that assigns them to their net.
 *
 * Split at the take-a-candidate / produce-a-candidate seam for the 500-line
 * ceiling, exactly as `./moves.ts` re-exports `./moves-apply.ts`. This stays the
 * module a consumer imports.
 */
export { applyWires, assignNodes, type AssignInput } from "./complete-apply.ts"

/**
 * Close what the search left open on `start`, as cheaply as the acceptance rule
 * allows.
 *
 * **A ROUND IS ONE CANDIDATE PER OPEN NET, EVERY ONE APPLIED TO THE BOARD THE
 * ROUND STARTED FROM** - the same sweep discipline `climb` states, for the same
 * reason: a wire planned against one board and applied to another lands on holes
 * the model did not check. The best candidate becomes the next round's base, and
 * the pass stops when a round accepts nothing or the cap it was handed is spent.
 *
 * **THE OPEN NETS AND THE PLANS ARE RE-READ EVERY ROUND**, from the base board's
 * own check report and dump, so a net that a previous round's wires closed
 * incidentally is not planned for again and a net whose components changed is
 * re-planned against what the board now is.
 */
export function completionPass(
  start: SeedStart,
  input: CompletionInput,
  spawn: SpawnVeroroute,
): CompletionResult {
  fs.mkdirSync(input.runDir, { recursive: true })
  const cap = input.rules.evaluationCap
  const acceptedPerRound: number[] = []
  let evaluations = 0
  let unscoreable = 0
  let firstUnscoreable: string | null = null

  const measureInto = (board: string, tag: string): Measured => {
    const measured = measure(
      board,
      {
        painted: path.join(input.runDir, `${tag}-filled.vrt`),
        netlist: input.netlist,
        targets: input.targets,
        reference: input.reference,
        footprints: input.footprints,
        stock: input.stock,
        rules: input.rules,
      },
      spawn,
    )
    evaluations += 1
    return measured
  }

  // THE START IS EVALUATED, for `climb`'s reason: a pass that scored no
  // candidate has not measured the board it was handed, and the before/after
  // this stage exists to report is read off this measurement and the last one.
  const first = measureInto(start.board, "pass-start")
  let base: Standing = { board: start.board, measured: first, occupancy: start.occupancy }
  let incumbent = base
  let best = base
  let rounds = 0
  let spent = false
  // WHY EACH OPEN NET OF THE LAST SWEPT ROUND WAS NOT CLOSED, cleared at the
  // start of every round so a stale cause from an earlier board cannot be
  // reported against a later one.
  const outcome = new Map<string, string>()

  while (!spent) {
    const plans = netJoinPlans({
      dumpText: base.measured.dumpText,
      dump: base.measured.dump,
      occupancy: base.occupancy,
      reference: input.reference,
      openNets: openNetsOf(base.measured),
    })
    outcome.clear()
    let accepted = 0
    for (const plan of plans) {
      // A PARTIAL PLAN IS NOT PROPOSED, and `./complete-joins.ts` carries the
      // measurement: a candidate that cannot close its net is the main search's
      // wire move, which was enumerated 7,417 times and accepted none.
      if (plan.shortfall !== null) {
        outcome.set(plan.net, plan.shortfall)
        continue
      }
      if (evaluations + unscoreable >= cap) {
        spent = true
        for (const remaining of plans) {
          if (!outcome.has(remaining.net)) outcome.set(remaining.net, CAP_SPENT)
        }
        break
      }
      const tag = `p${rounds}-${plan.net}`
      const candidateBoard = applyWires(base.board, plan, input.runDir, tag, spawn)
      // THE SAME TWO REFUSALS `climb` CATCHES, BY THE SAME SHARED PREDICATE: a
      // wire bridging two strips on a packed board routinely shorts two nets,
      // and the fork says so at two points - `--update` refuses to put the wire
      // back when its two ends carry two different net ids, and `AutoFillVero`
      // reports `CUT_STATE UNRESOLVED` with no cut list at all. Either way the
      // candidate cannot be compared with anything, so it is rejected and
      // counted; every other refusal still stops the pass.
      //
      // **THE `--update` IS INSIDE THE `try` FOR THAT REASON.** The wires are
      // assigned to their net before anything reads the board - see
      // `assignNodes`, which carries the measurement that forced it - and the
      // UNPAINTED `candidateBoard` is what the next round gestures on while the
      // updated copy is what is measured.
      let measured: Measured
      try {
        const assigned = assignNodes(
          candidateBoard,
          input,
          input.runDir,
          tag,
          "completionPass",
          spawn,
        )
        measured = measureInto(assigned, tag)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!candidateRejected(message)) throw error
        unscoreable += 1
        if (firstUnscoreable === null) firstUnscoreable = message
        outcome.set(
          plan.net,
          "the candidate closing it COULD NOT BE EVALUATED: either --update refused to put one " +
            "of its wires back because the wire's two ends carry two different net ids, or the " +
            "wires left the cut state unresolved - both of which are what the fork reports when " +
            "a wire shorts two nets onto one piece of copper, at two different points. The " +
            `refusal names which: ${message.split("\n")[0] ?? ""}`,
        )
        continue
      }
      if (
        accepts(
          {
            predecessor: base.measured.evaluation,
            incumbent: incumbent.measured.evaluation,
            candidate: measured.evaluation,
          },
          input.rules,
        )
      ) {
        incumbent = { board: candidateBoard, measured, occupancy: plan.occupancy }
        if (strictlyBetter(measured.evaluation, best.measured.evaluation)) best = incumbent
        accepted += 1
        continue
      }
      outcome.set(
        plan.net,
        rejection(base.measured, incumbent.measured, measured),
      )
    }
    acceptedPerRound.push(accepted)
    rounds += 1
    if (accepted === 0) break
    base = incumbent
  }

  return {
    best: { board: best.board, occupancy: best.occupancy },
    evaluation: best.measured.evaluation,
    start: first.evaluation,
    rounds,
    evaluations,
    acceptedPerRound,
    wiresAdded: best.measured.dump.wires.length - first.dump.wires.length,
    unscoreable,
    firstUnscoreable,
    unclosed: unclosedOn(best, input, outcome),
  }
}

/**
 * Every net still open on the board the pass is REPORTING, with its cause.
 *
 * **THE PLANS ARE RE-READ FROM THAT BOARD AND NOT TAKEN FROM THE LAST ROUND**,
 * which is the one shape that cannot describe the wrong board. A round sweeps
 * from its base and the board reported is the best candidate seen, and the two
 * come apart two ways: the cap can end a round after an acceptance, and `E3`'s
 * bound can move the incumbent below the best. Re-planning is a model
 * computation and spends no invocation, so there is no reason to prefer the
 * stale list.
 *
 * **THE GENERATOR'S OWN SHORTFALL WINS OVER A RECORDED REJECTION**, because the
 * shortfall is a statement about THIS board while a rejection is a statement
 * about a candidate built from some board - and if no complete plan exists here,
 * that is why the net is open here.
 */
function unclosedOn(
  best: Standing,
  input: CompletionInput,
  outcome: ReadonlyMap<string, string>,
): readonly UnclosedNet[] {
  const plans = netJoinPlans({
    dumpText: best.measured.dumpText,
    dump: best.measured.dump,
    occupancy: best.occupancy,
    reference: input.reference,
    openNets: openNetsOf(best.measured),
  })
  return plans.map((plan) => ({
    net: plan.net,
    components: plan.components,
    wiresPlanned: plan.wires.length,
    reason: plan.shortfall ?? outcome.get(plan.net) ?? NEWLY_OPEN,
  }))
}

/**
 * Which nets `--check` called incomplete on a measured board.
 *
 * **IT IS THE SAME REPORT `HC1` AND `openNets` WERE READ FROM, AND NO SECOND
 * `--check` IS RUN** - which is the one thing this pass must not do. A second
 * check would be a second completeness measure, and it could disagree with the
 * one the acceptance rule orders by; this pass would then be planning against a
 * board the rule does not see. The length is CHECKED against `openNets` anyway:
 * both come from one `CheckReport` in `./climb-evaluate.ts`, so a disagreement
 * is not a case to reconcile but a defect in that handover.
 */
function openNetsOf(measured: Measured): readonly string[] {
  const names = measured.checkReport.incompleteNets
  if (names.length !== measured.evaluation.openNets) {
    throw new Error(
      `openNetsOf: the check report names ${names.length} incomplete net(s) ` +
        `(${names.join(", ")}) while Evaluation.openNets is ${measured.evaluation.openNets}. ` +
        "Both are read from the SAME CheckReport in tools/stripboard/climb-evaluate.ts - " +
        "openNets is literally that array's length - so they cannot legitimately disagree and " +
        "neither is reconciled to the other: planning from the names while the acceptance rule " +
        "orders by the count would make this pass optimise a quantity it is not measuring. " +
        "Reaching here means a Measured was built by hand rather than by measure().",
    )
  }
  return names
}
