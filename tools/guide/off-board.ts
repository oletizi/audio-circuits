/**
 * The board's off-board connections, as edge labels for the layout images
 * and the junction rows of the checklist.
 *
 * Every pin of every connector part (the input, output and power headers)
 * and of every panel pot's header leaves the board, and each is labelled
 * from the circuit, never guessed:
 *
 * - a connector pin whose net is a declared port carries the port's name in
 *   capitals ("INPUT", "OUTPUT"); any other connector pin carries its net
 *   name as the circuit writes it ("GND", "VCC");
 * - a panel pot's pins carry the pot's function and the pot pin the wire
 *   goes to ("DRIVE ccw", "DRIVE wiper", "DRIVE cw"). The function is the
 *   pot's semantic id without its "_pot" suffix, in capitals with spaces
 *   ("transformer_drive_pot" -> "TRANSFORMER DRIVE").
 *
 * The edge labels say what each pin carries, so a header's value label
 * (`valueLabel`) says only what is fitted there.
 */
import type { Component } from "../../lib/model/types.ts"
import { pinNumberFor } from "../../lib/kicad/from-network.ts"
import { noPinLinesMessage, type BoardDump, type Part } from "./dump.ts"
import type { EdgeLabel } from "./render-edges.ts"
import { componentAt, isPanelPot, type BoardCircuit } from "./circuit.ts"

const POT_SUFFIX = "_pot"

function potFunction(component: Component, ref: string): string {
  if (!component.id.endsWith(POT_SUFFIX)) {
    throw new Error(
      `panel pot ${ref} ("${component.id}") has no "${POT_SUFFIX}" suffix on its id, so the guide ` +
        `cannot name its function for the off-board labels. Rename it to "<function>${POT_SUFFIX}".`,
    )
  }
  return component.id.slice(0, -POT_SUFFIX.length).replace(/_/g, " ").toUpperCase()
}

function portNamesByNet(ports: Readonly<Record<string, string>>): ReadonlyMap<string, string> {
  const byNet = new Map<string, string[]>()
  for (const [port, netName] of Object.entries(ports)) {
    byNet.set(netName, [...(byNet.get(netName) ?? []), port.toUpperCase()])
  }
  return new Map([...byNet].map(([netName, names]) => [netName, names.sort().join("/")]))
}

/** Every connected pin of a component, as (canonical pin, net). */
function connectedPins(component: Component): readonly (readonly [string, string])[] {
  const pins: (readonly [string, string])[] = []
  for (const group of [component.pins, ...component.units.map((unit) => unit.pins)]) {
    for (const [pin, connection] of Object.entries(group)) {
      if (connection.kind === "net") pins.push([pin, connection.net])
    }
  }
  return pins
}

/** Refs of the parts whose pins leave the board, in ref order. */
export function offBoardRefs(circuit: BoardCircuit): readonly string[] {
  return [...circuit.byRef]
    .filter(([, component]) => component.kind === "connector" || isPanelPot(component))
    .map(([ref]) => ref)
    .sort()
}

/**
 * Where a part's value is printed (the values image, or the checklist's
 * Value column), and so how much it says.
 */
export type ValueLabelUse = "image" | "checklist"

/**
 * What a part's value label says: what goes in its holes. For every
 * on-board part that is its dump value ("10K", "2N3904"). For a part whose
 * pins leave the board it is the header fitted there - "2-pin header",
 * "3-pin header" - with the pin count read from the part's PIN lines, never
 * from its ref or type. A connector's dump value is a KiCad symbol name
 * ("Conn_01x02") and a panel pot's is the pot's own value, and neither is
 * what the builder fits at those holes. In the checklist, a panel pot's
 * header keeps the pot as context: "3-pin header (25K pot, off-board)".
 *
 * One function for the values image and the checklist, so the two agree.
 */
export function valueLabel(dump: BoardDump, part: Part, circuit: BoardCircuit, use: ValueLabelUse): string {
  const component = componentAt(circuit, part.ref)
  const panelPot = isPanelPot(component)
  if (component.kind !== "connector" && !panelPot) return part.value
  const pins = dump.pins[part.ref] ?? []
  if (pins.length === 0) throw new Error(noPinLinesMessage(part))
  const header = `${pins.length}-pin header`
  return panelPot && use === "checklist" ? `${header} (${part.value} pot, off-board)` : header
}

/**
 * The edge labels for every off-board pin. That each of these parts is on
 * the board is `assertLayoutMatchesCircuit`'s job (circuit.ts), run first.
 */
export function offBoardLabels(circuit: BoardCircuit): readonly EdgeLabel[] {
  const portNames = portNamesByNet(circuit.ports)
  return offBoardRefs(circuit).flatMap((ref) => {
    const component = componentAt(circuit, ref)
    const fn = isPanelPot(component) ? potFunction(component, ref) : undefined
    return connectedPins(component).map(([pin, netName]) => ({
      ref,
      pin: pinNumberFor(component, pin, circuit.pinNumbers),
      text: fn !== undefined ? `${fn} ${pin}` : (portNames.get(netName) ?? netName),
    }))
  })
}
