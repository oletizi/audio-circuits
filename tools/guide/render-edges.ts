import type { BoardDump, Pin } from "./dump.ts"
import { leastCovered, type Occupied } from "./placement.ts"
import {
  INK,
  PITCH,
  addText,
  boxAround,
  circle,
  line,
  textExtent,
  unionBox,
  type Box,
  type Canvas,
  type Frame,
  type Point,
  type TextStyle,
} from "./svg.ts"

/**
 * Off-board connections (input, output, power, panel pots): each labelled
 * at the board edge nearest its pin, with a leader line to the pin's hole
 * and a ring round that hole so it is clear which pin the label means.
 *
 * The leader runs straight along the pin's row or column when nothing else
 * is in the way. When another part's pin or a wire end sits between the
 * hole and the edge, it steps half a pitch into the gap between strips
 * first, so it does not pass through that other pin.
 */

/** An off-board connection, labelled at the board edge nearest its pin. */
export interface EdgeLabel {
  readonly ref: string
  readonly pin: string
  readonly text: string
}

const EDGE_LABEL_SIZE = 9
/** Distance from the board outline to where a leader stops. */
const LEADER_OFFSET = 22
const TEXT_GAP = 3
const RING_RADIUS = 4.6

function findPin(dump: BoardDump, label: EdgeLabel): Pin {
  const pin = dump.pins[label.ref]?.find((p) => p.pin === label.pin)
  if (pin === undefined) {
    throw new Error(
      `edge label "${label.text}" names ${label.ref} pin ${label.pin}, which the dump places nowhere ` +
        `(no "PIN ${label.ref} ${label.pin}" line); fix the caller's off-board connection list or re-dump the board`,
    )
  }
  return pin
}

export function validateEdgeLabels(dump: BoardDump, labels: readonly EdgeLabel[]): void {
  for (const label of labels) {
    findPin(dump, label)
  }
}

type Edge = "left" | "right" | "top" | "bottom"

function nearestEdge(frame: Frame, pin: Pin): Edge {
  const { rows, cols } = frame.grid
  const byDistance: readonly (readonly [Edge, number])[] = [
    ["left", pin.col],
    ["right", cols - 1 - pin.col],
    ["top", pin.row],
    ["bottom", rows - 1 - pin.row],
  ]
  // Ties go to the strip ends, where an off-board wire naturally lands.
  const order = frame.verticalStrips ? [...byDistance.slice(2), ...byDistance.slice(0, 2)] : byDistance
  let best: readonly [Edge, number] | undefined
  for (const candidate of order) {
    if (best === undefined || candidate[1] < best[1]) {
      best = candidate
    }
  }
  if (best === undefined) {
    throw new Error("nearestEdge: no edges to choose from (internal error in render-edges.ts)")
  }
  return best[0]
}

const OUTWARD: Readonly<Record<Edge, Point>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
}

/** A leader's points from the hole outward, and where its text goes. */
interface Route {
  readonly points: readonly Point[]
  readonly textAt: Point
  readonly style: TextStyle
  readonly box: Box
}

function route(frame: Frame, edge: Edge, hole: Point, offset: number, text: string): Route {
  const { board } = frame
  const out = OUTWARD[edge]
  const side = { x: -out.y, y: out.x }
  const start = { x: hole.x + side.x * offset, y: hole.y + side.y * offset }
  const end: Point =
    edge === "left"
      ? { x: board.minX - LEADER_OFFSET, y: start.y }
      : edge === "right"
        ? { x: board.maxX + LEADER_OFFSET, y: start.y }
        : edge === "top"
          ? { x: start.x, y: board.minY - LEADER_OFFSET }
          : { x: start.x, y: board.maxY + LEADER_OFFSET }
  const base: TextStyle = { size: EDGE_LABEL_SIZE, bold: true, halo: true, cls: "edge-label" }
  const textAt = { x: end.x + out.x * TEXT_GAP, y: end.y + out.y * TEXT_GAP }
  const style: TextStyle =
    edge === "left"
      ? { ...base, anchor: "end" }
      : edge === "right"
        ? { ...base, anchor: "start" }
        : edge === "top"
          ? { ...base, anchor: "start", rotate: -90 }
          : { ...base, anchor: "end", rotate: -90 }
  const points = offset === 0 ? [hole, end] : [hole, start, end]
  const box = unionBox(boxAround(points, 1.5), textExtent(textAt, text, style))
  return { points, textAt, style, box }
}

/** Whether some other pin or wire end lies on the straight run from `pin` to `edge`. */
function blocked(dump: BoardDump, pin: Pin, edge: Edge): boolean {
  const others = [
    ...Object.values(dump.pins).flat(),
    ...dump.wires.flatMap((wire) => wire.ends),
  ].filter((p) => p.row !== pin.row || p.col !== pin.col)
  return others.some((p) => {
    if (edge === "left") return p.row === pin.row && p.col < pin.col
    if (edge === "right") return p.row === pin.row && p.col > pin.col
    if (edge === "top") return p.col === pin.col && p.row < pin.row
    return p.col === pin.col && p.row > pin.row
  })
}

/**
 * Draws every edge label, placing unobstructed ones first so a detoured
 * leader can pick the side that keeps clear of them, and records every
 * leader and label in `occupied` so cut numbers and part tags avoid them.
 */
export function drawEdgeLabels(
  canvas: Canvas,
  frame: Frame,
  dump: BoardDump,
  labels: readonly EdgeLabel[],
  occupied: Occupied,
): void {
  const planned = labels.map((label) => {
    const pin = findPin(dump, label)
    const edge = nearestEdge(frame, pin)
    return { label, pin, edge, detour: blocked(dump, pin, edge) }
  })
  const ordered = [...planned.filter((p) => !p.detour), ...planned.filter((p) => p.detour)]
  for (const { label, pin, edge, detour } of ordered) {
    const hole = frame.hole(pin.row, pin.col)
    const half = PITCH / 2
    const offsets = detour ? [-half, half] : [0]
    const candidates = offsets.map((offset) => route(frame, edge, hole, offset, label.text))
    const chosen = leastCovered(candidates, (r) => r.box, [occupied.bodies, occupied.marks])
    const segments = chosen.points.slice(1).map((p, i) => {
      const from = chosen.points[i]
      if (from === undefined) {
        throw new Error("drawEdgeLabels: leader has no start point (internal error in render-edges.ts)")
      }
      return line(from, p, { width: 0.9, cls: "edge-leader" })
    })
    canvas.add(segments.join(""), boxAround(chosen.points, 1))
    canvas.add(circle(hole, RING_RADIUS, { fill: "none", stroke: INK, width: 1, cls: "edge-pin" }), boxAround([hole], RING_RADIUS))
    addText(canvas, chosen.textAt, label.text, chosen.style)
    occupied.marks.add(chosen.box)
  }
}
