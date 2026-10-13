/**
 * `F`'s DECLARATIONS and its four refusals: the counts, the `Score`, and one
 * sentence per refusal saying what is missing and why it is not defaulted.
 *
 * **ITS OWN MODULE FOR THE 300-500 LINE CEILING, AT THE SEAM `./report.ts` /
 * `./report-model.ts` AND `./copper.ts` / `./geometry-contract.ts` ALREADY
 * USE**: this file answers *what is reported and what is refused*, and
 * `./score.ts` answers *how it is computed and checked*. `./score.ts` is still
 * the module every consumer imports - it re-exports every declaration here, as
 * `copper.ts` re-exports the geometry contract - so nothing outside imports
 * this file and no consumer's import path changed when it was split out.
 *
 * THE AUTHORITY is `./score.ts`'s module comment, including its account of the
 * necessary-cut departure that was made, measured inert and withdrawn. Nothing
 * here restates it.
 */
/**
 * The three refusals `./score.ts` raises, as a union rather than loose strings
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
export function notDefaultedBecause(refusal: ScoreRefusal): string {
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

export function refuse(refusal: ScoreRefusal, offending: string): never {
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
  /**
   * `C`: the `CUT ` lines the dump prints, which is what `F` charges.
   *
   * It charged the drop-tested NECESSARY count between `1aa0834` and the
   * revert; `./score.ts`'s module comment carries why that was withdrawn. The
   * necessary count is no longer a field of a `Score` at all, because deriving
   * it per candidate was the cost the revert removed - it reaches the report
   * once per run as `ReportInput.necessaryCuts`, and
   * `tests/stripboard/cut-counts-agree.test.ts` is the standing guard that the
   * two counts agree on real boards.
   */
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

