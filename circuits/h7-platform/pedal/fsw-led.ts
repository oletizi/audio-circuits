/**
 * The pedal's two footswitch inputs and two LEDs (h7 pedal pages plan, Task 8; inventory section 1.3
 * B15; CR-PEDAL-BLOCKS `fsw_led`).
 *
 * Per footswitch n (R-22; power.md:415; CTL-04, schematic-checklist.md:183):
 * - J_FSWn, the 2-pad connection to the hung footswitch board, pin 1 the switch node FSWn_SW, pin 2
 *   GND (CR-PEDAL-FOOTSWITCH; mechanical-and-controls.md:398). The switch itself is on the hung board.
 * - 10.0 kOhm pull-up from 3V3_D to the node, 100 nF from the node to GND, and R_FSWn 1.20 kOhm 1 %
 *   (0603WAF1201T5E, parts.md:137) from the node to the contract pin FSWn.
 *
 * Per LED n (CTL-05, schematic-checklist.md:187; R-13, R-27; power.md:458):
 * - LEDn, WP7113ID (parts.md:135), anode from 3V3_P through R_LEDn 100 ohm (0603WAF1000T5E,
 *   parts.md:136), cathode to the switch's drain.
 * - The switch, an AO3400A (CR-PEDAL-LED-MOSFET), source on GND, gate through 100 ohm from the contract
 *   pin LEDn, with R-13's 10.0 kOhm pull-down on the gate (CR-PEDAL-DIGITAL-READINGS places it there).
 *
 * The private nets are FSWn_SW (CR-PEDAL-FOOTSWITCH's name) and LEDn_A, LEDn_K, LEDn_G, the anode,
 * cathode and gate nodes.
 */
import type { Component, Network, PartSpec } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { WP7113ID } from "../pedal-parts.ts"
import { FOOTSWITCH_CONNECTION, LED_SWITCH } from "../pedal-rulings.ts"
import { block, capacitor, diode, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const withMpn = (base: PartSpec, mpn: string): PartSpec => ({ ...base, mpn })

const V3D = contractNet("3V3_D")
const V3P = "3V3_P"
const GND = "GND"

function footswitch(f: 1 | 2): Component[] {
  const pins = FOOTSWITCH_CONNECTION.pins(f)
  const node = pins["1"]
  return [
    part(`j_fsw${f}`, "connector", pins, FOOTSWITCH_CONNECTION.part, "CR-PEDAL-FOOTSWITCH (mechanical-and-controls.md:398, the 2-pin header to the hung board)"),
    resistor(`r_fsw_pu${f}`, "10.0k", V3D, node, RESISTOR, "power.md:415 (10.0 kOhm pull-up to 3V3_D at the switch node; R-22); schematic-checklist.md:183 (CTL-04)"),
    capacitor(`c_fsw${f}`, "100n", node, GND, CAPACITOR, "power.md:415 (100 nF at the node); schematic-checklist.md:183 (100 nF from the node to GND)"),
    resistor(`r_fsw${f}`, "1.20k", node, contractNet(`FSW${f}`), withMpn(RESISTOR, "0603WAF1201T5E"),
      "power.md:415 (1.20 kOhm 1 % from the node to the pin; R-22); parts.md:137"),
  ]
}

function led(l: 1 | 2): Component[] {
  const anode = `LED${l}_A`
  const cathode = `LED${l}_K`
  const gate = `LED${l}_G`
  const ctl05 = "schematic-checklist.md:187 (CTL-05)"
  return [
    diode(`led${l}`, anode, cathode, WP7113ID, `${ctl05}: anode from 3V3_P through R_LED, cathode to the drain; parts.md:135`),
    resistor(`r_led${l}`, "100", V3P, anode, withMpn(RESISTOR, "0603WAF1000T5E"), `power.md:458 (LED resistors 100 ohm; R-27); ${ctl05}; parts.md:136`),
    part(`q_led${l}`, "ic", { "1": gate, "2": GND, "3": cathode }, LED_SWITCH.part, `${ctl05}: low side N-MOSFET, source to GND; CR-PEDAL-LED-MOSFET`),
    resistor(`r_led${l}_g`, LED_SWITCH.gateSeriesOhm, contractNet(`LED${l}`), gate, RESISTOR,
      `${ctl05}: gate driven through a series resistor from LED${l}; CR-PEDAL-LED-MOSFET (100 ohm; architecture.md:266)`),
    resistor(`r_led${l}_pd`, LED_SWITCH.gatePullDownOhm, gate, GND, RESISTOR,
      `${ctl05}: gate pull-down, R-13's 10.0 kOhm; CR-PEDAL-LED-MOSFET; on the gate: CR-PEDAL-DIGITAL-READINGS`),
  ]
}

export function fswLedBlock(): Network {
  return block([...footswitch(1), ...footswitch(2), ...led(1), ...led(2)], [
    V3D, V3P, contractNet("FSW1"), contractNet("FSW2"), contractNet("LED1"), contractNet("LED2"), GND,
  ])
}
