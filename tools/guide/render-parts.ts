import { noPinLinesMessage, type BoardDump, type Part, type Pin } from "./dump.ts"
import { bodyFor, type Body, type PlacedPin } from "./part-shapes.ts"
import { TAG_CLEARANCE, everything, leastCovered, type Occupied } from "./placement.ts"
import {
  CHECKBOX_SIZE,
  INK,
  PITCH,
  addText,
  boxAround,
  checkbox,
  circle,
  grow,
  line,
  textWidth,
  type Box,
  type Canvas,
  type Frame,
  type Point,
  type TextStyle,
} from "./svg.ts"

/**
 * Parts on the component-side view: an outline by VeroRoute part type (see
 * `part-shapes.ts`), a lead line to every pin's actual hole, the part's
 * label, and a checkbox.
 *
 * Lead positions come ONLY from the dump's PIN lines. A part's SPAN is its
 * footprint's own width (an electrolytic's body, or 1 for a vertically
 * mounted two-pin part), never where its leads go.
 *
 * Every lead runs from the body's centre to its hole and is drawn beneath
 * the white-filled body, so what shows is exactly the lead from the body's
 * edge to the hole - however far a stretched lead reaches.
 */

const LABEL_SIZE = 8
const LABEL_STYLE: TextStyle = { size: LABEL_SIZE, anchor: "start", bold: true, halo: true, cls: "part-label" }
/** Between a part's checkbox and its label. */
const TAG_GAP = 2
const PIN_DOT_RADIUS = 2.4

function pinsOf(dump: BoardDump, part: Part): readonly Pin[] {
  const pins = dump.pins[part.ref]
  if (pins === undefined || pins.length === 0) {
    throw new Error(noPinLinesMessage(part))
  }
  return pins
}

export interface PlacedPart {
  readonly part: Part
  readonly label: string
  readonly pins: readonly PlacedPin[]
  readonly body: Body
}

function labelOf(labels: ReadonlyMap<string, string>, part: Part): string {
  const label = labels.get(part.ref)
  if (label === undefined) {
    throw new Error(
      `no label given for placed part ${part.ref} (${part.type} ${part.value}); ` +
        "the caller's label map must name every placed part",
    )
  }
  return label
}

/**
 * Every placed part with its label, its pins' drawn positions and its body;
 * floating parts are not on the board. Refuses unless every placed part has
 * a label, PIN lines and a shape for its type. Both views call it, so the
 * copper view (which draws no parts) refuses the same boards the component
 * view does.
 */
export function placedParts(frame: Frame, dump: BoardDump, labels: ReadonlyMap<string, string>): readonly PlacedPart[] {
  return dump.parts
    .filter((part) => part.placement !== "floating")
    .map((part) => {
      const label = labelOf(labels, part)
      const pins = pinsOf(dump, part).map((pin) => ({ pin, at: frame.hole(pin.row, pin.col) }))
      return { part, label, pins, body: bodyFor(part, pins) }
    })
}

function inside(inner: Box, outer: Box): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY
}

function clearOf(box: Box, points: readonly Point[], margin: number): boolean {
  return points.every(
    (p) => p.x < box.minX - margin || p.x > box.maxX + margin || p.y < box.minY - margin || p.y > box.maxY + margin,
  )
}

/**
 * Where a tag of `width` x `height` (its left edge and vertical centre) may
 * go around a body, in order of preference: right, left, above, below, then
 * the corners of the right and left sides.
 */
function tagSpots(body: Body, width: number, height: number): readonly Point[] {
  const e = body.extent
  const c = body.centre
  const gap = 3
  const right = e.maxX + gap
  const left = e.minX - gap - width
  const upper = e.minY + height / 2
  const lower = e.maxY - height / 2
  const near: readonly Point[] = [
    { x: right, y: c.y },
    { x: left, y: c.y },
    { x: c.x - width / 2, y: e.minY - gap - height / 2 },
    { x: c.x - width / 2, y: e.maxY + gap + height / 2 },
    { x: right, y: upper },
    { x: right, y: lower },
    { x: left, y: upper },
    { x: left, y: lower },
  ]
  // Failing all of those, the same spots one gap further out on each side,
  // still close enough to read as this part's.
  const out = PITCH / 2
  const far: readonly Point[] = [
    { x: right, y: e.minY - gap - height / 2 },
    { x: right, y: e.maxY + gap + height / 2 },
    { x: left, y: e.minY - gap - height / 2 },
    { x: left, y: e.maxY + gap + height / 2 },
    { x: right + out, y: c.y },
    { x: left - out, y: c.y },
  ]
  return [...near, ...far]
}

