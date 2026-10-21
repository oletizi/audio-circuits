/**
 * **AN EXACT NODE-FOR-NODE MATCH BETWEEN TWO `ReferenceGraph`s, KEYED BY VALUE, LIBRARY ID AND
 * PIN-LEVEL ADJACENCY - NEVER BY DESIGNATOR AND NEVER BY NET NAME.**
 *
 * This is the half of gate 8 that makes *"an undeclared difference fails by construction"* true
 * rather than likely. Multiset invariants - the same components, the same pin-to-pin pairs - are
 * NECESSARY and not sufficient: two different circuits can share every one of them. So after the
 * invariants agree a bijection is searched for, and **a graph pair that has none is reported as a
 * difference although every count matched.**
 *
 * **WHY `node.key` CANNOT LAUNDER A DIFFERENCE.** `ReferenceGraph.nodes[i].key` is the netlist's
 * own designator and it is used for exactly one thing: naming the two ends of an adjacency pair so
 * the pairs can be joined back to the nodes. **Nothing below compares two keys.** The reference
 * lock (Task 6) assigns designators, and the criterion `docs/known-gaps.md` recorded for this gate
 * before it had a task is that the lock must not be able to launder a difference through them. Net
 * names never enter at all: `graphFromNetlist` turns each net into the set of pin pairs on it and
 * drops the name.
 *
 * **WHAT THIS IS NOT: it is NOT a transcription of `$SCHGEN_SOURCE/gates/oscar/canonical.ts`'s
 * `isomorphic`.** That function is written against `Subgraph`/`SubPart`, which carry a
 * subcircuit's anchors, rails and outside-contact counts - the OSCAR boundary M1 does not port -
 * and it pairs the pins of a part declared SYMMETRIC either way round. The search here is
 * structured the same way (an invariant pass that names the offending parts, then a backtracking
 * bijection ordered by rarest signature), because that is the right structure, but every line is
 * written against `ReferenceGraph` and the two differences below are deliberate.
 *
 * **ONE: IT HAS NO SYMMETRY MODEL, AND THAT MAKES IT STRICTER, NEVER MORE LENIENT.** Upstream
 * treats an allow-listed non-polarised two-pin symbol's pins as interchangeable
 * (`SYMMETRIC_LIB_IDS` plus a per-netlist declaration, each id checked against its `<libpart>`'s
 * polarity mark). Here every pin matches BY NUMBER, so a capacitor whose two pads are wired the
 * other way round from the reference is reported as a difference. **That is a defect report, not a
 * false positive to be tuned away**: the rule this gate exists for is that a difference found by
 * looking at output is a defect report until some declared transformation accounts for it. Porting
 * the allow-list needs the `<libpart>` polarity data, which `lib/kicad/netlist.ts`'s
 * `importNetlist` does not expose; `docs/known-gaps.md` records that and what it would cost.
 *
 * **TWO: THERE IS NO COLOUR REFINEMENT, AND IT WAS REMOVED AFTER BEING MEASURED.** The first
 * version of this module refined each node's signature from its neighbourhood until the partition
 * stopped growing, compressing the signatures each round over the union of both sides. It was
 * **deleted, because three measurements said it earned nothing** (`docs/known-gaps.md` **G241**
 * records them): the whole loop could be perturbed out of existence and every check in this
 * repository stayed green; it is a bijection INVARIANT, so it can only ever prune a search that
 * would have reached the same verdict; and timed against both real references and a fourteen-way
 * fully symmetric resistor ladder it was **marginally SLOWER** than not having it, because
 * `consistent` below already prunes on the first bound neighbour. Keeping it would have been sixty
 * lines of machinery exercised only by its own absence. **What survives is the signature itself**,
 * `<value>|<libId>|<connected pins>`, as the key that decides which nodes may map to which.
 *
 * **THE SEARCH REFUSES RATHER THAN HANGING.** `MAX_BINDINGS` bounds the backtracking, and
 * exhausting it is reported as a PROBLEM - *"the search did not complete"* - which is a failure of
 * the gate and never a pass. A check that cannot finish must not resemble one that agreed.
 */
import type { ReferenceGraph } from "./reference-graph.ts"

/** Backtracking budget. A real circuit's component signatures are almost always distinct, so this is never approached. */
export const MAX_BINDINGS = 2_000_000

/** `<key>.<pin>`, as `ReferenceGraph.adjacency` names an endpoint. */
type Endpoint = string

interface Incidence {
  /** This node's pin. */
  readonly pin: string
  /** The node at the other end - the same node when both pins of one part sit on one net. */
  readonly other: string
  readonly otherPin: string
}

