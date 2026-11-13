/**
 * The pedal parts' pins as their data sheets give them (h7 pedal pages plan, Task 2): for each part,
 * symbol pin number -> data sheet name and KiCad electrical type, with the document, revision, page
 * and table read. Every document was fetched and read as a PDF on 2026-11-12; the fetch log (URL,
 * document, revision, result) is in the Task 2 report and in `docs/h7-platform/decisions.md`
 * CR-PEDAL-PIN-MATCH.
 *
 * SPELLING. Names are written as KiCad writes them: an overbar as `~{...}`, and only where the data
 * sheet's own pin figure or table draws one; a minus or en dash as ASCII "-". Subscripts are written
 * plain ("VDD"): CR-PEDAL-PIN-MATCH compares names with KiCad's `_{...}` subscript markup rendered.
 *
 * TYPES (CR-PEDAL-PIN-MATCH). In order: a supply or ground pin is `power_in`; a regulator's or
 * ideal diode's regulated output is `power_out`; otherwise the data sheet's own I/O column decides
 * (I `input`, O `output`, I/O `bidirectional`, an open-drain output `open_collector`); a pin the data
 * sheet says has no internal connection is `free` (KiCad's "not internally connected"); a pin it
 * says must not be connected is `no_connect`; a pin whose column gives no direction and that only
 * takes an external part (a soft-start, bootstrap, timing or bias capacitor or resistor) is
 * `passive`. A discrete part's terminals (diode, relay, ESD array) are `passive`, except a MOSFET's
 * gate, which is `input`: an insulated gate that draws only its leakage, I_GSS.
 *
 * NUMBERS. Where the manufacturer numbers the pins, the number is theirs. Where it labels the leads
 * but numbers none (Alpha & Omega's MOSFETs, Diodes Inc.'s and Kingbright's diodes), the row says so
 * and names where the number comes from; those parts' rulings carry the cost if it is wrong.
 */

/** One pin: its data sheet name, in KiCad spelling, and its KiCad electrical type. */
export interface DatasheetPin {
  readonly name: string
  readonly type: string
}

/** A part's data sheet pin table and the document it was read from. */
export interface DatasheetTable {
  /** Document number, revision, page and table, with the URL it was fetched from. */
  readonly source: string
  readonly pins: Readonly<Record<string, DatasheetPin>>
}

const p = (name: string, type: string): DatasheetPin => ({ name, type })
const IN = "input"
const OUT = "output"
const BIDI = "bidirectional"
const PWR = "power_in"
const PWR_OUT = "power_out"
const OD = "open_collector"
const PAS = "passive"
const FREE = "free"
const NO_CONNECT = "no_connect"

/** A two-terminal diode or LED: pin 1 cathode, pin 2 anode (PIN_NUMBERS.diode, CR-PEDAL-KINDS). */
const DIODE_PINS: Readonly<Record<string, DatasheetPin>> = { "1": p("K", PAS), "2": p("A", PAS) }
/** A SOT-23 MOSFET as Nexperia numbers the 2N7002 (gate 1, source 2, drain 3). */
const SOT23_FET_PINS: Readonly<Record<string, DatasheetPin>> = { "1": p("G", IN), "2": p("S", PAS), "3": p("D", PAS) }

