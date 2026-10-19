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
 * **A PART THAT RESOLVES TO 0 Ω IS LISTED AMONG THE WIRE LINKS, NOT AMONG THE
 * RESISTORS.** A level pot at its end stop puts its whole track in one half and
 * nothing in the other, and the zero half is emitted as a `resistor` with
 * `ohms: 0` on purpose (`lib/model/control-state.ts:293-297`). On a stripboard
 * what goes in those two holes is a wire or a solder bridge, which is what the
 * board's own `wiring.md` has always said - while this sheet listed `0R` with
 * mounting `STAND ON END`, two generated documents contradicting each other
 * about one part. `./wire-links.ts` holds the rule's words and the owner's
 * statement of what the contradiction cost; `lib/model/zero-ohm.ts` is the one
 * place that decides what zero ohms means. **Which SECTION such a row belongs
 * in is a question about the printed artifact**, so it is the existing **Wire
 * links** section - the smallest claim available - and not a new section
 * invented here.
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
 *
 * **THE CUTS SECTION'S `Separates` COLUMN NAMES WHAT A CUT SEPARATES, NOT
 * THE NET'S INTERNAL NAME.** It used to print the ladder net name a `NODE`
 * line carries - `j10_p1 | j10_p2`, `si_hi_boost_j20_p3 | si_hi_cut_j12_p3` -
 * and that name means nothing at a bench: it tells a builder neither which
 * cut they are making nor why (`docs/known-gaps.md`'s now-deleted G36). So
 * the column instead names what is ON each side of the cut: the two nodes'
 * members, each rendered as the part it is (`C18.2`) or, when the member is
 * a pad terminal, by the SAME label the junction rows and the layout images
 * already give it (`padLabels`). `nodeMembers` (`./node-members.ts`) is a
 * map built once in `packet.ts`, the same way `padLabels` is, and handed
 * down rather than re-derived - one packet must not be able to print two
 * different answers for one cut. There is deliberately no path that prints
 * a blank or an invented name for a node this map cannot resolve: `separates`
 * refuses instead, naming the node id and what to fix.
 */
import { LEAD_SPANS } from "../../lib/kicad/lead-span.ts"
import { MOUNTING_LABEL, mountingForSpan } from "../../lib/kicad/lead-span-mounting.ts"
import type { Component } from "../../lib/model/types.ts"
import { isZeroOhmResistor } from "../../lib/model/zero-ohm.ts"
import { spanHoles } from "../stripboard/constraints-model.ts"
import { holeName, noPinLinesMessage, type BoardDump, type HolePosition, type NodedHole, type Part, type Pin } from "./dump.ts"
import { inReadingOrder, numberedBridges, numberedCuts, numberedWires } from "./numbering.ts"
import { valueLabel } from "./off-board.ts"
import { ELECTROLYTIC_PLUS_PIN, isElectrolytic } from "./part-shapes.ts"
import type { PadTerminal } from "./pads.ts"
import type { EdgeLabel } from "./render-edges.ts"
import { componentAt, isPanelPot, type BoardCircuit } from "./circuit.ts"
import { WIRE_LINK_NOTE } from "./wire-links.ts"

/** One checklist step: a heading, its column headings, and one row per item to tick. */
export interface ChecklistSection {
  readonly title: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
  /**
   * One sentence printed under the heading, before the table - `undefined` when
   * the table needs none.
   *
   * IT IS ONLY EVER SET WHEN THE ROWS REQUIRE IT. A note that appeared on every
   * board would be prose nobody checked, which is how a generated document
   * stops being read; the one note that exists (`WIRE_LINK_NOTE`,
   * `./wire-links.ts`) is pushed only when a board actually has a row it is
   * about. `tools/guide/guide.ts` renders it.
   */
  readonly note?: string
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

/**
 * One side of a cut, named by what it separates: the node's members, each
 * rendered as its `padLabels` entry when the member is a pad terminal, or as
 * the member id itself (`C18.2`) otherwise.
 *
 * **WHICH MEMBERS ARE PADS IS DECIDED BY MEMBERSHIP OF `padIdentities`, NOT
 * BY WHETHER `padLabels.get` MISSED.** `tools/guide/pads.ts`'s module
 * comment on `PadTerminal.identity` and this file's own comment on
 * `./node-members.ts` establish that a `NODE` member id and a pad's identity
 * are the SAME string by construction - both are `<ref>.<pin>` in the
 * reference netlist's vocabulary - so a member that IS a pad is known from
 * the set of `pad.identity` values built from `pads`, exactly the way a map
 * miss is never read as "not a pad". A member that is a pad but missing from
 * `padLabels` is `padJunctionRow`'s own fault (`:227-238` above): the two
 * maps must be the one `packet.ts` builds, so a miss there is a construction
 * error in that map, never a reason to fall back to the raw identity.
 *
 * Members are sorted with `compareRefs`, which reads only the letters and
 * digits before a member's `.` (its regex never reaches the dot), so
 * `C1.2, C2.2, C12.2` sorts correctly without stripping the pin suffix
 * first.
 */
function separates(
  at: NodedHole,
  members: ReadonlyMap<string, readonly string[]>,
  padIdentities: ReadonlySet<string>,
  padLabels: ReadonlyMap<string, string>,
): string {
  const nodeMembers = members.get(at.nodeId)
  if (nodeMembers === undefined) {
    throw new Error(
      `the cut at ${hole(at)} is on node ${at.nodeId}, which the dump declares no NODE line for ` +
        `(node 0 is the fork's "no node here", which a board whose nets were never computed ` +
        "carries), so the checklist cannot say what that cut separates. Recompute this board's " +
        "nets (\`make update\`) so the layout carries a NODE line for it, rather than printing " +
        "nothing for a cut this table cannot name.",
    )
  }
  if (nodeMembers.length === 0) {
    throw new Error(
      `the cut at ${hole(at)} is on node ${at.nodeId}, whose NODE line names no members, so that ` +
        "cut separates nothing this table can name. Fix it in the layout - a node with no " +
        "members is not a net anything is on - rather than printing a blank cell for it.",
    )
  }
  return [...nodeMembers]
    .sort(compareRefs)
    .map((member) => {
      if (!padIdentities.has(member)) return member
      const label = padLabels.get(member)
      if (label === undefined) {
        throw new Error(
          `pad ${member} is a member of node ${at.nodeId} (the cut at ${hole(at)}) and has no ` +
            "entry in the checklist's pad-label map, so the Separates column cannot say what its " +
            "wire is. Fix it in tools/guide/packet.ts, where padLabels is built from padLabelOf " +
            "for every pad passed to renderLayout - the checklist and the images must be handed " +
            "the same map so they cannot disagree about what a pad's wire is.",
        )
      }
      return label
    })
    .join(", ")
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
/**
 * NO ZERO-OHM BRANCH HERE, AND THAT IS DELIBERATE. A part that resolves to 0 Ω
 * has no body to mount, so `NO_FOOTPRINT`, `NO_SPAN` and a `MOUNTING_LABEL` are
 * all wrong for it - but it never reaches this function, because
 * `buildChecklist` below routes it into the **Wire links** section before a
 * part row is built for it. A branch here would be unreachable code no test
 * could reach, which is the same reason `pinFieldNotes` in
 * `lib/board/part-text.ts` carries no rows-disagree-about-mating check. If a
 * wire link is ever moved back into a part-shaped section, the branch belongs
 * here and it needs its own sentence - a `PAD_NO_MOUNTING`-style "there is
 * categorically nothing to mount", never one of the two gap messages, which
 * name footprint data this project has not recorded.
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

/**
 * A zero-ohm part's row in the **Wire links** section: its designator, and its
 * two holes in the same reading order a W-numbered wire's are given in.
 *
 * **IT IS NAMED BY ITS DESIGNATOR, NOT GIVEN A W NUMBER.** `numbering.ts` owns
 * the one numbering of this board's cuts, bridges and wires, shared with the
 * images; a `W4` invented here for a part the images do not number that way
 * would be the two-artifacts-disagreeing defect this file's own comments keep
 * naming. `WIRE_LINK_NOTE` is what tells the reader why a designator is sitting
 * among the W rows.
 *
 * Refused rather than shortened when the part has other than two leads: a wire
 * link is a wire between two holes, and a three-lead part printed with two of
 * them would be an instruction to leave a lead unsoldered.
 */
function wireLinkRow(dump: BoardDump, part: Part): readonly string[] {
  const pins = dump.pins[part.ref]
  if (pins === undefined || pins.length === 0) throw new Error(noPinLinesMessage(part))
  const [first, second, ...rest] = pins
  if (first === undefined || second === undefined || rest.length > 0) {
    throw new Error(
      `part ${part.ref} resolves to 0 ohms, so the checklist lists it as a wire link, but the dump ` +
        `places ${pins.length} pins for it and a wire link runs between exactly two holes. A ` +
        "zero-ohm component is a pot section (lib/model/control-state.ts) and has two leads; a part " +
        "with more of them reaching here means something else now resolves to zero ohms. Decide what " +
        "a builder fits for it and give it its own row in tools/guide/checklist.ts, rather than " +
        "printing two of its holes and leaving the rest unsoldered.",
    )
  }
  const [from, to] = inReadingOrder(first, second)
  return [part.ref, hole(from), hole(to)]
}

/** The whole checklist. The layout and circuit must already agree (`assertLayoutMatchesCircuit`). */
export function buildChecklist(
  dump: BoardDump,
  circuit: BoardCircuit,
  edges: readonly EdgeLabel[],
  pads: readonly PadTerminal[],
  padLabels: ReadonlyMap<string, string>,
  nodeMembers: ReadonlyMap<string, readonly string[]>,
): readonly ChecklistSection[] {
  const groups: Record<PartGroup, (readonly string[])[]> = {
    semiconductors: [], resistors: [], capacitors: [], junctions: [],
  }
  const parts = [...dump.parts].sort((a, b) => compareRefs(a.ref, b.ref))
  const partLinks: (readonly string[])[] = []
  for (const part of parts) {
    const component = componentAt(circuit, part.ref)
    // A ZERO-OHM PART IS A WIRE LINK AND GETS A WIRE LINK'S ROW. It is routed
    // here, before a part row exists for it, rather than having its Value and
    // Mounting cells reworded: both of those columns answer questions about a
    // body, and this part has none. See `./wire-links.ts` for the rule and what
    // it costs when a packet gets it wrong.
    if (isZeroOhmResistor(component)) {
      partLinks.push(wireLinkRow(dump, part))
      continue
    }
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
  const wires = [
    ...numberedWires(dump).map(({ number, from, to }) => [`W${number}`, hole(from), hole(to)]),
    ...partLinks,
  ]
  const padIdentities = new Set(pads.map((pad) => pad.identity))
  return [
    { title: "ICs and transistors", columns: PART_COLUMNS, rows: groups.semiconductors },
    { title: "Resistors and trim-pots", columns: PART_COLUMNS, rows: groups.resistors },
    { title: "Capacitors", columns: PART_COLUMNS, rows: groups.capacitors },
    {
      title: "Wire links",
      columns: ["Wire", "From", "To"],
      rows: wires,
      // ONLY WHEN THIS BOARD HAS ONE. A board whose links are all W-numbered
      // wires would otherwise print a paragraph about parts it does not carry.
      ...(partLinks.length > 0 ? { note: WIRE_LINK_NOTE } : {}),
    },
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
        `${separates(cut.a, nodeMembers, padIdentities, padLabels)} | ` +
          `${separates(cut.b, nodeMembers, padIdentities, padLabels)}`,
      ]),
    },
  ]
}
