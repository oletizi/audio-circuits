/**
 * A Pultec section board: ONE LAYOUT, MANY CONFIGURATIONS.
 *
 * The five sections share a four-node signal ladder, so a section built alone has no
 * signal path at all - its own level pot grounds the input at flat and the only route
 * to the output runs through a neighbour. Each board therefore carries stand-in
 * networks for the sections that are absent, and this module is where those groups are
 * put onto the boards.
 *
 * TWO NETWORKS, CHECKED AGAINST DIFFERENT THINGS. This is the distinction the whole
 * design turns on, and the one an implementer gets wrong:
 *
 * - `physicalBoard(section)` is the MAXIMAL network: the section's own parts, all four
 *   other sections' stand-in groups, and the junction. The VeroRoute layout holds every
 *   one of those positions and NEVER varies with configuration, so the layout is
 *   checked against this - the standalone build is the only configuration in which
 *   every placed part is actually in circuit.
 * - `boardNetwork(section, present)` is ONE configuration: the own parts, the junction,
 *   and only the groups this board supplies for that particular build. These are
 *   verified in the MODEL, by the 31-combination composition gate; no layout is
 *   involved, and none could be - a build's omitted parts are an action at the bench,
 *   not an edit to a layout file.
 *
 * THERE IS ONE BUILDER, AND THE MAXIMAL NETWORK IS THE STANDALONE CONFIGURATION:
 * `physicalBoard(s)` is defined as `boardNetwork(s, {s})`. That is deliberate rather
 * than incidental. It means there is no way to ask this module for a layout-shaped
 * network of a partial configuration, because no such function exists; the only thing
 * a layout check can reach is `pultec<Section>()` in the five sibling modules, and each
 * of those returns the maximal network.
 *
 * WHICH GROUPS A BOARD CARRIES is not this module's decision. `lib/board/scaffold/
 * supplier.ts` assigns each absent section to exactly one present board, and a board
 * carries a group only if it is that board. If two boards both carried a group the
 * copies would sit in parallel on the shared bus and quietly halve a value - a
 * plausible wrong measurement rather than an obvious fault.
 *
 * STAND-IN PARTS ARE ORDINARY CONDUCTING COMPONENTS. They are not `physicalOnly` and
 * not `electricallyInert`; only the junction is. That is the whole reason the
 * scaffolding can sit on the section boards at all: the transparency guarantee in
 * `lib/board/physicalize.ts` is about parts that claim to add no connection, and a
 * stand-in adds a connection on purpose. Nothing in `projectPhysical` needed changing.
 *
 * VALUES ARE DERIVED, NEVER TRANSCRIBED. Every component, value and net here comes from
 * `allStandIns`, which reduces each section at its declared flat state. A hand-written
 * value would be a parallel copy of what the model already states and would drift the
 * first time a capacitor changed.
 */
import { allStandIns, REFERENCE_FLAT } from "../../../lib/board/scaffold/index.ts"
import { LADDER_ORDER, suppliers } from "../../../lib/board/scaffold/supplier.ts"
import { MODULE_OWNERS, partitionReference } from "../partition.ts"
import type { ModuleOwner } from "../partition.ts"
import { OFF_BOARD } from "../off-board.ts"
import {
  JUNCTION_NETS,
  designatorsFor,
  footprintForKind,
  junctionComponents,
  ownComponents,
  padOrdersFor,
  portsOn,
  symbolFor,
} from "./parts.ts"
import type { Component, Network } from "../../../lib/model/types.ts"
import type { ResolvedComponent } from "../../../lib/model/control-state.ts"

/** The derivation, run once: every section reduced to its flat-state stand-in. */
const STAND_INS = allStandIns(partitionReference().modules, REFERENCE_FLAT)

/**
 * The `provenance.source` a stand-in part carries, with the section it stands in for in
 * `provenance.location`.
 *
 * DELIBERATELY NOT `PHYSICAL_ONLY`. A stand-in conducts on purpose, so it must not be
 * projected away by `projectPhysical` and must not claim `electricallyInert`. This
 * marker exists so a reader of the model - and the generated guide - can say which
 * parts are scaffolding without inferring it from an id prefix.
 */
export const STAND_IN_SOURCE = "stand-in"

const JUNCTION_NET_SET: ReadonlySet<string> = new Set(JUNCTION_NETS)

/**
 * A section name narrowed to a `ModuleOwner`, refusing anything else by name.
 *
 * A predicate rather than a cast: `as ModuleOwner` would let a typo through to a
 * `undefined` module lookup far downstream.
 */
function asModuleOwner(section: string): ModuleOwner {
  for (const owner of MODULE_OWNERS) if (owner === section) return owner
  throw new Error(
    `Unknown Pultec section: ${section}. Known sections: ${MODULE_OWNERS.join(", ")}. ` +
      "Section names come from circuits/pultec/partition.ts and are not defaulted.",
  )
}

