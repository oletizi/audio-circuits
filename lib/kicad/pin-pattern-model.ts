/**
 * Whether a footprint's PINS decompose into rows parallel to the strips, which
 * is `HC10`'s footprint-level test, and what recorded preparation may be relied
 * on to put an off-grid pitch into holes.
 *
 * WHOSE RULE THIS IS. The owner's: *"I'm not going to mount a round switch into
 * a stripboard. That never works. Round footprints do not work well with
 * stripboard."* It is a COST JUDGEMENT, not a geometric impossibility - a circle
 * of pins can be routed with a cut at nearly every pin, and the justification is
 * that the cut cost is prohibitive. Nothing here claims such a board could not
 * be built.
 *
 * IT IS A RULE ABOUT PIN GEOMETRY, NOT BODY SHAPE, and the distinction decides
 * whether it is useful or catastrophic: a radial electrolytic has a cylindrical
 * body and two inline leads and is placeable. Read as banning round bodies it
 * makes every electrolytic on every board unplaceable.
 *
 * THE ARITHMETIC IS HERE AND THE PADS ARE IN `./pin-pattern.ts`, deliberately,
 * exactly as `./lead-span-model.ts` and `./lead-span.ts` split. A recorded
 * classification is only as good as the pads it came from, so
 * `tests/kicad/pin-pattern.test.ts` rederives every recorded classification
 * from the recorded pads through these functions, and opens the `.kicad_mod` to
 * check the pads themselves. A classification that cannot be rederived is a
 * transcription error, and that is the error this split is built to catch.
 *
 * THIS IS HALF OF `HC10`. `HC10` as worded is about a PLACEMENT - "every placed
 * part's pins lie on straight lines parallel to the strips" - while CRITERIA's
 * own "Checked by" column specifies a FOOTPRINT-level check that refuses "by
 * name before any placement exists to grade". This module is the footprint half.
 * A footprint that decomposes along one axis still has to be ORIENTED so those
 * rows lie along the strips, and a layout that failed to is a layout this check
 * passes. See `docs/stripboard/pin-pattern.md`, which reports that divergence
 * for the owner.
 */
import { GRID_MM, PITCH_TOLERANCE_MM, holesForSteps, nearestGridSteps } from "./grid.ts"
import type { DatasheetRef } from "./lead-span-model.ts"
import { LEAD_SPANS, leadSpanFor } from "./lead-span.ts"

/** One pad's centre, in the footprint's own millimetres, as the .kicad_mod states it. */
export interface PadPosition {
  readonly pad: string
  readonly xMm: number
  readonly yMm: number
}

/** The file the pads were read out of, precisely enough to open it again. */
export interface PadSource {
  readonly file: string
  /** The `(version <n>)` token in that file. */
  readonly version: string
  /** How many `(pad ...)` forms it holds, so a partial transcription is loud. */
  readonly padCount: number
  /**
   * Pads in the file that are deliberately NOT classified, each with why.
   *
   * A FIELD AND NOT A RULE: every pad of all thirteen recorded footprints is
   * named and classified, so every entry's list is empty today. The field
   * exists because that is a measurement, and the alternative to it is a pad
   * count that silently disagrees the first time a footprint carries a
   * mounting hole.
   */
  readonly excludedPads: readonly { readonly pad: string; readonly reason: string }[]
}

export interface RowDecomposition {
  /** The axis the rows RUN ALONG: "x" means rows of constant y. */
  readonly axis: "x" | "y"
  /** Pad names per row, rows in increasing across-axis order, pads in file order. */
  readonly rows: readonly (readonly string[])[]
  /** Across-axis separations between consecutive rows, in whole grid steps. */
  readonly rowPitchSteps: readonly number[]
  /** Pitches between adjacent pads WITHIN each row, row by row. A fact, not a verdict. */
  readonly alongRowPitchesMm: readonly number[]
  /** Whether every one of those pitches is a whole number of grid steps. */
  readonly alongRowOnGrid: boolean
}

export type PatternClassification =
  | ({ readonly kind: "rows" } & RowDecomposition)
  | { readonly kind: "off-strip-lattice"; readonly reason: string }

