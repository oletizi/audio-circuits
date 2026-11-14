/**
 * `draughting/pages/kicad-pro.ts` writes no `.kicad_pro` exclusion for two kinds of ERC allowance, and
 * refuses each by name (h7 pedal pages plan, Task 9c fix round 1, review M4):
 * - a one-item allowance (pin_not_driven; ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC, temporary): a root is
 *   assembled once every block, and so every driver, is built;
 * - an allowance with a PWR_FLAG partner (ruling CR-PEDAL-LM66100-ST-ERC): the flag's uuid lives on the
 *   root, which the tool does not read yet.
 * Both refusals come before any file is read, so the project directory here does not exist.
 *
 * Control: a two-item allowance between two part pins is not refused for either reason; it gets past
 * both refusals and fails on reading the (absent) root sheet instead.
 */
import { expect, test } from "bun:test"
import { join, resolve } from "node:path"
import type { ErcAllowance } from "../../draughting/pages/erc-allowances.ts"
import { exclusionKey } from "../../draughting/pages/kicad-pro.ts"

const ABSENT = join(resolve(import.meta.dir, "..", ".."), "build", "kicad-pro-refusals-absent")

const ONE_ITEM: ErcAllowance = {
  ruling: "CR-PEDAL-CODEC-VIN-AWAITING-ERC", sheet: "/codec/", type: "pin_not_driven",
  pins: [{ designator: "U9", pin: "25" }], net: "VINL", symbolPinType: "input", source: "test",
}
const FLAG_PARTNER: ErcAllowance = {
  ruling: "CR-PEDAL-LM66100-ST-ERC", sheet: "/expr_ref/", type: "pin_to_pin",
  pins: [{ designator: "U12", pin: "5" }, { designator: "PWR_FLAG", pin: "1" }], net: "GND", symbolPinType: "open_collector", source: "test",
}
const TWO_PINS: ErcAllowance = { ...FLAG_PARTNER, pins: [{ designator: "U12", pin: "5" }, { designator: "U12", pin: "2" }] }

test("a one-item allowance is refused by name", () => {
  expect(() => exclusionKey(ONE_ITEM, ABSENT, "h7-pedal", ABSENT)).toThrow(
    "kicad-pro.ts: allowance CR-PEDAL-CODEC-VIN-AWAITING-ERC (pin_not_driven on /codec/) names one pin, U9 pin 25.",
  )
})

test("an allowance with a PWR_FLAG partner is refused by name", () => {
  expect(() => exclusionKey(FLAG_PARTNER, ABSENT, "h7-pedal", ABSENT)).toThrow(
    "kicad-pro.ts: allowance CR-PEDAL-LM66100-ST-ERC (pin_to_pin on /expr_ref/) names a PWR_FLAG partner",
  )
})

test("control: a two-pin allowance passes both refusals and stops at the absent root sheet", () => {
  let message = ""
  try {
    exclusionKey(TWO_PINS, ABSENT, "h7-pedal", ABSENT)
  } catch (e) {
    message = e instanceof Error ? e.message : String(e)
  }
  expect(message).toContain("h7-pedal.kicad_sch")
  expect(message).not.toContain("names one pin")
  expect(message).not.toContain("PWR_FLAG partner")
})
