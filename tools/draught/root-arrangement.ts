/**
 * WHERE EACH SHEET SYMBOL GOES ON A MULTI-PAGE BOARD'S ROOT (design change C3), so that every one
 * lies inside US Letter's inner frame and clear of its title block. A fixed rule computed from the
 * blocks' port counts and the lengths of their texts - not a layout judged from the circuit - and
 * deterministic: the same `Network` always gives the same arrangement.
 *
 * The rule:
 * - Each block is a cell: its sheet box, the sheet name above it and the file name below it, and
 *   on each side that carries pins, a stub and its label's text.
 * - Cells are packed tallest first (ties in `Network.blocks` order). Each goes at the first
 *   candidate point - smallest y, then smallest x - where its whole cell lies inside the frame,
 *   clear of the title block and at least `CELL_GAP_MIL` from every cell already placed. The
 *   candidate points are the frame's north-west corner and, for each placed cell, the points just
 *   east of it and just south of it. The result is returned in `Network.blocks` order.
 * - Sheet pins are in port-name order, `ROOT_PIN_PITCH_MIL` apart. They go down the west edge,
 *   unless the block has more ports than one edge holds within the frame's height: then the first
 *   half (rounded up) goes down the west edge and the rest down the east edge.
 * - A box is wide enough for its pin names on both sides and for its own name and file name.
 * - Every coordinate is on akcli's 50 mil grid.
 *
 * A board is REFUSED, naming the block, when a block cannot be placed: either it does not fit
 * the frame with nothing else on the page, or it finds no free candidate point once the larger or
 * earlier blocks are placed. The message reads "<board>: the root does not fit US Letter's inner
 * frame: block "<name>" ..." and ends by naming this file. Nothing is drawn off the paper.
 *
 * Text widths are estimated at `ROOT_CHAR_MIL` per character. KiCad 10.0.5's default 1.27 mm text
 * measured 48 mil per character on the h7-module root's SVG export (textLength of "SDRAM_A10",
 * 10.968 mm for 9 characters; "File: mcu.kicad_sch", 19.011 mm for 19), so 50 over-reaches slightly.
 */
import type { Network } from "../../lib/model/types.ts"

/** Distance between sheet pins down a sheet's edge, and from the top edge to the first. */
export const ROOT_PIN_PITCH_MIL = 100
/** Length of the wire from a sheet pin to its parent-net label. */
export const ROOT_STUB_MIL = 200
/** Estimated width of one character of 1.27 mm text (measured 48 mil; see above). */
export const ROOT_CHAR_MIL = 50

const MIL_PER_MM = 1 / 0.0254
/**
 * US Letter landscape's inner frame and title block on KiCad 10.0.5, in mm:
 * `docs/research/2026-10-30-letter-repaper.md` section 3 (the frame is also
 * `draughting/measure/paper_fit.py`'s FRAME_X and FRAME_Y).
 */
export interface PaperRect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
export const LETTER_FRAME_MM: PaperRect = { x0: 11.98, x1: 267.377, y0: 11.98, y1: 203.877 }
export const LETTER_TITLE_BLOCK_MM: PaperRect = { x0: 159.3, x1: 267.25, y0: 171.831, y1: 203.75 }

const GRID_MIL = 50
/** Clearance kept inside the frame and around the title block. */
const MARGIN_MIL = 100
/** Room for text clear of its anchor: a label's text beyond its stub end, a pin name inside the box. */
const TEXT_PAD_MIL = 100
/** Room above a box for the sheet name, and below it for the file name. */
const SHEET_TEXT_MIL = 100
/** The least distance between two cells. */
const CELL_GAP_MIL = 100

export interface RootPin {
  /** The port's name: the sheet pin's and the block page's hierarchical label's. */
  readonly port: string
  /** The parent net the port is bound to: the root stub label's text. */
  readonly parent: string
}

