import { REBUILD_PINNED_FORK, type Part, type Pin } from "./dump.ts"
import { INK, PAPER, PITCH, boxAround, circle, fmt, polygon, type Box, type Point } from "./svg.ts"

/**
 * Part outlines by VeroRoute part type, each at the centroid of the part's
 * actual pin holes (from the dump's PIN lines, never from SPAN). Every type
 * found on a board must be mapped here explicitly: an unmapped type refuses
 * rather than being drawn as some generic shape.
 */

const PIN1_MARK = 7

/** An electrolytic's VeroRoute type: CAP_ELECTRO_<diameter in mils>. */
const ELECTROLYTIC_TYPE = /^CAP_ELECTRO_(\d+)$/

/**
 * The electrolytic polarity rule, in one place for the images and the
 * checklist: a CAP_ELECTRO_<n> part's pin 1 is its + lead.
 */
export const ELECTROLYTIC_PLUS_PIN = "1"
const ELECTROLYTIC_MINUS_PIN = "2"

export function isElectrolytic(type: string): boolean {
  return ELECTROLYTIC_TYPE.test(type)
}

export interface PlacedPin {
  readonly pin: Pin
  readonly at: Point
}

/** A drawn body: its outline, where a label could go on it, and what a label there must avoid. */
export interface Body {
  readonly outline: string
  readonly extent: Box
  readonly centre: Point
  /** Where a label may sit on the body; undefined when it never fits. */
  readonly labelArea: Box | undefined
  /** Marks drawn over the body (the pin 1 square). */
  readonly marks: readonly string[]
  /**
   * A polarised part's + lead: its hole, and the direction pointing away
   * from the body along that lead. The + mark is placed beside that hole by
   * `render-parts.ts`, where it can see what else is drawn nearby.
   */
  readonly polarity: { readonly hole: Point; readonly away: Point } | undefined
}

