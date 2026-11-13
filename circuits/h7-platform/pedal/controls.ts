/**
 * The pedal's six control positions (h7 pedal pages plan, Task 8; inventory section 1.3 B14), in two
 * blocks by CR-PEDAL-BLOCKS: `controls_a` holds positions 1-3 and `controls_b` positions 4-6, each
 * position independent of the others.
 *
 * Per position n, as CR-PEDAL-CONTROL-NODE draws it (`controlPositionNets`, `CONTROL_POSITION`):
 * - the pot fit, RV_POSn, RV16AF-41 B10K, 10 kOhm linear, ccw on GND, cw on VREF_A, wiper on POSn_NODE
 *   (analog.md:364; parts.md:131);
 * - the button fit, SW_BTNn, TC-6610-17-100G, from POSn_NODE to POSn_BTN (parts.md:132), with its
 *   pull-up R_PUn 10.0 kOhm from 3V3_D to POSn_NODE (power.md:417; mechanical-and-controls.md:300);
 * - always fitted (mechanical-and-controls.md:300): R_BTNn 1.00 kOhm from POSn_BTN to GND, R_POSn
 *   10.0 kOhm from POSn_NODE to the contract pin POSn, and C_POSn 100 nF X7R at the pin to GND
 *   (power.md:417; analog.md:364).
 *
 * BOTH FITS ARE MODELLED (CR-PEDAL-POPULATION, variant positions): the per-effect fit is a design
 * variant with no default (mechanical-and-controls.md:298), so every symbol of both fits is on the
 * page, whose note says exactly one fit is placed per position. The ids are `VARIANT_POSITIONS`';
 * `population.ts` exempts exactly the pot-fit and button-fit ids from its both-fits rule.
 */
import type { Component, Network } from "../../../lib/model/index.ts"
import { CAPACITOR, RESISTOR } from "../parts.ts"
import { RV16AF_41, TC_6610 } from "../pedal-parts.ts"
import { VARIANT_POSITIONS } from "../pedal-population.ts"
import { CONTROL_POSITION, controlPositionNets } from "../pedal-rulings.ts"
import { block, capacitor, potentiometer, pushButton, resistor } from "./build.ts"
import { contractNet } from "./nets.ts"

const NODE = "CR-PEDAL-CONTROL-NODE"

/** The ids CR-PEDAL-POPULATION lists for position `n`, refused if the list changed shape. */
function ids(n: number): { pot: string; button: string; pullUp: string; btnRes: string; series: string; pinCap: string } {
  const v = VARIANT_POSITIONS[n - 1]
  const [pot] = v?.potFit ?? []
  const [button, pullUp] = v?.buttonFit ?? []
  const [btnRes, series, pinCap] = v?.alwaysFitted ?? []
  if (v === undefined || v.position !== `POS${n}` || pot === undefined || button === undefined || pullUp === undefined ||
    btnRes === undefined || series === undefined || pinCap === undefined) {
    throw new Error(
      `VARIANT_POSITIONS (circuits/h7-platform/pedal-population.ts) has no complete entry for POS${n}; the controls blocks ` +
        "take their ids from it so the population check exempts exactly those. Not defaulted: an id typed here could drift from the list.",
    )
  }
  return { pot, button, pullUp, btnRes, series, pinCap }
}

function position(n: number): Component[] {
  const nets = controlPositionNets(n)
  const id = ids(n)
  return [
    potentiometer(id.pot, "10k", nets.pot, RV16AF_41, `analog.md:364 (10 kOhm linear pot from VREF_A to GND, wiper to R_POS); parts.md:131; ${NODE} (ccw GND, cw VREF_A); CR-PEDAL-POPULATION (pot fit)`),
    resistor(id.pullUp, CONTROL_POSITION.pullUpOhm, nets.pullUp.a, nets.pullUp.b, RESISTOR,
      `power.md:417 (R_PUn 10.0 kOhm to 3V3_D); mechanical-and-controls.md:300 (with a button); ${NODE}; CR-PEDAL-POPULATION (button fit)`),
    pushButton(id.button, nets.button["1"], nets.button["2"], TC_6610, `parts.md:132 (button fit, TC-6610-17-100G; O-17, O-18); ${NODE}; CR-PEDAL-POPULATION (button fit)`),
    resistor(id.btnRes, CONTROL_POSITION.buttonOhm, nets.buttonResistor.a, nets.buttonResistor.b, RESISTOR,
      `power.md:417 (R_BTNn 1.00 kOhm to GND); mechanical-and-controls.md:300 (always fitted); ${NODE}`),
    resistor(id.series, CONTROL_POSITION.seriesOhm, nets.series.a, contractNet(nets.series.b), RESISTOR,
      `analog.md:364 (R_POS 10.0 kOhm to the pin); power.md:417; mechanical-and-controls.md:300 (always fitted); ${NODE}`),
    capacitor(id.pinCap, CONTROL_POSITION.pinCapF, contractNet(nets.pinCap.a), nets.pinCap.b, CAPACITOR,
      `analog.md:364 (C_POS 100 nF X7R at the pin); mechanical-and-controls.md:300 (always fitted); ${NODE}`),
  ]
}

function controls(positions: readonly number[]): Network {
  return block(positions.flatMap(position), ["VREF_A", "3V3_D", ...positions.map((n) => contractNet(`POS${n}`)), "GND"].map((p) => (p === "GND" ? p : contractNet(p))))
}

/** Positions 1-3 (contract pins 22-24). */
export function controlsABlock(): Network {
  return controls([1, 2, 3])
}

/** Positions 4-6 (contract pins 25-27). */
export function controlsBBlock(): Network {
  return controls([4, 5, 6])
}
