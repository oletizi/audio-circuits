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
import { randomCase } from "./scaffold-oracle-networks.ts"
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
 * Where a candidate reduction differs from a live set, as readable sentences.
 *
 * Both directions are reported and they are not the same failure: "kept an inert
 * component" is what Gate A1's subset check would also catch, while "dropped a live
 * component" is the one it cannot see and the reason this oracle exists.
 */
function compare(
  live: readonly string[],
  candidate: readonly ResolvedComponent[],
): readonly string[] {
  const liveIds = new Set<string>(live)
  const kept = new Set<string>(candidate.map((component) => component.id))
  const found: string[] = []
  for (const id of [...liveIds].sort()) {
    if (!kept.has(id)) found.push(`dropped a live component: ${id}`)
  }
  for (const id of [...kept].sort()) {
    if (!liveIds.has(id)) found.push(`kept an inert component: ${id}`)
  }
  return found
}

function disagreements(
  resolved: ResolvedNetwork,
  boundary: ReadonlySet<string>,
  candidate: readonly ResolvedComponent[],
): readonly string[] {
  return compare(oracleLive(resolved, boundary), candidate)
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

/** Is this a 0-ohm resistor? Judged locally rather than through production's
 * `isIdealShort`, because this is a statement about what the generator emitted. */
function isZeroOhm(component: ResolvedComponent): boolean {
  const parameters = component.parameters
  return component.kind === "resistor" && "ohms" in parameters && parameters.ohms === 0
}

/** The distinct electrical nodes component `of` spans, with the shorts named by
 * `ignoring` left unmerged - the oracle's own discipline, so a span means what the
 * predicate sees. */
function spanOf(
  components: readonly ResolvedComponent[],
  of: number,
  ignoring: readonly number[],
): readonly string[] {
  const classOf = electricalNodes(components.filter((_, index) => !ignoring.includes(index)))
  return [...new Set(netsOf(components[of]!).map(classOf))].sort()
}

interface Shapes {
  /** 0-ohm resistors that genuinely merge two electrical nodes. */
  readonly merging: number
  /** Components spanning fewer than two electrical nodes: a written self-loop, or a part
   * whose nets another short merged. Either way it conducts nothing. */
  readonly inertSpans: number
  /** Pairs of components spanning the SAME two distinct electrical nodes. */
  readonly parallels: number
}

/**
 * What the predicate sees, not what the generator wrote.
 *
 * The distinction matters: a duplicated net pair whose nets another short merges is
 * electrically two self-loops rather than a parallel edge, and a 0-ohm resistor across
 * already-merged nets merges nothing. Counting raw pairs and raw 0-ohm values would let
 * `toBe(CASE_COUNT)` pass while the shape it names was never electrically present.
 */
function shapes(components: readonly ResolvedComponent[]): Shapes {
  let merging = 0
  let inertSpans = 0
  for (let index = 0; index < components.length; index += 1) {
    const span = spanOf(components, index, [index])
    if (span.length < 2) inertSpans += 1
    if (isZeroOhm(components[index]!) && span.length === 2) merging += 1
  }
  let parallels = 0
  for (let a = 0; a < components.length; a += 1) {
    for (let b = a + 1; b < components.length; b += 1) {
      const spanA = spanOf(components, a, [a, b])
      if (spanA.length !== 2) continue
      const spanB = spanOf(components, b, [a, b])
      if (spanB.length === 2 && spanA[0] === spanB[0] && spanA[1] === spanB[1]) parallels += 1
    }
  }
  return { merging, inertSpans, parallels }
}

const BASE_SEED = 0x5ca1ab1e
const CASE_COUNT = 4000

/** How many of the cases must have TWO OR MORE components judged live.
 *
 * The guard against this arm going degenerate again. It is a floor rather than an
 * equality so it does not become a change-detector on the generator, and it is wide of
 * the measured value (3873 of 4000; live-count histogram
 * `0:3 1:124 2:708 3:1032 4:829 5:690 6:392 7:175 8:47`) rather than snug against it.
 * For scale, the two versions review rejected scored 922 and 1745 here. */
const MULTI_LIVE_FLOOR = 3500

test(`oracle and reduceToBoundary agree on ${CASE_COUNT} randomised networks`, () => {
  const failures: string[] = []
  let withMerging = 0
  let withInertSpan = 0
  let withParallel = 0
  let multiLive = 0
  const histogram = new Map<number, number>()
  for (let i = 0; i < CASE_COUNT; i += 1) {
    const seed = (BASE_SEED + i * 2654435761) >>> 0
    const { components, boundary } = randomCase(seed)
    const { merging, inertSpans, parallels } = shapes(components)
    if (merging > 0) withMerging += 1
    if (inertSpans > 0) withInertSpan += 1
    if (parallels > 0) withParallel += 1
    const resolved: ResolvedNetwork = { ports: { ground: "0" }, components }
    const live = oracleLive(resolved, boundary)
    if (live.length >= 2) multiLive += 1
    histogram.set(live.length, (histogram.get(live.length) ?? 0) + 1)
    const found = compare(live, reduceToBoundary(resolved, boundary))
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
        `Rebuild one exactly with randomCase(<seed>) from ` +
        `tests/board/scaffold-oracle-networks.ts - it is a plain module, so a scratch ` +
        `script under \`bun run\` can import it.\n${failures.slice(0, 5).join("\n")}`,
    )
  }
  // Sliced: a systemic break would otherwise dump thousands of lines into the diff and
  // the first few are what anybody reads. The console line above carries the full count.
  expect(failures.slice(0, 5)).toEqual([])
  // Shape coverage, measured ELECTRICALLY - see `shapes`. An agreement over networks
  // that never electrically contained the hard shapes would prove nothing about them.
  expect(withMerging).toBe(CASE_COUNT)
  expect(withInertSpan).toBe(CASE_COUNT)
  expect(withParallel).toBe(CASE_COUNT)
  // And the arm must be answering something other than "everything is dead".
  if (multiLive < MULTI_LIVE_FLOOR) {
    console.error(
      `live-count histogram: ${[...histogram.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([live, count]) => `${live}:${count}`)
        .join(" ")}`,
    )
  }
  expect(multiLive).toBeGreaterThanOrEqual(MULTI_LIVE_FLOOR)
})

