/**
 * `F`, the search's number, and the three checks that ride on every
 * evaluation of it.
 *
 * THE AUTHORITY for everything below is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) - `OBJ1`, `PAR1`, `K1`, `K5`, `HC2` and `V1`/`V2` - and, for the
 * cost model, `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` (COST) §1.4, §1.6, §2.1,
 * §4.1 and §5. Where this module and those documents differ, the documents
 * win and this comment is the defect.
 *
 *     F = C_necessary + ρ_w·W + ρ_s·B            (OBJ1, COST §4.1)
 *
 * `W` and `B` are the counts of `WIRE` and `SOLDER` lines. **`C` IS NO LONGER
 * THE `CUT ` LINE COUNT, AND THAT IS THE OWNER'S DECISION RATHER THAN A
 * REFINEMENT OF OBJ1'S ARITHMETIC.** He was asked whether the search should
 * score on the cuts he would actually make or on the cuts VeroRoute reports,
 * and answered **"option C"**: *"Both. Score on real cuts so the search can
 * act, keep VeroRoute's number in the report so you always see both. If they
 * ever disagree badly, you'd spot it."* So `F` charges `C_necessary` from
 * `./cut-necessity.ts`, `Score.cuts` still carries VeroRoute's own count
 * beside it, and `./report.ts` prints both and the disagreement between them.
 * The deviation is recorded in
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`, because `C` is a
 * term of `F` and `F` is the owner's criteria; CRITERIA and COST are left as he
 * wrote them.
 *
 * **WHAT THAT COSTS IS THE "EVERY TERM IS A LINE COUNT" PROPERTY, AND THE
 * REPLACEMENT IS NAMED RATHER THAN GLOSSED.** This file used to say that every
 * term of `F` is a line count in a report the producing agent did not write,
 * which is why cut minimisation is allowed to be an agent's job at all (COST
 * §0). `C_necessary` is a DERIVED count, so that sentence no longer covers it.
 * What stands in its place is that the derivation is not this module's and not
 * the search's: it is `HC8`'s copper reconstruction
 * (`./cut-necessity.ts`, `./equivalence.ts`), computed outside VeroRoute from
 * the exported geometry and the netlist export, and the same instrument that
 * proved the phantom cuts removable. Nothing in the necessary count is derived
 * from a quantity this file computes - see that module's own comment. `ρ_w` and
 * `ρ_s` come from
 * `stripboard/rules.json` and from nowhere else: no weight, bound or
 * threshold is written in this file, because a number that entered the
 * criteria through the implementation is a criterion nobody reviewed
 * (CRITERIA PAR3). `OBJ2` forbids a legibility, tidiness or neatness term,
 * and that is a standing prohibition rather than an omission.
 *
 * THREE CHECKS RIDE ON EVERY SINGLE EVALUATION, because each is free and
 * exact:
 *
 * - **`V1`, an independent count.** `countLines` counts the same three line
 *   kinds from the raw dump text and **imports nothing from
 *   `tools/guide/dump.ts`** - that is what makes it a second path rather than
 *   a second call. Two paths that could disagree about one board is the
 *   defect this pipeline is built to avoid, so `scoreDump` compares them and
 *   refuses a disagreement - and it cannot be called without the second
 *   path's result, which `IndependentCount` below is for. **Not a docstring
 *   asking callers to run it first:** a check a caller may skip is a check
 *   that looks like it passed, which is the failure this whole workflow
 *   exists to prevent.
 * - **`V2`, the identity with its `J ≥ 0` reading. IT IS COMPUTED ON THE
 *   REPORTED CUT COUNT AND NOT ON THE CHARGED ONE**, because `C = N + J −
 *   S_occ` is a statement about the copper this dump describes - one cut per
 *   place where two net segments abut on one strip - and `C_necessary` is a
 *   count of the subset of those cuts the board cannot do without. Feeding the
 *   charged count in would make `J` and `κ` describe a board with cuts taken
 *   out of it, which is not the board being scored and is not the board COST
 *   §1.6's figures were derived from. `C = N + J − S_occ`
 *   (COST §1.4) closes on every candidate, through `segmentJoins` in
 *   `./targets.ts`, which is the ONE implementation of it: a second copy here
 *   would turn `V2` into a comparison of one module against a copy of itself.
 *   A negative `J` is impossible - `J = Σ(k_n − 1)` and every term is at
 *   least zero - and is the detector for a board the identity cannot
 *   describe. `transistor-preamp-lab` yields `J = −1` because its `CUT_STATE`
 *   is `UNRESOLVED`, which is why the state is ALSO read directly here.
 *   **AND `J ≥ 0` IS NOT A SAFETY NET FOR AN UNRESOLVED BOARD - measured,
 *   not argued.** With the `cutState` clause disabled, the `UNRESOLVED`
 *   fixture in `./score.test.ts` raised NO refusal at all, because its terms
 *   still give `J = 1 − 2 + 2 = 1`. The negative `J` catches an unresolved
 *   board only when the absent cut list happens to drive `J` below zero, as
 *   it does on `transistor-preamp-lab` and does not on a small one. `HC2`
 *   calls it a cheap second reading and explicitly not a substitute; the
 *   explicit check is the one that holds.
 * - **`K5`, the floor invariant.** `F ≥ F_floor` always, `F_floor = C_floor`.
 *   **A candidate scoring below the declared floor is a VERIFICATION
 *   FAILURE, not an unexpectedly good result**, and the run refuses rather
 *   than keeping it: `(F − F_floor)/max(1, F_0 − F_floor)` goes negative and
 *   `Q2` and `A3` both pass with room to spare, so a scorer that can report
 *   an impossible score will, and it will look like success.
 *
 * `N` AND `P` ARE DUMP-SOURCED, AND THIS IS THE ONE PLACE IT IS EASY TO GET
 * WRONG. `CRITERIA K1` states it outright - "`N` the `NODE` count, `P` the
 * `PIN` count" - and `./targets.ts`'s `pinCount` and `netCount` are a
 * DIFFERENT quantity: they are derived from the model, as the floor must be.
 * Mixing the two is not a stylistic matter, it is measurably wrong, and
 * low-boost is the measurement: its model carries `N = 14` and `P = 50` (COST
 * §2.3's fourteen nets, and forty on-board pins plus the frozen dump's ten
 * `PAD` lines) while its committed layout has nine `NODE` and twenty-seven
 * `PIN` lines, all five layouts being stale against the model (COST §2.3).
 * THREE MIXINGS ARE POSSIBLE AND ALL THREE ARE WRONG DIFFERENTLY, so each is
 * named with its own figure - `1/41` alone identifies none of them:
 *
 * - `N` from the model, `P` from the dump: `J = 5 − 14 + 5 = −4` and the run
 *   REFUSES a board COST §1.6 derives by hand. Measured.
 * - `P` from the model, `N` from the dump (the mix): `κ = 1/(50 − 9) = 1/41`
 *   where COST §5 measures `1/18`. Measured.
 * - both from the model: `κ` would be `1/(50 − 14) = 1/36`, and that figure is
 *   UNREACHABLE because the negative `J` of the first case refuses first. It
 *   is recorded so nobody reads `1/41` as "the" wrong answer.
 *
 * Only the fully dump-sourced reading reproduces COST's recorded figures.
 *
 * SO WHAT `targets` IS FOR HERE: the board's NAME, which is how a refusal
 * says which candidate failed, and `cutFloor`, which is `K5`'s bound and is
 * derived from the model's `N` and the board's `R` by `P0` (COST §2.1).
 * Nothing else in it is read, and `./score.test.ts` proves that by scoring a
 * fixture against targets whose `N` and `P` the dump contradicts.
 *
 * THE SCORER IS THE SEARCH'S NUMBER; THE GRADER IS THE PRODUCT. `R2` keeps
 * the thing that mutates the board and the thing that certifies it as two
 * implementations of nothing in common, so **the grader imports none of
 * this** and Task 14 asserts that over the transitive import closure of
 * `grade.ts` and `constraints.ts`. Nothing here may be imported from there to
 * save a few lines.
 *
 * NO VERDICT AND NO TOLERANCE IS REPORTED. `tau` is `null` in the committed
 * rules - deliberately unset (CRITERIA K4) - so `Q2` and `A3` do not fire,
 * and a `Score` is nine counts with no grade attached. The gap against the
 * floor is reported by the run, not decided here.
 */
