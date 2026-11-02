/**
 * Transistor preamp, staged board: a second gain stage with panel controls.
 *
 * The operator's buffered board (./buffered-board.ts) with a second
 * voltage-gain stage, Q3, between its collector-feedback stage (Q1) and its
 * emitter-follower output (Q2), and three front-panel controls:
 *
 *   DRIVE (RV5)             between Q1 and Q3: how hard Q3 is driven - the
 *                           amount of saturation
 *   CHARACTER (RV6)         in Q3's emitter bypass branch: the shape of the
 *                           onset - toward 0, early and gradual saturation at
 *                           high gain; toward 1k, cleaner for longer
 *   TRANSFORMER DRIVE (RV7) between Q3 and Q2: how hard Q2 and the output
 *                           transformer are driven
 *
 * THIS IS A DESIGN, NOT A TRANSCRIPTION. The authority for every part and
 * value below, and the decisions behind them, is
 * docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md.
 *
 * Q1 and Q2 are the buffered board's, built by the same shared functions; only
 * C3 now lands on DRIVE's top instead of Q2's base.
 *
 * STAGE 1 IS FIXED, NOT TRIMMED (docs/superpowers/specs/
 * 2026-11-02-staged-preamp-fixed-stage-one-design.md): its feedback,
 * base-to-ground and collector legs are single resistors at the values tuned by
 * hand on the buffered board, and its emitter is fully bypassed (C1 straight
 * to GND, no RV4). The buffered board's trims RV1-RV4 and floor resistors are
 * not on this board; R1-R3 are the fixed resistors, and RV1-RV4 are not reused.
 *
 * Q3 IS DIVIDER-BIASED WITH EMITTER DEGENERATION, so it saturates under the
 * operator's control and does not depend on the particular transistor: the
 * stiff 100k/15k divider sets its base, R11 alone carries its emitter DC
 * (about 1.9 mA), and its collector sits centred (about 13.4 V at 24 V). Its
 * gain is R10 over the unbypassed emitter resistance plus r_e - resistors and
 * a stable current, not beta. No matching.
 *
 * Each attenuator is cap - pot - cap, so no pot carries DC or moves a bias.
 * Every electrolytic's + terminal (pin a) faces the higher DC node. The
 * panel pots are off-board on 3-pin headers (./parts.ts panelPot).
 */
import { circuit } from "../../lib/model/index.ts"
import { resolveNetwork } from "../../lib/model/control-state.ts"
import type { ControlState } from "../../lib/model/control-state.ts"
import type { Network } from "../../lib/model/index.ts"
import { parseValue } from "../../lib/model/units.ts"
import { spiceNodeName, toSpiceOperatingPointNetlist } from "../../lib/sim/netlist.ts"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"
import type { PowerUpChecks, PowerUpChecksExport } from "../../tools/guide/power-up.ts"
import type { GuideNotesExport } from "../../tools/guide/guide-notes.ts"
import type { BomConditions, BomConditionsExport } from "../../tools/bom/conditions.ts"
import { addFollower, followerNotes } from "./buffered-board.ts"
import * as buffered from "./buffered-board.ts"
import { addFeedbackStage } from "./feedback-board.ts"
import type { StageOneLegs } from "./feedback-board.ts"
import { formatOhms, legPosition } from "./leg-values.ts"
import { HEADER_2, RESISTOR, electrolytic, panelPot, transistor2N3904 } from "./parts.ts"
import type { Leg } from "./parts.ts"
import { STAGED_BOARD_ENVIRONMENT } from "./staged-environment.ts"

export { PIN_NUMBERS } from "./parts.ts"
// Closes a cycle with staged-board.drawing.ts, which imports DESIGNATORS and
// transistorPreampStaged from this module. Safe because neither module reads
// the other's bindings at load time: this is a re-export, evaluated only when
// something calls drawingIntent(), not when either module is first loaded.
export { drawingIntent } from "./staged-board.drawing.ts"

const VCC = "VCC"
const GND = "GND"
const IN_EXT = "IN_EXT"

/** Stage 1's legs when they are single fixed resistors. */
type FixedStageOne = Extract<StageOneLegs, { readonly kind: "fixed" }>

/**
 * Stage 1's fixed legs: the values tuned by hand on the built buffered board,
 * as single E-series resistors. The owner chose 820k / 270k - "Let's use the
 * 820K/270K pair" - the pair nearest his in-circuit readings; 2.7k is the E24
 * value nearest the tuned 1k + 1.8k collector leg. The authority and the
 * simulated alternatives are in
 * docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md.
 */