/**
 * WHICH POINT OF THE LEAD ROW THE BENDING HOLDS FIXED - the one fact about a
 * formed part that neither its pads nor its body outline states, and without
 * which the two cannot be put in one frame.
 *
 * WHY IT IS NEEDED AT ALL. A `.kicad_mod`'s `F.Fab` outline is drawn around the
 * MOULDED lead positions. Forming re-spaces the leads along their row, so after
 * the bend the body and the leads are stated in two different frames, and the
 * offset between them is a physical fact about how the bend was made. It cannot
 * be derived from the file: an extent is translation-invariant, and the pads
 * after forming are on the grid under every one of these three choices.
 * `lib/kicad/footprint-extent.ts` refused all three formed footprints outright
 * until this field existed, under `footprint-extent-formed-frame-unrecorded`.
 *
 * WHAT EACH VALUE MEANS PHYSICALLY:
 *
 * - `lead-row-midpoint` - the midpoint between the outermost leads does not
 *   move; the outer leads travel equal and opposite distances. A pair splayed
 *   outward by half the shortfall EACH, or a TO-92 whose middle lead stays
 *   where it is while the outer two go out by one half-step each.
 * - `first-lead` - the lowest-numbered lead is left standing and every other
 *   lead moves. The body then sits off-centre over the formed row by the whole
 *   displacement.
 * - `last-lead` - the same, from the other end. It differs from `first-lead` by
 *   the full forming displacement, which for TO-92_Inline is a whole grid step.
 *
 * THE THREE ARE ALL EXPRESSIBLE AND THEY DISAGREE, which is why this is a
 * recorded choice and not a default. For `CP_Radial_D5.0mm_P2.00mm` they give
 * two, three and three holes along the row, and the two threes differ in which
 * side the extra hole is on. For `TO-92_Inline` and `CP_Radial_D8.0mm_P3.50mm`
 * they happen to agree, which is a measurement rather than a reason to leave the
 * field off: the agreement is a fact about those two bodies' widths against
 * their formed spans, and `tests/kicad/formed-frame.test.ts` asserts it.
 */
export type FormingAnchor = "lead-row-midpoint" | "first-lead" | "last-lead"

/**
 * What was done to the part's terminals before it met the board.
 *
 * `as-moulded` is the part as it ships. `formed-to-grid` is a one-time physical
 * preparation - the leads bent, once, with pliers - and it is RECORDED DATA
 * with provenance, never inferred from the pads: collinearity does not
 * establish that leads enter holes. See `admitPattern`.
 */
export type GridAccommodation =
  | { readonly kind: "as-moulded" }
  | {
      readonly kind: "formed-to-grid"
      /** Whole grid steps between adjacent pins AFTER the forming. */
      readonly preparedPitchSteps: number
      readonly basis: string
      readonly source: DatasheetRef
      /** Which point of the lead row the bend holds fixed. See `FormingAnchor`. */
      readonly anchor: FormingAnchor
      /** Why that anchor and not the other two, and what the claim rests on. */
      readonly anchorBasis: string
      /** The document or file the anchor was read off. Separate from `source`:
       * the reach and the frame are two different claims from two different
       * places, and one citation covering both would hide which it supports. */
      readonly anchorSource: DatasheetRef
    }

export type PatternEligibility =
  | { readonly kind: "eligible"; readonly accommodation: GridAccommodation; readonly detail: string }
  | { readonly kind: "refused"; readonly reason: string }

/** A footprint's pads, where they were read from, and what they decompose into. */
export interface PinPattern {
  readonly footprint: string
  readonly pads: readonly PadPosition[]
  readonly source: PadSource
  readonly classification: PatternClassification
  readonly accommodation: GridAccommodation
  readonly basis: string
}

const along = (axis: "x" | "y") =>
  axis === "x" ? (pad: PadPosition) => pad.xMm : (pad: PadPosition) => pad.yMm

const across = (axis: "x" | "y") =>
  axis === "x" ? (pad: PadPosition) => pad.yMm : (pad: PadPosition) => pad.xMm

