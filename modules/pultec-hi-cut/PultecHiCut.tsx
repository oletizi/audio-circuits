/**
 * Pultec high cut capacitor bank.
 *
 * Six selectable capacitances between the section's node and the rotary
 * selector, plus the 430R series resistor that feeds the selector common. The
 * selector and the 4K7 level potentiometer are front-panel parts and appear
 * here as named nets.
 *
 * Values are the Ccut column of Ian Thompson-Bell's Pultec 3 Band EQ
 * documentation, corroborated against the manufactured schematic. See
 * `reference/pultec/values.md`. Four of the six positions carry two capacitors
 * in parallel, which is the documentation's "spaces on the PCB for up to two
 * capacitors per boost/cut frequency".
 *
 * The 430R value is itself meaningful: the reference's stepped-pot document
 * lists 430 as the 2dB step of the hi cut ladder.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"

export interface PultecHiCutProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

/** Selector position label to the capacitors that land on it. */
const POSITIONS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ["3kHz", [["C24", "47nF"], ["C30", "33nF"]]],
  ["4kHz", [["C25", "47nF"], ["C31", "10nF"]]],
  ["5kHz", [["C26", "47nF"]]],
  ["8kHz", [["C27", "22nF"], ["C32", "10nF"]]],
  ["10kHz", [["C28", "22nF"], ["C33", "2.2nF"]]],
  ["16kHz", [["C29", "15nF"]]],
]

export const PultecHiCut = (props: PultecHiCutProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const sectionNet = `${name}_SECTION`
  const wiperNet = `${name}_WIPER`
  const commonNet = `${name}_SEL_COMMON`

  return (
    <group name={name}>
      <net name={sectionNet} />
      <net name={wiperNet} />
      <net name={commonNet} />
      {POSITIONS.map(([position]) => (
        <Fragment key={`net-${position}`}>
          <net name={`${name}_SEL_${position}`} />
        </Fragment>
      ))}

      {POSITIONS.map(([position, caps], column) => (
        <Fragment key={position}>
          {caps.map(([ref, capacitance], row) => (
            <Fragment key={ref}>
              <capacitor
                name={`${name}_${ref}`}
                capacitance={capacitance}
                footprint="0805"
                {...g.at(column - 2, row)}
              />
              <trace from={`.${name}_${ref} > .pin1`} to={`net.${sectionNet}`} />
              <trace from={`.${name}_${ref} > .pin2`} to={`net.${name}_SEL_${position}`} />
            </Fragment>
          ))}
        </Fragment>
      ))}

      <resistor
        name={`${name}_R1`}
        resistance="430"
        footprint="0805"
        {...g.below(0, 2)}
      />
      <trace from={`.${name}_R1 > .pin1`} to={`net.${wiperNet}`} />
      <trace from={`.${name}_R1 > .pin2`} to={`net.${commonNet}`} />
    </group>
  )
}
