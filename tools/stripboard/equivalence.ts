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
import {
  boardGeometry,
  copperGraph,
  pinHoles,
  GEOMETRY_CONTRACT_VERSION,
  type HoleKey,
} from "./copper.ts"

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
 * HC8's verdict for one dump against one reference netlist.
 *
 * Takes dump TEXT, not a `BoardDump`, so the whole geometry contract is
 * enforced - see the module comment's entry-point paragraph.
 */
export function netlistEquivalence(dumpText: string, reference: ReferenceNets): EquivalenceVerdict {
  const dump = boardGeometry(dumpText)
  const { components } = copperGraph(dump)
  const holes = pinHoles(dump)
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
