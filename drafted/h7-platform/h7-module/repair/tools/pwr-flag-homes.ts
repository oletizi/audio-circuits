/**
 * WHERE EACH h7-module NET'S SINGLE PWR_FLAG LIVES - the one declared table, under the controller
 * ruling CR-MODULE-PWR-FLAGS (`docs/h7-platform/decisions.md`). Each net of the module carries at
 * most one PWR_FLAG across the whole hierarchy, because two PWR_FLAGs on one net are an ERC
 * `pin_to_pin` error (power output to power output) - on one sheet, and across two sheets under one
 * root (both measured; the ruling quotes the reports).
 *
 * Keys are the MODULE's net names (the parent nets the blocks' ports are bound to); the value is the
 * block page that carries the flag, or `ROOT_SHEET` for the module's root sheet (Task 7b draws it).
 *
 * Which nets are here, and why. A net needs a flag when some pin on it is a KiCad power input and
 * nothing anywhere in the module has a power output on it. Taken from `kicad-cli sch erc`'s
 * `power_pin_not_driven` reports on the twelve committed drafts, cross-checked against the netlist
 * exports' pin types across all twelve (fix round 1 of Task 7a records the survey):
 * - GND: power inputs include U1 VSS, U2 GND, U3 VSSQ, U4 GND, U5 GND, J3 GND; no power output.
 * - 3V3_D: power inputs include U1 VBAT, U3 VDD, U4 VCC, U5 VDD, J3 VTref; no power output (L2
 *   feeds it, passive).
 * - VREF_A: U1 VDDA; no power output (the ferrite bead feeds it, passive).
 * - VSSA: U1 VSSA (pin 37); no power output. ERC reports it on the mcu draft on an unconnected
 *   net, because the draft leaves pin 37 unwired; the model puts pin 37 on VSSA (module/mcu.ts).
 * VCAP is not here: U1's VCAP pins are power outputs. VIN_MOD reaches no power input.
 *
 * GND's flag stays on the power page, which the owner approved with it; moving it would redraw an
 * approved page. Every other shared net's flag is on the root.
 *
 * PRIVATE nets are not in this table, because no other page can reach them: VIN_BUCK (U2's VIN,
 * fed through L1) carries its own flag on the power page, and that flag joins nothing elsewhere.
 * `PRIVATE_FLAGS` lists them so a reader sees every flag the module draws in one place.
 */

/** The module's root sheet, as a flag home. */
export const ROOT_SHEET = "root"

/** Module net -> the page carrying its single PWR_FLAG: a block prefix, or `ROOT_SHEET`. */
export const SHARED_FLAG_HOME: Readonly<Record<string, string>> = {
  GND: "power",
  "3V3_D": ROOT_SHEET,
  VREF_A: ROOT_SHEET,
  VSSA: ROOT_SHEET,
}

/** Block -> the private nets its own page flags. Documentary: a private net reaches no other page. */
export const PRIVATE_FLAGS: Readonly<Record<string, readonly string[]>> = {
  power: ["VIN_BUCK"],
}

/** True when the module net's declared flag is NOT on `block`'s page, so `block` must not carry one. */
export function flagLivesElsewhere(net: string, block: string): boolean {
  const home = SHARED_FLAG_HOME[net]
  return home !== undefined && home !== block
}
