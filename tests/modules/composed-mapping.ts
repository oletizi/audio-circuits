import type { ExportMapping } from "../../lib/export/circuit-json.ts"

/** Instance prefix for the composed board under test. */
export const COMPOSED_PREFIX = "EQ"

const P = COMPOSED_PREFIX

/** Maps what the composed board emits onto the reference's canonical
 * identifiers. Shared by the topology comparison and the AC comparison so the
 * two cannot drift apart and quietly test different things.
 *
 * Note the two entries pointing at `lo_boost_in`: that is the composition's
 * single join, stated here rather than inferred from the trace.
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
  },
  pinNames: { pin1: "a", pin2: "b" },
  ports: { input: "hi_boost_out", output: "out", ground: "0" },
}
