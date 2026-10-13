/**
 * `P2`: the single-part hill climb, and the one place a candidate is accepted
 * or rejected.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` §1257's `P2` row and
 * `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md` §6.1
 * and §6.4. Where this module and those documents differ the documents win and
 * this comment is the defect - **with ONE named exception, below.**
 *
 * **THE EXCEPTION: the acceptance rule is NO-REGRESSION, and the documents say
 * "reject on any hard-constraint failure".** The rule itself is
 * `./climb-accepts.ts`'s and so is the full account of the departure; it is
 * named here because a module comment asserting the documents win, beside code
 * that departs from them, is a contradiction a reader would resolve the wrong
 * way - and the resolution is NOT to revert the rule. The departure is recorded
 * in `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md` under
 * *"Deviations from the specs"*.
 *
 * **AND THE ORDERING'S FIRST KEY IS THE OPEN-NET COUNT, which is the second
 * named departure and is recorded in the same place.** `./climb-accepts.ts`
 * carries the CRITERIA reading for why completeness is a key above `F` rather
 * than a term in it or a position in `RANKING`.
 *
 * **ACCEPTANCE, EXACTLY, AND NOTHING ELSE:** **no regression** - a candidate
 * that breaks a hard constraint which held on the board the move was applied to
 * is rejected, whatever its `F` - then **fewer open nets wins and more open nets
 * loses, whatever `F` does**, then `ΔF < 0`, or `ΔF = 0` with a strictly better
 * ranking tuple, and then, only when `stripboard/rules.json` configures a bound,
 * `E3`'s bounded worse-acceptance. The committed rules leave that bound unset,
 * so no run in this repository has taken a worse candidate.
 *
 * **THE INCUMBENT AND THE BEST ARE TWO RECORDS, AND `E3` IS WHY.** The incumbent
 * is the board the next round sweeps from and what `ΔF` is measured against, and
 * under a configured bound it can get WORSE - that is the escape doing its job.
 * `ClimbResult.best` is the best candidate the climb saw, by the same
 * `strictlyBetter` the acceptance rule uses, and it only ever improves **in that
 * ordering, which is no longer the same thing as improving in `F`**: the
 * ordering's first key is the open-net count, so a board that closes a net at a
 * higher `F` becomes the best and `history` rises at that step. With the
 * bound unset the two coincide, because every acceptance then improves on the
 * incumbent; a climb that reported its walk position as its result would be
 * indistinguishable until the first bound was configured, which is why they are
 * separate now rather than when E3 is first used.
 *
 * **`A1` CLASSIFIES THE RESULT, NOT THE STEP**, and `./climb-accepts.ts` carries
 * the correction that made that true, the deadlock it fixes and the CRITERIA
 * reading behind it. `ClimbResult.best.admissibleA1` is where a run says whether
 * it ended admissible, so a climb that ends inadmissible is reported as exactly
 * that rather than as a climb that found nothing.
 *
 * **`history` HAS ONE ENTRY PER EVALUATION, AND THAT IS LOAD-BEARING ACROSS
 * TASKS.** Task 16's `evaluationsToCross` reads a crossing INDEX off it and
 * refuses a run whose `history.length` disagrees with its `evaluations`,
 * because one entry per evaluation is the only thing that makes such an index
 * an evaluation count. A history per ACCEPTED MOVE would have made that figure
 * silently wrong. So every evaluation appends exactly once, including the start
 * and including a candidate that was rejected.
 *
 * **`scoreDumpText`, NOT `scoreDump`, AND THE REASON IS `V1`.** `scoreDump`
 * takes an `IndependentCount` the caller produced, and `./score.ts` names the
 * residual that leaves: *"What nothing here can prove is that `countLines` was
 * handed the same text `boardGeometry` was: a caller passing
 * `countLines(someOtherText)` whose three counts happen to match all three of
 * this dump's would pass. `scoreDumpText` closes that, because it reads the
 * text once."* This module is the FIRST production consumer of either entry
 * point, so the choice decides what `V1` rides on for the whole pipeline, and
 * it reads `--dump-board`'s stdout into ONE local `string` that both
 * `scoreDumpText` and `boardGeometry` are handed.
 *
 * **A CANDIDATE IS FOUR INVOCATIONS, OR FIVE WHEN IT ADDS A WIRE** - apply,
 * then the one `--update` that `addsWire` calls for, then autofill, check, dump
 * - which is why a candidate evaluation is order 10^1 per second at PIPELINE
 * §4.6's 11.71 ms per invocation, and why Task 9's `--move-batch` buys breadth.
 * `apply` is `./moves.ts`'s, the `--update` is `./complete-apply.ts`'s
 * `assignNodes`, and the last three are below in that order, because an
 * UNPAINTED board reports `CUT_STATE UNRESOLVED` and `HC2` refuses it rather
 * than mis-scoring it - so the paint comes before anything reads a cut list.
 *
 * **`--check`'S EXIT STATUS IS DATA, NOT A FAILURE.** It exits 1 on a board
 * with an incomplete net, and that exit code is `HC1`'s own input - so this
 * module refuses a non-zero `--author` or `--dump-board` and deliberately does
 * NOT refuse a non-zero `--check`. Treating the two alike would stop the run on
 * exactly the boards the search exists to repair.
 *
 * **WHAT A REAL CLIMB ACTUALLY DOES, so this comment is not the only evidence
 * about it.** `docs/stripboard/pipeline-verification.md` is the record and
 * carries every sweep in order - §5.9, §6.3, §6.6, §6.7, §6.8, §6.9, §6.10 and
 * §6.11 - each naming what changed in the move set or the rule between it and
 * the one before. **THE FIGURES THIS PARAGRAPH USED TO REPEAT ARE NOT COPIED
 * HERE, because six of the seven were superseded while they sat in this comment
 * and a module header is the wrong place to keep a changing measurement.** The
 * live one, from §6.10 on the import-placed low-boost board over the reviewed
 * seeds at the committed cap: `constructed` reaches `C` 10, 10, 11, 12 and 11 in
 * 41 to 72 rounds and 10,378 to 17,669 evaluations, `random` 13 at seed 0 and 16
 * at seed 3, `import` 34 on both measured seeds. Every one of those boards has
 * NINE or TEN of its fourteen nets still open, all nine stopped on `S3` with the
 * cap unspent, and every one ended inadmissible. §6.11 is the same comparison
 * with the `spread` kind and the wire candidates' `--update` in play.
 *
 * **THE START IS INADMISSIBLE AND THAT IS NORMAL.** `./seed.ts` records that
 * all three arms begin from a board whose nets are incomplete - 19, 13, 7 and 6
 * on mid, hi-boost, hi-cut and low-cut - so `HC1` fails on the start and will
 * keep failing until the search has repaired the circuit. The no-regression
 * rule is what lets a climb move at all from there while still refusing to
 * trade a constraint away, and the open-net count is what gives the climb a
 * reason to repair rather than merely permission to try: it is a DEGREE of the
 * same fact `HC1` reports as a boolean, so it moves while `HC1` is still false.
 */
