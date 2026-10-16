/**
 * HC8's verdict: does the board's copper partition the pins exactly as the
 * reference netlist does?
 *
 * THE AUTHORITY for everything below is `HC8` and the trust-boundary
 * paragraphs around it in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`.
 * Where this module and that document differ, the document wins and this
 * comment is the defect.
 *
 * TWO FAILURE DIRECTIONS, AND BOTH ARE REPORTED, because HC1, HC2, HC3 and
 * HC7 each read VeroRoute's own conclusion from the subsystem the optimiser
 * perturbs:
 *   - an OPEN: one reference net whose pins fall in two or more copper
 *     components. A completeness check already covers this direction, and it
 *     is the easier half.
 *   - a SHORT: one copper component holding pins of two or more reference
 *     nets. A completeness check is STRUCTURALLY BLIND to this: joining two
 *     nets leaves both of them reading complete, so a check that only asks
 *     whether each net is whole has nothing to report. Nothing in HC1-HC7
 *     looks for one at all, and that is the whole reason this gate exists.
 *
 *     THAT A REAL BOARD IN THAT STATE EXITS 0 UNDER `--check` IS CRITERIA'S
 *     ARGUMENT FROM `GetBoardMembership`'S SOURCE, NOT A MEASUREMENT. It is
 *     unproven and is Task 6's to prove; no verb in the pinned fork edits a
 *     cut, so no such board can currently be produced. Nothing here may be
 *     read as evidence for it.
 *
 * THE PINS ARE PARTITIONED, NEVER COUNTED. `CopperGraph.componentCount`
 * counts canvas strips - it is derived over every hole on the board, so an
 * isolated strip end is a component of one - and is therefore not the number
 * of nets. Comparing it with `reference.size` would pass a board whose pins
 * are grouped entirely wrongly whenever the two numbers happened to agree.
 *
 * `boardGeometry` IS THE ENTRY POINT, which is why this module takes dump
 * TEXT and not a `BoardDump`. Two of HC8's contracted refusals -
 * `missing-line` and `unsupported-strip-axis` - are INEXPRESSIBLE through
 * `copperGraph(dump: BoardDump)`, because a parsed dump carries a grid and a
 * boolean axis by construction. A caller that parsed the text itself and
 * handed over the `BoardDump` would silently skip both, and CRITERIA's
 * "refuses when any contracted line is absent, naming the missing line and
 * the contract version" would be discharged only by the parser's unrelated
 * wording. The task brief's signature was `netlistEquivalence(dump:
 * BoardDump, ...)`; it is widened to text here for that reason, and the
 * deviation is recorded in the task report.
 *
 * THE TWO SIDES ARE KEYED THE NETLIST'S WAY, not the board's, and that is
 * `referencePinHoles`' job rather than `pinHoles`'. VeroRoute expands an
 * off-board part's `PADS<n>` component into n one-hole pads with board names
 * of their own - `SW_LO_BOOST.3` becomes `SW_LO_BOOST_3.1` - and comparing
 * the sides by `PIN` name alone refuses ten of the frozen fixture's
 * twenty-seven pins. See `./pad-provenance.ts`; it adds no edge.
 *
 * IT NEVER READS THE `NODE` LINES OR ANY NODE ID, AND THAT IS THE
 * INDEPENDENCE. Every connectivity fact here comes from `copperGraph`, which
 * reads geometry only; the only other input is the reference netlist, which
 * is upstream of VeroRoute entirely. A gate that re-read
 * `GetBoardMembership` under a new name would report an independence it does
 * not have, which is worse than no gate because it looks like one.
 *
 * THE TRUST BOUNDARY, stated here and not overstated. This is INDEPENDENT
 * CONNECTIVITY RECONSTRUCTION FROM VEROROUTE-EXPORTED PHYSICAL GEOMETRY. It
 * is independent of VeroRoute's MEMBERSHIP CALCULATION, the subsystem with
 * the demonstrated hole. It is NOT independent of VeroRoute's GEOMETRY
 * EXPORT: it consumes it, so a dump that omits a cut or misreports a pin
 * yields a consistent and WRONG verdict here, and nothing in this module can
 * see it. Stronger independence means parsing a binary `QDataStream`, which
 * is limit H-13 rather than a plan.
 */
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"
import {
  boardGeometry,
  copperGraph,
  GEOMETRY_CONTRACT_VERSION,
  type HoleKey,
} from "./copper.ts"
import { referencePinHoles } from "./pad-provenance.ts"