function groupBy(pads: readonly PadPosition[], coordinate: (pad: PadPosition) => number) {
  const buckets = new Map<string, { readonly at: number; readonly pads: string[] }>()
  for (const pad of pads) {
    // Keyed on the rounded coordinate so 2.5400000000000005 and 2.54 are one
    // row. Four decimals is finer than any footprint dimension and coarser
    // than IEEE754 noise.
    const key = coordinate(pad).toFixed(4)
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, { at: coordinate(pad), pads: [pad.pad] })
    else bucket.pads.push(pad.pad)
  }
  return [...buckets.values()].sort((a, b) => a.at - b.at)
}

function tryAxis(pads: readonly PadPosition[], axis: "x" | "y"): PatternClassification {
  const rows = groupBy(pads, across(axis))
  const steps: number[] = []
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]
    const current = rows[index]
    if (previous === undefined || current === undefined) {
      throw new Error("unreachable: rows was indexed inside its own length")
    }
    const separation = current.at - previous.at
    const resolved = nearestGridSteps(separation)
    if (resolved.errorMm > PITCH_TOLERANCE_MM || resolved.steps < 1) {
      return {
        kind: "off-strip-lattice",
        reason:
          `rows along ${axis} at ${previous.at}mm and ${current.at}mm are ${separation.toFixed(3)}mm ` +
          `apart, which is ${resolved.errorMm.toFixed(3)}mm from ${resolved.steps} whole strip ` +
          `pitches of ${GRID_MM}mm - more than the ${PITCH_TOLERANCE_MM}mm tolerance. Two pads on ` +
          "different rows land on different strips, and no bending puts a lead between strips.",
      }
    }
    steps.push(resolved.steps)
  }
  // The ALONG-row pitches are reported as facts, never as a verdict: whether an
  // off-grid pitch is mountable depends on a recorded accommodation, and that is
  // admitPattern's question.
  const alongOf = along(axis)
  const byName = new Map(pads.map((pad) => [pad.pad, pad]))
  const pitches: number[] = []
  let onGrid = true
  for (const row of rows) {
    const coords = row.pads
      .map((name) => {
        const pad = byName.get(name)
        if (pad === undefined) throw new Error("unreachable: a row names a pad not in the input")
        return alongOf(pad)
      })
      .sort((a, b) => a - b)
    for (let index = 1; index < coords.length; index += 1) {
      const current = coords[index]
      const previous = coords[index - 1]
      if (current === undefined || previous === undefined) {
        throw new Error("unreachable: coords was indexed inside its own length")
      }
      const pitch = current - previous
      pitches.push(Number(pitch.toFixed(4)))
      const resolved = nearestGridSteps(pitch)
      if (resolved.errorMm > PITCH_TOLERANCE_MM || resolved.steps < 1) onGrid = false
    }
  }
  return {
    kind: "rows",
    axis,
    rows: rows.map((row) => row.pads),
    rowPitchSteps: steps,
    alongRowPitchesMm: pitches,
    alongRowOnGrid: onGrid,
  }
}

/**
 * Whether a footprint's pads decompose into rows a whole number of strips
 * apart - `HC10`'s test, at footprint level, with no latitude inside it.
 *
 * ACROSS THE STRIPS THE SEPARATION MUST BE A WHOLE NUMBER OF GRID STEPS. The
 * asymmetry is physical: a row of pads sits on one strip and the next row on
 * another, and the strip pitch is fixed, while a lead moves along its own
 * strip by entering a different hole in it.
 *
 * ALONG A ROW the pitches are REPORTED, not judged. TO-92_Inline's three
 * collinear pads at 1.27mm are the worked case, and collinearity does NOT
 * establish that those leads enter holes: two of the three are between holes
 * as moulded, and what puts them in holes is forming the leads. Whether that
 * accommodation exists for a family is RECORDED DATA, so the verdict is
 * `admitPattern`'s and not this function's.
 *
 * BOTH AXES ARE TRIED, and the refusal is only returned when both fail. A
 * classifier that tried one axis would refuse a DIP whose rows happen to lie
 * along the other one.
 *
 * WHAT IT DOES NOT CHECK: the along-row pitches are compared WITHIN a row, so
 * two rows whose holes are mutually offset by a fraction of a step still
 * classify as `rows`. No recorded footprint is in that shape (the one pattern
 * with an offset pad, the RM-065 trimmer, is offset by a whole step), and the
 * gap is stated in `docs/stripboard/pin-pattern.md` rather than papered over.
 */
