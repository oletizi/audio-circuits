/**
 * Putting a formed part's PADS and its BODY in one frame - the question
 * `footprint-extent.ts` refused outright until a `FormingAnchor` was recorded.
 *
 * WHY IT IS A SEPARATE FILE. `./footprint-extent.ts` reads a `.kicad_mod` and
 * takes a bounding box over its `F.Fab` graphics; that is file work. This is
 * arithmetic over a recorded `PinPattern` and needs no file at all. The two
 * were one module and the one module went past this repository's 300-500 line
 * ceiling the moment the anchor arrived, so they split the way
 * `./lead-span-model.ts` and `./lead-span.ts` do - and nothing moved but
 * location: `padHolesFor` was in that file and its callers now import it here.
 *
 * WHAT THE PROBLEM IS. A `.kicad_mod` draws the body around the MOULDED lead
 * positions. Forming re-spaces the leads along their row, so the formed pads
 * and the drawn body are in two different frames and the offset between them is
 * a physical fact about the bend. Nothing in the file states it: the pads land
 * on the grid under every anchor, and a bounding box is translation-invariant.
 * `pin-pattern-model.ts`'s `FormingAnchor` is the record, and this module is
 * the one place it is turned into a number.
 *
 * THE ANCHOR IS NOT CHOSEN HERE AND MUST NOT BE. Which point the bend holds
 * fixed decides which holes the part covers, which is the answer the caller is
 * asking for; a default here would be this code authoring its own result.
 * `lib/kicad/pin-pattern.ts` records the choice per footprint, with the three
 * KiCad file pairs it was read off. A shape no record covers refuses by name
 * below rather than taking the nearest recorded anchor's arithmetic.
 */
import { GRID_MM, PITCH_TOLERANCE_MM, nearestGridSteps } from "./grid.ts"
import type { PinPattern, RowDecomposition } from "./pin-pattern-model.ts"

/** One pad's hole, in grid steps along the footprint's own two axes. */
export interface PadHole {
  readonly pad: string
  readonly xSteps: number
  readonly ySteps: number
}

/**
 * How far the body moves, along the lead row, between the moulded frame the
 * `.kicad_mod` draws it in and the formed frame the pads land on holes in.
 *
 * `axis` is the axis the row RUNS ALONG, which is `RowDecomposition.axis`, and
 * is `null` only for a pattern with no row decomposition at all - a pattern
 * `admitPattern` refuses, for which there is no row and so no shift.
 * `shiftMm` is zero for every `as-moulded` pattern, which is why the ten
 * as-moulded entries read exactly as they did before this module existed.
 */
export interface FormedFrame {
  readonly axis: "x" | "y" | null
  readonly shiftMm: number
}

const along = (axis: "x" | "y") =>
  axis === "x" ? (pad: { xMm: number; yMm: number }) => pad.xMm : (pad: { xMm: number; yMm: number }) => pad.yMm

/**
 * The one row a formed pattern's pads make, with its pads' along-row
 * coordinates sorted - or a refusal naming the shape nothing has measured.
 *
 * TWO SHAPES REFUSE, and both are the honest residue of the old
 * `formed-frame-unrecorded` refusal rather than a narrower version of it:
 *
 * - MORE THAN ONE ROW. The anchor arithmetic below is stated for one row, and
 *   two rows of a formed package could be bent differently from one another -
 *   nothing records which. No recorded footprint is in that shape, so handling
 *   it would be untested code that looks like a working derivation, which is
 *   the same reason `footprint-extent.ts` leaves `fp_poly` out.
 * - A ROW WHOSE MOULDED PITCHES ARE NOT ALL EQUAL. `preparedPitchSteps` is ONE
 *   figure for the whole row, so forming an unevenly-moulded row to it moves
 *   each lead by a different amount and the anchor's three choices stop being
 *   the only three: every lead becomes a candidate. All three recorded formed
 *   footprints are evenly moulded (1.27/1.27, and single pairs), so this too
 *   is a shape nothing has looked at.
 */
