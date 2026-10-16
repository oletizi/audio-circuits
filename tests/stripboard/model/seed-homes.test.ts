/**
 * AN ORDERING STATED AS A NET-TO-STRIP MAP: what it builds, what it refuses, and
 * that the stride form still builds exactly what it did.
 *
 * **WHY THE MAP FORM EXISTS.** A uniform stride advances every net by the same
 * number of strips, so one part's needs set every part's spacing: a rigid 5-pin
 * header wants five CONSECUTIVE strips, which forces stride 1, and at stride 1
 * six capacitors that reach three strips all tie to ground and exactly saturate
 * its reach. The map form lets the strips be stated per net instead, and it is
 * the shape `assignStrips` in `tools/stripboard/seed-arrangement.ts` already
 * returns.
 *
 * **WHAT THESE ESTABLISH.** That an explicit map is used AS GIVEN - a net whose
 * entry no stride could produce starts on the strip the map names; that both
 * forms are live, and a stride ordering and the map it implies build the same
 * board hole for hole; that a home strip is where a net STARTS and not where it
 * is confined, by building a board on which a lead that cannot reach its own
 * net's stated home lands on another strip and is joined back; that two nets may
 * be homed on ONE strip, which is a map a stride cannot express and which Task
 * 2's derived cuts part; and that four refusals fire on their own leading keys.
 *
 * **WHAT THEY DO NOT ESTABLISH.** No figure and no score: which form of ordering
 * produces a cheaper board is `objectiveOf`'s question and is measured by
 * `./benchmark.test.ts`, and an assertion here comparing the two would be this
 * file inventing a criterion. Nor do they establish that the deviation above is
 * ever TAKEN on a real circuit - they establish that when a hard constraint
 * forces one, the construction takes it and joins the net rather than refusing.
 * The refusal tests assert the leading key and the facts the message must carry,
 * never its prose.
 *
 * **ITS OWN FILE** rather than a section of `./seed.test.ts`, which is at 486
 * lines against this repository's 500-line ceiling, following `./seed-off-board.test.ts`
 * and `./seed-shared-strip.test.ts`.
 */
import { expect, test } from "bun:test"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import type { Candidate, Grid } from "../../../lib/stripboard/board.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import type { Ordering } from "../../../lib/stripboard/seed-homes.ts"
import type { SeedNetlist, SeedPart } from "../../../lib/stripboard/seed-model.ts"
import { netlistOf, offBoard, ordering, refusalFrom, syntheticSpan, twoLead } from "./seed-fixtures.ts"

/** A two-lead fixture part that reaches 2 to 6 holes. */
const WIDE = "SYNTHETIC:Homes_TwoLead_Wide"
/** A two-lead fixture part that reaches 2 to 4 holes and no further. */
const NARROW = "SYNTHETIC:Homes_TwoLead_Narrow"

const SPANS: ReadonlyMap<string, LeadSpan> = new Map([
  [WIDE, syntheticSpan(WIDE, 2, 6)],
  [NARROW, syntheticSpan(NARROW, 2, 4)],
])

/** Ten strips of ten holes: room for a map whose strips no small stride reaches. */
const STOCK: Grid = { strips: 10, columns: 10 }

/** One ordering, one seed, with the netlist it realises checked before it is returned. */
function onlySeed(netlist: SeedNetlist, entry: Ordering, grid: Grid = STOCK): Candidate {
  const seeds = seedsFrom(netlist, grid, SPANS, [entry])
  expect(seeds.length, "one ordering yields one seed").toBe(1)
  const seed = seeds[0]
  if (seed === undefined) throw new Error("unreachable: the length was just asserted")
  expect(violationsOf(seed, derivedCuts(seed, netlist.nets), netlist.nets)).toEqual([])
  return seed
}

/** Every strip a part's terminals landed on, in its own pin order. */
function stripsOf(candidate: Candidate, ref: string): readonly number[] {
  const placement = candidate.placements.find((entry) => entry.ref === ref)
  if (placement === undefined) throw new Error(`"${ref}" was not placed`)
  return [...placement.pins.values()].map((hole) => hole.strip)
}

/** A circuit with a net at each end and a landing pad on the far one. */
const SPLIT: readonly SeedPart[] = [
  twoLead("R1", WIDE, ["1", "A"], ["2", "A"]),
  offBoard("J1", { pin: "1", net: "B" }),
]

test("an explicit net-to-strip map is used as given", () => {
  // Strip 7 for B is the point: it is where the map says, and no ordering of two
  // nets at any whole stride puts the SECOND one there while the first is on 0
  // and the board is ten strips - stride 7 would, and then B would be the only
  // other net it could host. A is on 0 and R1 has both leads on it, so the part
  // lies along A's own strip.
  const homes = new Map([
    ["A", 0],
    ["B", 7],
  ])
  const seed = onlySeed(netlistOf(SPLIT), { name: "explicit", homes })
  expect(stripsOf(seed, "R1"), "A's leads start on A's home").toEqual([0, 0])
  expect(stripsOf(seed, "J1"), "and B's pad on the strip the map names").toEqual([7])
})

