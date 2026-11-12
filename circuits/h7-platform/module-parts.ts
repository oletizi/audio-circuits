/**
 * Part specs for the processor module, with the KiCad symbol each uses under spec C4 and the
 * controller rulings that fix the values no document states (H7 module plan, Task 4). The
 * carrier's are in `parts.ts`; this file follows its pattern.
 *
 * Symbol rule (C4, `docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md`):
 * the part's own stock symbol where one exists, else a stock symbol that matches the datasheet pin
 * for pin by name and number, else a project symbol in `h7-platform.kicad_sym`, used only because
 * `tests/circuits/h7-project-symbol.test.ts` shows copperhead drawing it. Every name is checked
 * against the installed libraries by `tests/circuits/h7-module-parts.test.ts`, which also holds an
 * independent transcription of the two datasheet tables the C4 decisions rest on.
 *
 * Rulings (docs/h7-platform/decisions.md, each "Controller ruling (the owner may override)"):
 * CR-MODULE-USB-ESD, CR-MODULE-SDRAM-SYMBOL, CR-MODULE-SUPERVISOR-SYMBOL,
 * CR-MODULE-ID-STRAP-VALUES, CR-MODULE-BLEEDER, CR-MODULE-VIN-PROTECTION, CR-MODULE-HSE-LOAD,
 * CR-MODULE-SWD-HEADER.
 *
 * Footprints are not set: no document names them for the module and a schematic needs none. MPNs
 * are those of `docs/h7-platform/parts.md`.
 */
import type { Connection, PartSpec } from "../../lib/model/index.ts"
import { NC, net } from "../../lib/model/index.ts"
import { CAPACITOR, DATASHEET_PIN_NAMES as CARRIER_PIN_NAMES, RESISTOR, TEST_POINT, USB_ESD } from "./parts.ts"
import { MODULE_3V3_NET } from "./module-3v3-budget.ts"

/** STM32H743IIT6, LQFP-176 (parts.md, owner decision O-3). Pin names are ST's, checked by the test against ST's pin data. */
export const MCU: PartSpec = { mpn: "STM32H743IIT6", symbol: "MCU_ST_STM32H7:STM32H743IITx" }

/**
 * CR-MODULE-SDRAM-SYMBOL. W9825G6KH-6I has no stock symbol. The stock `Memory_RAM:MT48LC16M16A2TG`
 * has the right 54 pin numbers but names five of them differently from Winbond's datasheet
 * (W9825G6KH Rev. A04 p. 4 section 4 and p. 5 section 5): pin 15 DQML for LDQM, 20 and 21 BA0 and BA1
 * for BS0 and BS1, 22 A10 for A10/AP, 39 DQMH for UDQM. C4 allows the stock symbol only on a pin-for-pin
 * match by name and number, so the part uses the project symbol, drafted by copperhead in
 * `tests/circuits/h7-project-symbol.test.ts`. `mpn` stays W9825G6KH-6I.
 */
export const SDRAM: PartSpec = { mpn: "W9825G6KH-6I", symbol: "h7-platform:W9825G6KH" }

/** QSPI NOR flash, 8-pin SOIC 208 mil (the "SI" of W25Q128JVSIQ). Stock symbol. */
export const FLASH: PartSpec = { mpn: "W25Q128JVSIQ", symbol: "Memory_Flash:W25Q128JVS" }

/**
 * CR-MODULE-SUPERVISOR-SYMBOL. TLV803EA30DBZR (SOT-23-3, pin 1 GND, pin 2 RESET, pin 3 VDD: TI
 * SLVSES2J p. 5 Table 6-1, "DCK, DBZ" column, a part number carrying no R or V pinout letter).
 * No installed symbol is named for it. The first `Power_Supervisor` symbol, in library order,
 * whose pins match that table by name and number is TPS3839DBZ; the supervisors before it differ
 * (LM809 pin 3 VCC, TCM809 pin 3 V_{DD}, TLV810EA29DBZ pin 2 RESET without the overbar). The
 * symbol is a stand-in for the pins only: `mpn` names the part fitted.
 */
export const SUPERVISOR: PartSpec = { mpn: "TLV803EA30DBZR", symbol: "Power_Supervisor:TPS3839DBZ" }

/** 3.3 V buck, TPS62933F, SOT-583 (DRL). Stock symbol. */
export const BUCK: PartSpec = { mpn: "TPS62933FDRLR", symbol: "Regulator_Switching:TPS62933F" }

/**
 * VDDA ferrite bead FB_VDDA (parts.md:35). Stock symbol. Rated 220 ohm at 100 MHz (analog.md:242,
 * "|Z| 220 ohm +/- 25 % at 100 MHz"; the "221" of the MPN), which is its drawn value
 * (`valueFor`, lib/kicad/value-notation.ts).
 */
export const FERRITE_VDDA: PartSpec = {
  mpn: "BLM21PG221SN1D", symbol: "Device:FerriteBead", beadImpedance: { ohms: 220, hertz: 100e6 },
}

