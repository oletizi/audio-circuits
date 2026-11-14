/**
 * Part specs for the audio pedal board, h7-pedal (h7 pedal pages plan, Task 2): one `PartSpec` per
 * part type, named for the part, with its KiCad symbol under spec C4 and the source each comes from.
 * No board model is built here; the block tasks import these.
 *
 * Symbols (spec C4, `docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md`):
 * the part's own stock symbol where one exists and matches; otherwise a stock symbol that matches the
 * data sheet pin for pin; otherwise a project symbol in `h7-platform.kicad_sym`, drawn by copperhead
 * first (`tests/circuits/h7-pedal-project-symbol-draw.test.ts`). "Matches" is by pin name, number AND
 * electrical type, as CR-PEDAL-PIN-MATCH states it; the data sheet tables are `pedal-pin-tables.ts`,
 * and `tests/circuits/h7-pedal-parts.test.ts` checks every `ic`, `diode` and `opamp` part against them.
 *
 * Kinds follow CR-PEDAL-KINDS: no new kind. MOSFETs, the relay, regulators, supervisors, logic, the
 * USB switch, ESD parts, the bidirectional TVS, the oscillator, the ideal diode and the codec are
 * `ic`; diodes, Schottkys, Zeners and LEDs are `diode`; switching jacks are `switch`; pots are
 * `potentiometer`.
 *
 * Rulings (docs/h7-platform/decisions.md, each "Controller ruling (the owner may override)"):
 * CR-PEDAL-KINDS, CR-PEDAL-PIN-MATCH and CR-PEDAL-SYMBOL-<part>.
 *
 * Footprints are not set: no document names the pedal's footprints, and a schematic needs none. MPNs
 * are docs/h7-platform/parts.md's. Parts the documents leave unruled (the DC jack, the LED switch
 * MOSFETs, the MIDI IN receiver and connectors) have no spec here: their blocks are left undrawn.
 */
import type { ComponentKind, PartSpec } from "../../lib/model/index.ts"
import { BUCK, BUCK_INDUCTOR } from "./module-parts.ts"
import { CAPACITOR, MODULE_SOCKET, RESISTOR, USB_C_RECEPTACLE, USB_ESD, USB_SWITCH } from "./parts.ts"
import { PEDAL_PIN_TABLES } from "./pedal-pin-tables.ts"

/** One pedal part: its spec, the model kind it is built as, its data sheet table, and where it comes from. */
export interface PedalPart {
  readonly part: PartSpec
  readonly kind: ComponentKind
  /** Key into `PEDAL_PIN_TABLES`, for the parts whose symbol is checked against a data sheet. */
  readonly table?: string
  readonly provenance: string
}

// ---- codec, op-amps, logic -------------------------------------------------------------------

/** U_CODEC. Project symbol (CR-PEDAL-SYMBOL-PCM3060): the stock Audio:PCM3060 names pin 27 "AD" for the data sheet's "ADR" and types VCOM an output. */
export const PCM3060: PartSpec = { mpn: "PCM3060PWR", symbol: "h7-platform:PCM3060PW" }

/**
 * U_VMID, U_IN, U_OUT, U_ADC: four duals, channel A = L, B = R. Project symbol, 3 units
 * (CR-PEDAL-SYMBOL-OPA1688): no stock OPA1688, and the SOIC-8 dual stand-ins name the pins "+", "-"
 * and nothing where SBOS724A names them +IN A, -IN A, OUT A.
 */
export const OPA1688: PartSpec = {
  mpn: "OPA1688IDR",
  symbol: "h7-platform:OPA1688xD",
  symbolPins: {
    A: { out: "1", "in-": "2", "in+": "3" },
    B: { "in+": "5", "in-": "6", out: "7" },
    package: { "v-": "4", "v+": "8" },
  },
}

