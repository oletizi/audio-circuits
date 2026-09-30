import { holeName, type BoardDump } from "./dump.ts"
import {
  drawBoard,
  drawBridges,
  drawCoordinates,
  drawCuts,
  drawEdgeLabels,
  drawWires,
  validateEdgeLabels,
  type EdgeLabel,
} from "./render-board.ts"
import { drawPartBodies, drawPartLabels, placedParts, validateParts } from "./render-parts.ts"
import {
  CHECKBOX_SIZE,
  INK,
  PAPER,
  PITCH,
  addText,
  boxAround,
  createCanvas,
  createFrame,
  fmt,
  line,
  text,
  textWidth,
  unionBox,
  type Box,
  type Canvas,
} from "./svg.ts"
import { createOccupied } from "./placement.ts"

/**
 * Draws a VeroRoute stripboard layout, from its `--dump-board` report, as a
 * print-first SVG for the bench: the component side with parts, leads,
 * labels and checkboxes, or the copper side (mirrored) with only strips,
 * cuts and solder bridges. Cuts and bridges carry the numbers from
 * `numbering.ts` in both views, so the checklist and both images agree.
 *
 * The renderer knows nothing about circuits: what each part is called
 * (`labels`) and which pins leave the board (`edgeLabels`) come from the
 * caller.
 */

export type { EdgeLabel } from "./render-board.ts"

export interface RenderOptions {
  readonly view: "component" | "copper"
  readonly title: string
  readonly edgeLabels: readonly EdgeLabel[]
}

const HEADER_GAP = 12
const LEGEND_GAP = 16
const MARGIN = 12

function lastRowName(dump: BoardDump): string {
  return holeName(dump.grid.rows - 1, 0).slice(0, -1)
}

function drawHeader(canvas: Canvas, dump: BoardDump, options: RenderOptions, top: number, left: number): void {
  const placed = dump.parts.filter((part) => part.placement !== "floating").length
  const side = options.view === "component" ? "Component side" : "Copper side, mirrored (holes keep their names)"
  const size =
    `${dump.grid.rows} x ${dump.grid.cols} holes (rows A-${lastRowName(dump)}, columns 1-${dump.grid.cols})`
  const summary =
    `${placed} parts, ${dump.wires.length} wire links, ${dump.cuts.length} cuts, ${dump.bridges.length} solder bridges`
  const lines = [summary, `${side}. ${size}`]
  let y = top - HEADER_GAP
  for (const content of lines) {
    addText(canvas, { x: left, y }, content, { size: 9, cls: "header" })
    y -= 13
  }
  addText(canvas, { x: left, y: y - 3 }, options.title, { size: 15, bold: true, cls: "title" })
}

interface LegendItem {
  readonly symbol: (x: number, y: number) => string
  readonly text: string
}

const CUT_SYMBOL = (x: number, y: number): string => {
  const s = PITCH * 0.32
  return (
    line({ x: x - s, y: y - s }, { x: x + s, y: y + s }, { width: 2.6 }) +
    line({ x: x - s, y: y + s }, { x: x + s, y: y - s }, { width: 2.6 })
  )
}

