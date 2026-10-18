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
 * disappear into. Cuts, bridges and wire links carry the numbers from
 * `numbering.ts`, and a part's Value is `valueLabel`'s (off-board.ts), so
 * the checklist and the images agree.
 *
 * **EVERY PART ROW CARRIES ITS MOUNTING, and that column exists because a
 * layout alone does not say it.** A span below the part's flat floor is one
 * the body cannot lie between, so the part has to be STOOD ON END - body
 * perpendicular to the board, one lead straight down, the other folded over
 * and back down beside it. The owner: *"It's standard practice to stand
 * resistors on end when their holes are next to each other."* Standard
 * practice to him, and invisible to anybody else handed the board: without
 * this column a builder sees a resistor in two nearly adjacent holes and no
 * instruction at all. The condition is DERIVED, by
 * `lib/kicad/lead-span-mounting.ts`, from the flat floor the span model
 * already records; nothing here is a judgement about a part.
 *
 * **EVERY LANDING PAD GETS ITS OWN JUNCTION ROW TOO, ALONGSIDE THE HEADER
 * PARTS.** A pad carries no `PART` line - it is a bare wire soldered into a
 * hole, not a mounted component - so the loop over `dump.parts` alone leaves
 * it out, and a board with ten panel-control terminals printed a two-row
 * table. `buildChecklist`'s `pads` and `padLabels` close that: one row per
 * `PadTerminal`, naming the hole and what the wire there IS, in the same
 * words `padLabelOf` gives the layout images. `padLabels` is the one map
 * `tools/guide/packet.ts` builds and hands to both the renderer and this
 * module, so the two can never print two different answers for the same pad.
 */
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { MOUNTING_LABEL, mountingForSpan } from "../../lib/kicad/lead-span-mounting.ts"
import type { Component } from "../../lib/model/types.ts"
import { spanHoles } from "../stripboard/constraints-model.ts"
import { holeName, noPinLinesMessage, type BoardDump, type HolePosition, type NodedHole, type Part, type Pin } from "./dump.ts"
import { numberedBridges, numberedCuts, numberedWires } from "./numbering.ts"
import { valueLabel } from "./off-board.ts"
import { ELECTROLYTIC_PLUS_PIN, isElectrolytic } from "./part-shapes.ts"
import type { PadTerminal } from "./pads.ts"
import type { EdgeLabel } from "./render-edges.ts"
import { componentAt, isPanelPot, type BoardCircuit } from "./circuit.ts"

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

function hole(position: HolePosition): string {
  return holeName(position.row, position.col)
}

