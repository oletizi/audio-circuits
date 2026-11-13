/**
 * WHERE EACH h7-pedal NET'S SINGLE PWR_FLAG LIVES - the pedal's own declared table, under the
 * controller ruling CR-MODULE-PWR-FLAGS (`docs/h7-platform/decisions.md`), which the pedal's pages
 * carry unchanged: each net carries at most one PWR_FLAG across the whole hierarchy, because two
 * PWR_FLAGs on one net are an ERC `pin_to_pin` error (power output to power output), measured on one
 * sheet and across sheets under one root (the ruling quotes the reports).
 *
 * Keys are the PEDAL's net names (the root nets the blocks' ports bind to, `h7Pedal()`); the value is
 * the block page that carries the flag, or `ROOT_SHEET` for the pedal's root sheet.
 *
 * WHICH NETS ARE HERE, AND WHY. A net needs a flag when some pin on it is a KiCad power input and
 * nothing anywhere on the pedal has a power output on it. The table is written page by page, as each
 * page is repaired (h7 pedal pages plan, Task 7), from that page's ERC reports.
 *
 * Task 7a (the interface and entry pages) needed none: on both pages every pin is passive (the
 * sockets J1 and J2 `Connector_Generic:Conn_01x20`, the jack J3 `Connector:Barrel_Jack`, FB1
 * `Device:FerriteBead`, the capacitors, R1, the diodes `Diode:PMEG4030ER`, the pads
 * `Connector:TestPoint`), and `kicad-cli sch erc` on both drafts and both pages reports no
 * `power_pin_not_driven` (`../../RECORD.md`, each page's measurements).
 *
 * Task 7b (the pf and modsw pages) added the first entry:
 * - GND, on the ROOT. Under the pf page's one-block root, `kicad-cli sch erc` reported
 *   `power_pin_not_driven` on U1's GND (pin 2, `power_in`; U2's GND, pin 2, is `power_in` too); no pin
 *   anywhere on the pedal's GND is a power output. CR-MODULE-PWR-FLAGS puts every shared net's flag
 *   on the root and kept the module's GND on its power page only because that page was approved with
 *   it; no pedal page carries a flag, so GND's goes on the root, and no block page draws one.
 * 5V_A is NOT here, although the pf page reported it too (U1's VDD): it is driven by U4's OUT on the
 * ldo_vmid page, a `power_out` pin, and a PWR_FLAG anywhere on it would be a second power output on
 * the net. Its stand-in on a one-block root is a cross-page driver entry (`cross-page-drivers.ts`;
 * ruling CR-PEDAL-CROSS-PAGE-POWER-DRIVERS).
 *
 * Task 7c (the prail and ldo_vmid pages) added two, each on the ROOT for the reason GND's is there:
 * - VIN_MOD. Under the prail page's one-block root, `kicad-cli sch erc` reported
 *   `power_pin_not_driven` on U3's VIN (pin 3, `power_in`). Survey of h7Pedal(): VIN_MOD's other
 *   pins are all passive (C12, C14-C16, R12, TP4, Q1's drain, J2 pin 19); no power output.
 * - VIN_A. Under the ldo_vmid page's one-block root, `kicad-cli sch erc` reported
 *   `power_pin_not_driven` on U4's IN (pin 8, `power_in`; U5's V+, pin 8, is `power_in` too).
 *   Survey of h7Pedal(): VIN_A's other pins are passive (C2-C7, C25, C30, C31, R22, TP2, D1's
 *   cathode) or an input (U4's EN); no power output.
 *
 * Task 9a (the usb, midi_i2c and fsw_led pages) added one, on the ROOT for the reason GND's is there:
 * - 3V3_D. Under the usb page's one-block root, `kicad-cli sch erc` reported `power_pin_not_driven`
 *   on U15's VCC (pin 10, `power_in`; U16's VCC on the midi_i2c page and U10's on sai_iso are
 *   `power_in` too). Survey of h7Pedal(): 3V3_D reaches the module through J2 pin 18 (passive); its
 *   other pins are passive (the pull-ups, C42, C59, C61, R83, R86, R93, R94, TP6, J8 pin 1) or power
 *   inputs (U10, U15, U16); no power output.
 *
 * Task 9b (the controls_a, controls_b and expr_ref pages) added one, on the ROOT for the reason GND's
 * is there:
 * - VREF_A. Under the expr_ref page's one-block root, `kicad-cli sch erc` reported
 *   `power_pin_not_driven` on U12's VIN (pin 1, `power_in`; U13's VDD, pin 5, is `power_in` too).
 *   Survey of h7Pedal(): VREF_A reaches the module through J2 pin 1 (passive); its other pins
 *   are passive (the six control pots' cw ends, C46, R41, R50) or power inputs (U12's VIN, U13's
 *   VDD); no power output. The controls pages, whose VREF_A pins are all passive, reported nothing.
 *
 * Task 9c (the codec_sup, sai_iso and codec pages) added one, on the ROOT for the reason GND's is
 * there:
 * - 5V_A_CODEC. Under the codec_sup page's one-block root, `kicad-cli sch erc` reported
 *   `power_pin_not_driven` on U6's IN (pin 1, `power_in`; U9's VCC, pin 24 on the codec page, is
 *   `power_in` too). Survey of h7Pedal(): 5V_A_CODEC is fed from 5V_A through R21 (PWR-15's 0 ohm,
 *   ldo_vmid page, passive); its other pins are passive (C32, C36, C37, D6's cathode), an input (U6's
 *   EN) or power inputs (U6's IN, U9's VCC); no power output.
 * 3V3_CODEC is NOT here: U6's OUT (pin 5, codec_sup page) is `power_out`, so on the codec and sai_iso
 * pages it is a cross-page driver entry (`cross-page-drivers.ts`), as 5V_A is.
 *
 * The pages still to be repaired (the analog group) add their nets here, each with its home, when
 * they are repaired.
 *
 * DATA ONLY. The tools that read it are in `draughting/pages/` (`flag-homes.ts` loads and checks it),
 * each given this board's drafted directory. A board without this file is refused by those tools,
 * naming it.
 */

/** The ruling this table is declared under; the shared tools' messages name it. */
export const RULING = "CR-MODULE-PWR-FLAGS"

/** The pedal's root sheet, as a flag home. */
export const ROOT_SHEET = "root"

/** Pedal net -> the page carrying its single PWR_FLAG: a block prefix, or `ROOT_SHEET`. */
export const SHARED_FLAG_HOME: Readonly<Record<string, string>> = {
  GND: ROOT_SHEET,
  VIN_MOD: ROOT_SHEET,
  VIN_A: ROOT_SHEET,
  "3V3_D": ROOT_SHEET,
  VREF_A: ROOT_SHEET,
  "5V_A_CODEC": ROOT_SHEET,
}

/** Block -> the private nets its own page flags. Empty: no page drawn so far flags a net. */
export const PRIVATE_FLAGS: Readonly<Record<string, readonly string[]>> = {}