export const STAGE_ONE: FixedStageOne = {
  kind: "fixed", feedback: "820k", baseToGround: "270k", collector: "2.7k",
}

/** CHARACTER's branch as a leg (floor R12 plus the panel pot), for legPosition.
 * Built explicitly below, because addLeg builds trim-pots, not panel pots. */
export const CHARACTER_LEG: Leg = {
  floor: { id: "character_floor", value: "22" },
  trimId: "character_pot", trim: "1k",
}

export function transistorPreampStaged(): Network {
  const builder = circuit()
  builder
    .connector("input_header", { "1": IN_EXT, "2": GND }, HEADER_2)
    .port("input", IN_EXT)
  addFeedbackStage(builder, "DRIVE_TOP", STAGE_ONE)

  builder
    // DRIVE: C3 (from stage 1) -> pot -> C6 -> Q3's base.
    .add(panelPot("drive_pot", "25k", GND, "DRIVE_WIPER", "DRIVE_TOP"))
    .capacitor("drive_coupling_cap", "22uF", { a: "Q3_BASE", b: "DRIVE_WIPER" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    // Q3: divider-biased common emitter.
    .resistor("q3_bias_upper", "100k", { a: VCC, b: "Q3_BASE" }, RESISTOR)
    .resistor("q3_bias_lower", "15k", { a: "Q3_BASE", b: GND }, RESISTOR)
    .resistor("q3_collector_resistor", "5.6k", { a: VCC, b: "Q3_COLLECTOR" }, RESISTOR)
    .resistor("q3_emitter_resistor", "1.2k", { a: "Q3_EMITTER", b: GND }, RESISTOR)
    .add(transistor2N3904("second_gain_transistor", "Q3_BASE", "Q3_COLLECTOR", "Q3_EMITTER"))
    // CHARACTER: the bypass branch beside R11 - C7, then the 22R floor, then the
    // panel pot as a rheostat (wiper strapped to cw, on the board).
    .capacitor("character_bypass_cap", "470uF", { a: "Q3_EMITTER", b: "CHARACTER_CAP" },
      electrolytic("CP_Radial_D10.0mm_P5.00mm"))
    .resistor("character_floor", "22", { a: "CHARACTER_CAP", b: "CHARACTER_FLOOR" }, RESISTOR)
    .add(panelPot("character_pot", "1k", "CHARACTER_FLOOR", GND, GND))
    // TRANSFORMER DRIVE: C8 -> pot -> C9 -> Q2's base.
    .capacitor("q3_output_cap", "10uF", { a: "Q3_COLLECTOR", b: "TRANSFORMER_DRIVE_TOP" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))
    .add(panelPot("transformer_drive_pot", "25k", GND, "TRANSFORMER_DRIVE_WIPER", "TRANSFORMER_DRIVE_TOP"))
    .capacitor("buffer_input_cap", "10uF", { a: "BUFFER_BASE", b: "TRANSFORMER_DRIVE_WIPER" },
      electrolytic("CP_Radial_D5.0mm_P2.00mm"))

  addFollower(builder)
  return builder.done()
}

/** The buffered board's stage-1 parts this board does not have: the trims and
 * their floor resistors, replaced by STAGE_ONE's fixed resistors. */
const TRIMMED_STAGE_ONE_IDS: readonly string[] = [
  "feedback_floor", "feedback_trim", "base_ground_floor", "base_ground_trim",
  "collector_floor", "collector_trim", "emitter_bypass_trim",
]

/** The buffered board's designators, minus its stage-1 trims and floors. */
function bufferedDesignatorsWithoutTrims(): Record<string, string> {
  const kept: Record<string, string> = {}
  for (const id of TRIMMED_STAGE_ONE_IDS) {
    if (buffered.DESIGNATORS[id] === undefined) {
      throw new Error(
        `staged-board.ts: TRIMMED_STAGE_ONE_IDS names "${id}", which buffered-board.ts's DESIGNATORS ` +
          "does not have; the list of removed stage-1 parts has drifted from the buffered board",
      )
    }
  }
  for (const [id, designator] of Object.entries(buffered.DESIGNATORS)) {
    if (!TRIMMED_STAGE_ONE_IDS.includes(id)) kept[id] = designator
  }
  return kept
}

/** Semantic id -> KiCad reference designator: the buffered board's without its
 * stage-1 trims and floors, then stage 1's fixed resistors (R1-R3, keeping the
 * leg numbering; RV1-RV4 are not reused), then Q3's. */
export const DESIGNATORS: Readonly<Record<string, string>> = {
  ...bufferedDesignatorsWithoutTrims(),
  feedback_resistor: "R1", base_ground_resistor: "R2", collector_resistor: "R3",
  second_gain_transistor: "Q3",
  q3_bias_upper: "R8", q3_bias_lower: "R9", q3_collector_resistor: "R10",
  q3_emitter_resistor: "R11", character_floor: "R12",
  drive_coupling_cap: "C6", character_bypass_cap: "C7", q3_output_cap: "C8", buffer_input_cap: "C9",
  drive_pot: "RV5", character_pot: "RV6", transformer_drive_pot: "RV7",
}

function designatorOf(id: string): string {
  const designator = DESIGNATORS[id]
  if (designator === undefined) throw new Error(`"${id}" has no designator in DESIGNATORS`)
  return designator
}

/** The panel controls, the board's only settings (stage 1 is fixed): DRIVE and
 * TRANSFORMER DRIVE as wiper positions (0 to 1) and CHARACTER as its branch's
 * total resistance (floor plus pot). */
export type StagedSetting = {
  readonly drive: number
  readonly character: string
  readonly transformerDrive: number
}

/** The panel controls mid-way. */
export const START: StagedSetting = { drive: 0.5, character: "272", transformerDrive: 0.5 }

function position(control: string, value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${control}: position ${value} is outside 0 to 1 (0 is fully down, 1 fully up)`)
  }
  return value
}

export function controlStateFor(setting: StagedSetting): ControlState {
  return {
    potPositions: {
      drive_pot: position("DRIVE", setting.drive),
      transformer_drive_pot: position("TRANSFORMER DRIVE", setting.transformerDrive),
      [CHARACTER_LEG.trimId]: legPosition(CHARACTER_LEG, parseValue(setting.character)),
    },
    switchPositions: {},
  }
}

/** Stage 1's fixed legs in plain terms, read from STAGE_ONE and DESIGNATORS. */
function stageOneLegs(): string {
  return (
    `${designatorOf("feedback_resistor")} ${STAGE_ONE.feedback} feedback, ` +
    `${designatorOf("base_ground_resistor")} ${STAGE_ONE.baseToGround} base to ground, ` +
    `${designatorOf("collector_resistor")} ${STAGE_ONE.collector} collector, emitter fully bypassed`
  )
}

/** Stage 1's fixed values, the follower's notes, then the three panel controls. */
export function schematicNotes(): readonly string[] {
  return [
    `STAGE 1 is fixed at the values tuned by hand on the buffered board: ${stageOneLegs()}.`,
    ...followerNotes(),
    "PANEL CONTROLS (off-board pots on headers):",
    "  DRIVE (RV5) sets how hard Q3 is driven - the amount of saturation.",
    "  CHARACTER (RV6) shapes it: toward 0, early and gradual; toward 1k, cleaner for longer.",
    "  TRANSFORMER DRIVE (RV7) sets how hard Q2 and the output transformer are driven.",
  ]
}

/**
 * The build guide's Build notes section, for this board only
 * (tools/guide/guide-notes.ts): this is the one board whose copperhead-drawn
 * sheet dropped the board-notes text block that `schematicNotes()` above
 * carries (now stage 1's fixed values, the follower's measurement notes and
 * the PANEL CONTROLS), so the guide is its only remaining
 * home - the owner's call, recorded in the design spec's Decisions table.
 * Returning `schematicNotes()` rather than a second copy keeps the text
 * derived from the model, with one source.
 */
export const guideNotes: GuideNotesExport = (): readonly string[] => schematicNotes()

/**
 * The parts-list derivation's operating conditions: the 24 V rail, stage 1's fixed
 * legs and the panel controls at START, with the AC source and load taken from the
 * same bench environment - minus its sweep, which an operating-point deck has no
 * use for.
 */
export const bomConditions: BomConditionsExport = (): BomConditions => {
  return {
    description: `Supply ${supplyVolts()} V; stage 1 fixed (${stageOneLegs()}); ` +
      `panel controls (${panelDesignators()}) at START.`,
    environment: {
      source: STAGED_BOARD_ENVIRONMENT.source,
      load: STAGED_BOARD_ENVIRONMENT.load,
      supplies: STAGED_BOARD_ENVIRONMENT.supplies,
      groundPort: STAGED_BOARD_ENVIRONMENT.groundPort,
    },
    controlState: controlStateFor(START),
  }
}

/** Rounded to two decimals: what a bench multimeter reads to. */
function roundedVolts(volts: number): number {
  return Math.round(volts * 100) / 100
}

/** The 24 V supply's declared voltage, read from the shared environment rather
 * than retyped, so a changed rail cannot drift out of step with this table. */
function supplyVolts(): number {
  const supply = STAGED_BOARD_ENVIRONMENT.supplies.find((s) => s.port === "vcc")
  if (supply === undefined) {
    throw new Error('powerUpChecks: the staged board\'s environment declares no supply for port "vcc"')
  }
  return supply.volts
}

function voltageAt(readings: Readonly<Record<string, number>>, node: string): number {
  const value = readings[spiceNodeName(node)]
  if (value === undefined) {
    throw new Error(
      `powerUpChecks: the operating-point simulation has no reading for node "${node}" ` +
        `(spice node "${spiceNodeName(node)}"); check the name against the circuit's nets.`,
    )
  }
  return roundedVolts(value)
}

