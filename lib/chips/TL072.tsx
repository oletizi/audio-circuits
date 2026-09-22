/**
 * TL072 Dual JFET-Input Op-Amp
 *
 * Pinout (DIP-8 / SOIC-8):
 * - Pin 1: Output A
 * - Pin 2: Inverting Input A (-)
 * - Pin 3: Non-Inverting Input A (+)
 * - Pin 4: V- (negative supply)
 * - Pin 5: Non-Inverting Input B (+)
 * - Pin 6: Inverting Input B (-)
 * - Pin 7: Output B
 * - Pin 8: V+ (positive supply)
 */

import type { ChipProps } from "tscircuit"

export const tl072PinLabels = {
  pin1: "OUTA",
  pin2: "INA_N",
  pin3: "INA_P",
  pin4: "VEE",
  pin5: "INB_P",
  pin6: "INB_N",
  pin7: "OUTB",
  pin8: "VCC",
} as const

export type TL072Props = ChipProps<typeof tl072PinLabels>

export const TL072 = (props: TL072Props) => (
  <chip
    footprint={props.footprint ?? "soic8"}
    pinLabels={tl072PinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["INA_P", "INA_N", "INB_P", "INB_N"] },
      rightSide: { direction: "top-to-bottom", pins: ["OUTA", "OUTB"] },
      topSide: { direction: "left-to-right", pins: ["VCC"] },
      bottomSide: { direction: "left-to-right", pins: ["VEE"] },
    }}
    supplierPartNumbers={{
      jlcpcb: ["C6961"],  // TL072CDT
    }}
    {...props}
  />
)
