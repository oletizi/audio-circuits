/**
 * FOUR FACINGS FOR A MOULDED PIN FIELD: which way round a part with more than
 * two terminals is laid, and the measured consequence for three real footprints.
 *
 * **WHAT THESE ESTABLISH.** That a part whose pads run down its own y axis - a
 * 1xN pin header, a DIP - is laid with that axis ACROSS the strips, one pad per
 * strip, which before 2026-10-15 could not be expressed at all because only `S`
 * and `N` were tried and both put such a part's every pin on ONE strip; and that
 * a part whose pads run along its x axis - a TO-92 - is still laid the way it
 * already was, so widening the facings did not start laying a part that was
 * already right.
 *
 * **THE NUMBERS ARE MEASURED AND NOT CHOSEN HERE.** How many strips a footprint
 * puts its pads on under each facing is a fact about its recorded pad pattern,
 * and `padHolesFor` is what reads it. The task's own table records the three
 * cases, re-derived from the patterns rather than transcribed:
 *
 * | footprint | pads | strips under S/N | strips under E/W |
 * | --- | --- | --- | --- |
 * | `TO-92_Inline` | 3 | 3 | 1 |
 * | `PinHeader_1x05` | 5 | 1 | 5 |
 * | `DIP-16_W7.62mm` | 16 | 2 | 8 |
 *
 * `lib/stripboard/seed-field.ts`'s preference is for the MOST DISTINCT STRIPS,
 * which is the
 * facing forcing the fewest cuts of the part's own making - so the third column
 * wins for the TO-92 and the fourth for the other two. The assertion in each
 * test is that count and nothing else.
 *
 * **WHAT THEY DO NOT ESTABLISH.** No score, no cut count and no claim that a
 * facing is cheap: `objectiveOf` prices a board and `violationsOf` judges it,
 * and a figure asserted here would be this file inventing a criterion. Where a
 * board's soundness is asserted it is `violationsOf` over `derivedCuts` - the
 * same property `./seed.test.ts` holds every seed to - and not a count of what
 * those cuts are.
 *
 * **THE FIELDS ARE DERIVED, NEVER TRANSCRIBED.** Every netlist below goes
 * through `seedPartsFrom`, so each part's pin field comes from the recorded
 * `PinPattern` by way of `padHolesFor`. A hand-typed step table would be this
 * repository's own named failure - three footprints shipped that did not exist -
 * in a new place, and it would also make the table above unfalsifiable.
 *
 * **ITS OWN FILE** rather than another section of `./seed-room-hand-boards.test.ts`
 * or `./seed-placement-comfort.test.ts` - the files `./seed-room.test.ts` split
 * into (`docs/known-gaps.md` G6) that are about clearance and comfort - or of
 * `./seed-shared-strip.test.ts`, which is about which strip a lead may land on.
 * This one is about which way round a part is turned.
 */
import { expect, test } from "bun:test"
import { derivedCuts, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { seedPartsFrom } from "../../../lib/stripboard/seed-parts.ts"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import type { SeedNetlist } from "../../../lib/stripboard/seed-model.ts"
import { RECORDED_SPANS, STOCK, ordering } from "./seed-fixtures.ts"

const HEADER_1X5 = "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"
const TO92 = "Package_TO_SOT_THT:TO-92_Inline"
const DIP16 = "Package_DIP:DIP-16_W7.62mm"

/**
 * One part of `footprint`, with each of its `pins` on a net of its own.
 *
 * A net per pin is the simplest circuit that makes the question askable: every
 * pin wants a different strip, so a facing that puts two of them on one strip is
 * visible in the strip count rather than hidden behind two pins that share a
 * net anyway.
 */
function onePart(
  ref: string,
  footprint: string,
  pins: readonly string[],
): { readonly netlist: SeedNetlist; readonly nets: ReferenceNets; readonly netNames: string[] } {
  const nets: ReferenceNets = new Map(pins.map((pin) => [`N${pin}`, [`${ref}.${pin}`]]))
  return {
    netlist: seedPartsFrom(nets, new Map([[ref, footprint]])),
    nets,
    netNames: [...nets.keys()],
  }
}

/** How many distinct strips a placed part's pads landed on. */
function stripsUnder(seed: Candidate, ref: string): number {
  const placement = seed.placements.find((entry) => entry.ref === ref)
  if (placement === undefined) throw new Error(`"${ref}" was not placed on this board`)
  return new Set([...placement.pins.values()].map((hole) => hole.strip)).size
}

function onlySeed(netlist: SeedNetlist, nets: readonly string[], name: string): Candidate {
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [ordering(name, nets, 2)])[0]
  if (seed === undefined) throw new Error("no seed built")
  return seed
}

test("a 1x5 header is laid ACROSS the strips, one pin per strip", () => {
  // The case that could not be expressed. `PinHeader_1x05` has all five pads at
  // x = 0 and y = 0..4, so `S` and `N` - which lay the x axis across the strips -
  // put all five on ONE strip, five nets deep. `E` and `W` lay the y axis across
  // them instead, which is one pin per strip and is how a header is mounted.
  const { netlist, netNames } = onePart("J1", HEADER_1X5, ["1", "2", "3", "4", "5"])
  const seed = onlySeed(netlist, netNames, "header")
  expect(stripsUnder(seed, "J1"), "five pins on five strips").toBe(5)
})

test("a TO-92 keeps its three pins on three strips, so the preference did not invert", () => {
  // THE REGRESSION GUARD for the facing preference: widening the facings must
  // not start laying a part that was already right along one strip. `TO-92_Inline`
  // has its three pads at x = 0..2 and y = 0, so `S` and `N` give three strips
  // and `E`/`W` give one - the opposite way round from the header above, out of
  // the same rule.
  const { netlist, netNames } = onePart("Q1", TO92, ["1", "2", "3"])
  const seed = onlySeed(netlist, netNames, "transistor")
  expect(stripsUnder(seed, "Q1"), "three pins on three strips").toBe(3)
})

test("a DIP-16 is laid with its two rows along the strips and its pads across them", () => {
  // The part the quarter-turn was added for. `DIP-16_W7.62mm` has pads at x = 0
  // and x = 3 - its two rows, 7.62mm apart - with y = 0..7 down each row, so
  // `E`/`W` put eight pads on eight strips with pin 1 and pin 16 sharing the
  // first, pin 2 and pin 15 the second, and so on. That is the mounting this
  // repository describes as a DIP "across the strips with a cut down the
  // middle"; the cuts are `derivedCuts`' business and are not counted here.
  const { netlist, nets, netNames } = onePart(
    "U1",
    DIP16,
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"],
  )
  const seed = onlySeed(netlist, netNames, "dip")
  expect(stripsUnder(seed, "U1"), "sixteen pads on eight strips").toBe(8)
  expect(violationsOf(seed, derivedCuts(seed, nets), nets), "and the board is sound").toEqual([])
})
