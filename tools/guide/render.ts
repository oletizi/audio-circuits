import { groupLegendText, hatchFor, UNHATCHED_MEANS, type ClusterMarking } from "./clusters.ts"
import { rowName, type BoardDump } from "./dump.ts"
import { hatchSwatch, plainSwatch } from "./hatch.ts"
import { clusterDefs, drawClusters } from "./render-clusters.ts"
import {
  drawBoard,
  drawBridges,
  drawCoordinates,
  drawCuts,
  drawWireNumbers,
  drawWires,
  reserveCoordinates,
} from "./render-board.ts"
import type { PadTerminal } from "./pads.ts"
import { drawEdgeLabels, validateEdgeLabels, type EdgeLabel } from "./render-edges.ts"
import {
  drawPadBodies,
  drawPadLabels,
  drawnPads,
  drawPartBodies,
  drawPartLabels,
  placedParts,
} from "./render-parts.ts"
import {
  CHECKBOX_SIZE,
  INK,
  MARKED_STRIP_GREY,
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
  type Frame,
} from "./svg.ts"
import { createOccupied } from "./placement.ts"

/**
 * Draws a VeroRoute stripboard layout, from its `--dump-board` report, as a
 * print-first SVG for the bench: the component side with parts, leads,
 * labels and checkboxes, or the copper side (mirrored) with only strips,
 * cuts and solder bridges. Cuts and bridges carry the numbers from
 * `numbering.ts` in both views, and wire links (component side only) theirs,
 * so the checklist and the images agree.
 *
 * The component side can also carry the STAND-IN GROUP HATCHING (`clusters`),
 * which is what the packet's fourth image is: the same drawing with a patch of
 * one of four hatches under each part that stands in for an absent section, and
 * a legend naming the groups. See `./render-clusters.ts` for how a patch is
 * made and `./hatch.ts` for the fills, which the owner ratified on 2026-10-18
 * with a weakness he was told about first.
 *
 * The renderer knows nothing about circuits: what each part is called
 * (`labels`), what each pad's wire is (`padLabels`), which pins leave the
 * board (`edgeLabels`), which parts are wire links rather than parts with
 * bodies (`wireLinks`) and which parts belong to which stand-in group
 * (`clusters`) all come from the caller.
 */

export type { EdgeLabel } from "./render-edges.ts"

export interface RenderOptions {
  readonly view: "component" | "copper"
  readonly title: string
  readonly edgeLabels: readonly EdgeLabel[]
  /**
   * The board's landing pads, from `./pads.ts`.
   *
   * **IT COMES FROM THE CALLER FOR THE REASON `edgeLabels` DOES**, which is this
   * module's own stated architecture: a `BoardDump` carries no `PAD` lines, so
   * the pads are read from the dump TEXT by whoever has it. **It is required and
   * not optional**, because the fault it replaces was silence - a `PAD` line was
   * skipped by keyword and ten panel terminals left a Pultec guide without a
   * word. An optional field would let exactly that happen again by omission, and
   * a board with no pads says so by passing an empty list.
   */
  readonly pads: readonly PadTerminal[]
  /**
   * The text printed beside each pad's checkbox, keyed by `PadTerminal.identity`.
   *
   * **IT COMES FROM THE CALLER FOR THE SAME REASON `labels` DOES FOR PARTS.**
   * This module's own comment states that architecture for parts; a pad's label
   * used to be the one exception, derived inside the renderer from
   * `pad.identity` because the renderer had nowhere else to get it from. That
   * made every packet image print identical pad text and put a descriptive
   * label out of reach without teaching the renderer circuit knowledge it has
   * no business holding. `tools/guide/pad-label.ts`'s `padLabelOf` is how a
   * caller builds one entry from a `Component` and a pin.
   *
   * **It is required, and a pad missing from it REFUSES rather than falling
   * back to `pad.identity`.** `RV_LO_BOOST.1` is the spelling the owner
   * rejected when he asked for the more descriptive names, so a fallback here
   * would quietly reinstate it.
   */
  readonly padLabels: ReadonlyMap<string, string>
  /**
   * The refs this board carries that are WIRE LINKS rather than parts with
   * bodies - a component that resolves to 0 Ω, from `./wire-links.ts`.
   *
   * **IT COMES FROM THE CALLER FOR THE REASON `labels` AND `padLabels` DO.**
   * Whether a part is a wire link is a fact about the circuit (a pot section at
   * its end stop), and its VeroRoute type is `RESISTOR` either way, so the
   * renderer cannot derive it without circuit knowledge it has no business
   * holding.
   *
   * **It is required and not optional, exactly as `pads` is**, and for the same
   * kind of failure: a caller that omitted it would draw a resistor body with
   * `0R` beside it on a stripboard - the picture half of
   * `docs/known-gaps.md`'s G55, and the half an earlier fix would have left
   * behind. A board with none says so by passing an empty set.
   */
  readonly wireLinks: ReadonlySet<string>
  /**
   * Which parts belong to which stand-in group, from `./clusters.ts` -
   * `undefined` on an image that does not mark the groups.
   *
   * **IT COMES FROM THE CALLER FOR THE REASON `wireLinks` DOES**: which parts
   * stand in for an absent section is a fact about the board's `ScaffoldDoc`,
   * and this module holds no circuit knowledge.
   *
   * **IT IS A REQUIRED FIELD WHOSE VALUE MAY BE `undefined`, which is not the
   * same as an optional field.** Three of the four images in a packet mark no
   * groups although their board HAS them, and the fourth exists only to mark
   * them; `undefined` says "this image does not show the groups", which every
   * caller then has to state rather than omit. An empty marking would be a
   * third claim - "this board has no groups" - and `./clusters.ts` returns
   * `undefined` rather than one for exactly that reason.
   */
  readonly clusters: ClusterMarking | undefined
}

