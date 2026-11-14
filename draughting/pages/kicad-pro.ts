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
 * `/<root uuid>/<sheet uuid>` (`/<root uuid>` for an item on the root itself). That form is the one
 * the pedals repository's v1 `h7-platform.kicad_pro` carries for the same VCAP violation. MEASURED
 * with kicad-cli 10.0.5 on the module's assembled root: an entry built this way, main item U1 pin 81,
 * is honoured (`kicad-cli sch erc` reports the violation with `"excluded": true` and no longer as an
 * error); the same entry with the two pins swapped, or with x one unit off, is not, and KiCad then
 * reports the real violation as an error AND the unmatched exclusion as a separate excluded marker.
 * So the order is the allowance's own (the main pin first, as KiCad lists the items), and the
 * position is the main pin's point.
 *
 * A PWR_FLAG PARTNER (ruling CR-PEDAL-LM66100-ST-ERC; h7 pedal Task 11b). The aux item is the net's
 * PWR_FLAG on the root: its pin 1 uuid is read from the assembled root, at the point
 * `./root-flags.ts` puts that net's flag, and its sheet path is the root's, `/<root uuid>`. MEASURED
 * on the pedal root (kicad-cli 10.0.5): with that key the expr_ref `pin_to_pin` between U12 pin 5 and
 * the GND flag is excluded; with the aux item sheet path `/` or the main's, or the flag's uuid
 * replaced by the nil uuid, it is not. Only a flag homed on the root is read; a flag partner whose net
 * is flagged on a block page is refused, naming it, since no board has one and nothing was measured.
 *
 * A ROOT LABEL ALLOWANCE (`RootLabelAllowance`; h7 pedal Task 11b). The one item is the stub label on
 * the root: `<type>|<x>|<y>|<label uuid>|<nil uuid>|/<root uuid>||`, x, y at the label's point.
 * MEASURED on the pedal root (kicad-cli 10.0.5), MIDI_PIN4's `label_dangling`, trying every
 * combination of "", "/" and `/<root uuid>` in the three path fields: honoured only with `/<root
 * uuid>` as the sheet path and the main item path empty (or "/"); this writes the empty form. The
 * label must stand at its stub's end, the point `assemble-root.ts` writes for it; a label of that
 * text anywhere else is refused, since it would dangle for another reason (Task 11b review I1).
 * The key forms' negative results are re-run by the pedal's
 * `drafted/h7-platform/h7-pedal/repair/tools/exclusion_key_probe.py`.
 *
 * Every value comes from a committed file, never from an ERC run: the root and sheet uuids, a root
 * flag's pin uuid and a root label's uuid and point from the root sheet, a part pin's uuid from the
 * block sheet's placed symbol, and a part pin's point from `<board-dir>/repair/<block>/pins.json`
 * (mil; 254 schematic units per mil). The allowances are held to the model first
 * (`checkErcAllowances`), exactly as `verify.sh` holds them.
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
import { checkErcAllowances, ercAllowanceTable, FLAG_PARTNER, isRootLabelAllowance, type ErcAllowance, type PinAllowance, type RootLabelAllowance } from "./erc-allowances.ts"
import { flagHomes, type FlagHomes } from "./flag-homes.ts"
import { rootFlagPlacements } from "./root-flags.ts"
import { rootSheetOps } from "../../tools/draught/assemble-root.ts"

const UNITS_PER_MIL = 254
const UNITS_PER_MM = 10000
const NIL_UUID = "00000000-0000-0000-0000-000000000000"

function property(node: SNode, name: string): string | undefined {
  return children(node, "property").find((p) => p.atoms[0] === name)?.atoms[1]
}

function uuidOf(node: SNode, where: string): string {
  const uuid = child(node, "uuid")?.atoms[0]
  if (uuid === undefined) throw new Error(`kicad-pro.ts: ${where} has no (uuid ...)`)
  return uuid
}

function readSheet(file: string): SNode {
  return parseSexpr(readFileSync(file, "utf8"))
}

function rootPath(rootFile: string): string {
  return `/${uuidOf(readSheet(rootFile), rootFile)}`
}

