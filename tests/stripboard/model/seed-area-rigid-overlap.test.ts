/**
 * THE AREA RULE: `rigidOverlap`, over the whole 2x2 of rigidity, and enforced
 * live by the seed construction.
 *
 * **WHAT THESE ESTABLISH.** That `rigidOverlap` refuses an overlap whenever
 * either part is rigid - rigid-on-rigid and rigid-on-formable alike - names
 * the RIGID part as the one that cannot move whichever argument order it is
 * handed in, admits a formable-on-formable overlap and a pair that does not
 * overlap at all, and is a distinct rule from `routedUnderRigid` rather than
 * a restatement of it; and that the seed construction enforces this live -
 * refusing to build a board when the only placement that reaches a part's
 * home strips lays its body over a rigid part's, and building the board when
 * the blocking part is formable instead, overlap and all.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18); see `./seed-room-hand-boards.test.ts` for the
 * other five.
 *
 * **A refusal test here asserts its leading key and the facts the message
 * must carry, never its prose.**
 */
import { expect, test } from "bun:test"
import {
  areaRect,
  rectsOverlap,
  rigidOverlap,
  routedUnderRigid,
  type PartArea,
} from "../../../lib/stripboard/seed-area.ts"
import { routedUnderRigidPlaces } from "./area-places.ts"
import { netlistOf, ordering, refusalFrom, syntheticSpan, twoLead } from "./seed-fixtures.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import type { Grid } from "../../../lib/stripboard/board.ts"
import type { LeadSpan } from "../../../lib/kicad/lead-span-model.ts"
import type { Ordering } from "../../../lib/stripboard/seed-homes.ts"
import type { SeedNetlist } from "../../../lib/stripboard/seed-model.ts"

/**
 * **ROUTED-UNDER-RIGID'S WHOLE-BOARD WALK MOVED TO `./area-places.ts`**, which
 * is now its one owner alongside `rigidOverlap`'s. The local name is kept so
 * the assertion below reads as it did.
 */
const leadsUnderRigid = routedUnderRigidPlaces

function overlappingPairs(areas: readonly PartArea[]): readonly string[] {
  const pairs: string[] = []
  for (const [index, a] of areas.entries()) {
    for (const b of areas.slice(index + 1)) {
      if (rectsOverlap(a.rect, b.rect)) pairs.push(`${a.ref}/${b.ref}`)
    }
  }
  return pairs
}

/**
 * **A ONE-COLUMN BOARD WITH TWO PARTS WHOSE BODIES MUST OVERLAP**, and nothing
 * else it can do about it.
 *
 * Ten strips, ONE column, four nets at stride 3 - so `A` hosts strip 0, `B`
 * strip 3, `C` strip 6, `D` strip 9 - and a synthetic span fixed at 4 holes, so
 * a lead pair reaches its two home strips and nothing else. `blocker` takes
 * strips 0 and 3 with its body reaching 2 strips further on, covering strips
 * 0-5; `C1` takes strips 6 and 9 with its body reaching 2 strips back, covering
 * strips 4-9. The two rectangles meet at strips 4 and 5.
 *
 * **NEITHER PART HAS A LEAD IN THE OTHER'S RECTANGLE, WHICH IS THE WHOLE POINT.**
 * `blocker`'s leads are on strips 0 and 3, outside 4-9; `C1`'s are on 6 and 9,
 * outside 0-5. So `routedUnderRigid` is silent on this board whichever part is
 * rigid, and only the AREA rule can see it - which is what makes the pair of
 * tests below a test of that rule rather than of the older one.
 *
 * `rigid` is the parameter because the two outcomes differ only in it.
 */
const OVERLAP_FOOTPRINT = "SYNTHETIC:Seed_Overlap"

interface BodyCase {
  readonly netlist: SeedNetlist
  readonly spans: ReadonlyMap<string, LeadSpan>
  readonly ordering: Ordering
  readonly grid: Grid
}

function bodiesMustMeet(rigid: boolean): BodyCase {
  return {
    netlist: netlistOf([
      twoLead("RV1", OVERLAP_FOOTPRINT, ["1", "A"], ["2", "B"], {
        rigid,
        body: { beforeAlong: 0, afterAlong: 2, beforeAcross: 0, afterAcross: 0 },
      }),
      twoLead("C1", OVERLAP_FOOTPRINT, ["1", "C"], ["2", "D"], {
        body: { beforeAlong: 2, afterAlong: 0, beforeAcross: 0, afterAcross: 0 },
      }),
    ]),
    spans: new Map([[OVERLAP_FOOTPRINT, syntheticSpan(OVERLAP_FOOTPRINT, 4, 4)]]),
    ordering: ordering("abcd", ["A", "B", "C", "D"], 3),
    grid: { strips: 10, columns: 1 },
  }
}

