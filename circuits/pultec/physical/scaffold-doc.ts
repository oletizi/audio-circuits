/**
 * What one section board's wiring guide says about stand-in groups, computed per build.
 *
 * WHY THIS IS HERE AND NOT IN `lib`. Which groups a board populates, which board
 * carries the rest, and which junction pins carry anything are facts about THIS ladder:
 * they come from `boardNetwork`, `suppliers` and the junction pinout. `lib/` imports
 * nothing from `circuits/`, so the design computes the answer and
 * `lib/board/scaffold/wiring.ts` renders it. See that file and `lib/board/scaffold/
 * doc.ts` for the shape and why it crosses the boundary as ids and strings.
 *
 * EVERY ANSWER COMES OUT OF THE CONFIGURATION NETWORKS, not out of a restatement of
 * the supplier rule. The groups a build populates here are read back from
 * `groupsOn`; which pins carry a net are the junction nets this board's populated parts
 * share with another present board's populated parts, computed by walking both networks.
 * A guide built from a paraphrase of the rule could agree with the paraphrase and
 * disagree with the board.
 *
 * ALL 16 BUILDS THIS BOARD CAN BE IN ARE LISTED, not just the one somebody has today.
 * The guide is generated once per board and committed, and the owner's build changes
 * over time: `suppliers()` records that adding a board EARLIER in the ladder order moves
 * groups off a later board onto it. A reader with two boards today and three next month
 * needs the row for three boards in the same document, or the document becomes something
 * that has to be regenerated at the bench.
 */
import { externalPorts } from "../partition.ts"
import { LADDER_ORDER, suppliers } from "../../../lib/board/scaffold/supplier.ts"
import { physicalOnly } from "../../../lib/board/physicalize.ts"
import { netOf } from "../../../lib/board/part-text.ts"
import { componentNets } from "../../../lib/model/topology.ts"
import {
  STAND_IN_SOURCE,
  asModuleOwner,
  boardNetwork,
  groupsOn,
  physicalBoard,
  standInFlat,
  standInGroup,
} from "./board.ts"
import { JUNCTION_NETS, junctionSignalComponent, ownComponents } from "./parts.ts"
import type { FlatState } from "../../../lib/board/scaffold/index.ts"
import type {
  BuildDoc,
  ExternalLanding,
  JunctionWire,
  ScaffoldDoc,
  StandInGroupDoc,
} from "../../../lib/board/scaffold/doc.ts"

const JUNCTION_NET_SET: ReadonlySet<string> = new Set(JUNCTION_NETS)

/** The section this board is, refused by name rather than looked up blindly. */
function ladderSection(section: string): string {
  for (const known of LADDER_ORDER) if (known === section) return known
  throw new Error(
    `Unknown Pultec section: ${section}. Known sections: ${LADDER_ORDER.join(", ")}. ` +
      "A guide is generated for one of the five section boards; the name is not defaulted.",
  )
}

/**
 * The junction nets a board's POPULATED parts sit on, for one build.
 *
 * The junction itself is skipped - it lands a pin on all five nets on every board, so
 * counting it would say every pin carries something in every build, which is exactly
 * the uninformative answer the per-build table exists to replace.
 */
function junctionNetsOn(section: string, present: ReadonlySet<string>): ReadonlySet<string> {
  const nets = new Set<string>()
  for (const component of boardNetwork(section, present).components) {
    if (physicalOnly(component)) continue
    for (const netName of componentNets(component)) {
      if (JUNCTION_NET_SET.has(netName)) nets.add(netName)
    }
  }
  return nets
}

