/**
 * THE NETS WHOSE DRIVER IS ON ANOTHER PAGE - the logic for a board's declared table,
 * `<board-dir>/repair/tools/cross-page-drivers.ts` (the module's ruling is
 * CR-MODULE-CROSS-PAGE-DRIVERS; the h7-pedal's CR-PEDAL-CROSS-PAGE-POWER-DRIVERS extends it to a
 * power net). The table exports `CROSS_PAGE_DRIVERS` (its entries) and `RULING`.
 *
 * Why it exists. `verify.sh` runs ERC on a block page under a root holding that block alone
 * (`./one-block-root.ts`). A net whose only pin on the page is a KiCad input, and whose driver is a
 * pin on another page, then reports `pin_not_driven` ("Input pin not driven by any Output pins"),
 * an error the page cannot remove, because the driver is not on it. For each net in the table, the
 * one-block root places a stand-in driver on the net's stub when the block under check is not the
 * driving block. The stand-in is a passive `Connector:TestPoint` for a signal driver. THE EXCEPTION
 * is a driving pin typed `power_out` (a regulator's output feeding a power input on another page,
 * which reports `power_pin_not_driven`): KiCad's ERC does not count a passive pin as driving a
 * `power_in`, so that stand-in is a PWR_FLAG (`standInKind`; ruling
 * CR-PEDAL-CROSS-PAGE-POWER-DRIVERS, which has the measurement). Such a net takes no flag home, and
 * `checkPowerDriversUnflagged` refuses one that has both, board-wide.
 *
 * Declared, never derived: an entry is written in the table, from the model, with its source. It is
 * NOT found by scanning drafts or pages. `checkCrossPageDrivers` holds each entry to the model on every
 * run: the driving block exists, the designator is a component of that block, the pin is one of
 * that component's pins and sits on the entry's net, the driving block has a port on the net (so
 * the net crosses pages), and the pin's name is the one the KiCad symbol gives that number (the
 * installed library, or the board's project library for a symbol of that library's nickname). An
 * entry failing any of these is refused, naming what is missing. The assembled root's ERC must clear
 * each entry with its REAL driver (`./root-drivers.ts`), since the stand-in only says the net is
 * driven somewhere.
 *
 * TEST OVERRIDE. When the environment variable `PAGES_CROSS_PAGE_DRIVERS_TABLE` names a JSON file,
 * `crossPageDriverTable()` reads the table from it instead, and says so on stderr. It exists for a
 * board's negative controls (the module's `erc-control.sh`), so they can remove an entry or name a
 * wrong pin without touching the table. The override is checked against the model exactly as the
 * committed table is.
 *
 * Moved from `drafted/h7-platform/h7-module/repair/tools/cross-page-drivers.ts` (H7 pedal plan Task
 * 4); the module's entries stayed there.
 */
import { readFileSync } from "node:fs"
import { basename, join } from "node:path"
import type { Component, Network } from "../../lib/model/index.ts"
import { defaultSymbolDir } from "../../lib/kicad/install.ts"
import { flattenedSymbol, librarySymbols, splitLibId, symbolPins } from "../../lib/kicad/symbol-library.ts"
import type { SymbolPin } from "../../lib/kicad/symbol-library.ts"
import type { PageBoard } from "./board.ts"
import type { FlagHomes } from "./flag-homes.ts"
import { componentIdFor, exported, importTable, overrideOr, parsedArray, requiredString } from "./table-input.ts"

export interface CrossPageDriver {
  /** The board net (the parent net the blocks' ports bind to). */
  readonly net: string
  /** The block whose page holds the driver. */
  readonly block: string
  /** The driving component's reference designator (`DESIGNATORS`). */
  readonly designator: string
  /**
   * The driving pin's number on the KiCad symbol. Usually also the model's pin key; for a part the
   * model keys by name (a resistor's `a`/`b`), it is resolved through the board's PIN_NUMBERS
   * (`symbolPinConnection`).
   */
  readonly pin: string
  /**
   * The driving pin's name on the KiCad symbol, for a reader; checked against the symbol's library.
   * Empty where the symbol names the pin nothing, as `Device:R`'s two pins are (KiCad 10.0.5's
   * `(name "")`), so the check still compares it with the library.
   */
  readonly pinName: string
  /** Where the model takes the assignment from. */
  readonly source: string
}