import type { BoardDump } from "../guide/dump.ts"
import { boardGeometry } from "./copper.ts"
import { necessaryCuts, type CutNecessity } from "./cut-necessity.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { StripboardRules } from "./rules.ts"
import { clustering, occupiedStrips, segmentJoins, type BoardTargets } from "./targets.ts"

/**
 * The three refusals this module raises, as a union rather than loose strings
 * so the `switch` below proves every member has a reason: add a fourth
 * without an arm and `bun run typecheck` fails, because `notDefaultedBecause`
 * then has a reachable end and a declared `string` return. The same device as
 * `TargetsRefusal`'s in `./targets.ts`.
 *
 * `negative-joins` and `clustering-undefined` are NOT here: they are
 * `./targets.ts`'s, raised by the one implementation of the identity, and a
 * copy of them under a `score-` prefix would be a second wording of one
 * condition.
 */
export type ScoreRefusal =
  | "score-cuts-not-computed"
  | "score-count-disagreement"
  | "score-necessity-count-disagreement"
  | "score-below-floor"

/** One sentence per refusal: what is missing, and why it is not defaulted. */
function notDefaultedBecause(refusal: ScoreRefusal): string {
  switch (refusal) {
    case "score-cuts-not-computed":
      return (
        "C is the count a DERIVATION produced (COST H2, CRITERIA HC2), and under UNRESOLVED " +
        "the cut list is absent rather than empty - so zero CUT lines means the cuts could " +
        "not be worked out, not that none are needed, and the identity C = N + J - S_occ " +
        "cannot describe the board. Scoring it anyway would price a board at zero cuts and " +
        "rank it first, which is the best score in the run awarded to the one board nothing " +
        "is known about. Run `--author --op autofill` on the candidate and check CUT_CONFLICT; " +
        "transistor-preamp-lab is this case live, with nineteen of them."
      )
    case "score-count-disagreement":
      return (
        "V1 exists because two code paths that could disagree about one board is the defect " +
        "this pipeline is built to avoid, so a disagreement is the finding and not an " +
        "inconvenience: one of the two is miscounting, and which one is unknown at the point " +
        "the disagreement is noticed. Neither is preferred and no count is reconciled - " +
        "picking either would pick the one that happens to be wrong half the time, silently. " +
        "Fix the parse in tools/guide/dump.ts or the line matching in countLines, whichever " +
        "the two counts show to be off."
      )
    case "score-necessity-count-disagreement":
      return (
        "The drop test counts the dump's CUT lines itself, off the text it was handed, so this " +
        "disagreement means the classifier and the scorer were handed DIFFERENT TEXT - two " +
        "boards being scored as one. Neither count is preferred and neither is reconciled: " +
        "which text is the candidate's is not knowable here, and charging either would charge " +
        "one board for another board's cuts. It is NOT the owner's reported-versus-necessary " +
        "disagreement, which is expected and is reported rather than refused (see Score.cuts): " +
        "this is the two readings of VeroRoute's OWN number failing to agree. Score through " +
        "scoreDumpText, which reads the text once and derives both from it."
      )
    case "score-below-floor":
      return (
        "F_floor = C_floor is a LOWER bound (CRITERIA K5, COST 2.1), so a candidate beneath " +
        "it is not an unexpectedly good result - it is proof that one of the two numbers is " +
        "not the quantity it claims to be: the floor derivation, this scorer, or the dump it " +
        "read. It is refused rather than kept with a negative gap because the alternative is " +
        "a pipeline reporting that it beat a bound it derived itself, which is the most " +
        "convincing wrong answer available to it: the tolerance (F - F_floor)/max(1, F_0 - " +
        "F_floor) goes negative and Q2 and A3 both pass with room to spare. Check the board " +
        "the targets were derived from against the board the dump came from."
      )
  }
}

