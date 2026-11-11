/**
 * Part specs shared by the h7-platform boards, each with the part number where a document names
 * one, the KiCad symbol, and the line it comes from.
 *
 * Symbols follow spec C4 (`docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md`):
 * the part's own stock symbol where one exists, otherwise a project symbol in
 * `h7-platform.kicad_sym` beside this file, used only because
 * `tests/circuits/h7-project-symbol.test.ts` shows copperhead drawing it. Every stock name here is
 * checked against the installed libraries by `tests/circuits/h7-carrier.test.ts`.
 *
 * Footprints are not set: no document names the carrier's footprints, and a schematic needs none.
 * MPNs are set only where a document names the part. The carrier's fuse, resistors, capacitors,
 * headers and receptacle have no MPN, which a schematic does not need (CLAUDE.md, G245).
 */
import path from "node:path"
import type { PartSpec } from "../../lib/model/index.ts"

/** The project symbol library (spec C4). Its nickname in a sym-lib-table is "h7-platform". */
export const PROJECT_SYMBOL_LIBRARY = path.join(import.meta.dir, "h7-platform.kicad_sym")

/**
 * Module socket J_MOD_A / J_MOD_B: 1 x 20 female, 2.54 mm, Mill-Max 801-43-020-10-012000.
 * Source: docs/h7-platform/parts.md:158 (controller ruling R-61); parts.md:161 puts the female
 * part on the carrier. Pads are the contract pin numbers (architecture.md section 4.2).
 */
export const MODULE_SOCKET: PartSpec = {
  mpn: "801-43-020-10-012000",
  symbol: "Connector_Generic:Conn_01x20",
  electricallyInert: true,
}

/**
 * Breakout header, 1 x 20 male 2.54 mm, pad for pad with a socket. Source: controller ruling
 * CR-CARRIER-BREAKOUT (decisions.md), meeting architecture.md:356's "every pin broken out".
 */
export const BREAKOUT_HEADER: PartSpec = {
  symbol: "Connector_Generic:Conn_01x20",
  electricallyInert: true,
}

/** Probe test point. Source: architecture.md:356 ("test points on VIN_MOD, 3V3_D, VREF_A, GND and the SAI nets"). */
export const TEST_POINT: PartSpec = { symbol: "Connector:TestPoint", electricallyInert: true }

/** A 2-pin header: the dummy-load jumpers and the VIN input (rulings CR-CARRIER-DUMMY-LOADS, CR-CARRIER-VIN). */
export const HEADER_2: PartSpec = { symbol: "Connector_Generic:Conn_01x02", electricallyInert: true }

/**
 * USB isolation switch U_USBSW, TI TS3USB221RSER. Source: parts.md:145; decisions.md R-14.
 * Symbol: project symbol (spec C4). No stock symbol matches the RSE pinout: TS3USB30ERSWR and
 * TS3USB30EDGSR differ on 9 and 8 of 10 pins (TI SCDS220M p. 3 Table 4-1 against SCDS255G p. 3
 * Table 4-1), and no installed 10-pin symbol matches it (task 5 report, section 1).
 */
export const USB_SWITCH: PartSpec = {
  mpn: "TS3USB221RSER",
  symbol: "h7-platform:TS3USB221RSER",
}

/** USB ESD protection, ST USBLC6-2SC6, the pedal's part. Source: parts.md:146 (ruling D10). Its own stock symbol.
 * TRAP: the copy copperhead embeds in a drafted page carries the parent USBLC6-2P6's Value,
 * Footprint (SOT-666) and filter, not the installed SOT-23-6 ones - see
 * drafted/h7-platform/h7-carrier/RECORD.md. Take this part's footprint from the part, not the page. */
export const USB_ESD: PartSpec = {
  mpn: "USBLC6-2SC6",
  symbol: "Power_Protection:USBLC6-2SC6",
}

/** USB-C receptacle, USB 2.0, 16 pins. Source: controller ruling CR-CARRIER-USB-C. No MPN named. */
export const USB_C_RECEPTACLE: PartSpec = {
  symbol: "Connector:USB_C_Receptacle_USB2.0_16P",
  electricallyInert: true,
}

/**
 * The fuse's hold current, 0.75 A: the next standard PTC hold current above the module's
 * largest documented VIN_MOD input current, 729 mA at the 1.5x peak down to VIN_MOD 7.32 V
 * (docs/h7-platform/power.md:246), which is above the contract's 674 mA `maxPeakCurrentMa`
 * (power.md:240). Ruling CR-CARRIER-VIN.
 */
export const FUSE_HOLD_CURRENT_A = 0.75

/**
 * The VIN fuse. No MPN is chosen (ruling CR-CARRIER-VIN). The model has no fuse kind, so it is an
 * `ic`, and its rating reaches the drawing's value field through `part.value`, which `valueFor`
 * uses for a part with no electrical quantity.
 */
export const FUSE: PartSpec = { symbol: "Device:Fuse", value: `${FUSE_HOLD_CURRENT_A}A hold` }

export const RESISTOR: PartSpec = { symbol: "Device:R" }
export const CAPACITOR: PartSpec = { symbol: "Device:C" }

/**
 * Datasheet pin names of the `ic` parts, symbol pin number -> name, recorded from the source
 * named beside each and compared against the symbol by `tests/circuits/h7-carrier.test.ts`.
 * The names are spelled as KiCad spells them (`~{OE}` is an overbarred OE).
 */
export const DATASHEET_PIN_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // TI SCDS220M (rev. November 2024) p. 3, Table 4-1, RSE package. OE is active low (Table 7-1, p. 12).
  "h7-platform:TS3USB221RSER": {
    "1": "1D+", "2": "1D-", "3": "2D+", "4": "2D-", "5": "GND",
    "6": "~{OE}", "7": "D-", "8": "D+", "9": "S", "10": "VCC",
  },
  // docs/h7-platform/schematic-checklist.md:213, USB-04 (the pedal's USBLC6-2SC6): I/O1 on pins 1
  // and 6, I/O2 on pins 3 and 4, pin 2 GND, pin 5 VBUS. h7-carrier.test.ts reads that line.
  "Power_Protection:USBLC6-2SC6": {
    "1": "I/O1", "2": "GND", "3": "I/O2", "4": "I/O2", "5": "VBUS", "6": "I/O1",
  },
  // A two-terminal fuse: KiCad's Device:Fuse leaves both pin names empty.
  "Device:Fuse": { "1": "", "2": "" },
}
