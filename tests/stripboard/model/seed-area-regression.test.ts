/**
 * THE REGRESSION: a seed built from a real, committed netlist no longer piles
 * its parts into one column band.
 *
 * **WHAT THIS ESTABLISHES.** That every seed `seedsFrom` returns for the
 * `transistor-preamp-feedback` netlist, across many derived orderings and two
 * strides, routes no lead under a rigid part and overlaps no two areas when
 * either is rigid - and still realises the netlist, so the property is not
 * bought by refusing to place anything. A width or a density figure is
 * deliberately NOT asserted: it would be a threshold chosen by the thing
 * being measured.
 *
 * **ONE OF SIX FILES `./seed-room.test.ts` SPLIT INTO** (`docs/known-gaps.md`
 * G6, settled 2026-10-18); see `./seed-room-hand-boards.test.ts` for the
 * other five.
 *
 * **WHAT THIS DOES NOT ESTABLISH: nothing here asserts a width, a density or
 * a score.** The regression assertion is a PROPERTY - no overlap in which
 * either part is rigid - which a 31-strip-by-3-column board that stacks an
 * electrolytic on a trimmer cannot satisfy. A column count would be a
 * threshold of mine. Why it is that property and not the absolute one is
 * argued where it is asserted, below.
 */
import { expect, test } from "bun:test"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { areaRect, type PartArea } from "../../../lib/stripboard/seed-area.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { rigidOverlapPlaces, routedUnderRigidPlaces } from "./area-places.ts"
import { RECORDED_SPANS, STOCK, committedNetlist, derivedOrderings } from "./seed-fixtures.ts"

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

test("THE REGRESSION: a seed no longer piles its parts into one column band", () => {
  // The defect: on a 34 x 27 stock the first version returned a board 31 strips
  // by THREE columns with 37 leads in it, **overlapping an electrolytic with a
  // trimmer** - and a trimmer is rigid, so that is exactly the pair the property
  // below forbids and the ribbon board cannot satisfy it. A width or a density
  // figure is deliberately NOT asserted: it would be a threshold chosen by the
  // thing being measured.
  //
  // **THE ASSERTION IS NARROWED TO RIGID-INVOLVING OVERLAPS, AND THAT IS A
  // DECISION ABOUT AUTHORITY RATHER THAN ABOUT EVIDENCE.** A previous round left
  // it absolute - no two parts' areas overlap at all - and wrote that its
  // justification had lost its evidence, because `feedback` turned out to have
  // two overlapping pairs and `buffered` three, so no-overlap is a property
  // neither built board holds. The owner has since ruled, and the ruling decides
  // it both ways:
  //
  //   - *"Rigid parts are rigid. You cant push them out of the way or rout under
  //     them."* and *"my directives are more authoritative than a file on disk"*
  //     give the rigid cases their justification back. A generated seed is held
  //     to them even though his own boards break them four times;
  //   - *"Resistors, diodes, most capacitors can be jostled out of the way of
  //     each other"* and *"Don't worry about body collisions on the stripboard.
  //     It's extremely flexible."* mean the absolute form asserted something he
  //     never asked for. Nothing authorises it, so it is not asserted: it would
  //     be a criterion authored by the thing being measured.
  //
  // Generated seeds happen to have NO overlap of either kind today. That is a
  // measurement and is deliberately not pinned here - pinning it would forbid a
  // placement the owner permits, and quietly.
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
        rigidOverlappingPairs(areas),
        `ordering "${entry.name}" overlaps no rigid part's area`,
      ).toEqual([])
      expect(
        violationsOf(seed, derivedCuts(seed, nets), nets),
        `ordering "${entry.name}" still realises the netlist`,
      ).toEqual([])
    }
  }
  expect(built, "at least one derived ordering admits this circuit").toBeGreaterThan(0)
})
