/**
 * WHAT GETS WRITTEN ONTO A BOARD FOR ONE MOUNTING HOLE: the Rule Area form, the
 * footprint instance, and where its label points.
 *
 * `./mounting-hardware.ts` is the other half - the approved RULE and the
 * derivation from it: how many holes, what diameter, where their centres fall,
 * which footprints on a board ARE holes, and what keepouts the grader gets.
 * Nothing here decides any of that; every number it writes arrives as an
 * argument or is read from the library file on disk.
 *
 * **THE SPLIT IS THE RESPONSIBILITY, not the line count.** Deciding where a hole
 * goes and emitting the s-expression that puts it there fail in different ways:
 * the first is wrong against the owner's rule, the second is wrong against
 * KiCad's format. Both of the controls this module carries are format-side and
 * both are measured rather than argued - `pads` and `footprints` left ALLOWED in
 * the Rule Area, and a polygon that CONTAINS the envelope circle rather than
 * being inscribed in it.
 */
import fs from "node:fs"
import { child, parseSexpr } from "../../lib/kicad/sexpr.ts"
import { footprintInstanceForm } from "./footprint-instance.ts"
import {
  MOUNTING_FOOTPRINT, POLYGON_SIDES, PROJECT_LIBRARY, type MountingHole,
} from "./mounting-hardware.ts"
import type { Bounds } from "./resolve-intent-zones.ts"

/**
 * Coordinates are written to 0.1 micrometre, and ROUNDING TO NEAREST PULLS A
 * VERTEX IN - measured at 45 nanometres on the worst edge of the 32-gon, which
 * is enough to make the written polygon a subset of the circle rather than a
 * superset and to invert the one guarantee this function offers. The circumradius
 * is therefore inflated by a whole rounding quantum first, which more than
 * covers the 0.0707 micrometre a vertex can move.
 */
const ROUNDING_GUARD_MM = 1e-4

/** The vertices of a regular polygon that CONTAINS the circle of `radius` at (cx, cy). */
export function containingPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number = POLYGON_SIDES,
): readonly (readonly [number, number])[] {
  if (sides < 3) throw new Error(`a polygon needs at least 3 sides, not ${sides}`)
  // Circumradius, so every point of the circle is inside the polygon rather
  // than the other way round. An inscribed polygon would leave slivers of
  // permitted copper inside the washer and the gate would report them clean.
  const circumradius = radius / Math.cos(Math.PI / sides) + ROUNDING_GUARD_MM
  const out: (readonly [number, number])[] = []
  for (let i = 0; i < sides; i += 1) {
    const angle = (2 * Math.PI * i) / sides
    out.push([
      Math.round((cx + circumradius * Math.cos(angle)) * 10000) / 10000,
      Math.round((cy + circumradius * Math.sin(angle)) * 10000) / 10000,
    ])
  }
  return out
}

export interface RuleAreaOptions {
  readonly cx: number
  readonly cy: number
  readonly envelopeDiameterMm: number
  readonly name: string
  readonly uuid: string
}

/**
 * The copper-only Rule Area form for one mounting hole.
 *
 * `pads` and `footprints` are `allowed` DELIBERATELY and the comment is in the
 * emitted file as well as here, because the obvious edit to this function - "a
 * keep-out should keep everything out" - is the measured defect: the area then
 * rejects the very mounting hole it surrounds.
 */
export function ruleAreaForm(opts: RuleAreaOptions): string {
  const pts = containingPolygon(opts.cx, opts.cy, opts.envelopeDiameterMm / 2)
  const n = (v: number): string => String(Number(v.toFixed(4)))
  return [
    "(zone",
    "\t\t(net 0)",
    '\t\t(net_name "")',
    '\t\t(layers "F.Cu" "B.Cu")',
    `\t\t(uuid "${opts.uuid}")`,
    `\t\t(name "${opts.name}")`,
    "\t\t(hatch edge 0.5)",
    "\t\t(connect_pads",
    "\t\t\t(clearance 0)",
    "\t\t)",
    "\t\t(min_thickness 0.25)",
    "\t\t(filled_areas_thickness no)",
    "\t\t(keepout",
    "\t\t\t(tracks not_allowed)",
    "\t\t\t(vias not_allowed)",
    "\t\t\t(pads allowed)",
    "\t\t\t(copperpour not_allowed)",
    "\t\t\t(footprints allowed)",
    "\t\t)",
    "\t\t(placement",
    "\t\t\t(enabled no)",
    '\t\t\t(sheetname "")',
    "\t\t)",
    "\t\t(polygon",
    "\t\t\t(pts",
    ...pts.map(([x, y]) => `\t\t\t\t(xy ${n(x)} ${n(y)})`),
    "\t\t\t)",
    "\t\t)",
    "\t)",
  ].join("\n")
}

/**
 * A board `(footprint ...)` instance of the project-local mounting hole, built
 * from the library file's own bytes by `./footprint-instance.ts`.
 *
 * The library and the name are not parameters: this function exists so that
 * every mounting hole on every board and in every fixture comes from ONE file,
 * whose courtyard is the approved envelope.
 */
