/**
 * The h7-pedal's open choices, ruled (h7 pedal pages plan, Task 3): one constant per ruled value, each
 * carrying the id of its entry in `docs/h7-platform/decisions.md`, so the block models import a value
 * instead of retyping it. Every ruling here is a controller ruling (the owner may override), with a cost
 * if wrong in its entry. Not-fitted positions and MIDI are in `pedal-population.ts`.
 *
 * `sources` are `path:line` citations into this repository; `tests/circuits/h7-pedal-rulings.test.ts`
 * reads each one. A value the pedal adopts from the carrier or the module is read from that model or
 * constant, never copied: the USB switch's decoupling and the VBUS sense capacitor from `h7Carrier()`,
 * the HW_REV divider from the module's `ID_STRAP`.
 */
import type { Component, PartSpec } from "../../lib/model/index.ts"
import { h7Carrier } from "./carrier-board.ts"
import { ID_STRAP } from "./module-parts.ts"
import { HEADER_2, TEST_POINT, USB_C_RECEPTACLE } from "./parts.ts"
import { AO3400A } from "./pedal-parts.ts"

const CHK = "docs/h7-platform/schematic-checklist.md"
const OI = "docs/h7-platform/open-items.md"

/** A carrier part's value, read from the carrier model (the pedal adopts the carrier's ruling for it). */
function carrierValue(id: string, quantity: "farads" | "ohms"): number {
  const part: Component | undefined = h7Carrier().components.find((c) => c.id === id)
  if (part === undefined) {
    throw new Error(
      `the carrier model (circuits/h7-platform/carrier-board.ts) has no "${id}". The pedal adopts the ` +
        "carrier's ruled value for it (decisions.md CR-PEDAL-USBSW, CR-PEDAL-VBUS-SENSE-CAP) rather than " +
        "retyping it, so the carrier must carry the part; restore it there, or rule the pedal's value separately.",
    )
  }
  const parameters = part.parameters
  if (quantity === "farads" && "farads" in parameters) return parameters.farads
  if (quantity === "ohms" && "ohms" in parameters) return parameters.ohms
  throw new Error(`the carrier's "${id}" has no ${quantity}; the pedal reads that value from it (decisions.md CR-PEDAL-*)`)
}

/** CR-PEDAL-DC-JACK: a generic 2-pin barrel jack, no MPN; centre pin (1) GND, sleeve (2) VIN; no switch contact. */
export const DC_JACK = {
  ruling: "CR-PEDAL-DC-JACK",
  part: { symbol: "Connector:Barrel_Jack", electricallyInert: true } satisfies PartSpec,
  pins: { "1": "GND", "2": "VIN" },
  sources: [`${CHK}:117`, "docs/h7-platform/parts.md:134", `${OI}:123`, "docs/h7-platform/power.md:47"],
} as const

/**
 * CR-PEDAL-FB-IN: FB_IN in series on the path both branches share, between the jack node VIN (C_SCH, the
 * supervisor's sense point, R_VBLD) and VIN_FB, the node D_AIN's and D_MIN's anodes take. C_PROTHF sits on
 * VIN_A beside C_PROT, where v1 had it on VIN_PROT.
 */
export const FB_IN_POSITION = {
  ruling: "CR-PEDAL-FB-IN",
  ferrite: { a: "VIN", b: "VIN_FB" },
  cSch: "VIN",
  cProtHf: "VIN_A",
  diodeAnodes: "VIN_FB",
  /** The model's inductance: the hot-plug grid's upper bound, "an optional ferrite 0-3 uH" (power.md:295). Drawn as the rating. */
  modelHenries: 3e-6,
  sources: [
    "docs/h7-platform/power.md:25", "docs/h7-platform/power.md:28", "docs/h7-platform/power.md:295",
    "docs/h7-platform/power.md:498", "docs/h7-platform/parts.md:58", "docs/h7-platform/parts.md:82", `${OI}:56`,
  ],
} as const

