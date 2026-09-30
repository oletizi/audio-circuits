/**
 * A deterministic order for derived lines within one section of a report or
 * `BOM.md`: kind, then the line's own numeric value - ohms for a resistor or
 * potentiometer, farads for a capacitor, pin count for a pin header
 * connector - then (breaking a tie between two potentiometers of the same
 * value) taper, then the line's key as the final tie-break. A kind with no
 * numeric value of its own (a bjt, keyed by its mpn) falls straight through
 * to the key.
 *
 * `key.localeCompare()` alone sorts by the key's TEXT, which is not this
 * order: "resistor 100k ..." sorts before "resistor 47k ..." because "1" <
 * "4", the wrong way round for someone reading the sheet. Controller ruling,
 * .superpowers/sdd/2026-09-30-bom/task-4-review.md ("by kind, then by
 * numeric value (47k before 100k), not by the key's text").
 */
import type { BomLine } from "./types.ts"

function sortValue(line: BomLine): number | undefined {
  if (line.kind === "resistor" || line.kind === "potentiometer") return line.ohms
  if (line.kind === "capacitor") return line.farads
  if (line.kind === "connector" && line.physical.kind === "pin-header") return line.physical.pins
  return undefined
}

/** Kind, then numeric value, then taper, then key - a total order over any set of
 * lines, so the same input always sorts the same way. */
export function compareLines(a: BomLine, b: BomLine): number {
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)

  const aValue = sortValue(a)
  const bValue = sortValue(b)
  if (aValue !== undefined && bValue !== undefined && aValue !== bValue) {
    return aValue - bValue
  }

  const aTaper = a.taper ?? ""
  const bTaper = b.taper ?? ""
  if (aTaper !== bTaper) return aTaper.localeCompare(bTaper)

  return a.key.localeCompare(b.key)
}

export function sortLines(lines: readonly BomLine[]): readonly BomLine[] {
  return [...lines].sort(compareLines)
}
