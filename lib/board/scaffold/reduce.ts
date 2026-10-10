/**
 * Reduce a resolved section to what it presents at its boundary.
 *
 * KEEP EVERY COMPONENT THAT CARRIES CURRENT BETWEEN TWO BOUNDARY NODES; DROP ONLY WHAT
 * CARRIES NONE. No series or parallel collapsing, no star-mesh transform, no
 * elimination of internal nodes, and above all NO NODE MERGING IN THE OUTPUT - a
 * zero-ohm component stays a component, with both of its distinct nets.
 *
 * The result is a literal SUBSET of the section's own flat-state components, which is a
 * stronger property than "equivalent to" and is what makes the stand-in exact rather
 * than close. Nothing is fitted, so no numerical tolerance is ever what decides
 * correctness. The networks are one to six components already; there is nothing to
 * gain by reducing further and a whole class of impedance-altering bugs to avoid.
 *
 * `pruneFloatingBranches` is deliberately NOT used, and must not be. It prepares a
 * network for simulation under ONE source and load configuration, and a branch
 * irrelevant to that configuration can matter when a different boundary node is driven
 * by a neighbouring section. See the Reduction section of
 * `docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md`.
 *
 * Two readings of "inert" differ, and the difference is the bug this design replaces:
 * a branch BEYOND an ideal short is LIVE, not floating. `RV_LO_BOOST` at flat is a 0R
 * arm shorting `lo_boost_in` to ground, and a capacitor beyond it conducts - though a
 * capacitor ACROSS it does not, which is the next paragraph.
 *
 * LIVENESS IS DECIDED ON ELECTRICAL NODES; THE OUTPUT IS STILL BUILT ON GRAPH NODES.
 * Those are two different things, and conflating them was a real defect. The liveness
 * test used to run on the raw graph, where an ideal 0R component looks like an ordinary
 * edge between two nodes. But an ideal short makes its two nodes ONE ELECTRICAL NODE,
 * so a loop closed through a short reads as a path on the graph while carrying no
 * current at all. Six of the Pultec's 21 derived stand-in components were kept that
 * way: hi-boost's `C16`, `R3`, `RV_HI_Q.wiper-cw` and `L_HI_BOOST_300MH` formed a loop
 * from `in` back to `in` across `RV_HI_BOOST.ccw-wiper`, and low-cut's `C4` and
 * low-boost's `C21` each sat directly in parallel with a 0R pot arm. The parts list
 * then demanded a 0.3 H inductor, which has no part number, for a branch carrying
 * nothing.
 *
 * So, for the component X under test: merge every OTHER ideal short into electrical
 * nodes, then require X to span two DISTINCT electrical nodes and to lie on a SIMPLE
 * PATH between two DISTINCT boundary electrical nodes.
 *
 * NEVER MERGE THROUGH X ITSELF. If the merge included X, low-cut's entire stand-in
 * would vanish: that 0R arm IS the stand-in, and it is precisely what makes
 * `hi_boost_out` and `out` one electrical node, so merging through it would turn it
 * into a self-loop and delete it. Excluding X is also what keeps "the branch beyond a
 * short is live" true - a short is judged on the graph it shorts, not on itself.
 *
 * The spec's rule "ideal shorts are components, never node merges" is not weakened by
 * any of this: it governs what a stand-in CONTAINS. Every surviving 0R component is
 * still emitted as a component with its two distinct nets, no node of the output is
 * merged, and dropping components that carry nothing keeps the result a literal subset.
 */
import { electricalNodes, nodesOf } from "./shorts.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../model/control-state.ts"

/** Adjacency over ELECTRICAL nodes, with each component an undirected hyperedge
 * joining the electrical nodes of its nets. An ideal short in this graph is a
 * self-loop, which contributes nothing - its connectivity is already in the merge.
 */
