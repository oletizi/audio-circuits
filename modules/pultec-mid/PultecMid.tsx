/**
 * Pultec mid boost/cut capacitor bank.
 *
 * All eleven of Ian Thompson-Bell's mid frequencies — the same set as the
 * Pultec MEQ5 — each wired to the winding tap its documentation calls for.
 * Five taps serve the eleven positions.
 *
 * Carrying all eleven is deliberate: positions can be left unpopulated at build
 * time, but a position designed out cannot be added back without a new board.
 * The builder's own unit fits six of them.
 *
 * The coil, the two-pole selector, the boost/off/cut switch and both pots are
 * off-board and appear here as named nets. The fixed resistors around the
 * section — 4K7 on the boost return, 1K on the cut return, 100K across the
 * input — are on-board.
 *
 * Values come from P3bandDoc.pdf page 3. Unlike this project's other modules,
 * this one is NOT validated against a netlist export of the manufactured board,
 * because that board carries a six-position subset with placeholder values. See
 * `reference/pultec/mid.ts`.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"
import { MID_POSITIONS, MID_RESISTORS, tapLabel } from "../../reference/pultec/mid.ts"

export interface PultecMidProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

export const PultecMid = (props: PultecMidProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const inputNet = `${name}_IN`
  const groundNet = `${name}_GND`
  const boostReturnNet = `${name}_BOOST_RETURN`
  const cutReturnNet = `${name}_CUT_RETURN`

  const taps = [...new Set(MID_POSITIONS.map(p => p.henries))]

  return (
    <group name={name}>
      <net name={inputNet} />
      <net name={groundNet} />
      <net name={boostReturnNet} />
      <net name={cutReturnNet} />
      {taps.map(henries => (
        <Fragment key={`tap-${henries}`}>
          <net name={`${name}_TAP_${tapLabel(henries)}`} />
        </Fragment>
      ))}
      {MID_POSITIONS.map(position => (
        <Fragment key={`sel-${position.label}`}>
          <net name={`${name}_SEL_${position.label}`} />
        </Fragment>
      ))}

      {MID_POSITIONS.map((position, column) => (
        <Fragment key={position.label}>
          {position.capacitors.map((capacitance, row) => (
            <Fragment key={`${position.label}-${row}`}>
              <capacitor
                name={`${name}_C_${position.label}_${row === 0 ? "A" : "B"}`}
                capacitance={capacitance}
                footprint="0805"
                {...g.at(column - 5, row)}
              />
              <trace
                from={`.${name}_C_${position.label}_${row === 0 ? "A" : "B"} > .pin1`}
                to={`net.${name}_TAP_${tapLabel(position.henries)}`}
              />
              <trace
                from={`.${name}_C_${position.label}_${row === 0 ? "A" : "B"} > .pin2`}
                to={`net.${name}_SEL_${position.label}`}
              />
            </Fragment>
          ))}
        </Fragment>
      ))}

      {/* Boost returns the winding to the input through 4K7; cut returns it to
          ground through 1K. The centre position of the switch leaves both open. */}
      <resistor
        name={`${name}_R_BOOST`}
        resistance={`${MID_RESISTORS.boostReturnOhms}`}
        footprint="0805"
        {...g.below(-1, 2)}
      />
      <trace from={`.${name}_R_BOOST > .pin1`} to={`net.${inputNet}`} />
      <trace from={`.${name}_R_BOOST > .pin2`} to={`net.${boostReturnNet}`} />

      <resistor
        name={`${name}_R_CUT`}
        resistance={`${MID_RESISTORS.cutReturnOhms}`}
        footprint="0805"
        {...g.below(1, 2)}
      />
      <trace from={`.${name}_R_CUT > .pin1`} to={`net.${cutReturnNet}`} />
      <trace from={`.${name}_R_CUT > .pin2`} to={`net.${groundNet}`} />

      <resistor
        name={`${name}_R_SHUNT`}
        resistance={`${MID_RESISTORS.inputShuntOhms}`}
        footprint="0805"
        {...g.below(3, 2)}
      />
      <trace from={`.${name}_R_SHUNT > .pin1`} to={`net.${inputNet}`} />
      <trace from={`.${name}_R_SHUNT > .pin2`} to={`net.${groundNet}`} />
    </group>
  )
}