function refuse(refusal: ScoreRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA OBJ1, PAR1, HC2, K5 and V1/V2 and COST sections 1.4, 2.1 and 4.1 are the " +
      "authority, and tools/stripboard/score.ts is the only implementation of F.)",
  )
}

/** The three line counts `V1` compares, straight off the dump: `C`, `W` and `B`. */
export interface LineCounts {
  /** `C`: `CUT ` lines. */
  readonly cuts: number
  /** `W`: `WIRE` lines. */
  readonly wires: number
  /** `B`: `SOLDER` lines. */
  readonly solder: number
}

/**
 * The three counts `F` is PRICED from, which is not the same object as
 * `LineCounts`: `cuts` here is `C_necessary` and the other two are line counts.
 *
 * A SEPARATE TYPE RATHER THAN REUSING `LineCounts`, because `LineCounts.cuts`
 * is documented as the `CUT ` line count and passing the charged count under
 * that name would make the type say something false about its own field. The
 * two are structurally compatible, so a caller can still price a `LineCounts`
 * - which is what a board whose every cut is necessary amounts to - but the
 * name at the call site says which number was handed over.
 */
export interface ChargedCounts {
  /** `C_necessary`: the cuts the drop test could not remove (`./cut-necessity.ts`). */
  readonly cuts: number
  /** `W`: `WIRE` lines. */
  readonly wires: number
  /** `B`: `SOLDER` lines. */
  readonly solder: number
}

