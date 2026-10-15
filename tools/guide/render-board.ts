import { holeName, rowName, type BoardDump } from "./dump.ts"
import { numberedBridges, numberedCuts, numberedWires } from "./numbering.ts"
import { TAG_CLEARANCE, everything, leastCovered, type Occupancy, type Occupied } from "./placement.ts"
import {
  CHECKBOX_SIZE,
  INK,
  PAPER,
  PITCH,
  MARKED_STRIP_GREY,
  STRIP_GREY,
  isMarkedStrip,
  addText,
  boxAround,
  checkbox,
  circle,
  fmt,
  grow,
  line,
  textExtent,
  textWidth,
  type Box,
  type Canvas,
  type Frame,
  type Point,
  type TextStyle,
} from "./svg.ts"

/**
 * The board itself: outline, strips, holes, row and column names, cuts,
 * solder bridges and wires. Parts are drawn by `render-parts.ts`,
 * off-board connection labels by `render-edges.ts`, and the page around the
 * board by `render.ts`.
 */

const COORD_SIZE = 8
const MARK_NUMBER_SIZE = 8
/** Distance from the board outline to the row/column names. */
const COORD_OFFSET = 9

export function drawBoard(canvas: Canvas, frame: Frame): void {
  const { board, grid } = frame
  canvas.add(
    `<rect class="board" x="${fmt(board.minX)}" y="${fmt(board.minY)}" width="${fmt(board.maxX - board.minX)}" ` +
      `height="${fmt(board.maxY - board.minY)}" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/>`,
    board,
  )
  const strips = frame.verticalStrips ? grid.cols : grid.rows
  const along = frame.verticalStrips ? grid.rows : grid.cols
  for (let s = 0; s < strips; s += 1) {
    const [a, b] = frame.verticalStrips
      ? [frame.hole(0, s), frame.hole(along - 1, s)]
      : [frame.hole(s, 0), frame.hole(s, along - 1)]
    // Marked by physical strip index, so the copper view marks the same strips.
    const marked = isMarkedStrip(s)
    const strip = line(a, b, {
      width: PITCH * 0.3,
      colour: marked ? MARKED_STRIP_GREY : STRIP_GREY,
      cap: "butt",
      cls: marked ? "strip marked-strip" : "strip",
      data: { strip: frame.verticalStrips ? String(s + 1) : rowName(s) },
    })
    canvas.add(strip, boxAround([a, b], PITCH / 2))
  }
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const p = frame.hole(row, col)
      canvas.add(circle(p, 2.2, { fill: PAPER, stroke: INK, width: 0.6, cls: "hole", data: { hole: holeName(row, col) } }), boxAround([p], 3))
    }
  }
}

/**
 * Row letters and column numbers on all four sides. Drawn last, with a
 * white halo, so an edge label's leader line breaks around them.
 */
export function drawCoordinates(canvas: Canvas, frame: Frame): void {
  for (const { at, content, style } of coordinates(frame)) {
    addText(canvas, at, content, style)
  }
}

/**
 * Records where the row letters and column numbers will be drawn, so the
 * numbers and part tags placed after this keep off them. Called once the
 * edge labels are placed: their leader lines cross the coordinates on
 * purpose, and the coordinates' halo breaks them.
 */
export function reserveCoordinates(frame: Frame, marks: Occupancy): void {
  for (const { at, content, style } of coordinates(frame)) {
    marks.add(textExtent(at, content, style))
  }
}