export interface RootSheet {
  readonly block: string
  readonly file: string
  /** The box's north-west corner and size, in mil. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  /** Pins down the west edge, then down the east edge, each in port-name order. */
  readonly left: readonly RootPin[]
  readonly right: readonly RootPin[]
}

interface Rect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

interface Cell {
  readonly block: string
  readonly file: string
  readonly left: readonly RootPin[]
  readonly right: readonly RootPin[]
  /** From the cell's west edge to the box's west edge, and from the box's east edge onward. */
  readonly westReach: number
  readonly eastReach: number
  readonly width: number
  readonly boxHeight: number
}

function mils(r: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }): Rect {
  return { x0: r.x0 * MIL_PER_MM, y0: r.y0 * MIL_PER_MM, x1: r.x1 * MIL_PER_MM, y1: r.y1 * MIL_PER_MM }
}

/** The area cells may occupy: the frame, less the margin. */
const USABLE: Rect = (() => {
  const f = mils(LETTER_FRAME_MM)
  return { x0: f.x0 + MARGIN_MIL, y0: f.y0 + MARGIN_MIL, x1: f.x1 - MARGIN_MIL, y1: f.y1 - MARGIN_MIL }
})()
/** The title block, grown by the margin. */
const KEEP_OUT: Rect = (() => {
  const t = mils(LETTER_TITLE_BLOCK_MM)
  return { x0: t.x0 - MARGIN_MIL, y0: t.y0 - MARGIN_MIL, x1: t.x1 + MARGIN_MIL, y1: t.y1 + MARGIN_MIL }
})()

const snapUp = (v: number): number => Math.ceil(v / GRID_MIL) * GRID_MIL
const textWidth = (s: string): number => s.length * ROOT_CHAR_MIL
const widest = (texts: readonly string[]): number => texts.reduce((m, s) => Math.max(m, textWidth(s)), 0)
const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
/** The tallest box one cell may have and still fit between the frame's north and south edges. */
const MAX_BOX_HEIGHT = USABLE.y1 - USABLE.y0 - 2 * SHEET_TEXT_MIL

function cellOf(prefix: string, ports: Readonly<Record<string, string>>, board: string): Cell {
  const all = Object.entries(ports)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([port, parent]) => ({ port, parent }))
  const oneEdge = (all.length + 1) * ROOT_PIN_PITCH_MIL <= MAX_BOX_HEIGHT
  const split = oneEdge ? all.length : Math.ceil(all.length / 2)
  const left = all.slice(0, split)
  const right = all.slice(split)
  const boxHeight = (Math.max(left.length, right.length) + 1) * ROOT_PIN_PITCH_MIL
  if (boxHeight > MAX_BOX_HEIGHT) {
    throw new Error(
      `${board}: block "${prefix}" has ${all.length} ports; down both edges of its sheet at ${ROOT_PIN_PITCH_MIL} mil they need a box ` +
        `${boxHeight} mil tall, and US Letter's inner frame holds ${Math.floor(MAX_BOX_HEIGHT)}. The root is not drawn off the paper; ` +
        "split the block in the model, or give the root a larger paper in tools/draught/root-arrangement.ts with its own measured frame.",
    )
  }
  const file = `${prefix}.kicad_sch`
  const reach = (pins: readonly RootPin[]): number =>
    pins.length === 0 ? 0 : snapUp(ROOT_STUB_MIL + TEXT_PAD_MIL + widest(pins.map((p) => p.parent)))
  const names = (pins: readonly RootPin[]): number => (pins.length === 0 ? 0 : TEXT_PAD_MIL + widest(pins.map((p) => p.port)))
  const width = snapUp(Math.max(
    names(left) + names(right) + TEXT_PAD_MIL,
    textWidth(prefix) + TEXT_PAD_MIL,
    textWidth(`File: ${file}`) + TEXT_PAD_MIL,
  ))
  return { block: prefix, file, left, right, westReach: reach(left), eastReach: reach(right), width, boxHeight }
}