const HEADER_GAP = 12
const LEGEND_GAP = 16
const MARGIN = 12

function drawHeader(canvas: Canvas, dump: BoardDump, options: RenderOptions, top: number, left: number): void {
  const placed = dump.parts.filter((part) => part.placement !== "floating").length
  const side = options.view === "component" ? "Component side" : "Copper side, mirrored (holes keep their names)"
  const size =
    `${dump.grid.rows} x ${dump.grid.cols} holes (rows A-${rowName(dump.grid.rows - 1)}, columns 1-${dump.grid.cols})`
  // Each view's summary counts only what that image shows.
  const marks = `${dump.cuts.length} cuts, ${dump.bridges.length} solder bridges`
  // THE PAD COUNT IS ALWAYS PRINTED, INCLUDING ZERO, and that is the whole
  // point: a `PAD` line used to be skipped by keyword, so ten panel terminals
  // could leave a guide with nothing saying they had. A figure that appears only
  // when it is non-zero cannot be read as "this board has none".
  const summary =
    options.view === "component"
      ? `${placed} parts, ${options.pads.length} off-board pads, ${dump.wires.length} wire links, ${marks}`
      : marks
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

function markedStripItem(verticalStrips: boolean): LegendItem {
  const names = verticalStrips ? "columns 1, 5, 9 ..." : "rows A, E, I ..."
  return {
    symbol: (x, y) => line({ x: x - 8, y }, { x: x + 8, y }, { width: PITCH * 0.3, colour: MARKED_STRIP_GREY, cap: "butt" }),
    text: `every 4th strip (${names}), for alignment`,
  }
}

/**
 * The stand-in groups' key: one swatch per group, in the marking's order, then
 * what an UNHATCHED part means.
 *
 * **THE UNHATCHED ITEM IS NOT OPTIONAL AND IS NOT A COURTESY.** Four named
 * hatches leave the absence of a hatch meaning nothing in particular, which is
 * exactly the reading a builder needs when a hatch comes out faint on a bad
 * photocopy: the sentence says a part with no hatch is this board's own circuit
 * and is fitted in every build, so the faint case resolves to a question about
 * the print rather than about the board.
 *
 * **THE GROUP IS NAMED HERE AND NOWHERE ELSE ON THE DRAWING.** `docs/known-gaps.md`'s
 * G2 and G17 are what a third per-part string inside the board outline would
 * feed; see `./hatch.ts`.
 */
function clusterLegend(clusters: ClusterMarking | undefined): readonly LegendItem[] {
  if (clusters === undefined) return []
  return [
    ...clusters.groups.map((group) => ({
      symbol: (x: number, y: number): string => hatchSwatch({ x, y }, hatchFor(clusters, group), group),
      text: groupLegendText(group),
    })),
    { symbol: (x: number, y: number): string => plainSwatch({ x, y }), text: UNHATCHED_MEANS },
  ]
}

function legendItems(view: RenderOptions["view"], verticalStrips: boolean): readonly LegendItem[] {
  const common: LegendItem[] = [
    markedStripItem(verticalStrips),
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
      text: "wire link (W1, W2 ...)",
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
    {
      // The ring and the dot together, which is what a pad is drawn as - see
      // `padBody` in `./part-shapes.ts`.
      symbol: (x, y) =>
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(PITCH * 0.34)}" fill="none" stroke="${INK}" stroke-width="1.6"/>` +
        `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="2.4" fill="${INK}"/>`,
      text: "off-board wire solders here (RV.1, SW.2 ...)",
    },
  ]
}

