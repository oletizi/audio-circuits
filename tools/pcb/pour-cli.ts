/**
 * `bun tools/pcb/pour-cli.ts <board.kicad_pcb> [--json]`
 *
 * Prints what `./pour.ts` measured about a saved, refilled board's ground pour.
 * **IT PRINTS NUMBERS AND NO VERDICT**, which is the whole contract: the owner
 * was asked to set pour thresholds and declined (`docs/known-gaps.md` G313), a
 * declination is not a delegation, and this file is downstream of the thing
 * being measured. There is no exit code here that means "the pour is good" - it
 * exits 0 when it measured, 2 when the board refused measurement.
 *
 * **IT ALWAYS PRINTS THE WHOLE CONTINUITY PROFILE AND THE BAND, NEVER
 * `leastUncovered` ON ITS OWN, AND THAT IS A RULING RATHER THAN A FORMATTING
 * TASTE.** `leastUncovered` is the loop of least uncovered length in a band of
 * loops, so it is optimistic by construction: a break that dead-ends inside the
 * band depresses only the loops beyond its end, and `leastUncovered` can read
 * whole while a real break exists further out. Measured on the real board; see
 * `./pour-types.ts` on `LoopContinuity`. A report that quoted the headline alone
 * would therefore be a measurement that hides its own counter-example, so this
 * file has no mode that does it.
 *
 * **AN UNAVAILABLE FIGURE PRINTS ITS REASON AND NEVER A ZERO.** `Reading<T>` is
 * measured-or-absent-with-a-reason precisely so a figure the board gives no
 * answer to cannot be read as a measured zero; a formatter that collapsed the
 * two would put that defect back, one layer out.
 */
import { measurePour, PourRefusal, PT2399_CORE } from "./pour.ts"
import type { LoopAtOffset, LoopContinuity, PourMetrics, Reading } from "./pour.ts"

const USAGE = "usage: bun tools/pcb/pour-cli.ts <board.kicad_pcb> [--json]"

/** A `Reading` as plain JSON, with the reason kept when there is no value. */
function readingJson<T, J>(reading: Reading<T>, encode: (value: T) => J): { measured: J } | { unavailable: string } {
  return reading.kind === "measured" ? { measured: encode(reading.value) } : { unavailable: reading.reason }
}

function loopJson(loop: LoopAtOffset): Record<string, unknown> {
  return {
    offset_mm: loop.offsetMm,
    covered_fraction: loop.coveredFraction,
    uncovered_mm: loop.uncoveredMm,
    breaks_mm: [...loop.breaksMm],
    fill_pieces_touched: loop.fillPiecesTouched,
    connected_groups_touched: loop.connectedGroupsTouched,
  }
}

function continuityJson(byLayer: ReadonlyMap<string, LoopContinuity>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [layer, c] of byLayer) {
    out[layer] = {
      band_mm: { from_mm: c.bandMm.fromMm, to_mm: c.bandMm.toMm, step_mm: c.bandMm.stepMm },
      least_uncovered: loopJson(c.leastUncovered),
      profile: c.profile.map(loopJson),
    }
  }
  return out
}

function spokesJson(byPad: ReadonlyMap<string, ReadonlyMap<string, { spokes: number; coveredFraction: number; declaredConnection: string }>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [pad, byLayer] of byPad) {
    const layers: Record<string, unknown> = {}
    for (const [layer, reading] of byLayer) {
      layers[layer] = {
        spokes: reading.spokes,
        covered_fraction: reading.coveredFraction,
        declared_connection: reading.declaredConnection,
      }
    }
    out[pad] = layers
  }
  return out
}

function metricsJson(m: PourMetrics): Record<string, unknown> {
  return {
    resolution_mm: m.resolutionMm,
    noise_floor_mm: m.noiseFloorMm,
    regions_by_layer: Object.fromEntries(m.regionsByLayer),
    narrowest_bridge_mm: readingJson(m.narrowestBridgeMm, (v) => v),
    region_joins: m.regionJoins.map((j) => ({ layer: j.layer, polygons: [...j.polygons], width_mm: j.widthMm })),
    via_links: m.viaLinks.map((v) => ({ at: [...v.at], polygons: [...v.polygons] })),
    narrowest_neck_mm: m.narrowestNeckMm,
    neck_by_layer: Object.fromEntries(m.neckByLayer),
    continuity_around_ic: readingJson(m.continuityAroundIc, continuityJson),
    spokes_by_ground_pad: readingJson(m.spokesByGroundPad, spokesJson),
    bypass_return: readingJson(m.bypassReturn, (v) => ({ overall: v.overall, by_cap: Object.fromEntries(v.byCap) })),
  }
}

