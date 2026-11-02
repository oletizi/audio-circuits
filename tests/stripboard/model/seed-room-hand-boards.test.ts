/**
 * ROOM TO WORK: the figures the construction cites, re-derived from the
 * owner's own built boards.
 *
 * **WHAT THESE ESTABLISH.** How his as-built boards COMPARE to the rules
 * `lib/stripboard/seed-area.ts` states - not the evidence for those rules,
 * which is a distinction the 2026-10-15 ruling forced and which that file's
 * own comment now spells out; that both hard rules hold almost everywhere on
 * his two real boards - no lead inside a rigid part's area
 * (`routedUnderRigid`) and no two areas overlapping when either part is
 * rigid (`rigidOverlap`), except where they measurably do not; that a part's
 * rectangle contains its own leads, which is the premise every figure here
 * depends on; and that his wires mostly cross nothing.
 *
 * **THE FIGURES MOVED WHEN THE INSTRUMENT WAS CORRECTED, AND NO RULE WAS
 * ADJUSTED TO FIT THEM.** The defect and the eight rectangles it displaced are
 * `./seed-room-fixtures.ts`'s to state. Corrected: one lead of 85 under a
 * rigid part rather than none, two overlapping pairs on `feedback` rather
 * than none, three on `buffered` rather than four, both clearance histograms
 * shifted, the wire split unchanged. **No threshold, tier, refusal or
 * argument in `seed-area.ts` or `seed-place.ts` is adjusted to fit them**: an
 * agent may never author the acceptance criteria for the artifact it is
 * producing, so this file reports and the owner decides. The owner then
 * decided, and ***"my directives are more authoritative than a file on
 * disk"*** is why four of the five overlapping pairs these tests measure are
 * pairs the tool refuses to reproduce.
 *
 * **WHAT THEY DO NOT ESTABLISH.**
 *
 *   - **the figures are asserted as they were measured, including where they
 *     are unflattering to the rules.** `feedback` overlaps two pairs and
 *     `buffered` three, and one of his eight wires crosses a rigid part;
 *     these tests pin those counts so that neither a later hardening nor a
 *     later softening can happen without the comparison moving in plain
 *     sight;
 *   - **`areaRect` is conservative on a stretched part** by up to
 *     `beforeAlong + afterAlong` holes, which is 2 for the three radial cans
 *     and 0 for the other ten footprints. Every figure here is measured with
 *     that same function, so the two sides are comparable; none of them is
 *     the geometric truth about a stretched can.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18): this one keeps the hand-board measurements: the
 * other five are `./seed-parts-body-margins.test.ts` (where a body margin
 * comes from and when it refuses), `./seed-area-regression.test.ts` (a
 * generated seed over the real netlist), `./seed-area-rigid-overlap.test.ts`
 * (the `rigidOverlap` rule itself), `./seed-placement-comfort.test.ts`
 * (comfort over clustering, and wire routing) and
 * `./seed-area-arithmetic.test.ts` (the rectangle primitives).
 */
import { expect, test } from "bun:test"
import {
  freeHolesBetween,
  holeInRect,
  rectsOverlap,
  routeOf,
  type PartArea,
} from "../../../lib/stripboard/seed-area.ts"
import { rigidOverlapPlaces, routedUnderRigidPlaces } from "./area-places.ts"
import { handBoard } from "./seed-room-fixtures.ts"

function clearanceHistogram(areas: readonly PartArea[]): ReadonlyMap<number, number> {
  const histogram = new Map<number, number>()
  for (const [index, a] of areas.entries()) {
    let best = Number.POSITIVE_INFINITY
    for (const [other, b] of areas.entries()) {
      if (index === other) continue
      best = Math.min(best, freeHolesBetween(a.rect, b.rect))
    }
    histogram.set(best, (histogram.get(best) ?? 0) + 1)
  }
  return histogram
}

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
 * **BOTH MEASUREMENTS MOVED TO `./area-places.ts`**, which is now their one
 * owner: `./benchmark-fixtures.ts` needs the same two answers about an imported
 * hand board and `../exemptions.test.ts` consults the recorded exemptions
 * against them, and a second spelling of "where does this board break
 * `rigidOverlap`" is a second place for the answer to come out differently. The
 * local names are kept so the assertions below read as they did.
 */