/**
 * U_ISO_M, triple buffer on 3V3_D. Project symbol, 4 units (CR-PEDAL-SYMBOL-SN74LVC3G34): the stock gate pins are unnamed.
 * Units are the gates, and `power` the supply unit: an `ic` declares no package pins (lib/model/kinds.ts), so the supply
 * is a model unit of its own (CR-PEDAL-DIGITAL-READINGS).
 */
export const SN74LVC3G34: PartSpec = {
  mpn: "SN74LVC3G34DCTR",
  symbol: "h7-platform:SN74LVC3G34DCT",
  symbolPins: {
    "1": { A: "1", Y: "7" },
    "2": { A: "3", Y: "5" },
    "3": { A: "6", Y: "2" },
    power: { GND: "4", VCC: "8" },
  },
}

/** U_ISO_C, single buffer on 3V3_CODEC. Project symbol (CR-PEDAL-SYMBOL-SN74LVC1G34): stock A and Y unnamed. */
export const SN74LVC1G34: PartSpec = { mpn: "SN74LVC1G34DBVR", symbol: "h7-platform:SN74LVC1G34DBV" }
/** U_MIDIDRV, open-drain buffer. Project symbol (CR-PEDAL-SYMBOL-SN74LVC1G07): stock A and Y unnamed. */
export const SN74LVC1G07: PartSpec = { mpn: "SN74LVC1G07DBVR", symbol: "h7-platform:SN74LVC1G07DBV" }
/** U_PFINV, dual Schmitt inverter. Its own stock symbol, single unit. */
export const SN74LVC2G14: PartSpec = { mpn: "SN74LVC2G14DBVR", symbol: "74xGxx:SN74LVC2G14DBV" }

/** U_EXP. Project symbol (CR-PEDAL-SYMBOL-MCP6001): the stock MCP6001-OT names its pins +, -, V+, V- and nothing. */
export const MCP6001: PartSpec = { mpn: "MCP6001T-I/OT", symbol: "h7-platform:MCP6001T-OT" }

// ---- supervisors, regulators, oscillator ---------------------------------------------------------

/** U_PF. Project symbol (CR-PEDAL-SYMBOL-TPS3808G01): the stock TPS3808DBV types the open-drain RESET `output`. */
export const TPS3808G01: PartSpec = { mpn: "TPS3808G01DBVR", symbol: "h7-platform:TPS3808G01DBV" }

/**
 * U_CRST, TLV803EA29DBZR (parts.md "Codec local reset supervisor, U_CRST"). The module's project
 * symbol `h7-platform:TLV803EA30DBZR` stands in (CR-PEDAL-SYMBOL-TLV803EA29): SLVSES2J gives both
 * thresholds the same DBZ pins and the same open-drain RESET, and the symbol matches by name, number
 * and type. TPS3839DBZ, the module's first stand-in, is rejected on pin 2's type.
 */
export const TLV803EA29: PartSpec = { mpn: "TLV803EA29DBZR", symbol: "h7-platform:TLV803EA30DBZR" }

/** U_LDO. Project symbol (CR-PEDAL-SYMBOL-TPS7A4901): TPS7A4101DGN, the nearest stock symbol, marks pin 6 (NR/SS) and pin 7 (DNC) NC. */
export const TPS7A4901: PartSpec = { mpn: "TPS7A4901DGNR", symbol: "h7-platform:TPS7A4901DGN" }
/** U_CVDD. Project symbol (CR-PEDAL-SYMBOL-TPS7A2433): no stock TPS7A24; pin 4 is "no internal connection" (`free`). */
export const TPS7A2433: PartSpec = { mpn: "TPS7A2433DBVR", symbol: "h7-platform:TPS7A2433DBV" }
/** U_PRAIL, the module buck's part (power.md "copied"). Its own stock symbol, checked here by type too. */
export const TPS62933F: PartSpec = BUCK
/** U_REFBLK ideal diode. Project symbol (CR-PEDAL-SYMBOL-LM66100): the stock symbol names pin 4 "NC" and types it no_connect. */
export const LM66100: PartSpec = { mpn: "LM66100DCKR", symbol: "h7-platform:LM66100DCK" }

