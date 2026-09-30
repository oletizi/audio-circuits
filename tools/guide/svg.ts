import type { Grid } from "./dump.ts"

/**
 * SVG primitives and the hole-grid frame shared by the layout renderer.
 *
 * Print-first: the only colours anywhere are black ink, white paper and one
 * light grey for the strips, so a black-and-white laser printer reproduces
 * the image faithfully.
 */

export const INK = "#000000"
export const PAPER = "#ffffff"
export const STRIP_GREY = "#c8c8c8"

/** One hole pitch (0.1 inch) in SVG user units. */
export const PITCH = 20

export const FONT = "Helvetica, Arial, sans-serif"

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Box {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** A coordinate written with at most two decimals, so output is stable and compact. */
export function fmt(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

/** A rough width for Helvetica-like text: enough to decide fit and reserve margins. */
export function textWidth(text: string, size: number): number {
  return text.length * size * 0.6
}

export function unionBox(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

export function grow(box: Box, pad: number): Box {
  return { minX: box.minX - pad, minY: box.minY - pad, maxX: box.maxX + pad, maxY: box.maxY + pad }
}

export function boxAround(points: readonly Point[], pad: number): Box {
  const first = points[0]
  if (first === undefined) {
    throw new Error("boxAround: no points to box")
  }
  let box: Box = { minX: first.x, minY: first.y, maxX: first.x, maxY: first.y }
  for (const p of points) {
    box = unionBox(box, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y })
  }
  return { minX: box.minX - pad, minY: box.minY - pad, maxX: box.maxX + pad, maxY: box.maxY + pad }
}

/** Collects SVG elements and the extent they cover, so the viewBox fits whatever was drawn. */
export interface Canvas {
  add(svg: string, extent: Box): void
  readonly elements: readonly string[]
  bounds(): Box
}

export function createCanvas(): Canvas {
  const elements: string[] = []
  let extent: Box | undefined
  return {
    elements,
    add(svg, box) {
      elements.push(svg)
      extent = extent === undefined ? box : unionBox(extent, box)
    },
    bounds() {
      if (extent === undefined) {
        throw new Error("Canvas.bounds: nothing has been drawn")
      }
      return extent
    },
  }
}

interface StrokeStyle {
  readonly width: number
  readonly colour?: string
  readonly cap?: "round" | "butt" | "square"
  readonly cls?: string
  readonly data?: Readonly<Record<string, string>>
}

function dataAttrs(data: Readonly<Record<string, string>> | undefined): string {
  if (data === undefined) {
    return ""
  }
  return Object.entries(data)
    .map(([key, value]) => ` data-${key}="${escapeXml(value)}"`)
    .join("")
}

function classAttr(cls: string | undefined): string {
  return cls === undefined ? "" : ` class="${cls}"`
}

export function line(a: Point, b: Point, style: StrokeStyle): string {
  return (
    `<line${classAttr(style.cls)}${dataAttrs(style.data)} x1="${fmt(a.x)}" y1="${fmt(a.y)}" ` +
    `x2="${fmt(b.x)}" y2="${fmt(b.y)}" stroke="${style.colour ?? INK}" stroke-width="${fmt(style.width)}" ` +
    `stroke-linecap="${style.cap ?? "round"}"/>`
  )
}

export function circle(
  c: Point,
  r: number,
  style: { fill: string; stroke?: string; width?: number; cls?: string; data?: Readonly<Record<string, string>> },
): string {
  const stroke = style.stroke === undefined ? "" : ` stroke="${style.stroke}" stroke-width="${fmt(style.width ?? 1)}"`
  return (
    `<circle${classAttr(style.cls)}${dataAttrs(style.data)} cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" ` +
    `fill="${style.fill}"${stroke}/>`
  )
}

export function polygon(points: readonly Point[], style: { width: number; cls?: string }): string {
  const list = points.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ")
  return `<polygon${classAttr(style.cls)} points="${list}" fill="${PAPER}" stroke="${INK}" stroke-width="${fmt(style.width)}"/>`
}

export interface TextStyle {
  readonly size: number
  readonly anchor?: "start" | "middle" | "end"
  readonly bold?: boolean
  /** Degrees, about the anchor point. */
  readonly rotate?: number
  /** A white outline behind the glyphs, so text stays legible over strips and leads. */
  readonly halo?: boolean
  readonly cls?: string
  readonly data?: Readonly<Record<string, string>>
}

/** Text whose `at.y` is its vertical centre (baseline set a third of the size lower). */
export function text(at: Point, content: string, style: TextStyle): string {
  const baseline = at.y + style.size * 0.35
  const rotate = style.rotate === undefined ? "" : ` transform="rotate(${fmt(style.rotate)} ${fmt(at.x)} ${fmt(at.y)})"`
  const halo = style.halo === true ? ` stroke="${PAPER}" stroke-width="${fmt(style.size * 0.3)}" paint-order="stroke"` : ""
  return (
    `<text${classAttr(style.cls)}${dataAttrs(style.data)} x="${fmt(at.x)}" y="${fmt(baseline)}" ` +
    `font-family="${FONT}" font-size="${fmt(style.size)}" text-anchor="${style.anchor ?? "start"}"` +
    `${style.bold === true ? ' font-weight="bold"' : ""} fill="${INK}"${halo}${rotate}>${escapeXml(content)}</text>`
  )
}

/** The area a piece of text covers, estimated from `textWidth`. Only -90 degree rotation is supported. */
export function textExtent(at: Point, content: string, style: TextStyle): Box {
  const w = textWidth(content, style.size)
  const h = style.size
  const [lo, hi] = style.anchor === "middle" ? [-w / 2, w / 2] : style.anchor === "end" ? [-w, 0] : [0, w]
  if (style.rotate !== undefined) {
    if (style.rotate !== -90) {
      throw new Error(
        `textExtent: only -90 degree rotation is supported, got ${style.rotate}; ` +
          "draw the text at -90 degrees, or extend textExtent in tools/guide/svg.ts to cover the new angle",
      )
    }
    // rotate(-90): the text runs upward from its anchor.
    return { minX: at.x - h / 2, maxX: at.x + h / 2, minY: at.y - hi, maxY: at.y - lo }
  }
  return { minX: at.x + lo, maxX: at.x + hi, minY: at.y - h / 2, maxY: at.y + h / 2 }
}

export function addText(canvas: Canvas, at: Point, content: string, style: TextStyle): void {
  canvas.add(text(at, content, style), textExtent(at, content, style))
}

export const CHECKBOX_SIZE = 9

/** An empty square to tick by hand; `at` is its top-left corner. */
export function checkbox(at: Point, forWhat: string): string {
  return (
    `<rect class="checkbox" data-for="${escapeXml(forWhat)}" x="${fmt(at.x)}" y="${fmt(at.y)}" ` +
    `width="${CHECKBOX_SIZE}" height="${CHECKBOX_SIZE}" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`
  )
}

/**
 * Where each hole is drawn. The component view has row 0 at the top and
 * column 0 at the left; the copper view is the board turned over, so it
 * mirrors columns when strips run along rows and rows when they run along
 * columns. Every hole keeps its name - only its drawn position moves.
 */
export interface Frame {
  readonly grid: Grid
  readonly verticalStrips: boolean
  readonly mirrored: boolean
  hole(row: number, col: number): Point
  /** The board's outline, half a pitch outside the outermost holes. */
  readonly board: Box
}

export function createFrame(grid: Grid, verticalStrips: boolean, mirrored: boolean): Frame {
  const hole = (row: number, col: number): Point => {
    const drawCol = mirrored && !verticalStrips ? grid.cols - 1 - col : col
    const drawRow = mirrored && verticalStrips ? grid.rows - 1 - row : row
    return { x: drawCol * PITCH, y: drawRow * PITCH }
  }
  const half = PITCH / 2
  return {
    grid,
    verticalStrips,
    mirrored,
    hole,
    board: { minX: -half, minY: -half, maxX: (grid.cols - 1) * PITCH + half, maxY: (grid.rows - 1) * PITCH + half },
  }
}
