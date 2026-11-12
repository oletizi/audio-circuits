/**
 * The module's VDDA network (pin 21, VDDA = VREF+): analog.md FIG-VDDA-WIDEBAND's method in code,
 * its reproduction of the documented figure for the old bank, and the bank and damping leg the
 * controller ruling CR-MODULE-VDDA-BANK (H7 module plan, Task 3).
 */
import { describe, expect, test } from "bun:test"
import {
  BEAD_DCR_MAX_OHM,
  VDDA_DOCUMENTED,
  VDDA_RULED,
  VDDA_WIDEBAND_LIMIT_V,
  dampingCandidates,
  selectDampingR,
  triangleHarmonicPeak,
  vddaNoise,
} from "../../circuits/h7-platform/vdda-noise.ts"
import type { VddaInputs } from "../../circuits/h7-platform/vdda-noise.ts"

/** OSCAR's bank, "not in force" (power.md:389): 2 x 2.2 uF + 2 x 100 nF X7R (analog.md:242). */
const OLD_BANK: VddaInputs = {
  ...VDDA_DOCUMENTED,
  bank: [
    { nominal_F: 2.2e-6, esr_ohm: 0 },
    { nominal_F: 2.2e-6, esr_ohm: 0 },
    { nominal_F: 100e-9, esr_ohm: 0 },
    { nominal_F: 100e-9, esr_ohm: 0 },
  ],
  damping: null,
}

const RULED_DAMPED: VddaInputs = { ...VDDA_DOCUMENTED, bank: VDDA_RULED.bank, damping: VDDA_RULED.damping }
const RULED_UNDAMPED: VddaInputs = { ...RULED_DAMPED, damping: null }

/** The bead's DCR is a bound, <= 0.045 ohm; less DCR is less damping, so both ends are checked. */
const DCR_CORNERS = [0, BEAD_DCR_MAX_OHM]

