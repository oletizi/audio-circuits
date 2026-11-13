/**
 * A BOARD'S ERC ALLOWANCES - the logic for its declared table, `<board-dir>/repair/tools/erc-allowances.ts`
 * (`ERC_ALLOWANCES`): the ERC errors a page's verification excuses, each under a ruling the entry names.
 * For the module the table holds the one allowance ruling CR-MODULE-VCAP-ERC admits.
 *
 * How narrow an allowance is. `./erc_sheets.py` (by `./erc_match.py`'s rule, which `./root_erc.py`
 * shares) excuses a violation only when ALL of these hold: it is on the entry's sheet path, it is of
 * the entry's violation type, and the items KiCad reports for it are exactly the entry's two
 * (designator, pin number) pairs, parsed from each item - never a match on free text, and never on
 * the type alone. Any other violation of that type, the same type on other pins, and the same pins on
 * another sheet all stay errors. One allowance excuses at most one violation: a second match fails the
 * run. An allowance that matches nothing in a run whose report holds its sheet is printed as STALE,
 * and the run still passes, so an allowance that has become unnecessary is visible.
 *
 * Held to the model on every run (`checkErcAllowances`): the sheet names a block of the board's
 * model; the designator is a component of that block; both pins are on the entry's net in the model
 * (so they are on the SAME net); and each pin carries, on the installed KiCad symbol, the pin type the
 * entry says causes the violation. An entry failing any of these is refused, naming what is missing.
 *
 * A PWR_FLAG PARTNER (h7 pedal pages plan, Task 9b). One of the two items may be the net's PWR_FLAG
 * rather than a part's pin: the allowance names it as designator `PWR_FLAG` (`FLAG_PARTNER`), pin
 * "1". KiCad reports a flag as `Symbol <ref> Pin 1 [Power output, ...]`, its reference `#PWR<n>` as
 * akcli writes it (a one-block root's stub flags) or `#FLG<n>` once `root_flag_refs.py` has renamed a
 * board root's flags; `erc_match.py` reads exactly those two forms as (`PWR_FLAG`, "1") and never
 * matches the number. The model
 * check then requires, for the partner, pin "1" and a declared flag home for the entry's net in the
 * board's `pwr-flag-homes.ts` (so a flag is on that net and nowhere else); the pin-type check holds
 * for the other item, the part's own pin. First needed for the h7 pedal's U12 ST, an open-drain
 * output the circuit ties to GND (ruling CR-PEDAL-LM66100-ST-ERC). `kicad-pro.ts` refuses such an
 * entry: a `.kicad_pro` exclusion keys the flag's uuid on the root, which no tool here reads yet.
 *
 * TEST OVERRIDE. When the environment variable `PAGES_ERC_ALLOWANCES_TABLE` names a JSON file, the
 * table is read from it instead, and that is said on stderr. It exists for a board's negative
 * controls (the module's `erc-control.sh`), so they can remove the allowance or name a wrong pin
 * without touching the table. The override is checked against the model exactly as the committed
 * table is.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/erc-allowances.ts` (H7 pedal plan Task 4);
 * the module's entry stayed there.
 *
 * usage: bun erc-allowances.ts <board-dir> <out.json>
 *   checks the board's table against its model and writes it as JSON, the form erc_sheets.py reads
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { boardFromArgs, type PageBoard } from "./board.ts"
import { libraryPin, pinConnection } from "./cross-page-drivers.ts"
import { FLAG_HOMES_FILE, flagHomes, type FlagHomes } from "./flag-homes.ts"
import { componentIdFor, exported, importTable, isRecord, overrideOr, parsedArray, requiredString } from "./table-input.ts"

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

export const ALLOWANCES_FILE = "erc-allowances.ts"
/** The designator an allowance gives an item that is the net's PWR_FLAG (see the module comment). */
export const FLAG_PARTNER = "PWR_FLAG"
const OVERRIDE_ENV = "PAGES_ERC_ALLOWANCES_TABLE"

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

/** The board's committed table, as declared; no override is read. */
export async function committedErcAllowances(board: PageBoard): Promise<readonly ErcAllowance[]> {
  const module = await importTable(board, ALLOWANCES_FILE, "the ERC errors a page's verification excuses, each under a ruling")
  return parsedArray(exported(module, "ERC_ALLOWANCES", board, ALLOWANCES_FILE), join(board.tablesDir, ALLOWANCES_FILE), parseAllowance)
}