/**
 * HSE crystal Y_HSE, NDK NX3225GA 25 MHz, CL 8 pF. `Crystal_GND24` because NDK 2008E_NX3225GA_e
 * says pads 2 and 4 are unconnected inside and "better to connect with a GND"
 * (processor-and-memory.md section 3).
 */
export const CRYSTAL: PartSpec = { mpn: "NX3225GA-25.000M-STD-CRG-2", symbol: "Device:Crystal_GND24" }

/** Buck inductor L_BUCK, Wurth WE-XHMI 4.7 uH (parts.md). */
export const BUCK_INDUCTOR: PartSpec = { mpn: "74439346047", symbol: "Device:L" }
/** Buck input filter inductor L_FILT, Wurth WE-LQS 4.7 uH (parts.md, ruling R-48). */
export const INPUT_FILTER_INDUCTOR: PartSpec = { mpn: "74404054047", symbol: "Device:L" }
/** Input damping capacitor C_DAMP, 47 uF 35 V aluminium (parts.md, ruling R-48). */
export const DAMPING_CAPACITOR: PartSpec = { mpn: "EEE-FK1V470P", symbol: "Device:C_Polarized" }

/** ROM-DFU socket J_USB_MOD, HRO TYPE-C-31-E-17, vertical (parts.md, ruling R-60). Footprint stays open (USB-DFU-VERTICAL). */
export const DFU_SOCKET: PartSpec = {
  mpn: "TYPE-C-31-E-17",
  symbol: "Connector:USB_C_Receptacle_USB2.0_16P",
  electricallyInert: true,
}

/** The DFU socket's ESD part: the pedal's USBLC6-2SC6 (CR-MODULE-USB-ESD). */
export const DFU_ESD: PartSpec = USB_ESD

/** SWD header J_SWD, Samtec FTSH-105-01-F-DV-K, 2 x 5 1.27 mm (parts.md, ruling D9). */
export const SWD_HEADER: PartSpec = {
  mpn: "FTSH-105-01-F-DV-K",
  symbol: "Connector:Conn_ARM_JTAG_SWD_10",
  electricallyInert: true,
}
export const SWD_HEADER_SYMBOL = "Connector:Conn_ARM_JTAG_SWD_10"

/** SW_BOOT and SW_RESET, C&K PTS645VL31-2 LFS (parts.md, ruling OWN-05). */
export const TACTILE_SWITCH: PartSpec = { mpn: "PTS645VL31-2 LFS", symbol: "Switch:SW_Push" }

/** J_MOD_A and J_MOD_B, Mill-Max 800-10-020-10-002000, 1 x 20 male (parts.md, ruling R-61). */
export const MODULE_HEADER: PartSpec = {
  mpn: "800-10-020-10-002000",
  symbol: "Connector_Generic:Conn_01x20",
  electricallyInert: true,
}

/** Every part spec the module model reads, by role. */
export const MODULE_PARTS: Readonly<Record<string, PartSpec>> = {
  mcu: MCU, sdram: SDRAM, flash: FLASH, supervisor: SUPERVISOR, buck: BUCK,
  ferriteVdda: FERRITE_VDDA, crystal: CRYSTAL, buckInductor: BUCK_INDUCTOR,
  inputFilterInductor: INPUT_FILTER_INDUCTOR, dampingCapacitor: DAMPING_CAPACITOR,
  dfuSocket: DFU_SOCKET, dfuEsd: DFU_ESD, swdHeader: SWD_HEADER, tactileSwitch: TACTILE_SWITCH,
  moduleHeader: MODULE_HEADER, testPoint: TEST_POINT, resistor: RESISTOR, capacitor: CAPACITOR,
}

/**
 * CR-MODULE-USB-ESD. The ESD part is the pedal's USBLC6-2SC6, wired as USB-04
 * (schematic-checklist.md) wires it: D+ and D- through I/O1 (pins 1 and 6) and I/O2 (pins 3 and 4),
 * pin 2 GND, pin 5 VBUS with 100 nF from pin 5 to GND at the part. `processor-and-memory.md` section 8
 * states no VBUS connection for the module's socket (it says only that DP and DN go to PA12 and PA11
 * "through the ESD part"), so pin 5 goes to the socket's VBUS pins (A4, B4, A9, B9, joined) and VBUS
 * is on no rail and no other pin, the module's USB-02: VDD33USB is fed from 3V3 and the ROM DFU's forced
 * device mode needs no VBUS sense (processor-and-memory.md section 3, "DFU conditions").
 * Socket side is pins 1 and 3, MCU side pins 6 and 4; D+ is on I/O1 and D- on I/O2, the order USB-04 gives.
 * Pin number to net.
 */
export const DFU_ESD_WIRING: Readonly<Record<string, string>> = {
  "1": "DFU_CONN_DP", "6": "DFU_USB_DP", "3": "DFU_CONN_DM", "4": "DFU_USB_DM", "2": "GND", "5": "DFU_VBUS",
}
export const DFU_VBUS_CAP_F = 100e-9