/** One candidate's number, and every term it was built from. */
export interface Score {
  /**
   * `C`: the `CUT ` lines the dump prints - **VeroRoute's own number, which
   * `F` does NOT charge.**
   *
   * It is carried because the owner asked for both counts to be visible
   * ("option C", quoted in the module comment), and because the identity `C =
   * N + J − S_occ` and `κ` are stated over it. `./report.ts` prints it beside
   * `necessaryCuts` and names the disagreement.
   */
  readonly cuts: number
  /**
   * `C_necessary`: the cuts `F` charges - the ones whose removal would leave
   * two reference nets' leads sharing a copper component, by `HC8`'s
   * reconstruction (`./cut-necessity.ts`).
   *
   * Never greater than `cuts`. Equal to it on an undisturbed board - measured
   * 5 of 5 on the owner's hand-laid low-boost and 38 of 38 on the
   * import-placed start - and smaller on a board the search has moved parts
   * on, which is the whole reason it exists.
   */
  readonly necessaryCuts: number
  readonly wires: number
  readonly solder: number
  /** `F = C_necessary + ρ_w·W + ρ_s·B`. */
  readonly objective: number
  /** `N`: the dump's `NODE` count. NOT the model's net count - see above. */
  readonly netCount: number
  /** `P`: the dump's `PIN` count. NOT the model's pin count - see above. */
  readonly pinCount: number
  /** `S_occ`: the distinct strips holding a lead. */
  readonly occupied: number
  /** `J = C − N + S_occ`, the segment joins this layout requires. */
  readonly joins: number
  /** `κ = J/(P − N)` ∈ `[0, 1]` (CRITERIA K1). `κ = 0` is NOT the floor. */
  readonly clustering: number
}

/** The keywords `countLines` counts, each named once. */
const COSTED_LINES = { cuts: "CUT", wires: "WIRE", solder: "SOLDER" } as const

/**
 * The brand that makes `IndependentCount` unforgeable, and IT IS DELIBERATELY
 * NOT EXPORTED: a symbol no other module can name is a property no other
 * module can write, so `countLines` is the only thing in the repository that
 * can produce an `IndependentCount`.
 */
const COUNTED_FROM_TEXT: unique symbol = Symbol("stripboard/score: counted from the raw text")

/**
 * `C`, `W` and `B` as `V1`'s second path counted them, carrying proof of
 * where they came from.
 *
 * WHY A WITNESS TYPE RATHER THAN A DOCSTRING, which is the whole of this
 * module's answer to "a skipped check must never look like a passing one".
 * `scoreDump` takes one of these, so **there is no way to call the scorer at
 * all without having run the second path**: `V1` rides on every evaluation
 * through either entry point, and the guard cannot decay into a note, because
 * removing it is a compile error at every call site rather than a test
 * somebody deletes. A Task-14-style "nothing outside `score.ts` imports
 * `scoreDump`" assertion was the alternative; it polices who may import the
 * function instead of making the check unskippable, and it is itself a test
 * that can be weakened.
 *
 * WHAT THE BRAND CLOSES, AND WHAT IT DOES NOT. A guard honestly described is
 * worth more than one over-sold, and all four of these were tried:
 *
 * - **It closes the ACCIDENTAL bypass, which is the failure that actually
 *   happened here** - a test calling the two-check form directly. Measured:
 *   a three-argument call is `TS2554`, "Expected 4 arguments, but got 3"; a
 *   hand-built `{ cuts, wires, solder }` is `TS2345`, naming
 *   `[COUNTED_FROM_TEXT]` as missing. **Both are `bun run typecheck` gates and
 *   not runtime ones** - a forged literal still runs under `bun test`, which
 *   does not typecheck - so the guard is as strong as the typecheck step is
 *   mandatory, and no stronger.
 * - **It closes the WRONG-BOARD witness at runtime.** A count taken from
 *   another board's text typechecks and is then refused by
 *   `requireCountsAgree`, because `scoreDump` holds the witness against its
 *   own dump rather than taking it on trust. Measured.
 * - **It does NOT stop a deliberate cast.** `{ ... } as unknown as
 *   IndependentCount` typechecks clean and scores a real `Score` with no
 *   refusal - measured - and that is the generic limit of every branded type
 *   in TypeScript rather than anything particular to this one. It is a
 *   DIFFERENT ACT: somebody writing that is knowingly forging a witness to a
 *   check they are disabling, which this project bans separately (CLAUDE.md's
 *   "never bypass typing": no `any`, no `as Type`, no `@ts-ignore`). The brand
 *   makes the skip impossible to reach by accident and impossible to reach
 *   silently; it cannot make it impossible to reach on purpose, and nothing in
 *   a type system can.
 *
 * SO WHAT THE WITNESS PROVES is that `countLines` produced these three
 * numbers and that they describe the dump being scored. What nothing here can
 * prove is that `countLines` was handed the same text `boardGeometry` was: a
 * caller passing `countLines(someOtherText)` whose three counts happen to
 * match all three of this dump's would pass. `scoreDumpText` closes that,
 * because it reads the text once; a caller holding a parsed dump owns the
 * pairing.
 */