function tagBox(at: Point, width: number, height: number): Box {
  return { minX: at.x, maxX: at.x + width, minY: at.y - height / 2, maxY: at.y + height / 2 }
}


/**
 * A part's tag - its checkbox with the label right after it, so the two are
 * never separated - on the body where the whole tag fits clear of pins and
 * marks, and otherwise beside the body wherever it covers least.
 */
function drawLabel(canvas: Canvas, placed: PlacedPart, occupied: Occupied): void {
  const { part, body, pins, label } = placed
  const width = CHECKBOX_SIZE + TAG_GAP + textWidth(label, LABEL_SIZE)
  const height = CHECKBOX_SIZE
  const area = body.labelArea
  let spot: Point | undefined
  if (area !== undefined) {
    // Centred on the body, else nudged up or down within it.
    const x = (area.minX + area.maxX) / 2 - width / 2
    const y = (area.minY + area.maxY) / 2
    const avoid = pins.map((p) => p.at)
    spot = [y, y - height, y + height]
      .map((cy) => ({ x, y: cy }))
      .find((p) => {
        const box = tagBox(p, width, height)
        return inside(box, area) && clearOf(box, avoid, PIN_DOT_RADIUS + 1) && occupied.marks.overlap(box) === 0
      })
  }
  if (spot === undefined) {
    spot = leastCovered(tagSpots(body, width, height), (p) => tagBox(p, width, height), everything(occupied))
  }
  canvas.add(checkbox({ x: spot.x, y: spot.y - CHECKBOX_SIZE / 2 }, `part:${part.ref}`), tagBox(spot, CHECKBOX_SIZE, height))
  addText(canvas, { x: spot.x + CHECKBOX_SIZE + TAG_GAP, y: spot.y }, label, LABEL_STYLE)
  occupied.marks.add(grow(tagBox(spot, width, height), TAG_CLEARANCE))
}

/**
 * Draws every placed part's leads, body and pin marks, recording where they
 * are in `occupied` so the cut numbers and part labels drawn after them can
 * keep clear.
 */
export function drawPartBodies(canvas: Canvas, placed: readonly PlacedPart[], occupied: Occupied): void {
  const { marks } = occupied
  for (const { part, pins, body } of placed) {
    for (const { pin, at } of pins) {
      const extent = boxAround([body.centre, at], 1)
      canvas.add(line(body.centre, at, { width: 1.4, cls: "lead", data: { ref: part.ref, pin: pin.pin } }), extent)
      occupied.leads.add(extent)
    }
  }
  for (const { body } of placed) {
    canvas.add(body.outline, body.extent)
    occupied.bodies.add(body.extent)
  }
  for (const { pins, body } of placed) {
    for (const { at } of pins) {
      canvas.add(circle(at, PIN_DOT_RADIUS, { fill: INK, cls: "pin" }), boxAround([at], PIN_DOT_RADIUS))
      marks.add(boxAround([at], PIN_DOT_RADIUS))
    }
    for (const mark of body.marks) {
      canvas.add(mark, body.extent)
    }
  }
  for (const { body } of placed) {
    if (body.polarity !== undefined) {
      drawPolarity(canvas, body.polarity, occupied)
    }
  }
}

const PLUS_SIZE = 10

/**
 * The + beside a polarised part's + hole: beyond the hole along the lead
 * by preference, else to either side of it, wherever it covers least.
 */
function drawPolarity(canvas: Canvas, polarity: NonNullable<Body["polarity"]>, occupied: Occupied): void {
  const { hole, away } = polarity
  const reach = PITCH * 0.5
  const side = { x: -away.y, y: away.x }
  const candidates: readonly Point[] = [
    { x: hole.x + away.x * reach, y: hole.y + away.y * reach },
    { x: hole.x + side.x * reach, y: hole.y + side.y * reach },
    { x: hole.x - side.x * reach, y: hole.y - side.y * reach },
    { x: hole.x - away.x * reach, y: hole.y - away.y * reach },
  ]
  const at = leastCovered(candidates, (p) => boxAround([p], PLUS_SIZE * 0.35), [occupied.leads, occupied.marks])
  addText(canvas, at, "+", { size: PLUS_SIZE, anchor: "middle", bold: true, halo: true, cls: "polarity" })
  occupied.marks.add(boxAround([at], PLUS_SIZE * 0.4))
}

/** Draws every placed part's tag (checkbox and label), clear of everything already recorded in `occupied`. */
export function drawPartLabels(canvas: Canvas, placed: readonly PlacedPart[], occupied: Occupied): void {
  for (const entry of placed) {
    drawLabel(canvas, entry, occupied)
  }
}