describe("VDDA wideband noise at pin 21 (analog.md FIG-VDDA-WIDEBAND)", () => {
  test("the fundamental is 0.673 A peak for 1.66 A peak-to-peak", () => {
    expect(triangleHarmonicPeak(1.66, 1)).toBeCloseTo(0.673, 3)
  })

  test("the old bank reproduces analog.md's 2.12 mV rms, undamped", () => {
    const r = vddaNoise(OLD_BANK)
    expect(Math.abs(r.rmsAtPin21_V - 2.12e-3)).toBeLessThanOrEqual(0.02e-3)
    expect(r.hAt_fsw).toBeCloseTo(0.371, 3)
  })

  test("the old bank's f0 is 234.1 kHz", () => {
    expect(vddaNoise(OLD_BANK).f0_Hz / 1e3).toBeCloseTo(234.1, 1)
  })

  test("the pole-pair Q reproduces analog.md's Q = sqrt(L/C) / R for the undamped network", () => {
    const inputs: VddaInputs = { ...OLD_BANK, beadDcr_ohm: BEAD_DCR_MAX_OHM }
    const cEff = (2 * 2.2e-6 + 2 * 100e-9) * inputs.basis
    const expected = Math.sqrt(inputs.beadL_H / cEff) / BEAD_DCR_MAX_OHM
    expect(vddaNoise(inputs).q).toBeCloseTo(expected, 6)
  })

  test("the ruled bank meets 806 uV rms undamped, and with every candidate leg", () => {
    expect(vddaNoise(RULED_UNDAMPED).rmsAtPin21_V).toBeLessThanOrEqual(VDDA_WIDEBAND_LIMIT_V)
    for (const c of dampingCandidates()) expect(c.rms_V).toBeLessThanOrEqual(VDDA_WIDEBAND_LIMIT_V)
  })

  test("every candidate leg lowers |H| at 450 kHz below the undamped bank's", () => {
    for (const c of dampingCandidates()) expect(c.hAt_fsw).toBeLessThanOrEqual(c.undampedH)
  })

  test("the ruled bank and leg meet 806 uV rms at pin 21", () => {
    for (const dcr of DCR_CORNERS) {
      expect(vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: dcr }).rmsAtPin21_V).toBeLessThanOrEqual(VDDA_WIDEBAND_LIMIT_V)
    }
  })

  test("the leg does not raise |H| at 450 kHz", () => {
    const undamped = vddaNoise(RULED_UNDAMPED).hAt_fsw
    for (const dcr of DCR_CORNERS) {
      expect(vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: dcr }).hAt_fsw).toBeLessThanOrEqual(undamped)
    }
  })

  test("the chosen R is the candidate with the least worst-case Q", () => {
    const admissible = dampingCandidates().filter(
      (c) => c.rms_V <= VDDA_WIDEBAND_LIMIT_V && c.hAt_fsw <= c.undampedH)
    const worst = (c: { qAtDcrZero: number; qAtDcrMax: number }): number => Math.max(c.qAtDcrZero, c.qAtDcrMax)
    const least = Math.min(...admissible.map(worst))
    const expected = Math.min(...admissible.filter((c) => worst(c) === least).map((c) => c.r_ohm))
    expect(VDDA_RULED.damping.r_ohm).toBe(expected)
    expect(selectDampingR().r_ohm).toBe(expected)
  })

  test("the achieved worst-case Q is 2.25 at DCR 0 and 1.26 at the 0.045 ohm bound", () => {
    // Q <= 1 is NOT met. The leg's 22 uF (8.4 uF effective) is about the bank's 7.7 uF, and a
    // parallel R-C leg that size cannot bring the pole-pair Q to 1 at any R. analog.md:274's
    // "Q = 1 needs R >= sqrt(L/C)" is the series-R form; CR-MODULE-VDDA-BANK records this for the
    // owner. Asserted as numbers so a change to the network shows here.
    expect(vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: 0 }).q).toBeCloseTo(2.246, 3)
    expect(vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: BEAD_DCR_MAX_OHM }).q).toBeCloseTo(1.261, 3)
  })

  test("the figures CR-MODULE-VDDA-BANK and the VDDA open rows quote, as they quote them", () => {
    // decisions.md CR-MODULE-VDDA-BANK, and open-items.md VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A and
    // VDDA-DAMPING-LEG, quote these to the digits below. If one moves, the prose is stale: fix both.
    const undamped = vddaNoise(RULED_UNDAMPED)
    expect(undamped.f0_Hz / 1e3).toBeCloseTo(111.7, 1)
    expect(undamped.rmsAtPin21_V * 1e6).toBeCloseTo(376.0, 1)
    expect(undamped.hAt_fsw).toBeCloseTo(0.0657, 4)
    expect(VDDA_DOCUMENTED.beadL_H * 1e6).toBeCloseTo(0.2626, 4)
    const bankEff = VDDA_RULED.bank.reduce((s, b) => s + b.nominal_F, 0) * VDDA_DOCUMENTED.basis
    expect(bankEff * 1e6).toBeCloseTo(7.73, 2)
    expect(VDDA_RULED.damping.c_F * VDDA_DOCUMENTED.basis * 1e6).toBeCloseTo(8.4, 1)
    const atZero = vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: 0 })
    const atMax = vddaNoise({ ...RULED_DAMPED, beadDcr_ohm: BEAD_DCR_MAX_OHM })
    expect(atZero.rmsAtPin21_V * 1e6).toBeCloseTo(363.4, 1)
    expect(atMax.rmsAtPin21_V * 1e6).toBeCloseTo(362.4, 1)
    expect(atZero.hAt_fsw).toBeCloseTo(0.0635, 4)
    expect(atMax.hAt_fsw).toBeCloseTo(0.0633, 4)
  })

  test("a basis of 1.0 is refused", () => {
    expect(() => vddaNoise({ ...OLD_BANK, basis: 1.0 })).toThrow(/basis/)
  })
})