function sheetPath(rootFile: string, block: string): string {
  const root = readSheet(rootFile)
  const sheets = children(root, "sheet").filter((s) => property(s, "Sheetname") === block)
  const sheet = sheets[0]
  if (sheet === undefined || sheets.length !== 1) {
    throw new Error(`kicad-pro.ts: ${rootFile} holds ${sheets.length} sheet(s) named "${block}"; expected exactly one, since the allowance is on /${block}/`)
  }
  return `/${uuidOf(root, rootFile)}/${uuidOf(sheet, `the root's sheet "${block}"`)}`
}

function pinUuid(sheetFile: string, designator: string, pin: string): string {
  const sheet = readSheet(sheetFile)
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

/** An `(at x y ...)` in mm, read as schematic units; refuses a node with none. */
function atUnits(node: SNode, where: string): readonly [number, number] {
  const [x, y] = child(node, "at")?.atoms ?? []
  if (x === undefined || y === undefined) throw new Error(`kicad-pro.ts: ${where} has no (at x y ...)`)
  return [Math.round(Number(x) * UNITS_PER_MM), Math.round(Number(y) * UNITS_PER_MM)]
}

/**
 * The pin 1 uuid of the PWR_FLAG on the root that stands on `net`: the one at the point
 * `rootFlagPlacements` gives that net's flag. Refuses a net not flagged on the root, and a root holding no
 * flag, or more than one, there.
 */
export function rootFlagPinUuid(rootFile: string, board: PageBoard, homes: FlagHomes, net: string): string {
  if (homes.shared[net] !== homes.rootSheet) {
    throw new Error(
      `kicad-pro.ts: a ${FLAG_PARTNER} partner on ${net} is keyed by the root's flag, but pwr-flag-homes.ts homes ${net}'s flag on ` +
        `${homes.shared[net] ?? "no page"}; a flag on a block page is not implemented here (no board has one, and its key was never measured)`,
    )
  }
  const at = rootFlagPlacements(board.network, board.name, homes).find((p) => p.net === net)?.at
  if (at === undefined) {
    throw new Error(`kicad-pro.ts: root-flags.ts places no PWR_FLAG for ${net}, so the root has no flag to key the exclusion with`)
  }
  const want = [at[0] * UNITS_PER_MIL, at[1] * UNITS_PER_MIL]
  const flags = children(readSheet(rootFile), "symbol").filter((s) => child(s, "lib_id")?.atoms[0] === "power:PWR_FLAG")
    .filter((s) => { const [x, y] = atUnits(s, "a root PWR_FLAG"); return x === want[0] && y === want[1] })
  const flag = flags[0]
  if (flag === undefined || flags.length !== 1) {
    throw new Error(`kicad-pro.ts: ${rootFile} holds ${flags.length} PWR_FLAG(s) at (${at[0]}, ${at[1]}) mil, where root-flags.ts puts ${net}'s; expected exactly one`)
  }
  const pins = children(flag, "pin").filter((p) => p.atoms[0] === "1")
  const pin = pins[0]
  if (pin === undefined || pins.length !== 1) throw new Error(`kicad-pro.ts: the PWR_FLAG on ${net} on ${rootFile} carries ${pins.length} (pin "1" ...) entries; expected one`)
  return uuidOf(pin, `the PWR_FLAG on ${net}'s pin 1`)
}

function pinExclusionKey(entry: PinAllowance, projectDir: string, board: PageBoard, homes: FlagHomes): string {
  const block = /^\/([^/]+)\/$/.exec(entry.sheet)?.[1]
  if (block === undefined) throw new Error(`kicad-pro.ts: allowance sheet ${entry.sheet} is not /<block>/`)
  const [main, aux] = entry.pins
  if (main.designator === FLAG_PARTNER) {
    throw new Error(
      `kicad-pro.ts: allowance ${entry.ruling} (${entry.type} on ${entry.sheet}) names its ${FLAG_PARTNER} partner first; KiCad lists ` +
        "the part's pin as the main item (measured on the pedal root), so name the part's pin first",
    )
  }
  const rootFile = join(projectDir, `${board.name}.kicad_sch`)
  const path = sheetPath(rootFile, block)
  const sheetFile = join(projectDir, `${block}.kicad_sch`)
  const [x, y] = pinPointMil(join(board.repairDir, block, "pins.json"), main.designator, main.pin)
  const flag = aux.designator === FLAG_PARTNER
  return [
    entry.type,
    String(x * UNITS_PER_MIL),
    String(y * UNITS_PER_MIL),
    pinUuid(sheetFile, main.designator, main.pin),
    flag ? rootFlagPinUuid(rootFile, board, homes, entry.net) : pinUuid(sheetFile, aux.designator, aux.pin),
    path,
    path,
    flag ? rootPath(rootFile) : path,
  ].join("|")
}

function labelExclusionKey(entry: RootLabelAllowance, projectDir: string, board: PageBoard): string {
  const rootFile = join(projectDir, `${board.name}.kicad_sch`)
  const labels = children(readSheet(rootFile), "label").filter((l) => l.atoms[0] === entry.label)
  const label = labels[0]
  if (label === undefined || labels.length !== 1) {
    throw new Error(`kicad-pro.ts: ${rootFile} holds ${labels.length} label(s) "${entry.label}"; allowance ${entry.ruling} keys exactly one`)
  }
  const [x, y] = atUnits(label, `the root label "${entry.label}"`)
  // The allowance excuses the STUB label the arrangement draws for the net's one sheet pin, and
  // nothing else: a label of that text moved off its stub dangles for another reason (Task 11b
  // review I1, measured: a label moved 5.08 mm off the stub, keyed here, passed verify-root).
  const stubs = rootSheetOps(board.network, board.name).ops.filter((op) => op.op === "add_net_label" && op.name === entry.label)
  const stub = stubs[0]?.at
  if (stubs.length !== 1 || !Array.isArray(stub) || typeof stub[0] !== "number" || typeof stub[1] !== "number") {
    throw new Error(`kicad-pro.ts: assemble-root.ts writes ${stubs.length} stub label(s) "${entry.label}"; allowance ${entry.ruling} names exactly one`)
  }
  const want = [stub[0] * UNITS_PER_MIL, stub[1] * UNITS_PER_MIL]
  if (x !== want[0] || y !== want[1]) {
    throw new Error(
      `kicad-pro.ts: the root label "${entry.label}" is at (${x / UNITS_PER_MM}, ${y / UNITS_PER_MM}) mm, not at its stub's end, ` +
        `(${want[0] / UNITS_PER_MM}, ${want[1] / UNITS_PER_MM}) mm, where assemble-root.ts writes it; allowance ${entry.ruling} excuses ` +
        "only the stub label, so a label moved off its stub is not keyed. Put the label back on its stub, or find why it moved.",
    )
  }
  return [entry.type, String(x), String(y), uuidOf(label, `the root label "${entry.label}"`), NIL_UUID, rootPath(rootFile), "", ""].join("|")
}

/** One serialised exclusion, as KiCad 10 keys it (see the module comment). */
export function exclusionKey(entry: ErcAllowance, projectDir: string, board: PageBoard, homes: FlagHomes): string {
  return isRootLabelAllowance(entry) ? labelExclusionKey(entry, projectDir, board) : pinExclusionKey(entry, projectDir, board, homes)
}

function comment(entry: ErcAllowance): string {
  if (isRootLabelAllowance(entry)) {
    return `${entry.ruling}: ${entry.type} on ${entry.sheet}, the root stub label ${entry.label} (net ${entry.net}, a board port bound to one block). ` +
      "Declared in repair/tools/erc-allowances.ts."
  }
  const between = entry.pins.map((p) => `${p.designator} pin ${p.pin}`).join(" and ")
  const part = entry.pins.find((p) => p.designator !== FLAG_PARTNER)
  const typed = entry.pins.some((p) => p.designator === FLAG_PARTNER) && part !== undefined
    ? `the installed symbol types ${part.designator} pin ${part.pin} ${entry.symbolPinType}; its partner is the net's PWR_FLAG on the root`
    : `the installed symbol types both ${entry.symbolPinType}`
  return `${entry.ruling}: ${entry.type} on ${entry.sheet} between ${between} (net ${entry.net}; ${typed}). Declared in repair/tools/erc-allowances.ts.`
}

export async function kicadProject(board: PageBoard, projectDir: string): Promise<string> {
  const table = await ercAllowanceTable(board)
  const homes = await flagHomes(board)
  checkErcAllowances(table, board, homes)
  const exclusions = table.map((entry) => [exclusionKey(entry, projectDir, board, homes), comment(entry)])
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
