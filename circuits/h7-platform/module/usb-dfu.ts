/**
 * The module's own USB socket for ROM DFU (H7 module plan, Task 6): J_USB_MOD, its ESD part, Rd on
 * CC1 and CC2, and the shell network (processor-and-memory.md:267; O-11, R-60).
 *
 * - J_USB_MOD, HRO TYPE-C-31-E-17 (parts.md:46) on `Connector:USB_C_Receptacle_USB2.0_16P`:
 *   CC1 (A5) and CC2 (B5) each 5.1 kOhm 1 % Rd to GND; DP1/DP2 (A6, B6) and DN1/DN2 (A7, B7) joined
 *   at the receptacle, to PA12/PA11 through the ESD part (:267).
 * - The ESD part is the USBLC6-2SC6 wired as USB-04 wires it, socket side pins 1 and 3, MCU side
 *   pins 6 and 4, pin 2 GND, pin 5 on the socket's four VBUS pins and nothing else, with 100 nF from
 *   pin 5 to GND (ruling CR-MODULE-USB-ESD; `DFU_ESD_WIRING`, `DFU_VBUS_CAP_F`, not restated).
 * - GND pins A1, A12, B1, B12 to GND; SBU1 (A8) and SBU2 (B8) not connected; the shell (SH) to GND
 *   through 1 MOhm in parallel with 4.7 nF, the carrier's and the pedal's treatment (ruling
 *   CR-MODULE-USB-C-PINS; CR-CARRIER-USB-C; schematic-checklist.md USB-05).
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { DFU_ESD, DFU_ESD_WIRING, DFU_SOCKET, DFU_VBUS_CAP_F } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { block, capacitor, part, resistor } from "./build.ts"
import { NET_GND } from "./nets.ts"

function wired(pin: string): string {
  const net = DFU_ESD_WIRING[pin]
  if (net === undefined) throw new Error(`DFU_ESD_WIRING (module-parts.ts) has no net for USBLC6 pin ${pin}`)
  return net
}

const CONN_DP = wired("1")
const CONN_DM = wired("3")
const VBUS = wired("5")
const USB_DP = wired("6")
const USB_DM = wired("4")
const CC1 = "CC1"
const CC2 = "CC2"
const SHIELD = "SHIELD"

const PM267 = "processor-and-memory.md:267"
const PINS = "ruling CR-MODULE-USB-C-PINS"

export function usbDfuBlock(): Network {
  if (wired("2") !== NET_GND) throw new Error(`DFU_ESD_WIRING puts USBLC6 pin 2 on "${wired("2")}", not GND (USB-04)`)
  return block([
    part("j_usb_mod", "connector", {
      A1: NET_GND, A4: VBUS, A5: CC1, A6: CONN_DP, A7: CONN_DM, A8: NC, A9: VBUS, A12: NET_GND,
      B1: NET_GND, B4: VBUS, B5: CC2, B6: CONN_DP, B7: CONN_DM, B8: NC, B9: VBUS, B12: NET_GND,
      SH: SHIELD,
    }, DFU_SOCKET, `parts.md:46 (J_USB_MOD, HRO TYPE-C-31-E-17, R-60); ${PM267} (CC, DP/DN joined); VBUS ruling CR-MODULE-USB-ESD; GND, SBU and shell ${PINS}`),
    part("u_esd", "ic", DFU_ESD_WIRING, DFU_ESD, `${PM267} ("through the ESD part"); ruling CR-MODULE-USB-ESD; schematic-checklist.md USB-04`),
    capacitor("c_vbus", DFU_VBUS_CAP_F, VBUS, NET_GND, CAPACITOR, "ruling CR-MODULE-USB-ESD (100 nF from pin 5 to GND at the part); schematic-checklist.md USB-04"),
    resistor("r_cc1", "5.1k", CC1, NET_GND, RESISTOR, `${PM267} (CC1, A5, 5.1 kOhm 1 % Rd to GND)`),
    resistor("r_cc2", "5.1k", CC2, NET_GND, RESISTOR, `${PM267} (CC2, B5, 5.1 kOhm 1 % Rd to GND)`),
    resistor("r_shld", "1M", SHIELD, NET_GND, RESISTOR, `${PINS} (1 MOhm shell to GND); schematic-checklist.md USB-05; CR-CARRIER-USB-C`),
    capacitor("c_shld", "4.7n", SHIELD, NET_GND, CAPACITOR, `${PINS} (4.7 nF shell to GND, in parallel); schematic-checklist.md USB-05; CR-CARRIER-USB-C`),
  ], [NET_GND, USB_DP, USB_DM])
}