function adjacency(
  components: readonly ResolvedComponent[],
  classOf: (net: string) => string,
): ReadonlyMap<string, readonly string[]> {
  const neighbours = new Map<string, Set<string>>()
  for (const component of components) {
    const nodes = [...new Set(nodesOf(component).map(classOf))]
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

interface FlowEdge {
  readonly to: number
  cap: number
  readonly rev: number
}

/** Does a SIMPLE path between two distinct boundary nodes run through an element
 * joining `a` to `b`?
 *
 * This is Menger's theorem, applied to the only question the reduction asks. Such a
 * path exists exactly when the graph WITHOUT that element carries two internally
 * vertex-disjoint paths, one from `a` and one from `b`, each ending on a boundary node
 * - the disjointness is what forces the two boundary ends to be distinct, and what
 * makes the concatenation `u..a - element - b..v` simple rather than a walk that
 * revisits a node.
 *
 * SO IT IS SOLVED AS A UNIT-CAPACITY FLOW, not as two independent searches. Two
 * one-sided reachability searches - even with each side blocking the other's node, the
 * form this file used to carry - are NOT sufficient, and hi-boost is the counterexample
 * that proves it: with `in` and `j20_p3` merged by `RV_HI_BOOST.ccw-wiper`, both ends
 * of `R3` reach the merged node, and one of them goes on from there to `hi_boost_out`.
 * Two searches see two distinct boundary nodes and call `R3` live; but every route to
 * `hi_boost_out` passes through the merged node that the other end already used, so no
 * simple path exists and `R3` carries nothing. Vertex capacities are what notice that.
 *
 * Each graph node is split into an in-node and an out-node joined by a capacity-1 edge,
 * which is what gives every node a capacity of one. A super-source feeds `a` and `b`; a
 * super-sink is fed by every boundary node. A flow of 2 is the answer.
 *
 * Note the earlier bug this construction also keeps fixed: an earlier version asked
 * only whether a component could REACH two boundary nodes, and two capacitors in
 * parallel on a dead-end switch throw each reached the boundary through the other, so
 * both were wrongly judged live. A path travels AROUND a component, and it may not
 * reuse the node the component's other end is standing on.
 */
function simplePathBetweenBoundary(
  a: string,
  b: string,
  graph: ReadonlyMap<string, readonly string[]>,
  boundary: ReadonlySet<string>,
): boolean {
  const index = new Map<string, number>()
  const idOf = (node: string): number => {
    const seen = index.get(node)
    if (seen !== undefined) return seen
    const assigned = index.size
    index.set(node, assigned)
    return assigned
  }
  for (const node of graph.keys()) idOf(node)
  idOf(a)
  idOf(b)
  for (const node of boundary) idOf(node)

  const nodeCount = index.size
  const source = 2 * nodeCount
  const sink = source + 1
  const edges: FlowEdge[][] = Array.from({ length: sink + 1 }, (): FlowEdge[] => [])
  const addEdge = (from: number, to: number, cap: number): void => {
    edges[from]!.push({ to, cap, rev: edges[to]!.length })
    edges[to]!.push({ to: from, cap: 0, rev: edges[from]!.length - 1 })
  }
  const inNode = (node: string): number => 2 * idOf(node)
  const outNode = (node: string): number => 2 * idOf(node) + 1

  for (const node of index.keys()) addEdge(inNode(node), outNode(node), 1)
  for (const [node, neighbours] of graph) {
    for (const next of neighbours) addEdge(outNode(node), inNode(next), 1)
  }
  addEdge(source, inNode(a), 1)
  addEdge(source, inNode(b), 1)
  for (const node of boundary) addEdge(outNode(node), sink, 1)

  let flow = 0
  // Two augmentations at most: the source emits two units and nothing more is asked.
  for (let round = 0; round < 2; round += 1) {
    const fromEdge = new Array<{ node: number; edge: number } | undefined>(sink + 1).fill(undefined)
    const seen = new Array<boolean>(sink + 1).fill(false)
    seen[source] = true
    const queue: number[] = [source]
    while (queue.length > 0 && !seen[sink]) {
      const node = queue.shift()!
      for (let edge = 0; edge < edges[node]!.length; edge += 1) {
        const candidate = edges[node]![edge]!
        if (candidate.cap <= 0 || seen[candidate.to]) continue
        seen[candidate.to] = true
        fromEdge[candidate.to] = { node, edge }
        queue.push(candidate.to)
      }
    }
    if (!seen[sink]) break
    for (let node = sink; node !== source; ) {
      const step = fromEdge[node]
      if (step === undefined) throw new Error("Augmenting path lost its predecessor")
      const edge = edges[step.node]![step.edge]!
      edge.cap -= 1
      edges[edge.to]![edge.rev]!.cap += 1
      node = step.node
    }
    flow += 1
  }
  return flow === 2
}

export function reduceToBoundary(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
): readonly ResolvedComponent[] {
  return resolved.components.filter((component) => {
    const others = resolved.components.filter((candidate) => candidate !== component)
    const classOf = electricalNodes(others)
    const graph = adjacency(others, classOf)
    const boundaryClasses = new Set<string>([...boundary].map(classOf))
    // One electrical node means no node pair and therefore no current: a self-loop on
    // the graph (`RV_LO_BOOST.wiper-cw`, which the rheostat wiring puts on one net),
    // or a component sitting directly across an ideal short (low-boost's `C21`).
    const nodes = [...new Set<string>(nodesOf(component).map(classOf))]
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (simplePathBetweenBoundary(nodes[i]!, nodes[j]!, graph, boundaryClasses)) return true
      }
    }
    return false
  })
}
