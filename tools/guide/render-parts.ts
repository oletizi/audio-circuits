import { noPinLinesMessage, type BoardDump, type Part, type Pin } from "./dump.ts"
import type { PadTerminal } from "./pads.ts"
import { bodyFor, padBody, wireLinkBody, type Body, type PlacedPin } from "./part-shapes.ts"
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
 *
 * **A PART THAT RESOLVES TO 0 Ω IS DRAWN AS THE WIRE IT IS**, not as a resistor
 * with `0R` beside it: `wireLinkBody` (`./part-shapes.ts`) gives it the same
 * line a `WIRE` line gets, and its two leads - drawn from the body's centre as
 * every part's are - run along that line and so vanish under it. Which refs
 * those are comes from the caller (`placedParts`' `wireLinks`), because it is a
 * fact about the circuit and this module holds none.
 *
 * **LANDING PADS ARE DRAWN HERE TOO, AND THEY ARE NOT PARTS.** A pad is one hole
 * an off-board wire is soldered to, with no `PART` line, no type and no body
 * (`./pads.ts`), so it gets a ring rather than an outline and a designator. Its
 * checkbox is keyed by the identity of the terminal it brings off the board,
 * but what it PRINTS beside that checkbox is the caller's label, the same as a
 * part's is - see `drawPadLabels`, below. It shares the tag placement, because
 * a pad's checkbox and a part's checkbox must not be placed by two different
 * sets of rules on one sheet.
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
export function placedParts(
  frame: Frame,
  dump: BoardDump,
  labels: ReadonlyMap<string, string>,
  wireLinks: ReadonlySet<string>,
): readonly PlacedPart[] {
  return dump.parts
    .filter((part) => part.placement !== "floating")
    .map((part) => {
      const label = labelOf(labels, part)
      const pins = pinsOf(dump, part).map((pin) => ({ pin, at: frame.hole(pin.row, pin.col) }))
      // WHICH SHAPE IS THE CALLER'S TO DECIDE, THE WAY THE LABEL IS. A part
      // that resolves to 0 Ω is a wire a builder solders between two holes and
      // not a part with a body, but its VeroRoute type is `RESISTOR` and says
      // nothing about its value, so `bodyFor` cannot tell - the question is
      // about the circuit, which this module holds none of. `./wire-links.ts`
      // is how a caller builds the set.
      const body = wireLinks.has(part.ref) ? wireLinkBody(part, pins) : bodyFor(part, pins)
      return { part, label, pins, body }
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


/** How wide a tag is: its checkbox, the gap, and the label after it. */
function tagWidth(label: string): number {
  return CHECKBOX_SIZE + TAG_GAP + textWidth(label, LABEL_SIZE)
}

/**
 * Draws a tag - a checkbox with the label right after it, so the two are never
 * separated - at `spot`, and records the ground it took.
 *
 * `forWhat` is the checkbox's own identity, and it is the CALLER's to supply
 * because a part and a landing pad are identified differently: a part by its
 * ref, a pad by its ref AND its terminal, since three pads of one potentiometer
 * share a ref and three checkboxes carrying one id would be one checkbox as far
 * as any reader of the sheet is concerned.
 */
function placeTag(canvas: Canvas, spot: Point, label: string, forWhat: string, occupied: Occupied): void {
  const width = tagWidth(label)
  const height = CHECKBOX_SIZE
  canvas.add(checkbox({ x: spot.x, y: spot.y - CHECKBOX_SIZE / 2 }, forWhat), tagBox(spot, CHECKBOX_SIZE, height))
  addText(canvas, { x: spot.x + CHECKBOX_SIZE + TAG_GAP, y: spot.y }, label, LABEL_STYLE)
  occupied.marks.add(grow(tagBox(spot, width, height), TAG_CLEARANCE))
}

/**
 * A tag beside the body, wherever it covers least of what is already drawn.
 *
 * **IT TAKES NO `avoid` LIST, AND THAT IS THE DIFFERENCE FROM `drawPartLabels`'s
 * path.** The points a tag must dodge only matter when it is placed ON a body,
 * inside its `labelArea`; out here `leastCovered` weighs every occupancy
 * instead. A pad has no `labelArea` at all (`padBody` says so: nothing fits
 * inside one hole's ring), so it comes straight here, and handing this function
 * a list of points to avoid would be an argument nothing could consult.
 */
function drawTagBeside(canvas: Canvas, body: Body, label: string, forWhat: string, occupied: Occupied): void {
  const width = tagWidth(label)
  const height = CHECKBOX_SIZE
  const spot = leastCovered(tagSpots(body, width, height), (p) => tagBox(p, width, height), everything(occupied))
  placeTag(canvas, spot, label, forWhat, occupied)
}

/**
 * A part's tag: on its body where the whole tag fits clear of its own pins and
 * of everything already drawn, and otherwise beside the body.
 */
function drawPartTag(canvas: Canvas, placed: PlacedPart, occupied: Occupied): void {
  const { part, body, pins, label } = placed
  const forWhat = `part:${part.ref}`
  const width = tagWidth(label)
  const height = CHECKBOX_SIZE
  const area = body.labelArea
  if (area === undefined) {
    drawTagBeside(canvas, body, label, forWhat, occupied)
    return
  }
  // Centred on the body, else nudged up or down within it.
  const x = (area.minX + area.maxX) / 2 - width / 2
  const y = (area.minY + area.maxY) / 2
  const avoid = pins.map((p) => p.at)
  const spot = [y, y - height, y + height]
    .map((cy) => ({ x, y: cy }))
    .find((p) => {
      const box = tagBox(p, width, height)
      return inside(box, area) && clearOf(box, avoid, PIN_DOT_RADIUS + 1) && occupied.marks.overlap(box) === 0
    })
  if (spot === undefined) {
    drawTagBeside(canvas, body, label, forWhat, occupied)
    return
  }
  placeTag(canvas, spot, label, forWhat, occupied)
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
    drawPartTag(canvas, entry, occupied)
  }
}

/** One landing pad as it is drawn: where its hole is, and the ring around it. */
export interface DrawnPad {
  readonly pad: PadTerminal
  readonly at: Point
  readonly body: Body
}

/**
 * Every landing pad at its drawn hole, refusing one whose hole is not on the
 * board.
 *
 * A pad's hole comes from its own `PAD` line (`./pads.ts`), which is the only
 * place the dump states it - there is no `PART` line and the `PIN` line is
 * printed under the board name the fork invented.
 *
 * **THE GRID CHECK IS HERE BECAUSE NOTHING ELSE IN THE PAD PATH MAKES ONE.**
 * `Frame.hole` is pure arithmetic with no bounds test, so a pad at row 40 of a
 * 14-row board is drawn forty pitches down, outside the board outline, in an
 * image that otherwise looks finished. `placedParts` refuses the analogous
 * faults for a part and this function is called for both views for the same
 * reason it is; a pad path that could not refuse anything would make that
 * symmetry a claim rather than a fact.
 */
export function drawnPads(frame: Frame, pads: readonly PadTerminal[]): readonly DrawnPad[] {
  return pads.map((pad) => {
    const { rows, cols } = frame.grid
    if (pad.row < 0 || pad.col < 0 || pad.row >= rows || pad.col >= cols) {
      throw new Error(
        `guide-pad-off-board: the pad "${pad.identity}" is at ${pad.row},${pad.col} and this ` +
          `board's GRID line says ${rows} x ${cols} holes, so that hole is not on the board and ` +
          "there is nowhere on the drawing to put it.\nFix it in the layout - move the pad onto " +
          "the board, or grow the stock - rather than here; the dump's GRID and PAD lines are " +
          "both written from the same board, so a pad outside it is a layout fault and not a " +
          "reading to normalise.\nIt is not clamped to the edge and it is not left out: a clamped " +
          "pad names a hole the builder would solder the wrong wire into, and an omitted one is a " +
          "terminal the guide says nothing about - which is the silence tools/guide/pads.ts " +
          "exists to end.",
      )
    }
    const at = frame.hole(pad.row, pad.col)
    return { pad, at, body: padBody(at) }
  })
}

/**
 * Draws every landing pad: the ring around its hole and the dot in it, recorded
 * in `occupied` so the numbers and tags placed afterwards keep clear.
 *
 * The dot is the same mark a part's lead gets, because the thing in the hole is
 * the same thing - a soldered joint - and a pad drawn without one would read as
 * an empty hole with a circle round it.
 */
export function drawPadBodies(canvas: Canvas, pads: readonly DrawnPad[], occupied: Occupied): void {
  for (const { at, body } of pads) {
    canvas.add(body.outline, body.extent)
    occupied.bodies.add(body.extent)
    canvas.add(circle(at, PIN_DOT_RADIUS, { fill: INK, cls: "pin" }), boxAround([at], PIN_DOT_RADIUS))
    occupied.marks.add(boxAround([at], PIN_DOT_RADIUS))
  }
}

/**
 * A pad's printed label, from the caller's map - never derived from the pad
 * itself.
 *
 * **THIS USED TO BE `pad.identity`, DRAWN INSIDE THE RENDERER, AND THAT WAS THE
 * WRONG SIDE OF THE INTERFACE.** `placedParts`' `labelOf` (above) takes a part's
 * label from the caller's map because the renderer has no circuit knowledge; a
 * pad's label needs exactly the same knowledge - which control it is, which
 * terminal, what a switch throw selects - so it is the caller's to supply too.
 * `tools/guide/pad-label.ts`'s `padLabelOf` is how a caller builds one entry.
 *
 * A pad missing from the map REFUSES. It does **not** fall back to
 * `pad.identity`: `RV_LO_BOOST.1` is the exact spelling the owner rejected when
 * he asked for the more descriptive names, and reinstating it here as a
 * fallback would be worse than the silence `tools/guide/pads.ts` exists to end
 * - it would look like a label while telling the builder nothing.
 */
function labelOfPad(labels: ReadonlyMap<string, string>, pad: PadTerminal): string {
  const label = labels.get(pad.identity)
  if (label === undefined) {
    throw new Error(
      `no label given for pad "${pad.identity}" (terminal ${pad.pin} of ${pad.ref}); the ` +
        "caller's pad-label map must name every drawn pad, the same as a part's label map " +
        "must name every placed part. It is not derived from the pad's own identity: " +
        `"${pad.identity}" is the <ref>.<pin> spelling the owner rejected when he asked for the ` +
        "more descriptive names (tools/guide/pad-label.ts), so a fallback to it here would " +
        "reinstate exactly that defect while this function's caller still looked satisfied.",
    )
  }
  return label
}

/**
 * Draws every landing pad's tag: its checkbox and the label the caller gives
 * it, keyed by the pad's identity.
 *
 * The checkbox itself is still keyed by `pad.identity` (`forWhat`, below) and
 * not by the printed label - three pads of one pot share a `ref` and would
 * share one checkbox if it were keyed by ref, but two labels could coincide in
 * text (two switches each with a "common" terminal) and must not then share a
 * checkbox either, so the identity - never the label - is the checkbox's key.
 */
export function drawPadLabels(
  canvas: Canvas,
  pads: readonly DrawnPad[],
  labels: ReadonlyMap<string, string>,
  occupied: Occupied,
): void {
  for (const { pad, body } of pads) {
    const label = labelOfPad(labels, pad)
    // BESIDE THE RING, ALWAYS: a pad has no `labelArea`, so there is no on-body
    // placement to attempt and no list of points for one to dodge. The ring and
    // the dot are already in `occupied`, so `leastCovered` keeps the tag off
    // them without being told.
    drawTagBeside(canvas, body, label, `pad:${pad.identity}`, occupied)
  }
}