/**
 * U_XO, Epson X1G0041710019 (SG-210STF 12.288000 MHz L). Stand-in `Oscillator:SG-5032CAN`
 * (CR-PEDAL-SYMBOL-SG-210STF): the SG-210STF's own stock symbol spells pin 4 "Vcc" where Epson's pin
 * map says VCC; SG-5032CAN, Epson's same-pinout part, matches by name, number and type.
 */
export const SG_210STF: PartSpec = { mpn: "X1G0041710019", symbol: "Oscillator:SG-5032CAN" }

// ---- USB ------------------------------------------------------------------------------------------

/** U_USBSW. The carrier's project symbol (CR-CARRIER-USBSW-SYMBOL), checked here by type too. */
export const TS3USB221: PartSpec = USB_SWITCH
/** U_ESD. Its own stock symbol (the carrier's part). */
export const USBLC6_2SC6: PartSpec = USB_ESD

// ---- MOSFETs and relay ------------------------------------------------------------------------------

/** Q_PFG, Q_PFR, Q_VDIS, Q_MSWD, Q_BYP. Own stock symbol (CR-PEDAL-SYMBOL-AO3400A for the pin numbers). */
export const AO3400A: PartSpec = { mpn: "AO3400A", symbol: "Transistor_FET:AO3400A" }
/** Q_MIDI. Own stock symbol (CR-PEDAL-SYMBOL-AO3400A). */
export const AO3401A: PartSpec = { mpn: "AO3401A", symbol: "Transistor_FET:AO3401A" }
/** Q_PEN, Q_REFEN. Own stock symbol. */
export const FET_2N7002: PartSpec = { mpn: "2N7002,215", symbol: "Transistor_FET:2N7002" }
/** Q_MSW, TO-252. No stock AOD4185; the generic `Q_PMOS_GDS` stands in (CR-PEDAL-SYMBOL-AOD4185). */
export const AOD4185: PartSpec = { mpn: "AOD4185", symbol: "Transistor_FET:Q_PMOS_GDS" }
/** K_BYP_IN, K_BYP_OUT. Own stock symbol; Omron numbers the terminals and names none. */
export const G6K_2F_Y: PartSpec = { mpn: "G6K-2F-Y DC3", symbol: "Relay:G6K-2" }

// ---- diodes ---------------------------------------------------------------------------------------

/** D_AIN, D_MIN. Own stock symbol. */
export const PMEG4030ER: PartSpec = { mpn: "PMEG4030ER,115", symbol: "Diode:PMEG4030ER" }
/** D_CVCL, D_RCLAMP. No stock PMEG4005AEA; `Device:D_Schottky` stands in (CR-PEDAL-SYMBOL-DIODES). */
export const PMEG4005AEA: PartSpec = { mpn: "PMEG4005AEA,115", symbol: "Device:D_Schottky" }
/** D_PFCL, D_SS, D_GS. No stock BAS116H; `Device:D` stands in (CR-PEDAL-SYMBOL-DIODES). */
export const BAS116H: PartSpec = { mpn: "BAS116H,115", symbol: "Device:D" }
/** D_BF_IN, D_BF_OUT. Own stock symbol. */
export const DIODE_1N4148W: PartSpec = { mpn: "1N4148W-7-F", symbol: "Diode:1N4148W" }
/** D_BZ_IN, D_BZ_OUT. No exact stock BZT52C12; `Device:D_Zener` stands in (CR-PEDAL-SYMBOL-DIODES). */
export const BZT52C12: PartSpec = { mpn: "BZT52C12-7-F", symbol: "Device:D_Zener" }
/** LED1, LED2. `Device:LED` (CR-PEDAL-SYMBOL-DIODES). */
export const WP7113ID: PartSpec = { mpn: "WP7113ID", symbol: "Device:LED" }
/** Jack ESD, bidirectional: an `ic`. Project symbol (CR-PEDAL-SYMBOL-PESD12VL1BA): Device:D_TVS names its pins A1, A2 where Nexperia's are cathodes. */
export const PESD12VL1BA: PartSpec = { mpn: "PESD12VL1BA,115", symbol: "h7-platform:PESD12VL1BA" }