export interface IndependentCount extends LineCounts {
  readonly [COUNTED_FROM_TEXT]: true
}

/**
 * `V1`'s SECOND CODE PATH: `C`, `W` and `B` counted off the raw dump text.
 *
 * IT IMPORTS NOTHING FROM `tools/guide/dump.ts`, not even the tokenizer, and
 * that is the entire point - a second call into one parser agrees with itself
 * by construction and checks nothing. It would catch a parse that dropped a
 * line, which is the failure `V1` is stated against.
 *
 * THE FIRST WHITESPACE-SEPARATED TOKEN MUST EQUAL THE KEYWORD, rather than
 * the line merely starting with it, and that distinction is live in a
 * committed fixture rather than hypothetical: `CUT_STATE COMPUTED` starts
 * with `CUT`, so a bare-prefix match reports six cuts on the frozen low-boost
 * dump where there are five.
 */
export function countLines(dumpText: string): IndependentCount {
  const counts = { cuts: 0, wires: 0, solder: 0 }
  for (const line of dumpText.split("\n")) {
    const keyword = line.trim().split(/\s+/)[0]
    if (keyword === COSTED_LINES.cuts) counts.cuts += 1
    else if (keyword === COSTED_LINES.wires) counts.wires += 1
    else if (keyword === COSTED_LINES.solder) counts.solder += 1
  }
  return { ...counts, [COUNTED_FROM_TEXT]: true }
}

/** The same three counts off the PARSED dump: `V1`'s first path. */
function countParsed(dump: BoardDump): LineCounts {
  return { cuts: dump.cuts.length, wires: dump.wires.length, solder: dump.bridges.length }
}

/**
 * `V1`: refuse unless the two paths agree on all three counts, naming the
 * term, both numbers and the board.
 *
 * All three are compared and the refusal names whichever disagreed - a check
 * written over `cuts` alone would pass a parse that dropped a `WIRE`, which
 * is the kind of partial check this plan exists to replace.
 */
export function requireCountsAgree(
  parsed: LineCounts,
  counted: LineCounts,
  board: string,
): void {
  const disagreements: string[] = []
  for (const term of ["cuts", "wires", "solder"] as const) {
    if (parsed[term] !== counted[term]) {
      disagreements.push(
        `${COSTED_LINES[term]}: the parsed dump has ${parsed[term]} and the raw text has ` +
          `${counted[term]}`,
      )
    }
  }
  if (disagreements.length > 0) {
    refuse(
      "score-count-disagreement",
      `${board}'s two line counts disagree - ${disagreements.join("; ")}`,
    )
  }
}

