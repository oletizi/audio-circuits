/**
 * WHAT `./pour.ts` READS OFF A SAVED BOARD'S ZONES, and every place it refuses
 * rather than reads a guess. Pads, tracks and vias are in `./pour-read-pads.ts`.
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
 * A RULE AREA IS LEFT OUT BY ITS `(keepout ...)` FORM, NOT BY HAVING NO NET.
 * KiCad 10 strips the net from a Rule Area when it SAVES a board - measured on the
 * pinned 10.0.5 - so on a board that has been through `--save-board` the net
 * filter alone would exclude one. This reader is also pointed at boards that have
 * not been through that save, where a hand-authored keepout can carry a net and
 * would otherwise read as a ground zone with no fill, and refuse as unfilled.
 */
import { child, children } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import type { Pt } from "./pour-geometry.ts"
import { PourRefusal } from "./pour-refusal.ts"

export interface PourPolygon {
  /** Index among this board's ground fill polygons. KiCad writes one polygon per connected piece of copper. */
  readonly id: number
  readonly layer: string
  readonly points: readonly Pt[]
  /** [minX, minY, maxX, maxY], so a point test can skip a polygon it is nowhere near. */
  readonly bounds: readonly [number, number, number, number]
}

/** What the ground zone filling one layer declares. */
export interface ZoneSettings {
  readonly thermalGapMm: number
  /** `thermal` when the zone's (connect_pads ...) names no mode (KiCad's default), else `yes`, `no` or `thru_hole_only`. */
  readonly connection: string
}

export interface GroundPour {
  readonly polygons: readonly PourPolygon[]
  /** Layers carrying ground fill, in board order. */
  readonly layers: readonly string[]
  readonly settingsByLayer: ReadonlyMap<string, ZoneSettings>
}

export function num(text: string | undefined, what: string, where: string): number {
  const value = Number(text)
  if (text === undefined || text === "" || !Number.isFinite(value)) {
    throw new PourRefusal("board-shape", `${where}: ${what} is ${JSON.stringify(text)}, not a number.`)
  }
  return value
}

function stackPosition(layer: string, where: string): number {
  if (layer === "F.Cu") return -1
  if (layer === "B.Cu") return Number.MAX_SAFE_INTEGER
  const inner = /^In(\d+)\.Cu$/.exec(layer)
  if (inner === null) {
    throw new PourRefusal("board-shape", `${where}: copper layer "${layer}" is not F.Cu, B.Cu or In<n>.Cu, so its place in the stack is not known.`)
  }
  return Number(inner[1])
}

/**
 * Names of the board's copper layers in STACK order (F.Cu, In1.Cu ... InN.Cu,
 * B.Cu), not the order the board declares them in - KiCad lists B.Cu by its id,
 * ahead of the inner layers - because a via's layer span is a range of the stack.
 */
export function copperLayersOf(root: SNode, where: string): readonly string[] {
  const layers = child(root, "layers")
  if (layers === undefined) throw new PourRefusal("board-shape", `${where} declares no (layers ...) table.`)
  const out = layers.nodes
    .filter((n) => ["signal", "power", "mixed", "jumper"].includes(n.atoms[1] ?? ""))
    .map((n) => n.atoms[0] ?? "")
  if (out.length === 0) throw new PourRefusal("board-shape", `${where} declares no copper layer.`)
  return [...out].sort((a, b) => stackPosition(a, where) - stackPosition(b, where))
}

/** A zone's or a pad's layer names with `*.Cu` and `F&B.Cu` expanded to the board's copper layers. */
export function expandLayers(names: readonly string[], copper: readonly string[]): readonly string[] {
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

function settingsOf(zone: SNode, where: string): ZoneSettings {
  const gapText = child(child(zone, "fill") ?? zone, "thermal_gap")?.atoms[0]
  if (gapText === undefined) {
    throw new PourRefusal(
      "board-shape",
      `${where} declares no (thermal_gap ...) inside its (fill ...). The ring a pad's spokes are counted on ` +
        "is placed from that gap, and a gap assumed here would count spokes on a ring the copper was never cut around.",
    )
  }
  const connect = child(zone, "connect_pads")
  const mode = connect?.atoms[0]
  return {
    thermalGapMm: num(gapText, "thermal_gap", where),
    connection: mode === "yes" || mode === "no" || mode === "thru_hole_only" ? mode : "thermal",
  }
}

export function readGroundPour(root: SNode, where: string, copper: readonly string[], groundNet: string): GroundPour {
  const zones = children(root, "zone").filter(
    (z) => child(z, "keepout") === undefined && child(z, "net")?.atoms[0] === groundNet,
  )
  if (zones.length === 0) {
    throw new PourRefusal(
      "no-ground-zone",
      `${where} has no zone on net ${groundNet}, so there is no pour to measure. Rule Areas (keepouts) do not ` +
        "count. A board with no pour is not reported as a pour with nothing in it.",
    )
  }
  const polygons: PourPolygon[] = []
  const settingsByLayer = new Map<string, ZoneSettings>()
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
    const settings = settingsOf(zone, zoneWhere)
    for (const layer of layers) {
      const known = settingsByLayer.get(layer)
      if (known !== undefined && known.thermalGapMm !== settings.thermalGapMm) {
        throw new PourRefusal(
          "board-shape",
          `${where}: two ground zones on ${layer} declare thermal gaps ${known.thermalGapMm} and ${settings.thermalGapMm}. ` +
            "Spokes are counted on a ring placed from the gap, and which zone's ring a pad belongs to is NOT decided " +
            "here - it could be, by which zone's polygon contains the pad, and that is not written.",
        )
      }
      settingsByLayer.set(layer, settings)
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
  return { polygons, layers, settingsByLayer }
}
