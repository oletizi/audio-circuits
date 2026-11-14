/**
 * The pedal's audio jacks and bypass relays (h7 pedal pages plan, Task 10; inventory section 1.3
 * B12; CR-PEDAL-BLOCKS `jacks_byp`), as bypass-relay.md sections 2.1 and 5.2 and
 * schematic-checklist.md AIO-01, AIO-18 to AIO-21 state them:
 *
 * - Four Neutrik NMJ6HCD2 jacks (parts.md:133), used as TS (AIO-01, schematic-checklist.md:151;
 *   AIO-18, :168): tip T on IN_TIP_x or OUT_JACK_x (bypass-relay.md:90, :94), sleeve S on GND, R, RN,
 *   SN open and the outputs' TN open. The right input's tip-normal TN is on the left tip net, so with no
 *   plug in the right input IN_TIP_R follows IN_TIP_L (:151; bypass-relay.md:125). The left input's TN,
 *   the sleeves' net and which contacts are modelled are CR-PEDAL-ANALOG-READINGS'.
 * - Four PESD12VL1BA,115, one from each jack net to GND at the jack, on the jack side of the relays
 *   (AIO-21, :171; analog.md:184, OWN-03; parts.md:107); pin 1 on the jack net (CR-PEDAL-ANALOG-READINGS).
 * - K_BYP_IN and K_BYP_OUT, Omron G6K-2F-Y DC3 (parts.md:122), with bypass-relay.md:97's terminals:
 *   1 coil +, 8 coil -, 3 and 6 COM, 2 and 7 NC, 4 and 5 NO; pole A = L, pole B = R, each pin's net as
 *   lines 99 and 100 list it, both coils' pin 1 on 3V3_P and pin 8 on RELAY_DRV (line 101; AIO-19,
 *   :169). The relay is an `ic` (CR-PEDAL-KINDS), numbered by its stock symbol `Relay:G6K-2`.
 * - Q_BYP, AO3400A: drain RELAY_DRV, source GND (bypass-relay.md:95, :112; parts.md:123). Its gate,
 *   RELAY_GATE: R_RELAY_EN 3.9 kOhm 1 % from RELAY_EN (contract pin 8), R_BPD 15.0 kOhm 1 % to GND, and
 *   Q_PFG's drain, Q_PFG an AO3400A with its gate on PF_TRIP and source on GND (bypass-relay.md:113-115,
 *   :242-243, :246; R-13; AIO-20, :170). AO3400A numbering 1 G, 2 S, 3 D (CR-PEDAL-SYMBOL-AO3400A).
 * - Per coil, a 1N4148W-7-F with its anode on RELAY_DRV and its cathode to a BZT52C12-7-F's cathode,
 *   the Zener's anode on 3V3_P (bypass-relay.md:102, :244-245; parts.md:124-125).
 *
 * Block-private nets: IN_TIP_x, OUT_JACK_x, BYP_x and RELAY_DRV are bypass-relay.md:90-95's names;
 * RELAY_GATE, SUP_IN and SUP_OUT are CR-PEDAL-ANALOG-READINGS'. IN_TIP_L stays inside this block; the
 * inventory's section 1.2 lists it, but no other block carries it (pedal/nets.ts).
 */
import { NC } from "../../../lib/model/index.ts"
import type { Network } from "../../../lib/model/index.ts"
import { RESISTOR } from "../parts.ts"
import { AO3400A, BZT52C12, DIODE_1N4148W, G6K_2F_Y, NMJ6HCD2, PESD12VL1BA } from "../pedal-parts.ts"
import { block, diode, part, resistor, switchingPart } from "./build.ts"
import { contractNet } from "./nets.ts"

const GND = "GND"
const V3P = "3V3_P"
const RELAY_EN = contractNet("RELAY_EN")
const PF_TRIP = "PF_TRIP"
const DRV = "RELAY_DRV"
const GATE = "RELAY_GATE"
const READINGS = "CR-PEDAL-ANALOG-READINGS"

const JACK_IN = `schematic-checklist.md:151 (AIO-01, two input jacks used as TS, R, RN and SN open); parts.md:133; sleeve, left TN and contacts: ${READINGS}`
const JACK_OUT = `schematic-checklist.md:168 (AIO-18, two output jacks used as TS, TN, R, RN and SN open); parts.md:133; sleeve and contacts: ${READINGS}`
const ESD = `schematic-checklist.md:171 (AIO-21, input diodes on IN_TIP_x, output diodes on OUT_JACK_x); analog.md:184 (OWN-03); parts.md:107; pin 1 on the line: ${READINGS}`
const RELAY = "bypass-relay.md:97 (1 = coil +, 8 = coil -; 3 and 6 = COM; 2 and 7 = NC; 4 and 5 = NO); bypass-relay.md:101 (pin 1 of both on 3V3_P; pin 8 of both on RELAY_DRV); parts.md:122"
const SUPPRESSOR = `bypass-relay.md:102 (1N4148W anode on RELAY_DRV, its cathode to the BZT52C12 cathode, the Zener's anode on 3V3_P); both on the same nets: ${READINGS}`