/**
 * Net name to its `ref.pin` members, FROM THE NETLIST EXPORT, upstream of
 * VeroRoute entirely. That provenance is what makes the comparison a
 * comparison: both sides derive from the schematic, and neither side derives
 * from the optimiser's own bookkeeping.
 */
export type ReferenceNets = ReadonlyMap<string, readonly string[]>

/** One reference net whose pins fell into two or more copper components. */
export interface OpenFinding {
  readonly net: string
  /** The net's pins grouped by the copper component each landed in. */
  readonly groups: readonly (readonly string[])[]
}

/** Two or more reference nets sharing one copper component. */
export interface ShortFinding {
  readonly nets: readonly string[]
  /** One hole in the shared component, as the witness a reader can go and look at. */
  readonly hole: HoleKey
}

export interface EquivalenceVerdict {
  readonly equivalent: boolean
  readonly opens: readonly OpenFinding[]
  readonly shorts: readonly ShortFinding[]
  readonly contractVersion: number
}

/** Where to look and why nothing here is defaulted, appended to every refusal. */
const REFUSAL_TAIL =
  `(HC8 geometry contract version ${GEOMETRY_CONTRACT_VERSION}; the verdict lives in ` +
  "tools/stripboard/equivalence.ts, and docs/superpowers/specs/" +
  "2026-10-10-stripboard-acceptance-criteria.md HC8 is the authority for it.)"

/**
 * Refuse, naming the member first so an assertion can anchor on it.
 *
 * The leading token is deliberate: these messages carry explanatory prose
 * that mentions the same words a loose `toThrow(/.../)` would match, so a
 * test that cannot distinguish one refusal from another is a test that proves
 * less than its name claims. Anchor on the prefix.
 */
function refuseReference(member: string, offending: string, notDefaultedBecause: string): never {
  throw new Error(`${member}: ${offending}. ${notDefaultedBecause} ${REFUSAL_TAIL}`)
}

/** One pin's hole, refusing by name when the dump prints no `PIN` line for it. */
function holeOfPin(pin: string, holes: ReadonlyMap<string, HoleKey>): HoleKey {
  const hole = holes.get(pin)
  if (hole === undefined) {
    refuseReference(
      "reference-pin-not-on-board",
      `${pin} is a reference pin and the dump prints no PIN line for it`,
      "A placed part with no PIN lines is HC3's refusal and HC8's too, and it is NOT an open: " +
        "treating a hole that was never reported as a net split in two would report the wrong " +
        "constraint and point at the wrong fix - rebuild the pinned veroroute fork and dump " +
        "the board again, or find the verb that left the part floating. Fix the dump's " +
        "producer or the netlist export, never this comparison.",
    )
  }
  return hole
}

/** Which copper component a hole is in. */
function componentOfHole(hole: HoleKey, components: ReadonlyMap<HoleKey, number>): number {
  const component = components.get(hole)
  if (component === undefined) {
    refuseReference(
      "hole-outside-copper-graph",
      `hole ${hole} holds a reference pin's lead but is not a hole of the board's copper`,
      "The copper graph is seeded from every hole the GRID line declares, so a hole missing " +
        "from it is off the board - which copperGraph's own out-of-bounds refusal should " +
        "already have rejected. Reaching here means the two disagree, so neither may be " +
        "trusted; fix tools/stripboard/copper.ts rather than skipping the pin.",
    )
  }
  return component
}