export function classifyPads(pads: readonly PadPosition[]): PatternClassification {
  if (pads.length === 0) {
    throw new Error(
      "a pin pattern needs at least one pad: an empty pad list would classify as rows " +
        "vacuously, which is a hard constraint passing because nothing was checked.",
    )
  }
  const alongX = tryAxis(pads, "x")
  if (alongX.kind === "rows") return alongX
  const alongY = tryAxis(pads, "y")
  if (alongY.kind === "rows") return alongY
  return {
    kind: "off-strip-lattice",
    reason:
      "neither axis decomposes into rows a whole number of strip pitches apart. Along x: " +
      `${alongX.reason} Along y: ${alongY.reason}`,
  }
}

/** Distinct along-axis positions in the row that has the most of them. */
function widestRowPositions(pattern: PinPattern, rows: readonly (readonly string[])[], axis: "x" | "y"): number {
  const alongOf = along(axis)
  const byName = new Map(pattern.pads.map((pad) => [pad.pad, pad]))
  let widest = 1
  for (const row of rows) {
    const positions = new Set(
      row.map((name) => {
        const pad = byName.get(name)
        if (pad === undefined) throw new Error("unreachable: a row names a pad not in the pattern")
        return alongOf(pad).toFixed(4)
      }),
    )
    widest = Math.max(widest, positions.size)
  }
  return widest
}

/**
 * The pattern's hole extent on each of its two axes after any recorded
 * preparation: the along-row extent first, then the across-axis row count.
 *
 * It exists so that the cross-check against `leadSpanFor` is over STATED
 * quantities rather than a rederivation at the call site. It returns hole
 * counts, so it refuses rather than returning one for a pattern whose pads are
 * not at holes: a pattern with no rows at all, and an off-grid along-row pitch
 * with no recorded preparation - the pattern `admitPattern` refuses.
 */
export function preparedExtentsHoles(pattern: PinPattern): readonly number[] {
  const classification = pattern.classification
  if (classification.kind !== "rows") {
    throw new Error(
      `footprint "${pattern.footprint}" has no rows to measure an extent along: its pads ` +
        `classify as ${classification.kind}. ${classification.reason}\nThis is not defaulted to ` +
        "a hole count: a number here would be the extent of a pattern the strips cannot take, " +
        "and HC10 refuses it outright rather than sizing it.",
    )
  }
  const acrossHoles = classification.rows.length
  if (pattern.accommodation.kind === "formed-to-grid") {
    const positions = widestRowPositions(pattern, classification.rows, classification.axis)
    return [
      holesForSteps((positions - 1) * pattern.accommodation.preparedPitchSteps),
      acrossHoles,
    ]
  }
  const coords = pattern.pads.map(along(classification.axis))
  const extentMm = Math.max(...coords) - Math.min(...coords)
  const resolved = nearestGridSteps(extentMm)
  if (resolved.errorMm > PITCH_TOLERANCE_MM) {
    throw new Error(
      `footprint "${pattern.footprint}" is recorded as "as-moulded", but its along-${classification.axis} ` +
        `extent of ${extentMm.toFixed(3)}mm is ${resolved.errorMm.toFixed(3)}mm off ${resolved.steps} ` +
        `whole ${GRID_MM}mm steps - beyond the ${PITCH_TOLERANCE_MM}mm tolerance, so its outer pads ` +
        "are not both at holes.\nThis is not defaulted to the nearest hole count: admitPattern " +
        "refuses this pattern, and a hole count for it would be the size of a part that is not " +
        "mounted. Record a formed-to-grid accommodation in lib/kicad/pin-pattern.ts, with its " +
        "basis and datasheet, or leave the footprint refused.",
    )
  }
  return [holesForSteps(resolved.steps), acrossHoles]
}

const WHY_NOT_DEFAULTED =
  "This is not defaulted, and will not be: HC10 is a hard constraint in A1, so a pattern " +
  "admitted without the evidence for it is a verdict claiming a constraint held that was never " +
  "checked - and the board it licenses is one the owner will not build."

