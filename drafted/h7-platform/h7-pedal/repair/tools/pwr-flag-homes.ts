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
 * As of Task 7a (the interface and entry pages) it is EMPTY, and that is a measured claim, not a
 * default: on both pages every pin is passive (the sockets J1 and J2 `Connector_Generic:Conn_01x20`,
 * the jack J3 `Connector:Barrel_Jack`, FB1 `Device:FerriteBead`, the capacitors, R1, the diodes
 * `Diode:PMEG4030ER`, the pads `Connector:TestPoint`), and `kicad-cli sch erc` on both drafts and both
 * pages reports no `power_pin_not_driven` (`../../RECORD.md`, each page's measurements). The pages
 * that carry power inputs (pf, modsw, prail, ldo_vmid, and the digital and analog groups) add their
 * nets here, each with its home, when they are repaired.
 *
 * DATA ONLY. The tools that read it are in `draughting/pages/` (`flag-homes.ts` loads and checks it),
 * each given this board's drafted directory. A board without this file is refused by those tools,
 * naming it.
 */

/** The ruling this table is declared under; the shared tools' messages name it. */
export const RULING = "CR-MODULE-PWR-FLAGS"

/** The pedal's root sheet, as a flag home. */
export const ROOT_SHEET = "root"

/** Pedal net -> the page carrying its single PWR_FLAG: a block prefix, or `ROOT_SHEET`. Empty as of Task 7a (above). */
export const SHARED_FLAG_HOME: Readonly<Record<string, string>> = {}

/** Block -> the private nets its own page flags. Empty as of Task 7a: neither page flags a net. */
export const PRIVATE_FLAGS: Readonly<Record<string, readonly string[]>> = {}
