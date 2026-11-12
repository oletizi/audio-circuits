/**
 * THE h7-module SIGNAL NETS WHOSE DRIVER IS ON ANOTHER PAGE - the one declared table, under the
 * controller ruling CR-MODULE-CROSS-PAGE-DRIVERS (`docs/h7-platform/decisions.md`).
 *
 * Why it exists. `verify.sh` runs ERC on a block page under a root holding that block alone
 * (`./one-block-root.ts`). A net whose only pin on the page is a KiCad input, and whose driver is a
 * pin on another page, then reports `pin_not_driven` ("Input pin not driven by any Output pins"),
 * an error the page cannot remove, because the driver is not on it. For each net here, the
 * one-block root places a stand-in driver on the net's stub when the block under check is not the
 * driving block. A PWR_FLAG is not the stand-in: these are signal nets, not power nets.
 *
 * Declared, never derived: an entry is written here, from the model, with its source. It is NOT
 * found by scanning drafts or pages. `checkCrossPageDrivers` holds each entry to the model on every
 * run: the driving block exists, the designator is a component of that block, the pin is one of
 * that component's pins and sits on the entry's net, the driving block has a port on the net (so
 * the net crosses pages), and the pin's name is the one the installed KiCad symbol gives that
 * number. An entry failing any of these is refused, naming what is missing.
 *
 * Entries for the pages Task 7b repairs. A later page that needs one adds it, with its source.
 * The assembled module's root ERC (Task 7 step 4) must clear each entry with its REAL driver, since
 * the stand-in only says the net is driven somewhere (`../../RECORD.md`).
 *
 * TEST OVERRIDE. When the environment variable `H7_CROSS_PAGE_DRIVERS_TABLE` names a JSON file,
 * `crossPageDriverTable()` reads the table from it instead, and says so on stderr. It exists for
 * `./erc-control.sh`'s negative controls, so they can remove an entry or name a wrong pin without
 * touching this file. The override is checked against the model exactly as the committed table is.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DESIGNATORS } from "../../../../../circuits/h7-platform/module-board.ts"
import type { Component, Network } from "../../../../../lib/model/index.ts"
import { defaultSymbolDir } from "../../../../../lib/kicad/install.ts"
import { flattenedSymbol, librarySymbols, splitLibId, symbolPins } from "../../../../../lib/kicad/symbol-library.ts"

export interface CrossPageDriver {
  /** The module net (the parent net the blocks' ports bind to). */
  readonly net: string
  /** The block whose page holds the driver. */
  readonly block: string
  /** The driving component's reference designator (`DESIGNATORS`). */
  readonly designator: string
  /** The driving pin's number: the model's pin key, which is the KiCad symbol's pin number. */
  readonly pin: string
  /** The driving pin's name on the KiCad symbol, for a reader; checked against the installed library. */
  readonly pinName: string
  /** Where the model takes the assignment from. */
  readonly source: string
}

export const CROSS_PAGE_DRIVERS: readonly CrossPageDriver[] = [
  {
    net: "FLASH_CLK",
    block: "mcu",
    designator: "U1",
    pin: "28",
    pinName: "PF10",
    source: "circuits/h7-platform/module-pins.ts (FLASH_CLK on PF10, QUADSPI_CLK; pedals CORE-BRIEF.md:382 @5b926d0); PF10 is LQFP-176 position 28 in ST's pin data (module/mcu.ts keys U1's pins by position)",
  },
]

/** Where the stand-in comes from: one passive pin at the symbol origin (measured; the ruling). */
export const STAND_IN_LIB_ID = "Connector:TestPoint"