export function mountingFootprintForm(
  libraryText: string,
  where: string,
  opts: {
    readonly reference: string
    readonly x: number
    readonly y: number
    readonly uuid: string
    readonly locked: boolean
    /** Move the Reference label to this y offset; see `inwardLabelOffsetY`. */
    readonly referenceOffsetY?: number
    /**
     * KiCad's "Not in schematic" attribute. MEASURED in
     * `tests/pcb/mounting-envelope-drc.test.ts` on KiCad 10.0.5: a mounting
     * hole without it draws one schematic-parity finding (`Extra footprint`)
     * and with it draws none, and `./drc-policy.ts` tolerates zero parity
     * findings at any severity. So a hole placed on the real board needs
     * `boardOnly: true`; the fixtures pass `false` because they have no
     * schematic to be compared against.
     */
    readonly boardOnly: boolean
  },
): string {
  return footprintInstanceForm(libraryText, where, {
    library: PROJECT_LIBRARY,
    name: MOUNTING_FOOTPRINT,
    ...opts,
  })
}

/**
 * The y offset of a footprint's `Reference` label, in the footprint's own frame.
 *
 * Needed because the stock mounting hole puts its label 4.15 mm ABOVE the
 * origin, and a hole inset 4.0 mm from the top edge therefore has its label
 * 0.15 mm off the board - measured, two `silk_edge_clearance` warnings,
 * `Reference field of MH1` and `of MH2`. Read from the file rather than written
 * down, because the whole point of deriving the footprint is that its numbers
 * live in one place.
 */
export function referenceLabelOffsetY(libraryText: string, where: string): number {
  const root = parseSexpr(libraryText)
  const property = root.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")
  if (property === undefined) throw new Error(`${where}: no (property "Reference" ...) form`)
  const at = child(property, "at")
  if (at === undefined) throw new Error(`${where}: the Reference property has no (at ...)`)
  const y = Number(at.atoms[1])
  if (!Number.isFinite(y)) throw new Error(`${where}: the Reference property's (at ...) y is not a number`)
  return y
}

/**
 * The Reference label's y offset turned TOWARD the board's interior - same
 * distance from the hole, opposite side when the library's side points off the
 * board.
 *
 * **WHAT THIS FIXES, measured on the settled board.** The stock label sits
 * 4.15 mm ABOVE the origin. A hole inset 4.0 mm from the top edge therefore has
 * its label 0.15 mm off the board, and `kicad-cli pcb drc` reports
 * `silk_edge_clearance` - *"Silkscreen clipped by board edge"*, `Reference field
 * of MH1` and `of MH2`. There is no library-level position that fixes it: the
 * courtyard is 3.5 mm in radius at a 4.0 mm inset, so only 0.5 mm of board
 * remains on the near side and which side is "near" depends on the corner.
 *
 * **AND WHY IT MOVES THE LABEL RATHER THAN ROTATING THE FOOTPRINT, which was
 * tried first and measured worse.** A mounting hole is radially symmetric, so
 * rotating it 180 degrees moves nothing but the text - an appealing fix. It
 * trades two warnings for two others: KiCad then reports
 * `lib_footprint_mismatch`, *"Footprint 'MountingHole_3.2mm_M3_Washer7.0mm'
 * does not match copy in library 'pt2399-core'"*, on exactly the two rotated
 * holes. Diffing the board forms showed the ROTATION to be their only
 * difference from the unrotated pair, and a 180-degree `CP_Radial_D5.0mm_P2.00mm`
 * on the same board draws no such warning - so the check is sensitive to
 * rotation for an all-circles footprint, plausibly because a circle's `end`
 * point is direction-bearing. Measured both ways: moving the label leaves ONE
 * warning on the whole board (`silk_overlap` between C12's own reference and its
 * own silkscreen, which the circuit placement produced and this does not touch);
 * rotating leaves three. A field position is also the thing KiCad expects to
 * differ from a library - the moved-label board draws no mismatch at all.
 */
export function inwardLabelOffsetY(hole: MountingHole, outline: Bounds, labelOffsetY: number): number {
  if (labelOffsetY === 0) return 0
  const inTopHalf = hole.y < (outline.y0 + outline.y1) / 2
  // Toward the middle: positive (downward, in KiCad's sense) for a hole in the
  // top half, negative for one in the bottom half.
  return inTopHalf ? Math.abs(labelOffsetY) : -Math.abs(labelOffsetY)
}

/** Reads the project-local library file, refusing a missing one rather than inlining a copy. */
export function readMountingFootprint(file: string): string {
  if (!fs.existsSync(file)) {
    throw new Error(
      `the project-local mounting-hole footprint is not at ${file}. It is not substituted with ` +
        "MountingHole:MountingHole_3.2mm_M3: that stock footprint's courtyard is 6.9 mm and " +
        "models the screw head, so courtyards_overlap would quietly enforce 6.9 mm instead of " +
        "the approved 7.0 mm washer envelope.",
    )
  }
  return fs.readFileSync(file, "utf8")
}
