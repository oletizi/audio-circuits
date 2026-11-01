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
 * **THERE ARE TWO ARMS, AND A BOARD DECLARES EXACTLY ONE.** Both say what the rail is
 * and where every control sits; they differ only in where the per-resistor dissipation
 * figure `deriveNeeds` requires comes FROM.
 *
 *   - `environment` - the board is SIMULATED. A full operating-point environment, with
 *     a source and a load, and `resistorDissipation` solves for the voltage actually
 *     across each resistor. This is the stronger claim and the default.
 *   - `railBound` - the board's resistor rating follows from the RAIL, arithmetically:
 *     the worst case is the whole rail across a resistor, so `P <= V^2/R` with no
 *     source, no load and no SPICE model needed. Looser everywhere, and available only
 *     to a board that can state the bound and have it checked
 *     (tools/bom/rail-bound.ts).
 *
 * Declaring both is refused: two bases for one figure is an unanswered question about
 * which one binds, not a belt-and-braces.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md; the rail-bound arm is
 * docs/research/2026-10-30-rail-bound-power.md.
 */
import type { ControlState } from "../../lib/model/control-state.ts"
import type { LoadModel, OperatingPointEnvironment, SourceModel, SupplyModel } from "../../lib/sim/netlist.ts"
import { isRecord } from "../perfboard/guards.ts"
import type { RailBoundPower } from "./rail-bound.ts"

/** The arm whose resistor dissipation comes from a solved operating point. */
export interface SimulatedBomConditions {
  /** One line: rail and control settings, in plain words. */
  readonly description: string
  readonly environment: OperatingPointEnvironment
  readonly railBound?: undefined
  readonly controlState: ControlState
}

/** The arm whose resistor rating comes from a declared rail bound. It carries no
 * `environment`, so a board taking it never has to invent a source or a load. */
export interface RailBoundBomConditions {
  /** One line: rail and control settings, in plain words. */
  readonly description: string
  readonly environment?: undefined
  readonly railBound: RailBoundPower
  readonly controlState: ControlState
}

/** Discriminated on `railBound`: absent means the operating-point arm. */
export type BomConditions = SimulatedBomConditions | RailBoundBomConditions

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

function validateRailBound(value: unknown, where: string): RailBoundPower {
  const record = requireRecord(value, "railBound", where)
  const supplies = record["supplies"]
  if (!Array.isArray(supplies)) {
    throw new Error(`${where}: railBound.supplies is a ${typeof supplies}, not an array.`)
  }
  return {
    supplies: supplies.map((supply, index) => validateSupply(supply, index, where)),
    ratedWatts: requireFiniteNumber(record["ratedWatts"], "railBound.ratedWatts", where),
    basis: requireNonEmptyString(record["basis"], "railBound.basis", where),
  }
}

function validateBomConditions(value: unknown, where: string): BomConditions {
  const record = requireRecord(value, "bomConditions() result", where)
  const description = requireNonEmptyString(record["description"], "description", where)
  const controlState = validateControlState(record["controlState"], where)
  const hasEnvironment = record["environment"] !== undefined
  const hasRailBound = record["railBound"] !== undefined
  if (hasEnvironment && hasRailBound) {
    throw new Error(
      `${where}: bomConditions() declares BOTH "environment" and "railBound". Those are two ` +
        "different bases for one figure - the per-resistor dissipation deriveNeeds requires - and " +
        "nothing here decides which binds. Declare exactly one: \"environment\" to solve for it, " +
        "\"railBound\" to bound it by the rail (tools/bom/rail-bound.ts).",
    )
  }
  if (hasRailBound) {
    return { description, railBound: validateRailBound(record["railBound"], where), controlState }
  }
  if (!hasEnvironment) {
    throw new Error(
      `${where}: bomConditions() declares neither "environment" nor "railBound", so there is no ` +
        "basis for the per-resistor dissipation deriveNeeds requires. Declare \"environment\" (an " +
        "OperatingPointEnvironment, solved by tools/bom/dissipation.ts) or \"railBound\" (a rail " +
        "and a claimed rating, checked by tools/bom/rail-bound.ts).",
    )
  }
  return { description, environment: validateEnvironment(record["environment"], where), controlState }
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

/** The rails a board declares, from whichever arm declares them. Both arms carry
 * supplies, because both a simulated deck and a rail bound need to know the rail - and
 * so does every capacitor's voltage rating, whichever arm the board took. */
export function declaredSupplies(conditions: BomConditions): readonly SupplyModel[] {
  return conditions.railBound === undefined
    ? conditions.environment.supplies
    : conditions.railBound.supplies
}

/** The board's highest supply rail, in volts. Throws when the declared conditions have
 * no supplies at all - a capacitor's required voltage rating has nothing to be derived
 * from otherwise. Takes the magnitude of each rail, so a negative (bipolar) supply
 * counts by how far it sits from ground, not by its sign. */
export function highestRailVolts(conditions: BomConditions): number {
  const supplies = declaredSupplies(conditions)
  if (supplies.length === 0) {
    const arm = conditions.railBound === undefined ? "environment" : "railBound"
    throw new Error(
      `highestRailVolts: bomConditions().${arm} declares no supplies, so there is no rail to ` +
        "derive a capacitor voltage rating from.",
    )
  }
  return Math.max(...supplies.map((supply) => Math.abs(supply.volts)))
}
