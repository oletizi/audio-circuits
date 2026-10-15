/**
 * ROOM TO WORK: the figures the construction cites, re-derived from the owner's
 * own built boards, and the behaviour they produce on a seed.
 *
 * **WHAT THESE ESTABLISH.** What the four measurements `lib/stripboard/seed-area.ts`
 * states as its evidence actually come out as on his boards - which since the
 * trimmer rectangles were corrected is NOT in every case what that file's
 * comment quotes; that a part's body margins come out of its `.kicad_mod` rather
 * than a table; that the hard rule - no lead inside a rigid part's area - holds
 * on every seed; that a seed no longer piles its parts into one column band,
 * which is the defect this round exists to fix; and that comfort beats
 * clustering when the two disagree, which is the owner's stated priority.
 *
 * **THREE OF THE FOUR FIGURES MOVED WHEN THE INSTRUMENT WAS CORRECTED, AND THE
 * RULES THEY ARE EVIDENCE FOR ARE LEFT EXACTLY AS THEY WERE.** The defect and
 * the eight rectangles it displaced are `./seed-room-fixtures.ts`'s to state.
 * Corrected: one lead of 85 under a rigid part rather than none, two overlapping
 * pairs on `feedback` rather than none, three on `buffered` rather than four,
 * both clearance histograms shifted, the wire split unchanged. **No threshold,
 * tier, refusal or argument in `seed-area.ts` or `seed-place.ts` is adjusted to
 * fit them**: an agent may never author the acceptance criteria for the artifact
 * it is producing, so this file reports and the owner decides.
 *
 * **WHAT THEY DO NOT ESTABLISH.**
 *
 *   - **nothing here asserts a width, a density or a score.** The regression
 *     assertion is a PROPERTY - no two parts' occupied areas overlap - which a
 *     31-strip-by-3-column board with sixteen parts cannot satisfy. **It is no
 *     longer a property `feedback` has**, which is a finding about the stated
 *     justification and not a licence to weaken the assertion; see the
 *     regression test's own comment. A column count would be a threshold of mine;
 *   - **the clearance figures are asserted as they were measured, including
 *     where they are unflattering to the rule.** `buffered` has three overlapping
 *     pairs and one wire over a rigid part, so neither is refused by the
 *     construction, and these tests pin those counts so that a later reading
 *     cannot quietly harden the rule past what he builds;
 *   - **`areaRect` is conservative on a stretched part** by up to
 *     `beforeAlong + afterAlong` holes, which is 2 for the three radial cans and
 *     0 for the other ten footprints. Every figure here is measured with that
 *     same function, so the two sides are comparable; none of them is the
 *     geometric truth about a stretched can;
 *   - a refusal test asserts its leading key and the facts the message must
 *     carry, never its prose.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import {
  areaRect,
  comfortOf,
  holeInRect,
  freeHolesBetween,
  rectsOverlap,
  routeOf,
  routedUnderRigid,
  spanHoles,
  type PartArea,
} from "../../../lib/stripboard/seed-area.ts"
import { bodyMarginsFor, seedPartsFrom } from "../../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import {
  RECORDED_SPANS,
  STOCK,
  bodied,
  committedNetlist,
  derivedOrderings,
  fixedField,
  netlistOf,
  ordering,
  refusalFrom,
  syntheticSpan,
  twoLead,
} from "./seed-fixtures.ts"
import { handBoard } from "./seed-room-fixtures.ts"

const SOURCE = { patterns: PIN_PATTERNS, spans: LEAD_SPANS }

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

function leadsUnderRigid(areas: readonly PartArea[]): readonly string[] {
  const found: string[] = []
  for (const host of areas) {
    if (!host.rigid) continue
    for (const guest of areas) {
      if (guest.ref === host.ref) continue
      for (const lead of guest.leads) {
        if (holeInRect(lead, host.rect)) found.push(`${guest.ref} under ${host.ref}`)
      }
    }
  }
  return found
}

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
  // **NOTHING IN `lib/stripboard/seed-area.ts` IS ADJUSTED TO THIS FIGURE.** The
  // rule there still refuses a lead inside a rigid part's area outright, and its
  // comment still cites 0 of 85. An agent may never author the acceptance
  // criteria for the artifact it is producing: this file reports what his boards
  // measure and the owner decides what the rule should be.
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

  // buffered overlaps in three pairs rather than four: C1/RV4, C3/Q1 and C3/R1
  // stand, and RV1/RV2 was an artifact of both trimmers being measured two strips
  // out. An overlap is still admitted rather than refused.
  const buffered = handBoard("transistor-preamp-buffered")
  expect([...overlappingPairs(buffered.areas)].sort()).toEqual(["C1/RV4", "C3/Q1", "C3/R1"])
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

test("a part's body margins come out of its own .kicad_mod", () => {
  // The 220uF can on the feedback board, whose body the owner saw stacked on a
  // trimmer: 8mm across, so two holes past its pads on each side of the row.
  expect(bodyMarginsFor("Capacitor_THT:CP_Radial_D8.0mm_P3.50mm", SOURCE)).toEqual({
    beforeAlong: 1,
    afterAlong: 1,
    beforeAcross: 2,
    afterAcross: 2,
  })
  // A DIN0207 resistor's body lies between its leads and reaches past neither.
  expect(
    bodyMarginsFor("Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal", SOURCE),
  ).toEqual({ beforeAlong: 0, afterAlong: 0, beforeAcross: 0, afterAcross: 0 })
  // Every recorded footprint derives, and no margin is negative.
  for (const footprint of PIN_PATTERNS.keys()) {
    const margins = bodyMarginsFor(footprint, SOURCE)
    for (const [side, steps] of Object.entries(margins)) {
      expect(steps, `${footprint} ${side}`).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(steps), `${footprint} ${side} is whole`).toBe(true)
    }
  }
})

test("the geometry derivation refuses by name rather than guessing a box", () => {
  expect(refusalFrom(() => bodyMarginsFor("SYNTHETIC:Nothing_Recorded", SOURCE))).toStartWith(
    "stripboard-seed-parts-no-pattern",
  )
  const nets = new Map([["A", ["R1.1", "R1.2"]]])
  expect(refusalFrom(() => seedPartsFrom(nets, new Map(), SOURCE))).toStartWith(
    "stripboard-seed-parts-no-footprint",
  )
  expect(
    refusalFrom(() => seedPartsFrom(new Map([["A", ["R1"]]]), new Map(), SOURCE)),
  ).toStartWith("stripboard-seed-parts-pin-id-malformed")
  const wrongPins = new Map([["A", ["Q1.9", "Q1.8", "Q1.7"]]])
  const message = refusalFrom(() =>
    seedPartsFrom(wrongPins, new Map([["Q1", "Package_TO_SOT_THT:TO-92_Inline"]]), SOURCE),
  )
  expect(message).toStartWith("stripboard-seed-parts-pad-missing")
  expect(message, "it names the pads the footprint does have").toContain("[1, 2, 3]")
})

test("a body margin that is not a whole number of holes refuses by name", () => {
  const broken = netlistOf([
    twoLead("R1", "SYNTHETIC:Seed_Bodied", ["1", "A"], ["2", "B"], {
      body: { beforeAlong: 0, afterAlong: 0.5, beforeAcross: 0, afterAcross: 0 },
    }),
  ])
  const spans = new Map([["SYNTHETIC:Seed_Bodied", syntheticSpan("SYNTHETIC:Seed_Bodied", 2, 6)]])
  const message = refusalFrom(() =>
    seedsFrom(broken, { strips: 8, columns: 8 }, spans, [ordering("ab", ["A", "B"], 1)]),
  )
  expect(message).toStartWith("stripboard-seed-body-margin-not-whole")
  expect(message, "it names the part").toContain('"R1"')
  expect(message, "and the side").toContain("afterAlong")
})

test("THE REGRESSION: a seed no longer piles its parts into one column band", () => {
  // The defect: on a 34 x 27 stock the first version returned a board 31 strips
  // by THREE columns with 37 leads in it, overlapping an electrolytic with a
  // trimmer. The property asserted here is that no two parts' occupied areas
  // overlap, which that board cannot satisfy. A width or a density figure is
  // deliberately NOT asserted: it would be a threshold chosen by the thing being
  // measured.
  //
  // **ITS STATED JUSTIFICATION HAS LOST ITS EVIDENCE AND THE ASSERTION STANDS
  // UNCHANGED.** This comment used to call it "the one his own feedback board
  // has"; measured with the corrected trimmer rectangles, `feedback` has two
  // overlapping pairs (Q1/RV3, R4/RV4) and `buffered` three, so no-overlap is a
  // property neither built board holds. Whether a GENERATED seed should still be
  // held to it is the owner's call, and loosening it here on evidence I measured
  // would be authoring the criterion for the artifact.
  const { netlist, nets } = committedNetlist("transistor-preamp-feedback")
  const byRef = new Map(netlist.parts.map((part) => [part.ref, part]))
  let built = 0
  for (const stride of [2, 3]) {
    for (const entry of derivedOrderings(netlist, stride)) {
      let seed
      try {
        seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [entry])[0]
      } catch (error) {
        expect(error instanceof Error ? error.message : String(error)).toStartWith(
          "stripboard-seed-",
        )
        continue
      }
      if (seed === undefined) throw new Error("unreachable: one seed per ordering")
      built += 1
      const areas: PartArea[] = seed.placements.map((placement) => {
        const part = byRef.get(placement.ref)
        if (part === undefined) throw new Error(`no part ${placement.ref}`)
        const frame =
          part.kind === "fixed-field"
            ? part.field
            : [...placement.pins.values()].map((hole) => ({
                alongSteps: Math.abs(
                  placement.direction === "E"
                    ? hole.column - placement.origin.column
                    : hole.strip - placement.origin.strip,
                ),
                acrossSteps: 0,
              }))
        return {
          ref: placement.ref,
          rigid: part.rigid,
          rect: areaRect(frame, part.body, placement.origin, placement.direction),
          leads: [...placement.pins.values()],
        }
      })
      expect(
        leadsUnderRigid(areas),
        `ordering "${entry.name}" routes no lead under a rigid part`,
      ).toEqual([])
      expect(
        overlappingPairs(areas),
        `ordering "${entry.name}" gives every part its own space`,
      ).toEqual([])
      expect(
        violationsOf(seed, derivedCuts(seed, nets), nets),
        `ordering "${entry.name}" still realises the netlist`,
      ).toEqual([])
    }
  }
  expect(built, "at least one derived ordering admits this circuit").toBeGreaterThan(0)
})

test("comfort beats clustering, which is the owner's stated priority", () => {
  // Two nets, three parts. R1 goes down first and takes the comfortable end of
  // the board. R2 shares both of R1's nets, so clustering would put it right
  // beside R1 - and R1's body reaches two holes past its pads on every side, so
  // beside R1 is inside R1's space. The assertion is that R2 clears R1's
  // rectangle rather than hugging it.
  // Across the row only: a margin ALONG the row would put this part's body off
  // the top of the board when its first lead is on strip 0, and the question
  // here is about columns.
  const body = { beforeAlong: 0, afterAlong: 0, beforeAcross: 2, afterAcross: 2 }
  const parts = [
    twoLead("R1", "SYNTHETIC:Seed_Bodied", ["1", "A"], ["2", "B"], { body }),
    twoLead("R2", "SYNTHETIC:Seed_Bodied", ["1", "A"], ["2", "B"], { body }),
  ]
  const spans = new Map([["SYNTHETIC:Seed_Bodied", syntheticSpan("SYNTHETIC:Seed_Bodied", 2, 6)]])
  const [seed] = seedsFrom(netlistOf(parts), { strips: 8, columns: 20 }, spans, [
    ordering("ab", ["A", "B"], 1),
  ])
  if (seed === undefined) throw new Error("no seed")
  const columnOf = (ref: string): number => {
    const placement = seed.placements.find((entry) => entry.ref === ref)
    const hole = placement?.pins.get("1")
    if (hole === undefined) throw new Error(`no ${ref}.1`)
    return hole.column
  }
  // R1's rectangle covers columns 0..4 (its pad at column 2 plus two each side),
  // so a clearance of one free hole puts R2's pad at column 8 at the earliest.
  expect(columnOf("R1"), "the first part takes the lowest comfortable column").toBe(2)
  expect(columnOf("R2") - columnOf("R1"), "the second clears it rather than hugging it").toBe(6)
})

test("a wire takes a clear route when one exists", () => {
  // A rigid three-terminal part sits across strips 1..3. Net C has leads on
  // strips 0 and 4 and must be joined across it; the join column is chosen so
  // the wire misses the part rather than running over it.
  const spans = new Map([
    ["SYNTHETIC:Seed_Rigid3", syntheticSpan("SYNTHETIC:Seed_Rigid3", 3, 3)],
    ["SYNTHETIC:Seed_Pair", syntheticSpan("SYNTHETIC:Seed_Pair", 2, 6)],
  ])
  const parts = [
    fixedField(
      "Q1",
      "SYNTHETIC:Seed_Rigid3",
      [
        { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
        { pin: "2", net: "B", alongSteps: 1, acrossSteps: 0 },
        { pin: "3", net: "C", alongSteps: 2, acrossSteps: 0 },
      ],
      { rigid: true, body: bodied(1) },
    ),
    twoLead("R1", "SYNTHETIC:Seed_Pair", ["1", "C"], ["2", "D"]),
  ]
  const [seed] = seedsFrom(netlistOf(parts), { strips: 8, columns: 16 }, spans, [
    ordering("abcd", ["A", "B", "C", "D"], 1),
  ])
  if (seed === undefined) throw new Error("no seed")
  const areas: PartArea[] = seed.placements.map((placement) => {
    const part = parts.find((entry) => entry.ref === placement.ref)
    if (part === undefined || part.kind !== "fixed-field") {
      return {
        ref: placement.ref,
        rigid: false,
        rect: areaRect(
          [...placement.pins.values()].map((hole) => ({
            alongSteps: Math.abs(hole.strip - placement.origin.strip),
            acrossSteps: 0,
          })),
          { beforeAlong: 0, afterAlong: 0, beforeAcross: 0, afterAcross: 0 },
          placement.origin,
          placement.direction,
        ),
        leads: [...placement.pins.values()],
      }
    }
    return {
      ref: placement.ref,
      rigid: true,
      rect: areaRect(part.field, part.body, placement.origin, placement.direction),
      leads: [...placement.pins.values()],
    }
  })
  for (const wire of seed.wires) {
    expect(routeOf(wire.from, wire.to, areas), "the wire route is clear").toBe("clear")
  }
})

test("the area arithmetic says what it claims", () => {
  const margins = { beforeAlong: 1, afterAlong: 1, beforeAcross: 2, afterAcross: 2 }
  const pins = [
    { alongSteps: 0, acrossSteps: 0 },
    { alongSteps: 1, acrossSteps: 0 },
  ]
  // Facing S puts the pin row across the strips and the across axis down the
  // columns, so the margins swap axes with the turn.
  expect(areaRect(pins, margins, { strip: 5, column: 5 }, "S")).toEqual({
    minStrip: 4,
    maxStrip: 7,
    minColumn: 3,
    maxColumn: 7,
  })
  // Facing E puts the row along a strip, so the same margins land the other way.
  expect(areaRect(pins, margins, { strip: 5, column: 5 }, "E")).toEqual({
    minStrip: 3,
    maxStrip: 7,
    minColumn: 4,
    maxColumn: 7,
  })
  const a = { minStrip: 0, maxStrip: 1, minColumn: 0, maxColumn: 1 }
  // Adjacent: no free hole between them. The off-by-one here was a real bug -
  // see freeHolesBetween's own comment.
  expect(freeHolesBetween(a, { minStrip: 0, maxStrip: 1, minColumn: 2, maxColumn: 3 })).toBe(0)
  expect(freeHolesBetween(a, { minStrip: 0, maxStrip: 1, minColumn: 3, maxColumn: 4 })).toBe(1)
  expect(rectsOverlap(a, { minStrip: 1, maxStrip: 2, minColumn: 1, maxColumn: 2 })).toBe(true)
  expect(rectsOverlap(a, { minStrip: 0, maxStrip: 1, minColumn: 2, maxColumn: 3 })).toBe(false)
  // A diagonal neighbour is as much in the way as an orthogonal one.
  expect(freeHolesBetween(a, { minStrip: 3, maxStrip: 4, minColumn: 3, maxColumn: 4 })).toBe(1)
  expect(spanHoles({ strip: 1, column: 2 }, { strip: 4, column: 2 }).length).toBe(4)

  const rigid: PartArea = {
    ref: "RV1",
    rigid: true,
    rect: { minStrip: 0, maxStrip: 2, minColumn: 0, maxColumn: 2 },
    leads: [{ strip: 0, column: 0 }],
  }
  const formable: PartArea = {
    ref: "R1",
    rigid: false,
    rect: { minStrip: 1, maxStrip: 1, minColumn: 1, maxColumn: 1 },
    leads: [{ strip: 1, column: 1 }],
  }
  expect(routedUnderRigid(formable, [rigid])?.host, "a lead inside a rigid area is caught").toBe(
    "RV1",
  )
  expect(routedUnderRigid(rigid, [formable])?.host, "and so is the reverse order").toBe("RV1")
  expect(comfortOf(formable.rect, [rigid])).toBe("crowded")
  expect(comfortOf({ minStrip: 3, maxStrip: 3, minColumn: 0, maxColumn: 0 }, [rigid])).toBe(
    "touching",
  )
  expect(comfortOf({ minStrip: 4, maxStrip: 4, minColumn: 0, maxColumn: 0 }, [rigid])).toBe("roomy")
})
