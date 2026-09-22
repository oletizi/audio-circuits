/**
 * Two components at the same schematic coordinates render as one symbol stacked
 * on another, and the trace router visibly struggles around them. No topology
 * or value assertion sees it, because the netlist is correct either way — it is
 * purely a drawing defect, and therefore exactly the kind that survives a full
 * green suite. This turns it into something a test can catch.
 */
import type { AnyCircuitElement } from "circuit-json"
import { parseValue } from "../../lib/passives/units.ts"

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

/** A part whose printed value disagrees with the value it actually carries. */
export interface MisprintedValue {
  readonly name: string
  /** What the module asked for. */
  readonly written: string
  /** What the schematic prints, and what a reader would order. */
  readonly displayed: string
}

const VALUE_FIELDS = ["inductance", "capacitance", "resistance"] as const

/** Components whose `display_*` string parses to a different quantity than
 * their real value.
 *
 * tscircuit formats a display string separately from the value it simulates,
 * and the two can disagree: an inductor written `300mH` carries 0.3 H and
 * prints "300H", a thousand times the real part. Every value assertion in this
 * suite reads the simulated value, so the whole suite is blind to it — and the
 * printed string is the one a human reads off the schematic and orders parts
 * from. Writing the value in henries with a decimal point avoids it.
 */
export function misprintedValues(
  circuitJson: readonly AnyCircuitElement[],
): MisprintedValue[] {
  const wrong: MisprintedValue[] = []
  for (const element of circuitJson) {
    if (element.type !== "source_component") continue
    const record: Record<string, unknown> = { ...element }
    for (const field of VALUE_FIELDS) {
      const written = record[field]
      const displayed = record[`display_${field}`]
      if (typeof written !== "string" || typeof displayed !== "string") continue
      if (parseValue(written) === parseValue(displayed)) continue
      wrong.push({ name: element.name, written, displayed })
    }
  }
  return wrong
}
