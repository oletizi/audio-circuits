/**
 * The three validated Pultec sections composed onto one board.
 *
 * The composition adds conductors and nothing else: each shared node is stated
 * once, by joining the modules' own net names. No component is duplicated and
 * no module is modified, which is the property the whole validation apparatus
 * exists to check — flatten this and it must equal the reference partition
 * recomposed.
 *
 * Scope matches the reference model: low cut, low boost, hi cut, hi boost and
 * mid.
 */
import { PultecLowCut } from "../pultec-low-cut/PultecLowCut.tsx"
import { PultecLowBoost } from "../pultec-low-boost/PultecLowBoost.tsx"
import { PultecHiCut } from "../pultec-hi-cut/PultecHiCut.tsx"
import { PultecHiBoost } from "../pultec-hi-boost/PultecHiBoost.tsx"
import { PultecMid } from "../pultec-mid/PultecMid.tsx"
import { columnLayout } from "../../lib/layout.ts"

export interface PultecPassiveEqProps {
  /** Prefix for the five module instances. */
  name: string
}

export const PultecPassiveEq = (props: PultecPassiveEqProps) => {
  const { name } = props
  const layout = columnLayout(5)

  const lowCut = `${name}_LC`
  const lowBoost = `${name}_LB`
  const hiCut = `${name}_HC`
  const hiBoost = `${name}_HB`
  const mid = `${name}_MID`

  return (
    <group name={name}>
      <PultecLowCut name={lowCut} {...layout[0]} />
      <PultecLowBoost name={lowBoost} {...layout[1]} />
      <PultecHiCut name={hiCut} {...layout[2]} />
      <PultecHiBoost name={hiBoost} {...layout[3]} />
      <PultecMid name={mid} {...layout[4]} />

      {/* The one shared node between these three sections: low boost's series
          resistor and the hi cut capacitor bank meet at the same point. */}
      <trace from={`net.${lowBoost}_SECTION_IN`} to={`net.${hiCut}_SECTION`} />

      {/* The mid's input shunt and boost return reference the canonical input
          node directly (nothing else on this board carries it — the hi boost
          level pot that bridges it to hi_boost_out is off-board), so it needs
          no board trace of its own.
          Ground is different: the mid board and the low boost board each carry
          their own ground net, and nothing else joins them. Without this
          conductor the two boards would be electrically separate even though
          the flattened model treats both as canonical net "0" — this trace is
          what makes that true rather than just asserted. */}
      <trace from={`net.${mid}_GND`} to={`net.${lowBoost}_GND`} />
    </group>
  )
}
