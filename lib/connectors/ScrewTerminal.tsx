/**
 * Phoenix Contact style screw terminals
 * 5.08mm (0.2") pitch - standard for audio/industrial applications
 */

import type { ChipProps } from "tscircuit"

// 2-position screw terminal (Signal + Ground)
export const screwTerminal2PinLabels = {
  pin1: "P1",
  pin2: "P2",
} as const

export type ScrewTerminal2Props = ChipProps<typeof screwTerminal2PinLabels>

export const ScrewTerminal2 = (props: ScrewTerminal2Props) => (
  <chip
    footprint="pinrow2"
    pinLabels={screwTerminal2PinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["P1", "P2"] },
    }}
    {...props}
  />
)

// 3-position screw terminal (e.g., +V, Signal, -V or Control connections)
export const screwTerminal3PinLabels = {
  pin1: "P1",
  pin2: "P2",
  pin3: "P3",
} as const

export type ScrewTerminal3Props = ChipProps<typeof screwTerminal3PinLabels>

export const ScrewTerminal3 = (props: ScrewTerminal3Props) => (
  <chip
    footprint="pinrow3"
    pinLabels={screwTerminal3PinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["P1", "P2", "P3"] },
    }}
    {...props}
  />
)

// 6-position screw terminal (Frequency selector send/return)
export const screwTerminal6PinLabels = {
  pin1: "P1",
  pin2: "P2",
  pin3: "P3",
  pin4: "P4",
  pin5: "P5",
  pin6: "P6",
} as const

export type ScrewTerminal6Props = ChipProps<typeof screwTerminal6PinLabels>

export const ScrewTerminal6 = (props: ScrewTerminal6Props) => (
  <chip
    footprint="pinrow6"
    pinLabels={screwTerminal6PinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["P1", "P2", "P3", "P4", "P5", "P6"] },
    }}
    {...props}
  />
)