import fs from "node:fs"
import path from "node:path"
import { accepts, strictlyBetter } from "./climb-accepts.ts"
import { UNSCOREABLE, type ClimbInput, type ClimbResult } from "./climb-model.ts"
import { assignNodes } from "./complete-apply.ts"
import {
  addsWire,
  applicableMoves,
  applyMove,
  describeMove,
  enumerateMoves,
  occupancyAfter,
  type GestureTransport,
  type Move,
} from "./moves.ts"
import type { Occupancy } from "./seed-geometry.ts"
import type { SpawnVeroroute } from "./seed.ts"
import { measure, type Evaluation, type Measured } from "./climb-evaluate.ts"

/**
 * The climb's vocabulary, re-exported from `./climb-model.ts`: what one climb is
 * handed, what it reports, and the one refusal it catches.
 *
 * This is the module the plan names and every consumer imports. The split is at
 * the what-is-a-climb's-input / what-does-a-climb-do seam and was forced by the
 * 500-line ceiling when the wire candidates' `--update` arrived.
 */
export { UNSCOREABLE, type ClimbInput, type ClimbResult } from "./climb-model.ts"

/**
 * The evaluation half, re-exported from `./climb-evaluate.ts`.
 *
 * This is the module the plan names and Tasks 18, 19 and 20 import. The split
 * is at the measure/accept seam and was forced by the 500-line ceiling;
 * `Measured` crosses it because the climb needs the dump and the unpainted
 * source board, and it is the pair's own vocabulary rather than part of the
 * plan's interface.
 */