/** CR-PEDAL-CHASSIS-PAD: the chassis-bond GND pad is layout (pad geometry on GND), not a model part. */
export const CHASSIS_BOND_PAD = {
  ruling: "CR-PEDAL-CHASSIS-PAD",
  modelled: false,
  sources: ["docs/h7-platform/power.md:533", "docs/h7-platform/decisions.md:652", "docs/h7-platform/layout-carry-forward.md:71"],
} as const

/** CR-PEDAL-LOGIC-DECOUPLING: 100 nF on each logic buffer's single VCC pin, from each part's data sheet. */
export const LOGIC_DECOUPLING = {
  ruling: "CR-PEDAL-LOGIC-DECOUPLING",
  parts: [
    {
      part: "U_ISO_M", net: "3V3_D", farads: 100e-9,
      datasheet: "TI SCES366L (rev. October 2015) p. 10, section 10 Power Supply Recommendations; https://www.ti.com/lit/ds/symlink/sn74lvc3g34.pdf",
    },
    {
      part: "U_ISO_C", net: "3V3_CODEC", farads: 100e-9,
      datasheet: "TI SCES519O (rev. October 2025) p. 15, section 8.3 Power Supply Recommendations; https://www.ti.com/lit/ds/symlink/sn74lvc1g34.pdf",
    },
    {
      part: "U_MIDIDRV", net: "3V3_D", farads: 100e-9,
      datasheet: "TI SCES296AG (rev. October 2025) p. 11, section 8.3 Power Supply Recommendations; https://www.ti.com/lit/ds/symlink/sn74lvc1g07.pdf",
    },
  ],
  sources: ["docs/h7-platform/architecture.md:255", "docs/h7-platform/architecture.md:256", "docs/h7-platform/parts.md:139"],
} as const

/**
 * CR-PEDAL-TEST-PADS: the pedal's test pads, one `Connector:TestPoint` each. Power pads on VIN, VIN_A,
 * VIN_MOD, 5V_A and 3V3_D with one GND pad; an input pad on each channel's R_RF/C_RF node and an output
 * pad on each FX_OUT, each with a GND pad beside it. `dropped` gives each v1 pad the pedal does not carry.
 */
export const TEST_PADS = {
  ruling: "CR-PEDAL-TEST-PADS",
  part: TEST_POINT,
  pads: [
    { id: "tp_vin", net: "VIN", v1: "VIN before the Schottky" },
    { id: "tp_vin_a", net: "VIN_A", v1: "VIN_PROT" },
    { id: "tp_vin_mod", net: "VIN_MOD", v1: "none: BU-25 scopes VIN_MOD at pin 39" },
    { id: "tp_5v_a", net: "5V_A", v1: "5V_A" },
    { id: "tp_3v3_d", net: "3V3_D", v1: "3V3_D" },
    { id: "tp_gnd", net: "GND", v1: "GND (the grid's)" },
    { id: "tp_in_l", net: "IN_RF_L", v1: "audio input pad, left (AIO-02)" },
    { id: "tp_in_l_gnd", net: "GND", v1: "its GND pad" },
    { id: "tp_in_r", net: "IN_RF_R", v1: "audio input pad, right (AIO-02)" },
    { id: "tp_in_r_gnd", net: "GND", v1: "its GND pad" },
    { id: "tp_out_l", net: "FX_OUT_L", v1: "audio output pad, left (AIO-17)" },
    { id: "tp_out_l_gnd", net: "GND", v1: "its GND pad" },
    { id: "tp_out_r", net: "FX_OUT_R", v1: "audio output pad, right (AIO-17)" },
    { id: "tp_out_r_gnd", net: "GND", v1: "its GND pad" },
  ],
  dropped: [
    { v1: "SWDIO, SWCLK, NRST pogo pads", reason: "the SWD header and its pogo pads move to the module (split spec section 6.1; module/swd.ts)" },
    { v1: "BOOT0 pogo pad", reason: "BOOT0 is a module pin; D15 keeps the pad on the module" },
    { v1: "VDDA and VCAP bench pads", reason: "D15 keeps them on the module" },
    { v1: "VIN_BUCK bench pads", reason: "VIN_BUCK is the module's input network (power.md:29); it is not a pedal net" },
  ],
  sources: [
    "docs/h7-platform/layout-carry-forward.md:88", `${OI}:124`, `${OI}:144`, "docs/h7-platform/architecture.md:344",
    `${CHK}:152`, `${CHK}:167`, "docs/h7-platform/bring-up.md:88", "docs/h7-platform/decisions.md:241",
    "docs/h7-platform/decisions.md:133", "docs/h7-platform/power.md:26",
  ],
} as const

