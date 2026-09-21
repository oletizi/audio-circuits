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

const POSITIONS = { loFrequency: "60Hz", hiFrequency: "5kHz" }

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
 *   - The hi boost level pot at 0 puts its wiper on the input, which shorts out
 *     the resonant branch, leaving a plain 47k in series.
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

/** The mid level control is a rheostat, so its sense is inverted relative to a
 * normal pot: 0 is maximum depth (no resistance in the branch) and 1 is minimum
 * (the full 47K damping it). Worth stating, because reading it the other way
 * makes every mid result look broken. */
const MID_FULL = { level: 0, mode: "boost" } as const
const MID_OFF = { level: 0, mode: "off" } as const

test("the mid section is genuinely absent in the centre switch position", async () => {
  // "off" opens the coil's return, so no current can flow anywhere in the
  // branch. It must be indistinguishable from the section not existing.
  const positions = { ...POSITIONS, mid: "1kHz" }
  const off = await responseDb(controlState(0, 0, 0, positions, 1, 0, MID_OFF))
  for (const hz of [200, 1_000, 5_000]) {
    expect(off(hz)).toBeCloseTo(FLAT_DB, 6)
  }
}, 60_000)

test("mid boost peaks on its selected frequency, symmetrically", async () => {
  const at = async (label: string) =>
    responseDb(controlState(0, 0, 0, { ...POSITIONS, mid: label }, 1, 0, MID_FULL))

  const oneK = await at("1kHz")
  expect(oneK(1_000) - FLAT_DB).toBeGreaterThan(12)
  // An octave either side should fall away by a similar amount: a bell, not a
  // shelf. Equal skirts are what distinguish the two.
  const below = oneK(500) - FLAT_DB
  const above = oneK(2_000) - FLAT_DB
  expect(Math.abs(below - above)).toBeLessThan(1)
  expect(oneK(1_000) - FLAT_DB).toBeGreaterThan(below + 2)

  // And the centre moves with the selector.
  const threeK = await at("3kHz")
  expect(threeK(3_000)).toBeGreaterThan(threeK(1_000))
  const twoHundred = await at("200Hz")
  expect(twoHundred(200)).toBeGreaterThan(twoHundred(1_000))
}, 180_000)

test("the mid dip is sharper than the mid peak, as an MEQ5 is", async () => {
  const positions = { ...POSITIONS, mid: "1kHz" }
  const boost = await responseDb(controlState(0, 0, 0, positions, 1, 0, MID_FULL))
  const cut = await responseDb(controlState(0, 0, 0, positions, 1, 0, { level: 0, mode: "cut" }))

  // Both act at the centre.
  expect(boost(1_000) - FLAT_DB).toBeGreaterThan(10)
  expect(cut(1_000) - FLAT_DB).toBeLessThan(-8)

  // But an octave out, the cut has almost recovered while the boost has not.
  // That narrow dip against a broad peak is the section's character.
  const boostSkirt = Math.abs(boost(2_000) - FLAT_DB)
  const cutSkirt = Math.abs(cut(2_000) - FLAT_DB)
  expect(cutSkirt).toBeLessThan(boostSkirt / 3)
}, 180_000)

test("simultaneous low boost and cut give the Pultec curve, not cancellation", async () => {
  // The low boost and low cut sections share one two-pole rotary, so they are
  // ALWAYS tuned to the same frequency. That lock is not an implementation
  // detail to be tidied away — it is what produces the characteristic low end,
  // and the builder named keeping it as a requirement.
  //
  // Because the two shelves have different shapes, engaging both does not
  // cancel: what remains is a low shelf with a dip above it. Splitting the
  // control into two independent frequency knobs would still pass every
  // topology test in this suite while destroying exactly this behaviour.
  const both = await responseDb(controlState(1, 1, 0, POSITIONS, 1))
  const boostOnly = await responseDb(controlState(0, 1, 0, POSITIONS, 1))

  const rel = (db: (hz: number) => number, hz: number) => db(hz) - FLAT_DB

  // Still a substantial low shelf.
  expect(rel(both, 20)).toBeGreaterThan(8)
  expect(rel(both, 60)).toBeGreaterThan(6)

  // And a genuine dip above it — below flat, and below both its neighbours.
  expect(rel(both, 400)).toBeLessThan(-2)
  expect(rel(both, 400)).toBeLessThan(rel(both, 100))
  expect(rel(both, 400)).toBeLessThan(rel(both, 1_000))

  // Boost alone has no such dip: the dip is what the pairing creates.
  expect(rel(boostOnly, 400)).toBeGreaterThan(0)
}, 120_000)

test("hi boost peaks at the selected frequency and leaves the rest alone", async () => {
  // The branch is a series resonance from the input to the level pot wiper; at
  // resonance it bridges out the upper part of the 47K pot, which is the boost.
  const db = await responseDb(controlState(0, 0, 1, { ...POSITIONS, hiFrequency: "5kHz" }, 1, 1))
  expect(db(5_000)).toBeGreaterThan(db(1_000) + 10)
  expect(db(5_000)).toBeGreaterThan(db(20) + 10)
}, 60_000)

test("the Q control changes boost height without moving its centre", async () => {
  const peakOf = (db: (hz: number) => number) => {
    let best = { hz: 0, db: -Infinity }
    for (let hz = 2_000; hz <= 12_000; hz += 25) {
      const value = db(hz)
      if (value > best.db) best = { hz, db: value }
    }
    return best
  }
  const damped = peakOf(await responseDb(controlState(0, 0, 1, { ...POSITIONS, hiFrequency: "5kHz" }, 1, 0)))
  const sharp = peakOf(await responseDb(controlState(0, 0, 1, { ...POSITIONS, hiFrequency: "5kHz" }, 1, 1)))
  expect(sharp.db).toBeGreaterThan(damped.db + 2)
  // A bandwidth control must not drag the centre frequency with it.
  expect(Math.abs(sharp.hz - damped.hz) / damped.hz).toBeLessThan(0.05)
}, 120_000)