export { evaluate, type EvaluateInput, type Evaluation, type Measured } from "./climb-evaluate.ts"

/**
 * The acceptance rule, re-exported from `./climb-accepts.ts`.
 *
 * This is the module the plan names and Tasks 18, 19 and 20 import. The split is
 * at the sweep/accept seam and was forced by the 500-line ceiling when `E3`
 * arrived; `strictlyBetter` crosses it because this module needs the same
 * definition of better for the best candidate it records as the rule uses for
 * `ΔF`, and two definitions would let a run report a best board its own rule
 * would have rejected.
 */
export {
  accepts,
  strictlyBetter,
  type AcceptanceInput,
} from "./climb-accepts.ts"


/**
 * Climb from `start` until a round accepts nothing (`S3`) or the run-level
 * evaluation cap is spent (`S5`).
 *
 * **A ROUND IS A FULL SWEEP OF THE MOVE SET ENUMERATED AT THE ROUND'S START,
 * EVERY MOVE APPLIED TO THE BOARD THE ROUND STARTED FROM.** That is what makes
 * it a sweep rather than a walk: a move enumerated for one board and applied to
 * a different one is a gesture nobody proposed - the part has moved, so the
 * origin the move names is no longer the origin the model checked. The best
 * candidate found becomes the next round's base, so `best` only ever improves in
 * the acceptance rule's ordering - see `ClimbResult.best`, and note that the
 * ordering is not `F`.
 *
 * `S1` (at the floor), `S2` (within `tau` of it) and `S4`/`Q4` (yield
 * collapsed) are NOT here: they are reported by Task 19 from these counters, and
 * `tau` is `null` in the committed rules, deliberately unset. `S3` and `S5` are
 * both here because both are the loop's own business - one ends a converged
 * climb and the other bounds a looping bug.
 */
/**
 * One candidate the climb is standing on: what was measured, and the PART
 * GEOMETRY carried forward to it.
 *
 * The occupancy sits beside the measurement rather than inside `Measured`,
 * because `measure` reads a board and applies no gesture - it has no way to
 * know what the geometry became. The climb is the only thing that does.
 */
interface State {
  /**
   * The UNPAINTED, un-`--update`d board - **what the next gesture is applied
   * to**, and NOT necessarily the board that was measured.
   *
   * **IT IS A FIELD HERE RATHER THAN `measured.source` BECAUSE A WIRE CANDIDATE
   * IS MEASURED ON A DIFFERENT FILE.** A move that adds a wire has its node ids
   * assigned by one `--update` before it is scored (`addsWire`, and
   * `./complete-apply.ts`'s `assignNodes` for the measurement that forced it),
   * and `--update` runs `AutoFillVero` itself - so the measured file is PAINTED,
   * and `--move` refuses a relocation that overlaps a part's own current
   * footprint on a painted board (`Measured.source` carries that measurement).
   * So the two files are kept apart, exactly as `./complete.ts`'s `Standing`
   * keeps them apart for the same reason. For every kind that adds no wire the
   * two are the same file.
   */
  readonly board: string
  readonly measured: Measured
  readonly occupancy: Occupancy
}

/** Which part a part-moving move names, for the type lookup the stretch bound needs. */
function refOf(move: Move): string | undefined {
  if (move.kind === "move" || move.kind === "rotate" || move.kind === "stretch") return move.ref
  return undefined
}

