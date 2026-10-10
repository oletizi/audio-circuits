/**
 * An INDEPENDENT liveness oracle, and the standing test that `reduceToBoundary` agrees
 * with it.
 *
 * WHY THIS EXISTS. Gate A1 asserts a stand-in is a SUBSET of its section's flat-resolved
 * components. That is necessary and not sufficient: a reduction that wrongly DROPS a live
 * component is still a subset. The obvious remedy - assert the stand-in contains exactly
 * the live components - would restate the predicate that produced it, which is circular.
 * Only an answer derived a different way catches over-dropping.
 *
 * SO THIS FILE IS WRITTEN FROM THE SPEC'S DEFINITION, NOT FROM `reduce.ts`. The
 * definition, from "Reduction: what the derivation may and may not do" in
 * docs/superpowers/specs/2026-10-09-pultec-section-scaffold-design.md:
 *
 *   A component is LIVE when a SIMPLE path (no repeated node) exists between two
 *   DISTINCT boundary ELECTRICAL nodes that traverses it.
 *
 * The method here is exhaustive depth-first enumeration of simple paths. The production
 * reduction decides the same question another way entirely (it is a flow argument over a
 * split-node graph), so the two agreeing is evidence rather than a tautology. Brute force
 * is affordable because these networks are tens of components at most.
 *
 * The only thing taken from production is `electricalNodes`, and deliberately: node
 * identity under ideal shorts is a shared primitive, not the algorithm under test. Note
 * the subtlety it documents and this oracle obeys - when judging component X, merge every
 * OTHER ideal short but never X itself. Low-cut's 0-ohm arm IS its stand-in and is
 * precisely what makes `hi_boost_out` and `out` one node; merging through it would turn it
 * into a self-loop and delete the section's only component.
 */
import { test, expect } from "bun:test"
import { reduceToBoundary } from "../../lib/board/scaffold/reduce.ts"
import { electricalNodes } from "../../lib/board/scaffold/shorts.ts"
import { REFERENCE_FLAT, resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { discoverBoundary } from "../../lib/board/scaffold/boundary.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { ResolvedComponent, ResolvedNetwork } from "../../lib/model/control-state.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

/** Every net this component's pins name - package pins and unit pins alike.
 *
 * Written here rather than imported so the oracle's notion of "which nodes does this
 * component touch" is its own. It is four lines; sharing them would buy nothing and cost
 * the independence this whole file is for. */
function netsOf(component: ResolvedComponent): readonly string[] {
  const nets = new Set<string>(Object.values(component.pins))
  for (const unit of component.units) {
    for (const net of Object.values(unit.pins)) nets.add(net)
  }
  return [...nets]
}

interface Traversal {
  /** The electrical node this traversal arrives at. */
  readonly to: string
  /** Index into the component list of the component traversed to get there. */
  readonly through: number
}

/**
 * Traversals available from each electrical node.
 *
 * Traversing a component means entering at one of its nodes and leaving by another, so a
 * component contributes a traversal between every pair of DISTINCT electrical nodes it
 * touches. A two-terminal part therefore contributes one (in both directions); a part
 * whose nodes have all been merged into one contributes none, which is what makes a
 * self-loop - and a component shorted across - inert without a special case.
 */
function traversals(
  components: readonly ResolvedComponent[],
  classOf: (net: string) => string,
): ReadonlyMap<string, readonly Traversal[]> {
  const map = new Map<string, Traversal[]>()
  const at = (node: string): Traversal[] => {
    const existing = map.get(node)
    if (existing !== undefined) return existing
    const fresh: Traversal[] = []
    map.set(node, fresh)
    return fresh
  }
  components.forEach((component, through) => {
    const nodes = [...new Set(netsOf(component).map(classOf))]
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        at(nodes[a]!).push({ to: nodes[b]!, through })
        at(nodes[b]!).push({ to: nodes[a]!, through })
      }
    }
  })
  return map
}

/**
 * Is the component at `index` live?
 *
 * Depth-first search for a simple path that starts at a boundary electrical node, ends at
 * a DIFFERENT boundary electrical node, and traverses the component under test somewhere
 * along the way. The visited set is what makes the path simple: an earlier production
 * implementation asked only whether each side could REACH a boundary node, and two
 * capacitors in parallel on a dead-end switch throw each reached it through the other, by
 * a route that left a node and came back to it. A cycle carries no current.
 *
 * `visited` already contains the start, so any boundary node the search arrives at is
 * necessarily distinct from it. The search is free to continue past a boundary node: a
 * path that only picks up the component under test after passing one is still found,
 * because the remainder is itself a simple path between two distinct boundary nodes and
 * the outer loop starts a search from every boundary node.
 */
