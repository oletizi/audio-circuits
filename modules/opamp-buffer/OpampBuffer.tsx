/**
 * Unity-Gain Opamp Buffer Module
 *
 * A single-channel unity-gain buffer using one half of a TL072.
 * Includes:
 * - DC blocking input capacitor
 * - Bias resistor to ground
 * - Unity-gain feedback configuration
 * - DC blocking output capacitor
 *
 * Interface:
 * - IN: Audio input (AC coupled)
 * - OUT: Buffered output (AC coupled)
 * - VCC: Positive supply (+15V typical)
 * - VEE: Negative supply (-15V typical)
 * - GND: Ground reference
 */

import { TL072 } from "../../lib/chips/index"
import { ScrewTerminal2, ScrewTerminal3 } from "../../lib/connectors/index"

export interface OpampBufferProps {
  name: string
  /** Input coupling capacitor value (default: 100nF) */
  inputCap?: string
  /** Output coupling capacitor value (default: 100nF) */
  outputCap?: string
  /** Bias resistor value (default: 100k) */
  biasResistor?: string
  /** PCB position */
  pcbX?: number
  pcbY?: number
}

export const OpampBuffer = (props: OpampBufferProps) => {
  const {
    name,
    inputCap = "100nF",
    outputCap = "100nF",
    biasResistor = "100k",
    pcbX = 0,
    pcbY = 0,
  } = props

  return (
    <group>
      {/* Input terminal */}
      <ScrewTerminal2
        name={`${name}_J_IN`}
        pcbX={pcbX - 25}
        pcbY={pcbY}
      />

      {/* Input DC blocking capacitor */}
      <capacitor
        name={`${name}_C_IN`}
        capacitance={inputCap}
        footprint="0805"
        pcbX={pcbX - 15}
        pcbY={pcbY}
      />

      {/* Bias resistor to ground */}
      <resistor
        name={`${name}_R_BIAS`}
        resistance={biasResistor}
        footprint="0805"
        pcbX={pcbX - 5}
        pcbY={pcbY + 5}
      />

      {/* Op-amp (using channel A) */}
      <TL072 name={`${name}_U`} pcbX={pcbX + 5} pcbY={pcbY} />

      {/* Output DC blocking capacitor */}
      <capacitor
        name={`${name}_C_OUT`}
        capacitance={outputCap}
        footprint="0805"
        pcbX={pcbX + 20}
        pcbY={pcbY}
      />

      {/* Output terminal */}
      <ScrewTerminal2
        name={`${name}_J_OUT`}
        pcbX={pcbX + 30}
        pcbY={pcbY}
      />

      {/* Power terminal (+V, GND, -V) */}
      <ScrewTerminal3
        name={`${name}_J_PWR`}
        pcbX={pcbX}
        pcbY={pcbY + 15}
      />

      {/* Power decoupling capacitors */}
      <capacitor
        name={`${name}_C_VCC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX + 5}
        pcbY={pcbY + 10}
      />
      <capacitor
        name={`${name}_C_VEE`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX + 5}
        pcbY={pcbY - 10}
      />

      {/* Named nets for clean schematic labels */}
      <net name={`${name}_GND`} />
      <net name={`${name}_VCC`} />
      <net name={`${name}_VEE`} />
      <net name={`${name}_IN`} />
      <net name={`${name}_FB`} />
      <net name={`${name}_OUT`} />

      {/* Signal path traces */}
      {/* Input: J_IN.P1 -> C_IN.pin1 */}
      <trace from={`.${name}_J_IN > .P1`} to={`.${name}_C_IN > .pin1`} />

      {/* C_IN -> R_BIAS and U.INA_P via named net */}
      <trace from={`.${name}_C_IN > .pin2`} to={`net.${name}_IN`} />
      <trace from={`.${name}_R_BIAS > .pin1`} to={`net.${name}_IN`} />
      <trace from={`.${name}_U > .INA_P`} to={`net.${name}_IN`} />

      {/* Unity gain feedback: OUTA -> INA_N */}
      <trace from={`.${name}_U > .OUTA`} to={`net.${name}_FB`} />
      <trace from={`.${name}_U > .INA_N`} to={`net.${name}_FB`} />

      {/* Output: OUTA -> C_OUT -> J_OUT */}
      <trace from={`net.${name}_FB`} to={`.${name}_C_OUT > .pin1`} />
      <trace from={`.${name}_C_OUT > .pin2`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_J_OUT > .P1`} to={`net.${name}_OUT`} />

      {/* Power connections via named nets */}
      <trace from={`.${name}_J_PWR > .P1`} to={`net.${name}_VCC`} />
      <trace from={`.${name}_C_VCC > .pin1`} to={`net.${name}_VCC`} />
      <trace from={`.${name}_U > .VCC`} to={`net.${name}_VCC`} />

      <trace from={`.${name}_J_PWR > .P3`} to={`net.${name}_VEE`} />
      <trace from={`.${name}_C_VEE > .pin1`} to={`net.${name}_VEE`} />
      <trace from={`.${name}_U > .VEE`} to={`net.${name}_VEE`} />

      {/* Ground connections via named net */}
      <trace from={`.${name}_J_IN > .P2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_J_OUT > .P2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_J_PWR > .P2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_R_BIAS > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_VCC > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_VEE > .pin2`} to={`net.${name}_GND`} />
    </group>
  )
}
