/**
 * Electrical node identity: which nets an ideal short makes one node.
 *
 * A GRAPH NODE AND AN ELECTRICAL NODE ARE NOT THE SAME THING, and conflating them has
 * now cost this feature twice - once in `reduce.ts`, where a loop closed through a 0R
 * pot arm read as a current-carrying path, and once in `admittance.ts`, where an ideal
 * short stood in as a 1e12 S conductance and the Schur complement then lost the series
 * resistance it was supposed to measure (47k in series with that short came out as
 * exactly zero in double precision). Both wanted the same notion, so it lives here
 * once rather than being derived twice.
 *
 * This module says nothing about what a stand-in CONTAINS. The spec's rule "ideal
 * shorts are components, never node merges" governs the output of the derivation, and
 * it still holds: every surviving 0R component is emitted as a component with both of
 * its distinct nets. Merging is a reasoning step, not a rewrite.
 */
import type { ResolvedComponent } from "../../model/control-state.ts"

/** Every net this component's pins name, package pins included. */
export function nodesOf(component: ResolvedComponent): readonly string[] {
  const nodes = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) {
    for (const net of Object.values(unit.pins)) nodes.add(net)
  }
  return [...nodes]
}

/** Partition components into pieces that share no net.
 *
 * Moved here from the retired `isolate.ts`: a graph utility over `ResolvedComponent`s,
 * exactly like `nodesOf` and `electricalNodes` above, with nothing in it specific to
 * isolation. `admittance.ts` uses it to find the connected piece attached to a
 * boundary; `isolate.ts` used it the same way to find each piece needing its own
 * isolation point, and still needing that answer is a fact about isolation, not about
 * this function. */
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

/** An ideal short: a component whose terminals sit at one potential however much
 * current flows through it.
 *
 * Resolution produces exactly one shape of these - a pot arm at position 0, emitted as
 * a `resistor` with `ohms: 0` so component counts stay stable across a sweep. No other
 * kind is recognised: a zero-farad capacitor is an OPEN, not a short, and nothing a
 * flat Pultec section resolves to is a zero-henry inductor. A further zero-valued kind
 * must be added here deliberately, with a test, rather than inferred from its value
 * being zero - guessing in either direction changes which components survive the
 * reduction and what the boundary admittance comes out as.
 */
export function isIdealShort(component: ResolvedComponent): boolean {
  const parameters = component.parameters
  return component.kind === "resistor" && "ohms" in parameters && parameters.ohms === 0
}

/**
 * Map each net to its electrical node, merging the nets of every ideal short among the
 * components given.
 *
 * WHICH COMPONENTS THE CALLER PASSES IS THE WHOLE CONTRACT. `reduceToBoundary` passes
 * the components OTHER than the one under test, because merging a short through itself
 * turns it into a self-loop and deletes it - and low-cut's entire stand-in IS such a
 * short. `boundaryAdmittance` passes all of them, because it is measuring a network
 * rather than judging one component inside it.
 *
 * The class representative is the lexicographically smallest member, so a class never
 * depends on component order and two networks sharing a short name the merged node the
 * same way.
 */
export function electricalNodes(
  components: readonly ResolvedComponent[],
): (net: string) => string {
  const parent = new Map<string, string>()
  const find = (net: string): string => {
    const seen = parent.get(net)
    if (seen === undefined) {
      parent.set(net, net)
      return net
    }
    if (seen === net) return net
    const root = find(seen)
    parent.set(net, root)
    return root
  }
  const union = (a: string, b: string): void => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA === rootB) return
    if (rootA < rootB) parent.set(rootB, rootA)
    else parent.set(rootA, rootB)
  }
  for (const component of components) {
    if (!isIdealShort(component)) continue
    const nodes = nodesOf(component)
    for (let index = 1; index < nodes.length; index += 1) union(nodes[0]!, nodes[index]!)
  }
  return find
}

/**
 * The partition of `boundary` into short-circuit equivalence classes: which boundary
 * nets this network's ideal shorts have made one electrical node. Keyed by each class's
 * representative, with the class's boundary members sorted.
 *
 * THE PARTITION, NOT THE COUNT, IS THE PROPERTY. Two networks whose boundaries fall
 * into the same NUMBER of classes can still group different nets, so a comparison of
 * sizes passes a derivation that merged the wrong pair. Compare the classes.
 *
 * COMPARE THE VALUES, NOT THE KEYS. A representative is the lexicographic minimum over
 * ALL the nets in its class, internal ones included, so a class can be named after a
 * net that is not on the boundary at all - and two networks that join the same boundary
 * nets through different internal nets then agree on the classes while disagreeing on
 * what they are called. The keys exist because `boundaryAdmittance` needs a node name;
 * the equivalence claim lives in the values.
 *
 * This is what makes low-cut's exemption from numerical comparison a consequence rather
 * than a carve-out: its stand-in is one 0R arm between its two boundary nets, both
 * boundary nets land in one class, and `boundaryAdmittance` refuses because a network
 * whose whole boundary is one node presents no finite admittance. Nothing has to
 * remember the section's name to know that.
 */
export function boundaryPartition(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
): ReadonlyMap<string, readonly string[]> {
  const classOf = electricalNodes(components)
  const classes = new Map<string, string[]>()
  for (const net of [...boundary].sort()) {
    const representative = classOf(net)
    const members = classes.get(representative)
    if (members === undefined) classes.set(representative, [net])
    else members.push(net)
  }
  return classes
}
