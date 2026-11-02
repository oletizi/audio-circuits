/**
 * `F = C + rho_w*W + rho_s*B` over a candidate in memory - the objective the
 * search minimises, and the only arithmetic in this file.
 *
 * **NOTHING HERE INVENTS A NUMBER, AND THAT IS THE WHOLE POINT OF THE MODULE'S
 * SHAPE.** The two weights are the owner's, recorded with their reasoning in
 * `stripboard/rules.json` (CRITERIA PAR1, PAR3), and they arrive as an ARGUMENT.
 * A figure written into this file would be an agent setting a criterion its own
 * output is then graded by - the one invariant this repository is built around:
 * *"an agent may never author the acceptance criteria for the artifact it is
 * producing."* So no weight is spelled here, not even as a comment's example,
 * and this comment does not go stale when the owner changes one.
 *
 * **WHY THE WEIGHTS ARE PASSED IN RATHER THAN LOADED.** `loadRules` is the
 * strict loader for that file and it lives in `tools/stripboard/rules.ts`;
 * `lib/stripboard/` is the core and **may not import from `tools/`**, which
 * `tests/stripboard/model/no-fork.test.ts` enforces over the whole import
 * closure. A caller hands over `loadRules()`'s result directly: `StripboardRules`
 * satisfies `ObjectiveWeights` structurally, so no cast and no re-spelling of
 * the values stands between the reviewed file and the arithmetic.
 *
 * **THE TERM LIST IS CLOSED.** `C`, `W` and `B` are OBJ1's three terms and
 * nothing else enters: no legibility, tidiness or neatness term (OBJ2, which
 * forbids one outright), no penalty for a span, no bonus for a cluster. A
 * candidate that is unbuildable or electrically wrong is not priced badly here -
 * it is REFUSED elsewhere, by the invariants and the hard constraints, because a
 * constraint folded into the objective is a constraint with a price the search
 * can pay.
 *
 * **WHAT EACH TERM IS, AND WHERE IT COMES FROM:**
 *
 *   - `C` is `cuts.length` - the length of the list `derivedCuts` in
 *     `./cuts.ts` returned for this candidate. **It is a parameter and is not
 *     re-derived here.** The derivation needs the reference netlist, which
 *     pricing a board does not; and the search derives the cuts once per
 *     candidate and then both checks and scores them, so deriving them again
 *     inside the scorer would double the only non-trivial work in the loop. The
 *     count is of ENTRIES: a list holding one cut twice is charged twice, and
 *     keeping that list well formed is the derivation's business rather than a
 *     second rule here.
 *   - `W` is `candidate.wires.length`.
 *   - `B` is `candidate.bridges.length`. A bridge is in the model BECAUSE it is
 *     in the objective - `./board.ts` says so at the type - and the owner's
 *     reason for its being priced beside a wire is on record: *"A solder blob
 *     will turn into a wire on my bench."*
 *
 * **THERE IS A SECOND IMPLEMENTATION OF `F` IN THE REPOSITORY, and it is said
 * here rather than left for somebody to find.** `tools/stripboard/score.ts`
 * computes the same objective over a DUMP's `CUT `, `WIRE` and `SOLDER` line
 * counts, for the pipeline that scores an exported artifact. The two are held to
 * the same arithmetic by a direct comparison in
 * `tests/stripboard/model/score.test.ts`; which of them survives is the plan's
 * decision, not this module's.
 *
 * **C's COEFFICIENT IS 1 AND IS NOT A WEIGHT.** `F` is stated in units of cuts;
 * the two ratios are what a wire and a blob cost RELATIVE to one. So there is no
 * third parameter absent from the rules file, and a `rhoCut` would be the same
 * objective scaled - which would change every recorded `F`, floor and tolerance
 * in the project while meaning nothing new.
 */
import type { Candidate } from "./board.ts"
import type { Cut } from "./cuts.ts"

function refuse(key: string, body: string): never {
  throw new Error(`${key}: ${body}`)
}