/** CR-PEDAL-HW-REV: revision 1's divider, VREF_A to HW_REV to GND, read from the module's `ID_STRAP`. */
export const HW_REV_STRAP = {
  ruling: "CR-PEDAL-HW-REV",
  revision: 1,
  top: "VREF_A",
  pin: "HW_REV",
  topOhm: ID_STRAP.topOhm,
  bottomOhm: ID_STRAP.bottomOhm,
  pinCapF: ID_STRAP.pinCapF,
  sources: ["docs/h7-platform/analog.md:347", "docs/h7-platform/analog.md:351", "docs/h7-platform/decisions.md:1499"],
} as const

/**
 * CR-PEDAL-CONTROL-NODE: per position n, the node POS<n>_NODE joins the pot's wiper, R_PUn from 3V3_D, the
 * button and R_POSn; the button's far side goes through R_BTNn to GND; R_POSn reaches the contract pin POS<n>,
 * where C_POSn sits. The pot runs ccw GND to cw VREF_A. Both fits are drawn at every position.
 */
export const CONTROL_POSITION = {
  ruling: "CR-PEDAL-CONTROL-NODE",
  positions: 6,
  seriesOhm: 10e3,
  pinCapF: 100e-9,
  buttonOhm: 1e3,
  pullUpOhm: 10e3,
  sources: [
    "docs/h7-platform/power.md:417", "docs/h7-platform/architecture.md:230", "docs/h7-platform/analog.md:364",
    "docs/h7-platform/mechanical-and-controls.md:298", "docs/h7-platform/mechanical-and-controls.md:300",
  ],
} as const

export interface ControlPositionNets {
  readonly pot: { readonly ccw: string; readonly wiper: string; readonly cw: string }
  readonly pullUp: { readonly a: string; readonly b: string }
  readonly button: { readonly "1": string; readonly "2": string }
  readonly buttonResistor: { readonly a: string; readonly b: string }
  readonly series: { readonly a: string; readonly b: string }
  readonly pinCap: { readonly a: string; readonly b: string }
}

/** The nets of control position `n` (1 to 6), as CR-PEDAL-CONTROL-NODE draws them. */
export function controlPositionNets(n: number): ControlPositionNets {
  if (!Number.isInteger(n) || n < 1 || n > CONTROL_POSITION.positions) {
    throw new Error(
      `control position ${n} does not exist: the pedal has positions 1 to 6 (contract pins 22-27, POS1..POS6; ` +
        "analog.md section 12). Not defaulted, because a seventh position would have no contract pin.",
    )
  }
  const node = `POS${n}_NODE`
  const button = `POS${n}_BTN`
  const pin = `POS${n}`
  return {
    pot: { ccw: "GND", wiper: node, cw: "VREF_A" },
    pullUp: { a: "3V3_D", b: node },
    button: { "1": node, "2": button },
    buttonResistor: { a: button, b: "GND" },
    series: { a: node, b: pin },
    pinCap: { a: pin, b: "GND" },
  }
}

/** CR-PEDAL-FOOTSWITCH: a 2-pad connector per input, pin 1 the switch node FSW<n>_SW, pin 2 GND. */
export const FOOTSWITCH_CONNECTION = {
  ruling: "CR-PEDAL-FOOTSWITCH",
  part: HEADER_2,
  pins: (n: 1 | 2): { readonly "1": string; readonly "2": string } => ({ "1": `FSW${n}_SW`, "2": "GND" }),
  sources: ["docs/h7-platform/mechanical-and-controls.md:398", "docs/h7-platform/power.md:415", `${CHK}:183`],
} as const

