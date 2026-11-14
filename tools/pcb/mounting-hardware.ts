/**
 * THE M3 MOUNTING HARDWARE AS A DERIVATION, not as four coordinates and a
 * remembered diameter.
 *
 * `circuits/pt2399-core/placement-rules.json` `anchors.mounting_holes` is the
 * APPROVED rule - four holes, a 3.2 mm non-plated drill, a 7.0 mm washer
 * envelope, a 4.0 mm centre inset - and it was approved as a rule precisely
 * because the outline it applies to was not settled when it was approved. Every
 * number here is READ from that file. Nothing in this module chooses one, and a
 * key it cannot find is a refusal rather than a default: a defaulted envelope
 * would be a keep-out diameter nobody approved, enforced by DRC, looking exactly
 * like one that was.
 *
 * TWO MECHANISMS AT ONE DIAMETER, which is what Task 8 Step 4 of
 * `docs/superpowers/plans/2026-11-12-agent-pcb-place-and-route-phase-1.md`
 * specifies and what review issue 34 asked for:
 *
 *  - **copper** under the washer: a Rule Area of the envelope diameter on
 *    `F.Cu` and `B.Cu` with `tracks`, `vias` and `copperpour` `not_allowed` and
 *    **`pads` and `footprints` left ALLOWED**. Caught by `items_not_allowed`.
 *  - a **part** overlapping the washer: `courtyards_overlap` against the
 *    project-local footprint whose courtyard IS the envelope.
 *
 * **THE `pads`/`footprints` FLAGS ARE THE LOAD-BEARING DETAIL AND THE REASON
 * THIS IS NOT ONE LINE OF CONFIGURATION.** A Rule Area that also forbids pads
 * and footprints rejects its own mounting hole - measured, `items_not_allowed`
 * on both the `NPTH pad of REF**` and the `Footprint REF**` - so the clean
 * control in `tests/pcb/mounting-hardware.test.ts` is not a formality. It is
 * the fixture that caught that defect.
 *
 * **A CIRCLE IS WRITTEN AS A POLYGON THAT CONTAINS IT, never one inscribed in
 * it.** A KiCad zone is a polygon, so the envelope has to be approximated, and
 * the direction of the error is a decision: an inscribed polygon would leave 32
 * slivers inside the washer where copper is permitted and the gate would read
 * clean. `POLYGON_SIDES` and the circumradius below are what make the written
 * region a superset of the circle.
 */
import fs from "node:fs"
import { footprintInstanceForm } from "./footprint-instance.ts"
import type { Bounds } from "./resolve-intent-zones.ts"

/** The project-local library that holds the washer-courtyard mounting hole. */
export const PROJECT_LIBRARY = "pt2399-core"
export const MOUNTING_FOOTPRINT = "MountingHole_3.2mm_M3_Washer7.0mm"

/**
 * Vertices in the polygon that stands in for the envelope circle. 32 puts the
 * circumscribing polygon's edge 0.017 mm outside a 3.5 mm radius at its
 * closest, which is below every fabrication tolerance in
 * `docs/standards/pcbway-fab-rules.md` and on the safe side of the circle.
 */
export const POLYGON_SIDES = 32

/** The approved rule, exactly as `placement-rules.json` states it. */
export interface MountingHoleRule {
  readonly count: number
  readonly holeDiameterMm: number
  readonly plated: boolean
  readonly envelopeDiameterMm: number
  readonly centreInsetMm: number
}