/**
 * The one place a footprint is declared mountable on stripboard, and the four
 * shapes of refusal.
 *
 * 1. the classification is `off-strip-lattice` - the across-strip clause, which
 *    refuses outright and has no accommodation;
 * 2. the along-row pitch is off the grid and the accommodation is `as-moulded` -
 *    no recorded preparation, so no admission. The remedy differs by whether
 *    `lead-span.ts` records the family as formable, and the message says which;
 * 3. the accommodation is `formed-to-grid` while the pitches are already on the
 *    grid - a spurious record, refused so the field cannot become decoration
 *    that would quietly license the off-grid case next to it;
 * 4. the footprint is not in `LEAD_SPANS` at all - refused by name, because the
 *    cross-check has nothing to check against and admitting it would be
 *    admitting an unbounded reach.
 *
 * And one cross-check, which is what keeps a recorded accommodation from being
 * a free-text claim: the prepared pattern's hole extent on ONE of its two axes
 * must lie inside `[minSpanHoles, maxSpanHoles]` as `leadSpanFor` reports them.
 * It is a DISJUNCTION over two axes, and that is a stated weakness - it catches
 * a recorded extent matching NEITHER axis and does not catch one matching the
 * wrong one, because neither module says which axis a `fixedSpanHoles` is
 * measured along and inventing that correspondence is not available here.
 *
 * **IT READS THE MODULE-LEVEL `LEAD_SPANS` DIRECTLY, SO ONE GRADE CAN CONSULT
 * TWO SPAN TABLES.** `HC4`, `HC5` and `HC9` take their bounds from
 * `CheckInput.spans` through `spanFor` (`tools/stripboard/constraints-physical.ts`);
 * `HC10`'s footprint half calls this function, which reads `LEAD_SPANS` out of
 * `./lead-span.ts` with nothing routing `input.spans` to it. It is harmless today
 * only because every injector spreads the real map
 * (`tests/stripboard/synthetic-footprints.ts`), so no recorded footprint is
 * shadowed. **ONE EXTRA OPTIONAL PARAMETER WOULD CLOSE IT** - the same seam
 * `pinPatternFor` and `leadSpanFor` already have - and it is recorded with that
 * note rather than as "if that is ever wanted", because the cost of wanting it
 * later is a verdict in which three constraints use a revised figure and `HC10`
 * uses the old one, which cannot be explained from the inputs. See
 * `docs/stripboard/pipeline-verification.md` §9.4.
 *
 * **AND `minSpanHoles` HAS THIS AS A THIRD CONSUMER**, which the stand-on-end
 * widening audit missed: the band check below reads it as well as
 * `maxSpanHoles`, so the DIN0207 band went `[5, 16]` to `[2, 16]` with the
 * widening. No wrong answer today - the resistor's prepared extents are `[5, 1]`,
 * so the right axis is the one that matches - but it is a loss of strength in the
 * disjunction, and a 3-row footprint whose along-row extent were wrong would now
 * be admitted on its row count alone where 3 previously fell outside the band.
 * Recorded in the deviation entry in
 * `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`.
 */
