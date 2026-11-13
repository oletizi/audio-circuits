/**
 * Checks the h7-module tests share: a component against its KiCad symbol, and U_MCU's 176 pins
 * against what each pin's function requires.
 *
 * The MCU oracle here is written from the sources, NOT from `circuits/h7-platform/module/mcu.ts`:
 * the supply table below is transcribed from processor-and-memory.md section 4 and section 8 and
 * schematic-checklist.md CORE-01 to CORE-12, the signal pins come from `MODULE_PINS` and the contract's
 * `moduleMcuPin`, and the pin list from ST's data. A model that built its MCU some other way is
 * still held to this.
 */
import fs from "node:fs"
import type { Component, Connection } from "../../lib/model/index.ts"
import { everyPin, pinNumberFor } from "../../lib/kicad/from-network.ts"
import type { PinNumbers } from "../../lib/kicad/from-network.ts"
import { librarySymbols, splitLibId, symbolUnitPins } from "../../lib/kicad/symbol-library.ts"
import { installedSymbolNames, installedSymbolUnitPins } from "../kicad/symbol-library-disk.ts"
import { loadContract } from "../../circuits/h7-platform/contract.ts"
import { MODULE_PINS } from "../../circuits/h7-platform/module-pins.ts"
import { PROJECT_SYMBOL_LIBRARY } from "../../circuits/h7-platform/parts.ts"
import { loadPinData, portName } from "../../circuits/h7-platform/st-pin-data.ts"

const PROJECT_NICKNAME = "h7-platform"

/** A symbol's pins, number -> name, every unit merged (a multi-unit symbol is one package): the project library for `h7-platform:`, the installed KiCad otherwise. */
export function pinsOf(libId: string): ReadonlyMap<string, string> {
  const { library, name } = splitLibId(libId)
  if (library === PROJECT_NICKNAME) {
    const blockText = librarySymbols(fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8")).get(name)
    if (blockText === undefined) throw new Error(`${PROJECT_SYMBOL_LIBRARY} defines no symbol "${name}"`)
    return new Map(symbolUnitPins(blockText).flatMap((u) => u.pins.map((p): [string, string] => [p.number, p.name])))
  }
  return new Map(installedSymbolUnitPins(libId).flatMap((u) => u.pins.map((p): [string, string] => [p.number, p.name])))
}

export function symbolExists(libId: string): boolean {
  const { library, name } = splitLibId(libId)
  if (library === PROJECT_NICKNAME) return fs.readFileSync(PROJECT_SYMBOL_LIBRARY, "utf8").includes(`(symbol "${name}"`)
  return installedSymbolNames(libId).has(name)
}

function allPins(c: Component): [string, Connection][] {
  return [...Object.entries(c.pins), ...c.units.flatMap((u) => Object.entries(u.pins))]
}

/**
 * NDK 2008E_NX3225GA_e as processor-and-memory.md:116 quotes it: pads 1 and 3 are the crystal, pads
 * 2 and 4 "unconnected inside" ("better to connect with a GND"); `Device:Crystal_GND24` names them so.
 */
const CRYSTAL_GND24: Readonly<Record<string, string>> = { "1": "1", "2": "G", "3": "3", "4": "G" }

/**
 * A pin name with KiCad's subscript markup rendered (`V_{CC}` -> `VCC`), both sides alike: the rule
 * CR-PEDAL-PIN-MATCH states for the pedal, and a no-op for the module's names, which carry none.
 */
function rendered(name: string | undefined): string | undefined {
  return name?.replace(/_\{([^}]*)\}/g, "$1")
}

/**
 * Every problem with one component against its symbol: the symbol missing, a model pin on no
 * symbol pin, a symbol pin the model does not list, or an `ic` pin whose symbol name is not the
 * datasheet's (the MCU against ST's pin data). Empty is a pass.
 */
export function symbolProblems(
  c: Component,
  pinNumbers: PinNumbers,
  datasheetNames: Readonly<Record<string, Readonly<Record<string, string>>>>,
): string[] {
  const symbol = c.part?.symbol
  if (symbol === undefined) return [`${c.id} has no part.symbol`]
  if (!symbolExists(symbol)) return [`${c.id}: symbol ${symbol} is not in the installed KiCad libraries or the project library`]
  const pins = pinsOf(symbol)
  const problems: string[] = []
  const numbers = everyPin(c).map((pin) => pinNumberFor(c, pin, pinNumbers))
  const sortedModel = [...numbers].sort().join(",")
  const sortedSymbol = [...pins.keys()].sort().join(",")
  if (sortedModel !== sortedSymbol) problems.push(`${c.id}: model pins [${sortedModel}] are not the symbol's [${sortedSymbol}]`)
  if (c.kind !== "ic") return problems
  if (symbol === "MCU_ST_STM32H7:STM32H743IITx") {
    for (const p of loadPinData().pins) {
      const name = pins.get(String(p.position))
      if (name === undefined || !(name.startsWith(portName(p)) || name === p.name)) {
        problems.push(`${c.id}: symbol pin ${p.position} is "${name}", ST names it ${p.name}`)
      }
    }
    return problems
  }
  const names = symbol === "Device:Crystal_GND24" ? CRYSTAL_GND24 : datasheetNames[symbol]
  if (names === undefined) return [...problems, `${c.id}: no datasheet pin names are recorded for ${symbol}`]
  for (const n of numbers) {
    if (rendered(pins.get(n)) !== rendered(names[n])) problems.push(`${c.id}: pin ${n} is "${pins.get(n)}" on the symbol, "${names[n]}" in the datasheet`)
  }
  return problems
}

