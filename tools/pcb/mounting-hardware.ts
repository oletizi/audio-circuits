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
import { child, parseSexpr } from "../../lib/kicad/sexpr.ts"
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

/** A mounting hole found ON a board: its reference and where its origin sits. */
export interface PlacedMountingHole {
  readonly ref: string
  readonly x: number
  readonly y: number
}

/**
 * Every footprint on the board whose pads are ALL copper-less drilled holes.
 *
 * THE SAME TEST THE ROUTING ENGINE USES, and deliberately so: its
 * `placement/part_class.py` calls an npth-only pad set *"the strongest rule"*
 * for classifying a mounting hole, ahead of matching the footprint's name. A
 * name test here would miss a hole fitted from another library and would match
 * a part merely called `MountingHole_something`.
 */
export function placedMountingHoles(boardText: string, where: string): readonly PlacedMountingHole[] {
  const root = parseSexpr(boardText)
  const out: PlacedMountingHole[] = []
  for (const footprint of root.nodes.filter((n) => n.name === "footprint")) {
    const pads = footprint.nodes.filter((n) => n.name === "pad")
    if (pads.length === 0) continue
    if (!pads.every((pad) => pad.atoms[1] === "np_thru_hole")) continue
    const ref =
      footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? ""
    if (ref === "") throw new Error(`${where}: a non-plated footprint carries no Reference property`)
    const at = child(footprint, "at")
    if (at === undefined) throw new Error(`${where}: mounting hole ${ref} has no (at ...)`)
    out.push({ ref, x: Number(at.atoms[0]), y: Number(at.atoms[1]) })
  }
  return out
}

/** One keepout entry in the shape `placement/floorplan.py` parses. */
export interface DerivedKeepout {
  readonly name: string
  /** `[x, y, radius]`, which is the engine's `circle` form. */
  readonly circle: readonly [number, number, number]
  readonly sides: readonly string[]
  readonly allow: readonly string[]
  readonly note: string
}

export interface DerivedHardware {
  readonly keepouts: readonly DerivedKeepout[]
  /** References to add to the intent's `must_lock` - only holes that EXIST on the board. */
  readonly mustLock: readonly string[]
  readonly holes: readonly MountingHole[]
}

/** How far a placed hole may sit from its derived centre before it is a different hole. */
export const CENTRE_TOLERANCE_MM = 0.001

/**
 * The grader-side half of the mounting hardware: four keepout circles derived
 * from the OUTLINE and the approved rule, plus the `must_lock` references of
 * the holes actually on the board.
 *
 * **THE CIRCLES COME FROM THE OUTLINE, NOT FROM WHERE THE HOLES ARE.** That
 * direction is the whole point. A keepout derived from a placed hole's position
 * would follow the artifact: a hole placed in the wrong spot would get a
 * keep-out around its wrong position and the grader would report a pass. So the
 * circles are computed from the rule, and a hole that is NOT at a derived
 * centre is a REFUSAL naming both positions.
 *
 * **AND EACH CIRCLE ALLOWS ITS OWN HOLE.** `rule_keepout` iterates every part
 * on the board, mounting holes included, so a circle centred on a hole flags
 * that hole unless its reference is in `allow`. That is the same
 * rejects-its-own-mounting-hole defect the Rule Area had, in grader form.
 */
export function derivedHardware(
  boardText: string,
  boardWhere: string,
  outline: Bounds,
  rule: MountingHoleRule,
): DerivedHardware {
  const holes = mountingHoles(outline, rule)
  const placed = placedMountingHoles(boardText, boardWhere)
  const radius = rule.envelopeDiameterMm / 2

  const keepouts: DerivedKeepout[] = []
  const claimed = new Set<string>()
  for (const hole of holes) {
    const at = placed.filter(
      (p) => Math.hypot(p.x - hole.x, p.y - hole.y) <= CENTRE_TOLERANCE_MM,
    )
    for (const match of at) claimed.add(match.ref)
    keepouts.push({
      name: `mounting_hole_${hole.corner}`,
      circle: [hole.x, hole.y, radius],
      sides: ["F", "B"],
      allow: at.map((p) => p.ref),
      note:
        `The ${rule.envelopeDiameterMm} mm washer envelope at the ${hole.corner} corner, derived ` +
        `from the board outline and placement-rules.json anchors.mounting_holes ` +
        `(${rule.centreInsetMm} mm inset from both edges). ` +
        (at.length === 0
          ? "No mounting hole is placed here yet, so `allow` is empty."
          : `\`allow\` names ${at.map((p) => p.ref).join(", ")} because rule_keepout iterates every ` +
            "part on the board and a circle centred on a hole would otherwise flag that hole."),
    })
  }

  const stray = placed.filter((p) => !claimed.has(p.ref))
  if (stray.length > 0) {
    throw new Error(
      `${boardWhere} carries ${stray.length} non-plated mounting hole(s) that are NOT at a centre ` +
        "this rule derives: " +
        `${stray.map((p) => `${p.ref} at (${p.x}, ${p.y})`).join(", ")}. The derived centres are ` +
        `${holes.map((h) => `${h.corner} (${h.x}, ${h.y})`).join(", ")}. ` +
        "This refuses rather than deriving a keep-out around where the hole happens to be: a " +
        "criterion computed from the artifact it grades always passes, and that inversion is the " +
        "defect this whole construct exists to prevent. Move the hole, or change the approved " +
        "rule - which is the owner's to change, not a tool's.",
    )
  }

  return { keepouts, mustLock: placed.map((p) => p.ref).sort(), holes }
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
