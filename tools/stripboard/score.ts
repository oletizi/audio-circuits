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
 *     F = C + ρ_w·W + ρ_s·B            (OBJ1, COST §4.1)
 *
 * `C`, `W` and `B` are the counts of `CUT `, `WIRE` and `SOLDER` lines, so
 * **every term is a line count in a report the producing agent did not
 * write** - which is the whole reason cut minimisation is allowed to be an
 * agent's job at all (COST §0). `ρ_w` and `ρ_s` come from
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
 *   defect this pipeline is built to avoid, so `scoreDumpText` runs both and
 *   refuses a disagreement.
 * - **`V2`, the identity with its `J ≥ 0` reading.** `C = N + J − S_occ`
 *   (COST §1.4) closes on every candidate, through `segmentJoins` in
 *   `./targets.ts`, which is the ONE implementation of it: a second copy here
 *   would turn `V2` into a comparison of one module against a copy of itself.
 *   A negative `J` is impossible - `J = Σ(k_n − 1)` and every term is at
 *   least zero - and is the detector for a board the identity cannot
 *   describe. `transistor-preamp-lab` yields `J = −1` because its `CUT_STATE`
 *   is `UNRESOLVED`, which is why the state is ALSO read directly here: the
 *   negative `J` is a sound cheap second reading of `HC2`'s condition and not
 *   a substitute for it.
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
 * Taking the identity's `N` from the targets would give `J = 5 − 14 + 5 = −4`
 * and REFUSE a board COST §1.6 derives by hand, and taking `P` from them
 * would report `κ = 1/41` where COST §5 measures `1/18`.
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

/** The three costed line counts: `C`, `W` and `B`. */
export interface LineCounts {
  /** `C`: `CUT ` lines. */
  readonly cuts: number
  /** `W`: `WIRE` lines. */
  readonly wires: number
  /** `B`: `SOLDER` lines. */
  readonly solder: number
}

/** One candidate's number, and every term it was built from. */
export interface Score {
  readonly cuts: number
  readonly wires: number
  readonly solder: number
  /** `F = C + ρ_w·W + ρ_s·B`. */
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
export function countLines(dumpText: string): LineCounts {
  const counts = { cuts: 0, wires: 0, solder: 0 }
  for (const line of dumpText.split("\n")) {
    const keyword = line.trim().split(/\s+/)[0]
    if (keyword === COSTED_LINES.cuts) counts.cuts += 1
    else if (keyword === COSTED_LINES.wires) counts.wires += 1
    else if (keyword === COSTED_LINES.solder) counts.solder += 1
  }
  return counts
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
 * `F = C + ρ_w·W + ρ_s·B` (OBJ1, COST §4.1), and the one place that
 * arithmetic lives.
 *
 * Both weights are arguments rather than constants: `ρ_w = 0.25` and
 * `ρ_s = 1` are the owner's (CRITERIA PAR1, recorded with their reasoning in
 * `stripboard/rules.json`'s notes), and anybody wanting different ones edits
 * that file under `K3`'s ratchet, not this function.
 */
export function objectiveOf(counts: LineCounts, rules: StripboardRules): number {
  return counts.cuts + rules.rhoWire * counts.wires + rules.rhoSolder * counts.solder
}

/**
 * Score one candidate, carrying `V2` and `K5`.
 *
 * `V1` CANNOT RIDE HERE, because a `BoardDump` is already parsed and carries
 * no text to count independently: use `scoreDumpText`, which is the entry
 * point that carries all three checks. This signature exists because the
 * search holds a parsed dump, and a caller that reaches it directly has
 * already run `V1` or has skipped it.
 */
export function scoreDump(
  dump: BoardDump,
  targets: BoardTargets,
  rules: StripboardRules,
): Score {
  // HC2 FIRST, before anything is counted: under UNRESOLVED the cut list is
  // absent, so C, J and kappa would all be computed from a number that is not
  // a count. The refusal `copperGraph` raises for the same condition is
  // deliberately a separate wording in a separate module - the scorer and the
  // grader are separate paths (R2), so a refusal living in only one of them
  // protects only one of them.
  if (dump.cutState !== "COMPUTED") {
    refuse(
      "score-cuts-not-computed",
      `${targets.board}'s dump reports CUT_STATE ${dump.cutState}, which is not COMPUTED`,
    )
  }

  const counts = countParsed(dump)
  const netCount = Object.keys(dump.nodes).length
  const pinCount = Object.values(dump.pins).reduce((total, pins) => total + pins.length, 0)
  const occupied = occupiedStrips(dump)
  const joins = segmentJoins(counts.cuts, netCount, occupied)
  const objective = objectiveOf(counts, rules)

  // K5, and the comparison is `<` rather than `<=`: a candidate AT its floor
  // is the one Q1 reports as `at-floor`, the only optimality claim this
  // pipeline may make, and refusing it would refuse a provably optimal layout.
  if (objective < targets.cutFloor) {
    refuse(
      "score-below-floor",
      `${targets.board} scores F = ${objective}, below its declared floor of ` +
        `${targets.cutFloor} (C = ${counts.cuts}, W = ${counts.wires}, B = ${counts.solder})`,
    )
  }

  // Written out field by field rather than spread, because `./score.test.ts`
  // pins the nine keys: a spread would carry a fourth field out of
  // `LineCounts` into a `Score` without anybody naming it here.
  return {
    cuts: counts.cuts,
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
 * Score one candidate from its dump TEXT: the entry point, and the only one
 * on which all three checks ride.
 *
 * `boardGeometry`, NOT `parseBoardDump`: a parsed dump skips every geometry
 * refusal, so text fed through the parser never exercises the contract `HC8`
 * is stated in. The same correction Tasks 3, 4, 5 and 11 each needed.
 */
export function scoreDumpText(
  dumpText: string,
  targets: BoardTargets,
  rules: StripboardRules,
): Score {
  const dump = boardGeometry(dumpText)
  requireCountsAgree(countParsed(dump), countLines(dumpText), targets.board)
  return scoreDump(dump, targets, rules)
}
