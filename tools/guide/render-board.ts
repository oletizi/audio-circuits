import { holeName, type BoardDump, type HolePosition } from "./dump.ts"
import { numberedBridges, numberedCuts } from "./numbering.ts"
import { TAG_CLEARANCE, everything, leastCovered, type Occupancy, type Occupied } from "./placement.ts"
import {
  CHECKBOX_SIZE,
  INK,
  PAPER,
  PITCH,
  STRIP_GREY,
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

function rowName(row: number): string {
  return holeName(row, 0).slice(0, -1)
}

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
    canvas.add(line(a, b, { width: PITCH * 0.3, colour: STRIP_GREY, cap: "butt", cls: "strip" }), boxAround([a, b], PITCH / 2))
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
  const { board, grid } = frame
  const coord: TextStyle = { size: COORD_SIZE, anchor: "middle", halo: true, cls: "coord" }
  for (let col = 0; col < grid.cols; col += 1) {
    const x = frame.hole(0, col).x
    addText(canvas, { x, y: board.minY - COORD_OFFSET }, String(col + 1), coord)
    addText(canvas, { x, y: board.maxY + COORD_OFFSET }, String(col + 1), coord)
  }
  for (let row = 0; row < grid.rows; row += 1) {
    const y = frame.hole(row, 0).y
    addText(canvas, { x: board.minX - COORD_OFFSET, y }, rowName(row), coord)
    addText(canvas, { x: board.maxX + COORD_OFFSET, y }, rowName(row), coord)
  }
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
  const s = PITCH * 0.32
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

/** Draws every solder bridge with its number, recording what it covers in `marks`. */
export function drawBridges(canvas: Canvas, frame: Frame, dump: BoardDump, marks: Occupancy): void {
  for (const { number, bridge } of numberedBridges(dump)) {
    const a = frame.hole(bridge.a.row, bridge.a.col)
    const b = frame.hole(bridge.b.row, bridge.b.col)
    canvas.add(line(a, b, { width: 5, cls: "bridge", data: { bridge: String(number) } }), boxAround([a, b], 3))
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

/** Draws every wire link, recording the lines in `marks` so labels keep off them. */
export function drawWires(canvas: Canvas, frame: Frame, dump: BoardDump, marks: Occupancy): void {
  for (const wire of dump.wires) {
    const [a, b] = wire.ends.map((end: HolePosition) => frame.hole(end.row, end.col))
    if (a === undefined || b === undefined) {
      throw new Error(
        `wire ${wire.name} does not have two ends, so it cannot be drawn. parseBoardDump always gives a wire ` +
          "two ends, so this BoardDump was built some other way; build it with parseBoardDump from a real " +
          "--dump-board report.",
      )
    }
    canvas.add(line(a, b, { width: 2, cls: "wire", data: { wire: wire.name } }), boxAround([a, b], 3))
    marks.add(boxAround([a, b], 2))
    for (const p of [a, b]) {
      canvas.add(circle(p, 3.2, { fill: INK }), boxAround([p], 3.2))
    }
  }
}