function loopLine(loop: LoopAtOffset): string {
  const breaks = loop.breaksMm.length === 0 ? "none" : loop.breaksMm.map((b) => b.toFixed(2)).join(", ")
  return (
    `    +${loop.offsetMm.toFixed(2)} mm  covered ${(loop.coveredFraction * 100).toFixed(2)}%  ` +
    `uncovered ${loop.uncoveredMm.toFixed(2)} mm  breaks [${breaks}]  ` +
    `fill pieces ${loop.fillPiecesTouched}  connected groups ${loop.connectedGroupsTouched}`
  )
}

function printHuman(m: PourMetrics, where: string): void {
  console.log(`pour measured on ${where}`)
  console.log(`  raster ${m.resolutionMm} mm, neck noise floor ${m.noiseFloorMm} mm`)
  for (const [layer, regions] of m.regionsByLayer) {
    const neck = m.neckByLayer.get(layer)
    console.log(`  ${layer}: ${regions} connected fill region(s), narrowest neck within fill ${neck === null || neck === undefined ? "none (no layer has two bodies)" : `${neck.toFixed(3)} mm`}`)
  }
  console.log(`  narrowest neck within fill, all layers: ${m.narrowestNeckMm === null ? "none" : `${m.narrowestNeckMm.toFixed(3)} mm`}`)
  console.log(
    `  narrowest bridge BETWEEN separate regions: ${
      m.narrowestBridgeMm.kind === "measured" ? `${m.narrowestBridgeMm.value.toFixed(3)} mm` : `unavailable - ${m.narrowestBridgeMm.reason}`
    }`,
  )
  console.log(`  region joins read: ${m.regionJoins.length}; ground vias linking fill pieces: ${m.viaLinks.length}`)

  console.log("  continuity round the IC - THE PROFILE IS THE FIGURE; leastUncovered alone is optimistic by construction:")
  if (m.continuityAroundIc.kind !== "measured") {
    console.log(`    unavailable - ${m.continuityAroundIc.reason}`)
  } else {
    for (const [layer, c] of m.continuityAroundIc.value) {
      console.log(`    ${layer}: band ${c.bandMm.fromMm.toFixed(2)} to ${c.bandMm.toMm.toFixed(2)} mm in ${c.bandMm.stepMm.toFixed(2)} mm steps, ${c.profile.length} loop(s)`)
      console.log(`    least uncovered of the band:`)
      console.log(loopLine(c.leastUncovered))
      console.log(`    every loop in the band:`)
      for (const loop of c.profile) console.log(loopLine(loop))
    }
  }

  console.log("  spokes on each through-hole ground pad, with what the zone DECLARES for pad connection:")
  if (m.spokesByGroundPad.kind !== "measured") {
    console.log(`    unavailable - ${m.spokesByGroundPad.reason}`)
  } else {
    for (const [pad, byLayer] of m.spokesByGroundPad.value) {
      for (const [layer, r] of byLayer) {
        console.log(`    ${pad} on ${layer}: ${r.spokes} spoke(s), ring covered ${(r.coveredFraction * 100).toFixed(2)}%, zone declares "${r.declaredConnection}"`)
      }
    }
  }

  console.log("  how each supply bypass capacitor's ground pad reaches the IC's ground:")
  if (m.bypassReturn.kind !== "measured") {
    console.log(`    unavailable - ${m.bypassReturn.reason}`)
  } else {
    console.log(`    overall: ${m.bypassReturn.value.overall}`)
    for (const [cap, kind] of m.bypassReturn.value.byCap) console.log(`    ${cap}: ${kind}`)
  }
}

const [board, ...rest] = process.argv.slice(2)
const json = rest.length === 1 && rest[0] === "--json"
if (board === undefined || (rest.length > 0 && !json)) {
  console.error(USAGE)
  process.exit(2)
}

try {
  const metrics = measurePour(board, PT2399_CORE)
  if (json) console.log(JSON.stringify(metricsJson(metrics), null, 2))
  else printHuman(metrics, board)
  process.exit(0)
} catch (error) {
  if (error instanceof PourRefusal) {
    console.error(`REFUSED (${error.guard}): ${error.message}`)
    process.exit(2)
  }
  throw error
}