/** CR-PEDAL-LED-MOSFET: each LED's low-side switch is an AO3400A, gate through 100 ohm, 10.0 kohm pull-down. */
export const LED_SWITCH = {
  ruling: "CR-PEDAL-LED-MOSFET",
  part: AO3400A,
  gateSeriesOhm: 100,
  gatePullDownOhm: 10e3,
  sources: [`${CHK}:187`, "docs/h7-platform/parts.md:61", "docs/h7-platform/architecture.md:266", "docs/h7-platform/decisions.md:876"],
} as const

/** CR-PEDAL-USB-C: the pedal's receptacle is the stock generic USB 2.0 Type-C symbol, no MPN. */
export const PEDAL_USB_C = {
  ruling: "CR-PEDAL-USB-C",
  part: USB_C_RECEPTACLE,
  sources: [`${CHK}:207`, `${CHK}:208`, `${CHK}:214`],
} as const

/** CR-PEDAL-USBSW: the carrier's rulings for U_USBSW hold on the pedal: S to GND, port 2 unused, 100 nF at VCC. */
export const PEDAL_USB_SWITCH = {
  ruling: "CR-PEDAL-USBSW",
  select: "GND",
  port2: "not connected",
  decouplingFarads: carrierValue("c_usbsw", "farads"),
  sources: ["docs/h7-platform/decisions.md:885", "docs/h7-platform/decisions.md:1376", "docs/h7-platform/architecture.md:258"],
} as const

/** CR-PEDAL-VBUS-SENSE-CAP: R-57's sense-node capacitor is fitted on the pedal, at the carrier's value. */
export const VBUS_SENSE_CAP = {
  ruling: "CR-PEDAL-VBUS-SENSE-CAP",
  farads: carrierValue("c_vbus_sense", "farads"),
  dividerTopOhm: carrierValue("r_vbus_top", "ohms"),
  dividerBottomOhm: carrierValue("r_vbus_bot", "ohms"),
  sources: [`${OI}:78`, "docs/h7-platform/parts.md:177", "docs/h7-platform/architecture.md:257", "docs/h7-platform/decisions.md:1366"],
} as const

/** CR-PEDAL-VBUS-IDS: the two capacitors two documents both call C_VBUS take the carrier's ids. */
export const VBUS_CAP_IDS = {
  ruling: "CR-PEDAL-VBUS-IDS",
  esdBypass: "c_vbus",
  senseNode: "c_vbus_sense",
  sources: [`${CHK}:213`, "docs/h7-platform/parts.md:177", `${OI}:78`],
} as const

/** CR-PEDAL-I2C-EXPANSION: no source names an I2C expansion connector; none is drawn (open row I2C-EXPANSION-CONNECTOR). */
export const I2C_EXPANSION = {
  ruling: "CR-PEDAL-I2C-EXPANSION",
  connector: "not drawn",
  sources: ["docs/h7-platform/architecture.md:342", "docs/h7-platform/power.md:413"],
} as const

/**
 * CR-PEDAL-PCM3060-VALUES: the straps and decoupling schematic-checklist.md CODEC-02 to CODEC-09 give.
 * IFMD (pin 27) goes to the codec's VDD, which is 3V3_CODEC; decoupling pairs are 100 nF + 10 uF.
 */
export const PCM3060_VALUES = {
  ruling: "CR-PEDAL-PCM3060-VALUES",
  modeToGndOhm: 220e3,
  ifmd: "3V3_CODEC",
  fmtToVddOhm: 4.7e3,
  dempToGndOhm: 4.7e3,
  decoupling: { vcc: [100e-9, 10e-6], vdd: [100e-9, 10e-6], vcom: [100e-9, 10e-6] },
  sources: [`${CHK}:88`, `${CHK}:92`, `${CHK}:93`, `${CHK}:98`, `${CHK}:99`, `${CHK}:103`, `${CHK}:104`, `${CHK}:105`],
} as const
