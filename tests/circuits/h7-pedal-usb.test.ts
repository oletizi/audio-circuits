/**
 * The h7-pedal's USB path, `usb` (h7 pedal pages plan, Task 8; inventory section 1.3 B16): the USB-C
 * receptacle with its CC resistors and shield RC, the USBLC6-2 with C_VBUS, the TS3USB221 isolation
 * switch with its enable pull-up and decoupling, and the VBUS sense divider with C_VBUS_SENSE. The
 * sources make it the carrier's circuit (CR-PEDAL-USB-C, CR-PEDAL-USBSW, CR-PEDAL-VBUS-SENSE-CAP,
 * CR-PEDAL-VBUS-IDS; CR-PEDAL-DIGITAL-READINGS for the private net names), so it is checked part by
 * part against the carrier model as well as against the cited lines.
 */
import { describe, expect, test } from "bun:test"
import type { Component } from "../../lib/model/index.ts"
import { h7Carrier } from "../../circuits/h7-platform/carrier-board.ts"
import { usbBlock } from "../../circuits/h7-platform/pedal/usb.ts"
import { PEDAL_USB_SWITCH, VBUS_CAP_IDS, VBUS_SENSE_CAP } from "../../circuits/h7-platform/pedal-rulings.ts"
import { expectBlock, expectPorts, type PartExpectation } from "./h7-pedal-expect.ts"

const C207 = "schematic-checklist.md:207"
const C213 = "schematic-checklist.md:213"
const C214 = "schematic-checklist.md:214"
const A257 = "architecture.md:257"
const A258 = "architecture.md:258"

const USB: readonly PartExpectation[] = [
  {
    id: "j_usb", kind: "connector", symbol: "Connector:USB_C_Receptacle_USB2.0_16P",
    pins: {
      A1: "GND", A4: "VBUS", A5: "USB_CC1", A6: "USB_C_DP", A7: "USB_C_DM", A8: "NC", A9: "VBUS", A12: "GND",
      B1: "GND", B4: "VBUS", B5: "USB_CC2", B6: "USB_C_DP", B7: "USB_C_DM", B8: "NC", B9: "VBUS", B12: "GND", SH: "USB_SHIELD",
    },
    cites: [
      [C207, "CC1 (A5) and CC2 (B5) each 5.1 kΩ 1 % to GND, separately"], [C207, "D+ (A6, B6) joined and D− (A7, B7) joined"],
      [C207, "SBU1/SBU2 open; the GND pins to GND at the connector"], ["schematic-checklist.md:208", "VBUS (A4, B4, A9, B9) goes only to the ESD part's pin 5"],
      ["decisions.md:2011", "the receptacle takes USB-01's wiring"],
    ],
  },
  { id: "r_cc1", kind: "resistor", value: 5.1e3, pins: { a: "USB_CC1", b: "GND" }, cites: [[C207, "CC1 (A5) and CC2 (B5) each 5.1 kΩ 1 % to GND"]] },
  { id: "r_cc2", kind: "resistor", value: 5.1e3, pins: { a: "USB_CC2", b: "GND" }, cites: [[C207, "CC1 (A5) and CC2 (B5) each 5.1 kΩ 1 % to GND"]] },
  { id: "r_shld", kind: "resistor", value: 1e6, pins: { a: "USB_SHIELD", b: "GND" }, cites: [[C214, "the shell to GND through R_SHLD 1 MΩ ∥ C_SHLD 4.7 nF 2 kV X7R 1206"]] },
  { id: "c_shld", kind: "capacitor", value: 4.7e-9, pins: { a: "USB_SHIELD", b: "GND" }, cites: [[C214, "the shell to GND through R_SHLD 1 MΩ ∥ C_SHLD 4.7 nF 2 kV X7R 1206"]] },
  {
    // USBLC6-2SC6: 1 I/O1, 2 GND, 3 I/O2, 4 I/O2, 5 VBUS, 6 I/O1.
    id: "u_esd", kind: "ic", mpn: "USBLC6-2SC6", pins: { "1": "USB_C_DP", "2": "GND", "3": "USB_C_DM", "4": "USB_C_DM", "5": "VBUS", "6": "USB_C_DP" },
    cites: [[C213, "D+ and D− through I/O1 (pins 1↔6) and I/O2 (pins 3↔4); pin 2 GND"], [C213, "pin 5 to VBUS"], ["parts.md:146", "USBLC6-2SC6"]],
  },
  {
    id: VBUS_CAP_IDS.esdBypass, kind: "capacitor", value: 100e-9, pins: { a: "VBUS", b: "GND" },
    cites: [[C213, "C_VBUS 100 nF X7R 50 V from pin 5 to GND at the part"], ["decisions.md:2042", "is `c_vbus`"]],
  },
  {
    // TS3USB221 RSE: 1 1D+, 2 1D-, 3 2D+, 4 2D-, 5 GND, 6 OE (bar), 7 D-, 8 D+, 9 S, 10 VCC.
    id: "u_usbsw", kind: "ic", mpn: "TS3USB221RSER",
    pins: { "1": "USB_C_DP", "2": "USB_C_DM", "3": "NC", "4": "NC", "5": "GND", "6": "USB_EN_N", "7": "USB_DM", "8": "USB_DP", "9": "GND", "10": "3V3_D" },
    cites: [
      [A258, "USB isolation switch TI TS3USB221RSER between the interface pins and the ESD part and receptacle, VCC from 3V3_D"],
      [A258, "active-low enable on pin 11"], ["decisions.md:2020", "S to GND selects port 1"], ["parts.md:145", "TS3USB221RSER"],
    ],
  },
  { id: "r_usben", kind: "resistor", value: 10e3, pins: { a: "3V3_D", b: "USB_EN_N" }, cites: [[A258, "held off by 10.0 kΩ to 3V3_D"]] },
  { id: "c_usbsw", kind: "capacitor", value: 100e-9, pins: { a: "3V3_D", b: "GND" }, cites: [["decisions.md:2020", "the carrier's 100 nF at VCC"]] },
  { id: "r_vbus_top", kind: "resistor", value: 12e3, pins: { a: "VBUS", b: "USB_VBUS_SENSE" }, cites: [[A257, "12.0 kΩ over 20.0 kΩ, 1 %"]] },
  { id: "r_vbus_bot", kind: "resistor", value: 20e3, pins: { a: "USB_VBUS_SENSE", b: "GND" }, cites: [[A257, "12.0 kΩ over 20.0 kΩ, 1 %"]] },
  {
    id: VBUS_CAP_IDS.senseNode, kind: "capacitor", value: 100e-9, pins: { a: "USB_VBUS_SENSE", b: "GND" },
    cites: [["decisions.md:2030", "from USB_VBUS_SENSE (pin 31) to GND"]],
  },
]