const KICAD_CLI = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
const OVERRIDE_ENV = "H7_CROSS_PAGE_DRIVERS_TABLE"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function field(entry: Record<string, unknown>, key: string, where: string): string {
  const value = entry[key]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${where}: "${key}" must be a non-empty string; got ${JSON.stringify(value)}`)
  }
  return value
}

function parseOverride(file: string): readonly CrossPageDriver[] {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (!Array.isArray(parsed)) throw new Error(`${OVERRIDE_ENV}=${file}: the table must be a JSON array of entries`)
  return parsed.map((entry: unknown, i): CrossPageDriver => {
    const where = `${OVERRIDE_ENV}=${file}, entry ${i}`
    if (!isRecord(entry)) throw new Error(`${where}: not an object`)
    return {
      net: field(entry, "net", where),
      block: field(entry, "block", where),
      designator: field(entry, "designator", where),
      pin: field(entry, "pin", where),
      pinName: field(entry, "pinName", where),
      source: field(entry, "source", where),
    }
  })
}

/** The committed table, or the test override when `H7_CROSS_PAGE_DRIVERS_TABLE` is set (said on stderr). */
export function crossPageDriverTable(): readonly CrossPageDriver[] {
  const file = process.env[OVERRIDE_ENV]
  if (file === undefined || file === "") return CROSS_PAGE_DRIVERS
  console.error(`cross-page-drivers.ts: TEST OVERRIDE - the table is read from ${file}, not the committed CROSS_PAGE_DRIVERS`)
  return parseOverride(file)
}

function pinConnection(component: Component, pin: string): string | null | undefined {
  const all = [component.pins, ...component.units.map((u) => u.pins)]
  for (const pins of all) {
    const c = pins[pin]
    if (c !== undefined) return c.kind === "net" ? c.net : null
  }
  return undefined
}

function symbolPinName(libId: string, number: string): string | undefined {
  const { library, name } = splitLibId(libId)
  const file = join(defaultSymbolDir(KICAD_CLI), `${library}.kicad_sym`)
  const block = flattenedSymbol(librarySymbols(readFileSync(file, "utf8")), name)
  return symbolPins(block).find((p) => p.number === number)?.name
}

function problemsWith(entry: CrossPageDriver, module: Network): string[] {
  const record = module.blocks.find((b) => b.prefix === entry.block)
  if (record === undefined) {
    return [`driving block "${entry.block}" is not a block of h7Module(); its blocks are ${module.blocks.map((b) => b.prefix).join(", ")}`]
  }
  const ids = Object.entries(DESIGNATORS).filter(([, d]) => d === entry.designator).map(([id]) => id)
  const id = ids[0]
  if (ids.length !== 1 || id === undefined) {
    return [`designator ${entry.designator} names ${ids.length} components in DESIGNATORS (module-board.ts); expected exactly one`]
  }
  if (!record.componentIds.includes(id)) {
    return [`${entry.designator} (${id}) is not a component of block "${entry.block}"; it cannot be that block's driver`]
  }
  const component = module.components.find((c) => c.id === id)
  if (component === undefined) return [`${id} is in block "${entry.block}" but not in h7Module()'s components`]
  const problems: string[] = []
  const on = pinConnection(component, entry.pin)
  if (on === undefined) {
    problems.push(`${entry.designator} has no pin "${entry.pin}" in the model`)
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
    const name = symbolPinName(libId, entry.pin)
    if (name !== entry.pinName) {
      problems.push(`${libId} pin ${entry.pin} is named ${name ?? "nothing (no such pin)"} in the installed library, not ${entry.pinName}`)
    }
  }
  return problems
}

/**
 * Hold every entry to the model; throw, naming each entry and what is missing, if any fails.
 * Also refuses two entries on one net, since a net has one driver.
 */
export function checkCrossPageDrivers(table: readonly CrossPageDriver[], module: Network): void {
  const failures: string[] = []
  const seen = new Set<string>()
  for (const entry of table) {
    const label = `${entry.net} -> ${entry.block}, ${entry.designator} ${entry.pinName} (pin ${entry.pin})`
    if (seen.has(entry.net)) failures.push(`${label}: ${entry.net} has a second entry; a net has one driver`)
    seen.add(entry.net)
    for (const problem of problemsWith(entry, module)) failures.push(`${label}: ${problem}`)
  }
  if (failures.length > 0) {
    throw new Error(
      `cross-page-drivers.ts: ${failures.length} entr${failures.length === 1 ? "y is" : "ies are"} not borne out by the model ` +
        `(ruling CR-MODULE-CROSS-PAGE-DRIVERS; an entry is taken from circuits/h7-platform/module-board.ts, never guessed):\n  ` +
        failures.join("\n  "),
    )
  }
}

/** The entries for which `block`'s one-block root needs a stand-in: nets it reaches, driven off its page. */
export function standInsFor(table: readonly CrossPageDriver[], block: string, ports: Readonly<Record<string, string>>): readonly CrossPageDriver[] {
  const nets = new Set(Object.values(ports))
  return table.filter((e) => e.block !== block && nets.has(e.net))
}
