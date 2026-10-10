/**
 * What a board needs, derived from its circuit - never typed by hand, so it
 * cannot fall out of step with the circuit as the circuit changes.
 *
 * Components with identical requirements share one line: the same kind,
 * value, taper, part type and footprint. A resistor line's required power is the
 * MAXIMUM over every designator it covers, so the one part chosen for the
 * line meets every instance's operating point, not just the first one seen.
 *
 * A panel pot (`isPanelPot`) is two purchases sharing one designator: the pot
 * itself, off-board, and the header on the board that reaches it - so it
 * yields two lines, one per placement.
 *
 * Design: docs/superpowers/specs/2026-09-30-bom-design.md
 */
import type {
  CapacitorComponent, Component, ComponentKind, PotentiometerComponent, ResistorComponent,
} from "../../lib/model/types.ts"
import { valueFor } from "../../lib/kicad/value-notation.ts"
import { isPanelPot, type BoardCircuit } from "../perfboard/board-circuit.ts"
import { physicalFor } from "./footprints.ts"
import { requiredCapacitorVolts, requiredResistorWatts } from "./ratings.ts"
import type { BomLine, Physical } from "./types.ts"

/** Kinds this table has no rule for; a board using one of these is refused rather than guessed at. */
const UNSUPPORTED_KINDS: ReadonlySet<ComponentKind> = new Set([
  "switch", "diode", "inductor", "photoresistor", "opamp", "ic",
])

function isResistor(component: Component): component is ResistorComponent {
  return component.kind === "resistor"
}
function isCapacitor(component: Component): component is CapacitorComponent {
  return component.kind === "capacitor"
}
function isPotentiometer(component: Component): component is PotentiometerComponent {
  return component.kind === "potentiometer"
}

/** R2 before R10: letters, then the number, then the text as a tie-break. */
function compareRefs(a: string, b: string): number {
  const split = (ref: string): readonly [string, number] => {
    const match = /^(\D*)(\d*)/.exec(ref)
    return [match?.[1] ?? "", Number(match?.[2] ?? "")]
  }
  const [aPrefix, aNumber] = split(a)
  const [bPrefix, bNumber] = split(b)
  return aPrefix.localeCompare(bPrefix) || aNumber - bNumber || a.localeCompare(b)
}

/** "Resistor_THT:R_Axial_DIN0207_..." -> "R_Axial_DIN0207_...": the footprint's name, without its library. */
function footprintName(footprint: string): string {
  const colon = footprint.indexOf(":")
  return colon === -1 ? footprint : footprint.slice(colon + 1)
}

function footprintOf(component: Component): string {
  const footprint = component.part?.footprint
  if (footprint === undefined) {
    throw new Error(
      `component "${component.id}" (kind "${component.kind}") has no footprint, so its parts-list ` +
        'needs cannot be derived. Add a "footprint" to its PartSpec.',
    )
  }
  return footprint
}

function assertSupportedKind(component: Component): void {
  if (UNSUPPORTED_KINDS.has(component.kind)) {
    throw new Error(
      `component "${component.id}" (kind "${component.kind}") has no parts-list rule in ` +
        "tools/bom/needs.ts. Add one, with a test, before deriving needs for a board that uses " +
        "this kind.",
    )
  }
}

/** A 2.54mm header's conventional part name, e.g. 3 pins -> "Conn_01x03" - matching the naming this
 * repository's own header symbols use (Connector_Generic:Conn_01xNN). */
function headerValue(pins: number): string {
  return `Conn_01x${String(pins).padStart(2, "0")}`
}

/** `<kind> <value> [<taper>] [<partType>] <footprint>`. `partType` (the circuit's part number) is
 * dropped when it duplicates `value` - e.g. a bjt's value IS its part number (valueFor's partType
 * fallback), so the key does not repeat it. */
function lineKey(
  kind: ComponentKind, value: string, taper: string | undefined, partType: string | undefined,
  footprintToken: string,
): string {
  const tokens: string[] = [kind, value]
  if (taper !== undefined) tokens.push(taper)
  if (partType !== undefined && partType !== value) tokens.push(partType)
  tokens.push(footprintToken)
  return tokens.join(" ")
}