const rigidOverlappingPairs = rigidOverlapPlaces
const leadsUnderRigid = routedUnderRigidPlaces

test("the hard rule against his own boards, measured: ONE lead under a rigid part", () => {
  // 37 parts and 85 leads between the two, and this figure MOVED when the
  // instrument was corrected (the defect is `./seed-room-fixtures.ts`'s to
  // state; eight trimmer rectangles moved and the other 29 did not). It read
  // 0 of 85 and it is now 1 of 85: on `feedback`, R4's lower lead at strip 14
  // column 13 lies inside RV4's rectangle.
  //
  // WHAT THAT ONE LEAD IS AND IS NOT. RV4's own leads span strips 13..15 and
  // columns 10..12; column 13 is the hole the RM-065's moulded body reaches into
  // (`beforeAcross: 1`). So the lead is under the trimmer's BODY OVERHANG and not
  // between its terminals - the rectangle-free lower bound, the box a rigid
  // part's own leads span, is still 0 of 85 on both boards.
  //
  // **THE RULE WAS NOT ADJUSTED TO THIS FIGURE AND THE OWNER WIDENED IT INSTEAD.**
  // `lib/stripboard/seed-area.ts` still refuses a lead inside a rigid part's area
  // outright - *"Rigid parts are rigid. You cant push them out of the way or rout
  // under them."* - and now refuses an area overlap with one too. An agent may
  // never author the acceptance criteria for the artifact it is producing: this
  // file reports what his boards measure and he decides what the rules are.
  const feedback = handBoard("transistor-preamp-feedback")
  const buffered = handBoard("transistor-preamp-buffered")
  expect(feedback.skipped, "every part on feedback is measured").toEqual([])
  expect(buffered.skipped, "and every part on buffered").toEqual([])
  expect(feedback.areas.length).toBe(16)
  expect(buffered.areas.length).toBe(21)
  expect(
    feedback.areas.reduce((total, area) => total + area.leads.length, 0) +
      buffered.areas.reduce((total, area) => total + area.leads.length, 0),
    "85 leads between them",
  ).toBe(85)
  expect(
    leadsUnderRigid(feedback.areas),
    "feedback puts R4's lower lead in RV4's rectangle, and nothing else under a rigid part",
  ).toEqual(["R4 under RV4"])
  expect(leadsUnderRigid(buffered.areas), "buffered routes nothing under a rigid part").toEqual([])

  // **AND IT IS A RECORDED EXEMPTION RATHER THAN AN ARGUMENT HAD AGAIN.** Both
  // boards are exempt from both hard rules - `stripboard/exemptions.json`,
  // granted by the owner on 2026-10-15 with his words and the reason - so what
  // these counts mean is settled: *"My ad-built boards should be exempt from the
  // stricter standards of our new tooling"*, his typo preserved. **IT IS
  // REPORTED, NOT INVISIBLE**: three of the four measured rule/board pairs have
  // something to say and each says it in one line naming the board, the rule and
  // the count. An exempt breach that went quiet would be a skipped check wearing
  // a pass.
  for (const board of [feedback, buffered]) {
    for (const verdict of board.exemptions) {
      expect(verdict.outcome, `${board.name} / ${verdict.rule}`).not.toBe("unexcused")
    }
  }
  expect([...feedback.notices, ...buffered.notices]).toHaveLength(3)
  for (const notice of [...feedback.notices, ...buffered.notices]) {
    expect(notice).toStartWith("stripboard-exempt:")
    expect(notice.includes("\n"), "one line").toBe(false)
  }
})

