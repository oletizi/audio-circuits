/**
 * Reset and boot (H7 module plan, Task 6): U_SUP and the NRST network, the BOOT0 network, and the
 * RESET and BOOT buttons (processor-and-memory.md section 8, lines 264-265; D14, D6).
 *
 * - U_SUP, TLV803EA30DBZR, open drain on NRST, sensing the module's 3V3 at the MCU (:264;
 *   power.md:385). Pins as schematic-checklist.md CORE-11 gives the plain DBZ variant: 1 GND,
 *   2 RESET to NRST, 3 VDD on the 3.3 V rail; C_SUP 100 nF X7R from pin 3 to pin 1 (CORE-11,
 *   SLVSES2J section 8.3.1; power.md:387, "the supervisor 100 nF at its VDD"). The symbol is a pin
 *   stand-in (ruling CR-MODULE-SUPERVISOR-SYMBOL).
 * - NRST: 10 kOhm pull-up, 100 nF to VSS, the RESET button to VSS (:264; CORE-10). The SWD header's
 *   NRST and the NRST pogo pad are in swd.ts.
 * - BOOT0 (pin 166): 4.7 kOhm pull-down to VSS, 100 nF to VSS, the BOOT button to VDD (:265;
 *   CORE-12). The BOOT0 pogo pad is with the D15 bench pads in mcu-decoupling.ts.
 * - SW_RESET and SW_BOOT, C&K PTS645VL31-2 LFS (parts.md:48).
 */
import type { Network } from "../../../lib/model/index.ts"
import { SUPERVISOR, TACTILE_SWITCH } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, part, pushButton, resistor } from "./build.ts"
import { NET_3V3, NET_BOOT0, NET_GND, NET_NRST } from "./nets.ts"

const NRST = "processor-and-memory.md:264 (D14, owner-approved); CORE-10"
const BOOT0 = "processor-and-memory.md:265 (D6); CORE-12"

export function resetBootBlock(): Network {
  return block([
    part("u_sup", "ic", { "1": NET_GND, "2": NET_NRST, "3": NET_3V3 }, SUPERVISOR,
      "parts.md:34 (U_SUP, TLV803EA30DBZR, D14); processor-and-memory.md:264; CORE-11 (pin 1 GND, 2 RESET, 3 VDD); ruling CR-MODULE-SUPERVISOR-SYMBOL"),
    capacitor("c_sup", "100n", NET_3V3, NET_GND, CAPACITOR, "CORE-11 (C_SUP 100 nF from pin 3 to pin 1); power.md:387"),
    resistor("r_nrst_pullup", "10k", NET_3V3, NET_NRST, RESISTOR, `${NRST} (10 kOhm pull-up)`),
    capacitor("c_nrst", "100n", NET_NRST, NET_GND, CAPACITOR, `${NRST} (100 nF to VSS)`),
    pushButton("sw_reset", NET_NRST, NET_GND, TACTILE_SWITCH, `${NRST} (the RESET button to VSS); parts.md:48`),
    resistor("r_boot0_pulldown", "4.7k", NET_BOOT0, NET_GND, RESISTOR, `${BOOT0} (4.7 kOhm pull-down)`),
    capacitor("c_boot0", "100n", NET_BOOT0, NET_GND, CAPACITOR, `${BOOT0} (100 nF to VSS)`),
    pushButton("sw_boot", NET_BOOT0, NET_3V3, TACTILE_SWITCH, `${BOOT0} (the BOOT button to VDD); parts.md:48`),
  ], [NET_3V3, NET_GND, NET_NRST, NET_BOOT0])
}