/** Each pedal part's data sheet table, keyed by the part constant's name in `pedal-parts.ts`. */
export const PEDAL_PIN_TABLES: Readonly<Record<string, DatasheetTable>> = {
  PCM3060: {
    source: "TI SLAS533B (rev. March 2008) p. 7 Pin Assignments (names, overbars) and p. 8 Table 1 " +
      "Terminal Functions (I/O column); https://www.ti.com/lit/ds/symlink/pcm3060.pdf",
    pins: {
      "1": p("MC/SCL/FMT", IN), "2": p("MD/SDA/DEMP", BIDI), "3": p("DOUT", OUT), "4": p("LRCK1", BIDI),
      "5": p("BCK1", BIDI), "6": p("SCKI1", IN), "7": p("VDD", PWR), "8": p("DGND", PWR), "9": p("SCKI2", IN),
      "10": p("BCK2", BIDI), "11": p("LRCK2", BIDI), "12": p("DIN", IN), "13": p("ZEROR", OUT),
      "14": p("ZEROL", OUT), "15": p("~{RST}", IN), "16": p("SGND", PWR), "17": p("VOUTR-", OUT),
      "18": p("VOUTR+", OUT), "19": p("VOUTL-", OUT), "20": p("VOUTL+", OUT), "21": p("VCOM", PAS),
      "22": p("AGND2", PWR), "23": p("AGND1", PWR), "24": p("VCC", PWR), "25": p("VINL", IN),
      "26": p("VINR", IN), "27": p("~{MS}/ADR/IFMD", IN), "28": p("MODE", IN),
    },
  },
  OPA1688: {
    source: "TI SBOS724A (rev. June 2022) p. 3 Table 6-1 Pin Functions, D (SOIC) column; " +
      "https://www.ti.com/lit/ds/symlink/opa1688.pdf",
    pins: {
      "1": p("OUT A", OUT), "2": p("-IN A", IN), "3": p("+IN A", IN), "4": p("V-", PWR),
      "5": p("+IN B", IN), "6": p("-IN B", IN), "7": p("OUT B", OUT), "8": p("V+", PWR),
    },
  },
  SN74LVC3G34: {
    source: "TI SCES366L (rev. October 2015) p. 3 Pin Functions, DCT package; https://www.ti.com/lit/ds/symlink/sn74lvc3g34.pdf",
    pins: {
      "1": p("1A", IN), "2": p("3Y", OUT), "3": p("2A", IN), "4": p("GND", PWR),
      "5": p("2Y", OUT), "6": p("3A", IN), "7": p("1Y", OUT), "8": p("VCC", PWR),
    },
  },
  SN74LVC1G34: {
    source: "TI SCES519O (rev. October 2025) p. 3 Table 4-1 Pin Functions, DBV column (NC: \"Not connected\", " +
      "p. 3 note \"N.C. - No internal connection\"); https://www.ti.com/lit/ds/symlink/sn74lvc1g34.pdf",
    pins: { "1": p("NC", FREE), "2": p("A", IN), "3": p("GND", PWR), "4": p("Y", OUT), "5": p("VCC", PWR) },
  },
  SN74LVC1G07: {
    source: "TI SCES296AG (rev. October 2025) p. 3 Pin Functions, DBV column; the output is open drain " +
      "(title, p. 1, \"Single Buffer/Driver With Open-Drain Output\"); https://www.ti.com/lit/ds/symlink/sn74lvc1g07.pdf",
    pins: { "1": p("NC", FREE), "2": p("A", IN), "3": p("GND", PWR), "4": p("Y", OD), "5": p("VCC", PWR) },
  },
  SN74LVC2G14: {
    source: "TI SCES200O (rev. August 2015) p. 3 Pin Functions, DBV package; https://www.ti.com/lit/ds/symlink/sn74lvc2g14.pdf",
    pins: { "1": p("1A", IN), "2": p("GND", PWR), "3": p("2A", IN), "4": p("2Y", OUT), "5": p("VCC", PWR), "6": p("1Y", OUT) },
  },
  TPS3808G01: {
    source: "TI SBVS050N (rev. August 2026) p. 4 Figure 5-1 (DBV) and Table 5-1 Pin Functions; RESET " +
      "\"is an open-drain output\" (Table 5-1); https://www.ti.com/lit/ds/symlink/tps3808.pdf",
    pins: {
      "1": p("~{RESET}", OD), "2": p("GND", PWR), "3": p("~{MR}", IN), "4": p("CT", IN), "5": p("SENSE", IN), "6": p("VDD", PWR),
    },
  },
  TLV803EA29: {
    source: "TI SLVSES2J (rev. May 2021) p. 5 Table 6-1, \"DCK, DBZ\" column; p. 26 section 12.1.1: " +
      "\"TLV803EA29DBZR is open-drain, active-low ... Pin 1 = GND\"; https://www.ti.com/lit/ds/symlink/tlv803e.pdf",
    pins: { "1": p("GND", PWR), "2": p("~{RESET}", OD), "3": p("VDD", PWR) },
  },
  G6K_2F_Y: {
    source: "Omron Cat. No. K106-E1-11 (rev. 11 of K106-E1, print code 0118(0207)(O)) p. 6, G6K-2F-Y \"Internal Connections\" (top view): terminals " +
      "numbered 1 to 8, no names; https://omronfs.omron.com/en_US/ecb/products/pdf/en-g6k.pdf; the pin roles " +
      "are docs/h7-platform/bypass-relay.md:97",
    pins: {
      "1": p("", PAS), "2": p("", PAS), "3": p("", PAS), "4": p("", PAS),
      "5": p("", PAS), "6": p("", PAS), "7": p("", PAS), "8": p("", PAS),
    },
  },
  AO3400A: {
    source: "Alpha & Omega AO3400A Rev 3.1 (July 2023) p. 1, SOT23 top view (leads labelled D, G, S, not " +
      "numbered); https://www.aosmd.com/res/datasheets/AO3400A.pdf. NUMBERS NOT STATED BY THE MANUFACTURER: " +
      "CR-PEDAL-SYMBOL-AO3400A",
    pins: SOT23_FET_PINS,
  },
  AO3401A: {
    source: "Alpha & Omega AO3401A Rev 3.1 (December 2023) p. 1, SOT23 top view (leads labelled, not numbered); " +
      "https://www.aosmd.com/res/datasheets/AO3401A.pdf. NUMBERS NOT STATED BY THE MANUFACTURER: CR-PEDAL-SYMBOL-AO3400A",
    pins: SOT23_FET_PINS,
  },
  FET_2N7002: {
    source: "Nexperia 2N7002 Rev. 7 (8 September 2011) p. 1 Table 2 Pinning information (1 G gate, 2 S source, " +
      "3 D drain); LCSC copy https://datasheet.lcsc.com/datasheet/pdf/5799b048ec886fff0aa915589422b872.pdf " +
      "(nexperia.com refused the fetch, HTTP 403)",
    pins: SOT23_FET_PINS,
  },
  AOD4185: {
    source: "Alpha & Omega AOD4185/AOI4185 Rev.4.2 (June 2024) p. 1, TO252 top view (leads G and S, tab D; " +
      "TO-251A lead order G, D, S); https://www.aosmd.com/res/datasheets/AOD4185.pdf. NUMBERS NOT STATED BY THE " +
      "MANUFACTURER: CR-PEDAL-SYMBOL-AOD4185",
    pins: { "1": p("G", IN), "2": p("D", PAS), "3": p("S", PAS) },
  },
  TPS7A4901: {
    source: "TI SBVS121E (rev. May 2015) p. 4 DGN figure and Pin Functions table; PowerPAD numbered 9 as the " +
      "exposed pad of the installed footprint Package_SO:Texas_DGN0008B_VSSOP-8-1EP_3x3mm_P0.65mm_EP2x3mm_" +
      "Mask1.88x1.98mm_ThermalVias; https://www.ti.com/lit/ds/symlink/tps7a49.pdf",
    pins: {
      "1": p("OUT", PWR_OUT), "2": p("FB", IN), "3": p("NC", FREE), "4": p("GND", PWR), "5": p("EN", IN),
      "6": p("NR/SS", PAS), "7": p("DNC", NO_CONNECT), "8": p("IN", PWR), "9": p("PowerPAD", PAS),
    },
  },
  TPS7A2433: {
    source: "TI SBVS386E (rev. September 2022) p. 3 Figure 5-2 and Table 5-1 Pin Functions, DBV (Fixed) column; " +
      "https://www.ti.com/lit/ds/symlink/tps7a24.pdf",
    pins: { "1": p("IN", PWR), "2": p("GND", PWR), "3": p("EN", IN), "4": p("NC", FREE), "5": p("OUT", PWR_OUT) },
  },
  TPS62933F: {
    source: "TI SLUSEA4D (rev. August 2022) pp. 3-4 Figure 7-1 and Table 7-1 (types A, P, G; pin 7 is SS on " +
      "the TPS62933F); https://www.ti.com/lit/ds/symlink/tps62933.pdf",
    pins: {
      "1": p("RT", PAS), "2": p("EN", IN), "3": p("VIN", PWR), "4": p("GND", PWR),
      "5": p("SW", OUT), "6": p("BST", PAS), "7": p("SS", PAS), "8": p("FB", IN),
    },
  },
  TS3USB221: {
    source: "TI SCDS220M (rev. November 2024) p. 3 Table 4-1 Pin Functions, RSE; https://www.ti.com/lit/ds/symlink/ts3usb221.pdf",
    pins: {
      "1": p("1D+", BIDI), "2": p("1D-", BIDI), "3": p("2D+", BIDI), "4": p("2D-", BIDI), "5": p("GND", PWR),
      "6": p("~{OE}", IN), "7": p("D-", BIDI), "8": p("D+", BIDI), "9": p("S", IN), "10": p("VCC", PWR),
    },
  },
  USBLC6_2SC6: {
    source: "ST USBLC6-2 Doc ID 11265 Rev 5 (October 2011) p. 1 Figure 1 Functional diagram, SOT23-6L; LCSC " +
      "copy https://datasheet.lcsc.com/datasheet/pdf/0d3a2ab954b34651a0695e7ccf534db0.pdf (st.com refused the fetch)",
    pins: {
      "1": p("I/O1", PAS), "2": p("GND", PAS), "3": p("I/O2", PAS), "4": p("I/O2", PAS), "5": p("VBUS", PAS), "6": p("I/O1", PAS),
    },
  },
  LM66100: {
    source: "TI SLVSEZ8A (rev. June 2019) p. 3 DCK figure and Pin Functions (ST is not overbarred there; N/C " +
      "\"Not internally connected\"); https://www.ti.com/lit/ds/symlink/lm66100.pdf",
    pins: {
      "1": p("VIN", PWR), "2": p("GND", PWR), "3": p("~{CE}", IN), "4": p("N/C", FREE), "5": p("ST", OD), "6": p("VOUT", PWR_OUT),
    },
  },
  MCP6001: {
    source: "Microchip DS20001733L (rev. L, the document number's suffix; 2002-2020) p. 11 Table 3-1 Pin Function Table, MCP6001 SOT-23 column; " +
      "https://ww1.microchip.com/downloads/aemDocuments/documents/MSLD/ProductDocuments/DataSheets/" +
      "MCP6001-1R-1U-2-4-1-MHz-Low-Power-Op-Amp-DS20001733L.pdf",
    pins: { "1": p("VOUT", OUT), "2": p("VSS", PWR), "3": p("VIN+", IN), "4": p("VIN-", IN), "5": p("VDD", PWR) },
  },
  SG_210STF: {
    source: "Epson SG-210STF brief p. 2 Pin Map (1 ST overbarred, 2 GND, 3 OUT clock output, 4 VCC power " +
      "supply; ST is an input, p. 1 \"Input voltage ... ST terminal\"), " +
      "https://download.epsondevice.com/td/pdf/brief/SG-210STF_en.pdf; agreeing: Epson spec " +
      "SGxxxxCAN_E_Ver2.16 p. 2 Terminal Assignment (LCSC copy for X1G0041710019)",
    pins: { "1": p("~{ST}", IN), "2": p("GND", PWR), "3": p("OUT", OUT), "4": p("VCC", PWR) },
  },
  PMEG4030ER: {
    source: "Nexperia PMEG4030ER v.4 (23 January 2023) p. 1 Table 2 Pinning information (1 K cathode, 2 A " +
      "anode); LCSC copy https://datasheet.lcsc.com/datasheet/pdf/e067023646e33e78a624db81ec32c9c1.pdf",
    pins: DIODE_PINS,
  },
  PMEG4005AEA: {
    source: "Nexperia PMEG4005AEA v.4 (13 February 2023) p. 1 Table 2 Pinning information (1 K cathode, 2 A " +
      "anode), SOD323; LCSC copy https://datasheet.lcsc.com/datasheet/pdf/0ccfa74cc19be1b87b418b4257fe0055.pdf",
    pins: DIODE_PINS,
  },
  BAS116H: {
    source: "Nexperia BAS116H Rev. 3 (31 May 2011) p. 1 Table 2 Pinning (1 cathode, 2 anode; K and A are " +
      "Nexperia's own symbols for them, PMEG4005AEA v.4 Table 2); LCSC copy " +
      "https://datasheet.lcsc.com/datasheet/pdf/3effef0d92ac4111bb2691a2d714473d.pdf",
    pins: DIODE_PINS,
  },
  DIODE_1N4148W: {
    source: "Diodes Inc. DS30086 Rev. 32-2 p. 1 (SOD123, \"Polarity: Cathode Band\"; terminals not numbered); " +
      "https://www.diodes.com/assets/Datasheets/ds30086.pdf. NUMBERS: PIN_NUMBERS.diode, CR-PEDAL-KINDS",
    pins: DIODE_PINS,
  },
  BZT52C12: {
    source: "Diodes Inc. DS18004 Rev. 38-2 p. 1 (SOD123, \"Polarity: Cathode Band\"; terminals not numbered); " +
      "https://www.diodes.com/assets/Datasheets/ds18004.pdf. NUMBERS: PIN_NUMBERS.diode, CR-PEDAL-KINDS",
    pins: DIODE_PINS,
  },
  WP7113ID: {
    source: "Kingbright DSAF0012 / 1101005042 Rev V.13A (09/07/2020) p. 1 Package Dimensions (the cathode lead " +
      "labelled; not numbered); LCSC copy https://datasheet.lcsc.com/datasheet/pdf/048e537b0ce0e019fd0bcce4c500221a.pdf. " +
      "NUMBERS: PIN_NUMBERS.diode, CR-PEDAL-KINDS",
    pins: DIODE_PINS,
  },
  PESD12VL1BA: {
    source: "Nexperia PESDxL1BA series Rev. 02 (20 August 2009) p. 2 of 15 (PDF page 3) Table 2 Pinning (1 cathode 1, 2 cathode 2; " +
      "K for cathode as Nexperia writes it, PMEG4005AEA v.4 Table 2); LCSC copy " +
      "https://datasheet.lcsc.com/datasheet/pdf/635822dff4ae48ff8ae972126ca771e2.pdf",
    pins: { "1": p("K1", PAS), "2": p("K2", PAS) },
  },
}