export function admitPattern(pattern: PinPattern): PatternEligibility {
  const classification = pattern.classification
  if (classification.kind !== "rows") {
    return {
      kind: "refused",
      reason:
        `footprint "${pattern.footprint}" does not decompose into rows parallel to the strips: ` +
        `${classification.reason}\nA strip is a straight line of copper, so such a pattern ` +
        "crosses a different strip at nearly every pin and shares one with pins it must not " +
        "share with: nearly every hole becomes a cut. The owner's verdict is that the cut cost " +
        `is prohibitive and that he will not build it.\n${WHY_NOT_DEFAULTED}`,
    }
  }
  if (!LEAD_SPANS.has(pattern.footprint)) {
    return {
      kind: "refused",
      reason:
        `footprint "${pattern.footprint}" has a recorded pin pattern but no recorded lead span: ` +
        "it is not in LEAD_SPANS in lib/kicad/lead-span.ts, so the prepared extent this module " +
        "states cannot be checked against how far the part's leads actually reach.\n" +
        `${WHY_NOT_DEFAULTED}\nTo fix it, record the family's span in lib/kicad/lead-span.ts ` +
        "from a named part's datasheet, as the entries beside it are.",
    }
  }
  const span = leadSpanFor(pattern.footprint)
  const accommodation = pattern.accommodation
  if (accommodation.kind === "formed-to-grid" && classification.alongRowOnGrid) {
    return {
      kind: "refused",
      reason:
        `footprint "${pattern.footprint}" carries a formed-to-grid accommodation, but every one ` +
        `of its along-row pitches is already a whole number of ${GRID_MM}mm steps ` +
        `(${JSON.stringify(classification.alongRowPitchesMm)}mm), so there is nothing to form. ` +
        "A record of a physical operation nobody performs is refused rather than ignored: left " +
        "standing it would be decoration, and decoration here would quietly license the " +
        "off-grid case next to it. Remove the accommodation from lib/kicad/pin-pattern.ts, or " +
        "say which pitch it is for.",
    }
  }
  if (accommodation.kind === "as-moulded" && !classification.alongRowOnGrid) {
    const remedy = span.formable
      ? "lead-span.ts records this family as formable, with its datasheet, as minSpanHoles/" +
        `maxSpanHoles (${span.minSpanHoles}-${span.maxSpanHoles} holes) - but that is a claim ` +
        "about REACH and says nothing about whether this footprint's own moulded pitch was " +
        "formed onto the grid. Record a formed-to-grid accommodation in " +
        "lib/kicad/pin-pattern.ts citing that reach, rather than restating its figures."
      : `lead-span.ts records this family as formable: false (${span.minSpanHoles} holes, fixed), ` +
        "so nothing in the span module says these terminals may be moved at all. An off-grid " +
        "pitch is unmountable unless a one-time preparation is recorded: add a formed-to-grid " +
        "accommodation in lib/kicad/pin-pattern.ts with its own basis and DatasheetRef."
    return {
      kind: "refused",
      reason:
        `footprint "${pattern.footprint}" is recorded as "as-moulded", but its along-row pitches ` +
        `${JSON.stringify(classification.alongRowPitchesMm)}mm are not whole multiples of ` +
        `${GRID_MM}mm, so its pads do not all land on holes. Collinearity does not establish ` +
        "that leads enter holes - a formed-to-grid accommodation is the only thing that does, " +
        `and it is recorded, never inferred.\n${remedy}\n${WHY_NOT_DEFAULTED}`,
    }
  }
  const extents = preparedExtentsHoles(pattern)
  const fits = extents.some((holes) => holes >= span.minSpanHoles && holes <= span.maxSpanHoles)
  if (!fits) {
    return {
      kind: "refused",
      reason:
        `footprint "${pattern.footprint}": neither axis's prepared hole extent ` +
        `${JSON.stringify(extents)} lies inside the ${span.minSpanHoles}-${span.maxSpanHoles} ` +
        "holes lib/kicad/lead-span.ts records for this family, so one of the two modules is " +
        "wrong - either the pads or the accommodation in lib/kicad/pin-pattern.ts, or the " +
        "geometry in lib/kicad/lead-span.ts. Neither module says which axis a recorded span is " +
        "measured along, so this refusal names both rather than picking a winner: open the " +
        `.kicad_mod and the part's datasheet.\n${WHY_NOT_DEFAULTED}`,
    }
  }
  const shape =
    `${classification.rows.length} row(s) running along ${classification.axis}, ` +
    `prepared hole extents ${JSON.stringify(extents)} against lead-span.ts's recorded ` +
    `${span.minSpanHoles}-${span.maxSpanHoles}`
  if (accommodation.kind === "as-moulded") {
    return {
      kind: "eligible",
      accommodation,
      detail:
        `${pattern.footprint}: on-grid along the row, so the part drops into the holes as ` +
        `moulded and no lead is formed. ${shape}.`,
    }
  }
  const standing = span.formable
    ? "lead-span.ts already records this family as formable, with its datasheet, so this " +
      "accommodation cites that reach rather than restating it"
    : "lead-span.ts records this family as formable: false, so this recorded accommodation is " +
      "the only thing that admits it"
  return {
    kind: "eligible",
    accommodation,
    detail:
      `${pattern.footprint}: off the grid as moulded, and admitted because its leads are formed ` +
      `to ${accommodation.preparedPitchSteps} whole ${GRID_MM}mm step(s) as a one-time ` +
      `preparation - ${standing}. ${shape}.`,
  }
}