/** The signal row's pads, in its own pin order, with the net each one carries. */
function signalPads(): readonly (readonly [string, string])[] {
  const row = junctionSignalComponent()
  const unit = row.units[0]
  if (unit === undefined) {
    throw new Error(
      `${row.id} has no unit, so its pads cannot be numbered. The junction's pinout is the ` +
        "one thing every board shares; see circuits/pultec/physical/parts.ts.",
    )
  }
  const pads: (readonly [string, string])[] = []
  for (const [pad, connection] of Object.entries(unit.pins)) {
    const netName = netOf(connection)
    if (netName === undefined) {
      throw new Error(
        `${row.id} pad "${pad}" is a no-connect. Every junction pad carries a ladder net on ` +
          "every board - that uniformity is what makes the junction a bus - so a no-connect " +
          "here is a pinout change that the guide must not paper over.",
      )
    }
    pads.push([pad, netName])
  }
  return pads
}

/** Which of this board's junction pins carry a net to another board in this build. */
function junctionWires(section: string, present: ReadonlySet<string>): readonly JunctionWire[] {
  const mine = junctionNetsOn(section, present)
  const others = [...present].filter((board) => board !== section).sort()
  const theirs = others.map((board) => ({ board, nets: junctionNetsOn(board, present) }))
  const wires: JunctionWire[] = []
  for (const [pad, netName] of signalPads()) {
    if (!mine.has(netName)) continue
    const reaches = theirs.filter((other) => other.nets.has(netName)).map((other) => other.board)
    if (reaches.length === 0) continue
    wires.push({ pad, net: netName, reaches })
  }
  return wires
}

/**
 * Where the source, the load and ground land - junction pads, like everything else.
 *
 * Read from the circuit's own ports rather than named here. A port whose net the
 * junction does not carry refuses: it would be a connection to the outside world with
 * nowhere on any board to put it, and a guide that silently omitted it would leave a
 * builder with a finished stack and no idea where to solder the input.
 *
 * `onBoard` IS ABOUT THIS BOARD'S OWN PARTS, not about the group it may be carrying. On
 * a stack every board's pad reaches the same net, so any of them will do; off a stack,
 * a lead to a pad this board has no part on reaches nothing. mid's board is the live
 * case - nothing of mid's own circuit sits on `out` - so "land it wherever" is true of
 * a stack and false of five boards joined by individual leads.
 */
function externalLandings(owner: string): readonly ExternalLanding[] {
  const pads = signalPads()
  const own = new Set(ownComponents(asModuleOwner(owner)).flatMap(componentNets))
  const landings: ExternalLanding[] = []
  for (const [port, netName] of Object.entries(externalPorts())) {
    const pad = pads.find(([, carried]) => carried === netName)
    if (pad === undefined) {
      throw new Error(
        `The circuit's "${port}" port is on net "${netName}", which the junction does not carry ` +
          `(it carries ${JUNCTION_NETS.join(", ")}). There is then nowhere on any board to land ` +
          "it. Either the reference's ports moved or the junction's pinout did; fix whichever, " +
          "in circuits/pultec/electrical/three-band.ts or circuits/pultec/physical/parts.ts.",
      )
    }
    landings.push({ pad: pad[0], net: netName, port, onBoard: own.has(netName) })
  }
  return landings
}

/** Every build this board can be in: itself, plus any subset of the other four. */
function buildsFor(owner: string): readonly BuildDoc[] {
  const others = LADDER_ORDER.filter((section) => section !== owner)
  const builds: BuildDoc[] = []
  for (let mask = 0; mask < 1 << others.length; mask += 1) {
    const present = new Set([
      owner,
      ...others.filter((_, index) => ((mask >> index) & 1) === 1),
    ])
    const populate = groupsOn(owner, present)
    const assigned = suppliers(present)
    const elsewhere = LADDER_ORDER
      .filter((section) => !present.has(section) && !populate.includes(section))
      .map((section) => {
        const board = assigned.get(section)
        if (board === undefined) {
          throw new Error(
            `No board was assigned ${section}'s stand-in group for the build ` +
              `${[...present].sort().join(" + ")}. suppliers() assigns every absent section, so ` +
              "this means its vocabulary and LADDER_ORDER have diverged.",
          )
        }
        return { section, board }
      })
    builds.push({
      present: [...present].sort(),
      populate,
      elsewhere,
      junction: junctionWires(owner, present),
    })
  }
  return [...builds].sort((a, b) =>
    a.present.length - b.present.length ||
    (a.present.join(" ") < b.present.join(" ") ? -1 : 1))
}

