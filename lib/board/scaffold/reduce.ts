/**
 * Reduce a resolved section to what it presents at its boundary.
 *
 * KEEP EVERY COMPONENT ON A PATH BETWEEN TWO BOUNDARY NODES; DROP ONLY WHAT IS
 * GENUINELY DISCONNECTED. No series or parallel collapsing, no star-mesh transform, no
 * elimination of internal nodes, and above all NO NODE MERGING - a zero-ohm component
 * is an edge for path-finding and stays a component in the output.
 *
 * The result is a literal SUBSET of the section's own flat-state components, which is a
 * stronger property than "equivalent to" and is what makes the stand-in exact rather
 * than close. Nothing is fitted, so no numerical tolerance is ever what decides
 * correctness. The networks are three to five components already; there is nothing to
 * gain by reducing further and a whole class of impedance-altering bugs to avoid.
 *
 * `pruneFloatingBranches` is deliberately NOT used, and must not be. It prepares a
 * network for simulation under ONE source and load configuration, and a branch
 * irrelevant to that configuration can matter when a different boundary node is driven
 * by a neighbouring section. See the Reduction section of
 * `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`.
 *
 * Two readings of "inert" differ, and the difference is the bug this design replaces:
 * a branch beyond an ideal short is LIVE, not floating. `RV_LO_BOOST` at flat is a 0R
 * arm shorting `lo_boost_in` to ground, and the capacitor beyond it conducts.
 */
import type { ResolvedComponent, ResolvedNetwork } from "../../model/control-state.ts"

/** Every net this component's pins name, package pins included. */
function nodesOf(component: ResolvedComponent): readonly string[] {
  const nodes = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) {
    for (const net of Object.values(unit.pins)) nodes.add(net)
  }
  return [...nodes]
}

/** Adjacency over nets, with each component an undirected hyperedge joining its nets.
 * A zero-ohm component is an ordinary edge here: it carries connectivity without its
 * nodes being merged, which is exactly the distinction the spec requires.
 */
function adjacency(
  components: readonly ResolvedComponent[],
): ReadonlyMap<string, readonly string[]> {
  const neighbours = new Map<string, Set<string>>()
  for (const component of components) {
    const nodes = nodesOf(component)
    for (const node of nodes) {
      const set = neighbours.get(node) ?? new Set<string>()
      for (const other of nodes) if (other !== node) set.add(other)
      neighbours.set(node, set)
    }
  }
  const frozen = new Map<string, readonly string[]>()
  for (const [node, set] of neighbours) frozen.set(node, [...set])
  return frozen
}

/** Boundary nets reachable from `start`, never entering `blocked`.
 *
 * `graph` is built WITHOUT the component under test, so no separate exclusion is
 * needed here - an earlier draft carried one and it was worse than redundant: it
 * blocked any edge whose two nets both sat on the excluded component, which is exactly
 * what a genuine PARALLEL element looks like.
 *
 * Blocking the component's other node is what makes this a test for a SIMPLE path. An
 * earlier version omitted it and asked only whether each side could reach a boundary
 * net; two capacitors in parallel on a dead-end switch throw then each reached the
 * boundary THROUGH THE OTHER, and both were wrongly kept. The route it was accepting
 * left `hi_boost_out`, crossed one capacitor to the dead-end net, and came back to
 * `hi_boost_out` across the other - a cycle, carrying no current anywhere.
 */
function boundaryReachable(
  start: string,
  blocked: string,
  graph: ReadonlyMap<string, readonly string[]>,
  boundary: ReadonlySet<string>,
): Set<string> {
  const found = new Set<string>()
  if (boundary.has(start)) found.add(start)
  const seen = new Set<string>([start, blocked])
  const queue: string[] = [start]
  while (queue.length > 0) {
    const node = queue.shift()!
    for (const next of graph.get(node) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      if (boundary.has(next)) found.add(next)
      queue.push(next)
    }
  }
  return found
}

export function reduceToBoundary(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
): readonly ResolvedComponent[] {
  return resolved.components.filter((component) => {
    const others = resolved.components.filter((candidate) => candidate !== component)
    const graph = adjacency(others)
    const nodes = nodesOf(component)
    // A self-loop - both pins on one net, as the rheostat wiring produces for
    // `RV_LO_BOOST.wiper-cw` - has no node pair and carries no current.
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]!
        const b = nodes[j]!
        const fromA = boundaryReachable(a, b, graph, boundary)
        const fromB = boundaryReachable(b, a, graph, boundary)
        // Live when a simple path runs boundary -> a -> component -> b -> boundary,
        // with the two boundary ends DISTINCT. One boundary net at both ends is a
        // stub, or a loop, and conducts nowhere.
        for (const u of fromA) {
          for (const v of fromB) if (u !== v) return true
        }
      }
    }
    return false
  })
}
