/**
 * Transistor preamp, collector-feedback board: the radically simplified build.
 *
 * One common-emitter 2N3904 stage biased by collector feedback, the brief's
 * Build 2B (docs/transistor-preamp/microphone-preamp-feedback-lab.md), with a
 * trim-pot on every value the bench tunes and nothing else: no jumpers, no
 * test points, no divider. It exists because the lab board's 32 parts made
 * stripboard placement confusing; this one has 16.
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. It is the lab board
 * (./lab-board.ts, spec docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md)
 * cut down to its collector-feedback legs, with the same parts, ranges and
 * rheostat wiring (./parts.ts). Values are bench starting points.
 *
 * TAKING A LEG OUT. There are no jumpers, so a leg is taken out by removing
 * its fixed resistor. The brief's other 2B variant - about 1.3M collector to
 * base and no base-to-ground resistor - is the feedback trim turned to about
 * 1.3M and the base-to-ground floor resistor (R2) lifted; socket R2 if that
 * swap will be frequent.
 *
 * THE EMITTER. One fixed 1.5k carries all the DC, so the bias never depends
 * on a pot. Beside it, the 220uF bypass cap in series with a 1k trim: at audio
 * frequencies the unbypassed resistance is roughly 1.5k || R_trim, from fully
 * bypassed (trim at 0) to about 600R (trim at 1k). Fully unbypassed means
 * pulling the cap.
 *
 * CAPACITORS ARE PLACEHOLDERS until the bench confirms them. Each
 * electrolytic's + terminal is pin a (pin 1 on Device:C_Polarized) and faces
 * the higher DC node: BASE for the input cap, COLLECTOR for the output cap,
 * EMITTER for the bypass cap, VCC for the decoupling cap. The 100uF supply
 * decoupling cap is not in the brief; it is a design choice.
 */
import { circuit } from "../../lib/model/index.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import type { Builder, Network } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"
import { formatOhms, legPosition, trimOnlyOhms } from "./leg-values.ts"
import { HEADER_2, RESISTOR, addLeg, electrolytic, transistor2N3904, trim } from "./parts.ts"
import type { Leg } from "./parts.ts"

export { PIN_NUMBERS } from "./parts.ts"

export type FeedbackLegName = "feedback" | "baseToGround" | "collector" | "emitterBypass"

export const FEEDBACK_LEGS: Readonly<Record<FeedbackLegName, Leg>> = {
  feedback: {
    floor: { id: "feedback_floor", value: "470k" },
    trimId: "feedback_trim", trim: "1M",
  },
  baseToGround: {
    floor: { id: "base_ground_floor", value: "47k" },
    trimId: "base_ground_trim", trim: "200k",
  },
  collector: {
    floor: { id: "collector_floor", value: "1k" },
    trimId: "collector_trim", trim: "2k",
  },
  emitterBypass: {
    trimId: "emitter_bypass_trim", trim: "1k",
  },
}

const LEG_NAMES: readonly FeedbackLegName[] = ["feedback", "baseToGround", "collector", "emitterBypass"]

const VCC = "VCC"
const GND = "GND"
const IN_EXT = "IN_EXT"
const BASE = "BASE"
const EMITTER = "EMITTER"
const COLLECTOR = "COLLECTOR"
const OUT = "OUT"

export function transistorPreampFeedback(): Network {
  const builder = circuit()
  builder
    .connector("input_header", { "1": IN_EXT, "2": GND }, HEADER_2)
    .port("input", IN_EXT)
  addFeedbackStage(builder, OUT)
  builder
    .connector("output_header", { "1": OUT, "2": GND }, HEADER_2)
    .port("output", OUT)
  return builder.done()
}

/**
 * The collector-feedback gain stage, everything up to and including its output
 * coupling cap, whose far side lands on `couplesTo`: the output header here,
 * the follower's base on the buffered board (./buffered-board.ts). Also the
 * supply decoupling, the power header, and the supply and stage-node ports.
 * Its input coupling cap C2 takes the signal from net IN_EXT; the input header
 * and "input" port are each board's own, because the loop board puts a
 * resistor between them and IN_EXT. Shared so every later board's stage 1 is
 * this one, part for part and id for id, rather than a copy that could drift.
 */