function drawLegend(
  canvas: Canvas,
  frame: Frame,
  options: RenderOptions,
  top: number,
  left: number,
  width: number,
): void {
  const size = 8.5
  let x = left
  let y = top + LEGEND_GAP
  // THE GROUP KEY COMES LAST, after the marks every component-side image
  // carries: it is what this image adds, and a reader who knows the other
  // legend by heart finds the new items in one place.
  for (const item of [...legendItems(options.view, frame.verticalStrips), ...clusterLegend(options.clusters)]) {
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

function svgDocument(layers: readonly Canvas[], defs: readonly string[]): string {
  const b: Box = boundsOf(layers)
  const minX = b.minX - MARGIN
  const minY = b.minY - MARGIN
  const width = b.maxX - b.minX + 2 * MARGIN
  const height = b.maxY - b.minY + 2 * MARGIN
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(width)} ${fmt(height)}" ` +
      `width="${fmt(width)}" height="${fmt(height)}">`,
    // Emitted only when something points at one, so a drawing never carries a
    // definition nothing uses.
    ...(defs.length === 0 ? [] : ["<defs>", ...defs, "</defs>"]),
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
  // Validated for both views, so the copper view refuses the same boards.
  const placedOrRefused = placedParts(frame, dump, labels, options.wireLinks)
  validateEdgeLabels(dump, options.edgeLabels)
  // Built for both views, so the copper view refuses the same boards - the same
  // reason `placedParts` is called above whichever view this is. `drawnPads`
  // refuses a pad whose hole is off the board, which is the fault that makes
  // this call worth making whichever view is being drawn.
  const padsOrRefused = drawnPads(frame, options.pads)
  // Placed in this order - fixed geometry first, then edge labels, cut
  // numbers, wire numbers and part tags each clear of everything placed
  // before - but
  // stacked bottom to top as listed in `layers`, so cuts and labels are
  // never hidden under a body.
  const board = createCanvas()
  const clusters = createCanvas()
  const parts = createCanvas()
  const wires = createCanvas()
  const edges = createCanvas()
  const marks = createCanvas()
  const partLabels = createCanvas()
  const coordinates = createCanvas()
  const page = createCanvas()
  const occupied = createOccupied()
  const component = options.view === "component"
  const placed = component ? placedOrRefused : []
  // THE COMPONENT SIDE ONLY, following this module's own division rather than a
  // new one: the copper view shows "only strips, cuts and solder bridges". A pad
  // is soldered on the copper side like every other joint, so if that division
  // is wrong it is wrong for leads too - which is a question for whoever owns
  // the images, not one to settle here by drawing pads on both.
  const pads = component ? padsOrRefused : []
  const marking = options.clusters
  // THE COPPER VIEW REFUSES A MARKING RATHER THAN IGNORING ONE. It draws no
  // parts at all (see `placed` above), so there is nothing there to hatch, and
  // a copper sheet printed with the groups asked for and none drawn is
  // indistinguishable from a board that has no groups - the silence this image
  // exists to end.
  if (marking !== undefined && !component) {
    throw new Error(
      "renderLayout was given a stand-in-group marking for the copper view, which draws no parts " +
        "and so has nothing to hatch. Mark the groups on a component-side image (see " +
        "tools/guide/packet.ts), and pass clusters: undefined for the copper side.",
    )
  }
  drawBoard(board, frame)
  // UNDER THE PARTS, so every body, lead and wire stays exactly as the other
  // images draw it and the hatch reads as the ground a part stands on. It is
  // recorded in no `occupied`, so nothing placed afterwards moves because of
  // it: this image is the designators image with hatching added.
  if (marking !== undefined) {
    drawClusters(clusters, frame, placed, pads, marking)
  }
  if (component) {
    drawWires(wires, frame, dump, occupied.marks)
  }
  drawBridges(marks, frame, dump, occupied.marks)
  drawPartBodies(parts, placed, occupied)
  drawPadBodies(parts, pads, occupied)
  if (component) {
    drawEdgeLabels(edges, frame, dump, options.edgeLabels, occupied)
  }
  reserveCoordinates(frame, occupied.marks)
  drawCuts(marks, frame, dump, occupied)
  if (component) {
    drawWireNumbers(marks, frame, dump, occupied)
  }
  drawPartLabels(partLabels, placed, occupied)
  drawPadLabels(partLabels, pads, options.padLabels, occupied)
  drawCoordinates(coordinates, frame)
  const layers = [board, clusters, parts, wires, edges, marks, partLabels, coordinates]
  const drawn = boundsOf(layers)
  drawHeader(page, dump, options, drawn.minY, drawn.minX)
  drawLegend(page, frame, options, drawn.maxY, drawn.minX, drawn.maxX - drawn.minX)
  return svgDocument([...layers, page], marking === undefined ? [] : clusterDefs(frame, marking))
}
