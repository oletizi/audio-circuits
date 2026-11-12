/**
 * The MCU's decoupling and its bench pads (H7 module plan, Task 6).
 *
 * processor-and-memory.md section 4 (lines 136-141) and D7 (:31), with schematic-checklist.md
 * CORE-01 to CORE-06 giving them per pin:
 * - 100 nF at each of the 14 VDD pins (CORE-01; the pins are ST's, counted from the pin data);
 * - one >= 4.7 uF ceramic for the package (CORE-02; 4.7 uF, the value CORE-02 says v1 contained);
 * - VDD33USB (pin 114) 100 nF plus 1 uF (:137; CORE-05);
 * - VBAT (pin 6) 100 nF (:137; CORE-06);
 * - VCAP1 and VCAP2 joined, 2.2 uF on each (:136; CORE-04).
 * Every capacitor returns to GND. In the model all of them are on the pin's net; "at the pin" is
 * a layout requirement this model cannot state.
 *
 * Bench pads (D15, owner-approved; processor-and-memory.md:141): one on VCAP and one on VDDA, each
 * with a GND pad, and a pogo pad on BOOT0. VDDA's net is VREF_A (nets.ts). Which other v1 pads the
 * module carries is open item TEST-PAD-SPLIT; the SWD pogo pads (:266) are in swd.ts.
 */
import type { Component, Network } from "../../../lib/model/index.ts"
import { CAPACITOR, TEST_POINT } from "../parts.ts"
import { loadPinData } from "../st-pin-data.ts"
import { block, capacitor, part } from "./build.ts"
import { NET_3V3, NET_BOOT0, NET_GND, NET_VCAP, NET_VREF_A } from "./nets.ts"

const D7 = "processor-and-memory.md:31 (D7), :137"

export function mcuDecouplingBlock(): Network {
  const vddPins = loadPinData().pins.filter((p) => p.name === "VDD").map((p) => p.position)
  if (vddPins.length !== 14) {
    throw new Error(`ST's pin data lists ${vddPins.length} VDD pins; processor-and-memory.md:137 and CORE-01 give 14, so the decoupling count cannot be taken from either alone`)
  }
  const parts: Component[] = vddPins.map((pin) =>
    capacitor(`c_vdd_${pin}`, "100n", NET_3V3, NET_GND, CAPACITOR, `${D7} (100 nF at VDD pin ${pin}); CORE-01`))
  parts.push(
    capacitor("c_vdd_bulk", "4.7u", NET_3V3, NET_GND, CAPACITOR, `${D7} (one >= 4.7 uF ceramic close to the package); CORE-02 (4.7 uF)`),
    capacitor("c_vdd33usb", "100n", NET_3V3, NET_GND, CAPACITOR, `${D7} (100 nF at VDD33USB, pin 114); CORE-05`),
    capacitor("c_vdd33usb_bulk", "1u", NET_3V3, NET_GND, CAPACITOR, `${D7} (VDD33USB gains 1 uF beside its 100 nF); CORE-05`),
    capacitor("c_vbat", "100n", NET_3V3, NET_GND, CAPACITOR, `${D7} (VBAT pin 6 tied to VDD with 100 nF); CORE-06`),
    capacitor("c_vcap1", "2.2u", NET_VCAP, NET_GND, CAPACITOR, "processor-and-memory.md:136 (2.2 uF on VCAP1, pin 81); CORE-04"),
    capacitor("c_vcap2", "2.2u", NET_VCAP, NET_GND, CAPACITOR, "processor-and-memory.md:136 (2.2 uF on VCAP2, pin 125); CORE-04"),
  )
  const d15 = "processor-and-memory.md:141 (D15, owner-approved: bench pads on VCAP and VDDA, each with a GND pad, and a pogo pad on BOOT0)"
  parts.push(
    part("tp_vcap", "connector", { "1": NET_VCAP }, TEST_POINT, d15),
    part("tp_vcap_gnd", "connector", { "1": NET_GND }, TEST_POINT, d15),
    part("tp_vdda", "connector", { "1": NET_VREF_A }, TEST_POINT, `${d15}; VDDA is net VREF_A (:40 D16)`),
    part("tp_vdda_gnd", "connector", { "1": NET_GND }, TEST_POINT, d15),
    part("tp_boot0", "connector", { "1": NET_BOOT0 }, TEST_POINT, `${d15}; :265`),
  )
  return block(parts, [NET_3V3, NET_GND, NET_VCAP, NET_VREF_A, NET_BOOT0])
}