/**
 * `HC2`, in ONE wording and ONE place: refuse a dump whose cut list is absent
 * rather than empty.
 *
 * **IT IS A FUNCTION RATHER THAN A CLAUSE INSIDE `scoreDump` BECAUSE THE DROP
 * TEST FORCED IT, AND THE ALTERNATIVE WAS A LIVE BUG.** `scoreDumpText` has to
 * classify the cuts before it can call `scoreDump` - an argument is evaluated
 * before the call it is an argument to - and `necessaryCuts` reaches
 * `copperGraph`, which refuses an unresolved board with the GEOMETRY CONTRACT's
 * wording (`cuts-not-computed`) rather than the scorer's. That rename is not
 * cosmetic: `./climb-model.ts`'s `UNSCOREABLE` matches
 * `score-cuts-not-computed` by name to tell *this candidate cannot be
 * evaluated* from *this run has a defect*, and an unresolved board arriving
 * under the other name would STOP A RUN where the search is supposed to reject
 * and count the candidate - on the import-placed low-boost board that is
 * hundreds of candidates per run (`ClimbResult.unscoreable`). So both entry
 * points call this, `scoreDumpText` before it classifies and `scoreDump` as its
 * first act, and HC2 is still the first refusal either one can raise.
 */
export function requireCutsComputed(dump: BoardDump, board: string): void {
  if (dump.cutState !== "COMPUTED") {
    refuse(
      "score-cuts-not-computed",
      `${board}'s dump reports CUT_STATE ${dump.cutState}, which is not COMPUTED`,
    )
  }
}

/**
 * `F = C_necessary + ρ_w·W + ρ_s·B` (OBJ1, COST §4.1), and the one place that
 * arithmetic lives.
 *
 * **IT PRICES WHATEVER CUT COUNT IT IS HANDED, and the caller is where the
 * owner's decision is applied**: `scoreDump` passes `C_necessary`, and the
 * `ChargedCounts` name at that call site says so. This function cannot tell
 * the two counts apart and must not try - a scorer that re-derived which
 * number to charge would be a second place the decision lives.
 *
 * Both weights are arguments rather than constants: they are the owner's
 * (CRITERIA PAR1, recorded with their reasoning in `stripboard/rules.json`'s
 * notes), and anybody wanting different ones edits that file under `K3`'s
 * ratchet, not this function. **No figure for either is written here**, which
 * is why this comment did not go stale when `ρ_s` moved from PAR1's 1 to the
 * price of a wire on the owner's instruction (recorded as a deviation in
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`); the note in the
 * rules file is where a value and its warrant live together.
 */
export function objectiveOf(charged: ChargedCounts, rules: StripboardRules): number {
  return charged.cuts + rules.rhoWire * charged.wires + rules.rhoSolder * charged.solder
}

/**
 * Score one candidate: all three checks, on every call.
 *
 * `V1` CANNOT BE COUNTED HERE, because a `BoardDump` is already parsed and
 * carries no source text - which is a fact about the interface and not a
 * preference. So the second path's result is an ARGUMENT, and its type is one
 * only `countLines` can produce: a caller cannot reach this function without
 * having counted the text independently, and `requireCountsAgree` below then
 * holds that count against this dump. `scoreDumpText` is the convenience that
 * reads the text once and does both.
 *
 * **`necessity` IS AN ARGUMENT FOR THE SAME REASON AND BY THE SAME DEVICE.**
 * The drop test works on dump TEXT - it hands a trial board to `HC8`'s
 * reconstruction, and two of that contract's refusals are inexpressible
 * through a `BoardDump` - so it cannot run from a parsed dump either. Its
 * result type is branded and only `necessaryCuts` can produce one, so a caller
 * cannot score a candidate while skipping the classification or substitute a
 * cut count of its own: both are compile errors rather than a docstring asking
 * callers to behave.
 */
