/**
 * Power-up checks: the nodes to measure on a freshly built board, with the
 * DC voltage the model expects at each.
 *
 * A circuit module MAY export
 *
 *   powerUpChecks(): Promise<readonly PowerUpCheck[]>
 *
 * beside its circuit function - async, because the expected voltages come
 * from the same operating-point simulation the board's tests use, and that
 * is async. The result is awaited, so a synchronous function returning a
 * plain array is accepted too (awaiting a non-Promise costs nothing); see
 * `PowerUpChecksExport`. The build guide renders each row with a blank for
 * the operator's reading. A module that exports nothing under that name
 * declares no checks, and the guide says so. A module that exports
 * something else under that name, or whose checks resolve to an empty list,
 * is refused naming it: a board that exports checks must declare at least
 * one.
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

/** The shape of a circuit module's `powerUpChecks` export. Async is the convention. */
export type PowerUpChecksExport = () => Promise<readonly PowerUpCheck[]> | readonly PowerUpCheck[]

function checkAt(value: unknown, index: number, where: string): PowerUpCheck {
  const problem = (what: string): Error =>
    new Error(
      `${where}: powerUpChecks()[${index}] ${what}. Each check must be ` +
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
 * The checks a circuit module declares: `undefined` when it exports no
 * `powerUpChecks`, the validated rows when it does. `where` names the
 * module in every refusal.
 */
export async function declaredPowerUpChecks(
  module: Readonly<Record<string, unknown>>,
  where: string,
): Promise<readonly PowerUpCheck[] | undefined> {
  const exported = module["powerUpChecks"]
  if (exported === undefined) return undefined
  if (typeof exported !== "function") {
    throw new Error(
      `${where}: exports "powerUpChecks" as a ${typeof exported}, not a function. Export ` +
        "`powerUpChecks(): Promise<readonly PowerUpCheck[]>` (tools/guide/power-up.ts), or remove it.",
    )
  }
  const rows: unknown = await exported()
  if (!Array.isArray(rows)) {
    throw new Error(`${where}: powerUpChecks() resolved to a ${typeof rows}, not an array of checks.`)
  }
  if (rows.length === 0) {
    throw new Error(
      `${where}: powerUpChecks() declared no checks. A board that exports powerUpChecks must ` +
        "declare at least one; remove the export if the board has none.",
    )
  }
  return rows.map((row, index) => checkAt(row, index, where))
}
