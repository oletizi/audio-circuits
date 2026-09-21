/**
 * Pultec mid boost/cut capacitor bank.
 *
 * All eleven of Ian Thompson-Bell's mid frequencies — the same set as the
 * Pultec MEQ5 — each wired to the inductance its documentation calls for.
 * Five inductors serve the eleven positions.
 *
 * Carrying all eleven is deliberate: positions can be left unpopulated at build
 * time, but a position designed out cannot be added back without a new board.
 * The builder's own unit fits six of them.
 *
 * The five inductors are board-resident, replacing a multi-tapped coil that sat
 * off-board behind a terminal block — which is why the tap nets are internal
 * nodes here rather than terminals, each joining a capacitor to its inductor.
 * The frequency selector and the boost/off/cut switch are off-board and reach
 * this board through the eleven throw nets and the three return nets. The mid
 * level pot does not appear here at all: it is a rheostat between the hi boost
 * output and the selector common, and touches no net this board carries.
 *
 * The fixed resistors around the section — 4K7 on the boost return, 1K on the
 * cut return, 100K across the input — are on-board.
 *
 * Grid rows are allocated: 0-1 capacitors, 2 inductors, 4 the fixed resistors.
 * Each inductor sits at the average column of the capacitors on its tap, which
 * keeps the tap nets short enough that tscircuit draws them as wires rather
 * than printing a label at each end.
 *
 * Values come from P3bandDoc.pdf page 3. This module IS compared against its
 * portion of the reference partition, like the others; what differs is the
 * reference's own provenance, which is documentation rather than a netlist
 * export of the manufactured board — that board carries a six-position subset
 * with placeholder values. See `reference/pultec/mid.ts`.
 */
import { Fragment } from "react"
import { createGrid } from "../../lib/layout.ts"
import { MID_POSITIONS, MID_RESISTORS, MID_TAPS, tapLabel } from "../../reference/pultec/mid.ts"

export interface PultecMidProps {
  /** Prefix for every component and net name in this module. */
  name: string
  schX?: number
  schY?: number
}

/** Written in henries with a decimal point, NOT as millihenries. tscircuit
 * drops the milli prefix when it formats a value for display: `450mH` renders
 * on the schematic as "450H", a thousand times the real part, while `0.45H`
 * renders correctly as "450mH". Both parse to the same number, so the netlist
 * and the simulation cannot tell them apart — only the drawing, and anything
 * derived from it, can. See `reference/pultec/unresolved.md`. */
const MID_INDUCTANCES: Readonly<Record<string, string>> = {
  "2H": "2H",
  "1H": "1H",
  "0R45H": "0.45H",
  "0R22H": "0.22H",
  "0R1H": "0.1H",
}

/** A tap with no inductance here is a part nobody can buy or fit, so say so
 * rather than handing tscircuit an undefined value it would render as blank. */
function inductanceFor(label: string): string {
  const inductance = MID_INDUCTANCES[label]
  if (inductance === undefined) {
    throw new Error(`No inductance defined for mid tap ${label}`)
  }
  return inductance
}

/** Columns are spread wider than the default grid step because each pin of each
 * capacitor carries a net label, and two labels on neighbouring pins overprint
 * each other at one step. Three rather than the hi boost's two because this
 * section's names are longer — `MID_TAP_0R22H` beside `MID_SEL_4kHz` still
 * collided at two. Verified by rendering, not by arithmetic: the check is
 * whether a person can read the drawing. This moves no part relative to another
 * electrically. */
const COLUMN_SPACING = 3

/** The column an inductor sits at: the average of the columns its capacitors
 * occupy, so the part lands among the parts it serves.
 *
 * This is what makes the tap nets draw as wires. tscircuit routes a net when it
 * is short and has few pins, and gives up and prints a label at each pin when it
 * spans the sheet — so an inductor parked in a row of its own turns every tap
 * into a row of labels a reader has to match up by name. Computed rather than
 * written down so it follows the capacitor bank if a position ever moves.
 */
function tapColumn(henries: number): number {
  const columns = MID_POSITIONS.flatMap((position, index) =>
    position.henries === henries ? [index - 5] : [],
  )
  if (columns.length === 0) throw new Error(`No position uses the ${henries}H tap`)
  return columns.reduce((total, column) => total + column, 0) / columns.length
}

export const PultecMid = (props: PultecMidProps) => {
  const { name, schX = 0, schY = 0 } = props
  const g = createGrid(schX, schY)

  const inputNet = `${name}_IN`
  const groundNet = `${name}_GND`
  const boostReturnNet = `${name}_BOOST_RETURN`
  const cutReturnNet = `${name}_CUT_RETURN`
  const coilReturnNet = `${name}_COIL_RETURN`

  return (
    <group name={name}>
      <net name={inputNet} />
      <net name={groundNet} />
      <net name={boostReturnNet} />
      <net name={cutReturnNet} />
      <net name={coilReturnNet} />
      {MID_TAPS.map(henries => (
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
                {...g.at((column - 5) * COLUMN_SPACING, row)}
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
        {...g.at(-3 * COLUMN_SPACING, 4)}
      />
      <trace from={`.${name}_R_BOOST > .pin1`} to={`net.${inputNet}`} />
      <trace from={`.${name}_R_BOOST > .pin2`} to={`net.${boostReturnNet}`} />

      <resistor
        name={`${name}_R_CUT`}
        resistance={`${MID_RESISTORS.cutReturnOhms}`}
        footprint="0805"
        {...g.at(0, 4)}
      />
      <trace from={`.${name}_R_CUT > .pin1`} to={`net.${cutReturnNet}`} />
      <trace from={`.${name}_R_CUT > .pin2`} to={`net.${groundNet}`} />

      <resistor
        name={`${name}_R_SHUNT`}
        resistance={`${MID_RESISTORS.inputShuntOhms}`}
        footprint="0805"
        {...g.at(3 * COLUMN_SPACING, 4)}
      />
      <trace from={`.${name}_R_SHUNT > .pin1`} to={`net.${inputNet}`} />
      <trace from={`.${name}_R_SHUNT > .pin2`} to={`net.${groundNet}`} />

      {MID_TAPS.map(henries => (
        <Fragment key={`L-${henries}`}>
          <inductor
            name={`${name}_L_${tapLabel(henries)}`}
            inductance={inductanceFor(tapLabel(henries))}
            footprint="0805"
            {...g.at(tapColumn(henries) * COLUMN_SPACING, 2)}
          />
          <trace
            from={`.${name}_L_${tapLabel(henries)} > .pin1`}
            to={`net.${name}_TAP_${tapLabel(henries)}`}
          />
          <trace from={`.${name}_L_${tapLabel(henries)} > .pin2`} to={`net.${coilReturnNet}`} />
        </Fragment>
      ))}
    </group>
  )
}