/** The board's committed table, or the test override when `PAGES_ERC_ALLOWANCES_TABLE` is set (said on stderr). */
export async function ercAllowanceTable(board: PageBoard): Promise<readonly ErcAllowance[]> {
  return overrideOr(OVERRIDE_ENV, await committedErcAllowances(board), "erc-allowances.ts", "ERC_ALLOWANCES", parseAllowance)
}

function flagPartnerProblems(entry: ErcAllowance, p: AllowedPin, homes: FlagHomes): string[] {
  const problems: string[] = []
  if (p.pin !== "1") problems.push(`a ${FLAG_PARTNER} partner is the flag's pin 1, not pin ${p.pin}`)
  const declared = homes.shared[entry.net] !== undefined || Object.values(homes.privateFlags).some((nets) => nets.includes(entry.net))
  if (!declared) {
    problems.push(`net ${entry.net} has no declared PWR_FLAG home in ${FLAG_HOMES_FILE}, so no flag on it can be the ${FLAG_PARTNER} partner`)
  }
  return problems
}

function pinProblems(entry: ErcAllowance, p: AllowedPin, componentIds: readonly string[], board: PageBoard): string[] {
  const resolved = componentIdFor(board, p.designator)
  if ("problem" in resolved) return [resolved.problem]
  const id = resolved.id
  if (!componentIds.includes(id)) return [`${p.designator} (${id}) is not a component of the block whose sheet is ${entry.sheet}`]
  const component = board.network.components.find((c) => c.id === id)
  if (component === undefined) return [`${id} is in the block but not in ${board.modelName}'s components`]
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
    const type = libraryPin(board, libId, p.pin)?.type
    if (type !== entry.symbolPinType) {
      problems.push(`${libId} pin ${p.pin} is typed ${type ?? "nothing (no such pin)"} in its library, not ${entry.symbolPinType}, so the stated cause does not hold`)
    }
  }
  return problems
}

/**
 * Hold every allowance to the board's model, and a PWR_FLAG partner to the board's flag homes; throw,
 * naming each allowance and what is missing, if any fails.
 */
export function checkErcAllowances(table: readonly ErcAllowance[], board: PageBoard, homes: FlagHomes): void {
  const module = board.network
  const failures: string[] = []
  for (const entry of table) {
    const label = `${entry.ruling}: ${entry.type} on ${entry.sheet} between ${entry.pins.map((p) => `${p.designator} pin ${p.pin}`).join(" and ")}`
    const problems: string[] = []
    const block = /^\/([^/]+)\/$/.exec(entry.sheet)?.[1]
    const record = block === undefined ? undefined : module.blocks.find((b) => b.prefix === block)
    if (record === undefined) {
      problems.push(`sheet ${entry.sheet} is not /<block>/ for a block of ${board.modelName}; its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`)
    } else {
      const [a, b] = entry.pins
      if (a.designator === b.designator && a.pin === b.pin) problems.push("the two pins are the same pin")
      for (const p of entry.pins) {
        problems.push(...(p.designator === FLAG_PARTNER ? flagPartnerProblems(entry, p, homes) : pinProblems(entry, p, record.componentIds, board)))
      }
    }
    for (const problem of problems) failures.push(`${label}: ${problem}`)
  }
  if (failures.length > 0) {
    throw new Error(
      `erc-allowances.ts: ${failures.length} problem(s); an allowance is excused only while the model bears it out ` +
        `(both pins on its net in ${board.circuitRel}, with the stated symbol pin type), never on trust:\n  ` +
        failures.join("\n  "),
    )
  }
}

if (import.meta.main) {
  const { board, rest } = await boardFromArgs(process.argv.slice(2), "bun erc-allowances.ts <board-dir> <out.json>")
  const out = rest[0]
  if (out === undefined) throw new Error("usage: bun erc-allowances.ts <board-dir> <out.json> - the path to write the checked table to is required")
  const table = await ercAllowanceTable(board)
  checkErcAllowances(table, board, await flagHomes(board))
  writeFileSync(out, JSON.stringify(table, null, 1) + "\n")
  console.log(`erc-allowances.ts: ${table.length} allowance(s) checked against ${board.modelName}: ${table.map((e) => e.ruling).join(", ") || "none"}`)
}