// ---- passives, panel parts, connectors ---------------------------------------------------------------

/**
 * FB_IN. Rated 600 ohm +/- 25 % at 100 MHz: Murata JENF243A_0091C-01 p. 1 section 3 rating table (LCSC
 * copy, https://datasheet.lcsc.com/datasheet/pdf/eeeb44ff5b107da93d5353e93d987fab.pdf). Its position on
 * the split pedal is an S2 choice (power.md); this is the part, not its place.
 */
export const FERRITE_IN: PartSpec = {
  mpn: "BLM31KN601SN1L", symbol: "Device:FerriteBead", beadImpedance: { ohms: 600, hertz: 100e6 },
}
/** C_BULK, C_BULK2-4: 100 uF 35 V aluminium. */
export const BULK_CAPACITOR: PartSpec = { mpn: "EEE-FK1V101P", symbol: "Device:C_Polarized" }
/** The op-amp decoupling and VIN_A ceramics: 10 uF 50 V X7R 1206 (parts.md:57). */
export const C10U_50V: PartSpec = { ...CAPACITOR, mpn: "CL31B106KBHNNNE" }
/** C_AC and C_DC: 22 uF 25 V aluminium. */
export const COUPLING_CAPACITOR: PartSpec = { mpn: "EEE-FT1E220AR", symbol: "Device:C_Polarized" }
/** U_PRAIL's inductor, the module buck's. */
export const PRAIL_INDUCTOR: PartSpec = BUCK_INDUCTOR

/** RV_POSn, 10 kohm linear. `potentiometer`, pins by POTENTIOMETER_PIN_NUMBERS. */
export const RV16AF_41: PartSpec = { mpn: "RV16AF-41 B10K", symbol: "Device:R_Potentiometer" }
/**
 * CR-PEDAL-KINDS: which pin of `Device:R_Potentiometer` is which end. The symbol's graphics carry no
 * rotation sense (a plain body, pin 1 at its top end, pin 3 at its bottom end, the wiper arrow on pin 2
 * at the side), so this is a ruling, not a reading: ccw is pin 1. Cost if wrong: every control reverses.
 */
export const POTENTIOMETER_PIN_NUMBERS: Readonly<Record<string, string>> = { ccw: "1", wiper: "2", cw: "3" }
/** Control-position button fit. */
export const TC_6610: PartSpec = { mpn: "TC-6610-17-100G", symbol: "Switch:SW_Push" }
/** The four audio jacks and the expression jack. A switching jack: `switch` (lib/model/types.ts, `electricallyInert`). */
export const NMJ6HCD2: PartSpec = { mpn: "NMJ6HCD2", symbol: "Connector_Audio:NMJ6HCD2" }
/** The MIDI UART header, not fitted, 1 x 4 2.54 mm. */
export const MIDI_HEADER: PartSpec = { symbol: "Connector_Generic:Conn_01x04", electricallyInert: true }