/** `hi-cut` -> `hi_cut`: section names carry a hyphen, net and id vocabularies do not. */
function sectionToken(section: string): string {
  return section.replace(/-/g, "_")
}

/**
 * The id prefix a stand-in group's parts carry: `SI_HI_CUT_` for hi-cut's group.
 *
 * TWO JOBS, both needed. It stops a collision - a board carrying hi-cut's `C26` beside
 * its own parts, or mid's board carrying low-boost's `R2` where `R2` is a real part on
 * the low-boost board. And it LABELS the group, so the generated guide can tell a
 * builder to populate `SI_HI_CUT_*` as a unit and a half-populated group reads as
 * obviously incomplete rather than as a board with one part missing.
 */
export function standInIdPrefix(section: string): string {
  return `SI_${sectionToken(section).toUpperCase()}_`
}

/**
 * The net prefix a stand-in group's INTERNAL nodes carry: `si_hi_cut_`.
 *
 * Only the group's boundary nets - the ladder nets the junction carries - stay bare,
 * because those are the whole point: they are how the group reaches the rest of the
 * board. Everything else is prefixed so two groups sitting on one board cannot merge an
 * internal node, which would short two branches together and look like a measurement
 * rather than a bug.
 */
function standInNetPrefix(section: string): string {
  return `si_${sectionToken(section)}_`
}

/** One section's stand-in parts as they sit on a board. */
export interface StandInGroup {
  /** The ABSENT section these parts stand in for. */
  readonly section: ModuleOwner
  readonly components: readonly Component[]
  /** Ids among `components` that are off-board landings rather than board parts. */
  readonly offBoardIds: ReadonlySet<string>
}

/** The net a stand-in pin sits on once the group is placed on a board. */
function placedNet(section: string, boundary: ReadonlySet<string>, netName: string): string {
  if (boundary.has(netName)) {
    if (!JUNCTION_NET_SET.has(netName)) {
      throw new Error(
        `${section}'s stand-in has boundary net "${netName}", which the junction does not ` +
          `carry (it carries ${JUNCTION_NETS.join(", ")}). A stand-in reaches the rest of the ` +
          "board only through the junction, so a boundary net the junction has no pin for " +
          "cannot be wired at all. Either the partition's boundary moved or the junction's " +
          "pinout did; fix whichever, in circuits/pultec/partition.ts or " +
          "circuits/pultec/physical/parts.ts.",
      )
    }
    return netName
  }
  if (JUNCTION_NET_SET.has(netName)) {
    throw new Error(
      `${section}'s stand-in names junction net "${netName}" at a pin, but "${netName}" is ` +
        `not in its boundary (${[...boundary].sort().join(", ")}). Prefixing it would hide a ` +
        "ladder net from the bus and leaving it bare would join a node the boundary says is " +
        "private, so neither is defaulted. The boundary discovery in " +
        "lib/board/scaffold/boundary.ts and the section's topology disagree.",
    )
  }
  return standInNetPrefix(section) + netName
}

/**
 * One resolved stand-in component as a board component: id prefixed, nets placed,
 * footprint or symbol attached.
 *
 * `resolved.pins` (PACKAGE pins, as opposed to unit pins) is expected empty - every
 * kind the reduction can produce keeps package pins empty by this codebase's convention
 * - and that is CHECKED rather than assumed, because a non-empty package-pin map would
 * otherwise be silently dropped instead of carried onto the board.
 */
function placedComponent(
  section: ModuleOwner,
  boundary: ReadonlySet<string>,
  resolved: ResolvedComponent,
): Component {
  if (Object.keys(resolved.pins).length > 0) {
    throw new Error(
      `Stand-in component ${resolved.id} declares package pins ` +
        `(${Object.keys(resolved.pins).join(", ")}), which this conversion does not carry ` +
        "across. Extend it rather than dropping them: a dropped package pin is a connection " +
        "the board would be missing with nothing to show it.",
    )
  }
  const bare: Component = {
    id: `${standInIdPrefix(section)}${resolved.id}`,
    kind: resolved.kind,
    parameters: resolved.parameters,
    pins: {},
    units: resolved.units.map((unit) => ({
      name: unit.name,
      pins: Object.fromEntries(
        Object.entries(unit.pins).map(([pin, netName]) => [
          pin,
          { kind: "net" as const, net: placedNet(section, boundary, netName) },
        ]),
      ),
    })),
    provenance: {
      source: STAND_IN_SOURCE,
      location: section,
      note:
        `Stands in for the absent ${section} section, derived from it at the reference flat ` +
        `state. Populated only when ${section} is not on the bench.`,
    },
  }
  // RESIDENCY FOLLOWS THE PART THE STAND-IN CAME FROM, by its unprefixed id. mid's 1H
  // tap is an off-board landing here for exactly the reason it is one in the live
  // section (no inductor part has been chosen, see circuits/pultec/off-board.ts), while
  // a pot ARM is not: the reduction has already replaced the pot with fixed resistors,
  // and a fixed resistor sits on the board.
  return OFF_BOARD.has(resolved.id)
    ? { ...bare, part: { symbol: symbolFor(bare) } }
    : { ...bare, part: { footprint: footprintForKind(bare) } }
}

