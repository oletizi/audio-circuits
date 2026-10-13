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
 * THE AUTHORITY is `./score.ts`'s module comment, including the ONE named
 * exception to "the documents win": the cut count `F` charges. Nothing here
 * restates it.
 */
/**
 * The four refusals `./score.ts` raises, as a union rather than loose strings
 * so the `switch` below proves every member has a reason: add a fifth
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

export function refuse(refusal: ScoreRefusal, offending: string): never {
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
   * Never greater than `cuts`, and **equal to it on every board measured so
   * far**: 5 of 5 on the owner's hand-laid low-boost, 38 of 38 on the
   * import-placed start, and no disagreement in 2,267 scored candidates across
   * three arms. It is reported separately because the owner asked for both
   * counts to be visible, not because a gap has been observed in the search -
   * `./cut-necessity.ts` carries the measurement and the reading of it.
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

