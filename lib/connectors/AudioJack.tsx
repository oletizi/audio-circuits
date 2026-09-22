/**
 * Audio Jack connectors (1/4" TRS, 1/8" TRS, etc.)
 */

import type { ChipProps } from "tscircuit"

// Mono jack (Tip + Sleeve)
export const monoJackPinLabels = {
  pin1: "TIP",
  pin2: "SLEEVE",
} as const

export type MonoJackProps = ChipProps<typeof monoJackPinLabels>

export const MonoJack = (props: MonoJackProps) => (
  <chip
    footprint="pinrow2"  // TODO: proper audio jack footprint
    pinLabels={monoJackPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["TIP", "SLEEVE"] },
    }}
    {...props}
  />
)

// Stereo jack (Tip + Ring + Sleeve)
export const stereoJackPinLabels = {
  pin1: "TIP",
  pin2: "RING",
  pin3: "SLEEVE",
} as const

export type StereoJackProps = ChipProps<typeof stereoJackPinLabels>

export const StereoJack = (props: StereoJackProps) => (
  <chip
    footprint="pinrow3"  // TODO: proper audio jack footprint
    pinLabels={stereoJackPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["TIP", "RING", "SLEEVE"] },
    }}
    {...props}
  />
)