function pinLabel(part: Part, component: Component, pin: string, circuit: BoardCircuit): string | undefined {
  if (NAMED_PIN_KINDS.has(component.kind)) {
    const names = circuit.pinNumbers[component.kind]
    const name = names === undefined ? undefined : Object.entries(names).find(([, number]) => number === pin)?.[0]
    if (name === undefined) {
      throw new Error(
        `part ${part.ref} ("${component.id}", kind ${component.kind}): the circuit's PIN_NUMBERS has no ` +
          `${component.kind} entry naming pin ${pin}, so the checklist cannot say which lead goes in ` +
          `${part.ref}'s pin ${pin} hole. Add it to PIN_NUMBERS["${component.kind}"].`,
      )
    }
    return name
  }
  if (component.kind === "capacitor" && isElectrolytic(part.type)) {
    return pin === ELECTROLYTIC_PLUS_PIN ? "+" : "-"
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
    throw new Error(noPinLinesMessage(part))
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

const PART_COLUMNS = ["Part", "Value", "Leads", "Mounting"]

/**
 * What the Mounting cell says when the mounting cannot be DERIVED, and why each
 * is a sentence rather than an empty cell.
 *
 * An empty cell would be the exact failure this column was added to fix: a
 * builder reading nothing where an instruction belongs cannot tell "no mounting
 * is required of you" from "nobody worked it out". So the two gaps say which
 * gap they are. Neither is a guess and neither is a default - `PAR2`'s rule,
 * applied to a build sheet instead of to a bound.
 *
 * `NO_FOOTPRINT` is the ordinary case for a panel-mount part: the circuit
 * records a symbol and no footprint, VeroRoute expands it into one-hole pads,
 * and there is no body to mount either way. `NO_SPAN` is a footprint that is in
 * neither `LEAD_SPANS` nor the geometry it would need - `pt2399-core`'s disc
 * ceramics and phi5 cans are live examples, listed in `UNSOURCED` with what is
 * missing from each, and that is the file to fix.
 */
const NO_FOOTPRINT = "unknown: the circuit records no footprint for this part"
const NO_SPAN = "unknown: no lead span recorded (lib/kicad/lead-span.ts)"

/**
 * The Mounting cell for a landing pad - a wire soldered straight into a hole,
 * with no body and no footprint to decide a mounting FOR. `NO_FOOTPRINT` would
 * be the wrong message here: that cell names a GAP (a part waiting on
 * footprint data this project has not recorded yet), and a pad is not waiting
 * on anything - there is categorically no part to mount. Saying so in its own
 * words keeps the real gaps legible as gaps.
 */
const PAD_NO_MOUNTING = "n/a: a landing pad has no body to mount"

/**
 * Which mounting this part's span requires, as the builder reads it.
 *
 * **IT READS THE SPAN OFF THE HOLES AND NOTHING OFF A `PART` LINE's `SPAN`.**
 * `spanHoles` is `tools/stripboard/constraints-model.ts`'s, the same reading
 * `HC4`, `HC5` and `HC9` are graded on, imported rather than copied: a build
 * sheet and the grader disagreeing about how wide a part sits would be two
 * answers about one board. `undefined` from it means the part has other than
 * two leads, so its span is fixed by a moulded pin field - one mounting, with
 * nothing to decide.
 *
 * `LEAD_SPANS.get` RATHER THAN `leadSpanFor`, which is the one deliberate
 * difference from the grader: `leadSpanFor` refuses an unrecorded footprint,
 * which is right for a check and wrong here - a build packet that refused
 * outright would leave `pt2399-core` with no printable guide at all over twelve
 * disc ceramics whose mounting was never in question. The gap is NAMED in the
 * cell instead (`NO_SPAN`), which keeps it visible without making it fatal. The
 * two accessors agree wherever a span IS recorded, because `leadSpanFor`'s
 * first act is this same lookup.
 */
function mountingCell(component: Component, pins: readonly Pin[]): string {
  const footprint = component.part?.footprint
  if (footprint === undefined) return NO_FOOTPRINT
  const holes = spanHoles(pins)
  if (holes === undefined) return MOUNTING_LABEL["one-mounting"]
  const span = LEAD_SPANS.get(footprint)
  if (span === undefined) return NO_SPAN
  return MOUNTING_LABEL[mountingForSpan(span, holes)]
}

/**
 * One landing pad's junction row: which part it is, that it is a bare
 * landing pad rather than a mounted part, the hole and what the wire there
 * IS (`PadTerminal.identity` looked up in `padLabels`, the same map
 * `tools/guide/packet.ts` builds once from `padLabelOf` and hands to the
 * images), and that there is no mounting question to answer.
 *
 * `padLabels` is REUSED rather than re-derived: `packet.ts` builds it once
 * from `padLabelOf` for the renderer, and a checklist that called
 * `padLabelOf` again itself would be a second place a pad's label could
 * drift from the one printed beside its ring in the image - exactly the
 * "one packet, two artifacts disagreeing" defect this row exists to end.
 * A pad missing from the map is refused by name: silently leaving the row
 * out would reproduce that same defect in a new place.
 */
function padJunctionRow(pad: PadTerminal, padLabels: ReadonlyMap<string, string>): readonly string[] {
  const label = padLabels.get(pad.identity)
  if (label === undefined) {
    throw new Error(
      `pad ${pad.identity} has no entry in the checklist's pad-label map, so the junction table ` +
        "cannot say what its wire is. Fix it in tools/guide/packet.ts, where padLabels is built " +
        "from padLabelOf for every pad passed to renderLayout - the checklist and the images must " +
        "be handed the same map so they cannot disagree about what a pad's wire is.",
    )
  }
  return [pad.ref, "landing pad", `${holeName(pad.row, pad.col)} ${label}`, PAD_NO_MOUNTING]
}

/** The whole checklist. The layout and circuit must already agree (`assertLayoutMatchesCircuit`). */
export function buildChecklist(
  dump: BoardDump,
  circuit: BoardCircuit,
  edges: readonly EdgeLabel[],
  pads: readonly PadTerminal[],
  padLabels: ReadonlyMap<string, string>,
): readonly ChecklistSection[] {
  const groups: Record<PartGroup, (readonly string[])[]> = {
    semiconductors: [], resistors: [], capacitors: [], junctions: [],
  }
  const parts = [...dump.parts].sort((a, b) => compareRefs(a.ref, b.ref))
  for (const part of parts) {
    const component = componentAt(circuit, part.ref)
    groups[groupOf(part, component)].push([
      part.ref,
      valueLabel(dump, part, circuit, "checklist"),
      leads(dump, part, component, circuit, edges),
      mountingCell(component, dump.pins[part.ref] ?? []),
    ])
  }
  // EVERY OFF-BOARD TERMINAL GETS ITS OWN JUNCTION ROW, alongside whatever
  // header-type PART rows the loop above already found. A pad has no PART
  // line (`./pads.ts`'s module comment), so without this it is a terminal
  // the layout image draws a solder ring for and the checklist says nothing
  // about - the defect `docs/known-gaps.md` and this module's own comment
  // both name.
  for (const pad of pads) groups.junctions.push(padJunctionRow(pad, padLabels))
  const wires = numberedWires(dump).map(({ number, from, to }) => [`W${number}`, hole(from), hole(to)])
  return [
    { title: "ICs and transistors", columns: PART_COLUMNS, rows: groups.semiconductors },
    { title: "Resistors and trim-pots", columns: PART_COLUMNS, rows: groups.resistors },
    { title: "Capacitors", columns: PART_COLUMNS, rows: groups.capacitors },
    { title: "Wire links", columns: ["Wire", "From", "To"], rows: wires },
    {
      title: "Wire-to-board junctions",
      columns: ["Part", "Value", "Connections", "Mounting"],
      rows: groups.junctions,
    },
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
