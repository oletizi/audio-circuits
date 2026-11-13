/**
 * PIN NUMBERS FOR A PACKAGE WITH MORE THAN ONE UNIT (spec C6), read from `part.symbolPins`.
 *
 * A per-kind table (`PIN_NUMBERS[kind][pin]`) cannot number a dual op-amp: both sections name their
 * pins `in+`, `in-` and `out`, so a lookup by kind and pin puts section B on section A's pins - the
 * fault issue 28 finding 1 demonstrated, both inputs landing on `U1.3`. A multi-unit component is
 * therefore numbered from its own part, unit by unit: `symbolPins[<unit name>][<pin>]` for a unit's
 * pin and `symbolPins.package[<pin>]` for a pin the package shares (a supply). Single-unit parts
 * are not touched here; they keep the per-kind path in `./from-network.ts`.
 *
 * **A UNIT PIN IS KEYED `<unit>/<pin>`** wherever a component's pins are listed by one string -
 * `everyPin`, the pin-number map `compareSheetToModel` takes - because the canonical name alone is
 * ambiguous across units. A package pin, and every pin of a single-unit part, keeps its own name,
 * so every existing map is unchanged.
 */
import type { Component, Unit } from "../model/types.ts"

/** The `symbolPins` key a multi-unit package's shared pins are numbered under. */
export const PACKAGE_PINS = "package"

export function isMultiUnit(component: Component): boolean {
  return component.units.length > 1
}

/** The one string a pin is listed under: `<unit>/<pin>` for a unit pin of a multi-unit part. */
export function pinKey(component: Component, unit: Unit | undefined, pin: string): string {
  return unit !== undefined && isMultiUnit(component) ? `${unit.name}/${pin}` : pin
}

const TABLES = new WeakMap<Component, ReadonlyMap<string, string>>()

/** One `symbolPins` entry checked to number exactly `pins` - no pin missing, none extra. */
function checkedEntry(
  component: Component,
  table: Readonly<Record<string, Readonly<Record<string, string>>>>,
  key: string,
  pins: readonly string[],
  where: (pin: string) => string,
): ReadonlyMap<string, string> {
  const entry = table[key] ?? {}
  const numbers = new Map<string, string>()
  for (const pin of pins) {
    const number = entry[pin]
    if (number === undefined) {
      throw new Error(
        `component "${component.id}": ${where(pin)} has no entry in part.symbolPins.${key}, so it has ` +
          "no KiCad pin number. Add it, read off the symbol's own unit in the installed library. It " +
          "is not defaulted: a guessed number puts this pin's net on a pin of another section.",
      )
    }
    numbers.set(pin, number)
  }
  const extra = Object.keys(entry).filter((pin) => !pins.includes(pin))
  if (extra.length > 0) {
    throw new Error(
      `component "${component.id}": part.symbolPins.${key} numbers ${extra.map((p) => `"${p}"`).join(", ")}, ` +
        `which ${extra.length === 1 ? "is not a pin" : "are not pins"} of ${key === PACKAGE_PINS ? "the package" : `unit "${key}"`}. ` +
        "A number for a pin the model does not have is a mapping nobody is applying; remove it or " +
        "add the pin to the model.",
    )
  }
  return numbers
}

/**
 * The component's pin key -> KiCad pin number, from `part.symbolPins`, checked whole: every unit
 * and package pin numbered, nothing numbered that the model lacks, no key but the units and
 * `package`, and no number given to two pins. Refuses a component with no `symbolPins`, naming it
 * and its units.
 */
export function symbolPinTable(component: Component): ReadonlyMap<string, string> {
  const cached = TABLES.get(component)
  if (cached !== undefined) return cached
  const units = component.units.map((u) => u.name)
  const table = component.part?.symbolPins
  if (table === undefined) {
    throw new Error(
      `component "${component.id}" has units ${units.join(", ")}: a package with more than one unit, ` +
        "and it declares no part.symbolPins. A per-kind PIN_NUMBERS table cannot number it - every " +
        "section names its pins alike, so they would all land on the first section's pins. Declare " +
        `part.symbolPins with one entry per unit (${units.join(", ")}) and "${PACKAGE_PINS}" for the ` +
        "package's shared pins, each read off the symbol's units in the installed library.",
    )
  }
  if (units.includes(PACKAGE_PINS)) {
    throw new Error(`component "${component.id}" has a unit named "${PACKAGE_PINS}", which part.symbolPins reserves for the package's shared pins. Rename the unit.`)
  }
  const stray = Object.keys(table).filter((key) => key !== PACKAGE_PINS && !units.includes(key))
  if (stray.length > 0) {
    throw new Error(
      `component "${component.id}": part.symbolPins has ${stray.map((k) => `"${k}"`).join(", ")}, which ` +
        `${stray.length === 1 ? "is" : "are"} neither a unit (${units.join(", ")}) nor "${PACKAGE_PINS}".`,
    )
  }
  const out = new Map<string, string>()
  const owner = new Map<string, string>()
  const place = (key: string, number: string, what: string): void => {
    const prior = owner.get(number)
    if (prior !== undefined) {
      throw new Error(
        `component "${component.id}": part.symbolPins gives pin number "${number}" to both ${prior} and ` +
          `${what}. One symbol pin carries one net, so two sections numbered alike would be drawn ` +
          "joined. Correct the table against the symbol's units in the installed library.",
      )
    }
    if (out.has(key)) throw new Error(`component "${component.id}": the pin key "${key}" names two pins`)
    owner.set(number, what)
    out.set(key, number)
  }
  const shared = checkedEntry(component, table, PACKAGE_PINS, Object.keys(component.pins), (pin) => `package pin "${pin}"`)
  for (const [pin, number] of shared) place(pin, number, `package pin "${pin}"`)
  for (const unit of component.units) {
    const numbers = checkedEntry(component, table, unit.name, Object.keys(unit.pins), (pin) => `unit "${unit.name}" pin "${pin}"`)
    for (const [pin, number] of numbers) place(pinKey(component, unit, pin), number, `unit "${unit.name}" pin "${pin}"`)
  }
  TABLES.set(component, out)
  return out
}
