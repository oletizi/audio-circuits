/**
 * THE h7-module ERC ALLOWANCES - the one declared table of ERC errors a block page's verification
 * excuses, each under a controller ruling in `docs/h7-platform/decisions.md`. As it stands it holds
 * the one allowance ruling CR-MODULE-VCAP-ERC admits.
 *
 * Why it exists. The stock symbol `MCU_ST_STM32H7:STM32H743IITx` types VCAP1 (pin 81) and VCAP2
 * (pin 125) `power_out`, and the documented circuit joins them (processor-and-memory.md:136; CORE-04;
 * D7), so ERC reports `pin_to_pin`, "Pins of type Power output and Power output are connected", on
 * the mcu sheet. The error comes from the symbol's pin typing, not from the circuit.
 *
 * How narrow an allowance is. `./erc_sheets.py` (by `./erc_match.py`'s rule, which `./root_erc.py`
 * shares) excuses a violation only when ALL of these hold: it
 * is on the entry's sheet path, it is of the entry's violation type, and the items KiCad reports for
 * it are exactly the entry's two (designator, pin number) pairs, parsed from each item - never a match
 * on free text, and never on the type alone. Any other `pin_to_pin`, the same type on other pins, and
 * the same pins on another sheet all stay errors. One allowance excuses at most one violation: a
 * second match fails the run. An allowance that matches nothing in a run whose report holds its sheet
 * is printed as STALE, and the run still passes, so an allowance that has become unnecessary is visible.
 *
 * Held to the model on every run (`checkErcAllowances`): the sheet names a block of `h7Module()`; the
 * designator is a component of that block; both pins are on the entry's net in the model (so they
 * are on the SAME net); and each pin carries, on the installed KiCad symbol, the pin type the entry
 * says causes the violation. An entry failing any of these is refused, naming what is missing.
 *
 * TEST OVERRIDE. When the environment variable `H7_ERC_ALLOWANCES_TABLE` names a JSON file, the
 * table is read from it instead, and that is said on stderr. It exists for `./erc-control.sh`'s
 * negative controls, so they can remove the allowance or name a wrong pin without touching this file.
 * The override is checked against the model exactly as the committed table is.
 *
 * usage: bun erc-allowances.ts <out.json>
 *   checks the table against h7Module() and writes it as JSON, the form erc_sheets.py reads
 */
import { writeFileSync } from "node:fs"
import { h7Module } from "../../../../../circuits/h7-platform/module-board.ts"
import type { Network } from "../../../../../lib/model/index.ts"
import { libraryPin, pinConnection } from "./cross-page-drivers.ts"
import { componentIdFor, isRecord, overrideOr, requiredString } from "./table-input.ts"

export interface AllowedPin {
  /** The reference designator KiCad reports (`DESIGNATORS`). */
  readonly designator: string
  /** The symbol pin number KiCad reports; the model's pin key. */
  readonly pin: string
}

export interface ErcAllowance {
  /** The controller ruling that admits it. */
  readonly ruling: string
  /** The sheet path KiCad reports the violation on, `/<block>/`. */
  readonly sheet: string
  /** The KiCad ERC violation type. */
  readonly type: string
  /** Exactly the two items of the violation. */
  readonly pins: readonly [AllowedPin, AllowedPin]
  /** The net the model puts both pins on. */
  readonly net: string
  /** The type the installed symbol gives each pin, which is the violation's cause. */
  readonly symbolPinType: string
  /** Where the circuit and the ruling come from. */
  readonly source: string
}

export const ERC_ALLOWANCES: readonly ErcAllowance[] = [
  {
    ruling: "CR-MODULE-VCAP-ERC",
    sheet: "/mcu/",
    type: "pin_to_pin",
    pins: [
      { designator: "U1", pin: "81" },
      { designator: "U1", pin: "125" },
    ],
    net: "VCAP",
    symbolPinType: "power_out",
    source:
      "circuits/h7-platform/module/mcu.ts (SUPPLY_NETS VCAP: processor-and-memory.md:136, VCAP1 pin 81 joined to VCAP2 pin 125; CORE-04; D7); " +
      "MCU_ST_STM32H7:STM32H743IITx types both pins power_out; ruling CR-MODULE-VCAP-ERC in docs/h7-platform/decisions.md",
  },
]

const OVERRIDE_ENV = "H7_ERC_ALLOWANCES_TABLE"

function allowedPin(value: unknown, where: string): AllowedPin {
  if (!isRecord(value)) throw new Error(`${where}: not an object with "designator" and "pin"`)
  return { designator: requiredString(value, "designator", where), pin: requiredString(value, "pin", where) }
}

