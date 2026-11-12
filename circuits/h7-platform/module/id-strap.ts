/**
 * The module identification strap (H7 module plan, Task 6; processor-and-memory.md section 9,
 * line 277): a resistor divider on a free module ADC pin, with the audio board's HW_REV scheme.
 *
 * - The pin is PC2_C, net MODULE_ID_STRAP (ruling CR-MODULE-ID-STRAP-PIN; `MODULE_PINS`).
 * - The divider is revision 1's row, read from `ID_STRAP` (ruling CR-MODULE-ID-STRAP-VALUES), not
 *   restated: R_top from VDDA (VREF+, net VREF_A) to the pin, R_bot from the pin to GND, and the
 *   capacitor at the pin to GND.
 */
import type { Network } from "../../../lib/model/index.ts"
import { ID_STRAP } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, resistor } from "./build.ts"
import { NET_GND, NET_VREF_A } from "./nets.ts"

const STRAP = "MODULE_ID_STRAP"
const RULING = "processor-and-memory.md:277; ruling CR-MODULE-ID-STRAP-VALUES (ID_STRAP, analog.md section 11 revision 1)"

export function idStrapBlock(): Network {
  return block([
    resistor("r_id_top", ID_STRAP.topOhm, NET_VREF_A, STRAP, RESISTOR, `${RULING}; the top on VDDA (VREF_A)`),
    resistor("r_id_bottom", ID_STRAP.bottomOhm, STRAP, NET_GND, RESISTOR, RULING),
    capacitor("c_id", ID_STRAP.pinCapF, STRAP, NET_GND, CAPACITOR, `${RULING}; at the pin`),
  ], [NET_VREF_A, NET_GND, STRAP])
}