/** The merged, mutable working state for one line key, before quantities and sorted designators
 * are finalised. */
interface Accumulator {
  readonly placement: "on-board" | "off-board"
  readonly designators: string[]
  readonly kind: ComponentKind
  readonly ohms?: number
  readonly farads?: number
  readonly taper?: "linear" | "log"
  readonly partType?: string
  readonly physical: Physical
  readonly minVolts?: number
  minWatts?: number
}

/** What one component (or, for a panel pot, one placement of it) contributes to a line. */
interface LineInput {
  readonly key: string
  readonly placement: "on-board" | "off-board"
  readonly kind: ComponentKind
  readonly ohms?: number
  readonly farads?: number
  readonly taper?: "linear" | "log"
  readonly partType?: string
  readonly physical: Physical
  readonly minVolts?: number
  readonly minWatts?: number
}

function addToGroup(groups: Map<string, Accumulator>, ref: string, input: LineInput): void {
  const existing = groups.get(input.key)
  if (existing === undefined) {
    groups.set(input.key, {
      placement: input.placement, designators: [ref], kind: input.kind,
      ohms: input.ohms, farads: input.farads, taper: input.taper, partType: input.partType,
      physical: input.physical, minVolts: input.minVolts, minWatts: input.minWatts,
    })
    return
  }
  existing.designators.push(ref)
  if (input.minWatts !== undefined) {
    existing.minWatts = existing.minWatts === undefined
      ? input.minWatts
      : Math.max(existing.minWatts, input.minWatts)
  }
}

function resistorInput(component: ResistorComponent, dissipation: ReadonlyMap<string, number>): LineInput {
  const footprint = footprintOf(component)
  const watts = dissipation.get(component.id)
  if (watts === undefined) {
    throw new Error(
      `resistor "${component.id}" has no entry in the dissipation map, so its required power ` +
        "cannot be computed. Add its operating-point dissipation (in watts) to the map passed to " +
        "deriveNeeds.",
    )
  }
  const value = valueFor(component)
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, undefined, partType, footprintName(footprint)),
    placement: "on-board", kind: component.kind, ohms: component.parameters.ohms, partType,
    physical: physicalFor(footprint, component, {}),
    minWatts: requiredResistorWatts(watts),
  }
}

function capacitorInput(component: CapacitorComponent, requiredVolts: number): LineInput {
  const footprint = footprintOf(component)
  const value = valueFor(component)
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, undefined, partType, footprintName(footprint)),
    placement: "on-board", kind: component.kind, farads: component.parameters.farads, partType,
    physical: physicalFor(footprint, component, {}),
    minVolts: requiredVolts,
  }
}

/** The panel pot's off-board purchase: the pot itself, by value and taper. There is no real KiCad
 * footprint for an off-board part, so the key's footprint token is the physical kind itself. */
function panelPotInput(component: PotentiometerComponent): LineInput {
  const value = valueFor(component)
  const taper = component.parameters.taper.type
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, taper, partType, "panel-pot"),
    placement: "off-board", kind: component.kind, ohms: component.parameters.ohms, taper, partType,
    physical: { kind: "panel-pot" },
  }
}

/** The panel pot's on-board purchase: the header its off-board pot is wired through. */
function panelPotHeaderInput(component: Component, pinNumbers: BoardCircuit["pinNumbers"]): LineInput {
  const footprint = footprintOf(component)
  const physical = physicalFor(footprint, component, pinNumbers)
  if (physical.kind !== "pin-header") {
    throw new Error(
      `component "${component.id}": a panel pot's footprint "${footprint}" is not a pin header ` +
        `(parsed as "${physical.kind}"), so its on-board line cannot be derived.`,
    )
  }
  const value = headerValue(physical.pins)
  return {
    key: lineKey("connector", value, undefined, undefined, footprintName(footprint)),
    placement: "on-board", kind: "connector", physical,
  }
}

