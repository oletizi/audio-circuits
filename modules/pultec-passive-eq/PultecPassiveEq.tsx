/**
 * The three validated Pultec sections composed onto one board.
 *
 * The composition adds conductors and nothing else: each shared node is stated
 * once, by joining the modules' own net names. No component is duplicated and
 * no module is modified, which is the property the whole validation apparatus
 * exists to check — flatten this and it must equal the reference partition
 * recomposed.
 *
 * Scope matches the reference model: low cut, low boost, hi cut and hi boost.
 * The mid section is absent because its capacitor values are placeholders in
 * the source schematic. See `reference/pultec/unresolved.md`.
 */
import { PultecLowCut } from "../pultec-low-cut/PultecLowCut.tsx"
import { PultecLowBoost } from "../pultec-low-boost/PultecLowBoost.tsx"
import { PultecHiCut } from "../pultec-hi-cut/PultecHiCut.tsx"
import { PultecHiBoost } from "../pultec-hi-boost/PultecHiBoost.tsx"
import { columnLayout } from "../../lib/layout.ts"

export interface PultecPassiveEqProps {
  /** Prefix for the three module instances. */
  name: string
}

export const PultecPassiveEq = (props: PultecPassiveEqProps) => {
  const { name } = props
  const layout = columnLayout(4)

  const lowCut = `${name}_LC`
  const lowBoost = `${name}_LB`
  const hiCut = `${name}_HC`
  const hiBoost = `${name}_HB`

  return (
    <group name={name}>
      <PultecLowCut name={lowCut} {...layout[0]} />
      <PultecLowBoost name={lowBoost} {...layout[1]} />
      <PultecHiCut name={hiCut} {...layout[2]} />
      <PultecHiBoost name={hiBoost} {...layout[3]} />

      {/* The one shared node between these three sections: low boost's series
          resistor and the hi cut capacitor bank meet at the same point. */}
      <trace from={`net.${lowBoost}_SECTION_IN`} to={`net.${hiCut}_SECTION`} />
    </group>
  )
}
