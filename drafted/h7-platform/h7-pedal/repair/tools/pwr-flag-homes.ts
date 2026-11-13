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
 * The pages still to be repaired (the digital and analog groups) add their nets here, each with its
 * home, when they are repaired.
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
}

/** Block -> the private nets its own page flags. Empty: no page drawn so far flags a net. */
export const PRIVATE_FLAGS: Readonly<Record<string, readonly string[]>> = {}