function potentiometerInput(component: PotentiometerComponent): LineInput {
  const footprint = footprintOf(component)
  const value = valueFor(component)
  const taper = component.parameters.taper.type
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, taper, partType, footprintName(footprint)),
    placement: "on-board", kind: component.kind, ohms: component.parameters.ohms, taper, partType,
    physical: physicalFor(footprint, component, {}),
  }
}

function connectorInput(component: Component, pinNumbers: BoardCircuit["pinNumbers"]): LineInput {
  const footprint = footprintOf(component)
  const value = valueFor(component)
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, undefined, partType, footprintName(footprint)),
    placement: "on-board", kind: component.kind, partType,
    physical: physicalFor(footprint, component, pinNumbers),
  }
}

function bjtInput(component: Component, pinNumbers: BoardCircuit["pinNumbers"]): LineInput {
  const footprint = footprintOf(component)
  const value = valueFor(component)
  const partType = component.part?.mpn
  return {
    key: lineKey(component.kind, value, undefined, partType, footprintName(footprint)),
    placement: "on-board", kind: component.kind, partType,
    physical: physicalFor(footprint, component, pinNumbers),
  }
}

/**
 * What a board needs, one line per shared requirement.
 *
 * `highestRailVolts` and `dissipation` come from the board's `bomConditions()`
 * (a later task); here they are taken as given. `dissipation` is keyed by
 * component id and is required for every resistor - a resistor this map does
 * not cover is refused, naming it, rather than assumed safe.
 */
export function deriveNeeds(
  circuit: BoardCircuit,
  highestRailVolts: number,
  dissipation: ReadonlyMap<string, number>,
): readonly BomLine[] {
  const requiredVolts = requiredCapacitorVolts(highestRailVolts)
  const groups = new Map<string, Accumulator>()

  const refs = [...circuit.byRef.keys()].sort(compareRefs)
  for (const ref of refs) {
    const component = circuit.byRef.get(ref)
    if (component === undefined) continue
    assertSupportedKind(component)

    if (isPotentiometer(component) && isPanelPot(component)) {
      addToGroup(groups, ref, panelPotInput(component))
      addToGroup(groups, ref, panelPotHeaderInput(component, circuit.pinNumbers))
      continue
    }
    if (isResistor(component)) {
      addToGroup(groups, ref, resistorInput(component, dissipation))
      continue
    }
    if (isCapacitor(component)) {
      addToGroup(groups, ref, capacitorInput(component, requiredVolts))
      continue
    }
    if (isPotentiometer(component)) {
      addToGroup(groups, ref, potentiometerInput(component))
      continue
    }
    if (component.kind === "bjt") {
      addToGroup(groups, ref, bjtInput(component, circuit.pinNumbers))
      continue
    }
    if (component.kind === "connector") {
      addToGroup(groups, ref, connectorInput(component, circuit.pinNumbers))
      continue
    }
    // assertSupportedKind above only rules out UNSUPPORTED_KINDS; every ComponentKind is one of
    // those, or handled above, so this is unreachable rather than a silent pass-through.
    throw new Error(
      `component "${component.id}" (kind "${component.kind}") has no parts-list rule in ` +
        "tools/bom/needs.ts. Add one, with a test, before deriving needs for a board that uses " +
        "this kind.",
    )
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    placement: group.placement,
    designators: [...group.designators].sort(compareRefs),
    quantity: group.designators.length,
    kind: group.kind,
    ...(group.ohms !== undefined ? { ohms: group.ohms } : {}),
    ...(group.farads !== undefined ? { farads: group.farads } : {}),
    ...(group.taper !== undefined ? { taper: group.taper } : {}),
    ...(group.partType !== undefined ? { partType: group.partType } : {}),
    physical: group.physical,
    ...(group.minVolts !== undefined ? { minVolts: group.minVolts } : {}),
    ...(group.minWatts !== undefined ? { minWatts: group.minWatts } : {}),
  }))
}
