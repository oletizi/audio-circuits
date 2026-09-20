/**
 * Pultec low boost capacitor bank.
 *
 * Six selectable capacitances from the rotary selector to ground, plus the 56K
 * series resistor that sets the section's working impedance. The selector and
 * the 47K LOG level potentiometer are front-panel parts, so they appear here as
 * named nets rather than components.
 *
 * Values are the Cboost column of Ian Thompson-Bell's Pultec 3 Band EQ
 * documentation, corroborated against the manufactured schematic. See
 * `reference/pultec/values.md`.
 *
 * This section carries NO inductors. The Pultec low network is an RC shelf, and
 * three documents in the source repository specify four large hand-wound coils
 * for it that the circuit does not use — see unresolved item 6.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"

export interface PultecLowBoostProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

/** Selector position label to the capacitor that lands on it. */
const POSITIONS: readonly (readonly [string, string, string])[] = [
  ["20Hz", "C18", "330nF"],
  ["30Hz", "C19", "220nF"],
  ["60Hz", "C20", "120nF"],
  ["100Hz", "C21", "68nF"],
  ["150Hz", "C22", "47nF"],
  ["200Hz", "C23", "33nF"],
]

export const PultecLowBoost = (props: PultecLowBoostProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const groundNet = `${name}_GND`
  const outNet = `${name}_OUT`
  const sectionNet = `${name}_SECTION_IN`

  return (
    <group name={name}>
      <net name={groundNet} />
      <net name={outNet} />
      <net name={sectionNet} />
      {POSITIONS.map(([position]) => (
        <Fragment key={`net-${position}`}>
          <net name={`${name}_SEL_${position}`} />
        </Fragment>
      ))}

      {POSITIONS.map(([position, ref, capacitance], column) => (
        <Fragment key={position}>
          <capacitor
            name={`${name}_${ref}`}
            capacitance={capacitance}
            footprint="0805"
            {...g.at(column - 2, 1)}
          />
          <trace from={`.${name}_${ref} > .pin1`} to={`net.${groundNet}`} />
          <trace from={`.${name}_${ref} > .pin2`} to={`net.${name}_SEL_${position}`} />
        </Fragment>
      ))}

      <resistor
        name={`${name}_R2`}
        resistance="56k"
        footprint="0805"
        {...g.signal(1)}
      />
      <trace from={`.${name}_R2 > .pin1`} to={`net.${outNet}`} />
      <trace from={`.${name}_R2 > .pin2`} to={`net.${sectionNet}`} />
    </group>
  )
}
