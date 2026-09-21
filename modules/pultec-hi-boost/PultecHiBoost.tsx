/**
 * Pultec high boost capacitor bank and Qmax resistor.
 *
 * Each selector position pairs a capacitor with one tap of the hand-wound
 * coil: the capacitor injects at its tap, and the winding between that tap and
 * the coil's top forms a series resonant branch back to the level pot's wiper.
 * At resonance the branch bridges out the upper part of the 47K pot, which is
 * the boost — the documentation's "high boost is achieved by frequency
 * selectively shorting out some or all of the 47K potentiometer".
 *
 * Six positions need only four tap wires because 4k and 5k share the 0.3H tap
 * and 10k and 16k share 0.1H. That grouping is not a simplification here; it is
 * how the capacitors are wired on the manufactured board, and it matches the
 * Lboost column of the reference documentation independently.
 *
 * The coil, the selector, and both pots are off-board and appear as named nets.
 * The coil is NOT grounded: its top returns to Qmax.
 *
 * Values are the Cboost column of Ian Thompson-Bell's Pultec 3 Band EQ
 * documentation. See `reference/pultec/values.md`.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"

export interface PultecHiBoostProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

/** Position label, its capacitors, and the tap they share. */
const POSITIONS: readonly (readonly [string, string, readonly (readonly [string, string])[]])[] = [
  ["3kHz", "600mH", [["C14", "4.7nF"]]],
  ["4kHz", "300mH", [["C15", "4.7nF"], ["C2a2", "470pF"]]],
  ["5kHz", "300mH", [["C16", "3.3nF"]]],
  ["8kHz", "200mH", [["C17", "1nF"], ["C4a2", "1nF"]]],
  ["10kHz", "100mH", [["C34", "1nF"], ["C5a2", "1.5nF"]]],
  ["16kHz", "100mH", [["C35", "1nF"]]],
]

/** Tap label to the discrete inductor fitted there. Six positions share four
 * parts: 4k and 5k both want 0.3H, 10k and 16k both want 0.1H. */
const TAPS: readonly (readonly [string, string])[] = [
  ["600mH", "600mH"],
  ["300mH", "300mH"],
  ["200mH", "200mH"],
  ["100mH", "100mH"],
]

export const PultecHiBoost = (props: PultecHiBoostProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const coilTopNet = `${name}_COIL_TOP`
  const qmaxOutNet = `${name}_QMAX_OUT`
  const taps = ["600mH", "300mH", "200mH", "100mH"]

  return (
    <group name={name}>
      <net name={coilTopNet} />
      <net name={qmaxOutNet} />
      {taps.map(tap => (
        <Fragment key={`tap-${tap}`}>
          <net name={`${name}_TAP_${tap}`} />
        </Fragment>
      ))}
      {POSITIONS.map(([position]) => (
        <Fragment key={`sel-${position}`}>
          <net name={`${name}_SEL_${position}`} />
        </Fragment>
      ))}

      {POSITIONS.map(([position, tap, caps], column) => (
        <Fragment key={position}>
          {caps.map(([ref, capacitance], row) => (
            <Fragment key={ref}>
              <capacitor
                name={`${name}_${ref}`}
                capacitance={capacitance}
                footprint="0805"
                {...g.at(column - 2, row)}
              />
              <trace from={`.${name}_${ref} > .pin1`} to={`net.${name}_TAP_${tap}`} />
              <trace from={`.${name}_${ref} > .pin2`} to={`net.${name}_SEL_${position}`} />
            </Fragment>
          ))}
        </Fragment>
      ))}

      <resistor
        name={`${name}_R3`}
        resistance="4.7k"
        footprint="0805"
        {...g.below(0, 2)}
      />
      <trace from={`.${name}_R3 > .pin1`} to={`net.${coilTopNet}`} />
      <trace from={`.${name}_R3 > .pin2`} to={`net.${qmaxOutNet}`} />

      {TAPS.map(([tap, inductance], index) => (
        <Fragment key={`L-${tap}`}>
          <inductor
            name={`${name}_L_${tap}`}
            inductance={inductance}
            footprint="0805"
            {...g.below(index - 2, 1)}
          />
          <trace from={`.${name}_L_${tap} > .pin1`} to={`net.${name}_TAP_${tap}`} />
          <trace from={`.${name}_L_${tap} > .pin2`} to={`net.${coilTopNet}`} />
        </Fragment>
      ))}
    </group>
  )
}
