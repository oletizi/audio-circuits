/**
 * Three-terminal potentiometer connector.
 *
 * Rendered as a 3-pin header with semantic pin names so the wiper is
 * distinguishable from either end terminal on the bench and in an
 * exported schematic. See the design spec, section 10.1, for why the
 * generic P1/P2/P3 naming on ScrewTerminal3 is not sufficient for pot
 * connections: the wiper must never be confused with an end terminal,
 * and the two ends are frequently electrically different from each
 * other (e.g. J_PEAK: MAKEUP_OUT vs VBIAS).
 */

import type { ChipProps } from "tscircuit"

export const potTerminalPinLabels = {
  pin1: "TOP",
  pin2: "WIPER",
  pin3: "BOTTOM",
} as const

export type PotTerminalProps = ChipProps<typeof potTerminalPinLabels>

export const PotTerminal = (props: PotTerminalProps) => (
  <chip
    footprint="pinrow3"
    pinLabels={potTerminalPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["TOP", "WIPER", "BOTTOM"] },
    }}
    {...props}
  />
)
