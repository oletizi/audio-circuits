/**
 * Power and bias reference for the optical compressor.
 *
 * INTERNAL PART - not exported from the module's index.ts. See the design
 * spec, section 11.1, for why the module splits into parts without
 * promoting them to public modules.
 *
 * Provides:
 *   9V_PROT  - supply after series Schottky reverse-polarity protection
 *   VBIAS    - BUFFERED half-supply reference (~4.35 V)
 *   GND      - ground
 *
 * Also declares U2, whose section A is the sidechain amplifier used by
 * Sidechain.tsx. The package split (audio in U1, control in U2) keeps the
 * transient-rich sidechain out of the audio package. See spec 8.1.
 *
 * VBIAS_RAW (the unbuffered divider midpoint) is deliberately a separate
 * net from VBIAS. Only the buffer output may carry load: audio bias
 * returns, the LDR shunt and gain-setting resistors all connect to VBIAS.
 */

import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface PowerSectionProps {
  name: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const PowerSection = (props: PowerSectionProps) => {
  const { name, schX = 0, schY = 0, pcbX = 0, pcbY = 0 } = props
  const g = createGrid(schX, schY)

  return (
    <group>
      {/* Named nets */}
      <net name={`${name}_9V_RAW`} />
      <net name={`${name}_9V_PROT`} />
      <net name={`${name}_VBIAS_RAW`} />
      <net name={`${name}_VBIAS`} />
      <net name={`${name}_GND`} />

      {/* --- Reverse-polarity protection and reservoir --- */}
      <diode
        name={`${name}_D_PROT`}
        footprint="sma"
        manufacturerPartNumber="1N5817"
        pcbX={pcbX - 20}
        pcbY={pcbY}
        {...g.signal(-4)}
      />
      <capacitor
        name={`${name}_C_BULK`}
        capacitance="47uF"
        footprint="1206"
        pcbX={pcbX - 14}
        pcbY={pcbY + 4}
        {...g.below(-3, 1)}
      />
      <capacitor
        name={`${name}_C_HF`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX - 10}
        pcbY={pcbY + 4}
        {...g.below(-2, 1)}
      />

      {/* --- Half-supply divider --- */}
      <resistor
        name={`${name}_R_BIAS1`}
        resistance="47k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 4}
        pcbY={pcbY - 4}
        {...g.above(-1, 1)}
      />
      <resistor
        name={`${name}_R_BIAS2`}
        resistance="47k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 4}
        pcbY={pcbY + 4}
        {...g.below(-1, 1)}
      />
      <capacitor
        name={`${name}_C_BIAS`}
        capacitance="47uF"
        footprint="1206"
        schRotation="90deg"
        pcbX={pcbX}
        pcbY={pcbY + 4}
        {...g.below(0, 1)}
      />
      <capacitor
        name={`${name}_C_BIAS_HF`}
        capacitance="100nF"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 3}
        pcbY={pcbY + 4}
        {...g.below(1, 1)}
      />

      {/* --- Control-side op-amp package (A: sidechain, B: VBIAS buffer) --- */}
      <TL072H
        name={`${name}_U2`}
        pcbX={pcbX + 10}
        pcbY={pcbY}
        {...g.signal(3)}
      />
      <capacitor
        name={`${name}_C_U2_DEC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX + 10}
        pcbY={pcbY - 5}
        {...g.above(3, 1)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_9V`}
        pcbX={pcbX - 8}
        pcbY={pcbY - 6}
        {...g.above(-2, 2)}
      />
      <TestPoint
        name={`${name}_TP_VBIAS`}
        pcbX={pcbX + 16}
        pcbY={pcbY}
        {...g.signal(5)}
      />
      <TestPoint
        name={`${name}_TP_GND`}
        pcbX={pcbX - 8}
        pcbY={pcbY + 8}
        {...g.below(-2, 2)}
      />

      {/* === Protection: RAW -> D_PROT -> PROTECTED === */}
      <trace from={`.${name}_D_PROT > .anode`} to={`net.${name}_9V_RAW`} />
      <trace from={`.${name}_D_PROT > .cathode`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_BULK > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_BULK > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_HF > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_HF > .pin2`} to={`net.${name}_GND`} />

      {/* === Divider: PROTECTED -> R_BIAS1 -> VBIAS_RAW -> R_BIAS2 -> GND === */}
      <trace from={`.${name}_R_BIAS1 > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_R_BIAS1 > .pin2`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_R_BIAS2 > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_R_BIAS2 > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_BIAS > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_C_BIAS > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_BIAS_HF > .pin1`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_C_BIAS_HF > .pin2`} to={`net.${name}_GND`} />

      {/* === VBIAS buffer (U2 section B), unity gain === */}
      <trace from={`.${name}_U2 > .INB_P`} to={`net.${name}_VBIAS_RAW`} />
      <trace from={`.${name}_U2 > .OUTB`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U2 > .INB_N`} to={`net.${name}_VBIAS`} />

      {/* === U2 supply and decoupling === */}
      <trace from={`.${name}_U2 > .VCC`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_U2 > .GND`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_U2_DEC > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_U2_DEC > .pin2`} to={`net.${name}_GND`} />

      {/* === Test points === */}
      <trace from={`.${name}_TP_9V > .TP`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_TP_VBIAS > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