/** A component's electrical identity: kind, value, part and the net on every pin. */
function identity(c: Component): unknown {
  const pins = Object.fromEntries(c.units.flatMap((u) => Object.entries(u.pins)).map(([p, x]) => [p, x.kind === "net" ? x.net : "NC"]))
  return { kind: c.kind, parameters: c.parameters, part: c.part, pins }
}

describe("usb (B16)", () => {
  test("its parts, values and nets, each against its cited line", () => {
    expectBlock(usbBlock(), USB)
  })
  test("its ports: 3V3_D, USB_VBUS_SENSE, USB_EN_N, USB_DM, USB_DP and GND", () => {
    expectPorts(usbBlock(), ["3V3_D", "USB_VBUS_SENSE", "USB_EN_N", "USB_DM", "USB_DP", "GND"])
  })
  test("the USB path is the carrier's, part for part: same ids, kinds, values, parts and nets", () => {
    const carrier = h7Carrier()
    const pedal = usbBlock()
    for (const c of pedal.components) {
      const twin = carrier.components.find((x) => x.id === c.id)
      expect([c.id, twin === undefined ? undefined : identity(twin)]).toEqual([c.id, identity(c)])
    }
  })
  test("the switch's S, port 2 and decoupling, and the sense capacitor, are the Task 3 rulings' values", () => {
    const n = usbBlock()
    const sw = n.components.find((c) => c.id === "u_usbsw")?.units[0]?.pins
    expect(sw?.["9"]).toEqual({ kind: "net", net: PEDAL_USB_SWITCH.select })
    expect([sw?.["3"]?.kind, sw?.["4"]?.kind]).toEqual(["nc", "nc"])
    expect(n.components.find((c) => c.id === "c_usbsw")?.parameters).toEqual({ farads: PEDAL_USB_SWITCH.decouplingFarads })
    expect(n.components.find((c) => c.id === "c_vbus_sense")?.parameters).toEqual({ farads: VBUS_SENSE_CAP.farads })
    expect(n.components.find((c) => c.id === "r_vbus_top")?.parameters).toEqual({ ohms: VBUS_SENSE_CAP.dividerTopOhm })
    expect(n.components.find((c) => c.id === "r_vbus_bot")?.parameters).toEqual({ ohms: VBUS_SENSE_CAP.dividerBottomOhm })
  })
})
