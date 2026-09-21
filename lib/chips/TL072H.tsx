/**
 * TL072H Dual JFET-Input Op-Amp (single-supply variant)
 *
 * Distinct from the bipolar `TL072` in this library: the H suffix is
 * specified for a 4.5-40 V total supply and has a rail-to-rail output
 * stage, both of which the +9 V optical compressor depends on. Pin 4 is
 * labelled GND rather than VEE because on a single supply the negative
 * rail IS ground.
 *
 * The rail-to-rail output headroom figure used in the compressor's
 * sidechain budget is extrapolated from a 40 V characterization and must
 * be measured at 8.7 V before it is trusted. See the design spec, 6.1.3.
 *
 * Pinout (DIP-8 / SOIC-8):
 *   1 OUTA   2 INA_N   3 INA_P   4 GND
 *   5 INB_P  6 INB_N   7 OUTB    8 VCC
 */

import type { ChipProps } from "tscircuit"

export const tl072hPinLabels = {
  pin1: "OUTA",
  pin2: "INA_N",
  pin3: "INA_P",
  pin4: "GND",
  pin5: "INB_P",
  pin6: "INB_N",
  pin7: "OUTB",
  pin8: "VCC",
} as const

export type TL072HProps = ChipProps<typeof tl072hPinLabels>

export const TL072H = (props: TL072HProps) => (
  <chip
    footprint={props.footprint ?? "soic8"}
    pinLabels={tl072hPinLabels}
    schPinArrangement={{
      leftSide: {
        direction: "top-to-bottom",
        pins: ["INA_P", "INA_N", "INB_P", "INB_N"],
      },
      rightSide: { direction: "top-to-bottom", pins: ["OUTA", "OUTB"] },
      topSide: { direction: "left-to-right", pins: ["VCC"] },
      bottomSide: { direction: "left-to-right", pins: ["GND"] },
    }}
    manufacturerPartNumber="TL072H"
    {...props}
  />
)