/** Every pedal part, by part name, with its kind, data sheet table and source. */
export const PEDAL_PARTS: Readonly<Record<string, PedalPart>> = {
  PCM3060: { part: PCM3060, kind: "ic", table: "PCM3060", provenance: "docs/h7-platform/parts.md:96; data sheet: PEDAL_PIN_TABLES.PCM3060" },
  OPA1688: { part: OPA1688, kind: "opamp", table: "OPA1688", provenance: "docs/h7-platform/parts.md:105" },
  SN74LVC3G34: { part: SN74LVC3G34, kind: "ic", table: "SN74LVC3G34", provenance: "docs/h7-platform/parts.md:115" },
  SN74LVC1G34: { part: SN74LVC1G34, kind: "ic", table: "SN74LVC1G34", provenance: "docs/h7-platform/parts.md:116" },
  SN74LVC1G07: { part: SN74LVC1G07, kind: "ic", table: "SN74LVC1G07", provenance: "docs/h7-platform/parts.md:139" },
  SN74LVC2G14: { part: SN74LVC2G14, kind: "ic", table: "SN74LVC2G14", provenance: "docs/h7-platform/parts.md:60" },
  MCP6001: { part: MCP6001, kind: "opamp", table: "MCP6001", provenance: "docs/h7-platform/parts.md:106" },
  TPS3808G01: { part: TPS3808G01, kind: "ic", table: "TPS3808G01", provenance: "docs/h7-platform/parts.md:59" },
  TLV803EA29: { part: TLV803EA29, kind: "ic", table: "TLV803EA29", provenance: "docs/h7-platform/parts.md:102" },
  TPS7A4901: { part: TPS7A4901, kind: "ic", table: "TPS7A4901", provenance: "docs/h7-platform/parts.md:86; docs/h7-platform/schematic-checklist.md:129" },
  TPS7A2433: { part: TPS7A2433, kind: "ic", table: "TPS7A2433", provenance: "docs/h7-platform/parts.md:98" },
  TPS62933F: { part: TPS62933F, kind: "ic", table: "TPS62933F", provenance: "docs/h7-platform/parts.md:87" },
  LM66100: { part: LM66100, kind: "ic", table: "LM66100", provenance: "docs/h7-platform/parts.md:109" },
  SG_210STF: { part: SG_210STF, kind: "ic", table: "SG_210STF", provenance: "docs/h7-platform/parts.md:97" },
  TS3USB221: { part: TS3USB221, kind: "ic", table: "TS3USB221", provenance: "docs/h7-platform/parts.md:145" },
  USBLC6_2SC6: { part: USBLC6_2SC6, kind: "ic", table: "USBLC6_2SC6", provenance: "docs/h7-platform/parts.md:146" },
  AO3400A: { part: AO3400A, kind: "ic", table: "AO3400A", provenance: "docs/h7-platform/parts.md:61; docs/h7-platform/parts.md:123" },
  AO3401A: { part: AO3401A, kind: "ic", table: "AO3401A", provenance: "docs/h7-platform/parts.md:141" },
  FET_2N7002: { part: FET_2N7002, kind: "ic", table: "FET_2N7002", provenance: "docs/h7-platform/parts.md:85; docs/h7-platform/parts.md:110" },
  AOD4185: { part: AOD4185, kind: "ic", table: "AOD4185", provenance: "docs/h7-platform/parts.md:62" },
  G6K_2F_Y: { part: G6K_2F_Y, kind: "ic", table: "G6K_2F_Y", provenance: "docs/h7-platform/parts.md:122; docs/h7-platform/bypass-relay.md:97" },
  PMEG4030ER: { part: PMEG4030ER, kind: "diode", table: "PMEG4030ER", provenance: "docs/h7-platform/parts.md:55" },
  PMEG4005AEA: { part: PMEG4005AEA, kind: "diode", table: "PMEG4005AEA", provenance: "docs/h7-platform/parts.md:100; docs/h7-platform/parts.md:113" },
  BAS116H: { part: BAS116H, kind: "diode", table: "BAS116H", provenance: "docs/h7-platform/parts.md:64" },
  DIODE_1N4148W: { part: DIODE_1N4148W, kind: "diode", table: "DIODE_1N4148W", provenance: "docs/h7-platform/parts.md:124" },
  BZT52C12: { part: BZT52C12, kind: "diode", table: "BZT52C12", provenance: "docs/h7-platform/parts.md:125" },
  WP7113ID: { part: WP7113ID, kind: "diode", table: "WP7113ID", provenance: "docs/h7-platform/parts.md:135" },
  PESD12VL1BA: { part: PESD12VL1BA, kind: "ic", table: "PESD12VL1BA", provenance: "docs/h7-platform/parts.md:107" },
  FERRITE_IN: { part: FERRITE_IN, kind: "inductor", provenance: "docs/h7-platform/parts.md:58; Murata JENF243A_0091C-01 p. 1 (Ver JENF243A_0091C-01)" },
  BULK_CAPACITOR: { part: BULK_CAPACITOR, kind: "capacitor", provenance: "docs/h7-platform/parts.md:56" },
  C10U_50V: { part: C10U_50V, kind: "capacitor", provenance: "docs/h7-platform/parts.md:57" },
  COUPLING_CAPACITOR: { part: COUPLING_CAPACITOR, kind: "capacitor", provenance: "docs/h7-platform/parts.md:108" },
  PRAIL_INDUCTOR: { part: PRAIL_INDUCTOR, kind: "inductor", provenance: "docs/h7-platform/parts.md:88" },
  RV16AF_41: { part: RV16AF_41, kind: "potentiometer", provenance: "docs/h7-platform/parts.md:131; docs/h7-platform/analog.md:364" },
  TC_6610: { part: TC_6610, kind: "switch", provenance: "docs/h7-platform/parts.md:132" },
  NMJ6HCD2: { part: NMJ6HCD2, kind: "switch", provenance: "docs/h7-platform/parts.md:133" },
  MIDI_HEADER: { part: MIDI_HEADER, kind: "connector", provenance: "docs/h7-platform/schematic-checklist.md:217" },
  MODULE_SOCKET: { part: MODULE_SOCKET, kind: "connector", provenance: "docs/h7-platform/parts.md:158" },
  USB_C_RECEPTACLE: { part: USB_C_RECEPTACLE, kind: "connector", provenance: "docs/h7-platform/schematic-checklist.md:207" },
  RESISTOR: { part: RESISTOR, kind: "resistor", provenance: "docs/h7-platform/parts.md:67" },
  CAPACITOR: { part: CAPACITOR, kind: "capacitor", provenance: "docs/h7-platform/parts.md:70" },
}