function centroid(points: readonly Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function pinNamed(part: Part, pins: readonly PlacedPin[], name: string): PlacedPin {
  const found = pins.find((p) => p.pin.pin === name)
  if (found === undefined) {
    throw new Error(
      `part ${part.ref} (${part.type}) has no pin ${name} in the dump; its pins are ` +
        `${pins.map((p) => p.pin.pin).join(", ")}. Its drawing needs pin ${name} to orient the body: ` +
        "give the part a footprint whose pins are numbered from 1 in VeroRoute, or if the type's numbering " +
        "really differs, teach its shape in tools/guide/part-shapes.ts that numbering.",
    )
  }
  return found
}

function expectPinCount(part: Part, pins: readonly PlacedPin[], count: number): void {
  if (pins.length !== count) {
    throw new Error(
      `part ${part.ref} (${part.type}) should have ${count} pins but the dump places ${pins.length}. ` +
        "Fix the part's footprint in the .vrt so it matches its type, or, if this type legitimately has " +
        "that many pins, give it its own shape in tools/guide/part-shapes.ts.",
    )
  }
}

function unit(from: Point, to: Point, part: Part): Point {
  const len = Math.hypot(to.x - from.x, to.y - from.y)
  if (len === 0) {
    throw new Error(
      `part ${part.ref} (${part.type}) has two pins on the same hole, so the dump's PIN lines are inconsistent. ` +
        `First ${REBUILD_PINNED_FORK}; if it persists, the fork's PIN reporting has a bug to fix there.`,
    )
  }
  return { x: (to.x - from.x) / len, y: (to.y - from.y) / len }
}

export function pin1Square(at: Point): string {
  const h = PIN1_MARK / 2
  return (
    `<rect class="pin1" x="${fmt(at.x - h)}" y="${fmt(at.y - h)}" width="${PIN1_MARK}" height="${PIN1_MARK}" ` +
    `fill="none" stroke="${INK}" stroke-width="1.2"/>`
  )
}

/**
 * A standing (upright) resistor, its pins one hole apart: the usual
 * stripboard mark, a circle over the hole its body stands on (pin 1 here),
 * with the folded-back lead running to the other hole. Deliberately round,
 * so it can never be read as a checkbox.
 */
function standingResistorBody(a: Point): Body {
  const r = PITCH * 0.42
  return {
    outline: circle(a, r, { fill: PAPER, stroke: INK, width: 1.6, cls: "part-body" }),
    extent: boxAround([a], r),
    centre: a,
    labelArea: undefined,
    marks: [],
    polarity: undefined,
  }
}

/**
 * An axial resistor: a rectangle between its pins, shorter than the pin gap
 * so the leads show. Pins one hole apart mean it stands upright; see
 * `standingResistorBody`.
 */
function resistorBody(part: Part, pins: readonly PlacedPin[]): Body {
  expectPinCount(part, pins, 2)
  const a = pinNamed(part, pins, "1").at
  const b = pinNamed(part, pins, "2").at
  const c = centroid([a, b])
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const u = unit(a, b, part)
  if (dist < PITCH * 1.5) {
    return standingResistorBody(a)
  }
  const v = { x: -u.y, y: u.x }
  const halfL = Math.min(Math.max(dist - PITCH * 0.9, PITCH * 1.1), PITCH * 3.2) / 2
  const halfW = PITCH * 0.28
  const corner = (sl: number, sw: number): Point => ({ x: c.x + u.x * sl + v.x * sw, y: c.y + u.y * sl + v.y * sw })
  const corners = [corner(-halfL, -halfW), corner(halfL, -halfW), corner(halfL, halfW), corner(-halfL, halfW)]
  const horizontal = Math.abs(u.x) > 0.99
  return {
    outline: polygon(corners, { width: 1.4, cls: "part-body" }),
    extent: boxAround(corners, 0),
    centre: c,
    labelArea: horizontal ? { minX: c.x - halfL + 1, maxX: c.x + halfL - 1, minY: c.y - halfW, maxY: c.y + halfW } : undefined,
    marks: [],
    polarity: undefined,
  }
}

/**
 * An electrolytic: a circle of its type's diameter (CAP_ELECTRO_300 is 300
 * mil), with pin 1 as its + lead. The + is marked at pin 1's hole rather
 * than on the body, so it shows where the + lead goes however far that lead
 * is stretched.
 */
function electrolyticBody(part: Part, pins: readonly PlacedPin[], diameterMils: number): Body {
  expectPinCount(part, pins, 2)
  const plus = pinNamed(part, pins, ELECTROLYTIC_PLUS_PIN).at
  const minus = pinNamed(part, pins, ELECTROLYTIC_MINUS_PIN).at
  const c = centroid([plus, minus])
  const r = (diameterMils / 100) * (PITCH / 2)
  const inner = r * 0.72
  return {
    outline: circle(c, r, { fill: PAPER, stroke: INK, width: 1.4, cls: "part-body" }),
    extent: boxAround([c], r),
    centre: c,
    labelArea: { minX: c.x - inner, maxX: c.x + inner, minY: c.y - inner, maxY: c.y + inner },
    marks: [],
    polarity: { hole: plus, away: unit(c, plus, part) },
  }
}

/**
 * A TO-92 seen from above: a D whose flat face lies along the pin row. The
 * flat faces the side from which pin 1 is on the left (the usual TO-92
 * numbering, as on the 2N3904's datasheet). Pin 1 is also marked.
 */
function to92Body(part: Part, pins: readonly PlacedPin[]): Body {
  expectPinCount(part, pins, 3)
  const p1 = pinNamed(part, pins, "1").at
  const p3 = pinNamed(part, pins, "3").at
  const c = centroid(pins.map((p) => p.at))
  const d = unit(p1, p3, part)
  const n = { x: -d.y, y: d.x }
  // About 2 pitches (0.2") across, a TO-92's real width, with the outer
  // pins just inside the flat's ends.
  const R = PITCH * 1.1
  const base = { x: c.x + n.x * PITCH * 0.25, y: c.y + n.y * PITCH * 0.25 }
  const from = { x: base.x + d.x * R, y: base.y + d.y * R }
  const to = { x: base.x - d.x * R, y: base.y - d.y * R }
  const apex = { x: base.x - n.x * R, y: base.y - n.y * R }
  const path =
    `<path class="part-body" d="M ${fmt(from.x)} ${fmt(from.y)} A ${fmt(R)} ${fmt(R)} 0 0 0 ${fmt(to.x)} ${fmt(to.y)} Z" ` +
    `fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>`
  const bulge = { x: base.x - n.x * R * 0.55, y: base.y - n.y * R * 0.55 }
  const flatAcross = Math.abs(d.x) > 0.99
  const corners = [from, to, { x: apex.x + d.x * R, y: apex.y + d.y * R }, { x: apex.x - d.x * R, y: apex.y - d.y * R }]
  return {
    outline: path,
    extent: boxAround(corners, 0),
    centre: c,
    labelArea: flatAcross ? { minX: bulge.x - R * 0.8, maxX: bulge.x + R * 0.8, minY: bulge.y - 5, maxY: bulge.y + 5 } : undefined,
    marks: [pin1Square(p1)],
    polarity: undefined,
  }
}

/** A trim-pot or pin header: a box around its pins, pin 1 marked. */
function boxBody(part: Part, pins: readonly PlacedPin[]): Body {
  const p1 = pinNamed(part, pins, "1").at
  const extent = boxAround(
    pins.map((p) => p.at),
    PITCH * 0.45,
  )
  return {
    outline:
      `<rect class="part-body" x="${fmt(extent.minX)}" y="${fmt(extent.minY)}" width="${fmt(extent.maxX - extent.minX)}" ` +
      `height="${fmt(extent.maxY - extent.minY)}" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>`,
    extent,
    centre: { x: (extent.minX + extent.maxX) / 2, y: (extent.minY + extent.maxY) / 2 },
    labelArea: extent,
    marks: [pin1Square(p1)],
    polarity: undefined,
  }
}

/** The body for a part of one of the VeroRoute types seen on real boards; any other type refuses. */
export function bodyFor(part: Part, pins: readonly PlacedPin[]): Body {
  if (/^RESISTOR\d*$/.test(part.type)) {
    return resistorBody(part, pins)
  }
  const electrolytic = ELECTROLYTIC_TYPE.exec(part.type)
  if (electrolytic !== null) {
    return electrolyticBody(part, pins, Number(electrolytic[1]))
  }
  if (part.type === "TO92") {
    return to92Body(part, pins)
  }
  const sip = /^SIP(\d+)$/.exec(part.type)
  if (sip !== null) {
    expectPinCount(part, pins, Number(sip[1]))
    return boxBody(part, pins)
  }
  if (part.type === "TRIM_FLAT") {
    expectPinCount(part, pins, 3)
    return boxBody(part, pins)
  }
  throw new Error(
    `no drawing for VeroRoute part type "${part.type}" (part ${part.ref}); ` +
      "add a shape for that type to tools/guide/part-shapes.ts",
  )
}
