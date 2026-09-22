/**
 * Audio path for the optical compressor: input buffer, optical attenuator,
 * makeup amplifier.
 *
 * INTERNAL PART - not exported from the module's index.ts.
 *
 * Signal flow:
 *   IN -> C_IN -> [U1.A unity buffer] -> R_SHUNT -+-> [U1.B makeup] -> C_OUT -> OUT
 *                                                  |
 *                                                 LDR
 *                                                  |
 *                                                VBIAS
 *
 * The gain-reduction node is DC-biased at VBIAS through R_SHUNT, so it has
 * a defined operating point however high the LDR's dark resistance runs.
 * There is deliberately NO coupling capacitor between the attenuator and
 * the makeup amplifier - both stages share the VBIAS operating point.
 * See spec 8.3.
 *
 * The vactrol is declared here because the LDR is the audio-critical
 * element; Sidechain.tsx drives its LED side by name.
 */

import { TL072H } from "../../../lib/chips/TL072H.tsx"
import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { Vactrol } from "../../../lib/opto/Vactrol.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface AudioPathProps {
  name: string
  /** Required: no default. See lib/opto/Vactrol.tsx. */
  vactrolFootprint: string
  shuntResistance?: string
  inputCap?: string
  outputCap?: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const AudioPath = (props: AudioPathProps) => {
  const {
    name,
    vactrolFootprint,
    shuntResistance = "22k",
    inputCap = "100nF",
    outputCap = "2.2uF",
    schX = 0,
    schY = 0,
    pcbX = 0,
    pcbY = 0,
  } = props
  // Grid size 1, so a column/row number IS a schematic unit. Row counts
  // DOWNWARD, which is how a reader scans a sheet.
  const g = createGrid(schX, schY, 1)

  return (
    <group>
      <net name={`${name}_IN`} />
      <net name={`${name}_IN_BUF`} />
      <net name={`${name}_BUF_OUT`} />
      <net name={`${name}_GR`} />
      <net name={`${name}_MAKEUP_OUT`} />
      <net name={`${name}_GAIN_FB`} />
      <net name={`${name}_OUT`} />

      {/* --- Input coupling and bias --- */}
      <capacitor
        name={`${name}_C_IN`}
        capacitance={inputCap}
        footprint="0805"
        pcbX={pcbX - 28}
        pcbY={pcbY}
        {...g.at(-9.5, -0.1)}
      />
      <resistor
        name={`${name}_R_IN_BIAS`}
        resistance="1M"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 24}
        pcbY={pcbY + 5}
        {...g.at(-8, 2)}
      />

      {/* --- Audio op-amp package (A: buffer, B: makeup) --- */}
      <TL072H
        name={`${name}_U1`}
        pcbX={pcbX - 14}
        pcbY={pcbY}
        {...g.at(-6, 0)}
      />
      <capacitor
        name={`${name}_C_U1_DEC`}
        capacitance="100nF"
        footprint="0805"
        pcbX={pcbX - 14}
        pcbY={pcbY - 6}
        {...g.at(-6, -2.5)}
      />

      {/* --- Optical attenuator --- */}
      <resistor
        name={`${name}_R_SHUNT`}
        resistance={shuntResistance}
        footprint="0805"
        pcbX={pcbX - 4}
        pcbY={pcbY}
        {...g.at(-3.2, -0.9)}
      />
      <Vactrol
        name={`${name}_VACTROL`}
        footprint={vactrolFootprint}
        pcbX={pcbX}
        pcbY={pcbY + 8}
        {...g.at(1.5, 4)}
      />

      {/* --- Makeup gain network --- */}
      <resistor
        name={`${name}_R_MAKEUP_G`}
        resistance="10k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 8}
        pcbY={pcbY + 5}
        {...g.at(-3, 3.5)}
      />

      {/* --- Output coupling --- */}
      <capacitor
        name={`${name}_C_OUT`}
        capacitance={outputCap}
        footprint="1206"
        pcbX={pcbX + 20}
        pcbY={pcbY}
        {...g.at(3, 0)}
      />
      <resistor
        name={`${name}_R_OUT_PD`}
        resistance="100k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 25}
        pcbY={pcbY + 5}
        {...g.at(5, 1.5)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_IN_BUF`}
        pcbX={pcbX - 10}
        pcbY={pcbY - 8}
        {...g.at(-8, -2)}
      />
      <TestPoint
        name={`${name}_TP_GR`}
        pcbX={pcbX + 2}
        pcbY={pcbY - 8}
        {...g.at(-1, -2)}
      />
      <TestPoint
        name={`${name}_TP_MAKEUP_OUT`}
        pcbX={pcbX + 16}
        pcbY={pcbY - 8}
        {...g.at(-2.8, 0.1)}
      />
      {/* Rail references, so bench probing and tests can confirm a node
          really lands on the buffered reference rather than a stub. */}
      <TestPoint
        name={`${name}_TP_VBIAS_CHK`}
        pcbX={pcbX + 2}
        pcbY={pcbY + 14}
        {...g.at(4, 3.5)}
      />
      <TestPoint
        name={`${name}_TP_GND_CHK`}
        pcbX={pcbX + 25}
        pcbY={pcbY + 10}
        {...g.at(7, 1.5)}
      />

      {/* === Input: IN -> C_IN -> IN_BUF (biased to VBIAS) === */}
      <trace from={`.${name}_C_IN > .pin1`} to={`net.${name}_IN`} />
      <trace from={`.${name}_C_IN > .pin2`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_R_IN_BIAS > .pin1`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_R_IN_BIAS > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U1 > .INA_P`} to={`net.${name}_IN_BUF`} />
      <trace from={`.${name}_TP_IN_BUF > .TP`} to={`net.${name}_IN_BUF`} />

      {/* === U1 section A: unity-gain buffer ===
          BUF_OUT is the buffer's output, its own unity-gain feedback node,
          and the attenuator's input - all three land on one named net. */}
      <trace from={`.${name}_U1 > .OUTA`} to={`net.${name}_BUF_OUT`} />
      <trace from={`.${name}_U1 > .INA_N`} to={`net.${name}_BUF_OUT`} />

      {/* === Attenuator: buffer -> R_SHUNT -> GR node, LDR shunts to VBIAS === */}
      <trace from={`.${name}_R_SHUNT > .pin1`} to={`net.${name}_BUF_OUT`} />
      <trace from={`.${name}_R_SHUNT > .pin2`} to={`net.${name}_GR`} />
      <trace from={`.${name}_VACTROL > .LDR_1`} to={`net.${name}_GR`} />
      <trace from={`.${name}_VACTROL > .LDR_2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GR > .TP`} to={`net.${name}_GR`} />

      {/* === U1 section B: non-inverting makeup amp, DC coupled to GR === */}
      <trace from={`.${name}_U1 > .INB_P`} to={`net.${name}_GR`} />
      <trace from={`.${name}_R_MAKEUP_G > .pin1`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_R_MAKEUP_G > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U1 > .INB_N`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_U1 > .OUTB`} to={`net.${name}_MAKEUP_OUT`} />
      <trace
        from={`.${name}_TP_MAKEUP_OUT > .TP`}
        to={`net.${name}_MAKEUP_OUT`}
      />

      {/* === Output coupling === */}
      <trace from={`.${name}_C_OUT > .pin1`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_C_OUT > .pin2`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_R_OUT_PD > .pin1`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_R_OUT_PD > .pin2`} to={`net.${name}_GND`} />

      {/* === U1 supply and decoupling === */}
      <trace from={`.${name}_U1 > .VCC`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_U1 > .GND`} to={`net.${name}_GND`} />
      <trace from={`.${name}_C_U1_DEC > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_C_U1_DEC > .pin2`} to={`net.${name}_GND`} />

      {/* === Rail reference test points === */}
      <trace from={`.${name}_TP_VBIAS_CHK > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND_CHK > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
