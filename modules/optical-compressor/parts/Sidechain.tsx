/**
 * Feedback sidechain for the optical compressor: level detector and LED
 * driver.
 *
 * INTERNAL PART - not exported from the module's index.ts.
 *
 * Chain:
 *   MAKEUP_OUT -> PEAK REDUCTION pot -> [U2.A x11] -> C_SC -> D_DET
 *     -> C_DET/R_REL -> R_B -> Q_LED(base)
 *   9V_PROT -> R_LED -> VACTROL.LED_A ... LED_K -> R_SENSE -> collector
 *   emitter -> R_E -> GND
 *
 * THREE REVISION-3 CORRECTIONS LIVE HERE. Do not "simplify" them away:
 *
 * 1. R_E (1k emitter degeneration) is NOT optional. Without it the LED
 *    sweep occupies ~0.15 V of detector voltage, giving ~1 dB of control
 *    range and a switch-like law. With it, ~6.8 dB and beta spread drops
 *    from ~3x to ~7%. Spec 6.1.2 / 8.7.1.
 * 2. C_DET is 4.7uF, not 10uF: degeneration raised the discharge
 *    impedance ~5x. Spec 8.6.1.
 * 3. R_PEAK_FAIL is a 1M wiper-to-VBIAS resistor. PEAK REDUCTION is a
 *    three-terminal DIVIDER - tying its wiper to an end terminal would
 *    short out the control. Spec 10.1.
 *
 * U2 is declared in PowerSection.tsx and VACTROL in AudioPath.tsx; both
 * are referenced here by name, which tscircuit resolves across part
 * boundaries within the same board.
 */

import { TestPoint } from "../../../lib/connectors/TestPoint.tsx"
import { createGrid } from "../../../lib/layout.ts"

export interface SidechainProps {
  name: string
  detectorCapacitance?: string
  releaseResistance?: string
  ledResistance?: string
  emitterResistance?: string
  sidechainGainResistance?: string
  sidechainBiasResistance?: string
  sidechainCouplingCap?: string
  schX?: number
  schY?: number
  pcbX?: number
  pcbY?: number
}

