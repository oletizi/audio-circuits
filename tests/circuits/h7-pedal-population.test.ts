/**
 * The h7-pedal's default-population check (h7 pedal pages plan, Task 8; GitHub issue 33 P1; plan
 * Review Focus 7; CR-PEDAL-POPULATION). The model is the default fitted build, so a not-fitted part
 * that would join or load nets must not be in it. `checkDefaultPopulation` returns no findings for
 * the board, and rejects each of three test-only copies of the codec block, each with one
 * not-fitted position added. It exempts exactly `VARIANT_PART_IDS` and nothing else.
 */
import { describe, expect, test } from "bun:test"
import type { Component, Network } from "../../lib/model/index.ts"
import { codecBlock } from "../../circuits/h7-platform/pedal/codec.ts"
import { checkDefaultPopulation, populationFindings } from "../../circuits/h7-platform/pedal/population.ts"
import { RESISTOR } from "../../circuits/h7-platform/parts.ts"
import { TC_6610, RV16AF_41 } from "../../circuits/h7-platform/pedal-parts.ts"
import { NOT_FITTED_PARTS, VARIANT_PART_IDS } from "../../circuits/h7-platform/pedal-population.ts"
import { h7Pedal } from "../../circuits/h7-platform/pedal-board.ts"

const n = (net: string) => ({ kind: "net" as const, net })

function testResistor(id: string, ohms: number, a: string, b: string): Component {
  return {
    id, kind: "resistor", parameters: { ohms }, part: RESISTOR, pins: {},
    units: [{ name: "MAIN", pins: { a: n(a), b: n(b) } }], provenance: { source: "test-only control" },
  }
}

/** A test-only copy of the codec block with one part added. */
function codecWith(extra: Component): Network {
  const block = codecBlock()
  return { ...block, components: [...block.components, extra] }
}

describe("checkDefaultPopulation (CR-PEDAL-POPULATION)", () => {
  test("the board as modelled has no findings", () => {
    expect(checkDefaultPopulation(h7Pedal())).toEqual([])
  })
  test("the codec block alone has no findings", () => {
    expect(checkDefaultPopulation(codecBlock())).toEqual([])
  })

  test("control: a 0 ohm added from MODE (pin 28) to DGND (CODEC-06's not-fitted link) is rejected", () => {
    const findings = checkDefaultPopulation(codecWith(testResistor("test_only_mode_link", 0, "CODEC_MODE", "GND")))
    expect(findings).toEqual([expect.stringContaining("MODE (pin 28)")])
    expect(findings[0]).toContain("test_only_mode_link")
  })
  test("control: a 4.7 kohm added from pin 2 to VDD (CODEC-09's not-fitted pull-up) is rejected", () => {
    const findings = checkDefaultPopulation(codecWith(testResistor("test_only_demp_pullup", 4.7e3, "CODEC_DEMP", "3V3_CODEC")))
    expect(findings).toEqual([expect.stringContaining("DEMP (pin 2)")])
    expect(findings[0]).toContain("test_only_demp_pullup")
  })
  test("control: a 0 ohm added from pin 1 to EXP_I2C_SCL (CODEC-10's not-fitted link) is rejected", () => {
    const findings = checkDefaultPopulation(codecWith(testResistor("test_only_scl_link", 0, "CODEC_FMT", "EXP_I2C_SCL")))
    expect(findings).toEqual([expect.stringContaining("EXP_I2C_SCL")])
    expect(findings[0]).toContain("test_only_scl_link")
  })
  test("control: the 220 kohm removed from MODE is rejected", () => {
    const block = codecBlock()
    expect(checkDefaultPopulation({ ...block, components: block.components.filter((c) => c.id !== "r_mode") }))
      .toEqual([expect.stringContaining("MODE (pin 28)")])
  })
  test("control: a part carrying a NOT_FITTED_PARTS id is rejected, whatever it joins", () => {
    for (const p of NOT_FITTED_PARTS) {
      const findings = checkDefaultPopulation(codecWith(testResistor(p.id, 10e3, "TEST_ONLY_A", "TEST_ONLY_B")))
      expect([p.id, findings]).toEqual([p.id, [expect.stringContaining(p.id)]])
    }
  })
})

describe("the variant exemption is exactly VARIANT_PART_IDS", () => {
  test("with no exemption, the board's six positions each report the pot fit beside the button fit", () => {
    const findings = populationFindings(h7Pedal(), [])
    expect(findings).toHaveLength(12)
    for (let p = 1; p <= 6; p++) {
      expect(findings.some((f) => f.includes(`rv_pos${p}`) && f.includes(`sw_btn${p}`))).toBe(true)
      expect(findings.some((f) => f.includes(`rv_pos${p}`) && f.includes(`r_pu${p}`))).toBe(true)
    }
  })
  test("control: VARIANT_PART_IDS less one id leaves that position's findings", () => {
    const less = VARIANT_PART_IDS.filter((id) => id !== "sw_btn4")
    expect(populationFindings(h7Pedal(), less)).toEqual([expect.stringContaining("sw_btn4")])
  })
  test("control: a pot and a button on one node outside the variant ids are rejected", () => {
    const pot: Component = {
      id: "test_only_pot", kind: "potentiometer", parameters: { ohms: 10e3, taper: { type: "linear" } }, part: RV16AF_41, pins: {},
      units: [{ name: "MAIN", pins: { ccw: n("GND"), wiper: n("TEST_ONLY_NODE"), cw: n("3V3_CODEC") } }], provenance: { source: "test-only control" },
    }
    const button: Component = {
      id: "test_only_button", kind: "switch", parameters: { positions: ["released", "pressed"], contacts: { released: [], pressed: [["1", "2"]] } },
      part: TC_6610, pins: {}, units: [{ name: "MAIN", pins: { "1": n("TEST_ONLY_NODE"), "2": n("GND") } }], provenance: { source: "test-only control" },
    }
    const block = codecBlock()
    const findings = checkDefaultPopulation({ ...block, components: [...block.components, pot, button] })
    expect(findings).toEqual([expect.stringContaining("test_only_button")])
  })
})
