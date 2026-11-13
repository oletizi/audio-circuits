/**
 * The pedal's USB path (h7 pedal pages plan, Task 8; inventory section 1.3 B16; CR-PEDAL-BLOCKS
 * `usb`). The sources make it the carrier's circuit, and its ids and private net names are the
 * carrier's (CR-PEDAL-DIGITAL-READINGS); the test compares the two part by part.
 *
 * - J_USB, the stock 16-pin USB 2.0 Type-C receptacle, no MPN (CR-PEDAL-USB-C): CC1 (A5) and CC2 (B5)
 *   each 5.1 kOhm to GND; D+ (A6, B6) joined and D- (A7, B7) joined; SBU (A8, B8) open; the GND pins on
 *   GND (USB-01, schematic-checklist.md:207). VBUS (A4, B4, A9, B9) goes only to the ESD part's pin 5,
 *   its capacitor and the sense divider, and is on no rail (USB-02, :208).
 * - The shell through R_SHLD 1 MOhm in parallel with C_SHLD 4.7 nF 2 kV to GND (USB-05, :214).
 * - U_ESD, USBLC6-2SC6 (parts.md:146; D10): D+ through I/O1 (pins 1 and 6), D- through I/O2 (3 and 4),
 *   pin 2 GND, pin 5 VBUS with C_VBUS 100 nF X7R 50 V to GND (USB-04, :213; `c_vbus`, CR-PEDAL-VBUS-IDS).
 * - U_USBSW, TS3USB221RSER, between the interface pins 36/37 and the ESD part and receptacle, VCC from
 *   3V3_D, active-low OE on USB_EN_N (pin 11) held off by R_USBEN 10.0 kOhm to 3V3_D (R-14;
 *   architecture.md:258; parts.md:145). S (9) to GND and port 2 not connected, with 100 nF at VCC
 *   (CR-PEDAL-USBSW, `PEDAL_USB_SWITCH`).
 * - The VBUS sense divider, 12.0 kOhm over 20.0 kOhm 1 %, to USB_VBUS_SENSE (pin 31) (architecture.md:257),
 *   with R-57's sense-node capacitor fitted, `c_vbus_sense` (CR-PEDAL-VBUS-SENSE-CAP, `VBUS_SENSE_CAP`).
 *   VBUS-HOTPLUG stays open: the capacitor bounds the windows, it does not show a real plug-in stays in them.
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { TS3USB221, USBLC6_2SC6 } from "../pedal-parts.ts"
import { PEDAL_USB_C, PEDAL_USB_SWITCH, VBUS_CAP_IDS, VBUS_SENSE_CAP } from "../pedal-rulings.ts"
import { block, capacitor, part, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const V3D = contractNet("3V3_D")
const SENSE = contractNet("USB_VBUS_SENSE")
const EN_N = contractNet("USB_EN_N")
const DM = contractNet("USB_DM")
const DP = contractNet("USB_DP")
const GND = "GND"
const VBUS = "VBUS"
const C_DP = "USB_C_DP"
const C_DM = "USB_C_DM"
const SHIELD = "USB_SHIELD"

const CHK = "schematic-checklist.md"
const NAMES = "CR-PEDAL-DIGITAL-READINGS (the carrier's ids and net names)"

export function usbBlock(): Network {
  if (PEDAL_USB_SWITCH.port2 !== "not connected") {
    throw new Error(`CR-PEDAL-USBSW's port 2 is "${PEDAL_USB_SWITCH.port2}"; usb.ts draws it not connected, so the ruling and the model must be re-read together`)
  }
  return block([
    part("j_usb", "connector", {
      A1: GND, A4: VBUS, A5: "USB_CC1", A6: C_DP, A7: C_DM, A8: NC, A9: VBUS, A12: GND,
      B1: GND, B4: VBUS, B5: "USB_CC2", B6: C_DP, B7: C_DM, B8: NC, B9: VBUS, B12: GND, SH: SHIELD,
    }, PEDAL_USB_C.part, `${CHK}:207 (USB-01); ${CHK}:208 (USB-02, VBUS on no rail); ${CHK}:214 (USB-05, the shell); CR-PEDAL-USB-C; ${NAMES}`),
    resistor("r_cc1", "5.1k", "USB_CC1", GND, RESISTOR, `${CHK}:207 (USB-01, CC1 5.1 kOhm 1 % to GND)`),
    resistor("r_cc2", "5.1k", "USB_CC2", GND, RESISTOR, `${CHK}:207 (USB-01, CC2 5.1 kOhm 1 % to GND)`),
    resistor("r_shld", "1M", SHIELD, GND, RESISTOR, `${CHK}:214 (USB-05, R_SHLD 1 MOhm)`),
    capacitor("c_shld", "4.7n", SHIELD, GND, CAPACITOR, `${CHK}:214 (USB-05, C_SHLD 4.7 nF 2 kV X7R 1206)`),
    part("u_esd", "ic", { "1": C_DP, "2": GND, "3": C_DM, "4": C_DM, "5": VBUS, "6": C_DP }, USBLC6_2SC6,
      `${CHK}:213 (USB-04, I/O1 pins 1 and 6, I/O2 pins 3 and 4, pin 2 GND, pin 5 VBUS); parts.md:146 (D10)`),
    capacitor(VBUS_CAP_IDS.esdBypass, "100n", VBUS, GND, CAPACITOR, `${CHK}:213 (USB-04, C_VBUS 100 nF X7R 50 V from pin 5 to GND); CR-PEDAL-VBUS-IDS`),
    part("u_usbsw", "ic", {
      "1": C_DP, "2": C_DM, "3": NC, "4": NC, "5": GND, "6": EN_N, "7": DM, "8": DP, "9": PEDAL_USB_SWITCH.select, "10": V3D,
    }, TS3USB221, "architecture.md:258 (U_USBSW between pins 36/37 and the ESD part, VCC 3V3_D, OE on pin 11; R-14); parts.md:145; S and port 2: CR-PEDAL-USBSW"),
    resistor("r_usben", "10.0k", V3D, EN_N, RESISTOR, "architecture.md:258 (held off by 10.0 kOhm to 3V3_D); R-14"),
    capacitor("c_usbsw", PEDAL_USB_SWITCH.decouplingFarads, V3D, GND, CAPACITOR, "CR-PEDAL-USBSW (the carrier's 100 nF at VCC, TI SCDS220M p. 15 section 8.3)"),
    resistor("r_vbus_top", VBUS_SENSE_CAP.dividerTopOhm, VBUS, SENSE, RESISTOR, "architecture.md:257 (12.0 kOhm over 20.0 kOhm, 1 %); CR-PEDAL-VBUS-SENSE-CAP"),
    resistor("r_vbus_bot", VBUS_SENSE_CAP.dividerBottomOhm, SENSE, GND, RESISTOR, "architecture.md:257 (12.0 kOhm over 20.0 kOhm, 1 %); CR-PEDAL-VBUS-SENSE-CAP"),
    capacitor(VBUS_CAP_IDS.senseNode, VBUS_SENSE_CAP.farads, SENSE, GND, CAPACITOR,
      "CR-PEDAL-VBUS-SENSE-CAP (R-57's option fitted, parts.md:177); open-items.md:78 (VBUS-HOTPLUG stays open)"),
  ], [V3D, SENSE, EN_N, DM, DP, GND])
}
