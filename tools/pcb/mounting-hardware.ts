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
import { child, parseSexpr, type SNode } from "../../lib/kicad/sexpr.ts"
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
 * APPLIED TO `circuits/pt2399-core/pt2399-core.kicad_pcb`: the four holes are on
 * the board, at (14, 14), (156, 14), (156, 106) and (14, 106) on its
 * 150 x 100 mm outline, written by `./place-mounting-holes.ts` and asserted
 * against this function by `tests/pcb/settled-mounting-holes.test.ts`.
 *
 * **THIS DOCSTRING SAID THE OPPOSITE UNTIL THE REVIEW CAUGHT IT** - that the
 * geometry was on hold and *"a position written now would be a coordinate
 * derived from a superseded placement"*. That was true when it was written and
 * false from the commit that settled the geometry onwards, and it is the
 * project's own "a stale cause is worse than a stale count" failure in the
 * authoritative place: an agent reading this function to find out whether the
 * board has mounting holes got the wrong answer. Recorded rather than quietly
 * replaced, because what makes the next one findable is knowing that a
 * docstring about a HOLD is the kind that rots the moment the hold lifts.
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

/** A mounting hole found ON a board: its reference and where its origin sits. */
export interface PlacedMountingHole {
  readonly ref: string
  readonly x: number
  readonly y: number
}

/**
 * Whether a footprint IS a mounting hole: it has pads, and EVERY one of them is
 * a copper-less drilled hole.
 *
 * THE SAME TEST THE ROUTING ENGINE USES, and deliberately so: its
 * `placement/part_class.py` calls an npth-only pad set *"the strongest rule"*
 * for classifying a mounting hole, ahead of matching the footprint's name. A
 * name test here would miss a hole fitted from another library and would match
 * a part merely called `MountingHole_something`.
 *
 * **`every` AND NOT `some`, AND THIS FUNCTION EXISTS SO THAT ONE PLACE DECIDES
 * IT.** `./place-mounting-holes.ts` removes the holes before rewriting them, and
 * its removal predicate used to be its own regex - `/\(pad\s+""\s+np_thru_hole/`
 * over the form's text, which is `some` and not `every`. That matched any
 * footprint carrying ONE mechanical hole beside its electrical pads: a vertical
 * pot with an anti-rotation pin, an audio jack, a panel switch. **A real part
 * left the board with no error and no report line**, and the tool's own
 * read-back check could not see it, because a part that was never a hole does
 * not change "wrote 4, found 4". It was latent on `pt2399-core` only because all
 * four of its NPTH pads happen to BE the mounting holes.
 *
 * `tests/pcb/mounting-hole-placement.test.ts` sweeps every mixed-pad footprint
 * in the installed libraries - 2215 of them, measured - and asserts that not one
 * reads as a hole. The lesson is the shape and not the regex: **a tool whose
 * DELETE test is wider than its FIND test deletes things it cannot find.**
 */
export function isMountingHoleFootprint(footprint: SNode): boolean {
  const pads = footprint.nodes.filter((n) => n.name === "pad")
  if (pads.length === 0) return false
  return pads.every((pad) => pad.atoms[1] === "np_thru_hole")
}

/** The reference designators this repository gives a mounting hole it placed. */
const OUR_REFERENCE = /^MH\d+$/

/**
 * Whether a footprint IS ONE OF THIS TOOL'S OWN HOLES - by IDENTITY, not by
 * shape.
 *
 * **SHAPE IS THE RIGHT TEST FOR "SHOULD I COUNT THIS" AND THE WRONG TEST FOR
 * "MAY I DELETE THIS", and that distinction is the whole reason this function
 * exists beside `isMountingHoleFootprint`.** The first fix round made the
 * removal test identical to the detection test, which closed the DRIFT between
 * them and left the WIDTH: all-NPTH is true of 87 footprints in the installed
 * libraries, and **49 of them are not mounting holes at all** -
 * `Heatsink:Heatsink_125x35x50mm_3xFixationM3`,
 * `MountingEquipment:DINRailAdapter_3xM3_PhoenixContact_1201578`, 17
 * `OptoDevice:Lightpipe_*`, 27 `Panelization:*` break lines and mouse bites and
 * 2 `Relay_THT:*`. Re-measured for this comment rather than copied: 87 all-NPTH
 * in total, 38 named `MountingHole*`, 49 not, and
 * `tests/pcb/mounting-hole-placement.test.ts` re-derives the breakdown on every
 * run so these figures are checkable rather than remembered - an earlier draft
 * said "eighteen lightpipes" in three places, repeated from a review without
 * remeasuring.
 * This task's reviewer placed three on a board, ran the tool, and watched a
 * heatsink, a lightpipe and a DIN-rail adapter leave it with
 * `removedFootprints 4`, nothing in the output naming them, the read-back
 * self-check reporting exactly the four holes it expected, and
 * `assertStillParses` passing - **the same three reasons the first version was
 * invisible.**
 *
 * So identity: either the footprint came from this project's own library, or it
 * is all-NPTH AND carries a reference this tool hands out. A heatsink satisfies
 * neither and is left alone.
 *
 * **WHY THE `MH<n>` ARM IS NEEDED and is not just belt-and-braces.** A hole
 * this tool placed on an EARLIER run, at a corner the outline has since moved
 * away from, must still go - otherwise the board ends up with two MH1s. Its
 * library id identifies it, so that arm alone would cover the normal case; the
 * reference arm covers a hole fitted from another library and labelled by hand,
 * which is a thing a person does in pcbnew.
 *
 * **AND WHAT HAPPENS TO A HEATSINK NOW, said out loud because the answer is not
 * "nothing":** it stays on the board, and `derivedHardware` no longer mistakes
 * it for a stray hole either, so it is graded as the ordinary part it is - which
 * means the keepout rule requires it to stay out of the washer envelope, which
 * is correct. The engine's own grader would still CLASSIFY it as a mount_hole by
 * `part_class.py`'s all-NPTH rule, and that is the engine's business and
 * defensible for grading; it is not a licence to delete.
 */
export function isOurMountingHole(footprint: SNode): boolean {
  const library = footprint.atoms[0] ?? ""
  if (library === `${PROJECT_LIBRARY}:${MOUNTING_FOOTPRINT}`) return true
  const reference =
    footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? ""
  return OUR_REFERENCE.test(reference) && isMountingHoleFootprint(footprint)
}

/**
 * Every one of THIS TOOL'S holes on the board, by `isOurMountingHole`.
 *
 * **IT WAS `isMountingHoleFootprint` - the SHAPE test - AND EVERY CALLER WANTED
 * IDENTITY.** The deletion arm of `./place-mounting-holes.ts` wanted "a hole I
 * put here"; its read-back self-check wanted "the holes I just wrote";
 * `derivedHardware`'s keepout `allow` list and its stray-hole refusal wanted
 * "the hardware this rule governs". Shape answered a different question for all
 * four, and on a board carrying a heatsink it answered it wrongly.
 */
export function placedMountingHoles(boardText: string, where: string): readonly PlacedMountingHole[] {
  const root = parseSexpr(boardText)
  const out: PlacedMountingHole[] = []
  for (const footprint of root.nodes.filter((n) => n.name === "footprint")) {
    if (!isOurMountingHole(footprint)) continue
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
