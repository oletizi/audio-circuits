/**
 * The flat control state a stand-in emulates, and resolution of a section at it.
 *
 * A STAND-IN IS SPECIFIC TO THE SETTING IT EMULATES. An absent section has no
 * frequency selector, so the scaffold must assume one, and its capacitor values follow
 * from that assumption. Holding stand-ins at these settings while the circuit is set
 * elsewhere costs up to 3.71 dB - measured, and recorded in
 * `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`. The setting is
 * therefore data carried with the stand-in, never implicit.
 *
 * Two facts about `resolveNetwork` this module depends on, both load-bearing:
 *
 * - A potentiometer resolves to two resistor components, and a ZERO-OHM SECTION IS
 *   STILL EMITTED ("so component counts stay stable across a sweep"). That is what
 *   makes "ideal shorts are components, never node merges" already true of resolution:
 *   `RV_LO_BOOST` at position 0 appears as a 0R resistor shorting `lo_boost_in` to
 *   ground rather than as a merged node. Omitting that shunt was most of the error in
 *   the approach this design replaces.
 * - A switch's closed contacts DO merge nets, through a union-find ordered by
 *   `netPreference`: ground first, then any port net, then lexicographic. So a merged
 *   class containing a boundary net keeps the boundary net's name, and boundary
 *   identity survives resolution. That merge is upstream of the reduction and correct -
 *   a closed contact is a short of zero length - and must not be undone.
 *
 * `resolveNetwork` throws without a ground port and reads the port set to decide those
 * preferences, which is why resolution happens on all five sections at once rather than
 * section by section. See `referenceNetwork`.
 */
import { resolveNetwork } from "../../model/control-state.ts"
import { discoverBoundary } from "./boundary.ts"
import type { Component, Network } from "../../model/types.ts"
import type { ControlState, ResolvedNetwork } from "../../model/control-state.ts"

export interface FlatState {
  readonly loFrequency: string
  readonly hiFrequency: string
  readonly midFrequency: string
  readonly midMode: string
}

/** The settings every figure in the scaffold spec was measured at. */
export const REFERENCE_FLAT: FlatState = {
  loFrequency: "100Hz",
  hiFrequency: "5kHz",
  midFrequency: "1kHz",
  midMode: "boost",
}

export const GROUND_NET = "0"

/** Which flat setting each selector takes. Not defaulted: a guessed position silently
 * changes which capacitor a stand-in carries, and the stand-in would then be wrong in
 * a way that looks like a measurement rather than a bug.
 */
function settingFor(switchId: string, flat: FlatState): string {
  const table: Record<string, string> = {
    SW_LO_CUT: flat.loFrequency,
    SW_LO_BOOST: flat.loFrequency,
    SW_HI_CUT: flat.hiFrequency,
    SW_HI_BOOST: flat.hiFrequency,
    SW_MID: flat.midFrequency,
    SW_MID_MODE: flat.midMode,
  }
  const setting = table[switchId]
  if (setting === undefined) {
    throw new Error(
      `No flat setting for switch ${switchId}. Add it to settingFor in ` +
        `lib/board/scaffold/flat.ts. It is not defaulted because a guessed position ` +
        `changes which capacitor the stand-in carries.`,
    )
  }
  return setting
}

/** Every pot in the section at 0, every switch at its flat setting.
 *
 * Built from the components actually present rather than from a fixed list. Resolution
 * refuses a missing setting, and a hand-written list would omit `RV_HI_Q`, which rides
 * on the hi-boost section.
 */
export function flatControlState(
  components: readonly Component[],
  flat: FlatState,
): ControlState {
  const potPositions: Record<string, number> = {}
  const switchPositions: Record<string, string> = {}
  for (const component of components) {
    if (component.kind === "potentiometer") potPositions[component.id] = 0
    if (component.kind === "switch") {
      switchPositions[component.id] = settingFor(component.id, flat)
    }
  }
  return { potPositions, switchPositions }
}

/** All five sections as one `Network`, with every boundary net declared as a port.
 *
 * RESOLUTION HAPPENS IN CONTEXT, NOT PER SECTION, and it has to. Three of the five
 * sections - low-cut, hi-boost and hi-cut - never reference ground, so they cannot be
 * resolved alone: `resolveNetwork` refuses a network with no ground port, and
 * validation refuses a declared port whose net no component touches. Both refusals are
 * right, and the way through is to resolve the whole thing once.
 *
 * Declaring every boundary net as a port is what makes this safe. `netPreference`
 * prefers ground, then port nets, then lexicographic order, so a net class merged by a
 * closed switch contact keeps its boundary name. Without those ports the reference
 * network names only `in`, `out` and ground, and `SW_LO_BOOST` merging `lo_boost_in`
 * with `j10_p4` would resolve lexicographically to `j10_p4` - the boundary net gone,
 * and every stand-in built against a name that is not on any terminal block.
 */
export function referenceNetwork(
  modules: Record<string, readonly Component[]>,
): Network {
  const components = Object.values(modules).flat()
  const boundary = new Set<string>([GROUND_NET])
  for (const sectionName of Object.keys(modules)) {
    for (const boundaryNet of discoverBoundary(sectionName, modules, GROUND_NET)) {
      boundary.add(boundaryNet)
    }
  }
  const ports: Record<string, string> = { ground: GROUND_NET }
  for (const boundaryNet of [...boundary].sort()) {
    if (boundaryNet !== GROUND_NET) ports[boundaryNet] = boundaryNet
  }
  return { components, ports }
}

/** Which section a resolved component came from.
 *
 * A pot resolves into `<id>.ccw-wiper` and `<id>.wiper-cw`, so the owning id is the
 * part before the first dot. Nothing else is renamed by resolution.
 */
function ownerOf(resolvedId: string): string {
  const dot = resolvedId.indexOf(".")
  return dot === -1 ? resolvedId : resolvedId.slice(0, dot)
}

export function resolveSectionFlat(
  sectionName: string,
  modules: Record<string, readonly Component[]>,
  flat: FlatState,
): ResolvedNetwork {
  const own = modules[sectionName]
  if (own === undefined) {
    throw new Error(
      `Unknown section: ${sectionName}. Known sections: ` +
        `${Object.keys(modules).sort().join(", ")}.`,
    )
  }
  const network = referenceNetwork(modules)
  const resolved = resolveNetwork(network, flatControlState(network.components, flat))
  const ownIds = new Set(own.map((component) => component.id))
  return {
    ports: resolved.ports,
    components: resolved.components.filter((component) => ownIds.has(ownerOf(component.id))),
  }
}