interface Indexed {
  /** node key -> `<value>|<libId>`, which is what the comparison keys on. */
  readonly base: ReadonlyMap<string, string>
  /** node key -> its incidences, sorted. */
  readonly incident: ReadonlyMap<string, readonly Incidence[]>
  /** `a|b` with a < b, for every adjacency pair, so membership is a lookup. */
  readonly edges: ReadonlySet<string>
}

const edgeKey = (a: Endpoint, b: Endpoint): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

function split(e: Endpoint): { readonly key: string; readonly pin: string } {
  const dot = e.lastIndexOf(".")
  if (dot <= 0 || dot === e.length - 1) {
    throw new Error(
      `adjacency endpoint "${e}" is not "<node key>.<pin>". graphFromNetlist builds every endpoint ` +
        "that way; an endpoint in another shape means a hand-built graph, and it is refused rather " +
        "than parsed as a key with no pin.",
    )
  }
  return { key: e.slice(0, dot), pin: e.slice(dot + 1) }
}

function index(g: ReferenceGraph, name: string): Indexed {
  const base = new Map<string, string>()
  for (const n of g.nodes) {
    if (base.has(n.key)) throw new Error(`${name} graph lists node ${n.key} twice`)
    base.set(n.key, `${n.value}|${n.libId}`)
  }
  const incident = new Map<string, Incidence[]>()
  for (const k of base.keys()) incident.set(k, [])
  const edges = new Set<string>()
  for (const { a, b } of g.adjacency) {
    const x = split(a)
    const y = split(b)
    for (const side of [x, y]) {
      if (!base.has(side.key)) throw new Error(`${name} graph has an adjacency on ${side.key}, which is not one of its nodes`)
    }
    edges.add(edgeKey(a, b))
    incident.get(x.key)?.push({ pin: x.pin, other: y.key, otherPin: y.pin })
    incident.get(y.key)?.push({ pin: y.pin, other: x.key, otherPin: x.pin })
  }
  const sorted = new Map<string, readonly Incidence[]>()
  const order = (p: Incidence, q: Incidence): number =>
    p.pin < q.pin ? -1 : p.pin > q.pin ? 1 : p.otherPin < q.otherPin ? -1 : p.otherPin > q.otherPin ? 1 : 0
  for (const [k, list] of incident) sorted.set(k, [...list].sort(order))
  return { base, incident: sorted, edges }
}

/**
 * Each node's signature: `<value>|<libId>|<connected pins>` - which nodes the search may map to
 * which, and nothing else about a node is allowed to decide that.
 *
 * **IT IS A GROUPING KEY AND NOT A CHECK, which was measured rather than assumed.** A comparison
 * of the two sides' signature multisets stood here and was deleted: perturbing it away left every
 * check in this repository green, and so did dropping the pin list from the key
 * (`docs/known-gaps.md` **G241**). It cannot change a verdict either: the component multiset, the
 * edge count and the connection multiset have already agreed by the time this is built, and an
 * injective node map that preserves pin numbers over equal edge counts covers every edge on both
 * sides - so a pin-set difference cannot survive the search even with a coarser key. What the pin
 * list buys is a smaller candidate list.
 */
const signaturesOf = (ix: Indexed): Map<string, string> => {
  const m = new Map<string, string>()
  for (const [k, base] of ix.base) {
    const pins = (ix.incident.get(k) ?? []).map((i) => i.pin)
    m.set(k, `${base}|pins:${[...new Set(pins)].sort().join(",")}`)
  }
  return m
}

/** Elements of xs in excess of ys, as sorted `<item> x<n>`. */
export function multisetDiff(xs: readonly string[], ys: readonly string[]): string[] {
  const count = new Map<string, number>()
  for (const x of xs) count.set(x, (count.get(x) ?? 0) + 1)
  for (const y of ys) count.set(y, (count.get(y) ?? 0) - 1)
  return [...count.entries()].filter(([, n]) => n > 0).map(([k, n]) => `${k} x${n}`).sort()
}

/** Every component the graph holds, as `<value>|<libId>` - the keys the comparison uses. */
const componentSignatures = (ix: Indexed): string[] => [...ix.base.values()]

/**
 * Every pin-to-pin pair, named by what its two pins BELONG to rather than by designator: a
 * rewiring that keeps every component and every connection count still moves a pair here.
 */
function connectionSignatures(ix: Indexed): string[] {
  return [...ix.edges].map((e) => {
    const bar = e.indexOf("|")
    const x = split(e.slice(0, bar))
    const y = split(e.slice(bar + 1))
    return [`${ix.base.get(x.key) ?? ""}.${x.pin}`, `${ix.base.get(y.key) ?? ""}.${y.pin}`].sort().join(" - ")
  })
}

