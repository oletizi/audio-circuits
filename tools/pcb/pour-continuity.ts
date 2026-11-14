/**
 * HOW UNBROKEN THE GROUND IS AROUND THE IC, measured on a band of loops walked
 * out from its pad extent - and why it reads no clearance at all.
 *
 * **WHAT WENT WRONG, TWICE, AND WHAT IT TAUGHT.** Task 9's first version walked the
 * courtyard's bounding box, which on a DIP sits 1.055 mm from the pad centres,
 * INSIDE the 1.3 mm void the pour leaves round each pad, so an unbroken pour read
 * 0.593. The second placed one loop at the pad extent grown by the largest
 * clearance the zone and the project declared. That moved the figure with
 * configuration instead of with the pour, on the real board with an unbroken plane:
 * a second ground zone with a smaller clearance read 0.4221 (offset 0.75), a
 * pad-local `(clearance 1.5)` read 0.9563 with a 2.85 mm break, and a `.kicad_dru`
 * rule conditioned on a netclass nothing was in read 0.7746 with eleven breaks.
 * A loop too far out is as wrong as one too near - it walks off the pour into other
 * parts' voids - so there was no safe side to err on, and the set of things that
 * move a void is open, so enumerating sources and taking a maximum cannot close it.
 *
 * **SO THIS READS THE FILL AND PREDICTS NOTHING.** Loops are walked from the pad
 * extent outward in fixed steps (`LOOP_BAND`), each is read against the saved
 * polygons, all are reported, and the one put first is the loop with the least of the
 * way round uncovered (`leastUncovered`), ties going to the nearest. Measured on the
 * real board with an unbroken plane the profile has a plateau at full coverage from
 * 0.75 mm to 2.5 mm out and falls away either side (0.35 at the pad extent itself,
 * 0.89 and 0.69 at 3.0 and 4.0 mm out, where the loop reaches other parts). A break
 * that spans the whole band cuts every loop in it; the IC's own voids cut only the
 * inner ones; and A FINITE BREAK - a slot or void that dead-ends short of the IC -
 * CUTS ONLY THE LOOPS BEYOND ITS END, so `leastUncovered` can read whole with a real
 * break in the ground. Measured on the real board: a 0.3 mm keepout slot ending 2.0
 * mm short of the pad extent leaves the least-uncovered loop at 1.0 with no break,
 * while the profile reads 0.30 mm uncovered from 2.25 mm out. THE PROFILE IS WHERE
 * THAT SHOWS, which is why it is in the result and why `leastUncovered` is not the
 * answer to "is the ground continuous" on its own. No clearance is read from
 * anywhere, so no clearance can be the wrong one.
 *
 * **THE BAND IS A CHOICE AND IS REPORTED** (`bandMm`). It runs from the pad extent
 * to 3 mm beyond it. A void of the IC's own reaching further than that is read as a
 * break on every loop, and the profile shows it.
 *
 * WHAT IT STILL SEES that is not the pour's fault, RECORDED AND NOT FIXED: a void
 * belonging to a NEIGHBOUR of the IC that reaches every loop in the band reads as a
 * break, because from the fill alone a neighbour's pad void and a gap in the pour
 * look the same, and a way of guessing which is which would be an invention.
 *
 * **COVERAGE AND CONNECTEDNESS ARE BOTH REPORTED, SO THAT NOBODY HAS TO DEFINE
 * "CONTINUITY"** (`./pour-types.ts`): `coveredFraction`, `breaksMm` and
 * `uncoveredMm` answer "is there ground all the way round"; `connectedGroupsTouched`
 * answers "is that ground one electrical piece", counting two polygons as one when
 * a track, a via, a ground pad or fill on the other layer joins them
 * (`./pour-connectivity.ts`). `fillPiecesTouched` is the bare polygon count and is
 * NOT the connectivity answer.
 */
