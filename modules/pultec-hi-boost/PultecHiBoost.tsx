/**
 * Pultec high boost capacitor bank and Qmax resistor.
 *
 * Each selector position pairs a capacitor with one inductor: the capacitor
 * injects at the tap net, and the inductor between that net and the common coil
 * top forms a series resonant branch back to the level pot's wiper. At
 * resonance the branch bridges out the upper part of the 47K pot, which is the
 * boost — the documentation's "high boost is achieved by frequency selectively
 * shorting out some or all of the 47K potentiometer".
 *
 * Six positions need only four inductors because 4k and 5k share the 0.3H part
 * and 10k and 16k share 0.1H. That grouping is not a simplification here; it is
 * how the capacitors are wired on the manufactured board, and it matches the
 * Lboost column of the reference documentation independently.
 *
 * The inductors are board-resident. They replace a multi-tapped coil that used
 * to sit off-board behind a terminal block, which is why the tap nets AND the
 * coil top are internal nodes here rather than terminals: each tap joins a
 * capacitor to its inductor, and the coil top joins all four inductors to Qmax.
 * Only the six selector throws and the Qmax return still leave the board.
 *
 * The selector and the Q pot are off-board, reached through those terminals.
 * The hi boost LEVEL pot does not appear here at all — it bridges the section's
 * input to its output and touches no net this board carries.
 *
 * The coil top is NOT grounded: it returns through Qmax to the Q control.
 *
 * Values are the Cboost column of Ian Thompson-Bell's Pultec 3 Band EQ
 * documentation. See `reference/pultec/values.md`.
 *
 * Grid rows are allocated: 0-1 capacitors, 2 Qmax, 3 inductors. Anything added
 * here takes row 4 or beyond — two components on one cell draw as one symbol
 * on top of another, which no topology assertion can see.
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

/** The taps, named for the inductance fitted at each — the label IS the value,
 * which is why one array serves both the net names and the parts. Six positions
 * share four inductors: 4k and 5k both want 0.3H, 10k and 16k both want 0.1H. */
const TAPS: readonly string[] = ["600mH", "300mH", "200mH", "100mH"]

export const PultecHiBoost = (props: PultecHiBoostProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const coilTopNet = `${name}_COIL_TOP`
  const qmaxOutNet = `${name}_QMAX_OUT`

  return (
    <group name={name}>
      <net name={coilTopNet} />
      <net name={qmaxOutNet} />
      {TAPS.map(tap => (
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

      {TAPS.map((tap, index) => (
        <Fragment key={`L-${tap}`}>
          <inductor
            name={`${name}_L_${tap}`}
            inductance={tap}
            footprint="0805"
            {...g.below(index - 2, 3)}
          />
          <trace from={`.${name}_L_${tap} > .pin1`} to={`net.${name}_TAP_${tap}`} />
          <trace from={`.${name}_L_${tap} > .pin2`} to={`net.${coilTopNet}`} />
        </Fragment>
      ))}
    </group>
  )
}