export interface MatchResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

/**
 * Whether `a` and `b` describe the same circuit, with every difference named.
 *
 * `names` are how the two sides are spoken of in a problem - e.g. `["generated", "reference"]`.
 */
export function matchGraphs(
  a: ReferenceGraph,
  b: ReferenceGraph,
  names: readonly [string, string],
  /**
   * The backtracking budget. It is a parameter ONLY so the refusal below can be driven by a test:
   * a refusal path no check has ever taken is a refusal nobody knows works, and this one is the
   * difference between "the gate could not finish" and a pass. Production callers omit it.
   */
  maxBindings: number = MAX_BINDINGS,
): MatchResult {
  const ia = index(a, names[0])
  const ib = index(b, names[1])

  const problems: string[] = []
  const compOnlyA = multisetDiff(componentSignatures(ia), componentSignatures(ib))
  const compOnlyB = multisetDiff(componentSignatures(ib), componentSignatures(ia))
  if (compOnlyA.length > 0) problems.push(`components only in ${names[0]}: ${compOnlyA.join(", ")}`)
  if (compOnlyB.length > 0) problems.push(`components only in ${names[1]}: ${compOnlyB.join(", ")}`)
  if (ia.edges.size !== ib.edges.size) {
    problems.push(`${names[0]} holds ${ia.edges.size} pin-to-pin connection(s) and ${names[1]} holds ${ib.edges.size}`)
  }
  const connOnlyA = multisetDiff(connectionSignatures(ia), connectionSignatures(ib))
  const connOnlyB = multisetDiff(connectionSignatures(ib), connectionSignatures(ia))
  if (connOnlyA.length > 0) problems.push(`connections only in ${names[0]}: ${connOnlyA.join(", ")}`)
  if (connOnlyB.length > 0) problems.push(`connections only in ${names[1]}: ${connOnlyB.join(", ")}`)
  if (problems.length > 0) return { ok: false, problems }

  const sa = signaturesOf(ia)
  const sb = signaturesOf(ib)
  const byClass = new Map<string, string[]>()
  for (const [k, c] of sb) {
    const list = byClass.get(c) ?? []
    list.push(k)
    byClass.set(c, list)
  }
  const sizeOf = (k: string): number => (byClass.get(sa.get(k) ?? "") ?? []).length
  const order = [...sa.keys()].sort((x, y) => sizeOf(x) - sizeOf(y) || (x < y ? -1 : x > y ? 1 : 0))

  const bound = new Map<string, string>()
  const usedB = new Set<string>()
  let steps = 0
  let deepest = 0
  const consistent = (ga: string, gb: string): boolean => {
    for (const i of ia.incident.get(ga) ?? []) {
      // The other end is this same node when both of a part's pins sit on one net.
      const mapped = i.other === ga ? gb : bound.get(i.other)
      if (mapped === undefined) continue
      if (!ib.edges.has(edgeKey(`${gb}.${i.pin}`, `${mapped}.${i.otherPin}`))) return false
    }
    return true
  }
  const search = (i: number): boolean => {
    if (i >= order.length) return true
    if (i > deepest) deepest = i
    const ga = order[i]
    if (ga === undefined) throw new Error(`internal: no node at search position ${i} of ${order.length}`)
    for (const gb of byClass.get(sa.get(ga) ?? "") ?? []) {
      if (usedB.has(gb)) continue
      steps += 1
      if (steps > maxBindings) return false
      if (!consistent(ga, gb)) continue
      bound.set(ga, gb)
      usedB.add(gb)
      if (search(i + 1)) return true
      bound.delete(ga)
      usedB.delete(gb)
    }
    return false
  }
  if (search(0)) return { ok: true, problems: [] }
  if (steps > maxBindings) {
    return {
      ok: false,
      problems: [
        `the component-for-component match search did not complete within ${maxBindings} bindings ` +
          `(deepest ${deepest} of ${order.length} components). This is NOT a pass and NOT a stated ` +
          "difference: the gate could not finish, and a check that could not run must never read " +
          "like one that agreed. Report it rather than raising the budget blind.",
      ],
    }
  }
  const stuck = order[deepest]
  return {
    ok: false,
    problems: [
      "topology differs: no component-for-component match exists although every component, every " +
        `connection count and every component signature agreed (deepest ${deepest} of ` +
        `${order.length}; stuck at ${names[0]} ${stuck === undefined ? "(none)" : `${stuck} (${ia.base.get(stuck) ?? ""})`}). ` +
        "The two drawings hold the same parts wired into different shapes.",
    ],
  }
}