function legendItems(view: RenderOptions["view"]): readonly LegendItem[] {
  const common: LegendItem[] = [
    { symbol: CUT_SYMBOL, text: "cut the strip here (number = checklist)" },
    { symbol: (x, y) => line({ x: x - 7, y }, { x: x + 7, y }, { width: 5 }), text: "solder bridge (B1, B2 ...)" },
    {
      // Drawn like a checkbox but not classed as one: it is a key, not something to tick.
      symbol: (x, y) =>
        `<rect x="${fmt(x - CHECKBOX_SIZE / 2)}" y="${fmt(y - CHECKBOX_SIZE / 2)}" width="${CHECKBOX_SIZE}" ` +
        `height="${CHECKBOX_SIZE}" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`,
      text: "tick when done",
    },
  ]
  if (view === "copper") {
    return common
  }
  return [
    ...common,
    {
      symbol: (x, y) =>
        line({ x: x - 8, y }, { x: x + 8, y }, { width: 2 }) +
        `<circle cx="${fmt(x - 8)}" cy="${fmt(y)}" r="3.2" fill="${INK}"/><circle cx="${fmt(x + 8)}" cy="${fmt(y)}" r="3.2" fill="${INK}"/>`,
      text: "wire link",
    },
    {
      symbol: (x, y) =>
        `<rect x="${fmt(x - 3.5)}" y="${fmt(y - 3.5)}" width="7" height="7" fill="none" stroke="${INK}" stroke-width="1.2"/>` +
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="2.4" fill="${INK}"/>`,
      text: "pin 1",
    },
    {
      symbol: (x, y) =>
        text({ x, y }, "+", { size: 10, anchor: "middle", bold: true }),
      text: "electrolytic + lead",
    },
  ]
}

function drawLegend(canvas: Canvas, view: RenderOptions["view"], top: number, left: number, width: number): void {
  const size = 8.5
  let x = left
  let y = top + LEGEND_GAP
  for (const item of legendItems(view)) {
    const itemWidth = 22 + textWidth(item.text, size) + 14
    if (x > left && x + itemWidth > left + width) {
      x = left
      y += 18
    }
    canvas.add(item.symbol(x + 9, y), boxAround([{ x: x + 9, y }], 10))
    addText(canvas, { x: x + 22, y }, item.text, { size, cls: "legend" })
    x += itemWidth
  }
}

function svgDocument(layers: readonly Canvas[]): string {
  const b: Box = boundsOf(layers)
  const minX = b.minX - MARGIN
  const minY = b.minY - MARGIN
  const width = b.maxX - b.minX + 2 * MARGIN
  const height = b.maxY - b.minY + 2 * MARGIN
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(width)} ${fmt(height)}" ` +
      `width="${fmt(width)}" height="${fmt(height)}">`,
    `<rect x="${fmt(minX)}" y="${fmt(minY)}" width="${fmt(width)}" height="${fmt(height)}" fill="${PAPER}"/>`,
    ...layers.flatMap((layer) => layer.elements),
    "</svg>",
    "",
  ].join("\n")
}

function boundsOf(layers: readonly Canvas[]): Box {
  const drawn = layers.filter((layer) => layer.elements.length > 0).map((layer) => layer.bounds())
  const [first, ...rest] = drawn
  if (first === undefined) {
    throw new Error("renderLayout: nothing was drawn")
  }
  return rest.reduce(unionBox, first)
}

export function renderLayout(dump: BoardDump, labels: ReadonlyMap<string, string>, options: RenderOptions): string {
  const frame = createFrame(dump.grid, dump.verticalStrips, options.view === "copper")
  validateParts(frame, dump, labels)
  validateEdgeLabels(dump, options.edgeLabels)
  // Placed in this order - fixed geometry first, then cut numbers clear of
  // it, then part labels clear of everything - but stacked bottom to top as
  // listed in `layers`, so cuts and labels are never hidden under a body.
  const board = createCanvas()
  const parts = createCanvas()
  const wires = createCanvas()
  const marks = createCanvas()
  const partLabels = createCanvas()
  const edges = createCanvas()
  const page = createCanvas()
  const occupied = createOccupied()
  const component = options.view === "component"
  const placed = component ? placedParts(frame, dump) : []
  drawBoard(board, frame)
  if (component) {
    drawWires(wires, frame, dump, occupied.marks)
  }
  drawBridges(marks, frame, dump, occupied.marks)
  drawPartBodies(parts, placed, occupied)
  drawCuts(marks, frame, dump, occupied)
  drawPartLabels(partLabels, placed, labels, occupied)
  if (component) {
    drawEdgeLabels(edges, frame, dump, options.edgeLabels)
  }
  drawCoordinates(edges, frame)
  const layers = [board, parts, wires, marks, partLabels, edges]
  const drawn = boundsOf(layers)
  drawHeader(page, dump, options, drawn.minY, drawn.minX)
  drawLegend(page, options.view, drawn.maxY, drawn.minX, drawn.maxX - drawn.minX)
  return svgDocument([...layers, page])
}
