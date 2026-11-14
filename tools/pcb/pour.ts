/**
 * THE GROUND POUR, MEASURED AND NOT JUDGED.
 *
 * `measurePour(boardPath)` reads a board that has already been through zone
 * refill and reports four things about its ground pour, as numbers:
 *
 *  - `continuityAroundU1` - the fraction of the length of U1's courtyard outline
 *    that lies on poured ground copper;
 *  - `narrowestBridgeMm` - the narrowest neck joining two bodies of the pour, on
 *    the layer where it is narrowest (`./pour-bridge.ts` says exactly what that
 *    is and is not);
 *  - `spokesByGroundPad` - for every through-hole ground pad, how many separate
 *    runs of copper cross the ring cut around it, summed over the pour layers;
 *  - `bypassReturn` - whether each supply bypass capacitor's ground pad shares a
 *    piece of pour with a ground pin of U1 (`"pour"`), or reaches ground by a
 *    track (`"track"`).
 *
 * **THIS IS A MEASUREMENT AND NOT A GATE, AND THERE IS NO THRESHOLD ANYWHERE IN
 * IT.** The owner was asked to set pour thresholds and declined, 2026-11-13: *"I
 * don't care about pour thresholds"* (`docs/known-gaps.md` G313). A declination
 * is not a delegation. An agent may never author the acceptance criteria for the
 * artifact it is producing, and his declining to author them does not hand that
 * right to the agent. So these numbers are reported beside the render and gate
 * nothing, indefinitely; the gates that decide whether the board is sound are
 * schematic parity, DRC at error severity and unconnected items, and they are
 * elsewhere. If you are about to write `if (narrowestBridgeMm < x)` here, that is
 * the defect this module was shaped to avoid.
 *
 * **IT REFUSES A BOARD WHOSE ZONES ARE UNFILLED** (`./pour-read.ts`,
 * `zone-unfilled`). A zone that was never refilled has no copper, and zeroes for a
 * pour that was never poured would be a skipped measurement that reads like a
 * clean one. Run `kicad-cli pcb drc --refill-zones --save-board <board>` first.
 *
 * **WHICH LAYERS, AND WHAT A NUMBER IS SUMMED OVER.** Every layer carrying ground
 * fill is measured. A through-hole pad is on all copper layers, so its spokes are
 * counted on each pour layer and added; the per-layer figures are returned
 * beside the total in `groundPads`. A spoke figure of 0 beside a covered
 * fraction of 1 is a pad merged into the pour with no relief cut around it; 0
 * beside 0 is a pad the pour does not touch. The two are different boards, and
 * only the pair of numbers says which.
 *
 * **SAMPLING.** Rings are read at `SAMPLE_STEP_MM` spacing against the saved
 * polygons themselves, not a raster. A run narrower than the step could be
 * missed; a thermal spoke is an order of magnitude wider than it.
 */
import fs from "node:fs"
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import { placedCourtyards } from "./board-outline.ts"
import { RESOLUTION_MM, measureLayer } from "./pour-bridge.ts"
import type { LayerBridge } from "./pour-bridge.ts"
import { pointInPolygon, ringAroundBox, ringAroundPad, signedDistanceToPad } from "./pour-geometry.ts"
import type { Pt } from "./pour-geometry.ts"
import { GROUND_NET, IC_REFERENCE, SUPPLY_NET, copperLayersOf, readGroundPour, readGroundTrackEnds, readNetPads } from "./pour-read.ts"
import type { GroundPour, NetPad } from "./pour-read.ts"
import { PourRefusal } from "./pour-refusal.ts"

export { PourRefusal, POUR_GUARDS } from "./pour-refusal.ts"
export type { PourGuard } from "./pour-refusal.ts"

export const SAMPLE_STEP_MM = 0.05

/** One ground pad's ring on one pour layer. */
export interface PadLayerReading {
  readonly layer: string
  /** Separate runs of copper that leave the ring uncovered at both ends. 0 for a ring covered all the way round. */
  readonly spokes: number
  /** Fraction of the ring's samples that lie on pour, 0 to 1. */
  readonly coveredFraction: number
}