/** A TS jack: tip on `tip`, sleeve on GND, `tn` on the tip-normal; the no-plug contact only where TN carries a net. */
function tsJack(id: string, tip: string, tn: string | null, source: string) {
  const normal = tn === null ? [] : [["T", "TN"] as const]
  return switchingPart(id, { T: tip, R: NC, S: GND, TN: tn ?? NC, RN: NC, SN: NC }, { "no plug": normal, "plug in": [] }, NMJ6HCD2, source)
}

export function jacksBypBlock(): Network {
  return block([
    tsJack("j_in_l", "IN_TIP_L", null, `${JACK_IN}; bypass-relay.md:90 (IN_TIP_x)`),
    tsJack("j_in_r", "IN_TIP_R", "IN_TIP_L",
      `${JACK_IN}; schematic-checklist.md:151 (the right input's tip-normal contact connects to the left tip net); bypass-relay.md:125; analog.md:163`),
    tsJack("j_out_l", "OUT_JACK_L", null, `${JACK_OUT}; bypass-relay.md:94 (OUT_JACK_x)`),
    tsJack("j_out_r", "OUT_JACK_R", null, `${JACK_OUT}; bypass-relay.md:94 (OUT_JACK_x)`),
    part("d_esd_in_l", "ic", { "1": "IN_TIP_L", "2": GND }, PESD12VL1BA, `${ESD}; bypass-relay.md:90`),
    part("d_esd_in_r", "ic", { "1": "IN_TIP_R", "2": GND }, PESD12VL1BA, `${ESD}; bypass-relay.md:90`),
    part("d_esd_out_l", "ic", { "1": "OUT_JACK_L", "2": GND }, PESD12VL1BA, `${ESD}; bypass-relay.md:94`),
    part("d_esd_out_r", "ic", { "1": "OUT_JACK_R", "2": GND }, PESD12VL1BA, `${ESD}; bypass-relay.md:94`),
    part("k_byp_in", "ic", {
      "1": V3P, "2": "BYP_L", "3": "IN_TIP_L", "4": "FX_IN_L", "5": "FX_IN_R", "6": "IN_TIP_R", "7": "BYP_R", "8": DRV,
    }, G6K_2F_Y, `${RELAY}; bypass-relay.md:99 (K_BYP_IN, pole A = L, pole B = R)`),
    part("k_byp_out", "ic", {
      "1": V3P, "2": "BYP_L", "3": "OUT_JACK_L", "4": "FX_OUT_L", "5": "FX_OUT_R", "6": "OUT_JACK_R", "7": "BYP_R", "8": DRV,
    }, G6K_2F_Y, `${RELAY}; bypass-relay.md:100 (K_BYP_OUT, pole A = L, pole B = R)`),
    part("q_byp", "ic", { "1": GATE, "2": GND, "3": DRV }, AO3400A,
      "bypass-relay.md:112 (Q_BYP: AO3400A, drain RELAY_DRV, source GND); bypass-relay.md:95; parts.md:123; numbering: CR-PEDAL-SYMBOL-AO3400A"),
    resistor("r_relay_en", "3.9k", RELAY_EN, GATE, RESISTOR,
      "bypass-relay.md:113 (gate <- R_RELAY_EN 3.9k <- RELAY_EN, pin 8); bypass-relay.md:242 (3.9 kOhm 1 %, R-13); schematic-checklist.md:170 (AIO-20)"),
    resistor("r_bpd", "15.0k", GATE, GND, RESISTOR, "bypass-relay.md:114 (gate - R_BPD 15.0k - GND); bypass-relay.md:243 (15.0 kOhm 1 %, R-13)"),
    part("q_pfg", "ic", { "1": PF_TRIP, "2": GND, "3": GATE }, AO3400A,
      "bypass-relay.md:115 (Q_PFG drain on the gate, gate PF_TRIP, source GND); bypass-relay.md:246; bypass-relay.md:185 (R-37); parts.md:61; numbering: CR-PEDAL-SYMBOL-AO3400A"),
    diode("d_bf_in", DRV, "SUP_IN", DIODE_1N4148W, `${SUPPRESSOR}; bypass-relay.md:244 (D_BF_IN, 1N4148W-7-F); parts.md:124`),
    diode("d_bz_in", V3P, "SUP_IN", BZT52C12, `${SUPPRESSOR}; bypass-relay.md:245 (D_BZ_IN, BZT52C12-7-F); parts.md:125`),
    diode("d_bf_out", DRV, "SUP_OUT", DIODE_1N4148W, `${SUPPRESSOR}; bypass-relay.md:244 (D_BF_OUT, 1N4148W-7-F); parts.md:124`),
    diode("d_bz_out", V3P, "SUP_OUT", BZT52C12, `${SUPPRESSOR}; bypass-relay.md:245 (D_BZ_OUT, BZT52C12-7-F); parts.md:125`),
  ], ["FX_IN_L", "FX_IN_R", "FX_OUT_L", "FX_OUT_R", RELAY_EN, PF_TRIP, V3P, GND])
}
