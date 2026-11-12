/**
 * VDDA/VREF+ (H7 module plan, Task 6): FB_VDDA, the bank, the damping leg, and VSSA's 0 ohm to GND.
 *
 * - FB_VDDA, Murata BLM21PG221SN1D, feeds VDDA from VDD (processor-and-memory.md:138; D17;
 *   CORE-07). The VDDA net is the contract's VREF_A, interface pin 21 (:40, D16; nets.ts).
 * - The bank is ruling CR-MODULE-VDDA-BANK's 2 x 10 uF + 2 x 100 nF and its damping leg R in series
 *   with C, ACROSS the bank and never in VDDA's DC path (R-18), read from `VDDA_RULED`
 *   (vdda-noise.ts), not restated. CORE-07 puts the bank "from VDDA to VSSA", so the bank and the
 *   leg return to VSSA.
 * - VREF+ is tied to VDDA at the MCU (both pins are on VREF_A in mcu.ts); VSSA joins GND only
 *   through R_VSSA, 0 ohm (:138; CORE-08).
 *
 * FB_VDDA IS AN `inductor` IN THIS MODEL (CR-MODULE-3V3-SUM: the 3V3 capacitance walk crosses it),
 * so it must carry an inductance, and the only one any document gives is the analysis's lower
 * bound `BEAD_L_MIN_H` (165 ohm / (2 pi x 100 MHz), vdda-noise.ts; analog.md :242, :272). That
 * figure is used only by the 3V3 walk and the VDDA analysis; it is NOT the bead's rating. The page
 * draws the rating, 220 ohm at 100 MHz, from the part spec's `beadImpedance` (ruling
 * CR-MODULE-BEAD-VALUE; `valueFor` never prints henries for a bead).
 */
import type { Network } from "../../../lib/model/index.ts"
import { FERRITE_VDDA } from "../module-parts.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { BEAD_L_MIN_H, VDDA_RULED } from "../vdda-noise.ts"
import { block, capacitor, inductor, resistor } from "./build.ts"
import { NET_3V3, NET_GND, NET_VREF_A, NET_VSSA } from "./nets.ts"

const BANK = "ruling CR-MODULE-VDDA-BANK (VDDA_RULED.bank, vdda-noise.ts); CORE-07 (the bank from VDDA to VSSA)"
const LEG = "ruling CR-MODULE-VDDA-BANK (VDDA_RULED.damping): R in series with C across the bank, never in the DC path (R-18)"
/** The damping leg's inner node, private to this block. */
const DAMP_NODE = "DAMP"

export function vddaBlock(): Network {
  const bank = VDDA_RULED.bank.map((c, i) =>
    capacitor(`c_vdda_bank${i + 1}`, c.nominal_F, NET_VREF_A, NET_VSSA, CAPACITOR, BANK))
  return block([
    inductor("fb_vdda", BEAD_L_MIN_H, NET_3V3, NET_VREF_A, FERRITE_VDDA,
      "processor-and-memory.md:138 (VDDA fed from VDD through FB_VDDA, BLM21PG221SN1D, D17); parts.md:35; CORE-07; inductance BEAD_L_MIN_H, the analysis bound (module comment)"),
    ...bank,
    resistor("r_vdda_damp", VDDA_RULED.damping.r_ohm, NET_VREF_A, DAMP_NODE, RESISTOR, LEG),
    capacitor("c_vdda_damp", VDDA_RULED.damping.c_F, DAMP_NODE, NET_VSSA, CAPACITOR, LEG),
    resistor("r_vssa", "0", NET_VSSA, NET_GND, RESISTOR, "processor-and-memory.md:138 (VSSA pin 37 joined to VSS through 0 ohm); CORE-08 (R_VSSA)"),
  ], [NET_3V3, NET_VREF_A, NET_VSSA, NET_GND])
}
