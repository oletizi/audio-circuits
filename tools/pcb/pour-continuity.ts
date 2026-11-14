/**
 * HOW UNBROKEN THE GROUND IS AROUND THE IC, measured on a loop that is clear of
 * the IC's own pad voids - and what that choice is pinned by.
 *
 * **THE LOOP IS THE IC'S PAD EXTENT GROWN BY THE LARGEST CLEARANCE THAT APPLIES
 * PLUS THE ZONE'S THERMAL GAP, and that placement is the whole of this figure.** Task 9's first
 * version walked the courtyard's bounding box instead. On a DIP-16 that box sits
 * 1.055 mm from the pad centres, INSIDE the 1.3 mm void the pour leaves round each
 * pad, so the loop crossed sixteen of the IC's own pad voids and read 0.593 on
 * a pour with no break in it anywhere; the same loop 0.3 mm further out read
 * exactly 1.0000. A confident wrong number beside a render is worse than none,
 * and that one had a ceiling set by the footprint rather than by the pour.
 *
 * Grown by clearance + gap, the loop lies beyond the deepest void a pad of the IC
 * can have (a connected pad's is the thermal gap, an unconnected one's is the
 * clearance, and the loop clears both added together). THE CLEARANCE IS THE
 * LARGEST OF THE ZONE'S OWN AND EVERYTHING THE PROJECT DECLARES (`./pour-project.ts`):
 * KiCad cuts the fill at the largest that applies, so placing the loop from the
 * zone's alone would reintroduce the 0.593 on any board whose netclass clearance is
 * larger, with a deficit that belongs to the footprint and not the pour. It is a box, not an
 * outline: the axis-aligned extent of the pads' copper, so for an IC turned to a
 * non-right angle it is a box round the part rather than a curve following it.
 *
 * WHAT IT STILL SEES that is not the pour's fault, RECORDED AND NOT FIXED: a void
 * belonging to a NEIGHBOUR of the IC that reaches the loop reads as a break,
 * because from the fill alone a neighbour's pad void and a gap in the pour look the
 * same, and a way of guessing which is which would be an invention. The breaks
 * are therefore reported as lengths, so a reader can tell one 5 mm gap from a
 * 1.5 mm void, and the pieces of copper the loop touches as a count, so one gap
 * can be told from fifty - which a coverage fraction cannot.
 *
 * **COVERAGE AND CONNECTEDNESS ARE BOTH REPORTED, SO THAT NOBODY HAS TO DEFINE
 * "CONTINUITY".** The owner declined to engage with pour metrics (G313) and an
 * agent may not decide for him what the word means. `coveredFraction` and `breaksMm`
 * answer "is there ground all the way round"; `connectedGroupsTouched` answers "is
 * that ground one electrical piece", counting two polygons as one when a track, a
 * via, a ground pad or fill on the other layer joins them (`./pour-connectivity.ts`).
 * `fillPiecesTouched` is the bare polygon count and is NOT the connectivity answer:
 * pieces joined elsewhere and pieces that are isolated both read 2 there, and only
 * the groups figure tells them apart.
 */
import { ringAroundBox, ringAroundPad } from "./pour-geometry.ts"
import type { Pt } from "./pour-geometry.ts"
import type { GroundPour } from "./pour-read.ts"
import type { BoardPad } from "./pour-read-pads.ts"
import type { ProjectClearance } from "./pour-project.ts"
import { SAMPLE_STEP_MM, readLoop } from "./pour-sample.ts"
import { measured, unavailable } from "./pour-types.ts"
import type { LoopContinuity, Reading } from "./pour-types.ts"

/** The axis-aligned box that contains every pad's copper. */
export function padExtent(pads: readonly BoardPad[]): { x0: number; y0: number; x1: number; y1: number } {
  const points: Pt[] = pads.flatMap((pad) => ringAroundPad(pad.outline, 0, SAMPLE_STEP_MM))
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

export function continuityAround(
  pour: GroundPour,
  icPads: readonly BoardPad[],
  icReference: string,
  project: Reading<ProjectClearance>,
  groups: ReadonlyMap<number, number>,
): Reading<ReadonlyMap<string, LoopContinuity>> {
  if (project.kind === "unavailable") return unavailable(project.reason)
  if (icPads.length === 0) {
    return unavailable(`no pad was read for a footprint referenced ${icReference}, so there is no part to walk a loop around.`)
  }
  const extent = padExtent(icPads)
  const out = new Map<string, LoopContinuity>()
  for (const layer of pour.layers) {
    const settings = pour.settingsByLayer.get(layer)
    if (settings === undefined || settings.clearanceMm === null) {
      return unavailable(
        `the ground zone on ${layer} declares no (connect_pads (clearance ...)), and the loop round ${icReference} is ` +
          "placed from it: without it the loop could sit inside the IC's own pad voids and read them as breaks in the pour. " +
          "It is not defaulted.",
      )
    }
    // The largest clearance KiCad could have cut the fill at, then the thermal gap beyond it.
    const offset = Math.max(settings.clearanceMm, project.value.maxMm) + settings.thermalGapMm
    const loop = ringAroundBox(
      { x0: extent.x0 - offset, y0: extent.y0 - offset, x1: extent.x1 + offset, y1: extent.y1 + offset },
      SAMPLE_STEP_MM,
    )
    const read = readLoop(pour, layer, loop)
    out.set(layer, {
      coveredFraction: read.coveredFraction,
      breaksMm: read.breaksMm,
      fillPiecesTouched: read.polygons.size,
      connectedGroupsTouched: new Set([...read.polygons].map((id) => groups.get(id) ?? id)).size,
      offsetMm: offset,
    })
  }
  return measured(out)
}