export const Sidechain = (props: SidechainProps) => {
  const {
    name,
    detectorCapacitance = "4.7uF",
    releaseResistance = "100k",
    ledResistance = "3.3k",
    emitterResistance = "1k",
    sidechainGainResistance = "100k",
    sidechainBiasResistance = "10k",
    sidechainCouplingCap = "1uF",
    schX = 0,
    schY = 0,
    pcbX = 0,
    pcbY = 0,
  } = props
  const g = createGrid(schX, schY, 2)

  return (
    <group>
      <net name={`${name}_PEAK_WIPER`} />
      <net name={`${name}_BASE`} />
      <net name={`${name}_COLL`} />
      <net name={`${name}_SC_INV`} />
      <net name={`${name}_SC_OUT`} />
      <net name={`${name}_DET`} />
      <net name={`${name}_LED_A`} />
      <net name={`${name}_LED_SENSE`} />
      <net name={`${name}_EMITTER`} />

      {/* --- PEAK REDUCTION interface ---
          The pot itself is external: its TOP connects to MAKEUP_OUT and its
          BOTTOM to VBIAS at the J_PEAK connector (see OpticalCompressor.tsx).
          Only the wiper enters this part. */}
      <resistor
        name={`${name}_R_PEAK_FAIL`}
        resistance="1M"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 24}
        pcbY={pcbY + 5}
        {...g.below(-4, 1)}
      />

      {/* --- Sidechain amplifier gain network (U2 section A) --- */}
      <resistor
        name={`${name}_R_SC_G`}
        resistance={sidechainBiasResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX - 14}
        pcbY={pcbY + 5}
        {...g.below(-3, 1)}
      />
      <resistor
        name={`${name}_R_SC_F`}
        resistance={sidechainGainResistance}
        footprint="0805"
        pcbX={pcbX - 14}
        pcbY={pcbY - 5}
        {...g.above(-3, 1)}
      />

      {/* --- Detector --- */}
      <capacitor
        name={`${name}_C_SC`}
        capacitance={sidechainCouplingCap}
        footprint="0805"
        pcbX={pcbX - 6}
        pcbY={pcbY}
        {...g.signal(-1)}
      />
      <diode
        name={`${name}_D_DET`}
        footprint="0805"
        manufacturerPartNumber="1N4148"
        pcbX={pcbX}
        pcbY={pcbY}
        {...g.signal(0)}
      />
      <capacitor
        name={`${name}_C_DET`}
        capacitance={detectorCapacitance}
        footprint="1206"
        schRotation="90deg"
        pcbX={pcbX + 4}
        pcbY={pcbY + 5}
        {...g.below(1, 1)}
      />
      <resistor
        name={`${name}_R_REL`}
        resistance={releaseResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 8}
        pcbY={pcbY + 5}
        {...g.below(2, 1)}
      />

      {/* --- LED driver --- */}
      <resistor
        name={`${name}_R_B`}
        resistance="10k"
        footprint="0805"
        pcbX={pcbX + 12}
        pcbY={pcbY}
        {...g.signal(3)}
      />
      <resistor
        name={`${name}_R_B_PD`}
        resistance="100k"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 16}
        pcbY={pcbY + 5}
        {...g.below(4, 1)}
      />
      {/* manufacturerPartNumber is NOT applied here: verified that
          tscircuit's <transistor> component accepts the prop (no schema
          error) but its doInitialSourceRender never forwards it to
          source_component, so it is silently dropped from circuit JSON.
          Q_LED is a 2N3904 per spec 8.x; recorded in DESIGN-NOTES.md as an
          open item rather than set here where it would have no effect. */}
      <transistor
        name={`${name}_Q_LED`}
        type="npn"
        footprint="sot23"
        pcbX={pcbX + 22}
        pcbY={pcbY}
        {...g.signal(5)}
      />
      {/* THE revision-3 fix. See the header comment. */}
      <resistor
        name={`${name}_R_E`}
        resistance={emitterResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY + 8}
        {...g.below(5, 2)}
      />
      <resistor
        name={`${name}_R_LED`}
        resistance={ledResistance}
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY - 10}
        {...g.above(5, 3)}
      />
      <resistor
        name={`${name}_R_SENSE`}
        resistance="10"
        footprint="0805"
        schRotation="90deg"
        pcbX={pcbX + 22}
        pcbY={pcbY - 4}
        {...g.above(5, 1)}
      />

      {/* --- Test points --- */}
      <TestPoint
        name={`${name}_TP_SC_OUT`}
        pcbX={pcbX - 10}
        pcbY={pcbY - 8}
        {...g.above(-2, 2)}
      />
      {/* Spec 8.6.2: pads left for probing the withdrawn precision-
          rectifier topology on the bench. */}
      <TestPoint
        name={`${name}_TP_SC_INV`}
        pcbX={pcbX - 14}
        pcbY={pcbY - 9}
        {...g.above(-3, 2)}
      />
      <TestPoint
        name={`${name}_TP_DET`}
        pcbX={pcbX + 4}
        pcbY={pcbY - 8}
        {...g.above(1, 2)}
      />
      <TestPoint
        name={`${name}_TP_SENSE_HI`}
        pcbX={pcbX + 27}
        pcbY={pcbY - 6}
        {...g.above(6, 2)}
      />
      <TestPoint
        name={`${name}_TP_SENSE_LO`}
        pcbX={pcbX + 27}
        pcbY={pcbY - 2}
        {...g.above(6, 1)}
      />
      <TestPoint
        name={`${name}_TP_VBIAS_SC`}
        pcbX={pcbX - 20}
        pcbY={pcbY + 12}
        {...g.below(-4, 3)}
      />
      <TestPoint
        name={`${name}_TP_GND_SC`}
        pcbX={pcbX + 12}
        pcbY={pcbY + 12}
        {...g.below(3, 3)}
      />

      {/* === Wiper -> sidechain amp + input, with 1M fail-safe to VBIAS === */}
      <trace
        from={`.${name}_R_PEAK_FAIL > .pin1`}
        to={`net.${name}_PEAK_WIPER`}
      />
      <trace from={`.${name}_R_PEAK_FAIL > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_U2 > .INA_P`} to={`net.${name}_PEAK_WIPER`} />

      {/* === U2 section A: non-inverting, gain 1 + 100k/10k ===
          SC_INV is the inverting summing node - R_SC_G, R_SC_F, the
          probe pad and U2.INA_N itself all land on one named net. */}
      <trace from={`.${name}_R_SC_G > .pin1`} to={`net.${name}_SC_INV`} />
      <trace from={`.${name}_R_SC_G > .pin2`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_R_SC_F > .pin1`} to={`net.${name}_SC_INV`} />
      <trace from={`.${name}_R_SC_F > .pin2`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_U2 > .OUTA`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_TP_SC_OUT > .TP`} to={`net.${name}_SC_OUT`} />
      <trace from={`.${name}_U2 > .INA_N`} to={`net.${name}_SC_INV`} />
      <trace from={`.${name}_TP_SC_INV > .TP`} to={`net.${name}_SC_INV`} />

      {/* === Detector: AC couple, half-wave rectify, store === */}
      <trace from={`.${name}_C_SC > .pin1`} to={`net.${name}_SC_OUT`} />
      {/* Two-terminal: drawn pin-to-pin so it renders as an actual wire.
          A named net here would put a label on both ends of a connection
          the reader can simply see. */}
      <trace from={`.${name}_C_SC > .pin2`} to={`.${name}_D_DET > .anode`} />
      <trace from={`.${name}_D_DET > .cathode`} to={`net.${name}_DET`} />
      <trace from={`.${name}_C_DET > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_C_DET > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_R_REL > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_R_REL > .pin2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_TP_DET > .TP`} to={`net.${name}_DET`} />

      {/* === Base drive ===
          MEASURED TRADE-OFF: this junction has three members. Wiring it
          pin-to-pin yields ONE auto-label naming every member
          (CMP_R_B_pin2/CMP_R_B_PD_pin1/CMP_Q_LED_pin3, ~43 chars) which
          is far wider than three short named labels and collided with the
          collector node's equivalent. Multi-terminal junctions keep a
          SHORT named net; two-terminal connections go pin-to-pin. */}
      <trace from={`.${name}_R_B > .pin1`} to={`net.${name}_DET`} />
      <trace from={`.${name}_R_B > .pin2`} to={`net.${name}_BASE`} />
      <trace from={`.${name}_R_B_PD > .pin1`} to={`net.${name}_BASE`} />
      <trace from={`.${name}_Q_LED > .base`} to={`net.${name}_BASE`} />
      <trace from={`.${name}_R_B_PD > .pin2`} to={`net.${name}_GND`} />

      {/* === Emitter degeneration (revision 3) === */}
      <trace from={`.${name}_Q_LED > .emitter`} to={`net.${name}_EMITTER`} />
      <trace from={`.${name}_R_E > .pin1`} to={`net.${name}_EMITTER`} />
      <trace from={`.${name}_R_E > .pin2`} to={`net.${name}_GND`} />

      {/* === LED chain: rail -> R_LED -> LED -> R_SENSE -> collector === */}
      <trace from={`.${name}_R_LED > .pin1`} to={`net.${name}_9V_PROT`} />
      <trace from={`.${name}_R_LED > .pin2`} to={`net.${name}_LED_A`} />
      <trace from={`.${name}_VACTROL > .LED_A`} to={`net.${name}_LED_A`} />
      <trace
        from={`.${name}_VACTROL > .LED_K`}
        to={`net.${name}_LED_SENSE`}
      />
      <trace from={`.${name}_R_SENSE > .pin1`} to={`net.${name}_LED_SENSE`} />
      {/* COLL is the driver collector node - R_SENSE, TP_SENSE_LO and
          Q_LED.collector itself all land on one named net. */}
      <trace from={`.${name}_R_SENSE > .pin2`} to={`net.${name}_COLL`} />
      <trace from={`.${name}_Q_LED > .collector`} to={`net.${name}_COLL`} />

      {/* === Sense test points, so LED current is measurable in circuit === */}
      <trace
        from={`.${name}_TP_SENSE_HI > .TP`}
        to={`net.${name}_LED_SENSE`}
      />
      <trace from={`.${name}_TP_SENSE_LO > .TP`} to={`net.${name}_COLL`} />

      {/* === Rail reference test points === */}
      <trace from={`.${name}_TP_VBIAS_SC > .TP`} to={`net.${name}_VBIAS`} />
      <trace from={`.${name}_TP_GND_SC > .TP`} to={`net.${name}_GND`} />
    </group>
  )
}
