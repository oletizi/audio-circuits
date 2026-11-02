/**
 * `C_necessary`: how many of a dump's `CUT ` lines the board PHYSICALLY NEEDS,
 * by dropping each one and asking `HC8`'s reconstruction whether two nets'
 * leads then share a copper component.
 *
 * **WHAT IT IS FOR NOW, AND IT IS NOT THE SCORER.** `F` charges VeroRoute's
 * `CUT ` line count (`./score.ts`). Between `1aa0834` and the revert it charged
 * the count below, on the owner's instruction after a measurement reported cuts
 * on moved boards that no net needs - one cluster moved off a row costing one,
 * two clusters two, a ground-extending wire two - and at `rho_w = 0.25` a wire
 * should cost a quarter of a cut while being charged about 2.25. Asked whether
 * the search should score on the cuts he would actually make or on the cuts
 * VeroRoute reports, he chose a third option in those words - **"option C"**:
 * *"Both. Score on real cuts so the search can act, keep VeroRoute's number in
 * the report so you always see both. If they ever disagree badly, you'd spot
 * it."*
 *
 * **THE SCORING HALF MEASURED INERT AND WAS WITHDRAWN; THE REPORTING HALF
 * STANDS.** Four before-and-after pairs came out identical figure for figure,
 * wire and spread candidates still never won, and a probe over 2,267 scored
 * candidates found **zero disagreements** between the two counts - while the
 * drop test cost a measured 17-57% of the run's wall clock. **The phantom-cut
 * figures above are real and were measured on boards assembled BY HAND outside
 * the search**; generalising them to the search's own candidates was the
 * reviewing agent's error. The reading that fits what the search does, stated
 * as a reading: `AutoFillVero` re-derives the whole cut set every time a
 * candidate is painted, and the climb paints every candidate before scoring it,
 * so a derived cut sits between two differently-noded segments and a segment
 * with no lead carries no node id and needs no cut - a painted board never
 * carries a spare cut. A board whose parts moved while its cut list did NOT
 * would have one spare cut per orphaned one, which is the hand-assembled shape.
 * The sweep is in
 * `.superpowers/sdd/2026-10-10-stripboard-pipeline/necessary-cuts-report.md`.
 *
 * SO THE TWO SURVIVING CALLERS ARE BOTH CHEAP, AND BETWEEN THEM THEY ARE WHAT
 * MAKES THE REVERT SAFE:
 *
 *   - `tests/stripboard/cut-counts-agree.test.ts`, the standing guard that the
 *     two counts agree on real boards - the owner's hand-laid low-boost and the
 *     import-placed start the search begins from. **If they ever diverge, that
 *     test says so**, which is the cheap check that replaces the expensive
 *     scorer.
 *   - `./report.ts`'s `cuts:` line, through `describeCutCounts` below, once per
 *     run on the candidate the report is about. That is the half of "option C"
 *     the owner chose so he would spot a divergence himself.
 *
 * **THE CLASSIFICATION IS NOT THE SCORER'S OWN REASONING**, which is what made
 * it admissible as a scorer and still makes it admissible as a guard. This
 * repository forbids an agent authoring the criteria for the artifact it
 * produces (CLAUDE.md). Every connectivity fact below comes from
 * `netlistEquivalence` - `HC8`'s copper reconstruction, computed outside
 * VeroRoute from the geometry alone, and the same instrument that proved those
 * phantom cuts removable. NOTHING here reads `C`, `J`, `S_occ`, `kappa` or any
 * other quantity `./score.ts` derives, and nothing here reads a `NODE` id: a
 * count derived from what the scorer already computed would be a copy agreeing
 * with itself.
 *
 * THE TEST IS "DOES DROPPING THIS CUT SHORT TWO NETS", AND SHORTS ARE THE ONLY
 * DIRECTION ASKED ABOUT. Removing a cut only ever JOINS copper, so it can
 * close an open but never open one; `openFindings` therefore has nothing to
 * say about a dropped cut and is not consulted. The comparison is over the
 * unordered PAIRS of reference nets sharing a component rather than over
 * `ShortFinding`s, because dropping a cut can merge two components that each
 * already shorted a pair - one finding where there were two, with no new pair
 * among them - and a comparison by finding would call that cut necessary on a
 * change of shape alone.
 *
 * TWO LIMITS, STATED HERE SO THEY ARE NOT REDISCOVERED:
 *
 *   - **THE GREEDY SET IS DUMP-ORDER, SO IT IS A LOWER BOUND ON REDUNDANCY**
 *     and `necessary` is correspondingly an UPPER bound on the cuts a board
 *     truly needs. Cuts are considered in the order the dump prints them,
 *     against the set already dropped, and a different order can drop more: two
 *     cuts can be individually droppable while the second is necessary once the
 *     first is gone. The bound errs towards calling a cut NECESSARY, which is
 *     the direction that cannot manufacture a divergence: a board this module
 *     reports as agreeing with VeroRoute may still hold redundancy a different
 *     drop order would find, and one it reports as disagreeing has a cut the
 *     copper provably does not need.
 *   - **IT IS NOT THE WEAKER "LEAD TEST"**, which the measurement used on six
 *     further boards and which can over-count "necessary" - that one asks only
 *     whether a cut separates two leads, and answers yes for a cut whose nets
 *     the copper joins elsewhere anyway. `HC8`'s reconstruction is used here
 *     instead, so the figure this module reports is the stronger of the two.
 *
 * WHAT IT IS NOT INDEPENDENT OF: VeroRoute's GEOMETRY EXPORT, which it
 * consumes. `./equivalence.ts`'s trust-boundary paragraph is the authority and
 * applies unchanged - a dump that omits a cut yields a consistent and wrong
 * answer here, and nothing in this module can see it.
 */