export const DRIVERS_FILE = "cross-page-drivers.ts"

/** Where the stand-in comes from: one passive pin at the symbol origin (measured; the ruling). */
export const STAND_IN_LIB_ID = "Connector:TestPoint"

// Known limitation (H7 module plan, Task 7b review): the installed kicad-cli's path is written out
// here and in the shell scripts of this directory. The page tooling is macOS-only, as the
// toolchain lock (draughting/tools.lock.json) pins kicad-cli 10.0.5 from the macOS KiCad.app.
const KICAD_CLI = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
const OVERRIDE_ENV = "PAGES_CROSS_PAGE_DRIVERS_TABLE"

/** A string field that must be present but may be empty (an unnamed symbol pin's name). */
function presentString(entry: Record<string, unknown>, key: string, where: string): string {
  const value = entry[key]
  if (typeof value !== "string") {
    throw new Error(`${where}: "${key}" must be a string (empty for a symbol pin with no name); got ${JSON.stringify(value)}`)
  }
  return value
}

function parseDriver(entry: Record<string, unknown>, where: string): CrossPageDriver {
  return {
    net: requiredString(entry, "net", where),
    block: requiredString(entry, "block", where),
    designator: requiredString(entry, "designator", where),
    pin: requiredString(entry, "pin", where),
    pinName: presentString(entry, "pinName", where),
    source: requiredString(entry, "source", where),
  }
}

export interface DriverTable {
  readonly entries: readonly CrossPageDriver[]
  readonly ruling: string
}

/** The board's committed table, as declared; no override is read. */
export async function committedDriverTable(board: PageBoard): Promise<DriverTable> {
  const module = await importTable(board, DRIVERS_FILE, "the nets whose driver is on another page (a signal driver, or a power_out pin)")
  const ruling = exported(module, "RULING", board, DRIVERS_FILE)
  if (typeof ruling !== "string") throw new Error(`${join(board.tablesDir, DRIVERS_FILE)}'s RULING is not a string`)
  return { entries: parsedArray(exported(module, "CROSS_PAGE_DRIVERS", board, DRIVERS_FILE), join(board.tablesDir, DRIVERS_FILE), parseDriver), ruling }
}

/** The board's committed table, or the test override when `PAGES_CROSS_PAGE_DRIVERS_TABLE` is set (said on stderr). */
export async function crossPageDriverTable(board: PageBoard): Promise<DriverTable> {
  const committed = await committedDriverTable(board)
  return { entries: overrideOr(OVERRIDE_ENV, committed.entries, "cross-page-drivers.ts", "CROSS_PAGE_DRIVERS", parseDriver), ruling: committed.ruling }
}

/** The net a component's pin is on in the model: a net name, null for a no-connect, undefined for no such pin. */
export function pinConnection(component: Component, pin: string): string | null | undefined {
  const all = [component.pins, ...component.units.map((u) => u.pins)]
  for (const pins of all) {
    const c = pins[pin]
    if (c !== undefined) return c.kind === "net" ? c.net : null
  }
  return undefined
}

/**
 * The net the component's KiCad symbol pin `number` is on in the model: a net name, null for a
 * no-connect, undefined for no such pin. Read by the model's own key where the model keys the pin by
 * its number (an `ic`, a connector, a switch); otherwise through the board's PIN_NUMBERS for the
 * component's kind, the table every page is lowered with, which must give exactly one of the
 * component's pins that number (a resistor's `b` is `Device:R` pin 2 in the h7-pedal's table). Added
 * by the h7 pedal pages plan's Task 10, whose VINL and VINR entries name a resistor's pin: the only
 * parts on those nets in the driving block are R_O and C_VIN, both keyed `a`/`b`.
 */
export function symbolPinConnection(board: PageBoard, component: Component, number: string): string | null | undefined {
  const direct = pinConnection(component, number)
  if (direct !== undefined) return direct
  const keys = Object.entries(board.pinNumbers[component.kind] ?? {})
    .filter(([key, n]) => n === number && pinConnection(component, key) !== undefined)
    .map(([key]) => key)
  const key = keys[0]
  return keys.length === 1 && key !== undefined ? pinConnection(component, key) : undefined
}

