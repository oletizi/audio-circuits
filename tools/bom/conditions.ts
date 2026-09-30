/**
 * A board's declared operating conditions: the rail(s) and control settings the
 * parts-list derivation runs the board at.
 *
 * A circuit module MAY export
 *
 *   bomConditions(): BomConditions
 *
 * beside its circuit function, mirroring `powerUpChecks` (tools/guide/power-up.ts):
 * `declaredBomConditions` reads and validates that export, naming the module in every
 * refusal rather than letting a malformed value reach the operating-point simulation or
 * the parts-list derivation downstream.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import type { ControlState } from "../../lib/model/control-state.ts"
import type { LoadModel, OperatingPointEnvironment, SourceModel, SupplyModel } from "../../lib/sim/netlist.ts"
import { isRecord } from "../perfboard/guards.ts"

export interface BomConditions {
  /** One line: rail and control settings, in plain words. */
  readonly description: string
  readonly environment: OperatingPointEnvironment
  readonly controlState: ControlState
}

/** The shape of a circuit module's `bomConditions` export. Sync or async: the result
 * is awaited either way, mirroring `PowerUpChecksExport`. */
export type BomConditionsExport = () => Promise<BomConditions> | BomConditions

function requireRecord(value: unknown, what: string, where: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${where}: ${what} is a ${typeof value}, not an object.`)
  }
  return value
}

function requireNonEmptyString(value: unknown, what: string, where: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: ${what} is missing or not a non-empty string.`)
  }
  return value
}

function requireFiniteNumber(value: unknown, what: string, where: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${where}: ${what} is missing or not a finite number.`)
  }
  return value
}

function validateSource(value: unknown, where: string): SourceModel {
  const record = requireRecord(value, "environment.source", where)
  return {
    port: requireNonEmptyString(record["port"], "environment.source.port", where),
    amplitude: requireFiniteNumber(record["amplitude"], "environment.source.amplitude", where),
    seriesOhms: requireFiniteNumber(record["seriesOhms"], "environment.source.seriesOhms", where),
  }
}

function validateLoad(value: unknown, where: string): LoadModel {
  const record = requireRecord(value, "environment.load", where)
  const load: LoadModel = {
    port: requireNonEmptyString(record["port"], "environment.load.port", where),
    ohms: requireFiniteNumber(record["ohms"], "environment.load.ohms", where),
  }
  if (record["farads"] === undefined) return load
  return { ...load, farads: requireFiniteNumber(record["farads"], "environment.load.farads", where) }
}

function validateSupply(value: unknown, index: number, where: string): SupplyModel {
  const record = requireRecord(value, `environment.supplies[${index}]`, where)
  return {
    port: requireNonEmptyString(record["port"], `environment.supplies[${index}].port`, where),
    volts: requireFiniteNumber(record["volts"], `environment.supplies[${index}].volts`, where),
  }
}

function validateEnvironment(value: unknown, where: string): OperatingPointEnvironment {
  const record = requireRecord(value, "environment", where)
  const supplies = record["supplies"]
  if (!Array.isArray(supplies)) {
    throw new Error(`${where}: environment.supplies is a ${typeof supplies}, not an array.`)
  }
  return {
    source: validateSource(record["source"], where),
    load: validateLoad(record["load"], where),
    supplies: supplies.map((supply, index) => validateSupply(supply, index, where)),
    groundPort: requireNonEmptyString(record["groundPort"], "environment.groundPort", where),
  }
}

function validatePotPositions(value: unknown, where: string): Readonly<Record<string, number>> {
  const record = requireRecord(value, "controlState.potPositions", where)
  const positions: Record<string, number> = {}
  for (const [id, position] of Object.entries(record)) {
    positions[id] = requireFiniteNumber(position, `controlState.potPositions["${id}"]`, where)
  }
  return positions
}

function validateSwitchPositions(value: unknown, where: string): Readonly<Record<string, string>> {
  const record = requireRecord(value, "controlState.switchPositions", where)
  const positions: Record<string, string> = {}
  for (const [id, position] of Object.entries(record)) {
    positions[id] = requireNonEmptyString(position, `controlState.switchPositions["${id}"]`, where)
  }
  return positions
}

function validateControlState(value: unknown, where: string): ControlState {
  const record = requireRecord(value, "controlState", where)
  return {
    potPositions: validatePotPositions(record["potPositions"], where),
    switchPositions: validateSwitchPositions(record["switchPositions"], where),
  }
}

function validateBomConditions(value: unknown, where: string): BomConditions {
  const record = requireRecord(value, "bomConditions() result", where)
  return {
    description: requireNonEmptyString(record["description"], "description", where),
    environment: validateEnvironment(record["environment"], where),
    controlState: validateControlState(record["controlState"], where),
  }
}

/**
 * The operating conditions a circuit module declares. `where` names the module in
 * every refusal: a missing export, an export that is not a function, or a result that
 * does not resolve to a well-formed `BomConditions`.
 */
export async function declaredBomConditions(
  module: Readonly<Record<string, unknown>>,
  where: string,
): Promise<BomConditions> {
  const exported = module["bomConditions"]
  if (exported === undefined) {
    throw new Error(
      `${where}: no "bomConditions" export. Export \`bomConditions(): BomConditions\` ` +
        "(tools/bom/conditions.ts).",
    )
  }
  if (typeof exported !== "function") {
    throw new Error(
      `${where}: exports "bomConditions" as a ${typeof exported}, not a function. Export ` +
        "`bomConditions(): BomConditions` (tools/bom/conditions.ts).",
    )
  }
  const result: unknown = await exported()
  return validateBomConditions(result, where)
}

/** The board's highest supply rail, in volts. Throws when the declared conditions have
 * no supplies at all - a capacitor's required voltage rating has nothing to be derived
 * from otherwise. Takes the magnitude of each rail, so a negative (bipolar) supply
 * counts by how far it sits from ground, not by its sign. */
export function highestRailVolts(conditions: BomConditions): number {
  const { supplies } = conditions.environment
  if (supplies.length === 0) {
    throw new Error(
      "highestRailVolts: bomConditions().environment declares no supplies, so there is no rail to " +
        "derive a capacitor voltage rating from.",
    )
  }
  return Math.max(...supplies.map((supply) => Math.abs(supply.volts)))
}
