/**
 * **THE COMPARISON IS BY VALUE, LIBRARY ID AND PIN-LEVEL ADJACENCY - NEVER BY DESIGNATOR AND NEVER
 * BY NET NAME.** That is the criterion `docs/known-gaps.md` recorded for gate 8 before it had a
 * task, and it exists because the reference lock (Task 6) assigns designators and must not be able
 * to launder a difference through them.
 *
 * **THE TWO CASES THAT CARRY THE CRITERION are the designator and net-name renames.** Every
 * designator and every net name is changed and the comparison must still come back empty; then one
 * resistor's value moves and it must not. A gate that reported a difference for a renamed
 * designator would be unusable, and one that reported none for a changed value would be worthless -
 * and the same pair of cases is what proves neither vocabulary leaks into the comparison.
 *
 * **AND THE LAST CASE IS THE ONE THE INVARIANTS CANNOT SEE.** Two three-resistor rings against one
 * six-resistor ring hold the same components, the same connection count, the same pin-to-pin
 * connection signatures and the same per-component signatures. **Only the bijection search can
 * tell them apart**, so that case is what proves the search carries its own weight rather than
 * riding on the cheap invariants in front of it, and it asserts the SEARCH's own message rather
 * than any failure, because three other arms can also report a difference.
 */
import { describe, expect, it } from "bun:test"
import type { ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { EMPTY_DELTA, parseDeclaredDeltas } from "../../../lib/schgen/gates/declared-delta.ts"
import fs from "node:fs"
import path from "node:path"
import { DECLARED_DELTAS_ARE_M2, checkReferenceGraph, describeReferenceGraphResult, graphFromNetlist, type ReferenceGraph } from "../../../lib/schgen/gates/reference-graph.ts"
import { matchGraphs } from "../../../lib/schgen/gates/graph-match.ts"

const MANIFEST = "MANIFEST.json deadbeef1234; schematic/readability-baselines.json 0 baseline(s)"
const REF_FILE = "circuits/example/example.kicad_sch"

const comp = (designator: string, value: string, libPart: string) => ({ designator, value, libPart })

/** A divider: two resistors and a capacitor, wired as a real one is. */
const DIVIDER: ImportedNetlist = {
  components: [comp("R1", "10k", "R"), comp("R2", "4k7", "R"), comp("C1", "100n", "C"), comp("U1", "TL072", "TL072")],
  nets: {
    VIN: ["R1.1", "U1.8"],
    MID: ["C1.1", "R1.2", "R2.1", "U1.3"],
    GND: ["C1.2", "R2.2", "U1.4"],
    OUT: ["U1.1", "U1.2"],
  },
}

const check = (generated: ImportedNetlist, reference: ImportedNetlist) =>
  checkReferenceGraph(generated, { file: REF_FILE, netlist: reference }, EMPTY_DELTA, MANIFEST)

describe("graphFromNetlist", () => {
  it("keys components by canonical value and library id, and the adjacency by pin", () => {
    const g = graphFromNetlist(DIVIDER)
    expect(g.nodes.map((n) => `${n.key}=${n.value}|${n.libId}`)).toEqual([
      // 4k7 and 10k through canonicalValue: one spelling per value, so 4k7 and 4.7k compare equal.
      "C1=1e-7|C",
      "R1=1e+4|R",
      "R2=4.7e+3|R",
      "U1=raw:TL072|TL072",
    ])
    // MID has four members, so it contributes 4 choose 2 = 6 pairs; VIN and GND and OUT give 1 + 3 + 1.
    expect(g.adjacency).toHaveLength(6 + 1 + 3 + 1)
    expect(g.adjacency).toContainEqual({ a: "R1.2", b: "R2.1" })
  })

  it("holds no net name anywhere, which is what makes the comparison independent of them", () => {
    const text = JSON.stringify(graphFromNetlist(DIVIDER))
    for (const net of Object.keys(DIVIDER.nets)) expect(text, `the graph must not carry the net name ${net}`).not.toContain(net)
  })

  it("excludes KiCad's unconnected-(...) nets, which carry no connection", () => {
    const withNc: ImportedNetlist = { ...DIVIDER, nets: { ...DIVIDER.nets, "unconnected-(U1-OUTB-Pad7)": ["U1.7"] } }
    expect(graphFromNetlist(withNc).adjacency).toEqual(graphFromNetlist(DIVIDER).adjacency)
  })

  it("REFUSES a named net with one member rather than dropping the pin from the graph", () => {
    const dangling: ImportedNetlist = { ...DIVIDER, nets: { ...DIVIDER.nets, SPARE: ["U1.7"] } }
    expect(() => graphFromNetlist(dangling)).toThrow(/net "SPARE" has 1 member\(s\)/)
  })

  it("refuses a component with no libsource part rather than keying it by value alone", () => {
    const noLib: ImportedNetlist = { ...DIVIDER, components: [{ designator: "R1", value: "10k" }, ...DIVIDER.components.slice(1)] }
    expect(() => graphFromNetlist(noLib)).toThrow(/has no libsource part/)
  })

  it("refuses a duplicate designator and a net member with no component", () => {
    expect(() => graphFromNetlist({ ...DIVIDER, components: [...DIVIDER.components, comp("R1", "10k", "R")] })).toThrow(/appears twice/)
    expect(() => graphFromNetlist({ ...DIVIDER, nets: { ...DIVIDER.nets, GND: ["C1.2", "R9.1"] } })).toThrow(/component R9 is not in the netlist/)
  })
})

describe("checkReferenceGraph with an EMPTY permitted delta", () => {
  it("leaves nothing undeclared when the two netlists describe the same circuit", () => {
    const r = check(DIVIDER, DIVIDER)
    expect(r.undeclared).toEqual([])
    expect(r.reference).toBe(REF_FILE)
    expect(r.manifest).toBe(MANIFEST)
    expect(r.permitted).toEqual(EMPTY_DELTA)
    expect(describeReferenceGraphResult(r)).toContain("no undeclared difference")
  })

  /** THE CRITERION, first half: the reference lock may not launder a difference through designators. */
  it("is blind to a complete renaming of every designator", () => {
    const map: Readonly<Record<string, string>> = { R1: "R77", R2: "R78", C1: "C99", U1: "U42" }
    const renamed: ImportedNetlist = {
      components: DIVIDER.components.map((c) => ({ ...c, designator: map[c.designator] ?? c.designator })),
      nets: Object.fromEntries(
        Object.entries(DIVIDER.nets).map(([net, members]) => [
          net,
          members.map((m) => {
            const dot = m.lastIndexOf(".")
            return `${map[m.slice(0, dot)] ?? m.slice(0, dot)}.${m.slice(dot + 1)}`
          }).sort(),
        ]),
      ),
    }
    expect(check(renamed, DIVIDER).undeclared).toEqual([])
  })

  /** THE CRITERION, second half: net names carry no electrical meaning, so they carry none here. */
  it("is blind to a complete renaming of every net", () => {
    const renamed: ImportedNetlist = {
      ...DIVIDER,
      nets: Object.fromEntries(Object.entries(DIVIDER.nets).map(([net, members], i) => [`Net-(anonymous-${i})-${net.length}`, members])),
    }
    expect(check(renamed, DIVIDER).undeclared).toEqual([])
  })

  it("is blind to two spellings of one value, and NOT blind to a different value", () => {
    const spelled = (value: string): ImportedNetlist => ({
      ...DIVIDER,
      components: DIVIDER.components.map((c) => (c.designator === "R2" ? { ...c, value } : c)),
    })
    expect(check(spelled("4.7k"), DIVIDER).undeclared).toEqual([])
    const moved = check(spelled("22k"), DIVIDER)
    expect(moved.undeclared.length).toBeGreaterThan(0)
    expect(moved.undeclared.join(" ")).toContain("2.2e+4|R")
  })

  /** The brief's Step 7(1): the undeclared-difference assertion goes red naming the component. */
  it("names the component when one resistor's value changes", () => {
    const r = check({ ...DIVIDER, components: DIVIDER.components.map((c) => (c.designator === "R1" ? { ...c, value: "47k" } : c)) }, DIVIDER)
    expect(r.undeclared.join(" ")).toContain("components only in the generated schematic: 4.7e+4|R")
    expect(r.undeclared.join(" ")).toContain(`components only in the reference ${REF_FILE}: 1e+4|R`)
  })

  it("catches a symbol swap that keeps the value and the wiring", () => {
    const swapped: ImportedNetlist = { ...DIVIDER, components: DIVIDER.components.map((c) => (c.designator === "C1" ? { ...c, libPart: "C_Polarized" } : c)) }
    expect(check(swapped, DIVIDER).undeclared.join(" ")).toContain("C_Polarized")
  })

  it("catches a pin moved to another net although every component is unchanged", () => {
    const moved: ImportedNetlist = { ...DIVIDER, nets: { ...DIVIDER.nets, MID: ["C1.1", "R1.2", "R2.1"], OUT: ["U1.1", "U1.2", "U1.3"] } }
    const r = check(moved, DIVIDER)
    expect(r.undeclared.length).toBeGreaterThan(0)
    expect(r.undeclared.join(" ")).toContain("connections only in")
  })

  /**
   * **NO SYMMETRY MODEL, AND THE GATE IS THEREFORE STRICTER rather than more lenient.** Upstream
   * treats an allow-listed non-polarised two-pin symbol's pins as interchangeable; here pins match
   * by number, so a capacitor wired the other way round is a difference. `graph-match.ts`'s header
   * and `docs/known-gaps.md` **G242** record it.
   *
   * **THIS CASE IS A PIN AND NOT A WISH: it exists so that the day a symmetry model lands, it goes
   * RED and has to be rewritten deliberately.** And the rule it carries, from ruling R54: **a
   * difference of this shape is DIAGNOSED, NEVER DECLARED.** Pin symmetry is a missing MODEL, not
   * a permitted electrical change; **no transformation produces a pad swap**, so a delta entered
   * for one would have to invent its `from` - the breach `declared-delta.ts`'s header forbids.
   * Anyone reaching for a permitted delta here is doing the thing gate 8 exists to prevent.
   */
  it("reports a non-polarised capacitor's pads wired the other way round, having no symmetry model", () => {
    const flipped: ImportedNetlist = { ...DIVIDER, nets: { ...DIVIDER.nets, MID: ["C1.2", "R1.2", "R2.1", "U1.3"], GND: ["C1.1", "R2.2", "U1.4"] } }
    expect(check(flipped, DIVIDER).undeclared.length).toBeGreaterThan(0)
  })
})

describe("the bijection search catches what the invariants cannot", () => {
  /** `n` identical resistors in a ring: pin 2 of each to pin 1 of the next. */
  function ring(size: number, offset: number): { readonly components: ImportedNetlist["components"]; readonly nets: Record<string, string[]> } {
    const components = Array.from({ length: size }, (_, i) => comp(`R${offset + i}`, "10k", "R"))
    const nets: Record<string, string[]> = {}
    for (let i = 0; i < size; i += 1) {
      nets[`N${offset + i}`] = [`R${offset + i}.2`, `R${offset + ((i + 1) % size)}.1`].sort()
    }
    return { components, nets }
  }
  const rings = (...sizes: readonly number[]): ImportedNetlist => {
    const parts = sizes.map((s, i) => ring(s, i * 100 + 1))
    return {
      components: parts.flatMap((p) => p.components),
      nets: Object.assign({}, ...parts.map((p) => p.nets)) as Record<string, string[]>,
    }
  }
  const twoThrees = rings(3, 3)
  const oneSix = rings(6)

  it("has two graphs that agree on every cheap invariant, so the case is not vacuous", () => {
    const a = graphFromNetlist(twoThrees)
    const b = graphFromNetlist(oneSix)
    expect(a.nodes).toHaveLength(6)
    expect(b.nodes).toHaveLength(6)
    expect(a.adjacency).toHaveLength(6)
    expect(b.adjacency).toHaveLength(6)
    // Same components, same connection count, same pin-to-pin signatures: every invariant in front
    // of the search agrees, which is exactly why the search has to exist.
    expect(new Set(a.nodes.map((n) => `${n.value}|${n.libId}`))).toEqual(new Set(b.nodes.map((n) => `${n.value}|${n.libId}`)))
  })

  /**
   * **THE MESSAGE IS ASSERTED, NOT ONLY THE FAILURE.** `matchGraphs` has four arms that can
   * report a difference and only one of them is the search; a check that accepted any failure would
   * not establish which stage caught it, and the whole claim of this describe is that the cheap
   * invariants in front of the search all agree and the search is what disagrees.
   */
  it("reports two three-rings against one six-ring, from the SEARCH and not from an invariant", () => {
    const m = matchGraphs(graphFromNetlist(twoThrees), graphFromNetlist(oneSix), ["two rings of three", "one ring of six"])
    expect(m.ok).toBe(false)
    expect(m.problems).toHaveLength(1)
    expect(m.problems[0]).toContain("no component-for-component match exists although every component, every connection count and every component signature agreed")
    expect(m.problems[0]).not.toContain("connected on different pins")
    expect(m.problems[0]).not.toContain("only in")
  })

  it("matches each of the two against itself, so the refusal above is about the shapes", () => {
    expect(matchGraphs(graphFromNetlist(twoThrees), graphFromNetlist(rings(3, 3)), ["a", "b"]).ok).toBe(true)
    expect(matchGraphs(graphFromNetlist(oneSix), graphFromNetlist(rings(6)), ["a", "b"]).ok).toBe(true)
  })
})

/**
 * **MANY INTERCHANGEABLE COMPONENTS: the case the deleted refinement stage existed for.**
 *
 * Five identical resistors in a row share one signature - same value, same library id, same
 * connected pins - so the search has five candidates for each of five positions and is told apart
 * only by how far each sits from the two different capacitors at the ends. `graph-match.ts` used to
 * precompute that separation with colour refinement; **`docs/known-gaps.md` G241 records the three
 * measurements that got the refinement deleted**, one of which is that `consistent` prunes on the
 * first bound neighbour and makes the search fast here without it.
 *
 * These cases are what hold that: the chain matches its own copy (so the search does not give up
 * on symmetric candidates) and does not match the chain with its two ends' VALUES swapped (so it
 * does not match them blindly either).
 */
describe("a circuit with many interchangeable components", () => {
  /** C1 - R1 - R2 - R3 - R4 - R5 - C2, with both capacitors' far pins on GND. */
  function chain(offset: number): ImportedNetlist {
    const r = (i: number) => `R${offset + i}`
    const components = [
      comp(`C${offset}`, "100n", "C"),
      ...Array.from({ length: 5 }, (_, i) => comp(r(i), "10k", "R")),
      comp(`C${offset + 1}`, "220n", "C"),
    ]
    const nets: Record<string, string[]> = {
      [`L${offset}`]: [`C${offset}.2`, `${r(0)}.1`].sort(),
      [`L${offset + 6}`]: [`${r(4)}.2`, `C${offset + 1}.1`].sort(),
      [`G${offset}`]: [`C${offset}.1`, `C${offset + 1}.2`].sort(),
    }
    for (let i = 0; i < 4; i += 1) nets[`L${offset + i + 1}`] = [`${r(i)}.2`, `${r(i + 1)}.1`].sort()
    return { components, nets }
  }

  it("has five components one signature cannot tell apart, so the search really has to choose", () => {
    const g = graphFromNetlist(chain(1))
    const resistors = g.nodes.filter((n) => n.libId === "R")
    expect(resistors).toHaveLength(5)
    // Identical value, library id and pin numbers: whatever separates them comes from the
    // neighbourhood, and the search is what has to work it out.
    expect(new Set(resistors.map((n) => `${n.value}|${n.libId}`)).size).toBe(1)
    const pinsOf = (key: string) => g.adjacency.flatMap((e) => [e.a, e.b]).filter((p) => p.startsWith(`${key}.`)).map((p) => p.split(".")[1]).sort()
    for (const n of resistors) expect(pinsOf(n.key)).toEqual(["1", "2"])
  })

  it("matches two copies of the chain under different designators, inventing no difference", () => {
    const m = matchGraphs(graphFromNetlist(chain(1)), graphFromNetlist(chain(50)), ["one copy", "another copy"])
    expect(m.problems).toEqual([])
    expect(m.ok).toBe(true)
  })

  /**
   * **A CASE THAT WAS WRITTEN AND DELETED, recorded because the deletion is the finding.** The
   * third case here claimed the chain rewired into a RING was something "only the search can see".
   * It is not: joining the two ends moves which capacitor each end resistor touches, so the
   * CONNECTION multiset catches it and the message says `connections only in`. The claim did not
   * reproduce when it was driven, so it is gone rather than softened - the shape `two three-rings
   * against one six-ring` above is the one that genuinely needs the search, and one such case is
   * enough.
   */
  it("does NOT match the chain against the same chain with its two end capacitors swapped", () => {
    // Every component and every connection count is unchanged by the swap, and the chain is not
    // symmetric, so the two are different circuits and the search is what has to say so.
    const reversed = (): ImportedNetlist => {
      const c = chain(1)
      return {
        components: c.components.map((x) => (x.designator === "C1" ? { ...x, value: "220n" } : x.designator === "C2" ? { ...x, value: "100n" } : x)),
        nets: c.nets,
      }
    }
    // Swapping the two capacitors' VALUES end for end leaves every component and every connection
    // count alone, and the chain is not symmetric, so the two differ.
    const m = matchGraphs(graphFromNetlist(reversed()), graphFromNetlist(chain(1)), ["the reversed chain", "the chain"])
    expect(m.ok).toBe(false)
  })
})

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
 * **G216** item 6 refuses a test over a circuit with an unclassed crossing net because
 * `ConnectionClass` is a total two-value union, so building one needs a cast. This graph needs no
 * cast and violates no invariant. The precedent for the shape is **G196**, where
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

/**
 * **A SEARCH THAT CANNOT FINISH MUST NOT READ LIKE ONE THAT AGREED**, which is why `matchGraphs`
 * takes its backtracking budget as a parameter: the refusal is reachable from a test. It was not
 * before - perturbing `if (steps > maxBindings)` to `if (false)` left every check green, so the one
 * arm that distinguishes *"the gate could not run"* from a pass had never been taken.
 */
describe("the search refuses rather than hanging, and the refusal is not a pass", () => {
  const ring = (size: number, offset: number): ImportedNetlist => {
    const components = Array.from({ length: size }, (_, i) => comp(`R${offset + i}`, "10k", "R"))
    const nets: Record<string, string[]> = {}
    for (let i = 0; i < size; i += 1) nets[`N${offset + i}`] = [`R${offset + i}.2`, `R${offset + ((i + 1) % size)}.1`].sort()
    return { components, nets }
  }

  it("reports a budget it could not finish within, as a problem and not as agreement", () => {
    const a = graphFromNetlist(ring(6, 1))
    const b = graphFromNetlist(ring(6, 50))
    // The control: with the real budget the two DO match, so the refusal below is about the budget.
    expect(matchGraphs(a, b, ["a", "b"]).ok).toBe(true)
    const m = matchGraphs(a, b, ["a", "b"], 1)
    expect(m.ok).toBe(false)
    expect(m.problems).toHaveLength(1)
    expect(m.problems[0]).toContain("did not complete within 1 bindings")
    expect(m.problems[0]).toContain("This is NOT a pass")
    // And it is NOT reported as a difference between the drawings, which would be a false defect.
    expect(m.problems[0]).not.toContain("topology differs")
  })
})

describe("a DECLARED permitted delta is refused rather than compared anyway", () => {
  const declared = () => {
    const file = path.resolve(import.meta.dir, "..", "__fixtures__", "deltas", "declared.json")
    return parseDeclaredDeltas(fs.readFileSync(file, "utf8"), file)
  }

  it("reports the M2 refusal as an undeclared difference, so it can never read as a pass", () => {
    const r = checkReferenceGraph(DIVIDER, { file: REF_FILE, netlist: DIVIDER }, declared(), MANIFEST)
    expect(r.undeclared).toEqual([DECLARED_DELTAS_ARE_M2])
    // The control: with the same two identical netlists and an EMPTY delta, it IS a pass - so the
    // refusal above is about the declared list and not about the comparison failing.
    expect(check(DIVIDER, DIVIDER).undeclared).toEqual([])
  })
})

describe("the result names the reference and the manifest, or refuses", () => {
  it("refuses a blank reference file and a blank manifest citation", () => {
    expect(() => checkReferenceGraph(DIVIDER, { file: "  ", netlist: DIVIDER }, EMPTY_DELTA, MANIFEST)).toThrow(/name it in the result/)
    expect(() => checkReferenceGraph(DIVIDER, { file: REF_FILE, netlist: DIVIDER }, EMPTY_DELTA, " ")).toThrow(/names the manifest it ran against/)
  })

  /**
   * **RULING R53: THE SWAP THAT USED TO BE UNDETECTABLE IS NOW UNREPRESENTABLE, and this is the
   * check that notices if it comes back.** The first version took a fifth `referenceFile: string`
   * parameter beside `manifest`, and **a swap of the two passed every check either one had**,
   * because both were blankness checks. The file now travels inside `ReferenceNetlist`, so the
   * compiler refuses the swap - and the one thing a runtime check can still hold is that no fifth
   * loose string has reappeared.
   */
  it("takes four parameters, only ONE of which is a bare string", () => {
    expect(
      checkReferenceGraph.length,
      "a fifth parameter beside `manifest` is how the undetectable swap got in; the reference's " +
        "file belongs inside ReferenceNetlist (ruling R53)",
    ).toBe(4)
  })
})
