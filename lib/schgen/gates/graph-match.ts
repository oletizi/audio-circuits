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
 * **TWO: THE REFINEMENT IS JOINT ACROSS THE TWO GRAPHS.** Colour refinement assigns each node a
 * signature from its neighbourhood, and the signatures are compressed each round because the raw
 * strings double in length. **Compressing the two sides independently would make `c3` on one side
 * unrelated to `c3` on the other** and every comparison downstream meaningless; `refineBoth` below
 * therefore assigns class ids over the UNION of both sides' signatures in each round.
 *
 * **THE SEARCH REFUSES RATHER THAN HANGING.** `MAX_BINDINGS` bounds the backtracking, and
 * exhausting it is reported as a PROBLEM - *"the search did not complete"* - which is a failure of
 * the gate and never a pass. A check that cannot finish must not resemble one that agreed.
 */
import type { ReferenceGraph } from "./reference-graph.ts"

/** Backtracking budget. A real circuit's refined signatures are almost always distinct, so this is never approached. */
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

const initialSignatures = (ix: Indexed): Map<string, string> => {
  const m = new Map<string, string>()
  for (const [k, base] of ix.base) {
    const pins = (ix.incident.get(k) ?? []).map((i) => i.pin)
    m.set(k, `${base}|pins:${[...new Set(pins)].sort().join(",")}`)
  }
  return m
}

/**
 * Both sides' node signatures, refined together until the partition over their UNION stops
 * growing.
 *
 * Round 0 is `<value>|<libId>` plus the node's own sorted pin numbers. Each later round appends,
 * per incident pin, the previous round's class of the node at the other end and that end's pin
 * number - so two nodes keep one class only while their neighbourhoods agree to the depth reached.
 * It is an invariant of any bijection, which is what licenses comparing the class multisets before
 * searching at all.
 */
function refineBoth(ia: Indexed, ib: Indexed): { readonly a: ReadonlyMap<string, string>; readonly b: ReadonlyMap<string, string> } {
  let a: Map<string, string> = initialSignatures(ia)
  let b: Map<string, string> = initialSignatures(ib)
  let classes = new Set([...a.values(), ...b.values()]).size
  const grow = (ix: Indexed, sig: ReadonlyMap<string, string>): Map<string, string> => {
    const out = new Map<string, string>()
    for (const [k, s] of sig) {
      const around = (ix.incident.get(k) ?? []).map((i) => `${i.pin}>${sig.get(i.other) ?? ""}.${i.otherPin}`).sort()
      out.set(k, `${s}[${around.join(";")}]`)
    }
    return out
  }
  for (let round = 0; round < Math.max(ia.base.size, ib.base.size); round += 1) {
    const ga = grow(ia, a)
    const gb = grow(ib, b)
    const all = [...new Set([...ga.values(), ...gb.values()])].sort()
    if (all.length === classes) return { a, b }
    const idOf = new Map(all.map((s, i): readonly [string, string] => [s, `c${i}`]))
    const compress = (m: ReadonlyMap<string, string>): Map<string, string> =>
      new Map([...m].map(([k, s]): readonly [string, string] => [k, idOf.get(s) ?? ""]))
    a = compress(ga)
    b = compress(gb)
    classes = all.length
  }
  return { a, b }
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

/** Per refined class, the distinct component signatures of the nodes in it - so a class id is readable. */
function classLabels(sig: ReadonlyMap<string, string>, ix: Indexed): ReadonlyMap<string, string> {
  const members = new Map<string, Set<string>>()
  for (const [k, c] of sig) {
    const set = members.get(c) ?? new Set<string>()
    set.add(ix.base.get(k) ?? "")
    members.set(c, set)
  }
  const out = new Map<string, string>()
  for (const [c, set] of members) out.set(c, [...set].sort().join(" / "))
  return out
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
export function matchGraphs(a: ReferenceGraph, b: ReferenceGraph, names: readonly [string, string]): MatchResult {
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

  const { a: sa, b: sb } = refineBoth(ia, ib)
  const labels = new Map([...classLabels(sa, ia), ...classLabels(sb, ib)])
  const countOf = (sig: ReadonlyMap<string, string>): ReadonlyMap<string, number> => {
    const n = new Map<string, number>()
    for (const c of sig.values()) n.set(c, (n.get(c) ?? 0) + 1)
    return n
  }
  const ca = countOf(sa)
  const cb = countOf(sb)
  const classMismatch = [...new Set([...ca.keys(), ...cb.keys()])]
    .filter((c) => (ca.get(c) ?? 0) !== (cb.get(c) ?? 0))
    .map((c) => `${labels.get(c) ?? c}: x${ca.get(c) ?? 0} in ${names[0]}, x${cb.get(c) ?? 0} in ${names[1]}`)
    .sort()
  if (classMismatch.length > 0) {
    return { ok: false, problems: [`topology differs: the refined neighbourhood classes do not match (${classMismatch.join("; ")})`] }
  }

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
      if (steps > MAX_BINDINGS) return false
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
  if (steps > MAX_BINDINGS) {
    return {
      ok: false,
      problems: [
        `the component-for-component match search did not complete within ${MAX_BINDINGS} bindings ` +
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
        `connection count and every refined neighbourhood class agreed (deepest ${deepest} of ` +
        `${order.length}; stuck at ${names[0]} ${stuck === undefined ? "(none)" : `${stuck} (${ia.base.get(stuck) ?? ""})`}). ` +
        "The two drawings hold the same parts wired into different shapes.",
    ],
  }
}
