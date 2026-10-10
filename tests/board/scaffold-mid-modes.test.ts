/**
 * The mid section's boost/off/cut switch, and why `off` is the scaffold's reference.
 *
 * WHAT THIS FILE IS FOR. `REFERENCE_FLAT` holds `midMode: "off"`, so every other
 * scaffold test resolves mid at the one position where its reactive branch is
 * disconnected. Without this file nothing would exercise the reduction over mid's boost
 * or cut topology at all - the selected capacitors, the 1 H winding tap, the 4k7 return
 * to the input and the 1k return to ground - and a reduction that wrongly dropped a
 * live reactive branch would be invisible at scaffold level while every gate stayed
 * green. Choosing a reference setting must not quietly narrow what is verified, so the
 * two settings a stand-in is NOT derived at are asserted here anyway.
 *
 * THE SWITCH, from the module comment in `circuits/pultec/electrical/mid.ts`: the mode
 * switch returns the coil's far end through `R_MID_BOOST` (4k7) to `in` for boost,
 * through `R_MID_CUT` (1k) to ground for cut, or NOWHERE AT ALL in the centre position.
 * `off` is therefore an exact open, not a small signal, and the reduction drops the
 * whole branch rather than approximating it.
 *
 * WHY THAT IS THE REFERENCE. A mid board that was never built contributes no mid
 * action, so standing in for an absent mid with its BOOST network would model a control
 * the builder has not got. The original Pultec EQP-1 has no mid band - the
 * mid-frequency controls are the separate MEQ-5 - so for this three-band derivative,
 * no-mid-action is the faithful baseline for an absent mid.
 *
 * The SPICE-level counterpart is "the mid section is genuinely absent in the centre
 * switch position" in `tests/pultec/ac.test.ts`, which measures the same fact as a
 * response rather than as a reduction.
 */
import { test, expect } from "bun:test"
import { REFERENCE_FLAT, standIn } from "../../lib/board/scaffold/index.ts"
import { boundaryAdmittance } from "../../lib/board/scaffold/admittance.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

const modules = partitionReference().modules

/** The mid selector corner `REFERENCE_FLAT` holds, in Hz. */
const MID_CORNER_HZ = 1000

test("the mid corner this file measures at is the one REFERENCE_FLAT holds", () => {
  expect(REFERENCE_FLAT.midFrequency).toBe(`${MID_CORNER_HZ / 1000}kHz`)
  expect(REFERENCE_FLAT.midMode).toBe("off")
})

/** The absolute admittance floor, as Gate A2 uses it: below this is an open, and the
 * value is shared with `tests/board/scaffold-equivalence.test.ts` by being the same
 * number for the same reason rather than by being imported out of a test file. */
const FLOOR = 1e-15

test("mid's stand-in at the reference setting is one shunt resistor", () => {
  // Written out because it is the whole reason `midMode` is `off` rather than `boost`:
  // the exact flat-state reduction of a mid switched off is `R_MID_SHUNT` alone - the
  // 100k from `in` to ground that is mid's only path not behind the mode switch.
  const derived = standIn("mid", modules, REFERENCE_FLAT)
  expect(derived.components.map((c) => c.id)).toEqual(["R_MID_SHUNT"])
  expect(derived.components.map((c) => c.kind)).toEqual(["resistor"])
  expect(derived.components[0]!.parameters).toEqual({ ohms: 100_000 })
  expect(Object.values(derived.components[0]!.units[0]!.pins).sort()).toEqual(["0", "in"])
})

test("mid's OTHER two switch positions still reduce to their full reactive branch", () => {
  // The 1 kHz position pairs 22 nF with 3.3 nF across the 1 H tap; boost returns the
  // coil's far end to `in` through `R_MID_BOOST` (4k7) and cut returns it to ground
  // through `R_MID_CUT` (1k). `RV_MID` is a rheostat, so position 0 is FULL depth and
  // its `ccw-wiper` arm is the 0R tap off `hi_boost_out`.
  const expected: Record<string, readonly string[]> = {
    boost: [
      "C_MID_1kHz_A",
      "C_MID_1kHz_B",
      "L_MID_1H",
      "RV_MID.ccw-wiper",
      "R_MID_BOOST",
      "R_MID_SHUNT",
    ],
    cut: [
      "C_MID_1kHz_A",
      "C_MID_1kHz_B",
      "L_MID_1H",
      "RV_MID.ccw-wiper",
      "R_MID_CUT",
      "R_MID_SHUNT",
    ],
  }
  for (const [mode, ids] of Object.entries(expected)) {
    const derived = standIn("mid", modules, { ...REFERENCE_FLAT, midMode: mode })
    expect(derived.components.map((c) => c.id).sort(), mode).toEqual([...ids].sort())
    // The coil is live in both, and it is the 1 H tap the 1 kHz position selects.
    const coils = derived.components.filter((c) => c.kind === "inductor")
    expect(coils.map((c) => c.parameters), `${mode} coil`).toEqual([{ henries: 1 }])
    // And the boundary net the open mode switch disconnects is reached again.
    const nets = new Set(
      derived.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
    )
    for (const boundaryNet of derived.boundary) {
      expect(nets.has(boundaryNet), `${mode}: ${boundaryNet} unreached`).toBe(true)
    }
  }
})

test("mid's three switch positions are electrically distinct, so the mode matters", () => {
  // Non-vacuity for the test above and for the reference choice: `off` is not a
  // relabelling of `boost`. The admittance mid presents between `hi_boost_out` and
  // ground is an open at the centre position and finite in both others.
  const boundary = new Set(["hi_boost_out", "0"])
  const presented: Record<string, number> = {}
  for (const mode of ["boost", "off", "cut"]) {
    const derived = standIn("mid", modules, { ...REFERENCE_FLAT, midMode: mode })
    const matrix = boundaryAdmittance(derived.components, boundary, MID_CORNER_HZ)
    let magnitude = 0
    for (const value of matrix.values()) {
      magnitude = Math.max(magnitude, Math.hypot(value.re, value.im))
    }
    presented[mode] = magnitude
  }
  expect(presented["off"], "off presents something at hi_boost_out").toBeLessThanOrEqual(FLOOR)
  expect(presented["boost"], "boost presents nothing at hi_boost_out").toBeGreaterThan(1e-6)
  expect(presented["cut"], "cut presents nothing at hi_boost_out").toBeGreaterThan(1e-6)
})

test("an unknown mode refuses rather than resolving to something plausible", () => {
  // The mode is a switch POSITION, and a position the switch does not have must not
  // silently behave like one it does. `resolveNetwork` refuses it, so a typo in a flat
  // state is a loud failure rather than a stand-in derived at a setting nothing has.
  expect(() => standIn("mid", modules, { ...REFERENCE_FLAT, midMode: "neutral" }))
    .toThrow(/neutral/)
})
