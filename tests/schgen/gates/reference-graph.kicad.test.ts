/**
 * **GATE 8's M1 HALF AGAINST THE TWO HAND-ARRANGED DRAWINGS THIS REPOSITORY OWNS, through the real
 * `kicad-cli`.**
 *
 * **READ THIS BEFORE READING A GREEN RUN HERE AS GATE 8 PASSING. IT IS NOT.** Gate 8 compares a
 * GENERATED schematic against a hand-arranged one a human made and trusts. **No generated
 * schematic exists for either reference**: `docs/known-gaps.md` **G238** measures that `generate`
 * refused `pt2399-core` on 115 `validateCircuit` problems and `transistor-preamp` on 101, at gate
 * 1, before any block reached a layout backend. **Task 20 moved the second one's blocker without
 * removing it** - `transistor-preamp` now validates clean (0 drawing problems) and refuses inside
 * block `tp-leg-emitter-bypass` on the field-placement defect **G232** records, so the generated
 * side still does not exist for either reference; **G245** carries that measurement. So what runs
 * below is **the comparison, end to
 * end, on real netlists of a human-trusted drawing - and never on a generated one.** Controller
 * ruling R51 governs that case, `docs/schematic/reference-graph-checks.md` states it in full, and
 * **G226** names the pattern of a mechanism exercised only by its own tests.
 *
 * **THE TWO SIDES ARE NOT ONE ARTIFACT COMPARED WITH ITSELF.** One is `kicad-cli`'s export of the
 * committed `.kicad_sch`, produced now; the other is the netlist committed in `tests/fixtures/`,
 * produced weeks earlier and already relied on by `tests/circuits/pt2399-core.test.ts`. Their
 * agreement is a real result - a derived artifact regenerated every run and compared by content,
 * which `CLAUDE.md` requires - and **it is still not gate 8**, because neither side came out of
 * the generator.
 *
 * **IT USES THE REAL `kicad-cli` AND FAILS RATHER THAN SKIPS WHEN IT IS MISSING**, which is the
 * convention `tests/schgen/gates/round-trip.kicad.test.ts` and `tests/circuits/kicad-round-trip.ts`
 * already set and the owner's directive (**G169**) requires: a check that skips when its tool is
 * absent cannot be told apart from one that passed.
 *
 * **RUNNING THE EMPTY-DELTA CHECK AGAINST THE PORTED `mini` FIXTURE INSTEAD IS FORBIDDEN** and is
 * not done here. `mini` has no hand-arranged schematic a human trusts, so a green row from it
 * would be self-consistency wearing gate 8's name - which is the round trip, and the round trip
 * must never be reported as this check.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { importNetlist, KICAD_CLI, type ImportedNetlist } from "../../../lib/kicad/netlist.ts"
import { EMPTY_DELTA } from "../../../lib/schgen/gates/declared-delta.ts"
import { checkReferenceGraph, graphFromNetlist } from "../../../lib/schgen/gates/reference-graph.ts"
import { exportSexprNetlist } from "../../../tools/schgen/verify.ts"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"

afterAll(cleanUpTempScratch)

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..")

/**
 * The two references the parent plan names for exactly this, with the SIZES OF THEIR GRAPHS
 * asserted so the figures `docs/schematic/reference-graph-checks.md` publishes recompute on every
 * run instead of rotting in prose.
 */
const REFERENCES: readonly {
  readonly name: string
  readonly schematic: string
  readonly fixture: string
  readonly components: number
  readonly pairs: number
  readonly distinctSignatures: number
}[] = [
  {
    name: "pt2399-core",
    schematic: "circuits/pt2399-core/pt2399-core.kicad_sch",
    fixture: "tests/fixtures/pt2399-core.net",
    components: 24,
    pairs: 117,
    distinctSignatures: 14,
  },
  {
    name: "transistor-preamp lab-board",
    schematic: "circuits/transistor-preamp/lab-board.kicad_sch",
    fixture: "tests/fixtures/transistor-preamp-lab.net",
    components: 32,
    pairs: 150,
    distinctSignatures: 18,
  },
]

function requireKicadCli(): void {
  if (fs.existsSync(KICAD_CLI)) return
  throw new Error(
    `kicad-cli not found at ${KICAD_CLI}. Install KiCad or set KICAD_CLI (lib/kicad/install.ts holds ` +
      "the per-platform defaults). This test does NOT skip: a reference graph built from a netlist " +
      "nobody exported is a check that did not run, and a skipped check that resembles a passing one " +
      "is the failure this workflow exists to prevent.",
  )
}