/** Every reference pin's component, refusing an empty reference and an empty net. */
function componentsByNet(
  reference: ReferenceNets,
  holes: ReadonlyMap<string, HoleKey>,
  components: ReadonlyMap<HoleKey, number>,
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  if (reference.size === 0) {
    refuseReference(
      "empty-reference",
      "the reference netlist has no nets, so there is nothing to partition the copper against",
      "Every net of an empty reference is trivially in one component, so the verdict would be " +
        "`equivalent` for ANY board at all - a pass that looks exactly like a real one. Pass " +
        "the nets from the netlist export, or fix the export that produced none.",
    )
  }
  const byNet = new Map<string, ReadonlyMap<string, number>>()
  for (const [net, pins] of reference) {
    if (pins.length === 0) {
      refuseReference(
        "empty-reference-net",
        `reference net "${net}" lists no pins`,
        "A net with no members cannot be shown whole or split, so grading it would be " +
          "grading nothing while reporting a result. Fix the netlist export that emitted it.",
      )
    }
    const byPin = new Map<string, number>()
    for (const pin of pins) {
      byPin.set(pin, componentOfHole(holeOfPin(pin, holes), components))
    }
    byNet.set(net, byPin)
  }
  return byNet
}

/** A net whose pins span two or more components, with the pins grouped by component. */
function openFindings(
  byNet: ReadonlyMap<string, ReadonlyMap<string, number>>,
): readonly OpenFinding[] {
  const opens: OpenFinding[] = []
  for (const [net, byPin] of byNet) {
    const pinsByComponent = new Map<number, string[]>()
    for (const [pin, component] of byPin) {
      const group = pinsByComponent.get(component) ?? []
      group.push(pin)
      pinsByComponent.set(component, group)
    }
    if (pinsByComponent.size < 2) {
      continue
    }
    const groups = [...pinsByComponent.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, pins]) => [...pins].sort())
    opens.push({ net, groups })
  }
  return opens
}

/** A component holding two or more nets' pins, with one hole as the witness. */
function shortFindings(
  byNet: ReadonlyMap<string, ReadonlyMap<string, number>>,
  holes: ReadonlyMap<string, HoleKey>,
): readonly ShortFinding[] {
  const netsByComponent = new Map<number, Set<string>>()
  const witnessByComponent = new Map<number, string>()
  for (const [net, byPin] of byNet) {
    for (const [pin, component] of byPin) {
      const nets = netsByComponent.get(component) ?? new Set<string>()
      nets.add(net)
      netsByComponent.set(component, nets)
      // The witness is the lexicographically smallest pin in the component,
      // so two runs over one dump name the same hole.
      const witness = witnessByComponent.get(component)
      if (witness === undefined || pin < witness) {
        witnessByComponent.set(component, pin)
      }
    }
  }
  const shorts: ShortFinding[] = []
  for (const [component, nets] of [...netsByComponent.entries()].sort(([a], [b]) => a - b)) {
    if (nets.size < 2) {
      continue
    }
    const witness = witnessByComponent.get(component)
    if (witness === undefined) {
      throw new Error(
        `unreachable: copper component ${component} holds ${nets.size} reference nets but no ` +
          "pin, which cannot happen because the nets were recorded pin by pin",
      )
    }
    shorts.push({ nets: [...nets].sort(), hole: holeOfPin(witness, holes) })
  }
  return shorts
}

/**
 * Read a netlist export into `HC8`'s reference side - THE ONE READER, so no
 * later task writes a second one and the two disagree.
 *
 * TWO GRAMMARS, BECAUSE THE COMMITTED EXPORTS ARE IN TWO GRAMMARS, and the
 * one chosen is read off the text rather than guessed: `pt2399-core` and the
 * frozen low-boost fixture are EESchema v1.1 (the format VeroRoute itself
 * consumes, `lib/kicad/legacy-netlist.ts`), while the transistor-preamp
 * boards' committed exports are modern KiCad s-expressions
 * (`lib/kicad/netlist.ts`). The task brief said the grammar is EESchema v1.1
 * and that "the committed `.net` fixtures use it", which is true of
 * `pt2399-core-veroroute.net` alone; the deviation is recorded in the task
 * report. A text that is neither is REFUSED, never attempted with one reader
 * on the chance it parses.
 *
 * IT OWNS THE EXPORT'S OWN CONSISTENCY - specifically, that one `ref.pin`
 * appears on at most one net. Measured on `equivalence.ts` before this
 * existed: with `R1.1` on two nets the verdict reported
 * `shorts: [{ nets: ["alias", "mid"], hole: "1,0" }]`, BLAMING THE COPPER FOR
 * A NETLIST DEFECT on a board whose copper is correct - and the remedy a
 * reader would act on is a layout change, when there is nothing wrong with
 * the layout. One pin on two nets is not a board that shorts; it is an export
 * that cannot be true of any board. `netlistEquivalence` keeps no second
 * check for it, because two owners of one rule is one more than this pipeline
 * allows: the reader of the export is where the export's consistency is
 * established.
 *
 * Neither underlying reader catches it. `importLegacyNetlist` records a
 * repeated pin under both net names without complaint - that is how the
 * defect reaches `HC8` at all - so this is a check added over whichever
 * reader is used, not one inherited from it.
 */