export function addFeedbackStage(builder: Builder, couplesTo: string): void {
  addLeg(builder, FEEDBACK_LEGS.feedback, "FEEDBACK", COLLECTOR, BASE)
  addLeg(builder, FEEDBACK_LEGS.baseToGround, "BASE_GROUND", BASE, GND)
  addLeg(builder, FEEDBACK_LEGS.collector, "COLLECTOR_LOAD", VCC, COLLECTOR)

  builder.resistor("emitter_dc_resistor", "1.5k", { a: EMITTER, b: GND }, RESISTOR)
  builder.capacitor("emitter_bypass_cap", "220uF", { a: EMITTER, b: "BYPASS_CAP" },
    electrolytic("CP_Radial_D8.0mm_P3.50mm"))
  const bypass = FEEDBACK_LEGS.emitterBypass
  builder.add(trim(bypass.trimId, bypass.trim, "BYPASS_CAP", GND))

  builder
    .add(transistor2N3904("gain_transistor", BASE, COLLECTOR, EMITTER))
    .capacitor("input_coupling_cap", "10uF", { a: BASE, b: IN_EXT },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("output_coupling_cap", "10uF", { a: COLLECTOR, b: couplesTo },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .capacitor("supply_decoupling_cap", "100uF", { a: VCC, b: GND },
      electrolytic("CP_Radial_D6.3mm_P2.50mm"))
    .connector("power_header", { "1": VCC, "2": GND }, HEADER_2)
    .port("vcc", VCC)
    .port("ground", GND)
    .port("base", BASE)
    .port("emitter", EMITTER)
    .port("collector", COLLECTOR)
}

/** Semantic id -> KiCad reference designator. The only place the two vocabularies meet.
 * Numbered leg by leg, so each leg's fixed resistor and trim share a number. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  feedback_floor: "R1", feedback_trim: "RV1",
  base_ground_floor: "R2", base_ground_trim: "RV2",
  collector_floor: "R3", collector_trim: "RV3",
  emitter_dc_resistor: "R4",
  emitter_bypass_cap: "C1", emitter_bypass_trim: "RV4",
  input_coupling_cap: "C2", output_coupling_cap: "C3", supply_decoupling_cap: "C4",
  gain_transistor: "Q1",
  input_header: "J1", output_header: "J2", power_header: "J3",
}

/** Each leg's total resistance (floor + trim) as a value string. */
export type FeedbackSetting = Readonly<Record<FeedbackLegName, string>>

/** Where to start dialling: the brief's first 2B trial (470k collector-to-base,
 * 150k base-to-ground), the nominal 1.8k collector load, emitter fully bypassed. */
export const START: FeedbackSetting = {
  feedback: "470k", baseToGround: "150k", collector: "1.8k", emitterBypass: "0",
}

export function controlStateFor(setting: FeedbackSetting): ControlState {
  const potPositions: Record<string, number> = {}
  for (const name of LEG_NAMES) {
    const leg = FEEDBACK_LEGS[name]
    potPositions[leg.trimId] = legPosition(leg, parseValue(setting[name]))
  }
  return { potPositions, switchPositions: {} }
}

function designatorOf(id: string): string {
  const designator = DESIGNATORS[id]
  if (designator === undefined) throw new Error(`"${id}" has no designator in DESIGNATORS`)
  return designator
}

/** The starting-settings text carried on the generated schematic stub. */
export function schematicNotes(): readonly string[] {
  const trims = LEG_NAMES.map((name) => {
    const leg = FEEDBACK_LEGS[name]
    const value = START[name]
    const trimOhms = formatOhms(trimOnlyOhms(leg, parseValue(value)))
    return `${designatorOf(leg.trimId)} leg ${value} (trim ${trimOhms})`
  })
  return [
    "STARTING SETTINGS (circuits/transistor-preamp/feedback-board.ts)",
    "Each leg's total resistance and, in parens, what to dial the pot itself to " +
      "(the leg total minus its fixed floor resistor, where it has one).",
    `  ${trims.join("  ")}`,
    "Other 2B variant: RV1 leg about 1.3M and lift R2 (no base-to-ground leg).",
    "Fully unbypassed emitter: pull C1.",
  ]
}