export interface PourMetrics {
  /** Fraction, 0 to 1, of U1's courtyard outline on poured copper on ANY pour layer. */
  readonly continuityAroundU1: number
  readonly continuityAroundU1ByLayer: ReadonlyMap<string, number>
  /** The narrowest neck between two bodies on any pour layer, or null when no layer has two bodies to join. */
  readonly narrowestBridgeMm: number | null
  readonly bridgeByLayer: ReadonlyMap<string, LayerBridge>
  /** Keyed `REF-PAD`, one entry per through-hole ground pad. */
  readonly spokesByGroundPad: ReadonlyMap<string, number>
  readonly groundPads: ReadonlyMap<string, readonly PadLayerReading[]>
  /** `"pour"` only if every supply bypass capacitor's return rides the pour; otherwise `"track"`. */
  readonly bypassReturn: "pour" | "track"
  readonly bypassReturnByCap: ReadonlyMap<string, "pour" | "track">
  /** The raster pitch behind `narrowestBridgeMm`, so the figure is read with the resolution it came with. */
  readonly resolutionMm: number
}

/** The id of the pour polygon on `layer` that contains `p`, or -1. */
function polygonAt(pour: GroundPour, layer: string, p: Pt): number {
  for (const poly of pour.polygons) {
    if (poly.layer !== layer) continue
    const [x0, y0, x1, y1] = poly.bounds
    if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue
    if (pointInPolygon(p, poly.points)) return poly.id
  }
  return -1
}

interface RingReading extends PadLayerReading {
  readonly polygons: ReadonlySet<number>
}

function readRing(pour: GroundPour, layer: string, pad: NetPad, where: string): RingReading {
  const gap = pour.thermalGapMm.get(layer)
  if (gap === undefined) throw new PourRefusal("board-shape", `${where}: no thermal gap known for ${layer}.`)
  const hits = ringAroundPad(pad.outline, gap / 2, SAMPLE_STEP_MM).map((p) => polygonAt(pour, layer, p))
  const covered = hits.map((id) => id >= 0)
  let spokes = 0
  for (let i = 0; i < covered.length; i += 1) {
    if (covered[i] === true && covered[(i + 1) % covered.length] === false) spokes += 1
  }
  return {
    layer,
    spokes,
    coveredFraction: covered.filter(Boolean).length / covered.length,
    polygons: new Set(hits.filter((id) => id >= 0)),
  }
}

function readingsFor(pour: GroundPour, pad: NetPad, where: string): readonly RingReading[] {
  return pour.layers
    .filter((layer) => pad.layers.includes(layer))
    .map((layer) => readRing(pour, layer, pad, `${where}: pad ${pad.ref}-${pad.number}`))
}

function continuity(pour: GroundPour, boardText: string, where: string): Pick<PourMetrics, "continuityAroundU1" | "continuityAroundU1ByLayer"> {
  const courtyards = placedCourtyards(boardText, where).filter((c) => c.ref === IC_REFERENCE)
  if (courtyards.length !== 1) {
    throw new PourRefusal(
      "subject-missing",
      `${where} has ${courtyards.length} footprint(s) referenced ${IC_REFERENCE}; the continuity figure is "around ` +
        `${IC_REFERENCE}" and needs exactly one, with a courtyard to walk.`,
    )
  }
  const ring = ringAroundBox(courtyards[0]?.box ?? { x0: 0, y0: 0, x1: 0, y1: 0 }, SAMPLE_STEP_MM)
  const byLayer = new Map<string, number>()
  for (const layer of pour.layers) {
    byLayer.set(layer, ring.filter((p) => polygonAt(pour, layer, p) >= 0).length / ring.length)
  }
  const any = ring.filter((p) => pour.layers.some((layer) => polygonAt(pour, layer, p) >= 0)).length / ring.length
  return { continuityAroundU1: any, continuityAroundU1ByLayer: byLayer }
}

function bridges(pour: GroundPour): Pick<PourMetrics, "narrowestBridgeMm" | "bridgeByLayer" | "resolutionMm"> {
  const byLayer = new Map<string, LayerBridge>()
  let narrowest: number | null = null
  for (const layer of pour.layers) {
    const measured = measureLayer(pour.polygons.filter((p) => p.layer === layer).map((p) => p.points))
    byLayer.set(layer, measured)
    if (measured.narrowestBridgeMm !== null && (narrowest === null || measured.narrowestBridgeMm < narrowest)) {
      narrowest = measured.narrowestBridgeMm
    }
  }
  return { narrowestBridgeMm: narrowest, bridgeByLayer: byLayer, resolutionMm: RESOLUTION_MM }
}