// --- 3. The oracle can disagree -------------------------------------------------------
// An oracle that cannot fail is decoration. These two feed it reductions known to be
// wrong in each of the two possible directions and assert it says so.

/** The section with the most live components at the reference flat state.
 *
 * CHOSEN BY THE DERIVATION, NOT NAMED. The two mutations below need a reduction with
 * something to take away and something to leave behind, and which section has the
 * largest one is a property of the reference flat state rather than a fixed fact: mid
 * had six live components while `midMode` was `boost` and has one now that it is `off`,
 * so a hard-coded `"mid"` turned a reference-setting change into a broken negative
 * control. Ties break on `SECTIONS` order, which is fixed, so the choice is
 * deterministic. It refuses rather than skipping if nothing qualifies.
 */
function largestReduction(): {
  readonly section: string
  readonly boundary: ReadonlySet<string>
  readonly resolved: ResolvedNetwork
  readonly correct: readonly ResolvedComponent[]
} {
  let best: ReturnType<typeof largestReduction> | undefined
  for (const section of SECTIONS) {
    const boundary = discoverBoundary(section, modules, "0")
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const correct = reduceToBoundary(resolved, boundary)
    if (best === undefined || correct.length > best.correct.length) {
      best = { section, boundary, resolved, correct }
    }
  }
  if (best === undefined || best.correct.length < 2) {
    throw new Error(
      `No section reduces to two or more live components at the reference flat state, ` +
        `so the oracle's drop mutation has nothing to drop that leaves a non-empty ` +
        `reduction behind. Largest was ${best?.section ?? "none"} with ` +
        `${best?.correct.length ?? 0}. This is not skipped and no substitute is ` +
        `invented: the reference state or the reduction changed, and the mutation ` +
        `needs rewriting against it.`,
    )
  }
  return best
}

test("the oracle catches a reduction that DROPS a live component", () => {
  const { section, boundary, resolved, correct } = largestReduction()
  expect(correct.length, section).toBeGreaterThan(1)
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
