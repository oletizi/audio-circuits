/**
 * THE PLACER'S SECONDARY CHOICES: comfort over clustering, and a clear wire
 * route when one exists.
 *
 * **WHAT THESE ESTABLISH.** That when a net's two homes could sit beside an
 * already-placed part sharing both its nets, the construction clears that
 * part's own body margin rather than hugging it - *comfort beats clustering,
 * which is the owner's stated priority*; and that when a wire must join two
 * strips on either side of a rigid part, the column chosen for the join is
 * one that misses the part rather than one that happens to run over it.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18); see `./seed-room-hand-boards.test.ts` for the
 * other five.
 */
import { expect, test } from "bun:test"
import { areaRect, routeOf, type PartArea } from "../../../lib/stripboard/seed-area.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { bodied, fixedField, netlistOf, ordering, syntheticSpan, twoLead } from "./seed-fixtures.ts"

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
