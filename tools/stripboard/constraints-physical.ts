/**
 * `HC4`, `HC5`, `HC6` and `HC9` - four of the five constraints about whether
 * the board can be BUILT.
 *
 * WHY THIS GROUP IS THIS GROUP. These are the checks a netlist cannot answer:
 * the span bounds at both ends (`HC4` the tool's, `HC5` the part's reach,
 * `HC9` the part's own minimum) and the piece of stock it must be cut from
 * (`HC6`). Every one of them refuses rather than guessing when the data it
 * needs is not recorded, which is `PAR2`: *"an empty whitelist that refuses
 * loudly beats a general rule that quietly accepts a guess, and a span the part
 * cannot make is not a lever but a fiction."*
 *
 * `HC10` IS THE FIFTH AND IS IN `./constraints-pattern.ts`. It belongs to this
 * group by subject - whether the owner will mount a part's pin pattern at all -
 * and left by line count: this file passed the 500-line ceiling, and `HC10`
 * plus the four functions only it uses were the cut its own comment had named
 * in advance. They are the ONLY dependants of `lib/kicad/pin-pattern.ts` and
 * `pin-pattern-model.ts` among the ten checks, so the seam took two imports
 * with it and left this file reading only `lead-span*` and `./extent.ts`.
 *
 * `./constraints-electrical.ts` holds the five about whether the board
 * CONDUCTS. `./constraints.ts` is the surface all ten are reached through, and
 * the module comment there carries the rules this file is held to.
 */