function coordinates(frame: Frame): readonly { at: Point; content: string; style: TextStyle }[] {
  const { board, grid } = frame
  const plain: TextStyle = { size: COORD_SIZE, anchor: "middle", halo: true, cls: "coord" }
  // A marked strip's name is bold at both ends, as part of the alignment guide.
  const bold: TextStyle = { ...plain, bold: true }
  const placed: { at: Point; content: string; style: TextStyle }[] = []
  for (let col = 0; col < grid.cols; col += 1) {
    const x = frame.hole(0, col).x
    const style = frame.verticalStrips && isMarkedStrip(col) ? bold : plain
    const content = String(col + 1)
    placed.push({ at: { x, y: board.minY - COORD_OFFSET }, content, style })
    placed.push({ at: { x, y: board.maxY + COORD_OFFSET }, content, style })
  }
  for (let row = 0; row < grid.rows; row += 1) {
    const y = frame.hole(row, 0).y
    const style = !frame.verticalStrips && isMarkedStrip(row) ? bold : plain
    const content = rowName(row)
    placed.push({ at: { x: board.minX - COORD_OFFSET, y }, content, style })
    placed.push({ at: { x: board.maxX + COORD_OFFSET, y }, content, style })
  }
  return placed
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Where a cut's number and checkbox may go, by preference: centred in the
 * gap beside the strip on one side, then the other, then nudged along it -
 * always within a pitch of the cut, so it reads as that cut's.
 */
function cutTagSpots(frame: Frame, m: Point): readonly Point[] {
  const half = PITCH / 2
  const nudge = PITCH * 0.6
  const across: readonly Point[] = frame.verticalStrips
    ? [{ x: m.x + half, y: m.y }, { x: m.x - half, y: m.y }]
    : [{ x: m.x, y: m.y - half }, { x: m.x, y: m.y + half }]
  const along = frame.verticalStrips ? [{ x: 0, y: nudge }, { x: 0, y: -nudge }] : [{ x: nudge, y: 0 }, { x: -nudge, y: 0 }]
  return [...across, ...across.flatMap((p) => along.map((d) => ({ x: p.x + d.x, y: p.y + d.y })))]
}

/**
 * Draws every cut as a bold cross with its number and checkbox beside it,
 * placed clear of whatever `occupied` already records, and records what it
 * covers there in turn.
 */
export function drawCuts(canvas: Canvas, frame: Frame, dump: BoardDump, occupied: Occupied): void {
  // **THE ARM REACHES 0.22 OF A PITCH AND NOT 0.32, so the cross stays inside
  // the gap it marks.** A cut's centre is half a pitch (10 units) from each of
  // the two holes it separates. At 0.32 the arm reached 6.4 units and the 2.6
  // stroke another 1.3, stopping 2.3 units from a hole centre - INSIDE a lead's
  // 3.2-unit dot, so a cut was drawn across the lead beside it. The owner read
  // the result as parts and marks sharing holes: *"those overlaps make it
  // extremely difficult to figure out which part goes in which hole. It's a
  // foot gun and a trap."* The boards were measured clean - 0 shared holes on
  // every one of them, his own two included - so this was the drawing lying
  // about the layout, which is worse than a bad layout.
  //
  // At 0.22 the arm reaches 4.4 and stops 4.3 units clear of a hole centre,
  // outside the dot with room to spare. The cross stays the symbol he already
  // knows; only its size changes.
  const s = PITCH * 0.22
  const marks = occupied.marks
  for (const { number, cut } of numberedCuts(dump)) {
    const m = midpoint(frame.hole(cut.a.row, cut.a.col), frame.hole(cut.b.row, cut.b.col))
    const strokes = [
      line({ x: m.x - s, y: m.y - s }, { x: m.x + s, y: m.y + s }, { width: 2.6 }),
      line({ x: m.x - s, y: m.y + s }, { x: m.x + s, y: m.y - s }, { width: 2.6 }),
    ]
    canvas.add(`<g class="cut" data-cut="${number}">${strokes.join("")}</g>`, boxAround([m], s + 1.5))
    marks.add(boxAround([m], s + 1.5))
    const label = String(number)
    const w = textWidth(label, MARK_NUMBER_SIZE)
    const total = w + 1.5 + CHECKBOX_SIZE
    const tagOf = (p: Point): Box => ({
      minX: p.x - total / 2,
      maxX: p.x + total / 2,
      minY: p.y - CHECKBOX_SIZE / 2,
      maxY: p.y + CHECKBOX_SIZE / 2,
    })
    const at = leastCovered(cutTagSpots(frame, m), tagOf, everything(occupied))
    const numberAt = { x: at.x - total / 2 + w / 2, y: at.y }
    addText(canvas, numberAt, label, {
      size: MARK_NUMBER_SIZE,
      anchor: "middle",
      bold: true,
      halo: true,
      cls: "cut-number",
      data: { cut: label },
    })
    const boxAt = { x: at.x + total / 2 - CHECKBOX_SIZE, y: at.y - CHECKBOX_SIZE / 2 }
    const boxExtent = boxAround([boxAt, { x: boxAt.x + CHECKBOX_SIZE, y: boxAt.y + CHECKBOX_SIZE }], 0)
    canvas.add(checkbox(boxAt, `cut:${number}`), boxExtent)
    marks.add(grow(tagOf(at), TAG_CLEARANCE))
  }
}

/** How far a bridge bar stops short of each hole it joins, so both stay visible. */
export const BRIDGE_INSET = 4

/**
 * The same segment with both ends pulled back by `inset`, or the original pair
 * when the two points are closer together than the inset can take.
 *
 * The degenerate case is refused rather than drawn shorter than nothing: a
 * bridge joins two ADJACENT strips, so its ends are one pitch apart and the
 * guard can only fire on a malformed board. Returning the ends unchanged would
 * draw a full-length bar that looks exactly like the thing this inset exists to
 * distinguish.
 */
function insetEnds(a: Point, b: Point, inset: number): readonly [Point, Point] {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length <= inset * 2) {
    throw new Error(
      `a solder bridge was drawn between two holes ${length.toFixed(1)} units apart, which is ` +
        `not enough for the ${inset}-unit inset at each end that keeps both holes visible.\n` +
        "A bridge joins two ADJACENT strips, so its ends are one pitch apart on any well-formed " +
        "board - reaching this means the bridge's two holes are the same hole or closer than one " +
        "pitch, which is a defect in whatever produced the board, not in this renderer.\n" +
        "Nothing is substituted: drawing it full length would restore exactly the mark the inset " +
        "exists to tell apart from a wire.",
    )
  }
  const ux = (b.x - a.x) / length
  const uy = (b.y - a.y) / length
  return [
    { x: a.x + ux * inset, y: a.y + uy * inset },
    { x: b.x - ux * inset, y: b.y - uy * inset },
  ]
}