function isLive(
  components: readonly ResolvedComponent[],
  boundary: ReadonlySet<string>,
  index: number,
): boolean {
  const others = components.filter((_, other) => other !== index)
  const classOf = electricalNodes(others)
  const reachable = traversals(components, classOf)
  const boundaryClasses = new Set<string>([...boundary].map(classOf))
  const noTraversals: readonly Traversal[] = []

  for (const start of boundaryClasses) {
    const visited = new Set<string>([start])
    const walk = (node: string, traversedTest: boolean): boolean => {
      for (const step of reachable.get(node) ?? noTraversals) {
        if (visited.has(step.to)) continue
        const traversed = traversedTest || step.through === index
        if (traversed && boundaryClasses.has(step.to)) return true
        visited.add(step.to)
        if (walk(step.to, traversed)) return true
        visited.delete(step.to)
      }
      return false
    }
    if (walk(start, false)) return true
  }
  return false
}

/** The ids the oracle judges live, sorted. */
function oracleLive(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
): readonly string[] {
  return resolved.components
    .filter((_, index) => isLive(resolved.components, boundary, index))
    .map((component) => component.id)
    .sort()
}

/**
 * Where a candidate reduction differs from the oracle, as readable sentences.
 *
 * Both directions are reported and they are not the same failure: "kept an inert
 * component" is what Gate A1's subset check would also catch, while "dropped a live
 * component" is the one it cannot see and the reason this oracle exists.
 */
function disagreements(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
  candidate: readonly ResolvedComponent[],
): readonly string[] {
  const live = new Set<string>(oracleLive(resolved, boundary))
  const kept = new Set<string>(candidate.map((component) => component.id))
  const found: string[] = []
  for (const id of [...live].sort()) {
    if (!kept.has(id)) found.push(`dropped a live component: ${id}`)
  }
  for (const id of [...kept].sort()) {
    if (!live.has(id)) found.push(`kept an inert component: ${id}`)
  }
  return found
}

// --- 1. Agreement on the five real sections -------------------------------------------

for (const section of SECTIONS) {
  test(`oracle and reduceToBoundary agree on every component of ${section}`, () => {
    const boundary = discoverBoundary(section, modules, "0")
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    expect(resolved.components.length).toBeGreaterThan(0)
    expect(disagreements(resolved, boundary, reduceToBoundary(resolved, boundary))).toEqual([])
  })
}

// --- 2. Agreement on randomised networks ----------------------------------------------

/** mulberry32: a small seeded PRNG, so a failure is reproducible from its seed rather
 * than a story about a run that once happened. */
function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface RandomCase {
  readonly components: readonly ResolvedComponent[]
  readonly boundary: ReadonlySet<string>
  readonly idealShorts: number
  readonly selfLoops: number
  readonly parallelPairs: number
}

/** A small network built from the three shapes that broke earlier implementations: ideal
 * shorts, parallel edges and self-loops. Every case is guaranteed to contain at least one
 * of each - the coverage test below asserts it rather than trusting it. */
function randomCase(seed: number): RandomCase {
  const next = random(seed)
  const pick = (count: number): number => Math.floor(next() * count)
  const nodeCount = 3 + pick(4)
  const nodes = ["0", ...Array.from({ length: nodeCount - 1 }, (_, i) => `n${i + 1}`)]
  const node = (): string => nodes[pick(nodes.length)]!
  const boundary = new Set<string>(["0", nodes[1]!])
  if (pick(2) === 0 && nodes.length > 2) boundary.add(nodes[2]!)

  // One guaranteed ideal short across two distinct nodes, one guaranteed self-loop.
  const loop = node()
  const pairs: [string, string][] = [
    [nodes[0]!, nodes[1]!],
    [loop, loop],
  ]
  const extra = 1 + pick(5)
  for (let i = 0; i < extra; i += 1) pairs.push([node(), node()])
  // One guaranteed parallel edge: duplicate some existing pair of distinct nodes.
  const distinct = pairs.filter(([a, b]) => a !== b)
  pairs.push([...distinct[pick(distinct.length)]!])

  const components: ResolvedComponent[] = pairs.map(([a, b], index) => {
    const short = index === 0 || (index > 1 && pick(4) === 0)
    const capacitor = !short && pick(3) === 0
    return {
      id: `c${index}`,
      kind: capacitor ? "capacitor" : "resistor",
      parameters: capacitor ? { farads: 1e-7 } : { ohms: short ? 0 : 100 + index },
      pins: {},
      units: [{ name: "MAIN", pins: { a, b } }],
    }
  })

  const seen = new Map<string, number>()
  let parallelPairs = 0
  for (const [a, b] of pairs) {
    if (a === b) continue
    const key = [a, b].sort().join("|")
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 2) parallelPairs += 1
  }
  return {
    components,
    boundary,
    idealShorts: components.filter(
      (c) => c.kind === "resistor" && "ohms" in c.parameters && c.parameters.ohms === 0,
    ).length,
    selfLoops: pairs.filter(([a, b]) => a === b).length,
    parallelPairs,
  }
}

