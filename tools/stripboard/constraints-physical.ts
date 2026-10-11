/**
 * `HC4`, `HC5`, `HC6`, `HC9` and `HC10` - the five constraints about whether
 * the board can be BUILT.
 *
 * WHY THIS GROUP IS THIS GROUP. These are the checks a netlist cannot answer:
 * the span bounds at both ends (`HC4` the tool's, `HC5` the part's reach,
 * `HC9` the part's own minimum), the piece of stock it must be cut from
 * (`HC6`), and whether the owner will mount the pin patterns at all (`HC10`).
 * Every one of them refuses rather than guessing when the data it needs is not
 * recorded, which is `PAR2`: *"an empty whitelist that refuses loudly beats a
 * general rule that quietly accepts a guess, and a span the part cannot make is
 * not a lever but a fiction."*
 *
 * `./constraints-electrical.ts` holds the other five, which are about whether
 * the board CONDUCTS. `./constraints.ts` is the surface both are reached
 * through, and the module comment there carries the rules this file is held to.
 */
import { boundsOf, usableDirection, type Part, type Pin } from "../guide/dump.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import type { LeadSpan } from "../../lib/kicad/lead-span-model.ts"
import { TOOL_MAX_SPAN_HOLES, TOOL_MIN_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import { pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { admitPattern } from "../../lib/kicad/pin-pattern-model.ts"
import type { PadPosition, PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
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
      unmeasured(measured),
  )
}

/** `HC10`'s footprint half: Task 2's check, called from here. */
function hc10FootprintEligibility(input: CheckInput): string | undefined {
  for (const [part, pins] of placedParts(input.dump)) {
    const footprint = footprintOf(part, pins, input.footprints)
    if (footprint === undefined) continue
    const eligibility = admitPattern(patternFor(footprint, input))
    if (eligibility.kind === "refused") {
      return (
        `the footprint half refuses part ${part.ref}: ${eligibility.reason} ` +
        "The remedy is in the footprint data, not in the layout."
      )
    }
  }
  return undefined
}

/** The pattern lookup, honouring `CheckInput.patterns` when the caller injected one. */
function patternFor(footprint: string, input: CheckInput): PinPattern {
  return input.patterns === undefined
    ? pinPatternFor(footprint)
    : pinPatternFor(footprint, input.patterns)
}

/** Pads grouped by the across-coordinate of one axis: `"x"` means rows of constant y. */
function rowsAlong(pads: readonly PadPosition[], axis: "x" | "y"): readonly (readonly string[])[] {
  const across = axis === "x" ? (pad: PadPosition) => pad.yMm : (pad: PadPosition) => pad.xMm
  const buckets = new Map<string, string[]>()
  for (const pad of pads) {
    // Keyed on the rounded coordinate, the same four decimals classifyPads
    // uses: finer than any footprint dimension, coarser than IEEE754 noise.
    const key = across(pad).toFixed(4)
    const bucket = buckets.get(key) ?? []
    bucket.push(pad.pad)
    buckets.set(key, bucket)
  }
  return [...buckets.values()]
}

/**
 * The footprint's rows AS `HC10`'s placement rule means them: the decomposition
 * whose rows are the LONGER of the two, by pads per row.
 *
 * WHY THIS IS NOT `classification.rows`, which is the one judgement in this file
 * that had to be read rather than quoted, and is flagged in the task report as
 * such. Any grid pad pattern decomposes into rows along EITHER axis, and
 * `classifyPads` returns the first axis that works - `x` whenever `x` works -
 * which for three recorded footprints is the axis giving many SHORT rows rather
 * than few LONG ones. Measured: `DIP-16_W7.62mm` records eight rows of two (the
 * pad PAIRS, `1`+`16`, `2`+`15`, ...), and `PinHeader_1x02`/`1x05` record two
 * and five rows of one. The other ten recorded footprints are identical either
 * way.
 *
 * THE OWNER'S RULE NAMES THE OTHER ONE FOR THE DIP, and his sentence is what
 * settles it: *"dips should span strips with a cut down the middle, like a
 * breadboard."* A breadboard-mounted DIP-16 puts one pin from each SIDE on each
 * of eight strips, with the cut between them - so its 16 pins DO sit two to a
 * strip, and the pair sharing a strip is the mounting being ruled IN rather than
 * out. Read against `classification.rows`, where the pair IS a row, the rule
 * would refuse exactly that mounting: measured on `pt2399-core`'s `U1`, eight
 * violations, one per strip. Read against the two rows of eight - the
 * decomposition the plan's own direction names, *"U1's two rows of eight each
 * cross eight strips"* - it passes, and so does every other part on every board.
 *
 * MEASURED BEFORE BEING RELIED ON, on four committed boards: zero violations on
 * `pt2399-core` (12 graded), `transistor-preamp-feedback` (16) and
 * `transistor-preamp-staged` (30), all three of which pass `make check`; and
 * FIVE on `transistor-preamp-lab`, which does not - `C3`, `R4`, `RV2`, `RV4`
 * and `RV5` each have both leads of one row on a single strip. So the rule is
 * satisfied by every board a person built and in service, and is not vacuous:
 * it discriminates on real data. The figures are in
 * `docs/stripboard/pipeline-verification.md` section 3.
 *
 * IT READS THE RECORDED PADS AND RE-DERIVES NOTHING ELSE. `classification`
 * remains the authority for the FOOTPRINT half (`admitPattern`), which is the
 * clause about whether a pattern decomposes at all; this is only the grouping
 * the placement rule is phrased over.
 */
function hc10Rows(pattern: PinPattern): readonly (readonly string[])[] {
  const alongX = rowsAlong(pattern.pads, "x")
  const alongY = rowsAlong(pattern.pads, "y")
  const widest = (rows: readonly (readonly string[])[]): number =>
    Math.max(...rows.map((row) => row.length))
  const byX = widest(alongX)
  const byY = widest(alongY)
  // A TIE REFUSES, AND IT IS NOT BROKEN SILENTLY. When neither axis yields the
  // longer rows there is no longer-row axis to group by, so THE RULE HAS NO
  // ANSWER - and a tie-break would make the verdict the tie-break rather than
  // the rule. Measured consequence of falling to one axis: a 2 x 2 square
  // footprint gives held=false and then, rotated 90 degrees, held=true - two
  // different verdicts for what is physically the same arrangement.
  //
  // So it throws, which is this repository's standard: an empty whitelist that
  // refuses loudly beats a general rule that quietly accepts a guess. NO
  // RECORDED FOOTPRINT IS AFFECTED - all thirteen have one axis strictly
  // longer, and the degenerate shapes (one row, rows of one pin, a single pad)
  // are decided by the comparison rather than by a tie. This refuses for
  // nobody today and stops an arbitrary verdict the day a square part arrives.
  if (byX === byY) {
    throw new Error(
      `HC10's placement half cannot decide footprint "${pattern.footprint}": its pads give ` +
        `rows of at most ${byX} along x and at most ${byY} along y, so NEITHER AXIS IS THE ` +
        "longer one and the owner's rule - no two pins of the same footprint row may share a " +
        "strip - has no row decomposition to be read over.\nThis is NOT broken by a tie-break: " +
        "which axis won would then decide the verdict, and the same part rotated a quarter turn " +
        "would grade differently. A square pin field needs a rule the owner has not given. " +
        "Take it to him, and record the answer in docs/stripboard/pipeline-verification.md " +
        "section 3 beside the rule it extends.",
    )
  }
  return byY > byX ? alongY : alongX
}

/**
 * `HC10`'s placement half - **THE OWNER'S RULE, decided by him on 2026-10-11**:
 *
 *   > **No two pins belonging to the same footprint row may share a strip.**
 *
 * His sentence, quoted: *"dips should span strips with a cut down the middle,
 * like a breadboard."*
 *
 * THE TASK BRIEF'S ORIGINAL WORDING WAS INVERTED, and recording that is the
 * point of this paragraph rather than tidiness. It asked that a part's pins
 * *"fall on a set of strips whose occupied strips are exactly the rows the
 * footprint's classification predicts"* - which requires a footprint row to lie
 * ALONG a strip. Measured against the three committed boards that pass
 * `make check`, that refused 13 of 16, 27 of 34 and 10 of 12 placed parts,
 * because a two-terminal part's leads sit on two strips BECAUSE THEY SIT ON TWO
 * NETS: both leads on one strip is a short across the part. The owner settled
 * it the other way round, and the measurements are in
 * `docs/stripboard/pipeline-verification.md` section 3.
 *
 * WHY IT IS A SHORT AND NOT A PREFERENCE: a row lying along a strip puts every
 * pin of that row on ONE piece of copper. A row crossing the strips puts each
 * of its pins on its own strip, which is the breadboard mounting. The DIP's
 * centre cut is `HC1`'s and `HC8`'s business, where connectivity is decided;
 * `HC10` does not assert it a second time.
 *
 * `DIRECTION` IS READ AS WELL AS THE PIN HOLES - TWO WITNESSES, for `M1.1`'s
 * own reason: *"reading the orientation directly is what makes the check
 * independent of the lead pattern, and a single-pad or symmetric part has no
 * lead pattern to read."* Same shape as `HC3`'s two signals, so a change keeping
 * one and dropping the other fails loudly. The direction is reported rather than
 * re-derived from the holes, because a part whose rows are all one pin long has
 * no readable orientation at all.
 *
 * WHAT THE `DIRECTION` WITNESS DOES AND DOES NOT DO, stated so nobody reads it
 * as more than it is. It REFUSES a placed part whose orientation the dump does
 * not state, or states as `UNKNOWN`, and it reports the one it read. It does
 * NOT independently re-derive whether that orientation is the correct one,
 * because nothing states the correspondence between a KiCad footprint's pad
 * axes and VeroRoute's own footprint rows and columns - that is
 * `admitPattern`'s own documented weakness and it is not closed here. So: a
 * second REFUSAL path that works for a single-pad or symmetric part with no
 * lead pattern to read, which is what `M1.1` asks for; not a second derivation
 * of the verdict.
 *
 * A ONE-PIN ROW CANNOT VIOLATE THE RULE, and that is correct rather than a gap:
 * a row of one pin cannot be shorted to itself. Negative fixture:
 * `rows-along-a-strip`.
 */
function hc10PlacementOrientation(input: CheckInput): string | undefined {
  for (const [part, pins] of placedParts(input.dump)) {
    const footprint = footprintOf(part, pins, input.footprints)
    if (footprint === undefined) continue
    const pattern = patternFor(footprint, input)
    if (pattern.classification.kind !== "rows") continue
    const rowOfPad = new Map<string, number>()
    hc10Rows(pattern).forEach((row, index) => {
      for (const pad of row) rowOfPad.set(pad, index)
    })
    // Witness 2, read before any hole is grouped so that a part with no usable
    // DIRECTION refuses here rather than passing on the holes alone.
    const direction = usableDirection(part, `HC10's placement half for part ${part.ref}`)
    const byRowAndStrip = new Map<string, Pin[]>()
    for (const pin of pins) {
      const row = rowOfPad.get(pin.pin)
      if (row === undefined) {
        throw new Error(
          `HC10 cannot place part ${part.ref}: the dump prints PIN ${part.ref} ${pin.pin}, and ` +
            `"${pin.pin}" is not a pad of footprint ${footprint} as lib/kicad/pin-pattern.ts ` +
            "records it.\nThis is NOT skipped: a pin the footprint does not have means the " +
            "footprint declared for this part is the wrong one, or the recorded pad list is " +
            "incomplete, and either way the rows this check reads are not this part's.",
        )
      }
      const key = `${row}|${stripOf(pin, input.dump.verticalStrips)}`
      const group = byRowAndStrip.get(key) ?? []
      group.push(pin)
      byRowAndStrip.set(key, group)
    }
    const shared = [...byRowAndStrip.entries()].filter(([, group]) => group.length > 1)
    const first = shared[0]
    if (first !== undefined) {
      const [key, group] = first
      const [row, strip] = key.split("|")
      return (
        `the placement half refuses part ${part.ref} (${footprint}, DIRECTION ${direction}): ` +
        `row ${row ?? ""} of its footprint has ${group.length} pins on strip ${strip ?? ""} - ` +
        `pins ${group.map((pin) => pin.pin).join(" and ")} at ${group.map(at).join(" and ")}` +
        `${shared.length > 1 ? `, and ${shared.length - 1} further row(s) likewise` : ""}. ` +
        "A row lying along a strip puts every pin of that row on one piece of copper. Turn the " +
        "part so its rows cross the strips; the remedy is in the layout, not in the data."
      )
    }
  }
  return undefined
}

/**
 * `HC10` - **every placed part's pins lie on straight lines parallel to the
 * strips**, *"the owner's rule, and a cost judgement rather than a geometric
 * impossibility."*
 *
 * ONE ENTRY CONJOINING TWO HALVES, with `detail` naming WHICH half failed so a
 * failure points at the remedy: the footprint half points at the data, the
 * placement half points at the layout.
 */
export function hc10(input: CheckInput): ConstraintResult {
  const footprintFailure = hc10FootprintEligibility(input)
  if (footprintFailure !== undefined) return broken("HC10", footprintFailure)
  const placementFailure = hc10PlacementOrientation(input)
  if (placementFailure !== undefined) return broken("HC10", placementFailure)
  const placed = placedParts(input.dump).filter(
    ([part, pins]) => footprintOf(part, pins, input.footprints) !== undefined,
  )
  return holds(
    "HC10",
    `the footprint half admits all ${placed.length} placed part(s) with a declared footprint, ` +
      "and the placement half finds no footprint row with two pins on one strip - each row " +
      "crosses the strips, which is the mounting the owner's rule requires.",
  )
}