/** A 0-1 wiper position, in plain terms: how far up its travel it's set. */
function percentOfTravel(position: number): string {
  return `${Math.round(position * 100)}%`
}

/** The three panel controls' designators, in panel order. */
function panelDesignators(): string {
  return ["drive_pot", "character_pot", "transformer_drive_pot"].map(designatorOf).join(", ")
}

/**
 * What state the board must be in for the power-up table's voltages to
 * hold: the supply, stage 1's fixed legs (no trims on this board) and the
 * three panel controls (RV5-RV7) at START. Every value is read from
 * `STAGE_ONE`, `START` and the shared environment rather than retyped, so a
 * changed value cannot drift out of step with this sentence.
 */
function powerUpConditions(): string {
  const panel =
    `${designatorOf("drive_pot")} DRIVE ${percentOfTravel(START.drive)}, ` +
    `${designatorOf("character_pot")} CHARACTER ${formatOhms(parseValue(START.character))}, ` +
    `${designatorOf("transformer_drive_pot")} TRANSFORMER DRIVE ${percentOfTravel(START.transformerDrive)}`
  return (
    `Supply ${supplyVolts()} V; stage 1 fixed (${stageOneLegs()}); ` +
    `panel controls at START (${panel}).`
  )
}

/**
 * The staged board's power-up checks: the 24 V supply, then each transistor's
 * bias points, then C5's transformer side (expected near 0 V, since the
 * coupling cap blocks DC). Computed by the same operating-point simulation
 * the staged board's tests run, at START; `conditions` states START in plain
 * terms once, rather than qualifying every row.
 */