/**
 * CR-MODULE-ID-STRAP-VALUES. analog.md section 11's HW_REV scheme codes revision n at the ratio n / 9, for
 * n = 1 to 8; there is no code 0 (ratio 0 lies in the "below 0.0556 is a strap fault" band, which firmware
 * refuses). This module is the first build, so it takes revision 1's row: R_top 20.0 kohm, R_bot 2.49 kohm,
 * 1 %, ratio 0.1107, 12-bit code 453, with 100 nF at the pin. The divider's top is VDDA (VREF+), as the scheme's
 * "a ratio, so reference error cancels" requires; the bottom is GND.
 */
export const ID_STRAP: { readonly topOhm: number; readonly bottomOhm: number; readonly pinCapF: number } = {
  topOhm: 20_000, bottomOhm: 2_490, pinCapF: 100e-9,
}

/** CR-MODULE-HSE-LOAD: CL1 = CL2 = 8 pF C0G, no series resistor (processor-and-memory.md section 3, CORE-14). */
export const HSE_LOAD_CAP_F = 8e-12

/**
 * CR-MODULE-SWD-HEADER. schematic-checklist.md USB-06 onto `Connector:Conn_ARM_JTAG_SWD_10`: pin 1 VTref
 * is the module's 3V3, 2 SWDIO, 3 and 5 GND, 4 SWCLK, 6 SWO not connected, 7 key not connected, 8 not
 * connected, 9 GNDDetect to GND, 10 NRST. The formal check against DDI0314H stays open (SWD-PINOUT-FORMAL-SPEC).
 */
export const SWD_HEADER_CONNECTIONS: Readonly<Record<string, Connection>> = {
  "1": net(MODULE_3V3_NET), "2": net("SWDIO"), "3": net("GND"), "4": net("SWCLK"), "5": net("GND"),
  "6": NC, "7": NC, "8": NC, "9": net("GND"), "10": net("NRST"),
}

const USBLC6 = CARRIER_PIN_NAMES["Power_Protection:USBLC6-2SC6"]
if (USBLC6 === undefined) throw new Error("parts.ts records no pin names for Power_Protection:USBLC6-2SC6")

/**
 * Datasheet pin names of the module's `ic` parts, symbol pin number -> name, spelled as KiCad spells them
 * (`~{CS}` is an overbarred CS). Each source is read from the document's PDF; the test compares the symbol
 * with it pin for pin. The MCU's 176 names are ST's pin data (`st-pin-data.ts`) and are compared there.
 */
export const DATASHEET_PIN_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // Winbond W9825G6KH Rev. A04 (20 Mar 2017) p. 4 section 4 Pin Configuration, p. 5 section 5.
  "h7-platform:W9825G6KH": {
    "1": "VDD", "2": "DQ0", "3": "VDDQ", "4": "DQ1", "5": "DQ2", "6": "VSSQ", "7": "DQ3", "8": "DQ4",
    "9": "VDDQ", "10": "DQ5", "11": "DQ6", "12": "VSSQ", "13": "DQ7", "14": "VDD", "15": "LDQM",
    "16": "~{WE}", "17": "~{CAS}", "18": "~{RAS}", "19": "~{CS}", "20": "BS0", "21": "BS1",
    "22": "A10/AP", "23": "A0", "24": "A1", "25": "A2", "26": "A3", "27": "VDD", "28": "VSS",
    "29": "A4", "30": "A5", "31": "A6", "32": "A7", "33": "A8", "34": "A9", "35": "A11", "36": "A12",
    "37": "CKE", "38": "CLK", "39": "UDQM", "40": "NC", "41": "VSS", "42": "DQ8", "43": "VDDQ",
    "44": "DQ9", "45": "DQ10", "46": "VSSQ", "47": "DQ11", "48": "DQ12", "49": "VDDQ", "50": "DQ13",
    "51": "DQ14", "52": "VSSQ", "53": "DQ15", "54": "VSS",
  },
  // TI SLVSES2J (rev. May 2021) p. 5 Table 6-1, DBZ with pin 1 = GND.
  "Power_Supervisor:TPS3839DBZ": { "1": "GND", "2": "~{RESET}", "3": "VDD" },
  // Winbond W25Q128JV Rev. F (27 Mar 2018) p. 5 section 3.3, SOIC 208-mil: /CS, DO (IO1), /WP (IO2), GND,
  // DI (IO0), CLK, /HOLD or /RESET (IO3), VCC, in KiCad's spelling.
  "Memory_Flash:W25Q128JVS": {
    "1": "~{CS}", "2": "DO/IO_{1}", "3": "~{WP}/IO_{2}", "4": "GND", "5": "DI/IO_{0}", "6": "CLK",
    "7": "~{HOLD}/~{RESET}/IO_{3}", "8": "VCC",
  },
  // TI SLUSEA4D (rev. Aug 2022) pp. 3-4 Table 7-1. Pin 7 is "SS/PG": soft-start on TPS62933F, power-good on
  // the P and O variants, so the F part's pin is SS.
  "Regulator_Switching:TPS62933F": {
    "1": "RT", "2": "EN", "3": "VIN", "4": "GND", "5": "SW", "6": "BST", "7": "SS", "8": "FB",
  },
  "Power_Protection:USBLC6-2SC6": USBLC6,
}