const BASE_SEED = 0x5ca1ab1e
const CASE_COUNT = 4000

test(`oracle and reduceToBoundary agree on ${CASE_COUNT} randomised networks`, () => {
  const failures: string[] = []
  let withShorts = 0
  let withSelfLoops = 0
  let withParallel = 0
  for (let i = 0; i < CASE_COUNT; i += 1) {
    const seed = (BASE_SEED + i * 2654435761) >>> 0
    const { components, boundary, idealShorts, selfLoops, parallelPairs } = randomCase(seed)
    if (idealShorts > 0) withShorts += 1
    if (selfLoops > 0) withSelfLoops += 1
    if (parallelPairs > 0) withParallel += 1
    const resolved: ResolvedNetwork = { ports: { ground: "0" }, components }
    const found = disagreements(resolved, boundary, reduceToBoundary(resolved, boundary))
    if (found.length === 0) continue
    const shape = components
      .map((c) => `${c.id}=${JSON.stringify(c.parameters)}${JSON.stringify(c.units[0]!.pins)}`)
      .join(" ")
    failures.push(
      `seed ${seed}: ${found.join("; ")} | boundary {${[...boundary].sort().join(",")}} | ${shape}`,
    )
  }
  if (failures.length > 0) {
    console.error(
      `base seed ${BASE_SEED}, ${CASE_COUNT} cases, ${failures.length} disagreed. ` +
        `Reproduce a single case with randomCase(<seed>):\n${failures.slice(0, 5).join("\n")}`,
    )
  }
  expect(failures).toEqual([])
  // Shape coverage: an agreement over networks that never contained the hard shapes
  // would prove nothing about them.
  expect(withShorts).toBe(CASE_COUNT)
  expect(withSelfLoops).toBe(CASE_COUNT)
  expect(withParallel).toBe(CASE_COUNT)
})

// --- 3. The oracle can disagree -------------------------------------------------------
// An oracle that cannot fail is decoration. These two feed it reductions known to be
// wrong in each of the two possible directions and assert it says so.

test("the oracle catches a reduction that DROPS a live component", () => {
  const boundary = discoverBoundary("mid", modules, "0")
  const resolved = resolveSectionFlat("mid", modules, REFERENCE_FLAT)
  const correct = reduceToBoundary(resolved, boundary)
  expect(correct.length).toBeGreaterThan(1)
  const dropped = correct[0]!
  expect(disagreements(resolved, boundary, correct.slice(1))).toEqual([
    `dropped a live component: ${dropped.id}`,
  ])
})

test("the oracle catches a reduction that KEEPS an inert component", () => {
  const boundary = discoverBoundary("mid", modules, "0")
  const resolved = resolveSectionFlat("mid", modules, REFERENCE_FLAT)
  const correct = reduceToBoundary(resolved, boundary)
  const keptIds = new Set<string>(correct.map((component) => component.id))
  const inert = resolved.components.find((component) => !keptIds.has(component.id))
  if (inert === undefined) {
    throw new Error(
      `Section mid's reduction kept all ${resolved.components.length} resolved ` +
        `components, so this test has no inert component to wrongly keep. It is not ` +
        `skipped and no substitute is invented: either the section or the reduction ` +
        `changed, and the mutation needs rewriting against the new topology.`,
    )
  }
  expect(disagreements(resolved, boundary, [...correct, inert])).toEqual([
    `kept an inert component: ${inert.id}`,
  ])
})
