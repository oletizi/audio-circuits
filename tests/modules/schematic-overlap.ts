/**
 * Two components at the same schematic coordinates render as one symbol stacked
 * on another, and the trace router visibly struggles around them. No topology
 * or value assertion sees it, because the netlist is correct either way — it is
 * purely a drawing defect, and therefore exactly the kind that survives a full
 * green suite. This turns it into something a test can catch.
 */
import type { AnyCircuitElement } from "circuit-json"

export interface Overlap {
  /** The shared coordinates, as `x,y`. */
  readonly at: string
  /** Every component name drawn there, sorted. */
  readonly names: readonly string[]
}

/** Component names that share schematic coordinates, one entry per collision. */
export function overlappingComponents(
  circuitJson: readonly AnyCircuitElement[],
): Overlap[] {
  const names = new Map<string, string>()
  for (const element of circuitJson) {
    if (element.type === "source_component") {
      names.set(element.source_component_id, element.name)
    }
  }

  const byPosition = new Map<string, string[]>()
  for (const element of circuitJson) {
    if (element.type !== "schematic_component") continue
    const sourceId = element.source_component_id
    if (sourceId === undefined) {
      throw new Error(
        `Schematic component ${element.schematic_component_id} carries no source_component_id`,
      )
    }
    const name = names.get(sourceId)
    if (name === undefined) {
      throw new Error(
        `Schematic component ${element.schematic_component_id} has no source component`,
      )
    }
    const at = `${element.center.x},${element.center.y}`
    const group = byPosition.get(at)
    if (group === undefined) byPosition.set(at, [name])
    else group.push(name)
  }

  return [...byPosition]
    .filter(([, group]) => group.length > 1)
    .map(([at, group]) => ({ at, names: [...group].sort() }))
}