/**
 * The pin with this number on the symbol as the drawing resolves it, or undefined: a stock symbol from
 * the INSTALLED KiCad library (not a vendored copy), a project symbol (its nickname is the board's
 * `PROJECT_SYMBOL_LIBRARY` file stem, `h7-platform` for the module; design change C4) from that
 * committed project library.
 */
export function libraryPin(board: PageBoard, libId: string, number: string): SymbolPin | undefined {
  const { library, name } = splitLibId(libId)
  const project = board.projectSymbolLibrary
  const file = library === basename(project, ".kicad_sym") ? project : join(defaultSymbolDir(KICAD_CLI), `${library}.kicad_sym`)
  const block = flattenedSymbol(librarySymbols(readFileSync(file, "utf8")), name)
  return symbolPins(block).find((p) => p.number === number)
}

function problemsWith(entry: CrossPageDriver, board: PageBoard): string[] {
  const module: Network = board.network
  const record = module.blocks.find((b) => b.prefix === entry.block)
  if (record === undefined) {
    return [`driving block "${entry.block}" is not a block of ${board.modelName}; its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`]
  }
  const resolved = componentIdFor(board, entry.designator)
  if ("problem" in resolved) return [resolved.problem]
  const id = resolved.id
  if (!record.componentIds.includes(id)) {
    return [`${entry.designator} (${id}) is not a component of block "${entry.block}"; it cannot be that block's driver`]
  }
  const component = module.components.find((c) => c.id === id)
  if (component === undefined) return [`${id} is in block "${entry.block}" but not in ${board.modelName}'s components`]
  const problems: string[] = []
  const on = symbolPinConnection(board, component, entry.pin)
  if (on === undefined) {
    problems.push(`${entry.designator} has no pin "${entry.pin}" in the model (by its own key, or by PIN_NUMBERS["${component.kind}"])`)
  } else if (on !== entry.net) {
    problems.push(`${entry.designator} pin ${entry.pin} is on ${on === null ? "no net (not connected)" : `net ${on}`} in the model, not on ${entry.net}`)
  }
  if (!Object.values(record.ports).includes(entry.net)) {
    problems.push(`block "${entry.block}" has no port bound to ${entry.net}, so ${entry.net} does not leave its page`)
  }
  const libId = component.part?.symbol
  if (libId === undefined) {
    problems.push(`${entry.designator} (${id}) names no KiCad symbol in the model, so pin name ${entry.pinName} cannot be checked`)
  } else if (on !== undefined) {
    const name = libraryPin(board, libId, entry.pin)?.name
    if (name !== entry.pinName) {
      problems.push(`${libId} pin ${entry.pin} is named ${name ?? "nothing (no such pin)"} in its library, not ${entry.pinName}`)
    }
  }
  return problems
}

/**
 * Hold every entry to the model; throw, naming each entry and what is missing, if any fails.
 * Also refuses two entries on one net, since a net has one driver.
 */
export function checkCrossPageDrivers(table: DriverTable, board: PageBoard): void {
  const failures: string[] = []
  const seen = new Set<string>()
  for (const entry of table.entries) {
    const label = `${entry.net} -> ${entry.block}, ${entry.designator} ${entry.pinName} (pin ${entry.pin})`
    if (seen.has(entry.net)) failures.push(`${label}: ${entry.net} has a second entry; a net has one driver`)
    seen.add(entry.net)
    for (const problem of problemsWith(entry, board)) failures.push(`${label}: ${problem}`)
  }
  if (failures.length > 0) {
    throw new Error(
      `cross-page-drivers.ts: ${failures.length} entr${failures.length === 1 ? "y is" : "ies are"} not borne out by the model ` +
        `(ruling ${table.ruling}; an entry is taken from ${board.circuitRel}, never guessed):\n  ` +
        failures.join("\n  "),
    )
  }
}

/** The entries for which `block`'s one-block root needs a stand-in: nets it reaches, driven off its page. */
export function standInsFor(table: DriverTable, block: string, ports: Readonly<Record<string, string>>): readonly CrossPageDriver[] {
  const nets = new Set(Object.values(ports))
  return table.entries.filter((e) => e.block !== block && nets.has(e.net))
}