test("the stride form and the map it implies build the same board, hole for hole", () => {
  // Both forms stay live: the stride form is not a stub left behind the map
  // form, and the map form is not a second net-to-strip rule. Equality of the
  // whole candidate is the assertion, so a placement, a wire or a bridge that
  // moved under either form fails here.
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const strided = onlySeed(netlist, ordering("strided", ["A", "B"], 3))
  const stated = onlySeed(netlist, {
    name: "stated",
    homes: new Map([
      ["A", 0],
      ["B", 3],
    ]),
  })
  expect(stated).toEqual(strided)
})

test("a lead that cannot reach its net's stated home lands elsewhere and is joined", () => {
  // THE QUALIFICATION, MECHANICALLY: A on 0 and B on 7 is eight holes apart and
  // this part reaches four, so the deviation is forced by lead reach - the span
  // band in lib/kicad/lead-span.ts, checked in lib/stripboard/seed-fit.ts - and
  // by nothing else. The stray lead takes the strip nearest its own net's home
  // that the anchor can still reach (3, four holes from 0), and the pad holds
  // B's stated home, so the wire that makes B whole runs 3 to 7.
  const netlist = netlistOf([
    twoLead("R1", NARROW, ["1", "A"], ["2", "B"]),
    offBoard("J1", { pin: "1", net: "B" }),
  ])
  const seed = onlySeed(netlist, {
    name: "out of reach",
    homes: new Map([
      ["A", 0],
      ["B", 7],
    ]),
  })
  expect(stripsOf(seed, "R1"), "the anchor holds A's home and the stray cannot hold B's").toEqual([
    0, 3,
  ])
  expect(stripsOf(seed, "J1"), "the pad is on B's stated home").toEqual([7])
  expect(seed.wires.length, "and one wire makes B whole").toBe(1)
  expect(seed.wires[0]?.net).toBe("B")
  expect(seed.wires[0]?.from.strip).toBe(3)
  expect(seed.wires[0]?.to.strip).toBe(7)
})

test("two nets may be homed on one strip, which a stride cannot express", () => {
  // A home strip is where a net STARTS, not a strip it owns: the map may start
  // two nets on one, and the cut parting their runs falls out of `derivedCuts`
  // exactly as it does when a stray lead shares a strip. `onlySeed` has already
  // asserted the board realises the netlist with that cut in it.
  const netlist = netlistOf([
    twoLead("R1", WIDE, ["1", "A"], ["2", "A"]),
    twoLead("R2", WIDE, ["1", "B"], ["2", "B"]),
  ])
  const seed = onlySeed(netlist, {
    name: "doubled up",
    homes: new Map([
      ["A", 0],
      ["B", 0],
    ]),
  })
  expect(stripsOf(seed, "R1"), "A lies along strip 0").toEqual([0, 0])
  expect(stripsOf(seed, "R2"), "and so does B").toEqual([0, 0])
  expect(derivedCuts(seed, netlist.nets).length, "with one cut between their runs").toBe(1)
})

test("a net missing from an explicit map refuses rather than defaulting to a strip", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const message = refusalFrom(() =>
    seedsFrom(netlist, STOCK, SPANS, [{ name: "partial", homes: new Map([["A", 0]]) }]),
  )
  expect(message).toStartWith("stripboard-seed-net-has-no-home")
  expect(message, "it names the ordering").toContain('"partial"')
  expect(message, "and the net left without a strip").toContain('"B"')
  // **AND IT SAYS HOW MANY NETS THE MAP COVERS, which is what gives this test
  // teeth.** `homeOf` in lib/stripboard/seed-place.ts refuses under the SAME key
  // when a net reaches a placer with no home, so the three assertions above all
  // hold with the input check deleted and the placer's guard firing instead -
  // the test would pass while the thing it is about was gone. The counts are
  // carried only by the input-layer refusal.
  expect(message, "it says how much of the netlist the map covers").toContain(
    "1 of the netlist's 2 nets",
  )
})

test("a map naming a net the circuit has not refuses, as a stride ordering does", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "A"])])
  const message = refusalFrom(() =>
    seedsFrom(netlist, STOCK, SPANS, [
      {
        name: "stranger",
        homes: new Map([
          ["A", 0],
          ["B", 7],
        ]),
      },
    ]),
  )
  expect(message).toStartWith("stripboard-seed-ordering-unknown-net")
  expect(message, "it names the net the netlist has not").toContain('"B"')
})

test("a home that is not a strip on this stock refuses, and is neither rounded nor clamped", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const refusal = (strip: number): string =>
    refusalFrom(() =>
      seedsFrom(netlist, STOCK, SPANS, [
        {
          name: "off the stock",
          homes: new Map([
            ["A", 0],
            ["B", strip],
          ]),
        },
      ]),
    )
  for (const strip of [10, -1, 2.5]) {
    const message = refusal(strip)
    expect(message, `strip ${strip} is refused`).toStartWith("stripboard-seed-home-not-a-strip")
    expect(message, "it names the net").toContain('"B"')
    expect(message, "and the stock it is not on").toContain("10 strips")
  }
  expect(refusal(9), "the last strip on the stock is accepted").toBe("")
})

test("an ordering stating both forms refuses rather than silently using one", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const message = refusalFrom(() =>
    seedsFrom(netlist, STOCK, SPANS, [
      {
        name: "both",
        nets: ["A", "B"],
        stride: 1,
        homes: new Map([
          ["A", 0],
          ["B", 3],
        ]),
      },
    ]),
  )
  expect(message).toStartWith("stripboard-seed-ordering-states-both-forms")
  expect(message, "it names the ordering").toContain('"both"')
})