export function scoreDump(
  dump: BoardDump,
  targets: BoardTargets,
  rules: StripboardRules,
  counted: IndependentCount,
  necessity: CutNecessity,
): Score {
  // HC2 FIRST, before anything is counted or compared, and that ordering holds
  // on BOTH entry points - `scoreDumpText` raises this same refusal through
  // this same function before it classifies the cuts, for the reason
  // `requireCutsComputed` carries. Under UNRESOLVED the cut list is absent, so
  // C, J and kappa would all be computed from a number that is not a count, and
  // a board that is both unresolved and mis-parsed should report the unresolved
  // state rather than the count disagreement it also has. The refusal
  // `copperGraph` raises for the same condition is deliberately a separate
  // wording in a separate module - the scorer and the grader are separate paths
  // (R2), so a refusal living in only one of them protects only one of them.
  requireCutsComputed(dump, targets.board)

  // V1, and it is re-anchored to THIS dump rather than taken on trust: the
  // witness proves the second path ran, and this comparison proves it ran on
  // the board being scored.
  const counts = countParsed(dump)
  requireCountsAgree(counts, counted, targets.board)

  // THE CLASSIFIER'S OWN READING OF VEROROUTE'S NUMBER, HELD AGAINST THIS
  // DUMP'S. `necessaryCuts` counts the CUT lines of the text it was handed
  // rather than being told, so this comparison catches the one way the two can
  // be about different boards: a caller pairing a dump with another board's
  // classification. It is NOT the owner's reported-versus-necessary gap, which
  // is expected and reported; both counts here are VeroRoute's.
  if (necessity.reported !== counts.cuts) {
    refuse(
      "score-necessity-count-disagreement",
      `${targets.board}'s dump has ${counts.cuts} CUT line(s) and the drop test was run over a ` +
        `text with ${necessity.reported}`,
    )
  }

  const netCount = Object.keys(dump.nodes).length
  const pinCount = Object.values(dump.pins).reduce((total, pins) => total + pins.length, 0)
  const occupied = occupiedStrips(dump)
  // THE IDENTITY TAKES THE REPORTED COUNT, NOT THE CHARGED ONE - see the module
  // comment's V2 bullet. J and kappa describe the copper this dump has.
  const joins = segmentJoins(counts.cuts, netCount, occupied)
  const objective = objectiveOf(
    { cuts: necessity.necessary, wires: counts.wires, solder: counts.solder },
    rules,
  )

  // K5, and the comparison is `<` rather than `<=`: a candidate AT its floor
  // is the one Q1 reports as `at-floor`, the only optimality claim this
  // pipeline may make, and refusing it would refuse a provably optimal layout.
  if (objective < targets.cutFloor) {
    refuse(
      "score-below-floor",
      `${targets.board} scores F = ${objective}, below its declared floor of ` +
        `${targets.cutFloor} (C_necessary = ${necessity.necessary} of ${counts.cuts} reported, ` +
        `W = ${counts.wires}, B = ${counts.solder})`,
    )
  }

  // Written out field by field rather than spread, because `./score.test.ts`
  // pins the keys: a spread would carry a further field out of `LineCounts`
  // into a `Score` without anybody naming it here.
  return {
    cuts: counts.cuts,
    necessaryCuts: necessity.necessary,
    wires: counts.wires,
    solder: counts.solder,
    objective,
    netCount,
    pinCount,
    occupied,
    joins,
    clustering: clustering(joins, pinCount, netCount),
  }
}

/**
 * Score one candidate from its dump TEXT: the entry that reads the text once,
 * so the independently counted lines and the parsed dump provably describe
 * the same characters.
 *
 * IT RAISES EXACTLY ONE REFUSAL OF ITS OWN ACCORD, AND IT IS `scoreDump`'s
 * FIRST ONE, THROUGH `scoreDump`'s OWN FUNCTION. This function used to check
 * nothing at all; the drop test changed that, because the classification is an
 * ARGUMENT to `scoreDump` and therefore runs before it, and an unresolved board
 * reaching `copperGraph` refuses under the geometry contract's name instead of
 * the scorer's. `requireCutsComputed` carries what that would have cost. Every
 * other refusal is still `scoreDump`'s, in `scoreDump`'s order, and the order
 * of the three checks is unchanged on both entry points.
 *
 * `boardGeometry`, NOT `parseBoardDump`: a parsed dump skips every geometry
 * refusal, so text fed through the parser never exercises the contract `HC8`
 * is stated in. The same correction Tasks 3, 4, 5 and 11 each needed.
 *
 * **IT TAKES THE REFERENCE NETLIST BECAUSE THE DROP TEST DOES.** A cut is
 * necessary when removing it joins two REFERENCE nets' leads, and the
 * reference side comes from the netlist export - upstream of VeroRoute
 * entirely (`./equivalence.ts`). Deriving it from the dump's own `NODE` lines
 * instead would be the search asking VeroRoute's bookkeeping to price
 * VeroRoute's own cuts, which is the circularity `HC8` exists to break.
 */
export function scoreDumpText(
  dumpText: string,
  targets: BoardTargets,
  rules: StripboardRules,
  reference: ReferenceNets,
): Score {
  const dump = boardGeometry(dumpText)
  requireCutsComputed(dump, targets.board)
  return scoreDump(dump, targets, rules, countLines(dumpText), necessaryCuts(dumpText, reference))
}