/**
 * The two weights `F` needs, and nothing else about the rules.
 *
 * **STRUCTURALLY SATISFIED BY `StripboardRules`**, so `objectiveOf(candidate,
 * cuts, loadRules())` type-checks at a call site in `tools/` with no cast and
 * no field copied across by hand. Declaring it here rather than importing that
 * type is what keeps the core off `tools/`; naming only the two fields it reads
 * is what stops this module from appearing to depend on the other nine
 * parameters.
 *
 * **EACH FIELD ADMITS `undefined` DELIBERATELY, AND THE FUNCTION REFUSES IT.** A
 * required `number` would make absence inexpressible - and then the refusal
 * below could only be driven by a cast, which this project forbids, so a
 * refusal that is never driven is a refusal nobody knows works. The type's job
 * is to make a weight impossible to FORGET: the properties are required, so a
 * caller writing an object literal must write both names, and one that is
 * genuinely unset has to say `undefined` out loud rather than leaving a gap.
 */
export interface ObjectiveWeights {
  /** `rho_w`: what one wire costs, in cuts. The owner's, from the rules file. */
  readonly rhoWire: number | undefined
  /** `rho_s`: what one solder bridge costs, in cuts. The owner's, likewise. */
  readonly rhoSolder: number | undefined
}

/** The sentence both weight refusals carry, because neither is defaulted. */
const NOT_DEFAULTED =
  "It is NOT defaulted: a weight this function filled in would be a criterion the search " +
  "grades its own boards against without review, which is the invariant stripboard/rules.json " +
  "exists to keep (CRITERIA PAR1, PAR3). Read the value from that file through loadRules in " +
  "tools/stripboard/rules.ts and hand the result in - it satisfies ObjectiveWeights as it " +
  "stands. If the number is missing from the file itself, that loader refuses by name and the " +
  "answer is a decision by the owner, not a figure chosen here."

/**
 * One weight, proven present and finite, with its own name in any refusal.
 *
 * **BOTH ARE CHECKED BEFORE EITHER IS USED, whatever the board holds.** A weight
 * is refused on a board with no wires exactly as on a board with forty: the
 * condition is a parameter that was not supplied, and a scorer that let it pass
 * whenever the term it prices happened to be zero would report the fault later,
 * on some other candidate mid-search, where it reads as a fault in the move that
 * added the first wire.
 *
 * **THE RANGE IS NOT JUDGED HERE.** `stripboard/rules.json`'s loader states and
 * enforces every parameter's bounds (PAR3), and a second opinion in the core
 * would be two places to keep in step and a core overruling the reviewed file.
 * What is refused is a value that is not a NUMBER at all: `NaN` arrives as one,
 * and every comparison against a `NaN` objective is false, so a search would
 * accept nothing and improve on nothing while reporting a score on every
 * candidate.
 */
function weightOf(value: number | undefined, name: string): number {
  if (value === undefined) {
    refuse(
      "stripboard-score-weight-absent",
      `"${name}" was not supplied, so F = C + rhoWire*W + rhoSolder*B has a term with no ` +
        `price and this candidate cannot be scored.\n${NOT_DEFAULTED}`,
    )
  }
  if (!Number.isFinite(value)) {
    refuse(
      "stripboard-score-weight-not-finite",
      `"${name}" is ${String(value)}, which is not a finite number, so F would not be a ` +
        `number either.\nFix whichever supplied it. Nothing is substituted: an objective of ` +
        `NaN compares false against every other candidate's, so the search would accept no ` +
        `move and report a score for each one it rejected; and an infinite objective ranks ` +
        `every board that has one equal to every other.\n${NOT_DEFAULTED}`,
    )
  }
  return value
}

/**
 * `F` for one candidate, given the cuts derived for it and the weights.
 *
 * The number is in units of cuts and lower is better. It says nothing about
 * whether the board is sound, buildable or complete - those are the invariants'
 * and the hard constraints' answers, and a candidate that fails one of them is
 * not scored badly but rejected.
 */
export function objectiveOf(
  candidate: Candidate,
  cuts: readonly Cut[],
  weights: ObjectiveWeights,
): number {
  const rhoWire = weightOf(weights.rhoWire, "rhoWire")
  const rhoSolder = weightOf(weights.rhoSolder, "rhoSolder")
  return cuts.length + rhoWire * candidate.wires.length + rhoSolder * candidate.bridges.length
}
