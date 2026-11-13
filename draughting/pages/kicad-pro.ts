/**
 * A BOARD ROOT'S `.kicad_pro`, written from the board's declared ERC allowances (its
 * `erc-allowances.ts`; the module's ruling CR-MODULE-VCAP-ERC) and nothing else: one `erc_exclusions`
 * entry per allowance, and no other setting, so KiCad's defaults apply everywhere else. The project
 * file is committed beside the root (the module's Task 5 controller ruling: the module's root carries
 * one, as the carrier page does), and it is what makes kicad-cli read the directory's
 * `sym-lib-table` (measured on the module's sdram page, `drafted/h7-platform/h7-module/RECORD.md`).
 *
 * HOW KICAD KEYS AN EXCLUSION, which this writes and `./root_erc.py` checks. An entry is
 * `[<serialised marker>, <comment>]`, the marker being
 *   `<type>|<x>|<y>|<main item uuid>|<aux item uuid>|<sheet path>|<main item sheet path>|<aux item sheet path>`
 * with x, y in KiCad schematic units (10 000 per mm) at the main item, and each sheet path
 * `/<root uuid>/<sheet uuid>`. That form is the one the pedals repository's v1 `h7-platform.kicad_pro`
 * carries for the same VCAP violation. MEASURED with kicad-cli 10.0.5 on the module's assembled root:
 * an entry built this way, main item U1 pin 81, is honoured (`kicad-cli sch erc` reports the violation
 * with `"excluded": true` and no longer as an error); the same entry with the two pins swapped, or
 * with x one unit off, is not, and KiCad then reports the real violation as an error AND the
 * unmatched exclusion as a separate excluded marker. So the order is the allowance's own (the main
 * pin first, as KiCad lists the items), and the position is the main pin's point.
 *
 * Every value comes from a committed file, never from an ERC run: the root and sheet uuids from the
 * root sheet, the pin uuids from the block sheet's placed symbol, and the main pin's point from
 * `<board-dir>/repair/<block>/pins.json` (mil; 254 schematic units per mil). The allowances are held
 * to the model first (`checkErcAllowances`), exactly as `verify.sh` holds them.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/` (H7 pedal plan Task 4).
 *
 * usage: bun kicad-pro.ts <board-dir> <project-dir>    (from the repository root; writes the JSON to stdout)
 *   <project-dir> holds the root and block sheets (the board directory itself, or a replay's work directory)
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { child, children, parseSexpr, type SNode } from "../../lib/kicad/sexpr.ts"
import { boardFromArgs, type PageBoard } from "./board.ts"
import { checkErcAllowances, ercAllowanceTable, FLAG_PARTNER, type ErcAllowance } from "./erc-allowances.ts"
import { flagHomes } from "./flag-homes.ts"

const UNITS_PER_MIL = 254

function property(node: SNode, name: string): string | undefined {
  return children(node, "property").find((p) => p.atoms[0] === name)?.atoms[1]
}

function uuidOf(node: SNode, where: string): string {
  const uuid = child(node, "uuid")?.atoms[0]
  if (uuid === undefined) throw new Error(`kicad-pro.ts: ${where} has no (uuid ...)`)
  return uuid
}

function sheetPath(rootFile: string, block: string): string {
  const root = parseSexpr(readFileSync(rootFile, "utf8"))
  const sheets = children(root, "sheet").filter((s) => property(s, "Sheetname") === block)
  const sheet = sheets[0]
  if (sheet === undefined || sheets.length !== 1) {
    throw new Error(`kicad-pro.ts: ${rootFile} holds ${sheets.length} sheet(s) named "${block}"; expected exactly one, since the allowance is on /${block}/`)
  }
  return `/${uuidOf(root, rootFile)}/${uuidOf(sheet, `the root's sheet "${block}"`)}`
}

function pinUuid(sheetFile: string, designator: string, pin: string): string {
  const sheet = parseSexpr(readFileSync(sheetFile, "utf8"))
  const symbols = children(sheet, "symbol").filter((s) => child(s, "lib_id") !== undefined && property(s, "Reference") === designator)
  const symbol = symbols[0]
  if (symbol === undefined || symbols.length !== 1) {
    throw new Error(`kicad-pro.ts: ${sheetFile} places ${symbols.length} symbol(s) referenced ${designator}; expected exactly one`)
  }
  const pins = children(symbol, "pin").filter((p) => p.atoms[0] === pin)
  const found = pins[0]
  if (found === undefined || pins.length !== 1) throw new Error(`kicad-pro.ts: ${designator} on ${sheetFile} carries ${pins.length} (pin "${pin}" ...) entries; expected one`)
  return uuidOf(found, `${designator} pin ${pin} on ${sheetFile}`)
}

function pinPointMil(pinsFile: string, designator: string, pin: string): readonly [number, number] {
  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
  const parsed: unknown = JSON.parse(readFileSync(pinsFile, "utf8"))
  const pins: unknown = isRecord(parsed) ? parsed[designator] : undefined
  const point: unknown = isRecord(pins) ? pins[pin] : undefined
  if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number") {
    throw new Error(`kicad-pro.ts: ${pinsFile} gives no [x, y] for ${designator} pin ${pin}`)
  }
  return [point[0], point[1]]
}

/** One serialised exclusion, as KiCad 10 keys it (see the module comment). */
export function exclusionKey(entry: ErcAllowance, projectDir: string, board: string, repairDir: string): string {
  const block = /^\/([^/]+)\/$/.exec(entry.sheet)?.[1]
  if (block === undefined) throw new Error(`kicad-pro.ts: allowance sheet ${entry.sheet} is not /<block>/`)
  const path = sheetPath(join(projectDir, `${board}.kicad_sch`), block)
  const [main, aux] = entry.pins
  if (main.designator === FLAG_PARTNER || aux.designator === FLAG_PARTNER) {
    throw new Error(
      `kicad-pro.ts: allowance ${entry.ruling} (${entry.type} on ${entry.sheet}) names a ${FLAG_PARTNER} partner, whose ` +
        "exclusion key needs the uuid of that flag on the board's root sheet; this tool reads pins from a block sheet only, " +
        "so it cannot key it. Not implemented: the PWR_FLAG partner was added for the one-block root (h7 pedal Task 9b); " +
        "the board's root task must teach this tool to read the flag's uuid from the root before writing the .kicad_pro.",
    )
  }
  const sheetFile = join(projectDir, `${block}.kicad_sch`)
  const [x, y] = pinPointMil(join(repairDir, block, "pins.json"), main.designator, main.pin)
  return [
    entry.type,
    String(x * UNITS_PER_MIL),
    String(y * UNITS_PER_MIL),
    pinUuid(sheetFile, main.designator, main.pin),
    pinUuid(sheetFile, aux.designator, aux.pin),
    path,
    path,
    path,
  ].join("|")
}

export async function kicadProject(board: PageBoard, projectDir: string): Promise<string> {
  const table = await ercAllowanceTable(board)
  checkErcAllowances(table, board, await flagHomes(board))
  const exclusions = table.map((entry) => [
    exclusionKey(entry, projectDir, board.name, board.repairDir),
    `${entry.ruling}: ${entry.type} on ${entry.sheet} between ${entry.pins.map((p) => `${p.designator} pin ${p.pin}`).join(" and ")} ` +
      `(net ${entry.net}; the installed symbol types both ${entry.symbolPinType}). Declared in repair/tools/erc-allowances.ts.`,
  ])
  const project = { erc: { erc_exclusions: exclusions }, meta: { filename: `${board.name}.kicad_pro`, version: 3 } }
  return JSON.stringify(project, null, 2) + "\n"
}

if (import.meta.main) {
  const usage = "bun kicad-pro.ts <board-dir> <project-dir>"
  const { board, rest } = await boardFromArgs(process.argv.slice(2), usage)
  const projectDir = rest[0]
  if (projectDir === undefined) {
    throw new Error(`usage: ${usage} - the directory holding the root and block sheets is required`)
  }
  process.stdout.write(await kicadProject(board, projectDir))
}
