/**
 * Power-up checks: the nodes to measure on a freshly built board, with the
 * DC voltage the model expects at each.
 *
 * A circuit module MAY export
 *
 *   powerUpChecks(): Promise<PowerUpChecks>
 *
 * beside its circuit function - async, because the expected voltages come
 * from the same operating-point simulation the board's tests use, and that
 * is async. The result is awaited, so a synchronous function returning a
 * plain `PowerUpChecks` is accepted too (awaiting a non-Promise costs
 * nothing); see `PowerUpChecksExport`.
 *
 * EVERY EXPECTED VOLTAGE DEPENDS ON SOMETHING - the supply rail, an on-board
 * trim, a panel control, all of the above - so `PowerUpChecks.conditions` is
 * required and non-empty: one plain-language sentence (or a few) stating the
 * state the board must be in for the table's numbers to hold. The build
 * guide renders it as one line above the table, once, rather than repeating
 * it on every row; the wording is entirely the circuit module's, generic
 * from this file's and the guide's point of view.
 *
 * The build guide renders each check row with a blank for the operator's
 * reading. A module that exports nothing under the `powerUpChecks` name
 * declares no checks, and the guide says so. A module that exports
 * something else under that name, whose conditions are missing or blank, or
 * whose checks resolve to an empty list, is refused naming it: a board that
 * exports checks must state its conditions and declare at least one check.
 */
import { isRecord } from "../perfboard/guards.ts"

export interface PowerUpCheck {
  /** What is being measured, in the operator's words: "Q1 collector". */
  readonly label: string
  /** The net the probe goes on, as the circuit names it. */
  readonly node: string
  /** The model's DC operating-point voltage at that node, to ground. */
  readonly expectedVolts: number
}

/**
 * A board's power-up table: the state the board must be in for the
 * expected voltages to hold (`conditions`, plain language, required and
 * non-empty), then the checks themselves.
 */
export interface PowerUpChecks {
  readonly conditions: string
  readonly checks: readonly PowerUpCheck[]
}

/** The shape of a circuit module's `powerUpChecks` export. Async is the convention. */
export type PowerUpChecksExport = () => Promise<PowerUpChecks> | PowerUpChecks

function checkAt(value: unknown, index: number, where: string): PowerUpCheck {
  const problem = (what: string): Error =>
    new Error(
      `${where}: powerUpChecks().checks[${index}] ${what}. Each check must be ` +
        "{ label: string, node: string, expectedVolts: number }.",
    )
  if (!isRecord(value)) throw problem("is not an object")
  const { label, node, expectedVolts } = value
  if (typeof label !== "string" || label.trim() === "") throw problem("has no label")
  if (typeof node !== "string" || node.trim() === "") throw problem(`("${label}") has no node`)
  if (typeof expectedVolts !== "number" || !Number.isFinite(expectedVolts)) {
    throw problem(`("${label}") has no finite expectedVolts`)
  }
  return { label, node, expectedVolts }
}

/**
 * The power-up table a circuit module declares: `undefined` when it exports
 * no `powerUpChecks`, the validated conditions and rows when it does.
 * `where` names the module in every refusal.
 */
export async function declaredPowerUpChecks(
  module: Readonly<Record<string, unknown>>,
  where: string,
): Promise<PowerUpChecks | undefined> {
  const exported = module["powerUpChecks"]
  if (exported === undefined) return undefined
  if (typeof exported !== "function") {
    throw new Error(
      `${where}: exports "powerUpChecks" as a ${typeof exported}, not a function. Export ` +
        "`powerUpChecks(): Promise<PowerUpChecks>` (tools/guide/power-up.ts), or remove it.",
    )
  }
  const result: unknown = await exported()
  if (!isRecord(result)) {
    throw new Error(
      `${where}: powerUpChecks() resolved to a ${typeof result}, not { conditions, checks }.`,
    )
  }
  const { conditions, checks } = result
  if (typeof conditions !== "string" || conditions.trim() === "") {
    throw new Error(
      `${where}: powerUpChecks() declared no conditions. Every expected voltage depends on ` +
        "something (the supply, a trim, a panel control); state it in a non-empty " +
        "`conditions` string.",
    )
  }
  if (!Array.isArray(checks)) {
    throw new Error(`${where}: powerUpChecks().checks is a ${typeof checks}, not an array of checks.`)
  }
  if (checks.length === 0) {
    throw new Error(
      `${where}: powerUpChecks() declared no checks. A board that exports powerUpChecks must ` +
        "declare at least one; remove the export if the board has none.",
    )
  }
  return { conditions, checks: checks.map((row, index) => checkAt(row, index, where)) }
}