/**
 * The groups this board holds, with the parts of each.
 *
 * CHECKED AGAINST THE BOARD, not assembled and trusted: every part the maximal network
 * marks as scaffolding must appear in exactly one group here, and every part listed must
 * be one the maximal network carries. The maximal network IS the standalone build, where
 * all four groups are populated, so that comparison covers all of them at once.
 */
function groupsFor(owner: string): readonly StandInGroupDoc[] {
  const groups = LADDER_ORDER
    .filter((section) => section !== owner)
    .map((section) => ({
      section,
      partIds: standInGroup(section).components.map((component) => component.id),
    }))

  const listed = new Set(groups.flatMap((group) => group.partIds))
  const onBoard = new Set(
    physicalBoard(owner).components
      .filter((component) => component.provenance?.source === STAND_IN_SOURCE)
      .map((component) => component.id),
  )
  const missing = [...onBoard].filter((id) => !listed.has(id)).sort()
  const extra = [...listed].filter((id) => !onBoard.has(id)).sort()
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `The stand-in groups listed for the ${owner} board do not match the parts that board ` +
        `carries. On the board but in no group: ${missing.join(", ") || "none"}. Listed but not ` +
        `on the board: ${extra.join(", ") || "none"}. The guide would then tell a builder to fit ` +
        "a part with no position, or leave a position with no instruction, so it refuses. " +
        "standInGroup() and physicalBoard() in circuits/pultec/physical/board.ts have drifted.",
    )
  }
  return groups
}

/**
 * The setting every group on this board emulates, read off the derivation.
 *
 * NOT `REFERENCE_FLAT` RESTATED. The setting travels with each stand-in precisely so
 * that the document cannot claim one thing while the parts were derived at another, and
 * two groups derived at different settings is a real failure this is the only check for.
 */
function flatFor(groups: readonly StandInGroupDoc[]): FlatState {
  let agreed: FlatState | undefined
  for (const group of groups) {
    const flat = standInFlat(group.section)
    if (agreed === undefined) {
      agreed = flat
      continue
    }
    const differs = agreed.loFrequency !== flat.loFrequency ||
      agreed.hiFrequency !== flat.hiFrequency ||
      agreed.midFrequency !== flat.midFrequency ||
      agreed.midMode !== flat.midMode
    if (differs) {
      throw new Error(
        `The stand-in groups on one board emulate different settings: ` +
          `${JSON.stringify(agreed)} against ${group.section}'s ${JSON.stringify(flat)}. One ` +
          "board states one setting on its silkscreen and in its guide, so this cannot be " +
          "rendered honestly. Fix the derivation in lib/board/scaffold/index.ts.",
      )
    }
  }
  if (agreed === undefined) {
    throw new Error(
      "This board holds no stand-in groups, so there is no derived setting to read and no " +
        "scaffold section to render. Only reachable if LADDER_ORDER holds one section, which " +
        "would mean no section has a neighbour and the scaffolding has nothing to stand in " +
        "for; it is refused rather than defaulted to REFERENCE_FLAT, which would state a " +
        "setting no part on the board was derived at.",
    )
  }
  return agreed
}

/** Everything one section board's guide needs to say about stand-in groups. */
export function scaffoldDoc(section: string): ScaffoldDoc {
  const owner = ladderSection(section)
  const groups = groupsFor(owner)
  return {
    section: owner,
    flat: flatFor(groups),
    groups,
    builds: buildsFor(owner),
    external: externalLandings(owner),
  }
}
