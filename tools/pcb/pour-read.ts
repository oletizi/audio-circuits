/**
 * WHAT `./pour.ts` READS OFF A SAVED BOARD, and every place it refuses rather
 * than reads a guess.
 *
 * The board must be one that has ALREADY BEEN THROUGH ZONE REFILL AND SAVED:
 * `kicad-cli pcb drc --refill-zones --save-board <board>` writes the fill back as
 * `(filled_polygon ...)` forms inside each zone. Before that, a pour does not
 * exist as copper - the zone is only its outline - and reading such a board as
 * "no copper, so zeroes" is a skipped measurement dressed as a clean one. That is
 * the one refusal this module exists for: `readGroundPour` throws
 * `zone-unfilled` for a ground zone that has no saved fill on any layer it
 * claims.
 *
 * WHAT IT CANNOT TELL, stated here because a reader will assume otherwise: a fill
 * that is present is taken as current. A board edited after its last refill still
 * carries the old polygons and reads as filled. Refilling is the caller's step,
 * and a measurement is only as fresh as the refill behind it.
 *
 * NET NAMES ARE LITERAL (`GND`, `+5V`) and the reference of the delay IC is `U1`.
 * They are `pt2399-core`'s own, named once below, and a board lacking them is
 * refused by `./pour.ts` with what was missing rather than measured against a
 * different net.
 */
import { child, children } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { toBoard } from "./pour-geometry.ts"
import type { PadOutline, Pt } from "./pour-geometry.ts"
import { PourRefusal } from "./pour-refusal.ts"

export const GROUND_NET = "GND"
export const SUPPLY_NET = "+5V"
export const IC_REFERENCE = "U1"

export interface PourPolygon {
  /** Index among this board's ground fill polygons. KiCad writes one polygon per connected piece of copper. */
  readonly id: number
  readonly layer: string
  readonly points: readonly Pt[]
  /** [minX, minY, maxX, maxY], so a point test can skip a polygon it is nowhere near. */
  readonly bounds: readonly [number, number, number, number]
}

export interface GroundPour {
  readonly polygons: readonly PourPolygon[]
  /** Layers carrying ground fill, in board order. */
  readonly layers: readonly string[]
  /** Each pour layer's thermal gap, as the zone that fills it declares it. */
  readonly thermalGapMm: ReadonlyMap<string, number>
}

function num(text: string | undefined, what: string, where: string): number {
  const value = Number(text)
  if (text === undefined || text === "" || !Number.isFinite(value)) {
    throw new PourRefusal("board-shape", `${where}: ${what} is ${JSON.stringify(text)}, not a number.`)
  }
  return value
}

/** Names of the board's copper layers, in the order the board declares them. */
export function copperLayersOf(root: SNode, where: string): readonly string[] {
  const layers = child(root, "layers")
  if (layers === undefined) throw new PourRefusal("board-shape", `${where} declares no (layers ...) table.`)
  const out = layers.nodes
    .filter((n) => ["signal", "power", "mixed", "jumper"].includes(n.atoms[1] ?? ""))
    .map((n) => n.atoms[0] ?? "")
  if (out.length === 0) throw new PourRefusal("board-shape", `${where} declares no copper layer.`)
  return out
}

/** A zone's or a pad's layer names with `*.Cu` and `F&B.Cu` expanded to the board's copper layers. */
function expandLayers(names: readonly string[], copper: readonly string[]): readonly string[] {
  const out: string[] = []
  for (const name of names) {
    if (name === "*.Cu") out.push(...copper)
    else if (name === "F&B.Cu") out.push("F.Cu", "B.Cu")
    else if (name.endsWith(".Cu")) out.push(name)
  }
  return [...new Set(out)]
}

function zoneLayers(zone: SNode, copper: readonly string[], where: string): readonly string[] {
  const names = child(zone, "layers")?.atoms ?? child(zone, "layer")?.atoms ?? []
  const layers = expandLayers(names, copper)
  if (layers.length === 0) {
    throw new PourRefusal("board-shape", `${where} names no copper layer (neither (layers ...) nor (layer ...)).`)
  }
  return layers
}