/** A cell's whole area - box, sheet name and file name, stubs and their labels - with its north-west corner at (x, y). */
function areaAt(cell: Cell, x: number, y: number): Rect {
  return { x0: x, y0: y, x1: x + cell.westReach + cell.width + cell.eastReach, y1: y + SHEET_TEXT_MIL * 2 + cell.boxHeight }
}

/** Why a cell cannot go at (x, y), or undefined when it can. */
function faultAt(area: Rect, placed: readonly Rect[]): string | undefined {
  if (area.x1 > USABLE.x1) return `runs ${Math.ceil(area.x1 - USABLE.x1)} mil past the frame's east edge`
  if (area.y1 > USABLE.y1) return `runs ${Math.ceil(area.y1 - USABLE.y1)} mil past the frame's south edge`
  if (overlaps(area, KEEP_OUT)) return "runs into the title block"
  const grown = (r: Rect): Rect => ({ x0: r.x0 - CELL_GAP_MIL, y0: r.y0 - CELL_GAP_MIL, x1: r.x1 + CELL_GAP_MIL, y1: r.y1 + CELL_GAP_MIL })
  if (placed.some((r) => overlaps(area, grown(r)))) return "overlaps a block already placed"
  return undefined
}

/**
 * Every block's sheet box and pins on the root, in `Network.blocks` order. Refuses a board that
 * cannot fit.
 *
 * Packing: blocks are taken tallest first (ties in `Network.blocks` order), and each goes at the
 * first candidate point - smallest y, then smallest x - where its whole cell lies inside the frame,
 * clear of the title block and at least `CELL_GAP_MIL` from every cell already placed. The candidate
 * points are the frame's north-west corner and, for every placed cell, the points just east of and
 * just south of it.
 */
export function arrangeRoot(network: Network, board: string): readonly RootSheet[] {
  const cells = network.blocks.map((b) => cellOf(b.prefix, b.ports, board))
  const order = cells
    .map((cell, index) => ({ cell, index }))
    .sort((a, b) => b.cell.boxHeight - a.cell.boxHeight || a.index - b.index)
  const placed: Rect[] = []
  const corner = new Map<string, { readonly x: number; readonly y: number }>()
  for (const { cell } of order) {
    const xs = [USABLE.x0, ...placed.map((r) => r.x1 + CELL_GAP_MIL)].map(snapUp)
    const ys = [USABLE.y0, ...placed.map((r) => r.y1 + CELL_GAP_MIL)].map(snapUp)
    const candidates = ys.flatMap((y) => xs.map((x) => ({ x, y }))).sort((a, b) => a.y - b.y || a.x - b.x)
    const at = candidates.find(({ x, y }) => faultAt(areaAt(cell, x, y), placed) === undefined)
    if (at === undefined) {
      const alone = faultAt(areaAt(cell, snapUp(USABLE.x0), snapUp(USABLE.y0)), [])
      throw new Error(
        `${board}: the root does not fit US Letter's inner frame: block "${cell.block}" ` +
          (alone === undefined
            ? `finds no free place once ${placed.length} larger or earlier block(s) are placed`
            : `${alone} even with nothing else on the page`) +
          ". It is not drawn off the paper (tools/draught/root-arrangement.ts).",
      )
    }
    placed.push(areaAt(cell, at.x, at.y))
    corner.set(cell.block, at)
  }
  return cells.map((cell) => {
    const at = corner.get(cell.block)
    if (at === undefined) throw new Error(`root-arrangement.ts: block "${cell.block}" was not placed; this is a bug in arrangeRoot`)
    return {
      block: cell.block, file: cell.file, x: at.x + cell.westReach, y: at.y + SHEET_TEXT_MIL,
      width: cell.width, height: cell.boxHeight, left: cell.left, right: cell.right,
    }
  })
}
