/**
 * `C_necessary`: how many of a dump's `CUT ` lines the board PHYSICALLY NEEDS,
 * by dropping each one and asking `HC8`'s reconstruction whether two nets'
 * leads then share a copper component.
 *
 * WHY THIS EXISTS, AND IT IS THE OWNER'S DECISION RATHER THAN AN OPTIMISATION.
 * The scorer used to charge `C` straight off VeroRoute's `CUT ` line count.
 * On an UNDISTURBED board that count is honest - measured on the owner's
 * hand-laid `pultec-low-boost` (5 of 5 cuts necessary, 0 removable) and on the
 * import-placed board this pipeline searches from (38 of 38) - but a board the
 * SEARCH has moved a cluster on carries cuts that no net needs, and the
 * measurement that found them is recorded in
 * `docs/stripboard/pipeline-verification.md`: one cluster moved off a row cost
 * one phantom cut, two clusters cost two, and a ground-extending wire cost two.
 * At `rho_w = 0.25` a wire should cost a quarter of a cut and was being charged
 * about 2.25, which is why the search rejected 7,417 `add-wire` candidates and
 * 1,539 `spread` candidates without ever taking one. The owner was asked
 * whether the search should score on the cuts he would actually make or on the
 * cuts VeroRoute reports, and chose a third option in those words - **"option
 * C"**: *"Both. Score on real cuts so the search can act, keep VeroRoute's
 * number in the report so you always see both. If they ever disagree badly,
 * you'd spot it."* So `./score.ts` charges this count, carries VeroRoute's
 * beside it, and `./report.ts` prints the disagreement; the deviation is
 * recorded in `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`.
 *
 * **THE CLASSIFICATION IS NOT THE SCORER'S OWN REASONING, AND THAT IS THE ONLY
 * THING THAT MAKES IT ADMISSIBLE HERE.** This repository forbids an agent
 * authoring the criteria for the artifact it produces (CLAUDE.md), and a
 * scorer grading its own cut count against its own arithmetic would be exactly
 * that. Every connectivity fact below comes from `netlistEquivalence` - `HC8`'s
 * copper reconstruction, computed outside VeroRoute from the geometry alone,
 * and the same instrument that proved those phantom cuts removable. NOTHING
 * here reads `C`, `J`, `S_occ`, `kappa` or any other quantity `./score.ts`
 * derives, and nothing here reads a `NODE` id: a count derived from what the
 * scorer already computed would be a copy agreeing with itself.
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
 *     first is gone. The bound errs towards CHARGING a cut, which is the
 *     direction that cannot flatter a candidate.
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
 * The one refusal this module raises.
 *
 * `necessity-lines-not-dropped` is about THIS MODULE'S OWN text surgery and
 * nothing about the board: it fires when the text handed to the reconstruction
 * is not the dump with exactly the intended `CUT ` lines gone. It exists
 * because the classification harness that first measured these phantom cuts
 * would have reported success after silently dropping a line it did not mean
 * to - a drop test whose trial text is not the trial it describes reports a
 * verdict about a board nobody has.
 */
export type NecessityRefusal = "necessity-lines-not-dropped"

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
  }
}

function refuse(refusal: NecessityRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} (The necessary cut count is ` +
      "derived in tools/stripboard/cut-necessity.ts through HC8's reconstruction in " +
      "tools/stripboard/equivalence.ts, and the owner's decision to charge it is recorded in " +
      "docs/superpowers/plans/2026-10-10-stripboard-pipeline.md.)",
  )
}

/**
 * The brand that makes a `CutNecessity` unforgeable, DELIBERATELY NOT
 * EXPORTED - the same device as `./score.ts`'s `COUNTED_FROM_TEXT`, and for
 * the same reason: `scoreDump` takes one of these, so there is no way to score
 * a candidate without the drop test having run on its text. A caller cannot
 * hand the scorer a cut count it worked out for itself.
 */
const DERIVED_BY_DROP_TEST: unique symbol = Symbol(
  "stripboard/cut-necessity: derived by the drop test through HC8's reconstruction",
)

/**
 * Both cut counts for one board: the owner's option C in one object.
 *
 * `reported` is counted HERE, off the text this module was handed, and is not
 * taken from the scorer - so `./score.ts` can hold the two readings against
 * each other. The two share a method (the first whitespace-separated token
 * equals `CUT`), so what the comparison catches is the two being handed
 * DIFFERENT TEXT, not a blind spot they would share.
 */
export interface CutNecessity {
  /** `C`: the `CUT ` lines the dump prints - VeroRoute's own number. */
  readonly reported: number
  /**
   * `C_necessary`: how many of them survive the drop test, which is the count
   * `F` charges. An upper bound on the cuts the board truly needs; see the
   * module comment's two limits.
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
 * `necessary` can never exceed `reported` - it counts a subset of the same
 * lines - so the difference is reported as REDUNDANCY rather than as a signed
 * delta, and the agreeing case says so in words instead of printing a zero a
 * reader has to interpret.
 *
 * IT TAKES TWO NUMBERS RATHER THAN A `CutNecessity`, so that a caller holding a
 * `Score` - which carries both counts and no brand - can print the line without
 * re-running the drop test on a board it no longer has the text of.
 */
export function describeCutCounts(reported: number, necessary: number): string {
  const counts = `F charges ${necessary} necessary cut(s); VeroRoute reports ${reported} CUT line(s)`
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
    "F charges the necessary count and not the reported one, which is the owner's decision " +
    '("option C"); the reported count is what a VeroRoute reader sees'
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