function formedRow(pattern: PinPattern): { readonly axis: "x" | "y"; readonly coords: readonly number[] } {
  const classification = pattern.classification
  if (classification.kind !== "rows") {
    throw new Error(
      `formed-frame-no-rows: "${pattern.footprint}" does not decompose into rows parallel to ` +
        `the strips (${classification.reason}), so there is no lead row for a forming anchor to ` +
        "be measured along.\nThis is not approximated: admitPattern in " +
        "lib/kicad/pin-pattern-model.ts refuses such a pattern outright, and a frame for it " +
        "would be the geometry of a part that is never mounted.",
    )
  }
  const rows: RowDecomposition = classification
  if (rows.rows.length !== 1) {
    throw new Error(
      `formed-frame-row-unmeasured: "${pattern.footprint}" carries a formed-to-grid ` +
        `accommodation and decomposes into ${rows.rows.length} rows along ${rows.axis}, and the ` +
        "forming anchor recorded in lib/kicad/pin-pattern.ts is a claim about ONE row.\n" +
        "WHAT IS MISSING: nothing records whether a multi-row package's rows are bent alike, so " +
        "the body's offset from one row need not be its offset from another and there is no " +
        "single number to return.\nWHY IT IS NOT ASSUMED: the offset decides which holes the " +
        "part covers, so assuming the rows agree would be this module authoring the geometry it " +
        "is asked to report. All three recorded formed footprints are single-row.\nWHERE TO FIX " +
        "IT: record the anchor per row on the GridAccommodation in lib/kicad/pin-pattern-model.ts, " +
        "with the file pairs or bench observation it comes from, and add a case to " +
        "tests/kicad/formed-frame.test.ts over a footprint that is in this shape.",
    )
  }
  const names = rows.rows[0]
  if (names === undefined) throw new Error("unreachable: a one-row decomposition has a row 0")
  const byName = new Map(pattern.pads.map((pad) => [pad.pad, pad]))
  const coords = names
    .map((name) => {
      const pad = byName.get(name)
      if (pad === undefined) throw new Error("unreachable: a row names a pad not in the pattern")
      return along(rows.axis)(pad)
    })
    .sort((a, b) => a - b)
  for (let index = 2; index < coords.length; index += 1) {
    const a = coords[index - 2]
    const b = coords[index - 1]
    const c = coords[index]
    if (a === undefined || b === undefined || c === undefined) {
      throw new Error("unreachable: coords was indexed inside its own length")
    }
    if (Math.abs((b - a) - (c - b)) > PITCH_TOLERANCE_MM) {
      throw new Error(
        `formed-frame-row-unmeasured: "${pattern.footprint}" carries a formed-to-grid ` +
          `accommodation with one prepared pitch of ${GRID_MM}mm steps, but its moulded ` +
          `along-${rows.axis} pitches are not all equal (${JSON.stringify(coords)}mm).\n` +
          "WHAT IS MISSING: forming an unevenly-moulded row to a single pitch moves every lead " +
          "by a different distance, so holding the row's midpoint or either end are no longer " +
          "the only three bends - each interior lead becomes a candidate too, and nothing " +
          "records which is performed.\nWHY IT IS NOT ASSUMED: the bend decides which holes the " +
          "part covers. All three recorded formed footprints are evenly moulded.\nWHERE TO FIX " +
          "IT: lib/kicad/pin-pattern.ts, with a test beside it in " +
          "tests/kicad/formed-frame.test.ts.",
      )
    }
  }
  return { axis: rows.axis, coords }
}

/**
 * The body's along-row shift, from the recorded anchor and nothing else.
 *
 * THE ARITHMETIC, STATED SO IT CAN BE DISAGREED WITH. Write the moulded
 * along-row coordinates `m_0 < ... < m_n` and the formed ones `f_i = i * P`,
 * where `P` is `preparedPitchSteps` whole grid steps. Each anchor names one
 * point that does not move relative to the body, so the body's shift is that
 * point's formed coordinate minus its moulded one:
 *
 *   lead-row-midpoint   (f_0 + f_n)/2 - (m_0 + m_n)/2
 *   first-lead          f_0 - m_0
 *   last-lead           f_n - m_n
 *
 * It is stated over the PADS and not over the body's own centre, although the
 * two coincide for all three recorded footprints - measured: each one's `F.Fab`
 * box centre equals its lead row's midpoint. The pads are what the bend acts
 * on, so a body drawn off-centre over its own moulded leads would still be
 * shifted correctly; a rule written over the body's centre would silently
 * re-centre it.
 */
export function formedFrameOf(pattern: PinPattern): FormedFrame {
  const accommodation = pattern.accommodation
  if (accommodation.kind === "as-moulded") {
    const classification = pattern.classification
    return { axis: classification.kind === "rows" ? classification.axis : null, shiftMm: 0 }
  }
  const { axis, coords } = formedRow(pattern)
  const last = coords.length - 1
  const mouldedFirst = coords[0]
  const mouldedLast = coords[last]
  if (mouldedFirst === undefined || mouldedLast === undefined) {
    throw new Error(
      `formed-frame-row-unmeasured: "${pattern.footprint}" carries a formed-to-grid ` +
        "accommodation and its one row holds no pads, so there is no lead row to anchor the " +
        "body to.\nThis is not treated as a zero shift: a row with no pads is a malformed " +
        "pattern, and classifyPads in lib/kicad/pin-pattern-model.ts refuses an empty pad list " +
        "for the same reason - a vacuous answer looks exactly like a checked one.",
    )
  }
  const formedLast = last * accommodation.preparedPitchSteps * GRID_MM
  if (accommodation.anchor === "first-lead") return { axis, shiftMm: 0 - mouldedFirst }
  if (accommodation.anchor === "last-lead") return { axis, shiftMm: formedLast - mouldedLast }
  return { axis, shiftMm: (0 + formedLast) / 2 - (mouldedFirst + mouldedLast) / 2 }
}