/**
 * WHAT STANDS IN FOR AN ENTRY'S DRIVER, read from the driving pin's own electrical type. A
 * `power_out` driving pin (a regulator's output feeding a power input on another page) is stood in
 * for by a PWR_FLAG, whose one pin is `power_out` too (`power:PWR_FLAG`, KiCad 10.0.5's
 * `power.kicad_sym`): KiCad's ERC does not count a passive pin as driving a `power_in`, measured on
 * the h7-pedal's pf page (`power_pin_not_driven` on U1's VDD stays with the TestPoint stand-in and
 * clears with a PWR_FLAG; ruling CR-PEDAL-CROSS-PAGE-POWER-DRIVERS). Every other driving pin keeps
 * the passive `STAND_IN_LIB_ID` (ruling CR-MODULE-CROSS-PAGE-DRIVERS). Either way the stand-in sits
 * only on the scratch one-block root; the assembled root carries none and its ERC must clear the net
 * with the real driver. Throws, naming the entry, when the driving pin cannot be resolved; call
 * `checkCrossPageDrivers` first.
 */
export function standInKind(entry: CrossPageDriver, board: PageBoard): "pwr_flag" | "test_point" {
  const label = `${entry.net} -> ${entry.block}, ${entry.designator} pin ${entry.pin}`
  const resolved = componentIdFor(board, entry.designator)
  if ("problem" in resolved) throw new Error(`cross-page-drivers.ts: ${label}: ${resolved.problem}`)
  const libId = board.network.components.find((c) => c.id === resolved.id)?.part?.symbol
  if (libId === undefined) throw new Error(`cross-page-drivers.ts: ${label}: ${resolved.id} names no KiCad symbol, so its pin's type is unknown`)
  const pin = libraryPin(board, libId, entry.pin)
  if (pin === undefined) throw new Error(`cross-page-drivers.ts: ${label}: ${libId} has no pin ${entry.pin}`)
  return pin.type === "power_out" ? "pwr_flag" : "test_point"
}

/**
 * A NET DRIVEN BY A POWER OUTPUT TAKES NO PWR_FLAG, checked across the whole board (ruling
 * CR-PEDAL-CROSS-PAGE-POWER-DRIVERS, as amended at the h7 pedal pages plan's Task 7c). Refuses every
 * entry whose driving pin is `power_out` and whose net also has a flag in `pwr-flag-homes.ts` -
 * a shared home on ANY page (the root, the driving page, or a page that reads the net) or a private
 * flag of any block - since the assembled hierarchy would then carry two `power_out` pins on the net,
 * a `pin_to_pin` error (CR-MODULE-PWR-FLAGS). Only entries on a flagged net have their pin type
 * resolved (`standInKind`, which throws naming the entry when it cannot be). Run once per board by
 * `tables.ts`, the first step of `verify.sh` and `verify-root.sh`, on the committed tables, and by
 * `one-block-root.ts` on the table it uses, so a control's test override is held to it too.
 */
export function checkPowerDriversUnflagged(table: DriverTable, homes: FlagHomes, board: PageBoard): void {
  const flags = new Map<string, string[]>()
  const note = (net: string, where: string): void => {
    flags.set(net, [...(flags.get(net) ?? []), where])
  }
  for (const [net, home] of Object.entries(homes.shared)) note(net, `a shared flag home on ${home}`)
  for (const [block, nets] of Object.entries(homes.privateFlags)) for (const net of nets) note(net, `a private flag on ${block}`)
  const failures: string[] = []
  for (const entry of table.entries) {
    const where = flags.get(entry.net)
    if (where === undefined || standInKind(entry, board) !== "pwr_flag") continue
    failures.push(
      `${entry.net}: pwr-flag-homes.ts declares ${where.join(" and ")}, and cross-page-drivers.ts declares its driver ` +
        `${entry.block} ${entry.designator} ${entry.pinName} (pin ${entry.pin}), a power_out pin`,
    )
  }
  if (failures.length > 0) {
    throw new Error(
      `${board.name}: ${failures.length} net(s) have both a PWR_FLAG and a power_out driver (ruling CR-PEDAL-CROSS-PAGE-POWER-DRIVERS: ` +
        "a net driven by a power output takes no PWR_FLAG, since two power outputs on one net are a pin_to_pin error under " +
        `${homes.ruling}); remove the flag home or the entry:\n  ` +
        failures.join("\n  "),
    )
  }
}
