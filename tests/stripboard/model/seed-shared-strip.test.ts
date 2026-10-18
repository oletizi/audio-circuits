/**
 * A STRIP THAT CARRIES TWO NETS: what the constructor now builds, what it still
 * refuses, and the price order between the two.
 *
 * **WHAT THESE ESTABLISH.** That a lead may land on a strip another net already
 * occupies when nothing cheaper will fit, and that the cut parting the two falls
 * out of `derivedCuts` with the board still sound; that the separability check
 * `lib/stripboard/separable.ts` states FIRES - a shared position whose contacts
 * would interleave is rejected, and when it is the only one left the
 * construction refuses rather than handing back a board its own joiner cannot
 * finish; and that a strip nothing else claims is still taken first, so the
 * relaxation did not make a cut-bearing board out of one that had a cheaper
 * shape available.
 *
 * **WHY THE LAST ONE IS HERE AT ALL.** A cut is priced at 1.0 in
 * `stripboard/rules.json` against 0.25 for a wire or a bridge, so a shared strip
 * is the dearer shape and is tried last. That order is the committed objective's
 * own and not a preference of this construction's, and without the assertion
 * below nothing would catch a later change that reached for a shared strip
 * first.
 *
 * **WHAT THEY DO NOT ESTABLISH.** No figure, no score and no claim about how few
 * cuts a seed carries: the owner's correction of 2026-10-15 is that *"Zero cuts
 * was never a requirement"* and that as few as possible is the OBJECTIVE's
 * business, so a count asserted here would be this file inventing a criterion.
 * The refusal test asserts its leading key and the facts the message must carry,
 * never its prose.
 *
 * **ITS OWN FILE** rather than another section of `./seed-room-hand-boards.test.ts`
 * or `./seed-placement-comfort.test.ts` - the files `./seed-room.test.ts` split
 * into (`docs/known-gaps.md` G6) that are about clearance and comfort - a
 * different subject from which strip a lead may land on.
 */
import { expect, test } from "bun:test"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { joinSiteFor, type ContactSite } from "../../../lib/stripboard/seed-contacts.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import type { Candidate, Grid, Hole, Placement } from "../../../lib/stripboard/board.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import type { SeedNetlist } from "../../../lib/stripboard/seed-model.ts"
import {
  RECORDED_SPANS,
  STOCK,
  derivedOrderings,
  feedbackNetlist,
  netlistOf,
  ordering,
  refusalFrom,
  syntheticSpan,
  twoLead,
} from "./seed-fixtures.ts"

/** Fixed at two holes, as a 2.54mm header is: it needs two ADJACENT strips. */
const PAIR = "SYNTHETIC:Shared_Pair"
/** Fixed at three holes, so a part of one net lies along a strip leaving a hole between. */
const SPAN3 = "SYNTHETIC:Shared_Span3"

const SPANS: ReadonlyMap<string, LeadSpan> = new Map([
  [PAIR, syntheticSpan(PAIR, 2, 2)],
  [SPAN3, syntheticSpan(SPAN3, 3, 3)],
])

/**
 * A board on which the only way to seat `R1` is a strip `B` already occupies.
 *
 * `strips` nets at stride 1, so every strip from 0 up is some net's home and
 * `strips - 3` are left over. `R2` has both leads on `B` and a span fixed at
 * three holes, so it lies along `B`'s own strip at columns 0 and 2 - which is
 * what gives that strip a RUN rather than a single contact, and therefore what
 * makes interleaving possible at all. `R1` reaches two adjacent strips and has
 * to get from `A` to `C`, two apart, so one of its leads must land somewhere
 * else; the only strip within reach of either of its home strips is `B`'s.
 */
function sharedBoard(grid: Grid): { readonly netlist: SeedNetlist; readonly grid: Grid } {
  return {
    netlist: netlistOf([
      twoLead("R2", SPAN3, ["1", "B"], ["2", "B"]),
      twoLead("R1", PAIR, ["1", "A"], ["2", "C"]),
    ]),
    grid,
  }
}

function onlySeed(netlist: SeedNetlist, grid: Grid): Candidate {
  const seed = seedsFrom(netlist, grid, SPANS, [ordering("abc", ["A", "B", "C"], 1)])[0]
  if (seed === undefined) throw new Error("no seed built")
  return seed
}

function stripOf(seed: Candidate, ref: string, pin: string): number {
  const hole = seed.placements.find((entry) => entry.ref === ref)?.pins.get(pin)
  if (hole === undefined) throw new Error(`"${ref}.${pin}" is not placed on this board`)
  return hole.strip
}

test("a strip carries two nets when nothing else will fit, and the cut is derived", () => {
  // Three strips of eight holes: `A` hosts strip 0, `B` strip 1 and `C` strip 2,
  // so there is no strip left over. `R2` takes columns 0 and 2 of strip 1. `R1`
  // cannot span `A` to `C` - three holes against its fixed two - so its `C` lead
  // lands on strip 1 beside `R2`'s run, and the cut between the two nets falls
  // out of the derivation rather than being planned here.
  const { netlist, grid } = sharedBoard({ strips: 3, columns: 8 })
  const seed = onlySeed(netlist, grid)
  expect(stripOf(seed, "R1", "1"), "the anchor lead is on its own net's strip").toBe(0)
  expect(stripOf(seed, "R1", "2"), "and the stray lead is on the strip B occupies").toBe(1)
  const cuts = derivedCuts(seed, netlist.nets)
  expect(cuts.length, "one cut parts the two nets on the one strip").toBe(1)
  expect(cuts[0]?.strip, "and it is on the shared strip").toBe(1)
  expect(violationsOf(seed, cuts, netlist.nets), "and the board is sound").toEqual([])
})