function polygonPoints(fill: SNode, where: string): readonly Pt[] {
  const pts = child(fill, "pts")
  if (pts === undefined) throw new PourRefusal("board-shape", `${where} has no (pts ...).`)
  const out: Pt[] = []
  for (const point of pts.nodes) {
    if (point.name !== "xy") {
      throw new PourRefusal(
        "board-shape",
        `${where} holds a (${point.name} ...) inside its points. Only straight (xy ...) vertices are read: ` +
          "an arc would have to be flattened, and a flattening chosen here would be a guess at the copper.",
      )
    }
    out.push([num(point.atoms[0], "an x coordinate", where), num(point.atoms[1], "a y coordinate", where)])
  }
  if (out.length < 3) throw new PourRefusal("board-shape", `${where} has ${out.length} point(s); a polygon needs three.`)
  return out
}

export function readGroundPour(root: SNode, where: string, copper: readonly string[]): GroundPour {
  // A Rule Area (keepout) carries no net, so the net filter alone leaves it out.
  const zones = children(root, "zone").filter((z) => child(z, "net")?.atoms[0] === GROUND_NET)
  if (zones.length === 0) {
    throw new PourRefusal(
      "no-ground-zone",
      `${where} has no zone on net ${GROUND_NET}, so there is no pour to measure. Rule Areas (keepouts) do not ` +
        "count. A board with no pour is not reported as a pour with nothing in it.",
    )
  }
  const polygons: PourPolygon[] = []
  const gaps = new Map<string, number>()
  for (const zone of zones) {
    const name = child(zone, "name")?.atoms[0] ?? child(zone, "uuid")?.atoms[0] ?? "(unnamed)"
    const zoneWhere = `${where}: ground zone ${name}`
    const layers = zoneLayers(zone, copper, zoneWhere)
    const fills = children(zone, "filled_polygon")
    for (const layer of layers) {
      if (!fills.some((f) => child(f, "layer")?.atoms[0] === layer)) {
        throw new PourRefusal(
          "zone-unfilled",
          `${zoneWhere} has no (filled_polygon ...) on ${layer}, so it has not been poured there - the zone is ` +
            "an outline, not copper. Measuring it would report zeroes for a pour that does not exist yet, which " +
            "is a skipped check that looks like a clean one. Refill and save the board first: " +
            "`kicad-cli pcb drc --refill-zones --save-board <board>` (--save-board is rejected without " +
            "--refill-zones on the pinned KiCad), then measure the saved board. It is not defaulted to an empty " +
            "pour, because an empty pour and an unpoured one are different boards.",
        )
      }
    }
    const gapText = child(child(zone, "fill") ?? zone, "thermal_gap")?.atoms[0]
    if (gapText === undefined) {
      throw new PourRefusal(
        "board-shape",
        `${zoneWhere} declares no (thermal_gap ...) inside its (fill ...). The ring a pad's spokes are counted on ` +
          "is placed from that gap, and a gap assumed here would count spokes on a ring the copper was never cut around.",
      )
    }
    const gap = num(gapText, "thermal_gap", zoneWhere)
    for (const layer of layers) {
      const known = gaps.get(layer)
      if (known !== undefined && known !== gap) {
        throw new PourRefusal(
          "board-shape",
          `${where}: two ground zones on ${layer} declare thermal gaps ${known} and ${gap}. Spokes are counted on a ` +
            "ring placed from the gap, and which zone's ring a pad belongs to is not decided here.",
        )
      }
      gaps.set(layer, gap)
    }
    for (const fill of fills) {
      const layer = child(fill, "layer")?.atoms[0]
      if (layer === undefined) throw new PourRefusal("board-shape", `${zoneWhere} has a (filled_polygon ...) with no (layer ...).`)
      const points = polygonPoints(fill, `${zoneWhere} filled polygon on ${layer}`)
      const xs = points.map((p) => p[0])
      const ys = points.map((p) => p[1])
      polygons.push({
        id: polygons.length,
        layer,
        points,
        bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      })
    }
  }
  const layers = copper.filter((l) => polygons.some((p) => p.layer === l))
  return { polygons, layers, thermalGapMm: gaps }
}

/** A pad on the ground or supply net, with its copper outline in board coordinates. */
export interface NetPad {
  readonly ref: string
  readonly number: string
  readonly type: string
  readonly net: string
  readonly layers: readonly string[]
  readonly outline: PadOutline
}