test("rigidOverlap, over the whole 2x2 of rigidity, and it reports which part cannot move", () => {
  // THE FOUR CASES THE OWNER'S TWO DIRECTIVES DECIDE BETWEEN, asserted here
  // rather than inferred from the placer's behaviour: rigid/rigid REFUSED,
  // rigid/formable REFUSED, formable/formable ADMITTED, and no overlap at all
  // ADMITTED whatever the rigidity. Each rectangle holds its own lead, which is
  // the premise the test above asserts over his real boards.
  // `leadStrip` is at the far END of each rectangle from the pair it overlaps, so
  // that NO lead sits inside another part's rectangle anywhere in this test and
  // `routedUnderRigid` is silent on every case - which is what makes these
  // assertions about the new rule rather than about the old one.
  const area = (
    ref: string,
    rigid: boolean,
    minStrip: number,
    maxStrip: number,
    leadStrip: number,
  ): PartArea => ({
    ref,
    rigid,
    rect: { minStrip, maxStrip, minColumn: 0, maxColumn: 2 },
    leads: [{ strip: leadStrip, column: 0 }],
  })
  const rigidLow = area("RV1", true, 0, 3, 0)
  const rigidHigh = area("RV2", true, 2, 5, 5)
  const formableHigh = area("R1", false, 2, 5, 5)
  const formableFar = area("R2", false, 8, 9, 8)

  const both = rigidOverlap(rigidLow, [rigidHigh])
  expect(both?.rigid, "rigid on rigid is refused").toBe("RV1")
  expect(both?.other).toBe("RV2")
  expect(both?.bothRigid, "and neither of the two can be moved aside").toBe(true)

  // Either argument order names the rigid part as the one that cannot move, so a
  // refusal message cannot blame the part that could have been bent.
  const mixed = rigidOverlap(formableHigh, [rigidLow])
  expect(mixed?.rigid, "the rigid part is named as the immovable one").toBe("RV1")
  expect(mixed?.other).toBe("R1")
  expect(mixed?.bothRigid).toBe(false)
  const reversed = rigidOverlap(rigidLow, [formableHigh])
  expect(reversed?.rigid, "whichever way round the pair is handed in").toBe("RV1")
  expect(reversed?.other).toBe("R1")

  expect(
    rigidOverlap(formableHigh, [area("R3", false, 0, 3, 0)]),
    "formable on formable is ADMITTED - the owner's other directive",
  ).toBeNull()
  expect(rigidOverlap(rigidLow, [formableFar]), "and a pair that does not overlap").toBeNull()
  expect(rigidOverlap(rigidLow, []), "nothing placed yet").toBeNull()

  // AND IT IS NOT A RESTATEMENT OF routedUnderRigid: neither part has a lead in
  // the other's rectangle here, so the older rule is silent on a pair this one
  // refuses.
  expect(routedUnderRigid(formableHigh, [rigidLow]), "no lead of either is inside the other").toBe(
    null,
  )
})

test("THE AREA RULE: a formable body is refused over a RIGID part's area", () => {
  // THE OWNER, 2026-10-15: *"Rigid parts are rigid. You cant push them out of
  // the way or rout under them."* There is exactly one column on this stock and
  // the only placement that reaches `C1`'s two home strips lays its body over
  // the rigid part's, so the construction has nothing left to try and refuses.
  const { netlist, spans, ordering: order, grid } = bodiesMustMeet(true)
  const message = refusalFrom(() => seedsFrom(netlist, grid, spans, [order]))
  expect(message, "the construction stops rather than returning the board").toStartWith(
    "stripboard-seed-leads-cannot-reach",
  )
  expect(message, "it names the part that could not be put down").toContain('"C1"')
  expect(message, "and says a rigid part's area is what closed the column off").toContain("rigid")
})

test("THE AREA RULE'S OTHER HALF: two FORMABLE bodies may still overlap", () => {
  // *"Resistors, diodes, most capacitors can be jostled out of the way of each
  // other"*, and *"Don't worry about body collisions on the stripboard. It's
  // extremely flexible."* The identical board with the blocker declared formable
  // BUILDS, and the board it builds has the overlap in it - so the rule turns on
  // rigidity and is not quietly "no overlap at all".
  const { netlist, spans, ordering: order, grid } = bodiesMustMeet(false)
  const [seed] = seedsFrom(netlist, grid, spans, [order])
  if (seed === undefined) throw new Error("unreachable: one seed per ordering")
  const byRef = new Map(netlist.parts.map((part) => [part.ref, part]))
  const areas: PartArea[] = seed.placements.map((placement) => {
    const part = byRef.get(placement.ref)
    if (part === undefined) throw new Error(`no part ${placement.ref}`)
    return {
      ref: placement.ref,
      rigid: part.rigid,
      rect: areaRect(
        [...placement.pins.values()].map((hole) => ({
          alongSteps: Math.abs(hole.strip - placement.origin.strip),
          acrossSteps: 0,
        })),
        part.body,
        placement.origin,
        placement.direction,
      ),
      leads: [...placement.pins.values()],
    }
  })
  expect(areas.map((area) => area.rigid), "nothing on this board is rigid").toEqual([false, false])
  expect(
    [...overlappingPairs(areas)].sort(),
    "the two bodies do overlap, so the refusing twin above is not refusing for another reason",
  ).toEqual(["RV1/C1"])
  expect(leadsUnderRigid(areas), "and no lead is under anything rigid either way").toEqual([])
})