/**
 * Draws every solder bridge with its number, recording what it covers in `marks`.
 *
 * **THE BAR STOPS SHORT OF BOTH HOLES, and that is what tells it apart from a
 * wire.** Drawn hole-centre to hole-centre at width 5 it covered both holes
 * completely, so a reader could not see whether a lead sat under it - and a
 * SHORT WIRE drawn at width 2 with 3.2-unit end dots read as the same mark. One
 * is a blob of solder on the copper side and the other is a jumper over the
 * component side; they are different build actions and were the same picture.
 *
 * Inset by `BRIDGE_INSET`, the two holes stay open and visible, so a bridge now
 * reads as a fat bar BETWEEN two empty holes and a wire as a thin line ENDING in
 * two filled ones. The inset is geometric rather than chosen: 4 units clears the
 * 2.2-unit hole and its 0.6 stroke with margin, out of the 20-unit pitch.
 */
export function drawBridges(canvas: Canvas, frame: Frame, dump: BoardDump, marks: Occupancy): void {
  for (const { number, bridge } of numberedBridges(dump)) {
    const a = frame.hole(bridge.a.row, bridge.a.col)
    const b = frame.hole(bridge.b.row, bridge.b.col)
    const [from, to] = insetEnds(a, b, BRIDGE_INSET)
    canvas.add(line(from, to, { width: 5, cls: "bridge", data: { bridge: String(number) } }), boxAround([a, b], 3))
    marks.add(boxAround([a, b], 3))
    const m = midpoint(a, b)
    const at = frame.verticalStrips ? { x: m.x, y: m.y - 7 } : { x: m.x + 5, y: m.y }
    const style: TextStyle = {
      size: MARK_NUMBER_SIZE,
      anchor: frame.verticalStrips ? "middle" : "start",
      bold: true,
      halo: true,
      cls: "bridge-number",
    }
    addText(canvas, at, `B${number}`, style)
    marks.add(textExtent(at, `B${number}`, style))
  }
}

/**
 * Draws every wire link, recording the lines in `marks` so labels keep off
 * them. Each line carries its number from `numbering.ts`; the number itself
 * is printed by `drawWireNumbers`, once the parts are drawn, so it can keep
 * clear of them.
 */
export function drawWires(canvas: Canvas, frame: Frame, dump: BoardDump, marks: Occupancy): void {
  for (const { number, from, to } of numberedWires(dump)) {
    const a = frame.hole(from.row, from.col)
    const b = frame.hole(to.row, to.col)
    canvas.add(line(a, b, { width: 2, cls: "wire", data: { wire: String(number) } }), boxAround([a, b], 3))
    marks.add(boxAround([a, b], 2))
    for (const p of [a, b]) {
      canvas.add(circle(p, 3.2, { fill: INK }), boxAround([p], 3.2))
    }
  }
}

/**
 * Where a wire's number may go, by preference: beside the wire's middle on
 * one side, then the other, then beside points further along it - always
 * just off the wire, so it reads as that wire's.
 */
function wireTagSpots(a: Point, b: Point, width: number, height: number, wire: string): readonly Point[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  if (len === 0) {
    throw new Error(
      `wire ${wire} has both ends in one hole, so it cannot be drawn or numbered. Move one of its ends ` +
        "in VeroRoute (`make edit`), or delete the wire, save, then run this again.",
    )
  }
  const across = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
  // A bold "W" prints wider than textWidth's estimate, so keep a little extra gap.
  const offset = Math.abs(across.x) * (width / 2) + Math.abs(across.y) * (height / 2) + 5
  return [0.5, 0.3, 0.7, 0.15, 0.85].flatMap((t) => {
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    return [1, -1].map((side) => ({ x: p.x + across.x * offset * side, y: p.y + across.y * offset * side }))
  })
}

/** Prints "W<n>" beside every wire link, clear of whatever `occupied` records, and records it there. */
export function drawWireNumbers(canvas: Canvas, frame: Frame, dump: BoardDump, occupied: Occupied): void {
  const style: TextStyle = { size: MARK_NUMBER_SIZE, anchor: "middle", bold: true, halo: true, cls: "wire-number" }
  for (const { number, wire, from, to } of numberedWires(dump)) {
    const label = `W${number}`
    const width = textWidth(label, MARK_NUMBER_SIZE)
    const spots = wireTagSpots(frame.hole(from.row, from.col), frame.hole(to.row, to.col), width, MARK_NUMBER_SIZE, wire.name)
    const at = leastCovered(spots, (p) => textExtent(p, label, style), everything(occupied))
    addText(canvas, at, label, { ...style, data: { wire: String(number) } })
    occupied.marks.add(grow(textExtent(at, label, style), TAG_CLEARANCE))
  }
}