import {
  netlistEquivalence,
  type EquivalenceVerdict,
  type ReferenceNets,
} from "./equivalence.ts"

/**
 * The two refusals this module raises, neither of them about the board.
 *
 * `necessity-lines-not-dropped` is about THIS MODULE'S OWN text surgery: it
 * fires when the text handed to the reconstruction is not the dump with exactly
 * the intended `CUT ` lines gone. It exists because the classification harness
 * that first measured these phantom cuts would have reported success after
 * silently dropping a line it did not mean to - a drop test whose trial text is
 * not the trial it describes reports a verdict about a board nobody has.
 *
 * `necessity-count-exceeds-reported` is about the PAIR OF NUMBERS a caller
 * hands `describeCutCounts`. It took over from the scorer's
 * `score-necessity-count-disagreement`, which could compare the classifier's
 * own reading of VeroRoute's count against the scorer's because both ran on one
 * candidate; with the scorer back on the line count, the report is where the two
 * figures meet and the subset relation is the one thing checkable there.
 */
export type NecessityRefusal =
  | "necessity-lines-not-dropped"
  | "necessity-count-exceeds-reported"

/** What is missing, where it is fixed, and why nothing is defaulted. */
function notDefaultedBecause(refusal: NecessityRefusal): string {
  switch (refusal) {
    case "necessity-lines-not-dropped":
      return (
        "The drop test's whole claim is that the trial board is this board MINUS one cut, so a " +
        "trial text that lost a different line, lost none, or lost something that is not a CUT " +
        "line is a verdict about a board nobody has - and it would read as a perfectly ordinary " +
        "count. It is not retried with a repaired text and no line is put back: which lines the " +
        "two texts actually differ by is not recoverable from the counts, so a repair would be a " +
        "guess at the trial that was meant. Fix withoutCutLines in " +
        "tools/stripboard/cut-necessity.ts; nothing about the dump or the fork is implicated."
      )
    case "necessity-count-exceeds-reported":
      return (
        "The necessary cuts are a SUBSET of the reported ones - the drop test can only keep a " +
        "CUT line the dump already prints - so a necessary count above the reported one means " +
        "the two figures are about different boards. Neither is preferred and neither is " +
        "clamped: a sentence reading 'DISAGREE by -2' or 'REDUNDANT' about a negative " +
        "difference would be a report inviting a reader to spot a divergence while describing " +
        "an impossible one. Both numbers come from one necessaryCuts() call on one dump text; " +
        "fix the caller that paired them, which for the pipeline is the report input built in " +
        "tools/stripboard/place.ts."
      )
  }
}

