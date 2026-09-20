import { test, expect } from "bun:test"
import { THREE_BAND_REFERENCE, controlState } from "../../reference/pultec/three-band.ts"
import { resolveNetwork } from "../../lib/passives/control-state.ts"
import { pruneFloatingBranches } from "../../lib/sim/prepare.ts"
import { toSpiceNetlist } from "../../lib/sim/netlist.ts"
import { runAcSweep } from "../../lib/sim/ac.ts"
import type { SimulationEnvironment } from "../../lib/sim/netlist.ts"
import type { ControlState } from "../../lib/passives/control-state.ts"

/** Source and load are explicit inputs, never defaulted. The load is the
 * "not less than 470K" the reference documentation specifies. The source is
 * ideal, which is a stated modelling choice: no source states the driving
 * impedance, and the built unit's is unmeasured (unresolved item 1). */
const ENVIRONMENT: SimulationEnvironment = {
  source: { port: "input", amplitude: 1, seriesOhms: 0 },
  load: { port: "output", ohms: 470_000 },
  sweep: { pointsPerDecade: 10, startHz: 20, stopHz: 20_000 },
  groundPort: "ground",
}

const POSITIONS = { loCut: "60Hz", loBoost: "60Hz", hiCut: "5kHz" }

async function responseDb(state: ControlState): Promise<(hz: number) => number> {
  const resolved = resolveNetwork(THREE_BAND_REFERENCE, state)
  const { network } = pruneFloatingBranches(resolved)
  const [sweep] = await runAcSweep({
    netlist: toSpiceNetlist(network, ENVIRONMENT),
    nodes: ["out"],
  })
  return (hz: number) => {
    const point = sweep.points.reduce((best, candidate) =>
      Math.abs(candidate.frequency - hz) < Math.abs(best.frequency - hz) ? candidate : best)
    return 20 * Math.log10(Math.hypot(point.real, point.imaginary))
  }
}

/** Analytic insertion loss at the flat setting, derived by hand.
 *
 * With every control at the extreme that takes its network out of circuit, the
 * model collapses to a resistive divider:
 *
 *   - The hi boost level pot is a plain 47k in series, because its wiper feeds
 *     the absent resonant branch and carries no current.
 *   - The lo cut pot at 0 shorts hi_boost_out to out.
 *   - The lo boost pot at 0 shorts lo_boost_in to ground.
 *   - The hi cut pot at 1 shorts out its own 430R-plus-capacitor branch.
 *
 * leaving 47k from in to out, and 4k7 from out to ground in parallel with R2
 * (56k) and the 470k load.
 *
 * Thompson-Bell quotes a nominal 20.83dB for this divider, from 4.7/(4.7+47).
 * That figure ignores R2 and the load; including them accounts for the
 * remaining 0.7dB exactly.
 */
const R_TOP = 47_000
const R_BOTTOM = 1 / (1 / 4_700 + 1 / 56_000 + 1 / 470_000)
const FLAT_DB = 20 * Math.log10(R_BOTTOM / (R_TOP + R_BOTTOM))

test("the documented nominal insertion loss is the unloaded divider", () => {
  // Thompson-Bell's own figure, reproduced from his stated ratio.
  expect(20 * Math.log10(4.7 / (4.7 + 47))).toBeCloseTo(-20.83, 2)
})

test("the flat setting matches the hand-derived divider", async () => {
  const db = await responseDb(controlState(0, 0, 0, POSITIONS, 1))
  // Flat across the band: every frequency-selective branch is out of circuit.
  for (const hz of [20, 100, 1_000, 10_000, 20_000]) {
    expect(db(hz)).toBeCloseTo(FLAT_DB, 2)
  }
  // And that value is the documented figure plus the shunts the doc omits.
  expect(FLAT_DB).toBeCloseTo(-21.54, 2)
}, 60_000)

test("hi cut attenuates high frequencies and leaves low ones alone", async () => {
  const db = await responseDb(controlState(0, 0, 0, POSITIONS, 0))
  expect(db(20)).toBeCloseTo(FLAT_DB, 1)
  expect(db(10_000)).toBeLessThan(db(20) - 15)
}, 60_000)

test("lo boost lifts low frequencies relative to flat", async () => {
  const db = await responseDb(controlState(0, 1, 0, POSITIONS, 0))
  expect(db(20)).toBeGreaterThan(FLAT_DB + 10)
  expect(db(20)).toBeGreaterThan(db(1_000))
}, 60_000)

test("the hi boost level control cannot act while its branch is absent", async () => {
  // Both halves of the pot stay in series when the wiper carries no current,
  // so the setting must not change the response. This pins the documented
  // scope limit rather than letting it pass silently.
  const low = await responseDb(controlState(0, 0, 0, POSITIONS, 0))
  const high = await responseDb(controlState(0, 0, 1, POSITIONS, 0))
  for (const hz of [20, 1_000, 20_000]) {
    expect(high(hz)).toBeCloseTo(low(hz), 6)
  }
}, 60_000)