function record(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${where}: expected a JSON object`)
  }
  return value as Record<string, unknown>
}

function numberAt(root: Record<string, unknown>, where: string, key: string): number {
  const value = root[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `${where}: no finite "${key}". This is read from the approved rule and never defaulted - a ` +
        "defaulted envelope or inset is a keep-out nobody approved, enforced by DRC, and " +
        "indistinguishable from one that was.",
    )
  }
  return value
}

/** Reads `anchors.mounting_holes` out of a parsed `placement-rules.json`. */
export function mountingHoleRule(rules: unknown, where: string): MountingHoleRule {
  const anchors = record(record(rules, where)["anchors"], `${where}: anchors`)
  const holes = record(anchors["mounting_holes"], `${where}: anchors.mounting_holes`)
  const at = `${where}: anchors.mounting_holes`
  const plated = holes["plated"]
  if (typeof plated !== "boolean") {
    throw new Error(`${at}: no boolean "plated". A plated/non-plated guess changes what DRC measures.`)
  }
  const rule = {
    count: numberAt(holes, at, "count"),
    holeDiameterMm: numberAt(holes, at, "hole_diameter_mm"),
    plated,
    envelopeDiameterMm: numberAt(holes, at, "envelope_diameter_mm"),
    centreInsetMm: numberAt(holes, at, "centre_inset_mm"),
  }
  if (rule.count !== 4) {
    throw new Error(
      `${at}: count is ${rule.count}, and this module derives FOUR corner positions. A different ` +
        "count needs a different derivation (which corners? a mid-edge hole?), and that is the " +
        "owner's rule to state rather than this tool's to invent.",
    )
  }
  if (rule.envelopeDiameterMm <= rule.holeDiameterMm) {
    throw new Error(
      `${at}: the envelope (${rule.envelopeDiameterMm} mm) is not larger than the drill ` +
        `(${rule.holeDiameterMm} mm). The envelope models the WASHER; an envelope at or below the ` +
        "hole would make both DRC mechanisms vacuous while still appearing to run.",
    )
  }
  if (rule.centreInsetMm < rule.envelopeDiameterMm / 2) {
    throw new Error(
      `${at}: a centre inset of ${rule.centreInsetMm} mm puts the ${rule.envelopeDiameterMm} mm ` +
        `washer over the board edge (it needs at least ${rule.envelopeDiameterMm / 2} mm).`,
    )
  }
  return rule
}

/** One derived hole: which corner it is at, and where its centre sits. */
export interface MountingHole {
  /** `nw` / `ne` / `se` / `sw` in board coordinates, y increasing downward as KiCad's does. */
  readonly corner: "nw" | "ne" | "se" | "sw"
  readonly x: number
  readonly y: number
}

/**
 * The four hole centres for an outline: each inset from BOTH edges its corner is
 * formed by, which is what the approved rule says and is not the same as an
 * inset along one axis.
 *
 * NOT YET APPLIED TO `circuits/pt2399-core/pt2399-core.kicad_pcb`. The outline
 * these are computed from is Task 8's final geometry, and that geometry is on
 * hold: the owner added a hand-assembly clearance criterion on 2026-11-13
 * (*"remember that I have fingers, so I need enough room between parts to use my
 * fingers. I'm not a pick and place machine"*) which will change the placement
 * and therefore the extent the outline is derived from. A position written now
 * would be a coordinate derived from a superseded placement.
 */
export function mountingHoles(outline: Bounds, rule: MountingHoleRule): readonly MountingHole[] {
  const inset = rule.centreInsetMm
  const width = outline.x1 - outline.x0
  const height = outline.y1 - outline.y0
  if (width < 2 * inset + rule.envelopeDiameterMm || height < 2 * inset + rule.envelopeDiameterMm) {
    throw new Error(
      `an outline of ${width.toFixed(2)} x ${height.toFixed(2)} mm cannot hold four holes inset ` +
        `${inset} mm from each corner with a ${rule.envelopeDiameterMm} mm envelope: the two ` +
        "envelopes on a short side would overlap each other. This refuses rather than placing " +
        "them closer - the inset and the envelope are both approved numbers, and the thing that " +
        "has to give is the outline.",
    )
  }
  const round = (v: number): number => Math.round(v * 10000) / 10000
  return [
    { corner: "nw", x: round(outline.x0 + inset), y: round(outline.y0 + inset) },
    { corner: "ne", x: round(outline.x1 - inset), y: round(outline.y0 + inset) },
    { corner: "se", x: round(outline.x1 - inset), y: round(outline.y1 - inset) },
    { corner: "sw", x: round(outline.x0 + inset), y: round(outline.y1 - inset) },
  ]
}

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
