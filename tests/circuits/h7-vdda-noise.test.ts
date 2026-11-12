/**
 * The module's VDDA network (pin 21, VDDA = VREF+): analog.md FIG-VDDA-WIDEBAND's method in code,
 * its reproduction of the documented figure for the old bank, and the bank and damping leg the
 * controller's brief for CR-MODULE-VDDA-BANK names (H7 module plan, Task 3).
 *
 * Two of the brief's tests are marked `test.failing`: no E24 leg resistor in 0.25-0.5 ohm with
 * 22 uF reaches Q <= 1 on the ruled bank, so there is no R to rule yet (see vdda-noise.ts,
 * VDDA_RULED_BANK). They pass while they fail; when a ruling makes them pass, bun reports them,
 * and they become plain tests.
 */
import { describe, expect, test } from "bun:test"
import {
  BEAD_DCR_MAX_OHM,
  VDDA_DAMPING_C_F,
  VDDA_DOCUMENTED,
  VDDA_RULED_BANK,
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

const RULED_UNDAMPED: VddaInputs = { ...VDDA_DOCUMENTED, bank: VDDA_RULED_BANK, damping: null }

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

  test.failing("the damping leg keeps Q at or below 1 and does not raise |H| at 450 kHz", () => {
    const { r_ohm } = selectDampingR()
    for (const dcr of [0, BEAD_DCR_MAX_OHM]) {
      const damped = vddaNoise({ ...RULED_UNDAMPED, beadDcr_ohm: dcr, damping: { r_ohm, c_F: VDDA_DAMPING_C_F } })
      expect(damped.q).toBeLessThanOrEqual(1)
      expect(damped.hAt_fsw).toBeLessThanOrEqual(vddaNoise(RULED_UNDAMPED).hAt_fsw)
    }
  })

  test.failing("the ruled bank and damping leg meet 806 uV rms at pin 21 under the stated rule", () => {
    expect(selectDampingR().r_ohm).toBeGreaterThan(0)
  })

  test("a basis of 1.0 is refused", () => {
    expect(() => vddaNoise({ ...OLD_BANK, basis: 1.0 })).toThrow(/basis/)
  })
})
