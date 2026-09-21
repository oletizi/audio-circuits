/**
 * Single-pin test point for bench probing.
 *
 * Rendered as a 1-pin header so a probe or clip can attach. The pin is
 * named TP so selectors read `.TP_VBIAS > .TP`.
 */

import type { ChipProps } from "tscircuit"

export const testPointPinLabels = { pin1: "TP" } as const

export type TestPointProps = ChipProps<typeof testPointPinLabels>

export const TestPoint = (props: TestPointProps) => (
  <chip
    footprint="pinrow1"
    pinLabels={testPointPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["TP"] },
    }}
    {...props}
  />
)
