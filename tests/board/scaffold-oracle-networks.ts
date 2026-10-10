/**
 * Seeded random networks for the liveness oracle's agreement test.
 *
 * A PLAIN MODULE, not a test file, for two reasons. It is a different concern from the
 * oracle - generating topologies rather than deciding liveness - and keeping them apart
 * keeps both files inside this repository's size rule. And because it is not a test file,
 * a seed printed by a failure can be rebuilt with `bun run` from a scratch script rather
 * than only from inside the test runner, which is the whole point of printing it.
 *
 * It follows the existing convention for test-support modules: `tests/sim/helpers.ts`,
 * `tests/cli/perfboard-test-helpers.ts`.
 */
import { electricalNodes } from "../../lib/board/scaffold/shorts.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

export interface RandomCase {
  readonly components: readonly ResolvedComponent[]
  readonly boundary: ReadonlySet<string>
}

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

interface Draft {
  readonly a: string
  readonly b: string
  readonly short: boolean
  readonly capacitor: boolean
}

function toComponent(draft: Draft, index: number): ResolvedComponent {
  const capacitor = draft.capacitor && !draft.short
  return {
    id: `c${index}`,
    kind: capacitor ? "capacitor" : "resistor",
    parameters: capacitor ? { farads: 1e-7 } : { ohms: draft.short ? 0 : 100 + index },
    pins: {},
    units: [{ name: "MAIN", pins: { a: draft.a, b: draft.b } }],
  }
}

/**
 * A small network built from the three shapes that broke earlier liveness
 * implementations: ideal shorts, parallel edges and self-loops. Every case is guaranteed
 * to contain at least one of each ELECTRICALLY rather than merely nominally, and the
 * agreement test classifies what the predicate sees rather than trusting this
 * construction.
 *
 * TWO DEGENERACIES THIS GENERATOR EXISTS TO AVOID, both found by review of earlier
 * versions, and both of which made 4000 cases cover far less than that sounds like:
 *
 * - *A short straight across the boundary.* The first version pinned the guaranteed
 *   0-ohm part to the two boundary nets. So in EVERY case the boundary pre-merged into
 *   one electrical node, nothing but that short could possibly be live, and 2338 of the
 *   2458 one-live cases kept that single forced survivor. The short's nets are now drawn,
 *   and a boundary-to-boundary pair refused.
 * - *Nothing to be live.* Drawing every component freely then left 1536 of 4000 cases
 *   with no boundary-to-boundary path at all, so the arm still mostly asked about dead
 *   networks. A two-component series chain between two boundary nets through an internal
 *   one is now laid down first. It is not GUARANTEED live - a drawn short may still merge
 *   the boundary, which is legitimate variety - but dead is down to 3 cases in 4000.
 *
 * The last two components are placed against the electrical classes the earlier ones
 * induce, because a duplicated net pair whose nets another short merges is electrically
 * two self-loops, and a 0-ohm part across already-merged nets merges nothing. Placing
 * them blind is what made the nominal shape counters overstate their coverage.
 */
export function randomCase(seed: number): RandomCase {
  const next = random(seed)
  const pick = (count: number): number => Math.floor(next() * count)
  // Five nets minimum, so a boundary of up to three still leaves two internal ones, and
  // so the at-most-three shorts below can never merge the network into a single node.
  const nodeCount = 5 + pick(2)
  const nodes = ["0", ...Array.from({ length: nodeCount - 1 }, (_, i) => `n${i + 1}`)]
  const node = (): string => nodes[pick(nodes.length)]!
  const boundary = new Set<string>(["0", nodes[1]!])
  if (pick(2) === 0) boundary.add(nodes[2]!)
  const internal = nodes.filter((net) => !boundary.has(net))

  // The series chain, then the guaranteed self-loop, then free extras - some of which are
  // ideal shorts in their own right.
  const mid = internal[pick(internal.length)]!
  const loop = node()
  const drafts: Draft[] = [
    { a: "0", b: mid, short: false, capacitor: false },
    { a: mid, b: nodes[1]!, short: false, capacitor: true },
    { a: loop, b: loop, short: false, capacitor: false },
  ]
  const extra = 1 + pick(4)
  let extraShorts = 0
  for (let i = 0; i < extra; i += 1) {
    // At most two drawn shorts, so with the guaranteed one there are at most three over
    // at least five nets and at least two electrical nodes always remain. Two is also
    // what the real sections carry (a pot arm at zero), so this is representative rather
    // than merely convenient.
    const short = extraShorts < 2 && pick(4) === 0
    if (short) extraShorts += 1
    drafts.push({ a: node(), b: node(), short, capacitor: pick(3) === 0 })
  }

  // The guaranteed ideal short goes in BEFORE the parallel edge, and that order is what
  // keeps the two guarantees from fighting: the short must join two nets the others leave
  // distinct, and the duplicate must span two nets the short leaves distinct. Placed the
  // other way round, a short joining the duplicated pair's nets demotes it to two
  // self-loops, and the two conditions can then be jointly unsatisfiable.
  const classOfDrafts = electricalNodes(drafts.map(toComponent))
  const shortPairs: [string, string][] = []
  for (const a of nodes) {
    for (const b of nodes) {
      if (a >= b) continue
      if (classOfDrafts(a) === classOfDrafts(b)) continue
      if (boundary.has(a) && boundary.has(b)) continue
      shortPairs.push([a, b])
    }
  }
  if (shortPairs.length === 0) {
    throw new Error(
      `Seed ${seed}: no net pair joins two distinct electrical nodes without being ` +
        `boundary-to-boundary, over ${nodes.join(", ")} with boundary ` +
        `${[...boundary].sort().join(", ")}. The drawn shorts have merged the network ` +
        `into one node, which the net and short counts above are chosen to make ` +
        `impossible - so this is a guard on that arithmetic, not an expected outcome. ` +
        `Nothing is substituted: a 0-ohm part across already-merged nets merges nothing, ` +
        `and counting it as an ideal short is the overstatement this placement prevents.`,
    )
  }
  const [shortA, shortB] = shortPairs[pick(shortPairs.length)]!
  const shortDraft: Draft = { a: shortA, b: shortB, short: true, capacitor: false }
  drafts.push(shortDraft)

  // The guaranteed parallel edge: duplicate a component whose two nets are distinct
  // electrical nodes when the pair itself is set aside, which is how the parallel shape
  // is judged. The guaranteed short always qualifies - setting it aside unmerges its own
  // nets, by construction distinct - so this list is never empty however much the drawn
  // shorts collapsed; a plain part across a 0-ohm arm is a real Pultec shape besides. A
  // duplicate is always a plain part, never a second short, so it merges nothing itself.
  const classOfAll = electricalNodes(drafts.map(toComponent))
  const spanning = [
    shortDraft,
    ...drafts.filter(
      (draft) => draft !== shortDraft && classOfAll(draft.a) !== classOfAll(draft.b),
    ),
  ]
  const duplicated = spanning[pick(spanning.length)]!
  drafts.push({ a: duplicated.a, b: duplicated.b, short: false, capacitor: pick(3) === 0 })

  return { components: drafts.map(toComponent), boundary }
}
