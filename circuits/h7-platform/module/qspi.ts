/**
 * The QSPI flash (H7 module plan, Task 6): U_FLASH, Winbond W25Q128JVSIQ, SOIC-8 208 mil, on
 * QUADSPI bank 1, data only (processor-and-memory.md section 7; parts.md:32; D11).
 *
 * Pins as schematic-checklist.md CORE-23 lists them: 1 /CS = FLASH_NCS with a 10 kOhm pull-up to
 * the 3.3 V rail; 2 FLASH_IO1; 3 FLASH_IO2; 4 GND; 5 FLASH_IO0; 6 FLASH_CLK; 7 FLASH_IO3; 8 the
 * 3.3 V rail with 100 nF at the pin. The IQ suffix fixes QE = 1, so pins 3 and 7 are IO2 and IO3
 * and take no pull-up (CORE-23). processor-and-memory.md:258: "a 10 kOhm pull-up on its chip
 * select and 100 nF decoupling".
 */
import type { Network } from "../../../lib/model/index.ts"
import { FLASH } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, part, resistor } from "./build.ts"
import { NET_3V3, NET_GND } from "./nets.ts"

const CORE23 = "schematic-checklist.md CORE-23"

export function qspiBlock(): Network {
  return block([
    part("u_flash", "ic", {
      "1": "FLASH_NCS", "2": "FLASH_IO1", "3": "FLASH_IO2", "4": NET_GND,
      "5": "FLASH_IO0", "6": "FLASH_CLK", "7": "FLASH_IO3", "8": NET_3V3,
    }, FLASH, `parts.md:32 (U_FLASH, W25Q128JVSIQ, D11); ${CORE23} (pins 1-8)`),
    resistor("r_flash_ncs_pullup", "10k", "FLASH_NCS", NET_3V3, RESISTOR, `${CORE23} (10 kOhm pull-up on /CS); processor-and-memory.md:258`),
    capacitor("c_flash", "100n", NET_3V3, NET_GND, CAPACITOR, `${CORE23} (100 nF at pin 8); processor-and-memory.md:258; power.md:387`),
  ], [NET_3V3, NET_GND, "FLASH_NCS", "FLASH_CLK", "FLASH_IO0", "FLASH_IO1", "FLASH_IO2", "FLASH_IO3"])
}
