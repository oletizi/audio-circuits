/**
 * Generic four-terminal LED/LDR vactrol (optocoupler with photoresistor).
 *
 * MODELING BOUNDARY - read before relying on this part.
 *
 * This component represents CONNECTIVITY AND PACKAGING ONLY. tscircuit
 * does not understand optical coupling, and nothing here models:
 *   - LDR resistance as a function of LED current
 *   - attack time, release time, or optical memory
 *   - the part's nonlinear, history-dependent recovery
 *
 * The compression behaviour of any circuit using this part is therefore
 * NOT validated by a successful render. It must be measured on the bench.
 * See the design spec, sections 9 and 12.2.
 *
 * The LED and LDR sides are deliberately modelled with no electrical
 * connection between them. Do not "simplify" this into a net-controlled
 * variable resistor: the isolation IS the part.
 *
 * `footprint` is REQUIRED and has no default. The pin-to-pad mapping must
 * be verified against the selected device's datasheet before any
 * fabrication output is trusted.
 */

import type { ChipProps } from "tscircuit"

export const vactrolPinLabels = {
  pin1: "LED_A",
  pin2: "LED_K",
  pin3: "LDR_1",
  pin4: "LDR_2",
} as const

export type VactrolProps = ChipProps<typeof vactrolPinLabels> & {
  /** Required: no default. Verify pin-to-pad mapping against the datasheet. */
  footprint: string
}

export const Vactrol = (props: VactrolProps) => (
  <chip
    pinLabels={vactrolPinLabels}
    schPinArrangement={{
      leftSide: { direction: "top-to-bottom", pins: ["LED_A", "LED_K"] },
      rightSide: { direction: "top-to-bottom", pins: ["LDR_1", "LDR_2"] },
    }}
    {...props}
  />
)