import { ringAroundBox } from "./pour-geometry.ts"
import type { GroundPour } from "./pour-read.ts"
import type { BoardPad } from "./pour-read-pads.ts"
import { SAMPLE_STEP_MM, readLoop } from "./pour-sample.ts"
import { measured, unavailable } from "./pour-types.ts"
import type { LoopAtOffset, LoopContinuity, Reading } from "./pour-types.ts"

/** Loops from the pad extent (0) to 3 mm beyond it, every quarter millimetre. */
export const LOOP_BAND: { readonly fromMm: number; readonly toMm: number; readonly stepMm: number } = { fromMm: 0, toMm: 3, stepMm: 0.25 }

/**
 * The axis-aligned box that contains every pad's copper, exactly: a rounded
 * rectangle turned by an angle reaches `(hx - r) |cos| + (hy - r) |sin| + r` either
 * side of its centre in x and `(hx - r) |sin| + (hy - r) |cos| + r` in y.
 */
export function padExtent(pads: readonly BoardPad[]): { x0: number; y0: number; x1: number; y1: number } {
  const boxes = pads.map(({ outline: o }) => {
    const a = (o.degrees * Math.PI) / 180
    const [c, s] = [Math.abs(Math.cos(a)), Math.abs(Math.sin(a))]
    const halfX = (o.hx - o.radius) * c + (o.hy - o.radius) * s + o.radius
    const halfY = (o.hx - o.radius) * s + (o.hy - o.radius) * c + o.radius
    return { x0: o.centre[0] - halfX, y0: o.centre[1] - halfY, x1: o.centre[0] + halfX, y1: o.centre[1] + halfY }
  })
  return {
    x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)),
  }
}

function groupOf(groups: ReadonlyMap<number, number>, id: number): number {
  const group = groups.get(id)
  if (group === undefined) {
    throw new Error(`polygon ${id} has no electrical group: groundGroups returns an entry for every polygon, so this is a defect in it.`)
  }
  return group
}

export function continuityAround(
  pour: GroundPour,
  icPads: readonly BoardPad[],
  icReference: string,
  groups: ReadonlyMap<number, number>,
): Reading<ReadonlyMap<string, LoopContinuity>> {
  if (icPads.length === 0) {
    return unavailable(`no pad was read for a footprint referenced ${icReference}, so there is no part to walk a loop around.`)
  }
  const extent = padExtent(icPads)
  const offsets: number[] = []
  for (let o = LOOP_BAND.fromMm; o <= LOOP_BAND.toMm + 1e-9; o += LOOP_BAND.stepMm) offsets.push(Math.round(o * 1e6) / 1e6)
  const out = new Map<string, LoopContinuity>()
  for (const layer of pour.layers) {
    const profile = offsets.map((offsetMm): LoopAtOffset => {
      const loop = ringAroundBox(
        { x0: extent.x0 - offsetMm, y0: extent.y0 - offsetMm, x1: extent.x1 + offsetMm, y1: extent.y1 + offsetMm },
        SAMPLE_STEP_MM,
      )
      const read = readLoop(pour, layer, loop)
      return {
        offsetMm,
        coveredFraction: read.coveredFraction,
        breaksMm: read.breaksMm,
        uncoveredMm: read.breaksMm.reduce((sum, b) => sum + b, 0),
        fillPiecesTouched: read.polygons.size,
        connectedGroupsTouched: new Set([...read.polygons].map((id) => groupOf(groups, id))).size,
      }
    })
    // Least of the way round uncovered; the strict `<` leaves a tie with the nearest loop.
    let leastUncovered = profile[0]
    for (const loop of profile) {
      if (leastUncovered === undefined || loop.uncoveredMm < leastUncovered.uncoveredMm - 1e-9) leastUncovered = loop
    }
    if (leastUncovered === undefined) throw new Error("the loop band is empty")
    out.set(layer, { bandMm: LOOP_BAND, leastUncovered, profile })
  }
  return measured(out)
}
