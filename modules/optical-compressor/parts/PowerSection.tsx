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
  // TWO grids, because this part serves two electrically distant places.
  //
  // `g` is the supply-input block: connector, protection diode, reservoir.
  // `gb` is the VBIAS generator and the U2 package. U2's section A is the
  // sidechain amplifier, so the package and the divider that feeds its
  // section-B buffer belong beside the sidechain, not beside the reservoir
  // caps. Keeping them here purely because the code declares them here put
  // four of the drawing's longest connections on one part. The offset is
  // the measured consequence of that: 15 units down from the supply block,
  // level with the sidechain's input network.
  //
  // Grid size is 1, so a column/row number IS a schematic unit.
  const g = createGrid(schX, schY, 1)
  const gb = createGrid(schX, schY - 15, 1)

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
        {...g.at(-2, -0.5)}
      />
      <capacitor
        name={`${name}_C_BULK`}
        capacitance="47uF"
        footprint="1206"
        pcbX={pcbX - 14}
        pcbY={pcbY + 4}
        {...g.at(0, -0.5)}
      />
      <capacitor
        name={`${name}_C_HF`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX - 10}
        pcbY={pcbY + 4}
        {...g.at(2, -0.5)}
      />

      {/* --- Half-supply divider --- */}
      <resistor
        name={`${name}_R_BIAS1`}
        resistance="47k"
        footprint="0805"
        /* 270deg, not 90: this turns pin1 (9V_PROT) to the TOP and pin2
           (VBIAS_RAW) to the BOTTOM, so the divider reads supply-down and
           the midpoint sits level with R_BIAS2's, which lets the renderer
           wire it instead of emitting a second VBIAS_RAW label. */
        schRotation="270deg"
        pcbX={pcbX - 4}
        pcbY={pcbY - 4}
        {...gb.at(-5, -1.4)}
      />
      <resistor
        name={`${name}_R_BIAS2`}
        resistance="47k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 4}
        pcbY={pcbY + 4}
        {...gb.at(-3.4, -1.4)}
      />
      <capacitor
        name={`${name}_C_BIAS`}
        capacitance="47uF"
        footprint="1206"
        schRotation="90deg"
        pcbX={pcbX}
        pcbY={pcbY + 4}
        {...gb.at(-1.8, -1.4)}
      />
      <capacitor
        name={`${name}_C_BIAS_HF`}
        capacitance="100nF"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 3}
        pcbY={pcbY + 4}
        {...gb.at(-0.2, -1.4)}
      />

      {/* --- Control-side op-amp package (A: sidechain, B: VBIAS buffer) --- */}
      <TL072H
        name={`${name}_U2`}
        pcbX={pcbX + 10}
        pcbY={pcbY}
        {...gb.at(0.5, 2)}
      />
      <capacitor
        name={`${name}_C_U2_DEC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX + 10}
        pcbY={pcbY - 5}
        {...gb.at(2, -3.8)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_9V`}
        pcbX={pcbX - 8}
        pcbY={pcbY - 6}
        {...g.at(0, -2.5)}
      />
      <TestPoint
        name={`${name}_TP_VBIAS`}
        pcbX={pcbX + 16}
        pcbY={pcbY}
        {...gb.at(3, 0.5)}
      />
      <TestPoint
        name={`${name}_TP_GND`}
        pcbX={pcbX - 8}
        pcbY={pcbY + 8}
        {...g.at(-2, 1.5)}
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
