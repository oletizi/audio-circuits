import { pinNumberFor } from "../../lib/kicad/from-network.ts"
import type { Component, Network } from "../../lib/model/types.ts"

/**
 * A board whose own module supplies its designators and pin numbers, so neither is derived by the
 * Pultec rules in `./sheet-model.ts`. `pinNumbers` is built from the module's own kind-keyed table
 * (`pinNumbersFromTable`); a pin that table does not number refuses and names it.
 */
export interface OwnMappingBoard {
  readonly board: string
  /** The circuit module, repository-relative, checked against the board's own manifest. */
  readonly module: string
  /** The exported builder's name, checked against the board's own manifest. */
  readonly exportName: string
  readonly build: () => Network
  readonly designators: ReadonlyMap<string, string>
  /** Built from the model when asked, so a refusal surfaces in the test that asks and not at import. */
  readonly pinNumbers: (network: Network) => ReadonlyMap<string, ReadonlyMap<string, string>>
}

/** Every pin a component declares, package pins and unit pins together. */
export function everyPin(component: Component): readonly string[] {
  const pins = Object.keys(component.pins)
  for (const unit of component.units) pins.push(...Object.keys(unit.pins))
  return pins
}

/**
 * Component id -> (canonical pin -> number) from a kind-keyed `PIN_NUMBERS`, by the same lookup
 * `lib/kicad/from-network.ts` lowers with, which refuses a pin it cannot number and names it.
 */
export function pinNumbersFromTable(
  network: Network,
  table: Readonly<Record<string, Readonly<Record<string, string>>>>,
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  return new Map(
    network.components.map((component) => [
      component.id,
      new Map(everyPin(component).map((pin) => [pin, pinNumberFor(component, pin, table)])),
    ]),
  )
}