interface Exported {
  readonly live: ImportedNetlist
  readonly committed: ImportedNetlist
}

const exported = new Map<string, Exported>()
const of = (name: string): Exported => {
  const e = exported.get(name)
  if (e === undefined) throw new Error(`${name} was not exported`)
  return e
}

beforeAll(() => {
  requireKicadCli()
  for (const r of REFERENCES) {
    const live = importNetlist(exportSexprNetlist(path.join(repoRoot, r.schematic)).text)
    const committed = importNetlist(fs.readFileSync(path.join(repoRoot, r.fixture), "utf8"))
    exported.set(r.name, { live, committed })
  }
}, 180_000)

describe("the reference graph of each hand-arranged drawing", () => {
  for (const r of REFERENCES) {
    it(`${r.name}: ${r.components} components and ${r.pairs} pin-to-pin pairs, built from a real kicad-cli export`, () => {
      const g = graphFromNetlist(of(r.name).live, r.schematic)
      expect(g.nodes).toHaveLength(r.components)
      expect(g.adjacency).toHaveLength(r.pairs)
      expect(new Set(g.nodes.map((n) => `${n.value}|${n.libId}`)).size).toBe(r.distinctSignatures)
      // Every component carries a library id: `graphFromNetlist` refuses one that does not, so this
      // is the positive form of that refusal on a real drawing rather than only on a fixture.
      expect(g.nodes.every((n) => n.libId.trim() !== "")).toBe(true)
      // And no net name reached the graph.
      const text = JSON.stringify(g)
      for (const net of Object.keys(of(r.name).live.nets)) expect(text).not.toContain(net)
    })

    it(`${r.name}: the committed netlist fixture still describes the same circuit as the drawing`, () => {
      // A derived artifact compared by CONTENT and not by timestamp, which is what lets the figures
      // above be re-derived without kicad-cli. It is NOT gate 8: neither side is generated.
      const side = { file: r.schematic, netlist: of(r.name).live }
      const r1 = checkReferenceGraph(of(r.name).committed, side, EMPTY_DELTA, "not a gate row: a fixture-against-drawing control")
      expect(r1.undeclared).toEqual([])
    })

    /** The brief's Step 7(1), on a real drawing: one value moves and the component is named. */
    it(`${r.name}: one component's value changed is reported, naming it`, () => {
      const live = of(r.name).live
      const first = live.components[0]
      if (first === undefined) throw new Error(`${r.name}'s export has no components`)
      const perturbed: ImportedNetlist = {
        ...live,
        components: live.components.map((c) => (c.designator === first.designator ? { ...c, value: "999.99 Giga" } : c)),
      }
      const result = checkReferenceGraph(perturbed, { file: r.schematic, netlist: live }, EMPTY_DELTA, "not a gate row: a perturbation")
      expect(result.undeclared.length).toBeGreaterThan(0)
      expect(result.undeclared.join(" ")).toContain(`raw:999.99 Giga|${first.libPart ?? ""}`)
    })

    /** A rewiring with every component untouched: the pin-level adjacency is what sees it. */
    it(`${r.name}: a pin moved between two nets is reported although every component is unchanged`, () => {
      const live = of(r.name).live
      const bySize = Object.entries(live.nets)
        .filter(([name, m]) => m.length >= 2 && !name.startsWith("unconnected-("))
        .sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))
      const [from, to] = bySize
      if (from === undefined || to === undefined) throw new Error(`${r.name} has fewer than two multi-pin nets`)
      const moved = from[1][0]
      if (moved === undefined) throw new Error(`net ${from[0]} has no members`)
      // The source net keeps at least two members, so no net becomes a single-pin one (which
      // graphFromNetlist refuses) and only the partition changes.
      if (from[1].length < 3) throw new Error(`net ${from[0]} has ${from[1].length} members; moving one would leave a single-pin net`)
      const perturbed: ImportedNetlist = {
        ...live,
        nets: { ...live.nets, [from[0]]: from[1].filter((m) => m !== moved), [to[0]]: [...to[1], moved].sort() },
      }
      const result = checkReferenceGraph(perturbed, { file: r.schematic, netlist: live }, EMPTY_DELTA, "not a gate row: a perturbation")
      expect(result.undeclared.length).toBeGreaterThan(0)
      expect(result.undeclared.join(" ")).toContain("connections only in")
    })
  }
})