function stepsOnGrid(valueMm: number, pattern: PinPattern, axis: string, pad: string): number {
  const resolved = nearestGridSteps(valueMm)
  if (resolved.errorMm > PITCH_TOLERANCE_MM) {
    throw new Error(
      `formed-frame-pad-off-grid: "${pattern.footprint}" pad "${pad}" sits at ` +
        `${valueMm.toFixed(3)}mm along ${axis}, which is ${resolved.errorMm.toFixed(3)}mm from ` +
        `${resolved.steps} whole ${GRID_MM}mm steps - past the ${PITCH_TOLERANCE_MM}mm ` +
        "tolerance, so that pad is not at a hole.\nThis is not rounded to the nearest hole " +
        "anyway: a lead seated in the wrong hole is a net joined to the wrong strip, and " +
        "admitPattern in lib/kicad/pin-pattern-model.ts admits a pattern only when its pads " +
        "land on holes. A pattern reaching here with an off-grid pad has a recorded " +
        "accommodation that does not cover this axis - record one in lib/kicad/pin-pattern.ts " +
        "or leave the footprint refused.",
    )
  }
  return resolved.steps
}

/**
 * Each pad's hole, in grid steps along the footprint's own axes - the MOULDED
 * positions for an `as-moulded` pattern and the FORMED ones for a formed one.
 *
 * A FORMED PATTERN'S ALONG-ROW HOLES ARE COUNTED OFF, NOT MEASURED. The pads in
 * the file are at the moulded pitch and two of TO-92_Inline's three are half a
 * step off the grid, so reading them through `stepsOnGrid` would refuse the very
 * footprints the accommodation exists to admit. The nth pad along the row is at
 * `n * preparedPitchSteps` steps, by the definition of the prepared pitch. The
 * ACROSS-row coordinate is read through `stepsOnGrid` as before: forming moves a
 * lead along its own row and never across the strips, which is the asymmetry
 * `classifyPads` is built on.
 *
 * The holes are relative to the FIRST pad along the row, which is where the
 * shift `formedFrameOf` returns is measured from too, so the two can be unioned.
 */
export function padHolesFor(pattern: PinPattern): readonly PadHole[] {
  const classification = pattern.classification
  if (classification.kind !== "rows") {
    throw new Error(
      `formed-frame-no-rows: "${pattern.footprint}" does not decompose into rows parallel ` +
        `to the strips (${classification.reason}), so its pads do not sit in holes and there is ` +
        "no pad-to-hole map to build.\nThis is not approximated to the nearest holes: " +
        "admitPattern in lib/kicad/pin-pattern-model.ts refuses such a pattern outright, and " +
        "holes for it would be the geometry of a part that is never mounted.",
    )
  }
  if (pattern.accommodation.kind === "as-moulded") {
    return pattern.pads.map((pad) => ({
      pad: pad.pad,
      xSteps: stepsOnGrid(pad.xMm, pattern, "x", pad.pad),
      ySteps: stepsOnGrid(pad.yMm, pattern, "y", pad.pad),
    }))
  }
  const { axis, coords } = formedRow(pattern)
  const pitch = pattern.accommodation.preparedPitchSteps
  const first = coords[0]
  if (first === undefined) {
    throw new Error(
      `formed-frame-row-unmeasured: "${pattern.footprint}" carries a formed-to-grid ` +
        "accommodation and its one row holds no pads, so no pad has a hole.\nThis is not " +
        "returned as an empty list: an empty pad-to-hole map reads to every caller as a part " +
        "that occupies nothing, which is a hard constraint passing because nothing was checked.",
    )
  }
  return pattern.pads.map((pad) => {
    const alongMm = axis === "x" ? pad.xMm : pad.yMm
    const acrossMm = axis === "x" ? pad.yMm : pad.xMm
    // The pad's index ALONG the row, taken from the sorted coordinates, so two
    // pads at one position would land on one hole rather than on two.
    const index = coords.findIndex((coord) => Math.abs(coord - alongMm) <= PITCH_TOLERANCE_MM)
    if (index === -1) {
      throw new Error(
        `formed-frame-row-unmeasured: "${pattern.footprint}" pad "${pad.pad}" sits at ` +
          `${alongMm}mm along ${axis}, which is not one of the row's own positions ` +
          `${JSON.stringify(coords)}mm.\nThis cannot happen for a single-row pattern whose pads ` +
          "all come from that row, so it means the classification in lib/kicad/pin-pattern.ts " +
          "and the pads beside it disagree - and a pad placed on a guessed hole is a net joined " +
          "to the wrong strip.",
      )
    }
    const alongSteps = index * pitch
    const acrossSteps = stepsOnGrid(acrossMm, pattern, axis === "x" ? "y" : "x", pad.pad)
    return {
      pad: pad.pad,
      xSteps: axis === "x" ? alongSteps : acrossSteps,
      ySteps: axis === "x" ? acrossSteps : alongSteps,
    }
  })
}