/**
 * The net each MCU supply, reset and boot pin must be on, by ST's pin name. `3V3_D`, `VREF_A` and
 * `GND` are the contract's names for the documents' 3V3, VDDA and VSS (contract pins 38, 21, 20).
 */
export const REQUIRED_SUPPLY: Readonly<Record<string, string>> = {
  VDD: "3V3_D", // processor-and-memory.md:137, CORE-01
  VSS: "GND", // CORE-03
  VSSA: "VSSA", // :138, joined to GND through the 0 ohm (CORE-08)
  VDDA: "VREF_A", // :138, :40 (D16)
  "VREF+": "VREF_A", // :138
  VCAP: "VCAP", // :136
  PDR_ON: "3V3_D", // :135
  VBAT: "3V3_D", // :137
  VDD33_USB: "3V3_D", // :128, :137
  NRST: "NRST", // :264
  BOOT0: "BOOT0", // :265
}

/** Position -> the net it must be on, for every pin a function requires. */
export function requiredMcuNets(): ReadonlyMap<number, string> {
  const data = loadPinData()
  const byPort = new Map(data.pins.map((p) => [portName(p), p]))
  const required = new Map<number, string>()
  for (const p of data.pins) {
    const net = REQUIRED_SUPPLY[p.name]
    if (net !== undefined) required.set(p.position, net)
  }
  const signal = (pin: string, net: string): void => {
    const p = byPort.get(pin) ?? data.pins.find((x) => x.name === pin)
    if (p === undefined) throw new Error(`${pin} is not an ST pin`)
    required.set(p.position, net)
  }
  for (const a of MODULE_PINS) signal(a.pin, a.net)
  for (const cp of loadContract().pins) {
    if (cp.moduleMcuPin !== null && cp.signal !== null) signal(cp.moduleMcuPin, cp.signal)
  }
  return required
}

/**
 * Every problem with U_MCU's pins: a position with no entry, a stray entry, a required pin not on
 * its net (NC never stands in for one), and an unrequired pin that is not an NC GPIO.
 */
export function mcuPinProblems(mcu: Component): string[] {
  const data = loadPinData()
  const required = requiredMcuNets()
  const pins = new Map(allPins(mcu))
  const problems: string[] = []
  const positions = new Set(data.pins.map((p) => String(p.position)))
  for (const key of pins.keys()) if (!positions.has(key)) problems.push(`entry "${key}" is not an LQFP-176 position`)
  for (const p of data.pins) {
    const c = pins.get(String(p.position))
    const where = `pin ${p.position} (${p.name})`
    if (c === undefined) {
      problems.push(`${where} has no entry`)
      continue
    }
    const want = required.get(p.position)
    if (want !== undefined) {
      if (c.kind !== "net" || c.net !== want) problems.push(`${where} must be on ${want}, found ${c.kind === "nc" ? "NC" : c.net}`)
      continue
    }
    if (c.kind !== "nc") problems.push(`${where} serves no function and must be NC (CORE-27), found ${c.net}`)
    if (p.type !== "I/O") problems.push(`${where} is a ${p.type} pin and only a GPIO may be NC`)
  }
  return problems
}

/** The ports of the NC pins, in position order. */
export function mcuNcPorts(mcu: Component): string[] {
  const pins = new Map(allPins(mcu))
  return loadPinData().pins
    .filter((p) => pins.get(String(p.position))?.kind === "nc")
    .sort((a, b) => a.position - b.position)
    .map((p) => portName(p))
}

/** A copy of `c` with one pin replaced, or removed when `to` is undefined. */
export function withPin(c: Component, pin: string, to: Connection | undefined): Component {
  return {
    ...c,
    units: c.units.map((u) => ({
      ...u,
      pins: Object.fromEntries(Object.entries(u.pins).flatMap(([k, v]): [string, Connection][] =>
        k !== pin ? [[k, v]] : to === undefined ? [] : [[k, to]])),
    })),
  }
}

/**
 * The MCU pins nothing uses, by port, in LQFP position order: 140 I/O less 52 MODULE_PINS less 31
 * interface ports. Written out so that a pin a new function needs, left NC, changes this list.
 */
export const EXPECTED_NC_PORTS: readonly string[] = [
  "PE2", "PE3", "PE4", "PE5", "PE6", "PI8", "PC13", "PC14", "PC15", "PI9", "PI10", "PI11", "PC3_C", "PH4",
  "PC5", "PB0", "PB2", "PB11", "PH6", "PH7", "PH8", "PH9", "PH10", "PH11", "PH12", "PB13", "PD12", "PD13",
  "PG3", "PG6", "PG7", "PC6", "PC7", "PA8", "PA9", "PA10", "PH13", "PH14", "PH15", "PI0", "PI1", "PI2",
  "PI3", "PA15", "PD3", "PD4", "PD5", "PD6", "PD7", "PG12", "PG13", "PG14", "PB3", "PI4", "PI5", "PI6", "PI7",
]
