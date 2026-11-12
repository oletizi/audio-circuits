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
 * Entries for the pages Task 7b and Task 7c repair. A later page that needs one adds it, with its
 * source. Task 7c added the sdram page's 22 input nets: every SDRAM address, bank, byte-mask, clock
 * and command net whose only pin on that page is a W9825G6KH input, driven by the MCU's FMC pin.
 * SDRAM_NE is not one: R9, a passive pin, is on it with U3's /CS, and ERC reports nothing there. The
 * sixteen data nets are not: U3's DQ pins are bidirectional.
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

/** An entry whose driver is the MCU, U1 on the mcu page: the form every entry so far takes. */
function mcuDriver(net: string, pin: string, pinName: string, source: string): CrossPageDriver {
  return { net, block: "mcu", designator: "U1", pin, pinName, source }
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
  // Task 7c, the sdram page. Each source names the module-pins.ts line and the line it cites.
  mcuDriver("SDRAM_A0", "16", "PF0", "circuits/h7-platform/module-pins.ts:34 (SDRAM_A0 on PF0, FMC_A0; pedals CORE-BRIEF.md:319 @5b926d0); PF0 is LQFP-176 position 16 in ST's pin data"),
  mcuDriver("SDRAM_A1", "17", "PF1", "circuits/h7-platform/module-pins.ts:35 (SDRAM_A1 on PF1, FMC_A1; pedals CORE-BRIEF.md:320 @5b926d0); PF1 is LQFP-176 position 17 in ST's pin data"),
  mcuDriver("SDRAM_A2", "18", "PF2", "circuits/h7-platform/module-pins.ts:36 (SDRAM_A2 on PF2, FMC_A2; pedals CORE-BRIEF.md:321 @5b926d0); PF2 is LQFP-176 position 18 in ST's pin data"),
  mcuDriver("SDRAM_A3", "19", "PF3", "circuits/h7-platform/module-pins.ts:37 (SDRAM_A3 on PF3, FMC_A3; pedals CORE-BRIEF.md:322 @5b926d0); PF3 is LQFP-176 position 19 in ST's pin data"),
  mcuDriver("SDRAM_A4", "20", "PF4", "circuits/h7-platform/module-pins.ts:38 (SDRAM_A4 on PF4, FMC_A4; pedals CORE-BRIEF.md:323 @5b926d0); PF4 is LQFP-176 position 20 in ST's pin data"),
  mcuDriver("SDRAM_A5", "21", "PF5", "circuits/h7-platform/module-pins.ts:39 (SDRAM_A5 on PF5, FMC_A5; pedals CORE-BRIEF.md:324 @5b926d0); PF5 is LQFP-176 position 21 in ST's pin data"),
  mcuDriver("SDRAM_A6", "60", "PF12", "circuits/h7-platform/module-pins.ts:40 (SDRAM_A6 on PF12, FMC_A6; pedals CORE-BRIEF.md:325 @5b926d0); PF12 is LQFP-176 position 60 in ST's pin data"),
  mcuDriver("SDRAM_A7", "63", "PF13", "circuits/h7-platform/module-pins.ts:41 (SDRAM_A7 on PF13, FMC_A7; pedals CORE-BRIEF.md:326 @5b926d0); PF13 is LQFP-176 position 63 in ST's pin data"),
  mcuDriver("SDRAM_A8", "64", "PF14", "circuits/h7-platform/module-pins.ts:42 (SDRAM_A8 on PF14, FMC_A8; pedals CORE-BRIEF.md:327 @5b926d0); PF14 is LQFP-176 position 64 in ST's pin data"),
  mcuDriver("SDRAM_A9", "65", "PF15", "circuits/h7-platform/module-pins.ts:43 (SDRAM_A9 on PF15, FMC_A9; pedals CORE-BRIEF.md:328 @5b926d0); PF15 is LQFP-176 position 65 in ST's pin data"),
  mcuDriver("SDRAM_A10", "66", "PG0", "circuits/h7-platform/module-pins.ts:44 (SDRAM_A10 on PG0, FMC_A10; pedals CORE-BRIEF.md:329 @5b926d0); PG0 is LQFP-176 position 66 in ST's pin data"),
  mcuDriver("SDRAM_A11", "67", "PG1", "circuits/h7-platform/module-pins.ts:45 (SDRAM_A11 on PG1, FMC_A11; pedals CORE-BRIEF.md:330 @5b926d0); PG1 is LQFP-176 position 67 in ST's pin data"),
  mcuDriver("SDRAM_A12", "106", "PG2", "circuits/h7-platform/module-pins.ts:46 (SDRAM_A12 on PG2, FMC_A12; pedals CORE-BRIEF.md:331 @5b926d0); PG2 is LQFP-176 position 106 in ST's pin data"),
  mcuDriver("SDRAM_BA0", "108", "PG4", "circuits/h7-platform/module-pins.ts:47 (SDRAM_BA0 on PG4, FMC_BA0; pedals CORE-BRIEF.md:332 @5b926d0); PG4 is LQFP-176 position 108 in ST's pin data"),
  mcuDriver("SDRAM_BA1", "109", "PG5", "circuits/h7-platform/module-pins.ts:48 (SDRAM_BA1 on PG5, FMC_BA1; pedals CORE-BRIEF.md:333 @5b926d0); PG5 is LQFP-176 position 109 in ST's pin data"),
  mcuDriver("SDRAM_NBL0", "169", "PE0", "circuits/h7-platform/module-pins.ts:65 (SDRAM_NBL0 on PE0, FMC_NBL0; pedals CORE-BRIEF.md:350 @5b926d0); PE0 is LQFP-176 position 169 in ST's pin data"),
  mcuDriver("SDRAM_NBL1", "170", "PE1", "circuits/h7-platform/module-pins.ts:66 (SDRAM_NBL1 on PE1, FMC_NBL1; pedals CORE-BRIEF.md:351 @5b926d0); PE1 is LQFP-176 position 170 in ST's pin data"),
  mcuDriver("SDRAM_CLK", "112", "PG8", "circuits/h7-platform/module-pins.ts:67 (SDRAM_CLK on PG8, FMC_SDCLK; pedals CORE-BRIEF.md:352 @5b926d0); PG8 is LQFP-176 position 112 in ST's pin data"),
  mcuDriver("SDRAM_NWE", "46", "PH5", "circuits/h7-platform/module-pins.ts:68 (SDRAM_NWE on PH5, FMC_SDNWE; pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDNWE PC0 to PH5; CORE-BRIEF.md:353 gave PC0); PH5 is LQFP-176 position 46 in ST's pin data"),
  mcuDriver("SDRAM_NRAS", "59", "PF11", "circuits/h7-platform/module-pins.ts:69 (SDRAM_NRAS on PF11, FMC_SDNRAS; pedals CORE-BRIEF.md:354 @5b926d0); PF11 is LQFP-176 position 59 in ST's pin data"),
  mcuDriver("SDRAM_NCAS", "160", "PG15", "circuits/h7-platform/module-pins.ts:70 (SDRAM_NCAS on PG15, FMC_SDNCAS; pedals CORE-BRIEF.md:355 @5b926d0); PG15 is LQFP-176 position 160 in ST's pin data"),
  mcuDriver("SDRAM_CKE", "43", "PH2", "circuits/h7-platform/module-pins.ts:72 (SDRAM_CKE on PH2, FMC_SDCKE0; pedals split spec 2026-10-05-h7-modular-split-design.md:518 (section 6.2, D23): FMC_SDCKE0 PC3_C to PH2; CORE-BRIEF.md:357 gave PC3_C); PH2 is LQFP-176 position 43 in ST's pin data"),
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