export function climb(start: string, input: ClimbInput, spawn: SpawnVeroroute): ClimbResult {
  fs.mkdirSync(input.runDir, { recursive: true })
  const transport: GestureTransport = input.batch ? "batched" : "one-gesture-per-launch"
  const cap = input.rules.evaluationCap
  const history: number[] = []
  const acceptedPerRound: number[] = []
  let unscoreable = 0
  let firstUnscoreable: string | null = null

  const evaluateInto = (board: string, tag: string): Measured => {
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
    // ONE ENTRY PER EVALUATION, APPENDED WHERE THE EVALUATION HAPPENS, so there
    // is no path through this function that measures a candidate without
    // recording its F.
    history.push(measured.evaluation.score.objective)
    return measured
  }

  // THE START IS EVALUATED, which is also what makes Task 16's requireMeasured
  // satisfiable: a run that scored no candidate has not measured the start it
  // was handed, and that refusal exists because a runner reporting zero
  // evaluations once produced a retirement recommendation out of nothing.
  const first = evaluateInto(start, "start")
  // THE STARTING GEOMETRY IS THE CALLER'S, AND NOTHING HERE READS IT OFF A
  // DUMP. Deriving it was the last thing standing between the constructed and
  // random arms and a climb at all: both turn parts before the climb is called,
  // and a turned part is exactly what a dump cannot describe. `seedCandidate`
  // hands it over, so this module needs no read and carries no such refusal.
  let incumbent: State = { board: start, measured: first, occupancy: input.occupancy }
  // THE BEST CANDIDATE SEEN, WHICH IS NOT THE INCUMBENT ONCE `E3` IS
  // CONFIGURED. A bounded worse-acceptance moves the walk and must not move the
  // result; see the module comment. `strictlyBetter` is the acceptance rule's
  // own, so the two cannot disagree about which of two boards is better.
  let best: Evaluation = first.evaluation
  // THE BEST CANDIDATE'S BOARD AND GEOMETRY, TRACKED BESIDE ITS `Evaluation`
  // rather than looked up afterwards. There is nowhere to look it up from: the
  // occupancy is this loop's own carried state and no dump can be read back
  // into one, so a field recovered later would have to re-derive a geometry
  // `occupancyOf` refuses. See `ClimbResult.bestStart`.
  let bestStanding: State = incumbent
  let base = incumbent
  let rounds = 0
  let spent = false

  while (!spent) {
    const moves = applicableMoves(
      enumerateMoves(base.occupancy, base.measured.dump, input.reference),
    )
    if (moves.length === 0) {
      throw new Error(
        `climb: the move set is empty on ${base.measured.evaluation.candidate}, so this round ` +
          "sweep nothing and the climb would report a local optimum it never tested. It is not " +
          "treated as convergence: enumerateMoves found no gesture the placement model admits - " +
          "every part boxed in, nothing stretchable, no net spanning two strips - which is a " +
          "fact about the board worth stopping on. Check the board's grid against its parts' " +
          "rects, and DEFERRED_KINDS in tools/stripboard/moves.ts for what is left out by " +
          "declaration.",
      )
    }
    let accepted = 0
    for (const [index, move] of moves.entries()) {
      // THE CAP COUNTS WHAT THE RUN SPENT, WHICH INCLUDES THE CANDIDATES IT
      // COULD NOT SCORE: each cost the same four fork invocations as a scored
      // one, and a board whose every wire candidate shorts would otherwise
      // sweep forever against a cap that never moved.
      if (history.length + unscoreable >= cap) {
        spent = true
        break
      }
      const tag = `r${rounds}-m${index}`
      const candidateBoard = path.join(input.runDir, `${tag}.vrt`)
      // THE SAME CALL THE ENUMERATION USED TO PROPOSE THIS MOVE, so the set
      // the search sweeps and the state it carries cannot disagree about what a
      // gesture does. `undefined` here is a defect in this loop and not a state
      // to carry forward, exactly as `withPartTurned` says of itself: the
      // occupancy is not advanced past a gesture that cannot happen.
      const type = base.measured.dump.parts.find((part) => part.ref === refOf(move))?.type
      const advanced = occupancyAfter(base.occupancy, base.measured.dump, move, type)
      if (advanced === undefined) {
        throw new Error(
          `climb: ${describeMove(move)} was proposed by enumerateMoves and the same model now ` +
            "says the occupancy cannot be advanced past it. The two cannot disagree - they are " +
            "one call - so this is a defect in the climb rather than a gesture to skip, and the " +
            "occupancy is NOT left unadvanced: a state that disagreed with the board would make " +
            "every later round propose holes that are already taken.",
        )
      }
      applyMove(base.board, move, candidateBoard, spawn, transport)
      // A FRESH WIRE'S HOLES CARRY NODE ID 0 AND `--check`'s COMPLETENESS READS
      // NODE IDS, so a candidate carrying one is assigned to its net before
      // anything measures it. `./complete-apply.ts`'s `assignNodes` carries the
      // measurement: without this invocation a wire that physically joins two of
      // a net's pins leaves the net reported incomplete, `openNets` unchanged and
      // `F` up by `rho_w`, and the acceptance rule then rejects it for a reason
      // that is not about the gesture. It is ONE invocation and only for the
      // kinds `addsWire` names, so a candidate that adds no wire costs exactly
      // what it did before.
      const measuredBoard = addsWire(move)
        ? assignNodes(candidateBoard, { netlist: input.netlist }, input.runDir, tag, spawn)
        : candidateBoard
      // AN UNSCOREABLE CANDIDATE IS REJECTED AND COUNTED - see
      // `ClimbResult.unscoreable` for the measurement that forced it and why the
      // alternative is worse. ONLY that one refusal is caught, by its own name:
      // a fork failure, a geometry refusal or a grader refusal still stops the
      // run, because none of them says "this candidate cannot be compared".
      let measured: Measured
      try {
        measured = evaluateInto(measuredBoard, tag)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.startsWith(UNSCOREABLE)) throw error
        unscoreable += 1
        if (firstUnscoreable === null) firstUnscoreable = message
        continue
      }
      // THE TWO COMPARISON BOARDS ARE DIFFERENT AND BOTH ARE NAMED: a
      // regression is measured against the board this move was applied to, and
      // F against the best so far. See `AcceptanceInput`.
      const verdict = accepts(
        {
          predecessor: base.measured.evaluation,
          incumbent: incumbent.measured.evaluation,
          candidate: measured.evaluation,
        },
        input.rules,
      )
      if (verdict) {
        // THE BOARD CARRIED FORWARD IS THE GESTURED ONE, never the measured one:
        // see `State.board`.
        incumbent = { board: candidateBoard, measured, occupancy: advanced }
        // AND THE BEST SEEN IS UPDATED SEPARATELY, so an E3 acceptance cannot
        // make the run report a board worse than one it found.
        if (strictlyBetter(measured.evaluation, best)) {
          best = measured.evaluation
          bestStanding = incumbent
        }
        accepted += 1
      }
    }
    acceptedPerRound.push(accepted)
    rounds += 1
    // S3: a whole round produced no accepted move, which is a local optimum
    // under this move set and the only stopping rule this loop owns besides the
    // backstop.
    if (accepted === 0) break
    base = incumbent
  }

  return {
    best,
    // THE GESTURED BOARD, NOT `best.candidate` AND NOT `best`'s MEASURED FILE:
    // `candidate` is the painted board a score had to be read from, and a
    // gesture on a painted board is refused. `State.board` is the one a further
    // gesture applies to, and for a wire candidate it is not the file that was
    // measured either - see that field.
    bestStart: { board: bestStanding.board, occupancy: bestStanding.occupancy },
    rounds,
    evaluations: history.length,
    acceptedPerRound,
    history,
    unscoreable,
    firstUnscoreable,
  }
}
