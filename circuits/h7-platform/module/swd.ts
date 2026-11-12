/**
 * SWD (H7 module plan, Task 6): J_SWD and the debug pogo pads (processor-and-memory.md:266; D9).
 *
 * - J_SWD, Samtec FTSH-105-01-F-DV-K, the 2 x 5 1.27 mm Cortex debug header (parts.md:47), wired
 *   as ruling CR-MODULE-SWD-HEADER reads schematic-checklist.md USB-06 onto
 *   `Connector:Conn_ARM_JTAG_SWD_10` (`SWD_HEADER_CONNECTIONS`, not restated): 1 VTref the module's
 *   3V3, 2 SWDIO, 3 and 5 GND, 4 SWCLK, 6 SWO, 7 key and 8 not connected, 9 GNDDetect GND, 10 NRST.
 * - Pogo pads for SWDIO, SWCLK, NRST, the module's 3V3 and GND (:266). The NRST pad is also
 *   CORE-10's "and a pogo pad"; it is one pad.
 */
import type { Network } from "../../../lib/model/index.ts"
import { SWD_HEADER, SWD_HEADER_CONNECTIONS } from "../module-parts.ts"
import { TEST_POINT } from "../parts.ts"
import { block, part } from "./build.ts"
import { NET_3V3, NET_GND, NET_NRST } from "./nets.ts"

const POGO = "processor-and-memory.md:266 (pogo pads for SWDIO, SWCLK, NRST, the module's 3V3 and GND)"

export function swdBlock(): Network {
  return block([
    part("j_swd", "connector", SWD_HEADER_CONNECTIONS, SWD_HEADER,
      "parts.md:47 (J_SWD, FTSH-105-01-F-DV-K, D9); processor-and-memory.md:266; USB-06; ruling CR-MODULE-SWD-HEADER"),
    part("tp_swdio", "connector", { "1": "SWDIO" }, TEST_POINT, POGO),
    part("tp_swclk", "connector", { "1": "SWCLK" }, TEST_POINT, POGO),
    part("tp_nrst", "connector", { "1": NET_NRST }, TEST_POINT, `${POGO}; CORE-10`),
    part("tp_3v3", "connector", { "1": NET_3V3 }, TEST_POINT, POGO),
    part("tp_gnd", "connector", { "1": NET_GND }, TEST_POINT, POGO),
  ], [NET_3V3, NET_GND, NET_NRST, "SWDIO", "SWCLK"])
}
