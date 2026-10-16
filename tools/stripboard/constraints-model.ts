/**
 * What a hard constraint IS, what it is handed, and the three readings of a
 * dump every one of them shares.
 *
 * SPLIT FROM `./constraints.ts` FOR THE LINE CEILING, and the division is the
 * same one `lead-span-model.ts` / `lead-span.ts` already uses: this file says
 * what the vocabulary is, that file holds the ten checks. Nothing here decides
 * a constraint.
 *
 * THE THREE SHARED READINGS, here rather than repeated ten times, because two
 * spellings of "this part's span" is one more than this pipeline allows:
 * `placedParts` (which parts a constraint grades), `footprintOf` (which
 * footprint a part is fitted with, refusing when nobody said) and `spanHoles`
 * (how far a two-lead part's leads are apart).
 */
import {
  noPinLinesMessage,
  type BoardDump,
  type HolePosition,
  type Part,
  type Pin,
} from "../guide/dump.ts"
import type { PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import type { LeadSpan } from "../../lib/kicad/lead-span-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import type { StripboardRules } from "./rules.ts"
import type { CheckReport } from "./check-report.ts"

/**
 * The ten hard constraints of CRITERIA's `A1`. **Ten, unchanged.**
 *
 * `HC10` is ONE id although it conjoins two halves - a footprint-level
 * eligibility and a placement orientation - because both are clauses of one
 * criterion sentence. Splitting it into `HC10a`/`HC10b` would renumber `A1`.
 */
export type ConstraintId =
  | "HC1"
  | "HC2"
  | "HC3"
  | "HC4"
  | "HC5"
  | "HC6"
  | "HC7"
  | "HC8"
  | "HC9"
  | "HC10"

/** Every id, in CRITERIA's own order. The one listing; `grade.ts` checks its table against it. */
export const CONSTRAINT_IDS: readonly ConstraintId[] = [
  "HC1",
  "HC2",
  "HC3",
  "HC4",
  "HC5",
  "HC6",
  "HC7",
  "HC8",
  "HC9",
  "HC10",
]

/**
 * One constraint's verdict.
 *
 * `detail` IS NON-EMPTY ON A PASS TOO, and carries the figures it checked. A
 * pass that says nothing is indistinguishable from a pass that checked nothing,
 * and this pipeline has shipped the latter before. On a failure it names the
 * net, the part or the footprint, so the reader knows what to go and fix.
 */
export interface ConstraintResult {
  readonly id: ConstraintId
  readonly held: boolean
  readonly detail: string
}

/** `held: true` with its figures. */
export function holds(id: ConstraintId, detail: string): ConstraintResult {
  return { id, held: true, detail }
}

/** `held: false`, naming the offending thing. */
export function broken(id: ConstraintId, detail: string): ConstraintResult {
  return { id, held: false, detail }
}

/**
 * The piece of stock a layout must be cut from, and where the figure came from.
 *
 * `source` is recorded because the two cases have different authority: a
 * board's own declaration is a fact about a purchase (`PAR4`), and the rules
 * default is the board the owner usually uses.
 */
export interface Stock {
  readonly rows: number
  readonly cols: number
  readonly source: "board" | "rules-default"
}

/**
 * Everything the ten constraints read, and nothing else.
 *
 * `dumpText` AND `dump` ARE BOTH HERE, and `dump` must be `parseBoardDump` of
 * THAT SAME TEXT, so the two can never describe different boards. `HC8` needs
 * the text because two of its nine contracted refusals - `missing-line` and
 * `unsupported-strip-axis` - are INEXPRESSIBLE through a `BoardDump`, which
 * carries a grid and a boolean axis by construction; the other checks need the
 * parsed structure. See `hc8`'s comment, which says it again at the call site
 * because the next author's reflex will be to reach for the parsed value
 * sitting right there.
 */
export interface CheckInput {
  readonly dump: BoardDump
  readonly dumpText: string
  readonly reference: ReferenceNets
  /** Reference designator -> the KiCad footprint the part is fitted with. */
  readonly footprints: ReadonlyMap<string, string>
  readonly checkReport: CheckReport
  readonly stock: Stock
  readonly rules: StripboardRules
  /**
   * The pin-pattern lookup `HC10`'s footprint half consults, injected.
   *
   * WHY IT IS INJECTABLE AT ALL, and it is not a convenience: `PIN_PATTERNS`
   * holds the footprints THIS REPOSITORY PLACES and nothing else, and every one
   * of them classifies as `rows`. So there is no recorded footprint that
   * `admitPattern` refuses on the across-strip clause, and `HC10`'s
   * footprint-half negative fixture - a ring of pins - is not expressible
   * without a map of its own. The brief puts the synthetic ring "in the test's
   * own map rather than in `PIN_PATTERNS`" for exactly that reason, and this is
   * that seam. It mirrors `pinPatternFor`'s existing optional parameter and
   * `CheckDeps` in `tools/perfboard/check.ts`; absent, the real map is used.
   */
  readonly patterns?: ReadonlyMap<string, PinPattern>
  /**
   * The lead-span lookup `HC4`, `HC5` and `HC9` consult, injected.
   *
   * THE SAME SEAM AS `patterns`, FOR THE SAME FIXTURE. `HC10`'s footprint-half
   * negative fixture names a synthetic ring, and `HC4` runs before `HC10`:
   * `measure` calls the span lookup for EVERY placed part unconditionally, so a
   * footprint absent from `LEAD_SPANS` refuses there before `HC10` is reached.
   * That unconditional call is `PAR2` working as designed and must not be
   * weakened, so the ring's span is injected instead. Mirrors `leadSpanFor`'s
   * existing optional parameter; absent, the real map is used.
   *
   * **THIS MAP DOES NOT REACH EVERY CONSTRAINT THAT READS A SPAN. READ THIS
   * BEFORE INJECTING ONE.** `HC4`, `HC5` and `HC9` take their bounds from here.
   * `HC10`'s footprint half does NOT: it calls `admitPattern`, which reads the
   * module-level `LEAD_SPANS` **directly**
   * (`lib/kicad/pin-pattern-model.ts`) - both for its `LEAD_SPANS.has` guard
   * and for its extent cross-check - and nothing routes this field to it. So a
   * single grade can consult TWO DIFFERENT SPAN TABLES.
   *
   * It is harmless today only because of the shape of the one caller that
   * injects: the tests pass `[...LEAD_SPANS, <synthetic>]`, which shadows no
   * recorded entry, so both paths read the same figure for every footprint
   * either one looks up. **An author who injects a REPLACEMENT table** -
   * different bounds for a recorded footprint, say, to test a datasheet
   * revision - **would get a grade that half-ignores it**: the three span
   * constraints would use the new figure and `HC10` would quietly use the old
   * one, which is a verdict nobody could explain from the inputs.
   *
   * **IT IS RECORDED AS A LIMIT RATHER THAN LEFT AS "IF THAT IS EVER WANTED"**,
   * which the final whole-branch review was right to pull up: the cost of
   * wanting it later is a silent wrong verdict, which is the one cost this
   * pipeline refuses everywhere else. The remedy is ONE extra optional parameter
   * on `admitPattern`, the same seam `pinPatternFor` and `leadSpanFor` already
   * have; it is named here and in `admitPattern`'s own comment, and in
   * `docs/stripboard/pipeline-verification.md` §9.4. Closing it is a deliberate
   * edit with a test beside it, not a thing to do while passing.
   */
  readonly spans?: ReadonlyMap<string, LeadSpan>
}

/**
 * Every part the dump says is ON the board, with its resolved `PIN` holes.
 *
 * REFUSES A PLACED PART WITH NO `PIN` LINES rather than grading it as a part
 * with no leads, using `noPinLinesMessage`'s one wording. That state is `HC3`'s
 * to REPORT - it is one of its two signals - but every check that needs a
 * part's holes has to refuse it, because "no leads" and "leads nobody reported"
 * would otherwise grade the same.
 */
export function placedParts(dump: BoardDump): readonly (readonly [Part, readonly Pin[]])[] {
  const placed: (readonly [Part, readonly Pin[]])[] = []
  for (const part of dump.parts) {
    if (part.placement === "floating") continue
    const pins = dump.pins[part.ref] ?? []
    if (pins.length === 0) throw new Error(noPinLinesMessage(part))
    placed.push([part, pins])
  }
  return placed
}

const NO_FOOTPRINT_WHY =
  "This is NOT defaulted and must not be: HC4, HC5, HC9 and HC10 are all keyed by the footprint " +
  "name the netlist carries, so a part with none is a part four hard constraints would silently " +
  "skip - and a skipped check that looks like a passing one is the failure this grader exists " +
  "to prevent. Add the part's footprint to the map the caller builds, or find the component in " +
  "the circuit model that has none."

/**
 * Which footprint a placed part is fitted with, or `undefined` for a ONE-HOLE
 * PAD, refusing for anything else the caller did not declare.
 *
 * THE ONE-HOLE EXEMPTION IS NARROW AND IT IS NOT A SKIP. VeroRoute expands an
 * off-board `PADS<n>` component into n ONE-HOLE pads with board refs of their
 * own (`SW_LO_BOOST.3` becomes `SW_LO_BOOST_3.1`), and an off-board part
 * carries a SYMBOL rather than a footprint by the physical model's own marker -
 * it is panel-mount and *"never reaches this lookup"* (CRITERIA). A one-hole
 * pad has no lead span for `HC4`, `HC5` or `HC9` to bound and no row structure
 * for `HC10` to orient, so there is nothing those four could have measured: the
 * exemption covers exactly the case where the checks are empty rather than
 * skipped, and anything with two or more holes refuses.
 */
export function footprintOf(
  part: Part,
  pins: readonly Pin[],
  footprints: ReadonlyMap<string, string>,
): string | undefined {
  const footprint = footprints.get(part.ref)
  if (footprint !== undefined) return footprint
  if (pins.length === 1) return undefined
  throw new Error(
    `no footprint is declared for placed part ${part.ref} (${part.type} ${part.value}), which ` +
      `the dump reports with ${pins.length} PIN lines.\n${NO_FOOTPRINT_WHY}`,
  )
}

/**
 * How far a TWO-LEAD part's leads are apart, in holes, from its `PIN` lines
 * alone: `max(|dRow|, |dCol|) + 1`.
 *
 * WHY THE LARGER OF THE TWO AXES. A span is counted in HOLES, following
 * VeroRoute's own `length` (`lib/kicad/lead-span-model.ts`), and a two-terminal
 * part on stripboard lies along one axis - either along a strip or across them.
 * The larger extent is that axis's hole count; the other is 1. For a pair that
 * is off-axis in both, the larger is still the distance a lead must reach along
 * its own length, so the figure is conservative in the direction that matters:
 * it is never smaller than either axis's reach.
 *
 * NOTHING IS DERIVED FROM `SPAN`. A `PART` line's `SPAN` is its footprint's own
 * column count IN ITS CURRENT DIRECTION - body width for an electrolytic, and
 * not rotation-invariant - so it is not a lead span and never stands in for
 * one.
 *
 * IT IS DEFINED ONLY FOR EXACTLY TWO HOLES, and the caller decides what to do
 * otherwise. A part with more leads has a span fixed by its moulded pin field
 * rather than by bending, and `HC10`'s footprint half already cross-checks that
 * field against `leadSpanFor` through `admitPattern`'s own disjunction - so the
 * coverage is split by part shape rather than left with a hole, and `hc4`'s
 * detail says how many parts fell on each side of the split.
 */
export function spanHoles(pins: readonly Pin[]): number | undefined {
  const [a, b] = pins
  if (pins.length !== 2 || a === undefined || b === undefined) return undefined
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)) + 1
}

/**
 * Which strip a hole is on: its row under horizontal strips, its column under
 * vertical ones.
 *
 * IT TAKES A BARE `HolePosition` RATHER THAN A `Pin`, so there is ONE
 * implementation of this reading in the repository. Every caller here passes a
 * `Pin`, which structurally IS a `HolePosition` with a pin name attached;
 * `tools/stripboard/moves.ts` holds positions parsed out of a hole key and has
 * no pin name to offer, and the alternative to widening the parameter was a
 * second one-line copy of the strip axis under a second name. What the two
 * sides may share is "what the dump SAYS" (`R2`, and `./grade.ts`'s module
 * comment says the same of the dump parser and the targets); the strip axis is
 * exactly that.
 */
export function stripOf(hole: HolePosition, verticalStrips: boolean): number {
  return verticalStrips ? hole.col : hole.row
}

/** `${row},${col}`, for quoting a hole in a detail string. */
export function at(hole: Pin): string {
  return `${hole.row},${hole.col}`
}
