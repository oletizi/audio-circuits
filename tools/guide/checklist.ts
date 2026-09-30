/**
 * The build checklist, in the operator's order of operations: ICs and
 * transistors; resistors (with trim-pots); capacitors; wire links;
 * wire-to-board junctions (headers, test points, panel-pot headers); solder
 * bridges; cuts last.
 *
 * A part's group comes from what the circuit says it is (its kind) and,
 * for a potentiometer, from what VeroRoute fits (a trim-pot type goes with
 * the resistors, a panel pot's header with the junctions). A part that fits
 * no group is refused, naming it: there is no "other" bucket for a part to
 * disappear into. Cuts and bridges carry the numbers from `numbering.ts`,
 * so the checklist and the images agree.
 */
import type { Component } from "../../lib/model/types.ts"
import { holeName, type BoardDump, type HolePosition, type NodedHole, type Part } from "./dump.ts"
import { numberedBridges, numberedCuts } from "./numbering.ts"
import type { EdgeLabel } from "./render-edges.ts"
import { isPanelPot, type BoardCircuit } from "./circuit.ts"

/** One checklist step: a heading, its column headings, and one row per item to tick. */
export interface ChecklistSection {
  readonly title: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

type PartGroup = "semiconductors" | "resistors" | "capacitors" | "junctions"

const SEMICONDUCTOR_KINDS = new Set(["bjt", "opamp", "ic"])
/** Kinds whose canonical pin names say which lead is which. */
const NAMED_PIN_KINDS = new Set(["bjt", "potentiometer"])

function componentFor(part: Part, circuit: BoardCircuit): Component {
  const component = circuit.byRef.get(part.ref)
  if (component === undefined) {
    throw new Error(
      `the layout has part ${part.ref} (${part.type} ${part.value}), which the circuit has no ` +
        "component for. Run `make update` to bring the layout in step with the circuit.",
    )
  }
  return component
}

function groupOf(part: Part, component: Component): PartGroup {
  if (SEMICONDUCTOR_KINDS.has(component.kind)) return "semiconductors"
  if (component.kind === "resistor") return "resistors"
  if (component.kind === "capacitor") return "capacitors"
  if (component.kind === "connector") return "junctions"
  if (component.kind === "potentiometer") {
    if (isPanelPot(component)) return "junctions"
    if (part.type.startsWith("TRIM")) return "resistors"
  }
  throw new Error(
    `part ${part.ref} ("${component.id}", kind ${component.kind}, VeroRoute type ${part.type}) fits ` +
      "none of the build checklist's steps (ICs and transistors; resistors and trim-pots; " +
      "capacitors; wire-to-board junctions). Add a step for it in tools/guide/checklist.ts - the " +
      "guide will not leave a part off the list.",
  )
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

function compareHoles(a: HolePosition, b: HolePosition): number {
  return a.row - b.row || a.col - b.col
}

function hole(position: HolePosition): string {
  return holeName(position.row, position.col)
}

function pinLabel(part: Part, component: Component, pin: string, circuit: BoardCircuit): string | undefined {
  if (NAMED_PIN_KINDS.has(component.kind)) {
    const names = circuit.pinNumbers[component.kind] ?? {}
    return Object.entries(names).find(([, number]) => number === pin)?.[0]
  }
  if (component.kind === "capacitor" && part.type.startsWith("CAP_ELECTRO")) {
    return pin === "1" ? "+" : "-"
  }
  return undefined
}

/** Each lead's hole, in pin order, with what that lead is where the circuit says. */
function leads(
  dump: BoardDump,
  part: Part,
  component: Component,
  circuit: BoardCircuit,
  edges: readonly EdgeLabel[],
): string {
  const pins = dump.pins[part.ref]
  if (pins === undefined || pins.length === 0) {
    throw new Error(`part ${part.ref} has no PIN lines in the dump, so its leads' holes are unknown`)
  }
  return [...pins]
    .sort((a, b) => compareRefs(a.pin, b.pin))
    .map((pin) => {
      const at = holeName(pin.row, pin.col)
      const edge = edges.find((label) => label.ref === part.ref && label.pin === pin.pin)
      if (edge !== undefined) return `${at} ${edge.text}`
      const name = pinLabel(part, component, pin.pin, circuit)
      return name === undefined ? at : `${name} ${at}`
    })
    .join(", ")
}

function netName(dump: BoardDump, at: NodedHole): string {
  const name = dump.nodes[at.nodeId]
  if (name === undefined || name === "-") {
    throw new Error(
      `the cut at ${hole(at)} is on node ${at.nodeId}, which the dump ` +
        `${name === undefined ? "never declares" : "stores no net name for"}, so the checklist ` +
        "cannot say which nets that cut separates. Run `make update` so the layout's nets carry " +
        "the circuit's names.",
    )
  }
  return name
}

const PART_COLUMNS = ["Part", "Value", "Leads"]

export function buildChecklist(
  dump: BoardDump,
  circuit: BoardCircuit,
  edges: readonly EdgeLabel[],
): readonly ChecklistSection[] {
  const groups: Record<PartGroup, (readonly string[])[]> = {
    semiconductors: [], resistors: [], capacitors: [], junctions: [],
  }
  const parts = [...dump.parts].sort((a, b) => compareRefs(a.ref, b.ref))
  for (const part of parts) {
    const component = componentFor(part, circuit)
    groups[groupOf(part, component)].push([part.ref, part.value, leads(dump, part, component, circuit, edges)])
  }
  const wires = dump.wires
    .map((wire): readonly [HolePosition, HolePosition] => {
      const [a, b] = wire.ends
      return compareHoles(a, b) <= 0 ? [a, b] : [b, a]
    })
    .sort((x, y) => compareHoles(x[0], y[0]) || compareHoles(x[1], y[1]))
    .map(([a, b], index) => [`W${index + 1}`, hole(a), hole(b)])
  return [
    { title: "ICs and transistors", columns: PART_COLUMNS, rows: groups.semiconductors },
    { title: "Resistors and trim-pots", columns: PART_COLUMNS, rows: groups.resistors },
    { title: "Capacitors", columns: PART_COLUMNS, rows: groups.capacitors },
    { title: "Wire links", columns: ["Wire", "From", "To"], rows: wires },
    { title: "Wire-to-board junctions", columns: ["Part", "Value", "Connections"], rows: groups.junctions },
    {
      title: "Solder bridges",
      columns: ["Bridge", "Joins"],
      rows: numberedBridges(dump).map(({ number, bridge }) => [`B${number}`, `${hole(bridge.a)} to ${hole(bridge.b)}`]),
    },
    {
      title: "Cuts",
      columns: ["Cut", "Between", "Separates"],
      rows: numberedCuts(dump).map(({ number, cut }) => [
        String(number),
        `${hole(cut.a)} and ${hole(cut.b)}`,
        `${netName(dump, cut.a)} | ${netName(dump, cut.b)}`,
      ]),
    },
  ]
}
