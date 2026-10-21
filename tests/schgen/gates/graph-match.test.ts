/**
 * **`matchGraphs`'s OWN BEHAVIOUR, split out of `reference-graph.test.ts` under ruling R62** when
 * that file reached 538 lines against `CLAUDE.md`'s 300-500 cap. The two `describe` blocks here
 * share no helpers with the ones left behind - they build graphs rather than netlists-as-gate-input
 * - and both are about the MATCHER rather than about gate 8, which is why they travel together.
 *
 * **WHAT THEY HOLD, and the second is why the colour refinement still exists:**
 *
 * 1. a **symmetric pair that does NOT match**, at and above the sizes the real references reach,
 *    asserting a *stated* topology difference rather than a budget exhaustion;
 * 2. the **hub construction** that pins the refinement - a graph inside `matchGraphs`'s declared
 *    domain and outside what `graphFromNetlist` emits, labelled as such, with the clique asserted
 *    beside it so the label is checkable.
 *
 * Removing the refinement from `lib/schgen/gates/graph-match.ts` takes block 2 RED at three sizes.
 * `docs/known-gaps.md` **G241** carries the history, the figures and the withdrawal.
 */
import { describe, expect, it } from "bun:test"
import type { ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { graphFromNetlist, type ReferenceGraph } from "../../../lib/schgen/gates/reference-graph.ts"
import { matchGraphs } from "../../../lib/schgen/gates/graph-match.ts"

const comp = (designator: string, value: string, libPart: string) => ({ designator, value, libPart })

/**
 * **THE WORST CASE FOR THE SEARCH: A SYMMETRIC PAIR THAT DOES NOT MATCH, AT AND ABOVE THE SIZES THE
 * REAL REFERENCES REACH.** Required by controller ruling **R57**, and it is the case the colour
 * refinement's deletion measurement did not cover: **a matching symmetric pair is the EASY case.**
 *
 * **WHAT IT PINS, which is a DIAGNOSTIC and not a verdict.** A real difference between two drawings
 * must be reported as a **stated topology difference**, not as *"the search did not complete"*.
 * Both outcomes are failures and neither is a false pass - but **G242**'s discriminator tells an
 * operator to read the undeclared list for transposed pins, and a budget exhaustion tells them
 * nothing and invites them to raise the budget instead. So the assertion is on WHICH refusal
 * arrives.
 *
 * **THE SHAPE.** `m` rings of `s` identical resistors: every node has one signature, every net has
 * exactly two members so every connection signature is identical, and node, net and connection
 * counts are equal between the two sides. **Every cheap invariant agrees and no bijection exists**,
 * because the cycle lengths differ. 24 nodes is `pt2399-core`'s size and 32 is lab-board's.
 */
describe("a symmetric pair that does NOT match, at the references' own sizes", () => {
  const rings = (m: number, s: number, off: number): ImportedNetlist => {
    const components: { designator: string; value: string; libPart: string }[] = []
    const nets: Record<string, string[]> = {}
    for (let r = 0; r < m; r += 1) {
      const base = off + r * 1000
      for (let i = 0; i < s; i += 1) components.push(comp(`R${base + i}`, "10k", "R"))
      for (let i = 0; i < s; i += 1) nets[`N${base + i}`] = [`R${base + i}.2`, `R${base + ((i + 1) % s)}.1`].sort()
    }
    return { components, nets }
  }

  const CASES: readonly { readonly nodes: number; readonly a: readonly [number, number]; readonly b: readonly [number, number] }[] = [
    { nodes: 24, a: [8, 3], b: [6, 4] },
    { nodes: 32, a: [8, 4], b: [4, 8] },
    { nodes: 48, a: [16, 3], b: [8, 6] },
  ]

  for (const c of CASES) {
    it(`${c.nodes} nodes: every cheap invariant agrees, so the case is not vacuous`, () => {
      const a = graphFromNetlist(rings(c.a[0], c.a[1], 1))
      const b = graphFromNetlist(rings(c.b[0], c.b[1], 500))
      expect(a.nodes).toHaveLength(c.nodes)
      expect(b.nodes).toHaveLength(c.nodes)
      expect(a.adjacency).toHaveLength(c.nodes)
      expect(b.adjacency).toHaveLength(c.nodes)
      // One component signature on each side, and the same one.
      expect(new Set(a.nodes.map((n) => `${n.value}|${n.libId}`))).toEqual(new Set(b.nodes.map((n) => `${n.value}|${n.libId}`)))
      // And the two sides DO match their own copies, so the refusal below is about the shapes.
      expect(matchGraphs(a, graphFromNetlist(rings(c.a[0], c.a[1], 900)), ["a", "a'"]).ok).toBe(true)
    })

    it(`${c.nodes} nodes: reports a STATED topology difference, not a budget exhaustion`, () => {
      const a = graphFromNetlist(rings(c.a[0], c.a[1], 1))
      const b = graphFromNetlist(rings(c.b[0], c.b[1], 500))
      const m = matchGraphs(a, b, ["side A", "side B"])
      expect(m.ok).toBe(false)
      expect(m.problems).toHaveLength(1)
      // THE CLAIM: a real difference is DIAGNOSED, not handed back as "could not finish".
      expect(m.problems[0], "a real difference must not arrive as a budget exhaustion").not.toContain("did not complete")
      expect(m.problems[0]).toContain("no component-for-component match exists")
    })
  }
})

/**
 * **THE CHECK THAT GUARDS THE COLOUR REFINEMENT, AND IT IS A UNIT TEST OF THE MATCHER RATHER THAN A
 * CLAIM ABOUT THE GATE.** Added under controller ruling **R61**; the construction is the Task 18
 * review's.
 *
 * **WHAT THIS GRAPH IS, stated plainly because the label is the point.** It is hand-built, it is
 * **inside `matchGraphs`'s declared domain** - any `ReferenceGraph`, with no cast anywhere - and it
 * is **outside what `graphFromNetlist` emits today**. Two rails are modelled as two-pin PARTS each
 * contributing only pin 1, so both rail endpoints carry the identical signature `1e+4|R.1`.
 * **`graphFromNetlist` cannot produce that shape**: a rail is a NET, and a net expands to a CLIQUE
 * over its members, never to a star through a part. The clique case below is what the same circuit
 * really produces, and it is asserted beside this one so the label is checkable rather than prose.
 *
 * **SO IT IS HERE TO PIN THE REFINEMENT, NOT TO CLAIM THE GAP IS LIVE.** `docs/known-gaps.md`
 * **G241** records the measured threshold on REACHABLE inputs as **120 nodes**, and records that the
 * review's 14-node urgency was **withdrawn by its author** once the shape turned out unreachable.
 * What this test buys is that the refinement is no longer an unguarded safeguard: removing it turns
 * these cases from a stated difference at 0.2 ms into *"could not finish"* at ~430 ms, so **the next
 * agent who deletes it on "no check fails" grounds gets a red test instead** - which is the loop
 * R60 was about to record as open.
 *
 * **WHY A HAND-BUILT INPUT IS LEGITIMATE HERE, which is the one thing a reader should not have to
 * take on trust.** The register's warning is about asserting over an input that CANNOT EXIST -
 * **`docs/known-gaps.md` G213**(6) refuses a test over a circuit with an unclassed crossing net,
 * *"`ConnectionClass` is a two-value union, `classOf` is total over it"*, and records that the
 * clause replacing it is driven *"with no cast"*. **That building the refused circuit would need a
 * cast is an inference from those words, not a quotation of them.** This graph needs no cast and
 * violates no invariant. The precedent for the shape is **G196**, where
 * `tests/schgen/elk/snap.test.ts` *"drives the arm on a hand-built fixture and has passed
 * throughout - so the arm was correct all along and only unreachable on real geometry"*, and whose
 * criterion is that an arm is either evaluated on real data **or recorded as unreachable with the
 * reason.** That is exactly what this test plus G241 do.
 */
describe("the colour refinement, pinned on a graph inside the matcher's domain", () => {
  const R = (key: string) => ({ key, value: "1e+4", libId: "R" })
  const sorted = (xs: { a: string; b: string }[]) =>
    [...xs].sort((p, q) => (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : p.b > q.b ? 1 : 0))

  /** Two rails as two-pin PARTS contributing only pin 1; `R0`'s pads transposed when `flipFirst`. */
  function hub(n: number, flipFirst: boolean): ReferenceGraph {
    const nodes = [R("A"), R("B"), ...Array.from({ length: n }, (_, i) => R(`R${i}`))]
    const adjacency: { a: string; b: string }[] = []
    for (let i = 0; i < n; i += 1) {
      const flip = flipFirst && i === 0
      adjacency.push({ a: "A.1", b: `R${i}.${flip ? 2 : 1}` })
      adjacency.push({ a: "B.1", b: `R${i}.${flip ? 1 : 2}` })
    }
    return { nodes, adjacency: sorted(adjacency) }
  }

  /** The same circuit as a real netlist: two NETS, each expanding to a clique over its members. */
  const clique = (n: number, flipFirst: boolean): ImportedNetlist => {
    const components = Array.from({ length: n }, (_, i) => comp(`R${i}`, "10k", "R"))
    const top: string[] = []
    const bot: string[] = []
    for (let i = 0; i < n; i += 1) {
      const flip = flipFirst && i === 0
      top.push(`R${i}.${flip ? "2" : "1"}`)
      bot.push(`R${i}.${flip ? "1" : "2"}`)
    }
    return { components, nets: { TOP: top.sort(), BOT: bot.sort() } }
  }

  /** Each adjacency pair named by what its pins belong to - the cheap arm's own key. */
  function connectionCensus(g: ReferenceGraph): ReadonlyMap<string, number> {
    const sig = new Map(g.nodes.map((n) => [n.key, `${n.value}|${n.libId}`]))
    const counts = new Map<string, number>()
    for (const { a, b } of g.adjacency) {
      const end = (e: string) => `${sig.get(e.slice(0, e.lastIndexOf("."))) ?? ""}.${e.slice(e.lastIndexOf(".") + 1)}`
      const k = [end(a), end(b)].sort().join(" - ")
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return counts
  }

  it("is a graph graphFromNetlist cannot emit: a net becomes a CLIQUE, never a star through a part", () => {
    // THE LABEL, CHECKED. The hub's cheap-arm census is IDENTICAL with and without the flip, which
    // is why the search is reached at all; the clique's is grossly different, which is why the real
    // path never reaches it.
    expect(connectionCensus(hub(10, false))).toEqual(connectionCensus(hub(10, true)))
    const realUnflipped = connectionCensus(graphFromNetlist(clique(10, false)))
    const realFlipped = connectionCensus(graphFromNetlist(clique(10, true)))
    expect(realUnflipped).not.toEqual(realFlipped)
    // And the shapes differ in kind: 10 members on one net give 45 pairs, not 10.
    expect(graphFromNetlist(clique(10, false)).adjacency).toHaveLength(45 + 45)
    expect(hub(10, false).adjacency).toHaveLength(10 + 10)
  })

  it("the same circuit THROUGH graphFromNetlist is caught by the cheap arm, so this gap is not live", () => {
    for (const n of [6, 10, 16, 24]) {
      const m = matchGraphs(graphFromNetlist(clique(n, true)), graphFromNetlist(clique(n, false)), ["flipped", "unflipped"])
      expect(m.ok, `clique n=${n}`).toBe(false)
      expect(m.problems.join(" "), `clique n=${n} must be caught before the search`).toContain("connections only in")
    }
  })

  for (const n of [10, 12, 14, 16]) {
    it(`hub with ${n} resistors (${n + 2} nodes): a STATED topology difference, which is what the refinement buys`, () => {
      const unflipped = hub(n, false)
      // THE CONTROL: the shape matches its own copy, so the refusal below is the flip's.
      expect(matchGraphs(unflipped, hub(n, false), ["a", "a-copy"]).ok, "self-match control").toBe(true)
      const m = matchGraphs(unflipped, hub(n, true), ["unflipped", "flipped"])
      expect(m.ok).toBe(false)
      expect(m.problems).toHaveLength(1)
      // Without the refinement this is "did not complete within 2000000 bindings" from 14 nodes up.
      expect(m.problems[0], "removing the colour refinement turns this into a budget exhaustion").not.toContain("did not complete")
      expect(m.problems[0]).toContain("no component-for-component match exists")
    })
  }
})