export function readNetPads(root: SNode, where: string, copper: readonly string[]): readonly NetPad[] {
  const out: NetPad[] = []
  for (const footprint of children(root, "footprint")) {
    const ref =
      footprint.nodes.find((n) => n.name === "property" && n.atoms[0] === "Reference")?.atoms[1] ?? footprint.atoms[0] ?? "?"
    for (const pad of children(footprint, "pad")) {
      const net = child(pad, "net")?.atoms[0]
      if (net !== GROUND_NET && net !== SUPPLY_NET) continue
      const number = pad.atoms[0] ?? ""
      const padWhere = `${where}: pad ${ref}-${number}`
      if ((child(footprint, "layer")?.atoms[0] ?? "") !== "F.Cu") {
        throw new PourRefusal(
          "board-shape",
          `${padWhere} is on a footprint that is not on F.Cu. A back-side footprint is stored mirrored and this ` +
            "reader does not unmirror it; it is refused rather than measured at the wrong place.",
        )
      }
      const at = child(footprint, "at")
      const padAt = child(pad, "at")
      const size = child(pad, "size")
      if (at === undefined || padAt === undefined || size === undefined) {
        throw new PourRefusal("board-shape", `${padWhere} or its footprint lacks an (at ...) or (size ...).`)
      }
      const shape = pad.atoms[2] ?? ""
      const w = num(size.atoms[0], "pad width", padWhere)
      const h = num(size.atoms[1], "pad height", padWhere)
      let radius: number
      if (shape === "circle") radius = Math.min(w, h) / 2
      else if (shape === "oval") radius = Math.min(w, h) / 2
      else if (shape === "rect") radius = 0
      else if (shape === "roundrect") {
        const ratio = child(pad, "roundrect_rratio")?.atoms[0]
        if (ratio === undefined) {
          throw new PourRefusal("board-shape", `${padWhere} is a roundrect with no (roundrect_rratio ...); its corner radius is not guessed.`)
        }
        radius = num(ratio, "roundrect_rratio", padWhere) * Math.min(w, h)
      } else {
        throw new PourRefusal(
          "board-shape",
          `${padWhere} has shape "${shape}". Only circle, oval, rect and roundrect outlines are read; a trapezoid or ` +
            "custom pad would be approximated, and the ring spokes are counted on is placed from that outline.",
        )
      }
      const centre = toBoard(
        [num(padAt.atoms[0], "pad x", padWhere), num(padAt.atoms[1], "pad y", padWhere)],
        [num(at.atoms[0], "footprint x", padWhere), num(at.atoms[1], "footprint y", padWhere)],
        at.atoms[2] === undefined ? 0 : num(at.atoms[2], "footprint rotation", padWhere),
      )
      out.push({
        ref,
        number,
        type: pad.atoms[1] ?? "",
        net,
        layers: expandLayers(child(pad, "layers")?.atoms ?? [], copper),
        // A pad's own angle is absolute in a saved board; see ./pour-geometry.ts.
        outline: {
          centre,
          hx: w / 2,
          hy: h / 2,
          radius,
          degrees: padAt.atoms[2] === undefined ? 0 : num(padAt.atoms[2], "pad angle", padWhere),
        },
      })
    }
  }
  return out
}

/** Where a ground track starts or ends, and how wide it is there. */
export interface TrackEnd {
  readonly layer: string
  readonly point: Pt
  readonly widthMm: number
}

export function readGroundTrackEnds(root: SNode, where: string): readonly TrackEnd[] {
  const out: TrackEnd[] = []
  for (const track of root.nodes.filter((n) => n.name === "segment" || n.name === "arc")) {
    if (child(track, "net")?.atoms[0] !== GROUND_NET) continue
    const layer = child(track, "layer")?.atoms[0]
    const width = num(child(track, "width")?.atoms[0], "track width", where)
    if (layer === undefined) throw new PourRefusal("board-shape", `${where}: a ${track.name} on ${GROUND_NET} has no (layer ...).`)
    for (const end of ["start", "end"]) {
      const node = child(track, end)
      if (node === undefined) throw new PourRefusal("board-shape", `${where}: a ${track.name} on ${GROUND_NET} has no (${end} ...).`)
      out.push({
        layer,
        point: [num(node.atoms[0], `track ${end} x`, where), num(node.atoms[1], `track ${end} y`, where)],
        widthMm: width,
      })
    }
  }
  return out
}