export const powerUpChecks: PowerUpChecksExport = async (): Promise<PowerUpChecks> => {
  const resolved = resolveNetwork(transistorPreampStaged(), controlStateFor(START))
  const deck = toSpiceOperatingPointNetlist(resolved, STAGED_BOARD_ENVIRONMENT)
  const nodes = [
    "VCC", "BASE", "EMITTER", "COLLECTOR",
    "Q3_BASE", "Q3_EMITTER", "Q3_COLLECTOR",
    "BUFFER_BASE", "BUFFER_EMITTER", "OUT",
  ]
  const readings = await runOperatingPoint({ netlist: deck, nodes: nodes.map(spiceNodeName) })
  const at = (node: string): number => voltageAt(readings, node)

  return {
    conditions: powerUpConditions(),
    checks: [
      { label: `Supply (+${supplyVolts()}V at ${designatorOf("power_header")})`, node: "VCC", expectedVolts: supplyVolts() },
      { label: `${designatorOf("gain_transistor")} base`, node: "BASE", expectedVolts: at("BASE") },
      { label: `${designatorOf("gain_transistor")} emitter`, node: "EMITTER", expectedVolts: at("EMITTER") },
      { label: `${designatorOf("gain_transistor")} collector`, node: "COLLECTOR", expectedVolts: at("COLLECTOR") },
      { label: `${designatorOf("second_gain_transistor")} base`, node: "Q3_BASE", expectedVolts: at("Q3_BASE") },
      {
        label: `${designatorOf("second_gain_transistor")} emitter`, node: "Q3_EMITTER",
        expectedVolts: at("Q3_EMITTER"),
      },
      {
        label: `${designatorOf("second_gain_transistor")} collector`, node: "Q3_COLLECTOR",
        expectedVolts: at("Q3_COLLECTOR"),
      },
      { label: `${designatorOf("buffer_transistor")} base`, node: "BUFFER_BASE", expectedVolts: at("BUFFER_BASE") },
      {
        label: `${designatorOf("buffer_transistor")} emitter`, node: "BUFFER_EMITTER",
        expectedVolts: at("BUFFER_EMITTER"),
      },
      {
        label: `${designatorOf("buffer_output_cap")} transformer side`, node: "OUT",
        expectedVolts: at("OUT"),
      },
    ],
  }
}