function refuse(refusal: NecessityRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} (The necessary cut count is ` +
      "derived in tools/stripboard/cut-necessity.ts through HC8's reconstruction in " +
      "tools/stripboard/equivalence.ts; F charges the REPORTED count, and the departure that " +
      "charged this one is recorded as made, measured inert and reverted in " +
      "docs/superpowers/plans/2026-10-10-stripboard-pipeline.md.)",
  )
}

/**
 * The brand that makes a `CutNecessity` unforgeable, DELIBERATELY NOT
 * EXPORTED - the same device as `./score.ts`'s `COUNTED_FROM_TEXT`. It guarded
 * `scoreDump`, which took one of these, so no candidate could be scored without
 * the drop test having run on its text. **IT GUARDS NO CALLER NOW, AND IS KEPT
 * RATHER THAN DROPPED BECAUSE THE CLAIM IT CARRIES IS STILL TRUE**: a value of
 * this type is one `necessaryCuts` produced from a real dump text, which is
 * what `tests/stripboard/cut-counts-agree.test.ts` asserts over. The report
 * takes two plain numbers instead, for the reason `describeCutCounts` carries.
 */
const DERIVED_BY_DROP_TEST: unique symbol = Symbol(
  "stripboard/cut-necessity: derived by the drop test through HC8's reconstruction",
)

/**
 * Both cut counts for one board: the owner's option C in one object.
 *
 * `reported` is counted HERE, off the text this module was handed, and is not
 * taken from the scorer. That independence was what let `./score.ts` hold the
 * two readings against each other while it charged the necessary count; it is
 * now what lets the standing agreement test compare a figure nothing in the
 * scorer produced against the scorer's own `C`.
 */
export interface CutNecessity {
  /** `C`: the `CUT ` lines the dump prints - VeroRoute's own number, and what `F` charges. */
  readonly reported: number
  /**
   * `C_necessary`: how many of them survive the drop test. An upper bound on
   * the cuts the board truly needs; see the module comment's two limits.
   */
  readonly necessary: number
  readonly [DERIVED_BY_DROP_TEST]: true
}

/**
 * The two counts and whether they agree, as the ONE SENTENCE a person reads -
 * the second half of the owner's "option C", and it lives here rather than in
 * `./report.ts` because the module that derives the two figures is where what
 * they MEAN belongs.
 *
 * **IT STATES THE DISAGREEMENT AND ITS SIZE, NOT JUST THE TWO NUMBERS.** His
 * reason for keeping both was *"if they ever disagree badly, you'd spot it"*,
 * and a reader handed two figures has to subtract one from the other before
 * there is anything to spot. **It carries no adjective**: "badly" is his
 * judgement to make on the figure and not this function's to pass, so nothing
 * here calls a divergence large, acceptable or expected.
 *
 * `necessary` counts a subset of the same lines, so it can never exceed
 * `reported`: the difference is stated as REDUNDANCY rather than as a signed
 * delta, the agreeing case says so in words instead of printing a zero a reader
 * has to interpret, and a pair in the impossible order is REFUSED rather than
 * described.
 *
 * IT TAKES TWO NUMBERS RATHER THAN A `CutNecessity`, so `./report.ts` can print
 * the line from a `Score`'s `C` and the one necessary count its input carries,
 * without re-running the drop test on a board it no longer has the text of.
 */
export function describeCutCounts(reported: number, necessary: number): string {
  if (necessary > reported) {
    refuse(
      "necessity-count-exceeds-reported",
      `${necessary} necessary cut(s) against ${reported} reported CUT line(s)`,
    )
  }
  const counts =
    `F charges ${reported} reported CUT line(s); the drop test finds ${necessary} of them ` +
    "necessary"
  const difference = reported - necessary
  if (difference === 0) {
    return (
      `${counts} - the two AGREE, so every cut this board prints is one its copper needs: ` +
      "dropping any of them would leave two nets' leads sharing a copper component (HC8's " +
      "reconstruction, drop-tested one cut at a time)"
    )
  }
  return (
    `${counts} - the two DISAGREE by ${difference}: ${difference} reported cut(s) are ` +
    "REDUNDANT, in that dropping them shorts no two nets' leads under HC8's reconstruction. " +
    "F charges the reported count, so this candidate is priced for cuts its copper does not " +
    "need - which is the divergence the owner kept both figures in order to spot"
  )
}

/** Whether a dump line IS a `CUT ` line: the first token equals the keyword. */
function isCutLine(line: string): boolean {
  return line.trim().split(/\s+/)[0] === "CUT"
}

/**
 * The unordered pairs of reference nets sharing a copper component, as
 * `"a|b"` keys - `HC8`'s shorts, flattened to pairs.
 *
 * A finding naming three nets contributes all three pairs, so a merge that
 * turns two findings into one is comparable with what it replaced.
 */
function shortedPairs(verdict: EquivalenceVerdict): ReadonlySet<string> {
  const pairs = new Set<string>()
  for (const short of verdict.shorts) {
    const nets = [...short.nets].sort()
    for (let first = 0; first < nets.length; first += 1) {
      for (let second = first + 1; second < nets.length; second += 1) {
        pairs.add(`${nets[first]}|${nets[second]}`)
      }
    }
  }
  return pairs
}

/**
 * The dump text with the lines at `dropped` removed, PROVEN to be that text.
 *
 * The guard is written over the two texts rather than over the index
 * bookkeeping that produced them: it checks that the trial lost exactly
 * `dropped.size` `CUT ` lines and that every line which is not a `CUT ` line
 * survived unchanged and in order. A check over the indices would be this
 * function's own arithmetic read back to itself and would pass whatever it did.
 */
function withoutCutLines(lines: readonly string[], dropped: ReadonlySet<number>): string {
  const kept = lines.filter((_, index) => !dropped.has(index))
  const cutsBefore = lines.filter(isCutLine).length
  const cutsAfter = kept.filter(isCutLine).length
  if (cutsAfter !== cutsBefore - dropped.size) {
    refuse(
      "necessity-lines-not-dropped",
      `dropping ${dropped.size} line(s) took the dump from ${cutsBefore} CUT line(s) to ` +
        `${cutsAfter}`,
    )
  }
  const othersBefore = lines.filter((line) => !isCutLine(line))
  const othersAfter = kept.filter((line) => !isCutLine(line))
  const changed = othersBefore.findIndex((line, index) => line !== othersAfter[index])
  if (othersBefore.length !== othersAfter.length || changed !== -1) {
    refuse(
      "necessity-lines-not-dropped",
      `the trial text's non-CUT lines are not the dump's: ${othersBefore.length} before and ` +
        `${othersAfter.length} after` +
        (changed === -1 ? "" : `, first differing at non-CUT line ${changed}`),
    )
  }
  return kept.join("\n")
}

/**
 * Both cut counts for one dump: what VeroRoute reported, and how many of those
 * cuts the drop test cannot remove.
 *
 * ONE `netlistEquivalence` CALL PER CUT PLUS ONE FOR THE BASELINE, and the
 * baseline is what keeps an ALREADY-SHORTED board readable: a candidate whose
 * copper joins two nets is a board the search scores and the grader rejects
 * (`HC8`), so the question asked of each cut is whether dropping it shorts a
 * pair of nets that were NOT already shorted - never whether the board shorts.
 */
export function necessaryCuts(dumpText: string, reference: ReferenceNets): CutNecessity {
  const lines = dumpText.split("\n")
  const cuts: number[] = []
  lines.forEach((line, index) => {
    if (isCutLine(line)) cuts.push(index)
  })
  const baseline = shortedPairs(netlistEquivalence(dumpText, reference))
  const dropped = new Set<number>()
  for (const index of cuts) {
    const trial = new Set([...dropped, index])
    const after = shortedPairs(netlistEquivalence(withoutCutLines(lines, trial), reference))
    let shortsSomethingNew = false
    for (const pair of after) {
      if (!baseline.has(pair)) shortsSomethingNew = true
    }
    if (!shortsSomethingNew) dropped.add(index)
  }
  return {
    reported: cuts.length,
    necessary: cuts.length - dropped.size,
    [DERIVED_BY_DROP_TEST]: true,
  }
}