function parseAllowance(entry: Record<string, unknown>, where: string): ErcAllowance {
  const pins = entry["pins"]
  if (!Array.isArray(pins) || pins.length !== 2) {
    throw new Error(`${where}: "pins" must be an array of exactly two (designator, pin) objects; got ${JSON.stringify(pins)}`)
  }
  return {
    ruling: requiredString(entry, "ruling", where),
    sheet: requiredString(entry, "sheet", where),
    type: requiredString(entry, "type", where),
    pins: [allowedPin(pins[0], `${where}, pins[0]`), allowedPin(pins[1], `${where}, pins[1]`)],
    net: requiredString(entry, "net", where),
    symbolPinType: requiredString(entry, "symbolPinType", where),
    source: requiredString(entry, "source", where),
  }
}

/** The committed table, or the test override when `H7_ERC_ALLOWANCES_TABLE` is set (said on stderr). */
export function ercAllowanceTable(): readonly ErcAllowance[] {
  return overrideOr(OVERRIDE_ENV, ERC_ALLOWANCES, "erc-allowances.ts", "ERC_ALLOWANCES", parseAllowance)
}

function pinProblems(entry: ErcAllowance, p: AllowedPin, componentIds: readonly string[], module: Network): string[] {
  const resolved = componentIdFor(p.designator)
  if ("problem" in resolved) return [resolved.problem]
  const id = resolved.id
  if (!componentIds.includes(id)) return [`${p.designator} (${id}) is not a component of the block whose sheet is ${entry.sheet}`]
  const component = module.components.find((c) => c.id === id)
  if (component === undefined) return [`${id} is in the block but not in h7Module()'s components`]
  const problems: string[] = []
  const on = pinConnection(component, p.pin)
  if (on === undefined) {
    problems.push(`${p.designator} has no pin "${p.pin}" in the model`)
  } else if (on !== entry.net) {
    problems.push(`${p.designator} pin ${p.pin} is on ${on === null ? "no net (not connected)" : `net ${on}`} in the model, not on ${entry.net}`)
  }
  const libId = component.part?.symbol
  if (libId === undefined) {
    problems.push(`${p.designator} (${id}) names no KiCad symbol in the model, so its pin type cannot be checked`)
  } else {
    const type = libraryPin(libId, p.pin)?.type
    if (type !== entry.symbolPinType) {
      problems.push(`${libId} pin ${p.pin} is typed ${type ?? "nothing (no such pin)"} in its library, not ${entry.symbolPinType}, so the stated cause does not hold`)
    }
  }
  return problems
}

/** Hold every allowance to the model; throw, naming each allowance and what is missing, if any fails. */
export function checkErcAllowances(table: readonly ErcAllowance[], module: Network): void {
  const failures: string[] = []
  for (const entry of table) {
    const label = `${entry.ruling}: ${entry.type} on ${entry.sheet} between ${entry.pins.map((p) => `${p.designator} pin ${p.pin}`).join(" and ")}`
    const problems: string[] = []
    const block = /^\/([^/]+)\/$/.exec(entry.sheet)?.[1]
    const record = block === undefined ? undefined : module.blocks.find((b) => b.prefix === block)
    if (record === undefined) {
      problems.push(`sheet ${entry.sheet} is not /<block>/ for a block of h7Module(); its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`)
    } else {
      const [a, b] = entry.pins
      if (a.designator === b.designator && a.pin === b.pin) problems.push("the two pins are the same pin")
      for (const p of entry.pins) problems.push(...pinProblems(entry, p, record.componentIds, module))
    }
    for (const problem of problems) failures.push(`${label}: ${problem}`)
  }
  if (failures.length > 0) {
    throw new Error(
      `erc-allowances.ts: ${failures.length} problem(s); an allowance is excused only while the model bears it out ` +
        `(both pins on its net in circuits/h7-platform/module-board.ts, with the stated symbol pin type), never on trust:\n  ` +
        failures.join("\n  "),
    )
  }
}

if (import.meta.main) {
  const out = process.argv[2]
  if (out === undefined) throw new Error("usage: bun erc-allowances.ts <out.json> - the path to write the checked table to is required")
  const table = ercAllowanceTable()
  checkErcAllowances(table, h7Module())
  writeFileSync(out, JSON.stringify(table, null, 1) + "\n")
  console.log(`erc-allowances.ts: ${table.length} allowance(s) checked against h7Module(): ${table.map((e) => e.ruling).join(", ") || "none"}`)
}
