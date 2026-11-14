/**
 * THE GROUND POUR, MEASURED AND NOT JUDGED.
 *
 * `measurePour(boardPath, subject)` reads a board that has already been through
 * zone refill and reports, as numbers, what the saved ground fill is like. The
 * four figures the plan names, and what each one is (`./pour-types.ts` has the
 * shapes):
 *
 *  - `continuityAroundIc` - for each pour layer, how much of a loop round the IC
 *    lies on poured copper, the lengths of its breaks, and how many pieces of
 *    copper it touches (`./pour-continuity.ts`, which says where the loop is and
 *    why);
 *  - `narrowestBridgeMm` - the narrowest ground track joining two SEPARATE
 *    pieces of fill (`./pour-joins.ts`), or the reason there is none to report;
 *    beside it `narrowestNeckMm`, the narrowest constriction WITHIN connected
 *    fill (`./pour-bridge.ts`);
 *  - `spokesByGroundPad` - for every through-hole ground pad, per pour layer,
 *    the spokes the pour leaves across the ring cut round it (`./pour-pads.ts`);
 *  - `bypassReturn` - for each supply bypass capacitor, whether its ground pad
 *    reaches the IC's ground by pour, track or via, or none of them.
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
 * **IT DOES NOT REFUSE A BOARD FOR LACKING A SUBJECT.** A board with no
 * through-hole ground pad, or whose bypass return it cannot file, reports the
 * figures it can and marks the others `unavailable` with the reason
 * (`./pour-types.ts`).
 *
 * **DEVIATIONS FROM THE PLAN'S INTERFACE, recorded here because the plan's
 * workspace is not committed and a later reader cannot re-derive them:**
 *  - `measurePour` takes a required `PourSubject` (ground net, supply net, IC
 *    reference). The plan's `measurePour(boardPath)` assumed `GND`, `+5V` and `U1`,
 *    which refuses any other circuit; `PT2399_CORE` is this board's.
 *  - `continuityAroundU1` is `continuityAroundIc`, per layer, with break lengths.
 *  - `narrowestBridgeMm` is a `Reading<number>` and means a join between regions;
 *    the fill's constriction is `narrowestNeckMm`.
 *  - `spokesByGroundPad` is per pad, per layer, with the zone's declared
 *    connection; it is not a sum.
 *  - `bypassReturn` is `pour | track | via | none-found | mixed`, not
 *    `pour | track`, and is a `Reading`.
 *
 * **NOT DELIVERED, and why:** two ground zones on one layer with different thermal
 * gaps are refused rather than resolved by which zone contains the pad (it could
 * be, and is not written); surface-mount ground pads get no spoke reading (the
 * plan names through-hole); a neighbour's pad void that reaches the continuity
 * loop reads as a break (the fill alone cannot tell it from a gap in the pour).
 *
 * **NOT PINNED BY ANY TEST, found by mutation:** the raster's half-pixel column
 * offset (`./pour-bridge.ts`) and the minimum sample count of a resampled loop
 * (`./pour-geometry.ts`); both move a figure by less than one pixel or sample.
 * The join filter in `narrowestBridge` that keeps only layers with more than one
 * region is equivalent to not having it on any board where separate polygons are
 * not raster-adjacent, so no test can tell the two apart.
 */
import fs from "node:fs"
import { parseSexpr } from "../../lib/kicad/sexpr.ts"
import type { SNode } from "../../lib/kicad/sexpr.ts"
import { continuityAround } from "./pour-continuity.ts"
import { NOISE_FLOOR_MM, RESOLUTION_MM, measureLayer } from "./pour-bridge.ts"
import { bypassReturnOf, spokesOn } from "./pour-pads.ts"
import { narrowestBridge, regionJoins, viaLinks } from "./pour-joins.ts"
import { copperLayersOf, readGroundPour } from "./pour-read.ts"
import type { GroundPour } from "./pour-read.ts"
import { readGroundTracks, readGroundVias, readPads } from "./pour-read-pads.ts"
import { PourRefusal } from "./pour-refusal.ts"
import type { PourMetrics, PourSubject } from "./pour-types.ts"

export { PourRefusal, POUR_GUARDS } from "./pour-refusal.ts"
export type { PourGuard } from "./pour-refusal.ts"
export { PT2399_CORE, measured, unavailable } from "./pour-types.ts"
export type {
  BypassKind, BypassReturn, LoopContinuity, PourMetrics, PourSubject, Reading, RegionJoin, SpokeReading, ViaLink,
} from "./pour-types.ts"
export { SAMPLE_STEP_MM } from "./pour-sample.ts"

function necks(pour: GroundPour): Pick<PourMetrics, "regionsByLayer" | "narrowestNeckMm" | "neckByLayer"> {
  const regionsByLayer = new Map<string, number>()
  const neckByLayer = new Map<string, number | null>()
  let narrowest: number | null = null
  for (const layer of pour.layers) {
    const measured = measureLayer(pour.polygons.filter((p) => p.layer === layer).map((p) => p.points))
    regionsByLayer.set(layer, measured.regions)
    neckByLayer.set(layer, measured.narrowestNeckMm)
    if (measured.narrowestNeckMm !== null && (narrowest === null || measured.narrowestNeckMm < narrowest)) {
      narrowest = measured.narrowestNeckMm
    }
  }
  return { regionsByLayer, narrowestNeckMm: narrowest, neckByLayer }
}

/** Measures the pour on the text of a saved, refilled board. `where` names it in refusals. */
export function measurePourText(boardText: string, where: string, subject: PourSubject): PourMetrics {
  let root: SNode
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
  const pour = readGroundPour(root, where, copper, subject.groundNet)
  const { groundNet, supplyNet, icReference } = subject
  const pads = readPads(root, where, copper, (ref, net) => ref === icReference || net === groundNet || net === supplyNet)
  const tracks = readGroundTracks(root, where, groundNet)
  const vias = readGroundVias(root, where, groundNet)
  const regions = necks(pour)
  const joins = regionJoins(pour, tracks)
  return {
    resolutionMm: RESOLUTION_MM,
    noiseFloorMm: NOISE_FLOOR_MM,
    ...regions,
    narrowestBridgeMm: narrowestBridge(regions.regionsByLayer, joins),
    regionJoins: joins,
    viaLinks: viaLinks(pour, vias),
    continuityAroundIc: continuityAround(pour, pads.filter((p) => p.ref === icReference), icReference),
    spokesByGroundPad: spokesOn(pour, pads.filter((p) => p.net === groundNet)),
    bypassReturn: bypassReturnOf(pour, pads, icReference, supplyNet, groundNet, tracks, vias),
  }
}

export function measurePour(boardPath: string, subject: PourSubject): PourMetrics {
  if (!fs.existsSync(boardPath)) {
    throw new PourRefusal("board-unreadable", `no board at ${boardPath}.`)
  }
  return measurePourText(fs.readFileSync(boardPath, "utf8"), boardPath, subject)
}
