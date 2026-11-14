/**
 * `modelPinNets` (draughting/pages/hierarchy-flags.ts) numbers a multi-unit package's unit pins by
 * their `<unit>/<pin>` key (`pinKey`, spec C6), as the round-trip comparison and the intent do, never
 * by the unit's raw pin name (h7 pedal pages plan, Task 11b; carried from Task 10's review).
 *
 * Before the fix it passed the raw name (`in+`, `out`) to `pinNumberFor`, which refuses it for a
 * multi-unit part: on h7Pedal() it threw on ldo_vmid's U_VMID. Its callers are root-drivers.ts and
 * hierarchy-flags.ts on the assembled root, so no per-page check reached it.
 *
 * Probe on h7Pedal(): the OPA1688 dual U18 (adc_drv's u_adc) is numbered from its own `symbolPins`
 * (A out 1, in- 2, in+ 3; v- 4; B in+ 5, in- 6, out 7; v+ 8), and R107's pin 2 is on VINL.
 */
import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { REPO_ROOT, loadBoard } from "../../draughting/pages/board.ts"
import { modelPinNets } from "../../draughting/pages/hierarchy-flags.ts"

const pedal = await loadBoard(join(REPO_ROOT, "drafted/h7-platform/h7-pedal"))

describe("modelPinNets on a board with multi-unit packages", () => {
  test("it maps every pin of the pedal without refusing", () => {
    expect(() => modelPinNets(pedal)).not.toThrow()
  })
  test("U18's unit pins are numbered by the dual's own table, its package pins by theirs", () => {
    const nets = modelPinNets(pedal)
    expect([nets.get("U18.1"), nets.get("U18.2"), nets.get("U18.5"), nets.get("U18.7")]).toEqual([
      "adc_drv_ADC_OUT_L",
      "adc_drv_ADC_INV_L",
      "adc_drv_VBIAS_R",
      "adc_drv_ADC_OUT_R",
    ])
    expect([nets.get("U18.4"), nets.get("U18.8")]).toEqual(["GND", "5V_A"])
  })
  test("a single-unit part is unchanged: R107 pin 2 is on VINL", () => {
    expect(modelPinNets(pedal).get("R107.2")).toBe("VINL")
  })
  test("the module, whose parts are all single-unit, maps as before", async () => {
    const module = await loadBoard(join(REPO_ROOT, "drafted/h7-platform/h7-module"))
    const nets = modelPinNets(module)
    expect(nets.size).toBeGreaterThan(0)
    expect(nets.get("U5.2")).toBe("NRST")
  })
})
