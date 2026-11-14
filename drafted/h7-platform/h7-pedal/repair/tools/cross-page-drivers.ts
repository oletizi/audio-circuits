/**
 * THE h7-pedal NETS WHOSE DRIVER IS ON ANOTHER PAGE - the pedal's own declared table, under the
 * controller ruling CR-MODULE-CROSS-PAGE-DRIVERS (`docs/h7-platform/decisions.md`), which the pedal's
 * pages carry, and CR-PEDAL-CROSS-PAGE-POWER-DRIVERS, which adds a power net driven by a `power_out`
 * pin on another page.
 *
 * Why it exists. `verify.sh` runs ERC on a block page under a root holding that block alone
 * (`draughting/pages/one-block-root.ts`). A net whose only driven pin on the page is a KiCad input
 * (`pin_not_driven`), or a power input (`power_pin_not_driven`), and whose driver is a pin on another
 * page, reports an error the page cannot remove. For each net here, the one-block root places a
 * stand-in on the net's stub when the block under check is not the driving block: a
 * `Connector:TestPoint` for a signal driver, a PWR_FLAG where the driving pin is `power_out`
 * (`standInKind`, `draughting/pages/cross-page-drivers.ts`).
 *
 * Declared, never derived: an entry is written here, from the model (`h7Pedal()`), with its source,
 * and only for a net ERC reports on a page being verified (the ruling). `checkCrossPageDrivers`
 * (`draughting/pages/cross-page-drivers.ts`) holds each entry to the model on every run.
 *
 * The entries, by the page whose ERC reported them (h7 pedal pages plan, Task 7b):
 * - the pf page: 5V_A. U1's VDD (pin 6) reported `power_pin_not_driven` under the pf page's
 *   one-block root; 5V_A is driven by U4's OUT on the ldo_vmid page, a `power_out` pin. Measured: the
 *   TestPoint stand-in leaves the error, a PWR_FLAG clears it (`../../RECORD.md`, the pf section).
 * - the modsw page: PF_ON and PF_TRIP. Each reaches one pin there, a MOSFET gate typed `input` (Q2's
 *   and Q3's G, CR-PEDAL-PIN-MATCH clause 1), and the modsw draft's ERC reported `pin_not_driven` on
 *   each; each is driven by U2 (U_PFINV) on the pf page.
 * Interface and entry (Task 7a) need none: every pin on both is passive.
 * Task 9c added, by the page whose ERC reported it:
 * - the sai_iso page: 3V3_CODEC. U11's VCC (pin 5, `power_in`) reported `power_pin_not_driven` under
 *   the sai_iso page's one-block root; 3V3_CODEC is driven by U6's OUT on the codec_sup page, a
 *   `power_out` pin (h7-platform:TPS7A2433DBV), so its stand-in is a PWR_FLAG, as 5V_A's is.
 * - the codec page: CODEC_RST_N, XO_OUT and DIN_CODEC. U9's RST (pin 15), SCKI1 (pin 6; SCKI2, pin 9,
 *   is on the same net) and DIN (pin 12), each typed `input`, reported `pin_not_driven` under the
 *   codec page's one-block root. CODEC_RST_N is driven by U8's RESET on the codec_sup page
 *   (`open_collector`; Q5's drain beside it is passive), XO_OUT by U7's OUT on the codec_sup page
 *   (`output`), DIN_CODEC by U11's Y on the sai_iso page (`output`); each stand-in is a TestPoint.
 *   VINL and VINR, U9's other two inputs, have no entry: their driver is the adc_drv block, which the
 *   model does not hold until Task 10, and an entry is held to the model.
 *
 * DATA ONLY; the shared tools read it through the board's drafted directory, and refuse a board
 * without it, naming the file.
 */
import type { CrossPageDriver } from "../../../../../draughting/pages/cross-page-drivers.ts"

/** The ruling this table is declared under; the shared tools' messages name it. */
export const RULING = "CR-MODULE-CROSS-PAGE-DRIVERS"

export const CROSS_PAGE_DRIVERS: readonly CrossPageDriver[] = [
  {
    net: "5V_A",
    block: "ldo_vmid",
    designator: "U4",
    pin: "1",
    pinName: "OUT",
    source: "circuits/h7-platform/pedal/ldo-vmid.ts:66 (u_ldo pin 1 OUT = 5V_A; schematic-checklist.md:129, PWR-08; power.md:474); U4's symbol h7-platform:TPS7A4901 types pin 1 power_out (CR-PEDAL-SYMBOL-TPS7A4901; CR-PEDAL-PIN-MATCH clause 3), so its stand-in is a PWR_FLAG (CR-PEDAL-CROSS-PAGE-POWER-DRIVERS)",
  },
  {
    net: "PF_TRIP",
    block: "pf",
    designator: "U2",
    pin: "6",
    pinName: "1Y",
    source: "circuits/h7-platform/pedal/pf.ts:63 (u_pfinv pin 6, 1Y, on PF_TRIP: channel A makes PF_TRIP; bypass-relay.md:185; CR-PEDAL-POWER-READINGS, channel A is gate 1); 74xGxx:SN74LVC2G14DBV types pin 6 output",
  },
  {
    net: "PF_ON",
    block: "pf",
    designator: "U2",
    pin: "4",
    pinName: "2Y",
    source: "circuits/h7-platform/pedal/pf.ts:63 (u_pfinv pin 4, 2Y, on PF_ON: channel B re-inverts PF_TRIP into PF_ON; bypass-relay.md:185; CR-PEDAL-POWER-READINGS, channel B is gate 2); 74xGxx:SN74LVC2G14DBV types pin 4 output",
  },
  {
    net: "3V3_CODEC",
    block: "codec_sup",
    designator: "U6",
    pin: "5",
    pinName: "OUT",
    source: "circuits/h7-platform/pedal/codec-sup.ts:42 (u_cvdd pin 5 OUT = 3V3_CODEC; analog.md:387, R-30); U6's symbol h7-platform:TPS7A2433DBV types pin 5 power_out (CR-PEDAL-SYMBOL-TPS7A2433), so its stand-in is a PWR_FLAG (CR-PEDAL-CROSS-PAGE-POWER-DRIVERS)",
  },
  {
    net: "CODEC_RST_N",
    block: "codec_sup",
    designator: "U8",
    pin: "2",
    pinName: "~{RESET}",
    source: "circuits/h7-platform/pedal/codec-sup.ts:51 (u_crst pin 2, open-drain RESET on CODEC_RST_N; analog.md:407, R-31); h7-platform:TLV803EA30DBZR types pin 2 open_collector (CR-PEDAL-SYMBOL-TLV803EA29)",
  },
  {
    net: "XO_OUT",
    block: "codec_sup",
    designator: "U7",
    pin: "3",
    pinName: "OUT",
    source: "circuits/h7-platform/pedal/codec-sup.ts:48 (u_xo pin 3 OUT = XO_OUT; analog.md:374 and :383, R-29); Oscillator:SG-5032CAN types pin 3 output (CR-PEDAL-SYMBOL-SG-210STF)",
  },
  {
    net: "DIN_CODEC",
    block: "sai_iso",
    designator: "U11",
    pin: "4",
    pinName: "Y",
    source: "circuits/h7-platform/pedal/sai-iso.ts:61 (u_iso_c pin 4, Y, on DIN_CODEC; architecture.md:256, R-10); h7-platform:SN74LVC1G34DBV types pin 4 output (CR-PEDAL-SYMBOL-SN74LVC1G34)",
  },
]