function perSymbol(field: "name" | "type"): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const out: Record<string, Record<string, string>> = {}
  for (const [key, entry] of Object.entries(PEDAL_PARTS)) {
    if (entry.table === undefined) continue
    const symbol = entry.part.symbol
    const table = PEDAL_PIN_TABLES[entry.table]
    if (symbol === undefined || table === undefined) {
      throw new Error(
        `pedal part ${key} names table "${entry.table}" but ${symbol === undefined ? "no symbol" : "PEDAL_PIN_TABLES has no such table"}. ` +
          "Add it in circuits/h7-platform/pedal-pin-tables.ts, read from the part's data sheet; it is not defaulted " +
          "because the symbol check compares the symbol against exactly this table.",
      )
    }
    const values = Object.fromEntries(Object.entries(table.pins).map(([n, pin]) => [n, pin[field]]))
    const prior = out[symbol]
    if (prior !== undefined && JSON.stringify(prior) !== JSON.stringify(values)) {
      throw new Error(`two pedal parts use ${symbol} with different data sheet ${field}s; a symbol carries one table`)
    }
    out[symbol] = values
  }
  return out
}

/** Data sheet pin names of every checked pedal part, by symbol: pin number -> name (the module's shape). */
export const DATASHEET_PIN_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = perSymbol("name")
/** The same pins' KiCad electrical types, by symbol: pin number -> type. */
export const DATASHEET_PIN_TYPES: Readonly<Record<string, Readonly<Record<string, string>>>> = perSymbol("type")
