/**
 * Loader and types for `module-interface.json`, the 40-pin module contract.
 *
 * The JSON is a byte-identical imported record and is never edited here. Its pin
 * fields are named exactly as `ContractPin` names them; only the fields a checker
 * needs are kept. Contract pin n sits on J_MOD_A pad n for n <= 20 and on
 * J_MOD_B pad n - 20 for n >= 21 (architecture.md section 4.2).
 *
 * Refusals: anything not a well-formed 40-pin contract throws, because a checker
 * run against a partial contract would pass boards it never compared.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

export interface ContractPin {
  readonly pin: number
  readonly category: string
  readonly signal: string | null
  readonly direction: string
  readonly failsafeRequired: boolean
}

export interface InterfaceContract {
  readonly status: "draft" | "frozen"
  readonly pins: readonly ContractPin[]
}

const CONTRACT_PATH = join(import.meta.dir, "module-interface.json")
const PIN_COUNT = 40

type Json = Readonly<Record<string, unknown>>

function isRecord(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function parsePin(raw: unknown, index: number): ContractPin {
  if (!isRecord(raw)) throw new Error(`contract pins[${index}] is not an object`)
  const { pin, category, signal, direction, failsafeRequired } = raw
  if (typeof pin !== "number" || !Number.isInteger(pin)) {
    throw new Error(`contract pins[${index}].pin is not an integer`)
  }
  if (typeof category !== "string") throw new Error(`contract pin ${pin}: category is not a string`)
  if (signal !== null && typeof signal !== "string") {
    throw new Error(`contract pin ${pin}: signal is neither a string nor null`)
  }
  if (typeof direction !== "string") throw new Error(`contract pin ${pin}: direction is not a string`)
  if (typeof failsafeRequired !== "boolean") {
    throw new Error(`contract pin ${pin}: failsafeRequired is not a boolean`)
  }
  return { pin, category, signal, direction, failsafeRequired }
}

/** Validates an already-parsed contract document. Exported so a test can feed it a bad one. */
export function parseContract(raw: unknown): InterfaceContract {
  if (!isRecord(raw)) throw new Error("contract is not a JSON object")
  const { status, pins } = raw
  if (status !== "draft" && status !== "frozen") {
    throw new Error(`contract status must be "draft" or "frozen", found ${JSON.stringify(status)}`)
  }
  if (!Array.isArray(pins)) throw new Error("contract has no pins array")
  if (pins.length !== PIN_COUNT) {
    throw new Error(`contract must have exactly ${PIN_COUNT} pins, found ${pins.length}`)
  }
  const parsed = pins.map(parsePin)
  const seen = new Set<number>()
  for (const p of parsed) {
    if (p.pin < 1 || p.pin > PIN_COUNT) throw new Error(`contract pin number ${p.pin} is outside 1..${PIN_COUNT}`)
    if (seen.has(p.pin)) throw new Error(`contract pin number ${p.pin} is repeated`)
    seen.add(p.pin)
  }
  return { status, pins: parsed }
}

export function loadContract(): InterfaceContract {
  return parseContract(JSON.parse(readFileSync(CONTRACT_PATH, "utf8")))
}

export function socketPadFor(pin: number): { part: "J_MOD_A" | "J_MOD_B"; pad: number } {
  if (!Number.isInteger(pin) || pin < 1 || pin > PIN_COUNT) {
    throw new Error(`contract pin ${pin} is outside 1..${PIN_COUNT}; no socket pad exists for it`)
  }
  return pin <= 20 ? { part: "J_MOD_A", pad: pin } : { part: "J_MOD_B", pad: pin - 20 }
}
