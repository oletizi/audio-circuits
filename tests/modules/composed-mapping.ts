import { MID_POSITIONS, MID_TAPS, tapLabel } from "../../reference/pultec/mid.ts"
import type { ExportMapping } from "../../lib/export/circuit-json.ts"

/** Instance prefix for the composed board under test. */
export const COMPOSED_PREFIX = "EQ"

const P = COMPOSED_PREFIX

/** The mid's net names, generated from the same tables the mid module and its
 * reference build from, so this cannot drift out of step with either one. The
 * shape matches `MID_NET_NAMES` in `tests/modules/mid.test.tsx`, prefixed for
 * this instance rather than the standalone module's own "MID".
 */
const MID_NET_NAMES: Readonly<Record<string, string>> = {
  [`${P}_MID_IN`]: "in",
  [`${P}_MID_GND`]: "0",
  [`${P}_MID_BOOST_RETURN`]: "mid_boost_return",
  [`${P}_MID_CUT_RETURN`]: "mid_cut_return",
  [`${P}_MID_COIL_RETURN`]: "mid_coil_return",
  ...Object.fromEntries(
    MID_TAPS.map(henries => [
      `${P}_MID_TAP_${tapLabel(henries)}`,
      `mid_tap_${tapLabel(henries).toLowerCase()}`,
    ]),
  ),
  ...Object.fromEntries(
    MID_POSITIONS.map(position => [
      `${P}_MID_SEL_${position.label}`,
      `mid_sel_${position.label.toLowerCase()}`,
    ]),
  ),
}

/** The mid's component names, generated the same way. */
const MID_COMPONENT_NAMES: Readonly<Record<string, string>> = {
  [`${P}_MID_R_BOOST`]: "R_MID_BOOST",
  [`${P}_MID_R_CUT`]: "R_MID_CUT",
  [`${P}_MID_R_SHUNT`]: "R_MID_SHUNT",
  ...Object.fromEntries(
    MID_TAPS.map(henries => [`${P}_MID_L_${tapLabel(henries)}`, `L_MID_${tapLabel(henries)}`]),
  ),
  ...Object.fromEntries(
    MID_POSITIONS.flatMap(position =>
      position.capacitors.map((_, index) => {
        const slot = index === 0 ? "A" : "B"
        return [`${P}_MID_C_${position.label}_${slot}`, `C_MID_${position.label}_${slot}`]
      })),
  ),
}

/** Maps what the composed board emits onto the reference's canonical
 * identifiers. Shared by the topology comparison and the AC comparison so the
 * two cannot drift apart and quietly test different things.
 *
 * Note the two entries pointing at `lo_boost_in`: that is one of the
 * composition's joins, stated here rather than inferred from the trace. The
 * mid's ground net is the other: `${P}_MID_GND` and `${P}_LB_GND` both map to
 * canonical `"0"`, which only reflects reality because `PultecPassiveEq`
 * traces them together on-board.
 */
