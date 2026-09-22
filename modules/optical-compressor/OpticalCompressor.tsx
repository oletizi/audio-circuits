/**
 * +9 V LA-2A-inspired optical compressor module.
 *
 * Solid-state feedback optical compressor with two controls, PEAK
 * REDUCTION and GAIN. Borrows the LA-2A's operating model, not its
 * circuit: no tubes, transformers, EL panel or T4 cell, and no claim of
 * equivalence.
 *
 * WHAT A SUCCESSFUL RENDER DOES NOT PROVE: tscircuit cannot simulate
 * optical coupling, so compression behaviour, attack, release and the
 * control law are NOT validated here. They must be measured. See
 * DESIGN-NOTES.md and the design spec, section 12.2.
 *
 * Composed from three internal parts. They are deliberately not exported
 * - see the spec, section 11.1, for the distinction between splitting
 * files and extracting modules.
 */

import { ScrewTerminal2, PotTerminal } from "../../lib/connectors/index"
import { AudioPath } from "./parts/AudioPath.tsx"
import { PowerSection } from "./parts/PowerSection.tsx"
import { Sidechain } from "./parts/Sidechain.tsx"

export interface OpticalCompressorProps {
  name: string
  /** Required: no default. Verify pin-to-pad mapping against the datasheet. */
  vactrolFootprint: string
  shuntResistance?: string
  sidechainGainResistance?: string
  sidechainBiasResistance?: string
  detectorCapacitance?: string
  releaseResistance?: string
  ledResistance?: string
  emitterResistance?: string
  inputCap?: string
  outputCap?: string
  sidechainCouplingCap?: string
  pcbX?: number
  pcbY?: number
  schX?: number
  schY?: number
}

export const OpticalCompressor = (props: OpticalCompressorProps) => {
  const {
    name,
    vactrolFootprint,
    shuntResistance,
    sidechainGainResistance,
    sidechainBiasResistance,
    detectorCapacitance,
    releaseResistance,
    ledResistance,
    emitterResistance,
    inputCap,
    outputCap,
    sidechainCouplingCap,
    pcbX = 0,
    pcbY = 0,
    schX = 0,
    schY = 0,
  } = props

  return (
    <group>
      {/* Three bands: supply above the audio row, sidechain below it.
          The bands are the CODE's structure, not the circuit's - see
          PowerSection, whose VBIAS/U2 block sits in the sidechain region
          because that is where U2's section A is used. Connectors are
          likewise placed by what they connect to, not by sheet edge: the
          two pots sit against the makeup stage they wrap around. */}
      <PowerSection
        name={name}
        schX={schX - 8}
        schY={schY + 9}
        pcbX={pcbX - 10}
        pcbY={pcbY - 25}
      />
      <AudioPath
        name={name}
        vactrolFootprint={vactrolFootprint}
        shuntResistance={shuntResistance}
        inputCap={inputCap}
        outputCap={outputCap}
        schX={schX}
        schY={schY}
        pcbX={pcbX}
        pcbY={pcbY}
      />
      <Sidechain
        name={name}
        detectorCapacitance={detectorCapacitance}
        releaseResistance={releaseResistance}
        ledResistance={ledResistance}
        emitterResistance={emitterResistance}
        sidechainGainResistance={sidechainGainResistance}
        sidechainBiasResistance={sidechainBiasResistance}
        sidechainCouplingCap={sidechainCouplingCap}
        schX={schX - 4}
        schY={schY - 8}
        pcbX={pcbX - 5}
        pcbY={pcbY + 25}
      />

      {/* === External connectors === */}
      <ScrewTerminal2
        name={`${name}_J_IN`}
        schX={schX - 11.6}
        schY={schY}
        pcbX={pcbX - 45}
        pcbY={pcbY}
      />
      <ScrewTerminal2
        name={`${name}_J_OUT`}
        schX={schX + 7.5}
        schY={schY}
        pcbX={pcbX + 45}
        pcbY={pcbY}
      />
      <ScrewTerminal2
        name={`${name}_J_PWR`}
        schX={schX - 13}
        schY={schY + 9.5}
        pcbX={pcbX - 45}
        pcbY={pcbY - 25}
      />
      <PotTerminal
        name={`${name}_J_PEAK`}
        schX={schX - 10.5}
        schY={schY - 2.5}
        pcbX={pcbX - 45}
        pcbY={pcbY + 25}
      />
      <PotTerminal
        name={`${name}_J_GAIN`}
        schX={schX - 1}
        schY={schY - 2}
        pcbX={pcbX + 45}
        pcbY={pcbY + 25}
      />

      {/* === Audio I/O === */}
      <trace from={`.${name}_J_IN > .P1`} to={`net.${name}_IN`} />
      <trace from={`.${name}_J_IN > .P2`} to={`net.${name}_GND`} />
      <trace from={`.${name}_J_OUT > .P1`} to={`net.${name}_OUT`} />
      <trace from={`.${name}_J_OUT > .P2`} to={`net.${name}_GND`} />

      {/* === Power in === */}
      <trace from={`.${name}_J_PWR > .P1`} to={`net.${name}_9V_RAW`} />
      <trace from={`.${name}_J_PWR > .P2`} to={`net.${name}_GND`} />

      {/* === PEAK REDUCTION: a three-terminal DIVIDER ===
          TOP from the makeup output, BOTTOM to VBIAS, WIPER to the
          sidechain amp. The wiper is NOT tied to either end - doing so
          would short out part of the divider. Spec 10.1. */}
      <trace from={`.${name}_J_PEAK > .TOP`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_J_PEAK > .WIPER`} to={`net.${name}_PEAK_WIPER`} />
      <trace from={`.${name}_J_PEAK > .BOTTOM`} to={`net.${name}_VBIAS`} />

      {/* === GAIN: a RHEOSTAT in the makeup feedback path ===
          Wiper tied to an end terminal so intermittent contact gives a
          bounded resistance rather than an open feedback loop. Spec 10.1. */}
      <trace from={`.${name}_J_GAIN > .TOP`} to={`net.${name}_MAKEUP_OUT`} />
      <trace from={`.${name}_J_GAIN > .WIPER`} to={`net.${name}_GAIN_FB`} />
      <trace from={`.${name}_J_GAIN > .BOTTOM`} to={`net.${name}_GAIN_FB`} />
    </group>
  )
}