const GROUPS = new Map<string, StandInGroup>()

/** One absent section's stand-in group, as it sits on whichever board supplies it. */
export function standInGroup(section: string): StandInGroup {
  const owner = asModuleOwner(section)
  const cached = GROUPS.get(owner)
  if (cached !== undefined) return cached

  const derived = STAND_INS[owner]
  if (derived === undefined) {
    throw new Error(
      `No stand-in was derived for ${owner}. allStandIns() covers every key of ` +
        "partitionReference().modules, so this means the two vocabularies have diverged.",
    )
  }
  const boundary = new Set(derived.boundary)
  const components = derived.components.map((resolved) =>
    placedComponent(owner, boundary, resolved))
  const offBoardIds = new Set(
    derived.components
      .filter((resolved) => OFF_BOARD.has(resolved.id))
      .map((resolved) => `${standInIdPrefix(owner)}${resolved.id}`),
  )
  const group: StandInGroup = { section: owner, components, offBoardIds }
  GROUPS.set(owner, group)
  return group
}

/**
 * The absent sections whose groups THIS board carries, for a build of `present` boards.
 *
 * Computed through `suppliers()` on every call, never remembered: remembering it is
 * exactly the mistake that would put two copies of a group on one bus.
 */
export function groupsOn(section: string, present: ReadonlySet<string>): readonly string[] {
  const owner = asModuleOwner(section)
  if (!present.has(owner)) {
    throw new Error(
      `${owner} is not present in this build (${[...present].sort().join(", ") || "none"}), ` +
        "so asking which stand-in groups it carries has no answer. A board that is not on " +
        "the bench supplies nothing, and returning an empty list would read as 'this board " +
        "fits no groups' - a different and wrong claim.",
    )
  }
  const assigned = suppliers(present)
  return LADDER_ORDER.filter((absent) => assigned.get(absent) === owner)
}

/**
 * ONE CONFIGURATION of a section board: its own parts, the groups it supplies for this
 * build, and the junction.
 *
 * Ports are computed from the ELECTRICAL components before the junction is added - see
 * `portsOn` for why the junction must not be counted - so a board carrying hi-cut's and
 * mid's groups legitimately gains `hi_boost_out` and `in`, which the section alone never
 * names.
 */
export function boardNetwork(section: string, present: ReadonlySet<string>): Network {
  const owner = asModuleOwner(section)
  const components: Component[] = [...ownComponents(owner)]
  for (const absent of groupsOn(owner, present)) {
    components.push(...standInGroup(absent).components)
  }
  const ports = portsOn(components)
  components.push(...junctionComponents())
  return { ports, components }
}

/**
 * The MAXIMAL network: the standalone configuration, where every position the layout
 * holds is populated and therefore in circuit.
 *
 * This is what a VeroRoute layout is checked against, and it is not a second builder -
 * it is `boardNetwork` asked for the one-board build.
 */
export function physicalBoard(section: string): Network {
  const owner = asModuleOwner(section)
  return boardNetwork(owner, new Set([owner]))
}

/** Everything a perfboard declaration needs from a section board. */
export interface SectionBoard {
  readonly section: ModuleOwner
  /** The maximal network: what the layout is checked against. */
  readonly network: Network
  readonly designators: Readonly<Record<string, string>>
  readonly offBoardIds: ReadonlySet<string>
  readonly padOrders: Readonly<Record<string, readonly string[]>>
}

/**
 * One section board, maximal, with the maps the perfboard workflow reads off the module.
 *
 * All four of these describe the SAME network - the maximal one - because they are all
 * consumed by the layout check, which has only the layout to compare against and
 * therefore only the maximal network to compare it with.
 */
export function sectionBoard(section: string): SectionBoard {
  const owner = asModuleOwner(section)
  const network = physicalBoard(owner)
  const offBoardIds = new Set<string>()
  for (const component of ownComponents(owner)) {
    if (OFF_BOARD.has(component.id)) offBoardIds.add(component.id)
  }
  for (const absent of groupsOn(owner, new Set([owner]))) {
    for (const id of standInGroup(absent).offBoardIds) offBoardIds.add(id)
  }
  return {
    section: owner,
    network,
    designators: designatorsFor(network),
    offBoardIds,
    padOrders: padOrdersFor(network, offBoardIds),
  }
}