import { boundsOf, type Part, type Pin } from "../guide/dump.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import { flatMinSpanHoles, mountingForSpan } from "../../lib/kicad/lead-span-mounting.ts"
import type { LeadSpan } from "../../lib/kicad/lead-span-model.ts"
import { TOOL_MAX_SPAN_HOLES, TOOL_MIN_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import { fabricationExtent, trimPreservesConnectivity } from "./extent.ts"
import {
  at,
  broken,
  footprintOf,
  holds,
  placedParts,
  spanHoles,
  stripOf,
  type CheckInput,
  type ConstraintResult,
} from "./constraints-model.ts"

/** One placed part's footprint and span, with `leadSpanFor` forced for the PAR2 refusal. */
interface Measured {
  readonly part: Part
  readonly pins: readonly Pin[]
  readonly footprint: string
  readonly span: number | undefined
}

/** The span lookup, honouring `CheckInput.spans` when the caller injected one. */
function spanFor(footprint: string, input: CheckInput): LeadSpan {
  return input.spans === undefined ? leadSpanFor(footprint) : leadSpanFor(footprint, input.spans)
}

/**
 * Every placed part's footprint and span, calling the span lookup for EACH ONE
 * even when no span can be measured.
 *
 * THE CALL IS NOT CONDITIONAL AND THAT IS THE POINT: `PAR2` requires the
 * pipeline to refuse BY NAME for a footprint with no recorded span, and a
 * lookup skipped for a part whose span happens not to be measurable is a
 * whitelist that quietly accepts a guess. So the lookup runs, and it throws for
 * an unlisted or `UNSOURCED` footprint whatever the part's pin count - which is
 * what makes a rotary switch with eleven pins refuse by name rather than pass
 * for having no two-lead span to bound.
 */
function measure(input: CheckInput): readonly Measured[] {
  const measured: Measured[] = []
  for (const [part, pins] of placedParts(input.dump)) {
    const footprint = footprintOf(part, pins, input.footprints)
    if (footprint === undefined) continue
    spanFor(footprint, input)
    measured.push({ part, pins, footprint, span: spanHoles(pins) })
  }
  return measured
}

/** How many parts a span check could not measure, and why that is not a skip. */
function unmeasured(measured: readonly Measured[]): string {
  const count = measured.filter((entry) => entry.span === undefined).length
  if (count === 0) return ""
  return (
    ` ${count} part(s) do not have exactly two leads, so they have no bendable span: their pin ` +
    "field is moulded, and HC10's footprint half cross-checks its recorded extent against " +
    "leadSpanFor instead."
  )
}

/**
 * `HC4` - **every lead span within the tool's range, 2-16 holes.**
 *
 * CRITERIA: *"Its lower end is a fact about VeroRoute and not about any part,
 * which is why it does not discharge `HC9`."* The bounds come from
 * `TOOL_MIN_SPAN_HOLES`/`TOOL_MAX_SPAN_HOLES`, read from the pinned fork's
 * `CompTypes::GetMinLength`/`GetMaxLength`. Negative fixture:
 * `span-above-tool-range`.
 */
export function hc4(input: CheckInput): ConstraintResult {
  const measured = measure(input)
  const range = `${TOOL_MIN_SPAN_HOLES}-${TOOL_MAX_SPAN_HOLES}`
  const bad = measured.filter(
    (entry) =>
      entry.span !== undefined &&
      (entry.span < TOOL_MIN_SPAN_HOLES || entry.span > TOOL_MAX_SPAN_HOLES),
  )
  if (bad.length > 0) {
    return broken(
      "HC4",
      `${bad.length} part(s) outside the tool's own span range of ${range} holes: ` +
        bad
          .map(
            (entry) =>
              `${entry.part.ref} spans ${String(entry.span)} holes (${entry.pins.map(at).join(" to ")})`,
          )
          .join("; ") +
        ". This bound is a fact about VeroRoute and not about any part, so it does not " +
        "discharge HC5 or HC9.",
    )
  }
  return holds(
    "HC4",
    `every measurable lead span is inside the tool's range of ${range} holes, over ` +
      `${measured.filter((entry) => entry.span !== undefined).length} two-lead part(s).` +
      unmeasured(measured),
  )
}

/**
 * `HC5` - **every lead span within the part's physical reach**, at or below the
 * family's `maxSpanHoles`.
 *
 * CRITERIA's reason: *"the tool will stretch any two-terminal part to any span
 * in its range and the part will not, and a span the part cannot make is not a
 * lever but a fiction."* **Refuse without it** (`PAR2`) - there is no fallback
 * to `TOOL_MAX_SPAN_HOLES`, and the mutation that adds one is run in the task
 * report. Negative fixture: `span-above-reach`.
 */
export function hc5(input: CheckInput): ConstraintResult {
  const measured = measure(input)
  const bad = measured.filter(
    (entry) => entry.span !== undefined && entry.span > spanFor(entry.footprint, input).maxSpanHoles,
  )
  if (bad.length > 0) {
    return broken(
      "HC5",
      `${bad.length} part(s) stretched past the family's own reach: ` +
        bad
          .map(
            (entry) =>
              `${entry.part.ref} spans ${String(entry.span)} holes against maxSpanHoles ` +
                `${spanFor(entry.footprint, input).maxSpanHoles} for ${entry.footprint}`,
          )
          .join("; ") +
        ". A span the part cannot make is not a lever but a fiction.",
    )
  }
  return holds(
    "HC5",
    `every measurable lead span is at or below its family's maxSpanHoles, over ` +
      `${measured.filter((entry) => entry.span !== undefined).length} two-lead part(s).` +
      unmeasured(measured),
  )
}

/**
 * `HC6` - **the layout fits the stock the owner bought.**
 *
 * CRITERIA: *"The quantity checked is the **occupied extent**, not the canvas -
 * `GRID` is VeroRoute's drawing area and `--import` leaves it at a default, so
 * a canvas larger than the stock says nothing about copper."*
 *
 * THE QUANTITY IS THE FABRICATION EXTENT AND `BOUNDS` ALONE IS NOT IT. See
 * `./extent.ts`'s module comment for why: `BOUNDS` is a union of three sources,
 * one of them text labels, and is not a statement about which features a
 * cuttable board must RETAIN. A wire end, a bridge hole or either end of a cut
 * can sit outside the component bounding box, and a board trimmed to a box that
 * excludes one does not conduct. `extent.ts` is the measurement; this is the
 * only place its numbers become a verdict.
 *
 * THE DETAIL REPORTS BOTH FIGURES WHENEVER THEY DISAGREE, and names the
 * discrepancy rather than explaining it: the dump reports only `GetBounds`'
 * union, so which of its three sources produced an excess is NOT IN THE DATA.
 * Negative fixtures: `over-stock` and `over-stock-wire-outside-bounds`.
 */
export function hc6(input: CheckInput): ConstraintResult {
  const bounds = boundsOf(input.dump, "HC6")
  const extent = fabricationExtent(input.dump)
  const boundsRect = `BOUNDS reads ${bounds.minRow},${bounds.minCol} ${bounds.maxRow},${bounds.maxCol}, ` +
    `which is ${bounds.maxRow - bounds.minRow + 1} x ${bounds.maxCol - bounds.minCol + 1} holes`
  const outside = extent.featuresOutsideBounds
  const discrepancy =
    outside.length === 0
      ? `no required feature lies outside BOUNDS, so ${boundsRect} and the two figures agree`
      : `${boundsRect}, and ${outside.length} required feature(s) lie OUTSIDE it: ` +
        outside
          .slice(0, 4)
          .map((feature) => `${feature.kind} ${feature.names} at ${feature.hole}`)
          .join("; ") +
        (outside.length > 4 ? ` (and ${outside.length - 4} more)` : "") +
        ". Which of GetBounds' three sources explains the difference is not in the dump"
  const stock = `stock ${input.stock.rows} x ${input.stock.cols} (${input.stock.source})`
  const measured = `fabrication extent ${extent.minRow},${extent.minCol} ${extent.maxRow},${extent.maxCol}, ` +
    `which is ${extent.rows} x ${extent.cols} holes`
  if (extent.rows > input.stock.rows || extent.cols > input.stock.cols) {
    return broken(
      "HC6",
      `${measured}, does not fit the ${stock}: ` +
        `${extent.rows > input.stock.rows ? `${extent.rows} strips needed against ${input.stock.rows}` : ""}` +
        `${extent.rows > input.stock.rows && extent.cols > input.stock.cols ? " and " : ""}` +
        `${extent.cols > input.stock.cols ? `${extent.cols} columns needed against ${input.stock.cols}` : ""}` +
        `. ${discrepancy}.`,
    )
  }
  // A layout that FITS must also still conduct once it is cut to that extent.
  // The two are separate claims: a bounding box can fit the stock while the
  // trim to it drops the copper run a cut depends on.
  const trim = trimPreservesConnectivity(input.dump, extent)
  if (!trim.preserved) {
    return broken("HC6", `${measured}, fits the ${stock}, but ${trim.detail} ${discrepancy}.`)
  }
  return holds("HC6", `${measured}, fits the ${stock}. ${discrepancy}. ${trim.detail}`)
}

/**
 * `HC9` - **every lead span at or above the part's own physical minimum**, the
 * family's `minSpanHoles`.
 *
 * CRITERIA's reason, and it is the gap this constraint was added to close:
 * *"`HC4` bounds a span by the tool and `HC5` bounds it above by reach, and
 * **nothing bounded it below by the part**: `--stretch shrink` can compress a
 * DIN0207, 6.3 mm of body on a 10.16 mm nominal pitch, to a 2-hole 5.08 mm span
 * no bending achieves, and every other check here passes it."* In the grader
 * regardless of the generator, *"because the generator only proposes."*
 * Negative fixture: `span-below-minimum`.
 */
export function hc9(input: CheckInput): ConstraintResult {
  const measured = measure(input)
  const bad = measured.filter(
    (entry) => entry.span !== undefined && entry.span < spanFor(entry.footprint, input).minSpanHoles,
  )
  if (bad.length > 0) {
    return broken(
      "HC9",
      `${bad.length} part(s) compressed below the family's own minimum: ` +
        bad
          .map(
            (entry) =>
              `${entry.part.ref} spans ${String(entry.span)} holes against minSpanHoles ` +
                `${spanFor(entry.footprint, input).minSpanHoles} for ${entry.footprint}`,
          )
          .join("; ") +
        ". Every other span check passes a compression no bending achieves, which is why this " +
        "bound exists separately from HC4's.",
    )
  }
  return holds(
    "HC9",
    `every measurable lead span is at or above its family's minSpanHoles, over ` +
      `${measured.filter((entry) => entry.span !== undefined).length} two-lead part(s).` +
      unmeasured(measured) +
      standing(measured, input),
  )
}

/**
 * Which parts a builder has to STAND ON END, named on the line about spans.
 *
 * **IT IS HERE BECAUSE `HC9` IS WHERE THE PIPELINE TELLS A PERSON ABOUT SPANS,
 * AND BECAUSE THE SILENCE WAS THE DEFECT.** The floor this check compares
 * against is the LOOSER of an axial part's two mountings, so a span `HC9` holds
 * on can be one the part cannot lie flat at - and until this clause, a held
 * `HC9` said "every span is at or above its minimum" about a board carrying six
 * resistors that have to be mounted vertically, and said nothing about them. The
 * owner: *"It's standard practice to stand resistors on end when their holes are
 * next to each other."* Standard practice to him; invisible in the report.
 *
 * **IT IS NOT A SECOND CONDITION AND CHANGES NO VERDICT.** `HC9` holds or breaks
 * on the comparison above and on nothing here; this appends to the DETAIL of a
 * result already decided. The mounting itself is derived by
 * `lib/kicad/lead-span-mounting.ts` from the flat floor the span model already
 * records, so the grader states no geometry of its own. `tools/guide/
 * checklist.ts` prints the same fact, from the same function, in the sheet a
 * person builds from.
 */
function standing(measured: readonly Measured[], input: CheckInput): string {
  const standing = measured.filter(
    (entry) =>
      entry.span !== undefined &&
      mountingForSpan(spanFor(entry.footprint, input), entry.span) === "stood-on-end",
  )
  if (standing.length === 0) return ""
  return (
    ` ${standing.length} part(s) must be STOOD ON END, the body perpendicular to the board with ` +
    "one lead folded over it, because their span is below the floor for the part lying flat: " +
    standing
      .map((entry) => {
        const flat = flatMinSpanHoles(spanFor(entry.footprint, input))
        return (
          `${entry.part.ref} spans ${String(entry.span)} holes against a flat floor of ` +
          `${String(flat)}`
        )
      })
      .join("; ") +
    ". That is the mounting HC9's own floor already allows for, not a failure."
  )
}