test("THE PREMISE OF EVERY FIGURE HERE: a part's rectangle contains its own leads", () => {
  // THE DEFECT THIS CATCHES, AND IT WAS REAL. A rectangle built from a
  // footprint's moulded pad offsets is the mirror image of a reflected part's
  // real position, and the eight RM-065 trimmers across these boards were each
  // measured two strips from where their leads are. Every figure here is derived
  // from these rectangles, so one that excludes its own lead holes makes all of
  // them measurements of nothing - silently, which is why this is asserted and
  // not trusted. It is not vacuous: displace a rigid part's rectangle in
  // `./seed-room-fixtures.ts` and it reports the leads left outside.
  for (const name of ["transistor-preamp-feedback", "transistor-preamp-buffered"]) {
    const board = handBoard(name)
    const outside: string[] = []
    let leads = 0
    for (const area of board.areas) {
      for (const lead of area.leads) {
        leads += 1
        if (!holeInRect(lead, area.rect)) {
          outside.push(`${area.ref} lead ${lead.strip},${lead.column}`)
        }
      }
    }
    expect(leads, `${name} contributes leads to check`).toBeGreaterThan(0)
    expect(outside, `${name}: every part's rectangle holds its own leads`).toEqual([])
  }
})

test("the clearance his boards actually leave, measured rather than quoted", () => {
  // EVERY FIGURE IN THIS TEST MOVED WHEN THE TRIMMER RECTANGLES WERE CORRECTED,
  // and each is asserted exactly as measured. `lib/stripboard/seed-area.ts`'s
  // comment still quotes the pre-correction figures; it is deliberately NOT
  // edited here - see the hard-rule test above for why.
  const feedback = handBoard("transistor-preamp-feedback")
  // 14 of 16 parts are ADJACENT to their nearest neighbour with no free hole
  // between, one has a single free hole and one has two. **And feedback DOES
  // have overlapping pairs - two of them, Q1/RV3 and R4/RV4.** The earlier
  // reading that it had none was the displaced trimmers: RV3 and RV4 were each
  // measured two strips off their real position, which moved them off the parts
  // they really sit against. So "no pair overlaps" is not a condition either of
  // his boards keeps.
  expect([...clearanceHistogram(feedback.areas).entries()].sort((a, b) => a[0] - b[0])).toEqual([
    [0, 14],
    [1, 1],
    [2, 1],
  ])
  expect([...overlappingPairs(feedback.areas)].sort(), "feedback's overlapping pairs").toEqual([
    "Q1/RV3",
    "R4/RV4",
  ])
  // BOTH of feedback's involve a rigid part - Q1/RV3 is rigid on rigid, where
  // NEITHER can be moved aside - so the tool refuses both.
  expect(
    [...rigidOverlappingPairs(feedback.areas)].sort(),
    "and both are ones the area rule refuses",
  ).toEqual(["Q1/RV3", "R4/RV4"])

  // buffered overlaps in three pairs rather than four: C1/RV4, C3/Q1 and C3/R1
  // stand, and RV1/RV2 was an artifact of both trimmers being measured two strips
  // out. **Two of the three are ones the tool now refuses** - C1/RV4 and C3/Q1
  // each involve a rigid part - and C3/R1 is formable on formable and stays
  // admitted. So four of the five overlaps across both boards are spots the tool
  // will not reproduce, which is the ruling working rather than a contradiction.
  const buffered = handBoard("transistor-preamp-buffered")
  expect([...overlappingPairs(buffered.areas)].sort()).toEqual(["C1/RV4", "C3/Q1", "C3/R1"])
  expect(
    [...rigidOverlappingPairs(buffered.areas)].sort(),
    "the two of the three that the area rule refuses",
  ).toEqual(["C1/RV4", "C3/Q1"])
  expect([...clearanceHistogram(buffered.areas).entries()].sort((a, b) => a[0] - b[0])).toEqual([
    [0, 17],
    [1, 3],
    [2, 1],
  ])
})

test("his wires mostly cross nothing, which is why a crossing is ordered and not refused", () => {
  const routes: string[] = []
  for (const name of ["transistor-preamp-feedback", "transistor-preamp-buffered"]) {
    const board = handBoard(name)
    for (const wire of board.wires) routes.push(routeOf(wire.from, wire.to, board.areas))
  }
  expect(routes.length, "eight wires between the two boards").toBe(8)
  expect(routes.filter((route) => route === "clear").length, "five cross nothing").toBe(5)
  expect(routes.filter((route) => route === "over-formable").length, "two cross a formable part").toBe(2)
  expect(routes.filter((route) => route === "over-rigid").length, "one crosses a rigid one").toBe(1)
})
