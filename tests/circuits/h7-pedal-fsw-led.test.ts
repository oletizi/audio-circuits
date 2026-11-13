/**
 * The h7-pedal's footswitch inputs and LEDs, `fsw_led` (h7 pedal pages plan, Task 8; inventory
 * section 1.3 B15). Per footswitch n: the 2-pad connector to the hung board (CR-PEDAL-FOOTSWITCH),
 * 10.0 kohm to 3V3_D and 100 nF at the node, 1.20 kohm from the node to FSWn. Per LED n: R_LEDn
 * 100 ohm from 3V3_P to the anode, the cathode to an AO3400A's drain, its source on GND, its gate
 * through 100 ohm from LEDn with a 10.0 kohm pull-down (CR-PEDAL-LED-MOSFET). Each expectation is
 * written from the cited lines.
 */
import { describe, expect, test } from "bun:test"
import { fswLedBlock } from "../../circuits/h7-platform/pedal/fsw-led.ts"
import { FOOTSWITCH_CONNECTION, LED_SWITCH } from "../../circuits/h7-platform/pedal-rulings.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const P415 = "power.md:415"
const C187 = "schematic-checklist.md:187"

function footswitch(f: 1 | 2): PartExpectation[] {
  const node = `FSW${f}_SW`
  return [
    {
      id: `j_fsw${f}`, kind: "connector", symbol: "Connector_Generic:Conn_01x02", pins: { "1": node, "2": "GND" },
      cites: [["mechanical-and-controls.md:398", "FSWn and GND cross on a 2-pin 2.54 straight header"], ["decisions.md:1991", "Pin 1 is the switch node"]],
    },
    {
      id: `r_fsw_pu${f}`, kind: "resistor", value: 10e3, pins: { a: "3V3_D", b: node },
      cites: [[P415, "10.0 kΩ pull-up to 3V3_D at the switch node"], ["schematic-checklist.md:183", "a 10 kΩ pull-up to 3V3_D"]],
    },
    {
      id: `c_fsw${f}`, kind: "capacitor", value: 100e-9, pins: { a: node, b: "GND" },
      cites: [[P415, "100 nF at the node"], ["schematic-checklist.md:183", "100 nF from the node to GND"]],
    },
    {
      id: `r_fsw${f}`, kind: "resistor", value: 1.2e3, mpn: "0603WAF1201T5E", pins: { a: node, b: `FSW${f}` },
      cites: [[P415, "**1.20 kΩ ±1 %** (C22765) from the node to the pin"], ["parts.md:137", "R_FSW1 and R_FSW2"]],
    },
  ]
}

function led(l: 1 | 2): PartExpectation[] {
  const anode = `LED${l}_A`
  const cathode = `LED${l}_K`
  const gate = `LED${l}_G`
  return [
    {
      id: `led${l}`, kind: "diode", mpn: "WP7113ID", pins: { anode, cathode },
      cites: [[C187, "the LED anode from **3V3_P** through R_LED, cathode to the drain"], ["parts.md:135", "LEDs, LED1 and LED2"]],
    },
    {
      id: `r_led${l}`, kind: "resistor", value: 100, mpn: "0603WAF1000T5E", pins: { a: "3V3_P", b: anode },
      cites: [[C187, "the LED anode from **3V3_P** through R_LED"], ["power.md:458", "**LED resistors 100 Ω**"], ["parts.md:136", "0603WAF1000T5E"]],
    },
    {
      // AO3400A: 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
      id: `q_led${l}`, kind: "ic", mpn: "AO3400A", pins: { "1": gate, "2": "GND", "3": cathode },
      cites: [[C187, "Each LED switched low side by an N-MOSFET"], [C187, "source to GND"], ["decisions.md:2001", "AO3400A"]],
    },
    {
      id: `r_led${l}_g`, kind: "resistor", value: 100, pins: { a: `LED${l}`, b: gate },
      cites: [[C187, "whose gate is driven through a series resistor (v1: 100 Ω) from LED1 / LED2"], ["decisions.md:2001", "The gate series resistor is **100 Ω**"]],
    },
    {
      id: `r_led${l}_pd`, kind: "resistor", value: 10e3, pins: { a: gate, b: "GND" },
      cites: [[C187, "the pull-down's value is [R-13](decisions.md#r-13)'s, 10.0 kΩ"], ["decisions.md:2208", "pull-down is on the gate, after the 100 Ω series resistor"]],
    },
  ]
}

describe("fsw_led (B15)", () => {
  test("its parts, values and nets, each against its cited line", () => {
    expectBlock(fswLedBlock(), [...footswitch(1), ...footswitch(2), ...led(1), ...led(2)])
  })
  test("its ports: 3V3_D, 3V3_P, FSW1, FSW2, LED1, LED2 and GND", () => {
    expectPorts(fswLedBlock(), ["3V3_D", "3V3_P", "FSW1", "FSW2", "LED1", "LED2", "GND"])
  })
  test("the footswitch connectors and LED switches are the Task 3 rulings' (FOOTSWITCH_CONNECTION, LED_SWITCH)", () => {
    const n = fswLedBlock()
    const part = (id: string) => n.components.find((c) => c.id === id)
    for (const f of [1, 2] as const) {
      const pins = Object.fromEntries(Object.entries(part(`j_fsw${f}`)?.units[0]?.pins ?? {}).map(([k, v]) => [k, v.kind === "net" ? v.net : "NC"]))
      expect(pins).toEqual({ ...FOOTSWITCH_CONNECTION.pins(f) })
      expect(part(`j_fsw${f}`)?.part).toEqual(FOOTSWITCH_CONNECTION.part)
    }
    for (const l of [1, 2]) {
      expect(part(`q_led${l}`)?.part).toEqual(LED_SWITCH.part)
      expect(part(`r_led${l}_g`)?.parameters).toEqual({ ohms: LED_SWITCH.gateSeriesOhm })
      expect(part(`r_led${l}_pd`)?.parameters).toEqual({ ohms: LED_SWITCH.gatePullDownOhm })
    }
  })
})