export function referenceNetsFromExport(text: string): ReferenceNets {
  const netlist = readExport(text)
  const nets = new Map<string, readonly string[]>()
  const netByPin = new Map<string, string>()
  for (const [net, pins] of Object.entries(netlist.nets)) {
    for (const pin of pins) {
      const already = netByPin.get(pin)
      if (already !== undefined) {
        const [first, second] = [already, net].sort()
        refuseReference(
          "pin-on-two-nets",
          `${pin} is listed on reference net "${first}" and again on reference net ` +
            `"${second}", so this export cannot be true of any board`,
          "A pin on two nets is not a short and must not be reported as one: a short is two " +
            "nets joined by copper, and the copper here may be perfectly correct - passing " +
            "this through would " +
            "point a reader at a layout to fix instead of at the netlist. It is not resolved " +
            "by dropping either listing, because which one the schematic meant is not in the " +
            "export. Fix the export, or the schematic it came from.",
        )
      }
      netByPin.set(pin, net)
    }
  }
  for (const [net, pins] of Object.entries(netlist.nets)) {
    nets.set(net, [...pins])
  }
  return nets
}

/** Which grammar the export is in, read off the text and never guessed. */
function readExport(text: string): ImportedNetlist {
  if (/^\s*\(\s*\{\s*EESchema Netlist Version/.test(text)) {
    return importLegacyNetlist(text)
  }
  if (/^\s*\(export\b/.test(text)) {
    return importNetlist(text)
  }
  refuseReference(
    "unknown-export-grammar",
    "the export opens with neither `( { EESchema Netlist Version ...` nor `(export`, which " +
      "are the two grammars this repository's committed netlist exports are written in",
    "Trying each reader in turn and keeping whichever did not throw would read a THIRD " +
      "grammar as whichever of the two it happened to resemble, and a reference netlist " +
      "mis-read is a verdict about a circuit nobody drew. Add the grammar's reader to " +
      "lib/kicad/ and name it here, or export the netlist in one of the two.",
  )
}

/**
 * HC8's verdict for one dump against one reference netlist.
 *
 * Takes dump TEXT, not a `BoardDump`, so the whole geometry contract is
 * enforced - see the module comment's entry-point paragraph.
 */
export function netlistEquivalence(dumpText: string, reference: ReferenceNets): EquivalenceVerdict {
  const dump = boardGeometry(dumpText)
  const { components } = copperGraph(dump)
  const holes = referencePinHoles(dumpText)
  const byNet = componentsByNet(reference, holes, components)
  const opens = openFindings(byNet)
  const shorts = shortFindings(byNet, holes)
  return {
    equivalent: opens.length === 0 && shorts.length === 0,
    opens,
    shorts,
    contractVersion: GEOMETRY_CONTRACT_VERSION,
  }
}

/**
 * One line per finding, naming the net or nets and the components or the
 * hole. An equivalent verdict has no findings and so renders no lines.
 */
export function describeVerdict(verdict: EquivalenceVerdict): readonly string[] {
  const lines: string[] = []
  for (const open of verdict.opens) {
    const groups = open.groups.map((group) => `{${group.join(", ")}}`).join(" | ")
    lines.push(
      `OPEN: reference net "${open.net}" has pins in ${open.groups.length} separate copper ` +
        `components: ${groups}. The board does not join them, so this net is not whole.`,
    )
  }
  for (const short of verdict.shorts) {
    const nets = short.nets.map((net) => `"${net}"`).join(" and ")
    lines.push(
      `SHORT: reference nets ${nets} share one copper component, witnessed at hole ` +
        `${short.hole}. A completeness check cannot detect this: joining two nets leaves BOTH ` +
        "of them reading complete, so a check that only asks whether each net is whole has " +
        "nothing to report.",
    )
  }
  return lines
}