export const COMPOSED_MAPPING: ExportMapping = {
  componentNames: {
    [`${P}_LC_C1`]: "C1", [`${P}_LC_C2`]: "C2", [`${P}_LC_C3`]: "C3",
    [`${P}_LC_C4`]: "C4", [`${P}_LC_C5`]: "C5", [`${P}_LC_C6`]: "C6",
    [`${P}_LC_C7`]: "C7",
    [`${P}_LB_C18`]: "C18", [`${P}_LB_C19`]: "C19", [`${P}_LB_C20`]: "C20",
    [`${P}_LB_C21`]: "C21", [`${P}_LB_C22`]: "C22", [`${P}_LB_C23`]: "C23",
    [`${P}_LB_R2`]: "R2",
    [`${P}_HC_C24`]: "C24", [`${P}_HC_C25`]: "C25", [`${P}_HC_C26`]: "C26",
    [`${P}_HC_C27`]: "C27", [`${P}_HC_C28`]: "C28", [`${P}_HC_C29`]: "C29",
    [`${P}_HC_C30`]: "C30", [`${P}_HC_C31`]: "C31", [`${P}_HC_C32`]: "C32",
    [`${P}_HC_C33`]: "C33",
    [`${P}_HC_R1`]: "R1",
    [`${P}_HB_C14`]: "C14", [`${P}_HB_C15`]: "C15", [`${P}_HB_C16`]: "C16",
    [`${P}_HB_C17`]: "C17", [`${P}_HB_C34`]: "C34", [`${P}_HB_C35`]: "C35",
    [`${P}_HB_C2a2`]: "C2a2", [`${P}_HB_C4a2`]: "C4a2", [`${P}_HB_C5a2`]: "C5a2",
    [`${P}_HB_R3`]: "R3",
    [`${P}_HB_L_600mH`]: "L_HI_BOOST_600MH", [`${P}_HB_L_300mH`]: "L_HI_BOOST_300MH",
    [`${P}_HB_L_200mH`]: "L_HI_BOOST_200MH", [`${P}_HB_L_100mH`]: "L_HI_BOOST_100MH",
    ...MID_COMPONENT_NAMES,
  },
  netNames: {
    [`${P}_LC_IN`]: "hi_boost_out",
    [`${P}_LC_SEL_20Hz`]: "j5_p1", [`${P}_LC_SEL_30Hz`]: "j5_p2",
    [`${P}_LC_SEL_60Hz`]: "j5_p3", [`${P}_LC_SEL_100Hz`]: "j5_p4",
    [`${P}_LC_SEL_150Hz`]: "j5_p5", [`${P}_LC_SEL_200Hz`]: "j5_p6",
    [`${P}_LB_GND`]: "0",
    [`${P}_LB_OUT`]: "out",
    [`${P}_LB_SECTION_IN`]: "lo_boost_in",
    [`${P}_HC_SECTION`]: "lo_boost_in",
    [`${P}_LB_SEL_20Hz`]: "j10_p1", [`${P}_LB_SEL_30Hz`]: "j10_p2",
    [`${P}_LB_SEL_60Hz`]: "j10_p3", [`${P}_LB_SEL_100Hz`]: "j10_p4",
    [`${P}_LB_SEL_150Hz`]: "j10_p5", [`${P}_LB_SEL_200Hz`]: "j10_p6",
    [`${P}_HC_WIPER`]: "j4_p2",
    [`${P}_HC_SEL_COMMON`]: "j3_p1",
    [`${P}_HC_SEL_3kHz`]: "j12_p1", [`${P}_HC_SEL_4kHz`]: "j12_p2",
    [`${P}_HC_SEL_5kHz`]: "j12_p3", [`${P}_HC_SEL_8kHz`]: "j12_p4",
    [`${P}_HC_SEL_10kHz`]: "j12_p5", [`${P}_HC_SEL_16kHz`]: "j12_p6",
    [`${P}_HB_TAP_600mH`]: "j15_p4", [`${P}_HB_TAP_300mH`]: "j15_p3",
    [`${P}_HB_TAP_200mH`]: "j15_p2", [`${P}_HB_TAP_100mH`]: "j15_p1",
    [`${P}_HB_SEL_3kHz`]: "j8_p6", [`${P}_HB_SEL_4kHz`]: "j8_p5",
    [`${P}_HB_SEL_5kHz`]: "j8_p4", [`${P}_HB_SEL_8kHz`]: "j8_p3",
    [`${P}_HB_SEL_10kHz`]: "j8_p2", [`${P}_HB_SEL_16kHz`]: "j8_p1",
    [`${P}_HB_COIL_TOP`]: "j19_p1",
    [`${P}_HB_QMAX_OUT`]: "j20_p1",
    ...MID_NET_NAMES,
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: { input: "hi_boost_out", output: "out", ground: "0" },
}
