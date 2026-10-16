/**
 * THE OFF-BOARD LANDING PAD: the kind a panel-mounted control reaches the board
 * as, and the refusals that keep it from swallowing missing data.
 *
 * **IT IS A SEPARATE FILE BECAUSE `./seed-room.test.ts` IS ALREADY OVER THE LINE
 * CEILING** (759 lines), and because the predicate this file exercises is one
 * thing: a component's DECLARED residency. The positive and the negative below
 * are the two halves of that one predicate, which is why they sit together.
 *
 * **WHAT THESE ASSERTIONS ESTABLISH.** That a ref the caller declares off-board
 * becomes one one-hole placement per terminal, carrying the same footprint
 * sentinel the IMPORT path records (`OFF_BOARD_TERMINAL`, so
 * `tools/stripboard/vero-export.ts` round-trips a constructed pad exactly as it
 * round-trips an imported one); that several terminals of one control are
 * several placements sharing one ref, which is what the importer produces and
 * what lets a move relocate one pad without the others; and that three distinct
 * pieces of malformed input refuse by name rather than becoming plausible pads.
 *
 * **WHAT THEY DO NOT ESTABLISH.** Nothing here asserts a score, a column or a
 * comfort tier: where along its net's home strip a pad lands is
 * `chooseColumn`'s, it is asserted nowhere in this suite, and a test here
 * pinning it would be this task grading its own output. Nor does anything here
 * say a board carrying pads is buildable - `violationsOf` runs inside
 * `seedsFrom` and says only that the copper realises the netlist.
 *
 * **THE NEGATIVE IS THE POINT OF THE FILE.** A missing footprint means either
 * "panel-mounted, represented by landing pads" or "the physicalization data is
 * wrong or absent", and the whole design of this kind is that those two never
 * become the same thing. So the refusal is asserted with a NON-EMPTY
 * declaration that names a different ref, not only with an absent one: a
 * predicate that fires on "the declaration is empty" rather than on "this ref
 * is not in it" would pass the weaker test and lose the distinction.
 */
import { expect, test } from "bun:test"
import { OFF_BOARD_TERMINAL, type Hole, type Placement } from "../../../lib/stripboard/board.ts"
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { seedPartsFrom } from "../../../lib/stripboard/seed-parts.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import {
  RECORDED_SPANS,
  STOCK,
  netlistOf,
  offBoard,
  ordering,
  refusalFrom,
  twoLead,
} from "./seed-fixtures.ts"

/** The recorded tables, which is what a real circuit's parts are read out of. */
const GEOMETRY = { patterns: PIN_PATTERNS, spans: LEAD_SPANS }

/** A fitted footprint for the fixtures that need one; never placed. */
const PAIR = "SYNTHETIC:Seed_Pair"

/** The one hole a placement occupies, or a failure naming the placement. */
function onlyHole(placement: Placement): Hole {
  const holes = [...placement.pins.values()]
  const only = holes[0]
  if (holes.length !== 1 || only === undefined) {
    throw new Error(
      `"${placement.ref}" occupies ${holes.length} holes and a landing pad is one hole`,
    )
  }
  return only
}

test("a declared off-board control becomes a one-hole terminal", () => {
  const netlist = netlistOf([offBoard("RV_LO_BOOST", { pin: "2", net: "LO_BOOST_W" })])
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [ordering("p", ["LO_BOOST_W"], 1)])[0]
  if (seed === undefined) throw new Error("no seed built")
  const pad = seed.placements.find((placement) => placement.ref === "RV_LO_BOOST")
  if (pad === undefined) throw new Error("the pad was not placed")
  expect(pad.pins.size, "one hole").toBe(1)
  expect(pad.holes.length, "and it occupies only that hole").toBe(1)
  expect(pad.footprint, "the importer's own sentinel, not a library name").toBe(OFF_BOARD_TERMINAL)
  const hole = pad.pins.get("2")
  if (hole === undefined) throw new Error("pin 2 is in no hole")
  expect(hole.strip, "on the strip hosting its own net").toBe(0)
})

test("a ref with no footprint and no off-board declaration still refuses by name", () => {
  const nets = new Map([["A", ["RV_LO_BOOST.1", "RV_LO_BOOST.2"]]])
  expect(refusalFrom(() => seedPartsFrom(nets, new Map(), GEOMETRY))).toStartWith(
    "stripboard-seed-parts-no-footprint",
  )
  // The same ref, with a declaration that is NOT empty and does not name it.
  const message = refusalFrom(() =>
    seedPartsFrom(nets, new Map(), GEOMETRY, new Set(["SW_LO_BOOST"])),
  )
  expect(message).toStartWith("stripboard-seed-parts-no-footprint")
  expect(message, "it names the declaration as the other way out").toContain("off-board")
})

test("a declared three-terminal control becomes three pads sharing one ref", () => {
  const nets = new Map([
    ["LO_BOOST_CCW", ["RV_LO_BOOST.1"]],
    ["LO_BOOST_W", ["RV_LO_BOOST.2"]],
    ["LO_BOOST_CW", ["RV_LO_BOOST.3"]],
  ])
  const netlist = seedPartsFrom(nets, new Map(), GEOMETRY, new Set(["RV_LO_BOOST"]))
  expect(netlist.parts.length, "one entry per terminal").toBe(3)
  for (const part of netlist.parts) {
    expect(part.kind, `${part.ref} is a landing pad`).toBe("off-board")
  }
  const seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [
    ordering("pot", [...nets.keys()], 1),
  ])[0]
  if (seed === undefined) throw new Error("no seed built")
  expect(seed.placements.length, "three placements, not one part with three pins").toBe(3)
  for (const placement of seed.placements) {
    expect(placement.ref, "all three share the control's ref").toBe("RV_LO_BOOST")
    expect(placement.footprint).toBe(OFF_BOARD_TERMINAL)
  }
  const strips = seed.placements.map((placement) => onlyHole(placement).strip)
  expect(new Set(strips).size, "each pad on its own net's home strip").toBe(3)
})

test("a ref both declared off-board and fitted with a footprint refuses by name", () => {
  const nets = new Map([["A", ["RV_LO_BOOST.1", "RV_LO_BOOST.2"]]])
  const message = refusalFrom(() =>
    seedPartsFrom(nets, new Map([["RV_LO_BOOST", PAIR]]), GEOMETRY, new Set(["RV_LO_BOOST"])),
  )
  expect(message).toStartWith("stripboard-seed-parts-residency-disagrees")
  expect(message, "it names both claims").toContain(PAIR)
})

test("two entries for one ref are admitted only as DISTINCT pads", () => {
  const twice = netlistOf([
    offBoard("RV_LO_BOOST", { pin: "2", net: "W" }),
    offBoard("RV_LO_BOOST", { pin: "2", net: "W" }),
  ])
  expect(
    refusalFrom(() => seedsFrom(twice, STOCK, RECORDED_SPANS, [ordering("w", ["W"], 1)])),
  ).toStartWith("stripboard-seed-repeated-pad")

  const mixed = netlistOf([
    offBoard("RV_LO_BOOST", { pin: "2", net: "W" }),
    twoLead("RV_LO_BOOST", PAIR, ["1", "W"], ["3", "X"]),
  ])
  expect(
    refusalFrom(() => seedsFrom(mixed, STOCK, RECORDED_SPANS, [ordering("wx", ["W", "X"], 1)])),
  ).toStartWith("stripboard-seed-repeated-ref")
})
