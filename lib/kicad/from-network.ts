/**
 * Lower a canonical Network into the KiCad vocabulary.
 *
 * The result is an `ImportedNetlist` - the same shape the readers produce -
 * which is what lets the writer's tests compare structured values through the
 * reader rather than comparing text. The package field holds a VeroRoute
 * import string rather than a KiCad footprint name, so the netlist imports
 * with no Part Aliases entry.
 */
import type { Component, Network } from "../model/types.ts"
import type { ImportedComponent, ImportedNetlist } from "./netlist.ts"
import { declaredPinCount, importStringFor } from "./import-string.ts"
import { valueFor } from "./value-notation.ts"

export type PinNumbers = Readonly<Record<string, Readonly<Record<string, string>>>>

function designatorFor(
  component: Component,
  designators: Readonly<Record<string, string>>,
): string {
  const designator = designators[component.id]
  if (designator === undefined) {
    throw new Error(
      `no designator mapped for component "${component.id}". Every component must appear in ` +
        "the circuit's DESIGNATORS map; a part with no designator cannot be matched to a board.",
    )
  }
  return designator
}

function footprintFor(component: Component): string {
  const footprint = component.part?.footprint
  if (footprint === undefined) {
    throw new Error(
      `component "${component.id}" has no part.footprint. The footprint is what yields the ` +
        "VeroRoute import string, which is layout-geometry identity, so it cannot be defaulted.",
    )
  }
  return footprint
}

/**
 * Pin count is a consistency assertion, not a second identity key.
 *
 * A lead span cannot be checked this way - RESISTOR4 spans four grid steps and
 * still has two pins - so only the pin-count-suffixed types are checked, and a
 * disagreement means the part and the footprint disagree about pin count.
 */
function assertPinCount(designator: string, importStr: string, pins: readonly string[]): void {
  const declared = declaredPinCount(importStr)
  if (declared === null) return
  for (const pin of pins) {
    const number = Number(pin)
    if (Number.isFinite(number) && number > declared) {
      throw new Error(
        `part ${designator}: the netlist references pin ${pin}, but its footprint maps to ` +
          `import string "${importStr}", which declares only ${declared} pins. The part and ` +
          "the footprint disagree about pin count.",
      )
    }
  }
}

/** True when `pin` is, by itself, a valid pin number (the `ic`/`connector` case). */
function isPinNumber(pin: string): boolean {
  return /^[0-9]+$/.test(pin)
}

export function pinNumberFor(component: Component, pin: string, pinNumbers: PinNumbers): string {
  const mapped = pinNumbers[component.kind]?.[pin]
  if (mapped !== undefined) return mapped
  if (isPinNumber(pin)) return pin
  throw new Error(
    `component "${component.id}" (kind "${component.kind}") pin "${pin}" has no entry in ` +
      `PIN_NUMBERS["${component.kind}"], and "${pin}" is not itself a valid pin number, so there ` +
      "is nothing to fall back to. Add an entry mapping this canonical pin to the footprint's " +
      "actual pin number in the circuit's PIN_NUMBERS map.",
  )
}

export function toImportedNetlist(
  network: Network,
  designators: Readonly<Record<string, string>>,
  pinNumbers: PinNumbers,
): ImportedNetlist {
  const components: ImportedComponent[] = []
  const nets: Record<string, string[]> = {}
  const seenDesignators = new Map<string, string>()

  for (const component of network.components) {
    const designator = designatorFor(component, designators)
    const previousId = seenDesignators.get(designator)
    if (previousId !== undefined) {
      throw new Error(
        `components "${previousId}" and "${component.id}" both map to designator "${designator}" ` +
          "in DESIGNATORS. Every physical part needs its own designator: sharing one merges both " +
          "parts' pins onto one board position, and the second part is never described to the " +
          "reconciler, so its placement and routing are never verified.",
      )
    }
    seenDesignators.set(designator, component.id)

    const importStr = importStringFor(footprintFor(component))
    components.push({ designator, value: valueFor(component), footprint: importStr })

    const emitted: string[] = []
    const groups = [component.pins, ...component.units.map((unit) => unit.pins)]
    for (const group of groups) {
      for (const [pin, connection] of Object.entries(group)) {
        if (connection.kind === "nc") continue
        const number = pinNumberFor(component, pin, pinNumbers)
        emitted.push(number)
        ;(nets[connection.net] ??= []).push(`${designator}.${number}`)
      }
    }
    assertPinCount(designator, importStr, emitted)
  }

  for (const key of Object.keys(nets)) nets[key] = (nets[key] ?? []).sort()
  return { components, nets }
}