function groundPadSpokes(pour: GroundPour, pads: readonly NetPad[], where: string): Pick<PourMetrics, "spokesByGroundPad" | "groundPads"> {
  const spokes = new Map<string, number>()
  const detail = new Map<string, readonly PadLayerReading[]>()
  for (const pad of pads.filter((p) => p.net === GROUND_NET && p.type === "thru_hole")) {
    const key = `${pad.ref}-${pad.number}`
    if (spokes.has(key)) {
      throw new PourRefusal(
        "board-shape",
        `${where}: two through-hole ground pads are both ${key}. The spoke count is keyed by reference and pad ` +
          "number, and two pads under one key would overwrite each other in the result.",
      )
    }
    const readings = readingsFor(pour, pad, where)
    spokes.set(key, readings.reduce((sum, r) => sum + r.spokes, 0))
    detail.set(key, readings.map(({ layer, spokes: s, coveredFraction }) => ({ layer, spokes: s, coveredFraction })))
  }
  if (spokes.size === 0) {
    throw new PourRefusal(
      "subject-missing",
      `${where} has no through-hole pad on net ${GROUND_NET}, so there is no pad to count spokes on. An empty ` +
        "table would read as every pad having none.",
    )
  }
  return { spokesByGroundPad: spokes, groundPads: detail }
}

function bypass(
  pour: GroundPour,
  pads: readonly NetPad[],
  ends: ReturnType<typeof readGroundTrackEnds>,
  where: string,
): Pick<PourMetrics, "bypassReturn" | "bypassReturnByCap"> {
  const icGround = pads.filter((p) => p.ref === IC_REFERENCE && p.net === GROUND_NET)
  if (icGround.length === 0) {
    throw new PourRefusal("subject-missing", `${where}: ${IC_REFERENCE} has no pad on net ${GROUND_NET}, so there is nothing for a bypass return to reach.`)
  }
  const reachable = new Set<number>()
  for (const pad of icGround) for (const r of readingsFor(pour, pad, where)) for (const id of r.polygons) reachable.add(id)

  const caps = [...new Set(pads.filter((p) => /^C\d+$/.test(p.ref) && p.net === SUPPLY_NET).map((p) => p.ref))]
  const byCap = new Map<string, "pour" | "track">()
  for (const ref of caps) {
    const returns = pads.filter((p) => p.ref === ref && p.net === GROUND_NET)
    if (returns.length === 0) continue
    const rides = returns.some((pad) => readingsFor(pour, pad, where).some((r) => [...r.polygons].some((id) => reachable.has(id))))
    if (rides) {
      byCap.set(ref, "pour")
      continue
    }
    const touched = returns.some((pad) =>
      ends.some((e) => pad.layers.includes(e.layer) && signedDistanceToPad(e.point, pad.outline) <= 0),
    )
    if (!touched) {
      throw new PourRefusal(
        "bypass-unconnected",
        `${where}: ${ref} sits between ${SUPPLY_NET} and ${GROUND_NET}, but its ground pad is on no piece of pour ` +
          `that a ${IC_REFERENCE} ground pin is on and no ${GROUND_NET} track ends on it. How its return reaches ` +
          "ground is not one of the two answers this figure gives, and it is not filed under either one by default.",
      )
    }
    byCap.set(ref, "track")
  }
  if (byCap.size === 0) {
    throw new PourRefusal(
      "subject-missing",
      `${where} has no capacitor (a reference of the form C<n>) between ${SUPPLY_NET} and ${GROUND_NET}, so there is ` +
        "no bypass return to ask about.",
    )
  }
  return { bypassReturn: [...byCap.values()].every((v) => v === "pour") ? "pour" : "track", bypassReturnByCap: byCap }
}

/** Measures the pour on the text of a saved, refilled board. `where` names it in refusals. */
export function measurePourText(boardText: string, where: string): PourMetrics {
  let root
  try {
    root = parseSexpr(boardText)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new PourRefusal("board-unreadable", `${where} is not a readable KiCad board (${reason}).`)
  }
  if (root.name !== "kicad_pcb") {
    throw new PourRefusal("board-unreadable", `${where} does not start with (kicad_pcb ...); it starts with (${root.name} ...).`)
  }
  const copper = copperLayersOf(root, where)
  const pour = readGroundPour(root, where, copper)
  const pads = readNetPads(root, where, copper)
  return {
    ...continuity(pour, boardText, where),
    ...bridges(pour),
    ...groundPadSpokes(pour, pads, where),
    ...bypass(pour, pads, readGroundTrackEnds(root, where), where),
  }
}

export function measurePour(boardPath: string): PourMetrics {
  if (!fs.existsSync(boardPath)) {
    throw new PourRefusal("board-unreadable", `no board at ${boardPath}.`)
  }
  return measurePourText(fs.readFileSync(boardPath, "utf8"), boardPath)
}