test("a shared position whose contacts would interleave is refused, not placed", () => {
  // The same board three holes wide. `R2` fills columns 0 and 2 of strip 1, so
  // the one free hole on it is column 1 - between two of `B`'s contacts. A `C`
  // lead there would leave `B` in two runs that no cut list can rejoin and that
  // the seed's join step cannot repair either, since it joins a net's STRIPS and
  // not two runs on one strip. So the position is rejected and, with nothing
  // else left, the construction stops.
  const { netlist, grid } = sharedBoard({ strips: 3, columns: 3 })
  const message = refusalFrom(() => onlySeed(netlist, grid))
  expect(message, "it stops rather than returning the board").toStartWith(
    "stripboard-seed-leads-cannot-reach",
  )
  expect(message, "it names the part that could not be put down").toContain('"R1"')
  expect(message, "it names the first net").toContain('"A"')
  expect(message, "it names the second net").toContain('"C"')
  expect(message, "and it says that interleaving is what closed the shared strip off").toContain(
    "interleav",
  )
})

/**
 * A part-built board as a `ContactSite`: `B` in two holes of strip 1 with one
 * free hole between them, `C` beyond it, and a `C` lead on strip 0 for the join
 * to reach.
 */
function joinFixture(): ContactSite {
  const placement = (ref: string, pins: ReadonlyMap<string, Hole>): Placement => ({
    ref,
    footprint: SPAN3,
    origin: [...pins.values()][0] ?? { strip: 0, column: 0 },
    direction: "E",
    holes: [...pins.values()],
    pins,
  })
  return {
    grid: { strips: 2, columns: 6 },
    nets: new Map([
      ["B", ["RB.1", "RB.2"]],
      ["C", ["R1.1", "R2.1"]],
    ]),
    placements: [
      placement("RB", new Map([["1", { strip: 1, column: 0 }], ["2", { strip: 1, column: 2 }]])),
      placement("R1", new Map([["1", { strip: 1, column: 4 }]])),
      placement("R2", new Map([["1", { strip: 0, column: 1 }]])),
    ],
    wires: [],
    bridges: [],
    taken: new Set(["1,0", "1,2", "1,4", "0,1"]),
    areas: [],
  }
}

test("a hole a join end would interleave is unusable to that join", () => {
  // THE DEFECT THIS GUARD CATCHES WAS REAL AND WAS MEASURED. A wire end and a
  // bridge hole are significant contacts, so on a shared strip they decide where
  // the cut falls; the first run of the 2026-10-15 relaxation let a join end land
  // inside the other net's run, and five of the orderings measured on the owner's
  // own two circuits came back with an OPEN in them - a net in two copper
  // components, caught by `seedsFrom`'s own `violationsOf` check under
  // `stripboard-seed-unsound`.
  //
  // On strip 1 of the fixture, `B` holds columns 0 and 2 and `C` holds column 4.
  // A `C` end in column 1 would leave `B` in two runs; one in column 3 or 5 would
  // not, because `C`'s contacts stay contiguous there.
  const site = joinFixture()
  const marked = joinSiteFor(site, "C", 0, 1).taken
  expect(marked.has("1,1"), "the hole between B's two contacts is unusable").toBe(true)
  expect(marked.has("1,3"), "the hole beside C's own contact is not").toBe(false)
  expect(marked.has("1,5"), "nor is the one past it").toBe(false)
  expect(marked.has("0,0"), "and strip 0 carries one net, so nothing on it is blocked").toBe(false)
  for (const key of site.taken) {
    expect(marked.has(key), `the holes already taken are still unusable (${key})`).toBe(true)
  }
})

test("an ordering that shares strips on the owner's own circuit comes back SOUND", () => {
  // The guard above, exercised end to end on a real circuit rather than a
  // fixture: `transistor-preamp-feedback` at stride 1 refused outright before
  // this relaxation, and the first version of the relaxation built it with an
  // OPEN in it. The assertion is a PROPERTY and not a figure - that the board
  // does share at least one strip, and that `violationsOf` is empty over the cuts
  // derived for it. What it costs is `objectiveOf`'s business and is not asserted.
  const { netlist, nets } = feedbackNetlist()
  const walk = derivedOrderings(netlist, 1).find((entry) => entry.name === "part-walk s1")
  if (walk === undefined) throw new Error('derivedOrderings no longer yields "part-walk s1"')
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [walk])[0]
  if (seed === undefined) throw new Error("no seed built")
  const cuts = derivedCuts(seed, nets)
  expect(cuts.length, "this ordering does put two nets on one strip").toBeGreaterThan(0)
  expect(violationsOf(seed, cuts, nets), "and every net is still whole in one component").toEqual(
    [],
  )
})

test("a strip nothing else claims is still taken first, because a cut costs more", () => {
  // The same circuit with one strip to spare. `A`, `B` and `C` host strips 0, 1
  // and 2 and strip 3 is left over, one hole from `C`'s. `R1` anchors its `C`
  // lead on strip 2 and puts its `A` lead on the spare strip rather than on the
  // strip `B` occupies - a join at 0.25 instead of a cut at 1.0 - and the board
  // comes back with no cut at all.
  const { netlist, grid } = sharedBoard({ strips: 4, columns: 8 })
  const seed = onlySeed(netlist, grid)
  expect(stripOf(seed, "R1", "1"), "the stray lead is on the strip nothing claims").toBe(3)
  expect(stripOf(seed, "R1", "2"), "and the anchor is on its own net's strip").toBe(2)
  const cuts = derivedCuts(seed, netlist.nets)
  expect(cuts, "no strip carries two nets, so the derivation finds nothing to cut").toEqual([])
  expect(violationsOf(seed, cuts, netlist.nets), "and the board is sound").toEqual([])
})
