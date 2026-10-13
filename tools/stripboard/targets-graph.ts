/**
 * The NET GRAPH: nets as vertices, on-board components as the edges they force,
 * and the one arrangement of it this pipeline derives.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-pipeline-design.md` P0, through CRITERIA section 5's
 * `K1`, exactly as for `./targets.ts` - this file is a SEAM in that task's
 * module and not a second specification. Where the two differ the document wins
 * and this comment is the defect.
 *
 * **IT IS A SEPARATE FILE FROM `./targets.ts` FOR THE 500-LINE CEILING, AT THE
 * SEAM BETWEEN WHAT A GRAPH IS AND WHAT A BOARD IS GRADED AGAINST.** Everything
 * here answers *which nets are adjacent, in what order, how wide* and reads no
 * board, no dump and no rules; `./targets.ts` answers *what are this board's
 * `N`, `P` and derived floor* and is the only front door - `deriveTargets` and
 * `deriveTargetsFrom` both call into this file and nothing else does. The one
 * exported value a consumer outside needs is `TargetComponent`, which
 * `./targets.ts` re-exports so there is one import path for it rather than two.
 *
 * **NOTHING HERE READS A `Network`.** That is what lets the frozen benchmark's
 * targets be derived from a netlist export (`./targets-export.ts`) through the
 * same graph, ordering and bandwidth as a model-derived board's - see
 * `TargetComponent` below.
 */
/**
 * One component as this derivation reads it: the nets its pins name, once per
 * pin, and whether it sits on the board.
 *
 * **IT EXISTS BECAUSE THE FROZEN BENCHMARK HAS NO `Network` TO READ.**
 * `B1-frozen` is stated against the model as it stood at one commit, and the
 * only form of that model this repository keeps is a netlist export
 * (`tests/fixtures/stripboard/pultec-low-boost-frozen.netlist`) - importing the
 * model itself would need a checkout of that commit, and re-exporting from
 * today's model would restate the benchmark against a different circuit. So the
 * derivation takes this shape and `./targets-export.ts` is the second front
 * door that builds it from an export. **There is still one graph, one ordering
 * and one floor**: both doors land on `deriveTargetsFrom`, which is what keeps
 * `N`, `P`, `C_floor` and the arrangement from being computed twice.
 */
export interface TargetComponent {
  /** What a refusal names it by - a component id from a model, a designator from an export. */
  readonly id: string
  /** Every net its pins name, once per pin, so `P` is the sum of these lengths. */
  readonly pinNets: readonly string[]
  readonly onBoard: boolean
}

/**
 * One net, its neighbours held as object references rather than by name.
 *
 * References rather than a name-keyed map so that every traversal below is
 * total by construction: there is no lookup that can miss and therefore no
 * branch that must either invent a vertex or skip an edge. `position` is the
 * ordering's assignment, and the bandwidth is read off those positions.
 */
export interface Vertex {
  readonly net: string
  readonly neighbours: Vertex[]
  position: number
}

/** The pair key for an unordered edge, low end first. */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

export interface BuiltGraph {
  readonly vertices: readonly Vertex[]
  readonly edges: readonly (readonly [string, string])[]
}

/**
 * The vertices and edges: every net a vertex, every on-board component's
 * distinct net pairs an edge, de-duplicated so two parts joining one pair
 * count once.
 */
export function buildGraph(components: readonly TargetComponent[]): BuiltGraph {
  const byNet = new Map<string, Vertex>()
  const vertexFor = (netName: string): Vertex => {
    const existing = byNet.get(netName)
    if (existing !== undefined) return existing
    const created: Vertex = { net: netName, neighbours: [], position: -1 }
    byNet.set(netName, created)
    return created
  }

  for (const component of components) {
    for (const netName of component.pinNets) vertexFor(netName)
  }

  const keys = new Set<string>()
  const edges: (readonly [string, string])[] = []
  for (const component of components) {
    if (!component.onBoard) continue
    const touched = [...new Set(component.pinNets)].sort()
    for (let i = 0; i < touched.length; i += 1) {
      for (let j = i + 1; j < touched.length; j += 1) {
        const a = touched[i]
        const b = touched[j]
        const key = edgeKey(a, b)
        if (keys.has(key)) continue
        keys.add(key)
        edges.push([a, b])
        const va = vertexFor(a)
        const vb = vertexFor(b)
        va.neighbours.push(vb)
        vb.neighbours.push(va)
      }
    }
  }

  const vertices = [...byNet.values()].sort((a, b) => (a.net < b.net ? -1 : a.net > b.net ? 1 : 0))
  edges.sort((left, right) => (left[0] === right[0]
    ? (left[1] < right[1] ? -1 : 1)
    : (left[0] < right[0] ? -1 : 1)))
  return { vertices, edges }
}

/** Fewest neighbours first, then by name, so the ordering is reproducible. */
function byDegreeThenName(a: Vertex, b: Vertex): number {
  if (a.neighbours.length !== b.neighbours.length) return a.neighbours.length - b.neighbours.length
  return a.net < b.net ? -1 : a.net > b.net ? 1 : 0
}

/**
 * The reverse Cuthill-McKee ordering, and the positions it assigns.
 *
 * Breadth-first from the lowest-degree unvisited vertex, neighbours taken in
 * increasing degree, each connected component laid down contiguously, the
 * whole reversed at the end. A net no on-board component touches is its own
 * component and lands in a block of its own, so it separates no edge's
 * endpoints and cannot inflate the bandwidth.
 */
export function reverseCuthillMcKee(vertices: readonly Vertex[]): readonly Vertex[] {
  const visited = new Set<Vertex>()
  const order: Vertex[] = []
  for (const root of [...vertices].sort(byDegreeThenName)) {
    if (visited.has(root)) continue
    visited.add(root)
    const queue: Vertex[] = [root]
    // An index rather than `shift()`, which is typed `Vertex | undefined` and
    // would need an unreachable branch to narrow.
    for (let head = 0; head < queue.length; head += 1) {
      const vertex = queue[head]
      order.push(vertex)
      for (const neighbour of [...vertex.neighbours].sort(byDegreeThenName)) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        queue.push(neighbour)
      }
    }
  }
  const reversed = [...order].reverse()
  reversed.forEach((vertex, index) => { vertex.position = index })
  return reversed
}

/** The widest gap an edge spans in the ordering: `max |pos(a) − pos(b)|`. */
export function bandwidthOf(ordered: readonly Vertex[]): number {
  let widest = 0
  for (const vertex of ordered) {
    for (const neighbour of vertex.neighbours) {
      widest = Math.max(widest, Math.abs(vertex.position - neighbour.position))
    }
  }
  return widest
}
