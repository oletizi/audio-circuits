/**
 * The HSE (H7 module plan, Task 6): Y_HSE, NDK NX3225GA 25 MHz CL 8 pF, and its two load
 * capacitors (processor-and-memory.md section 3; parts.md:33; D8).
 *
 * - The crystal sits between PH0/HSE_IN (pin 29) and PH1/HSE_OUT (pin 30), both case pads to GND
 *   (schematic-checklist.md CORE-13). On `Device:Crystal_GND24` pins 1 and 3 are the crystal and 2
 *   and 4 its case pads, which NDK says are unconnected inside and "better to connect with a GND"
 *   (processor-and-memory.md:116). Pin 1 takes HSE_IN and pin 3 HSE_OUT.
 * - CL1 = CL2 = 8 pF C0G, one from each crystal pin to GND, no series resistor (:117; CORE-14;
 *   ruling CR-MODULE-HSE-LOAD, `HSE_LOAD_CAP_F`).
 */
import type { Network } from "../../../lib/model/index.ts"
import { CRYSTAL, HSE_LOAD_CAP_F } from "../module-parts.ts"
import { CAPACITOR } from "../parts.ts"
import { block, capacitor, part } from "./build.ts"
import { NET_GND } from "./nets.ts"

const LOAD = "processor-and-memory.md:117 (CL1 = CL2 = 8 pF C0G, no series resistor); CORE-14; ruling CR-MODULE-HSE-LOAD"

export function clockBlock(): Network {
  return block([
    part("y_hse", "ic", { "1": "HSE_IN", "2": NET_GND, "3": "HSE_OUT", "4": NET_GND }, CRYSTAL,
      "parts.md:33 (Y_HSE, NX3225GA-25.000M-STD-CRG-2, D8); processor-and-memory.md:116; CORE-13 (between PH0 and PH1, case pads to GND)"),
    capacitor("c_hse_in", HSE_LOAD_CAP_F, "HSE_IN", NET_GND, CAPACITOR, `${LOAD}; CL1 on HSE_IN`),
    capacitor("c_hse_out", HSE_LOAD_CAP_F, "HSE_OUT", NET_GND, CAPACITOR, `${LOAD}; CL2 on HSE_OUT`),
  ], [NET_GND, "HSE_IN", "HSE_OUT"])
}
