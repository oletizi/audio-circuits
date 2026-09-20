/**
 * Pultec low cut capacitor bank.
 *
 * The frequency-selective half of the low cut section: six selectable
 * capacitances between the section's input node and the rotary selector. The
 * selector and the level potentiometer are front-panel parts and are not on
 * this board, so they appear here as named nets rather than components — which
 * connector carries them is a physical decision that belongs after the
 * electrical partition is validated.
 *
 * Values are the Ccut column of Ian Thompson-Bell's Pultec 3 Band EQ
 * documentation, corroborated against the manufactured schematic. See
 * `reference/pultec/values.md`. The 60 Hz position carries two capacitors in
 * parallel; every other position carries one. That is the documentation's
 * "single components are used for all but one cut frequency", and it is why
 * C3 and C7 share a net here.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"

export interface PultecLowCutProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

/** Selector position label to the capacitors that land on it. */
const POSITIONS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ["20Hz", [["C1", "18nF"]]],
  ["30Hz", [["C2", "10nF"]]],
  ["60Hz", [["C3", "4.7nF"], ["C7", "1nF"]]],
  ["100Hz", [["C4", "3.3nF"]]],
  ["150Hz", [["C5", "2.2nF"]]],
  ["200Hz", [["C6", "1.8nF"]]],
]

export const PultecLowCut = (props: PultecLowCutProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const inputNet = `${name}_IN`

  return (
    <group name={name}>
      <net name={inputNet} />
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
              <trace from={`.${name}_${ref} > .pin1`} to={`net.${inputNet}`} />
              <trace from={`.${name}_${ref} > .pin2`} to={`net.${name}_SEL_${position}`} />
            </Fragment>
          ))}
        </Fragment>
      ))}
    </group>
  )
}
