/**
 * WHAT THE POUR DOES AT A PAD: the spokes on each through-hole ground pad, and
 * how each supply bypass capacitor's ground pad reaches the IC's ground.
 *
 * **SPOKES ARE REPORTED PER LAYER, NOT SUMMED.** KiCad cuts four spokes round a
 * 1.6 mm pad on each pour layer, and a sum across two layers reads 8: not what a
 * person who knows KiCad's default compares against, and not comparable with a
 * four-layer board, where the same relief reads 16.
 *
 * **0 SPOKES IS NOT ONE THING.** The board `route_planes.py` writes defaults to
 * `thermal_relief=False`, which emits `(connect_pads yes ...)`: every ground pad
 * is joined solid with no relief cut, and reads 0 spokes - beside a render, "0"
 * reads as starvation when it is the opposite. So each reading carries the zone's
 * DECLARED connection and the covered fraction: `yes` with 1.0 is a pad merged
 * into the pour; `thermal` with 0 spokes and 0.0 is a pad the pour does not
 * touch. Both read 0 spokes, and only the other two fields say which.
 *
 * **A BYPASS RETURN IS ONE OF FOUR FACTS, never a ranking of them:**
 * `"pour"` - the capacitor's ground pad shares a piece of fill with an IC ground
 * pad; `"track"` - a ground track ends on it; `"via"` - a ground via sits on it
 * (where the return goes from there is not followed); `"none-found"` - none of
 * those, which is what a board with its return still to route looks like, and is
 * a measured fact rather than a refusal. The overall figure is one of those only
 * when every capacitor agrees, and `"mixed"` otherwise: it was `every(pour)`,
 * which quietly ranked "pour" above "track".
 */
import { signedDistanceToPad, ringAroundPad } from "./pour-geometry.ts"
import type { GroundPour } from "./pour-read.ts"
import type { BoardPad, GroundTrack, GroundVia } from "./pour-read-pads.ts"
import { SAMPLE_STEP_MM, readLoop } from "./pour-sample.ts"
import type { LoopReading } from "./pour-sample.ts"
import { PourRefusal } from "./pour-refusal.ts"
import { measured, unavailable } from "./pour-types.ts"
import type { BypassKind, BypassReturn, Reading, SpokeReading } from "./pour-types.ts"

/** Reads the ring cut round `pad` on each pour layer it is on. */
function ringReadings(pour: GroundPour, pad: BoardPad): ReadonlyMap<string, LoopReading & { declaredConnection: string }> {
  const out = new Map<string, LoopReading & { declaredConnection: string }>()
  for (const layer of pour.layers.filter((l) => pad.layers.includes(l))) {
    const settings = pour.settingsByLayer.get(layer)
    if (settings === undefined) continue
    const ring = ringAroundPad(pad.outline, settings.thermalGapMm / 2, SAMPLE_STEP_MM)
    out.set(layer, { ...readLoop(pour, layer, ring), declaredConnection: settings.connection })
  }
  return out
}

export function spokesOn(pour: GroundPour, groundPads: readonly BoardPad[]): Reading<ReadonlyMap<string, ReadonlyMap<string, SpokeReading>>> {
  const out = new Map<string, ReadonlyMap<string, SpokeReading>>()
  for (const pad of groundPads.filter((p) => p.type === "thru_hole")) {
    const key = `${pad.ref}-${pad.number}`
    if (out.has(key)) {
      throw new PourRefusal(
        "board-shape",
        `two through-hole ground pads are both ${key}. The spoke table is keyed by reference and pad number, and ` +
          "two pads under one key would overwrite each other.",
      )
    }
    const layers = new Map<string, SpokeReading>()
    for (const [layer, r] of ringReadings(pour, pad)) {
      layers.set(layer, { spokes: r.spokes, coveredFraction: r.coveredFraction, declaredConnection: r.declaredConnection })
    }
    out.set(key, layers)
  }
  if (out.size === 0) {
    return unavailable(
      "no through-hole pad is on the ground net, so there is no pad to count spokes on. Surface-mount ground pads are " +
        "not read, and an empty table would read as every pad having none.",
    )
  }
  return measured(out)
}

function touchesTrack(pad: BoardPad, tracks: readonly GroundTrack[]): boolean {
  return tracks.some(
    (t) =>
      pad.layers.includes(t.layer) &&
      t.path.some((point) => signedDistanceToPad(point, pad.outline) <= t.widthMm / 2),
  )
}

function touchesVia(pad: BoardPad, vias: readonly GroundVia[]): boolean {
  return vias.some((v) => signedDistanceToPad(v.at, pad.outline) <= v.diameterMm / 2)
}

export function bypassReturnOf(
  pour: GroundPour,
  pads: readonly BoardPad[],
  icReference: string,
  supplyNet: string,
  groundNet: string,
  tracks: readonly GroundTrack[],
  vias: readonly GroundVia[],
): Reading<BypassReturn> {
  const icGround = pads.filter((p) => p.ref === icReference && p.net === groundNet)
  if (icGround.length === 0) {
    return unavailable(`${icReference} has no pad on net ${groundNet}, so there is nothing for a bypass return to reach.`)
  }
  const reachable = new Set<number>()
  for (const pad of icGround) for (const r of ringReadings(pour, pad).values()) for (const id of r.polygons) reachable.add(id)

  const caps = [...new Set(pads.filter((p) => /^C\d+$/.test(p.ref) && p.net === supplyNet).map((p) => p.ref))]
  const byCap = new Map<string, BypassKind>()
  for (const ref of caps) {
    const returns = pads.filter((p) => p.ref === ref && p.net === groundNet)
    if (returns.length === 0) continue
    const rides = returns.some((pad) => [...ringReadings(pour, pad).values()].some((r) => [...r.polygons].some((id) => reachable.has(id))))
    if (rides) byCap.set(ref, "pour")
    else if (returns.some((pad) => touchesTrack(pad, tracks))) byCap.set(ref, "track")
    else if (returns.some((pad) => touchesVia(pad, vias))) byCap.set(ref, "via")
    else byCap.set(ref, "none-found")
  }
  if (byCap.size === 0) {
    return unavailable(
      `no capacitor (a reference of the form C<n>) sits between ${supplyNet} and ${groundNet}, so there is no bypass return to ask about.`,
    )
  }
  const kinds = new Set(byCap.values())
  const only = [...kinds][0]
  return measured({ overall: kinds.size === 1 && only !== undefined ? only : "mixed", byCap })
}
