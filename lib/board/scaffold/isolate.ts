/**
 * Where a stand-in must be breakable to take it out of circuit.
 *
 * FOR EACH CONNECTED COMPONENT OF A STAND-IN, ISOLATE ALL BUT ONE OF ITS DISTINCT
 * EXTERNAL TERMINALS - ground counting as a terminal. Breaking all but one leaves that
 * piece hanging by a single point, joining nothing to nothing. Breaking fewer leaves a
 * conductive path, and the path is the bug: low-boost's stand-in reaches `out` and
 * ground from one node, so a single link at `lo_boost_in` leaves `out` tied to ground
 * through the 56k. Measured on the full five-section build, that spurious load costs
 * 0.589 dB at 20 Hz and 0.229 dB at 1 kHz.
 *
 * PER CONNECTED COMPONENT, NOT PER SECTION. A section whose flat state resolves into
 * two unconnected pieces needs each isolated on its own, and one count applied to the
 * whole section would be wrong. It is a sufficient construction rather than a proven
 * minimum: a network with redundant terminal connections might admit fewer points.
 * Deriving it from the resolved network's connected components means a change to the
 * electrical model cannot silently invalidate it.
 *
 * This was wrong in the dangerous direction when the spec said "a two-pad removable
 * link in series". The model-side integration gate would have caught it, but the error
 * was in the hardware instruction, so it would have been built first.
 */
import { nodesOf } from "./shorts.ts"
import type { ResolvedComponent } from "../../model/control-state.ts"

/** A leg of a stand-in that must be breakable, named by the component and pin at it. */
export interface IsolationPoint {
  readonly component: string
  readonly terminal: string
  readonly net: string
}

/** Partition components into pieces that share no net. */
export function connectedGroups(
  components: readonly ResolvedComponent[],
): readonly (readonly ResolvedComponent[])[] {
  const groups: ResolvedComponent[][] = []
  const unassigned = [...components]
  while (unassigned.length > 0) {
    const group = [unassigned.shift()!]
    const nets = new Set<string>(nodesOf(group[0]!))
    let grew = true
    while (grew) {
      grew = false
      for (let index = unassigned.length - 1; index >= 0; index -= 1) {
        const candidate = unassigned[index]!
        if (!nodesOf(candidate).some((net) => nets.has(net))) continue
        for (const net of nodesOf(candidate)) nets.add(net)
        group.push(candidate)
        unassigned.splice(index, 1)
        grew = true
      }
    }
    groups.push(group)
  }
  return groups
}

/** Every (component, pin) sitting on a boundary net, one entry per distinct net. */
function externalTerminals(
  group: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
): readonly IsolationPoint[] {
  const terminals: IsolationPoint[] = []
  const claimed = new Set<string>()
  for (const component of group) {
    for (const unit of component.units) {
      for (const [terminal, net] of Object.entries(unit.pins)) {
        if (!boundary.has(net) || claimed.has(net)) continue
        claimed.add(net)
        terminals.push({ component: component.id, terminal, net })
      }
    }
  }
  return terminals
}

export function isolationPoints(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
  groundNet = "0",
): readonly IsolationPoint[] {
  const points: IsolationPoint[] = []
  for (const group of connectedGroups(components)) {
    const terminals = externalTerminals(group, boundary)
    // Leave one leg attached. Ground is the cheapest to leave connected - a network
    // hanging off ground alone joins nothing to nothing and needs no link - so it
    // sorts last and is the one kept.
    const ordered = [...terminals].sort((a, b) => {
      if (a.net === groundNet) return 1
      if (b.net === groundNet) return -1
      return a.net < b.net ? -1 : a.net > b.net ? 1 : 0
    })
    points.push(...ordered.slice(0, Math.max(ordered.length - 1, 0)))
  }
  return points
}
