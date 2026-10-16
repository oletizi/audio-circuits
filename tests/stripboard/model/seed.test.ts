/**
 * What `seedsFrom` produces, what it refuses, and what these assertions do NOT
 * establish.
 *
 * **WHAT THEY ESTABLISH.** That a feasible net-to-strip assignment yields a
 * candidate whose leads are on the strips hosting their nets; that an infeasible
 * one refuses by name, naming the part and both its nets; that several orderings
 * yield several distinct candidates, returned in the order they were handed in
 * with nothing ranked or filtered; that sixteen refusals fire, each on its own
 * leading key; and that on the owner's own `transistor-preamp-feedback` circuit
 * every seed holds `violationsOf` empty - every net whole in one copper
 * component, no component carrying two nets - over the cuts `derivedCuts`
 * derives for it.
 *
 * **WHAT THEY DO NOT ESTABLISH, stated because a predicate that is too
 * permissive is exactly what mutation testing cannot catch** (the lesson Tasks 4
 * and 5 both recorded):
 *
 *   - **nothing here asserts a score.** `F` is reported in this task's report
 *     and is deliberately not an assertion: the benchmark gate is Task 10's, its
 *     threshold is the hand result and is fixed data, and a test here comparing
 *     against a number would be this task grading its own output. The figures
 *     are printed in the report with the orderings that produced them;
 *   - the soundness assertion is over the ONE circuit a hand-built board exists
 *     for. It is real evidence - 11 nets, 16 parts, 37 leads - and it is one
 *     circuit, not a property proof. A second circuit (`buffered`) is measured
 *     in the report and is not asserted here, because every ordering this file
 *     could derive for it refuses, and asserting a refusal count would pin a
 *     figure that a better ordering should move;
 *   - **`violationsOf` returning nothing does not say the board is buildable.**
 *     It says the copper realises the netlist. Lead reach is checked by
 *     construction and asserted below on the one part whose band bites; the
 *     other hard constraints are the grader's and are not run here;
 *   - **the refusal tests assert the leading key and the facts the message must
 *     carry, not its prose.** A message rewritten keeps passing, which is
 *     intended; a message that stops naming the part or a net does not;
 *   - **four of the twenty refusal keys the four modules behind `seedsFrom`
 *     carry are NOT asserted here** (`seed.ts` 5, `seed-place.ts` 2,
 *     `seed-model.ts` 6, `seed-validate.ts` 7, counted rather than remembered),
 *     **and they are named rather than left for a reader to count.** One is
 *     asserted elsewhere:
 *     `stripboard-seed-repeated-pad` is a fact about the off-board kind and is
 *     driven by `./seed-off-board.test.ts`, beside the positive case it is the
 *     negative of. The other three are
 *     `stripboard-seed-net-has-no-home`, `stripboard-seed-holes-shared` and
 *     `stripboard-seed-unsound`. All three are internal-defect guards -
 *     reachable only if `homeStripsFor`'s own ordering check, or the placer's
 *     hole set, or its interleaving rejection has a bug - so there is no well-formed
 *     call that fires them, and a fixture that forced one would be testing a
 *     board this module cannot construct. The last two are the self-check
 *     `seedsFrom` runs on every seed it returns, so they execute on every test
 *     below; what is untested is their refusal branch, not the check.
 */
import { expect, test } from "bun:test"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { derivedCuts } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import { leadsOf } from "../../../lib/stripboard/seed-model.ts"
import { validateNetlist } from "../../../lib/stripboard/seed-validate.ts"
import type { SeedPart } from "../../../lib/stripboard/seed-model.ts"
import {
  RECORDED_SPANS,
  STOCK,
  derivedOrderings,
  feedbackNetlist,
  fixedField,
  netlistOf,
  ordering,
  refusalFrom,
  syntheticSpan,
  twoLead,
} from "./seed-fixtures.ts"

/** A two-lead fixture part that reaches 2 to 6 holes. */
const WIDE = "SYNTHETIC:Seed_TwoLead_Wide"
/** A three-terminal fixture part whose row is three holes long. */
const TRIPLE = "SYNTHETIC:Seed_Triple_Row"
/** A two-lead fixture part that reaches 2 to 4 holes and no further. */
const NARROW = "SYNTHETIC:Seed_TwoLead_Narrow"
/** A two-lead fixture part fixed at exactly 4 holes, so its two strips are three apart. */
const FAR_PAIR = "SYNTHETIC:Seed_TwoLead_Far"
/** A three-terminal fixture part whose outer pins are three steps apart. */
const SPREAD_TRIPLE = "SYNTHETIC:Seed_Triple_Spread"
/** A two-row fixture footprint, for a field whose pins share an `alongSteps`. */
const SYNTHETIC_TWO_ROW = "SYNTHETIC:Seed_TwoRow"

const SPANS = new Map([
  [WIDE, syntheticSpan(WIDE, 2, 6)],
  [TRIPLE, syntheticSpan(TRIPLE, 3, 3)],
  [NARROW, syntheticSpan(NARROW, 2, 4)],
  [FAR_PAIR, syntheticSpan(FAR_PAIR, 4, 4)],
  [SPREAD_TRIPLE, syntheticSpan(SPREAD_TRIPLE, 4, 4)],
])

const SMALL = { strips: 8, columns: 8 } as const

function holeOf(candidate: Candidate, ref: string, pin: string): string {
  const placement = candidate.placements.find((entry) => entry.ref === ref)
  expect(placement, `"${ref}" is placed`).toBeDefined()
  const hole = placement?.pins.get(pin)
  expect(hole, `"${ref}.${pin}" has a hole`).toBeDefined()
  return `${hole?.strip},${hole?.column}`
}

function onlySeed(part: readonly SeedPart[], nets: readonly string[], stride: number): Candidate {
  const netlist = netlistOf(part)
  const seeds = seedsFrom(netlist, SMALL, SPANS, [ordering("fixture", nets, stride)])
  const seed = seeds[0]
  expect(seeds.length, "one ordering yields one seed").toBe(1)
  if (seed === undefined) throw new Error("unreachable: the length was just asserted")
  expect(violationsOf(seed, derivedCuts(seed, netlist.nets), netlist.nets)).toEqual([])
  return seed
}

test("a feasible assignment puts each lead on the strip hosting its own net", () => {
  const seed = onlySeed([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])], ["A", "B"], 1)
  expect(holeOf(seed, "R1", "1"), "lead 1 is on A's strip").toBe("0,0")
  expect(holeOf(seed, "R1", "2"), "lead 2 is on B's strip").toBe("1,0")
  expect(seed.wires, "a reachable pair needs no wire").toEqual([])
  expect(seed.bridges, "nor a bridge").toEqual([])
  expect(derivedCuts(seed, netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])]).nets)).toEqual(
    [],
  )
})

test("a stride the span can cross is used directly, and one it cannot is wired", () => {
  const reachable = onlySeed([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])], ["A", "B"], 5)
  // Homes at 0 and 5: a span of 6 holes, exactly this fixture's ceiling.
  expect(holeOf(reachable, "R1", "2")).toBe("5,0")
  expect(reachable.wires, "at the ceiling the pair still reaches").toEqual([])

  // Three nets at stride 3 - homes 0, 3, 6 - and a narrow part that reaches four
  // holes. R2 has to get from A to C, seven holes apart, so its stray lead takes
  // the nearest free scratch strip within reach (2, because 3 is B's home) and
  // the wire that makes C whole runs from there to C's own strip.
  const wired = onlySeed(
    [
      twoLead("R1", NARROW, ["1", "A"], ["2", "B"]),
      twoLead("R2", NARROW, ["1", "A"], ["2", "C"]),
      twoLead("R3", NARROW, ["1", "B"], ["2", "C"]),
    ],
    ["A", "B", "C"],
    3,
  )
  expect(holeOf(wired, "R2", "2").split(",")[0], "the stray lead is on strip 2").toBe("2")
  expect(wired.wires.length, "the lead that cannot reach is wired").toBe(1)
  expect(wired.wires[0]?.net).toBe("C")
  expect(wired.wires[0]?.from.strip).toBe(2)
  expect(wired.wires[0]?.to.strip).toBe(6)
  expect(wired.bridges, "a wire and not a bridge, because the gap is four strips").toEqual([])
})

test("a stray lead one strip from its own net's home is joined by a bridge, not a wire", () => {
  // A three-terminal part whose outer pins are two holes apart and whose middle
  // pin shares a net with one of them - a trimmer wired as a rheostat, which is
  // what all four trimmers on the owner's own board are. At stride 2 the outer
  // pins land on both home strips and the middle one on the spare strip between,
  // one away from the net it is tied to.
  const seed = onlySeed(
    [
      fixedField("RV1", TRIPLE, [
        { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
        { pin: "2", net: "B", alongSteps: 1, acrossSteps: 2 },
        { pin: "3", net: "B", alongSteps: 2, acrossSteps: 0 },
      ]),
    ],
    ["A", "B"],
    2,
  )
  expect(holeOf(seed, "RV1", "1"), "pin 1 is on A's strip").toBe("0,2")
  expect(holeOf(seed, "RV1", "3"), "pin 3 is on B's strip").toBe("2,2")
  expect(holeOf(seed, "RV1", "2"), "pin 2 is on the spare strip between them").toBe("1,0")
  expect(seed.bridges.length, "and is joined to its net by one bridge").toBe(1)
  expect(seed.bridges[0]?.strips).toEqual([1, 2])
  expect(seed.bridges[0]?.net).toBe("B")
  expect(seed.wires, "a bridge, not a wire, because the strips are adjacent").toEqual([])
})

test("an infeasible assignment refuses, naming the part and BOTH of its nets", () => {
  // A pair fixed at FOUR holes needs its two strips three apart. Three nets fill
  // a three-strip board, IN and GND are two apart, and no strip on the stock is
  // three from either of their homes - so the stray lead has nowhere to go in
  // EITHER tier and the band is not met anywhere.
  //
  // **THE OLD FIXTURE REFUSED FOR A REASON THAT NO LONGER EXISTS**, and it is
  // recorded rather than quietly replaced: it used a pair fixed at TWO holes,
  // which left the one strip between IN and GND reachable, and relied on *"the
  // only strip between them is MID's home - which a lead of another net may
  // never land on."* After the 2026-10-15 relaxation a lead MAY land there, so
  // that board now builds with a cut in it. What closes a placement off is now
  // reach and interleaving; the interleaving half is asserted in
  // `./seed-shared-strip.test.ts`, and this test keeps the reach half.
  const netlist = netlistOf([
    twoLead("J1", FAR_PAIR, ["1", "IN"], ["2", "GND"]),
    twoLead("R1", WIDE, ["1", "MID"], ["2", "GND"]),
  ])
  const message = refusalFrom(() =>
    seedsFrom(netlist, { strips: 3, columns: 8 }, SPANS, [
      ordering("too tight", ["IN", "MID", "GND"], 1),
    ]),
  )
  expect(message).toStartWith("stripboard-seed-leads-cannot-reach")
  expect(message, "it names the part").toContain('"J1"')
  expect(message, "it names the first net").toContain('"IN"')
  expect(message, "it names the second net").toContain('"GND"')
  expect(message, "it names the footprint").toContain(FAR_PAIR)
  expect(message, "it names the band that was not met").toContain("[4, 4]")
})

test("a moulded field with nowhere to go refuses, naming every terminal and its strip", () => {
  const netlist = netlistOf([
    fixedField("Q1", SPREAD_TRIPLE, [
      { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
      { pin: "2", net: "B", alongSteps: 1, acrossSteps: 0 },
      { pin: "3", net: "C", alongSteps: 3, acrossSteps: 0 },
    ]),
  ])
  // A moulded field whose outer pins are three steps apart needs FOUR holes in
  // whichever axis its pin row is laid along, and this stock is three by three.
  // At `S` and `N` the row lies across the strips, so all six of those windows
  // put a pin off the last strip; at `E` and `W` it lies along one, so all six
  // of those are on a strip that exists and then run off the end of it at every
  // column. The field is never reshaped, so there is nothing else to try.
  //
  // **THE FIXTURE HAS NOW OUTLIVED TWO REASONS FOR REFUSING, and both are
  // recorded rather than quietly replaced.** It began as a three-step field on
  // three strips whose nets were ordered `A, C, B`, refusing because *"every
  // strip is some net's home, so there is no scratch strip at all"* and a pin on
  // another net's home strip was forbidden; after the 2026-10-15 relaxation such
  // a pin is admitted and pays a cut. It was then a field needing four strips on
  // a stock of three, EIGHT columns wide - which refused only while `S` and `N`
  // were the sole facings tried. Task 4 added `E` and `W`, and on eight columns
  // this field now lies happily along one strip, three nets deep with two cuts.
  // So the stock is narrowed to three columns: the point of the fixture is a
  // field with nowhere to go, and after the quarter-turn "nowhere" means neither
  // axis has room rather than just the one.
  const message = refusalFrom(() =>
    seedsFrom(netlist, { strips: 3, columns: 3 }, SPANS, [ordering("packed", ["A", "C", "B"], 1)]),
  )
  expect(message).toStartWith("stripboard-seed-field-cannot-be-seated")
  expect(message, "it names the part").toContain('"Q1"')
  for (const net of ["A", "B", "C"]) expect(message, `it names net ${net}`).toContain(`"${net}"`)
  expect(message, "it says how many windows put every pin on a strip that exists").toContain(
    "6 of the 12 windows",
  )
  expect(message, "and it names the edge the other six ran off").toContain("off the end of a strip")
})

test("several orderings yield several distinct seeds, in the order they were given", () => {
  const parts = [
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
    twoLead("R2", WIDE, ["1", "B"], ["2", "C"]),
  ]
  const netlist = netlistOf(parts)
  const orderings = [
    ordering("abc", ["A", "B", "C"], 1),
    ordering("bca", ["B", "C", "A"], 1),
    ordering("cab", ["C", "A", "B"], 1),
  ]
  const seeds = seedsFrom(netlist, SMALL, SPANS, orderings)
  expect(seeds.length, "one seed per ordering, nothing filtered").toBe(3)
  const signatures = seeds.map((seed) =>
    seed.placements
      .map(
        (placement) =>
          `${placement.ref}:${[...placement.pins]
            .map(([pin, hole]) => `${pin}@${hole.strip},${hole.column}`)
            .join("/")}`,
      )
      .sort()
      .join(" "),
  )
  expect(new Set(signatures).size, "the three are pairwise distinct").toBe(3)
  // The order is the orderings' own: the first seed hosts A on strip 0, the
  // second B and the third C. The COLUMN is not asserted - it is the lowest one
  // free when that part was placed, so it depends on what went down first.
  const stripOf = (index: number, ref: string, pin: string): string => {
    const seed = seeds[index]
    if (seed === undefined) throw new Error("unreachable: the length was just asserted")
    return holeOf(seed, ref, pin).split(",")[0] ?? ""
  }
  expect(stripOf(0, "R1", "1"), "A is hosted on strip 0 under abc").toBe("0")
  expect(stripOf(1, "R2", "1"), "B is hosted on strip 0 under bca").toBe("0")
  expect(stripOf(2, "R2", "2"), "C is hosted on strip 0 under cab").toBe("0")
  for (const seed of seeds) {
    expect(violationsOf(seed, derivedCuts(seed, netlist.nets), netlist.nets)).toEqual([])
  }
})

test("the construction is deterministic: equal inputs give an equal board", () => {
  const parts = [
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
    fixedField("Q1", TRIPLE, [
      { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
      { pin: "2", net: "B", alongSteps: 1, acrossSteps: 0 },
      { pin: "3", net: "C", alongSteps: 2, acrossSteps: 0 },
    ]),
  ]
  const netlist = netlistOf(parts)
  const once = seedsFrom(netlist, SMALL, SPANS, [ordering("abc", ["A", "B", "C"], 1)])
  const twice = seedsFrom(netlist, SMALL, SPANS, [ordering("abc", ["A", "B", "C"], 1)])
  expect(once).toEqual(twice)
})

const FEEDBACK_HAND = { cuts: 5, wires: 4, bridges: 3 } as const

test("every seed for the owner's own feedback circuit realises its netlist", () => {
  const { netlist, nets } = feedbackNetlist()
  expect(nets.size, "the circuit has 11 nets").toBe(11)
  expect(netlist.parts.length, "and 16 parts").toBe(16)
  const leads = netlist.parts.reduce((total, part) => total + leadsOf(part).length, 0)
  // 37, counted: `grep -c '^PIN ' transistor-preamp-feedback.dump` is 37, and
  // the reference export's eleven nets hold 37 pin ids between them. **This
  // plan's ledger records Task 8 as matching "all 38 PIN holes" and that figure
  // is wrong** - 4 capacitors and 4 resistors at two leads, 3 headers at two,
  // and 5 three-terminal parts is 8 + 8 + 6 + 15 = 37.
  expect(leads, "carrying 37 leads between them").toBe(37)

  // Several orderings at several strides. The ones that refuse are reported in
  // the task report rather than asserted: which orderings a circuit admits is a
  // fact about the circuit, and pinning the count here would freeze a figure a
  // better ordering should move.
  const built: Candidate[] = []
  for (const stride of [1, 2, 3]) {
    for (const entry of derivedOrderings(netlist, stride)) {
      let seed: Candidate | undefined
      try {
        seed = seedsFrom(netlist, STOCK, RECORDED_SPANS, [entry])[0]
      } catch (error) {
        expect(
          error instanceof Error ? error.message : String(error),
          `ordering "${entry.name}" either builds or refuses under this module's own key`,
        ).toStartWith("stripboard-seed-")
        continue
      }
      if (seed === undefined) throw new Error("unreachable: seedsFrom returns one per ordering")
      built.push(seed)
      const cuts = derivedCuts(seed, nets)
      expect(
        violationsOf(seed, cuts, nets),
        `ordering "${entry.name}" realises every net and shorts none`,
      ).toEqual([])
      expect(seed.placements.length, `ordering "${entry.name}" places all 16 parts`).toBe(16)
      const holes = seed.placements.flatMap((placement) => [...placement.pins.values()])
      expect(holes.length, `ordering "${entry.name}" seats all 37 leads`).toBe(37)
      expect(
        new Set(holes.map((hole) => `${hole.strip},${hole.column}`)).size,
        `ordering "${entry.name}" puts one lead per hole`,
      ).toBe(37)
      for (const hole of holes) {
        expect(hole.strip, `ordering "${entry.name}" stays on the stock`).toBeLessThan(STOCK.strips)
        expect(hole.column).toBeLessThan(STOCK.columns)
        expect(hole.strip).toBeGreaterThanOrEqual(0)
        expect(hole.column).toBeGreaterThanOrEqual(0)
      }
    }
  }
  expect(built.length, "at least one derived ordering admits this circuit").toBeGreaterThan(0)
})

test("the hand-built board's own figures are what Task 10's gate is against", () => {
  // Counted from tests/fixtures/stripboard/transistor-preamp-feedback.dump:
  // 5 CUT lines, 4 WIRE lines, 3 SOLDER lines. They are FIXED DATA and this
  // test exists so that a later reading of them cannot drift: the gate's
  // threshold is not adjustable by whoever is trying to pass it.
  expect(FEEDBACK_HAND).toEqual({ cuts: 5, wires: 4, bridges: 3 })
})

test("every input refusal fires on its own leading key", () => {
  const netlist = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const good = ordering("abc", ["A", "B"], 1)

  expect(refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, []))).toStartWith(
    "stripboard-seed-no-orderings",
  )
  expect(
    refusalFrom(() => seedsFrom({ nets: new Map(), parts: [] }, SMALL, SPANS, [good])),
  ).toStartWith("stripboard-seed-no-parts")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "B", "Z"], 1)])),
  ).toStartWith("stripboard-seed-ordering-unknown-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A"], 1)])),
  ).toStartWith("stripboard-seed-ordering-missing-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "A", "B"], 1)])),
  ).toStartWith("stripboard-seed-ordering-repeated-net")
  expect(
    refusalFrom(() => seedsFrom(netlist, SMALL, SPANS, [ordering("x", ["A", "B"], 0)])),
  ).toStartWith("stripboard-seed-ordering-stride-not-positive")
  expect(
    refusalFrom(() => seedsFrom(netlist, { strips: 2, columns: 8 }, SPANS, [
      ordering("x", ["A", "B"], 2),
    ])),
  ).toStartWith("stripboard-seed-ordering-off-board")
  expect(refusalFrom(() => seedsFrom(netlist, SMALL, new Map(), [good]))).toStartWith(
    "stripboard-seed-no-span-recorded",
  )
})

test("every netlist refusal fires on its own leading key", () => {
  const good = ordering("abc", ["A", "B"], 1)
  const twice = netlistOf([
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
  ])
  expect(refusalFrom(() => seedsFrom(twice, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-repeated-ref",
  )

  // **THE OLD FIXTURE REFUSED FOR A REASON THAT NO LONGER EXISTS**, recorded
  // rather than quietly dropped: two pins at the same `alongSteps` used to
  // refuse outright under `stripboard-seed-field-shares-a-strip`, on the
  // premise that *"the along axis is laid across the strips...so two pins
  // sharing it would share a strip, and a strip carrying two nets' leads is
  // the interleaved OPEN."* That conflated "shares a strip" with
  // "interleaves" - a correctly quarter-turned DIP puts pin 1 and pin 16 on
  // one strip with a cut down the middle, which is buildable. Whether a
  // placed field's shared strip interleaves is now answered on the PLACED
  // board by `interleavingOn` (lib/stripboard/separable.ts); see
  // "a field with two pins on one strip is no longer refused outright" below
  // for the input-layer half of this.

  const fractional = netlistOf([
    fixedField("Q1", TRIPLE, [
      { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
      { pin: "2", net: "B", alongSteps: 0.5, acrossSteps: 0 },
    ]),
  ])
  expect(refusalFrom(() => seedsFrom(fractional, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-field-off-grid",
  )

  const base = netlistOf([twoLead("R1", WIDE, ["1", "A"], ["2", "B"])])
  const extra = {
    nets: new Map([...base.nets, ["C", ["R9.1"]]]),
    parts: base.parts,
  }
  expect(
    refusalFrom(() => seedsFrom(extra, SMALL, SPANS, [ordering("x", ["A", "B", "C"], 1)])),
  ).toStartWith("stripboard-seed-reference-pin-not-a-part")

  const missing = { nets: new Map([["A", ["R1.1"]], ["B", []]]), parts: base.parts }
  expect(refusalFrom(() => seedsFrom(missing, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-part-pin-not-in-reference",
  )

  const disagreeing = {
    nets: new Map([["A", ["R1.1", "R1.2"]], ["B", []]]),
    parts: base.parts,
  }
  expect(refusalFrom(() => seedsFrom(disagreeing, SMALL, SPANS, [good]))).toStartWith(
    "stripboard-seed-lead-net-disagrees",
  )
})

test("a field with two pins on one strip is no longer refused outright", () => {
  // Two pins of DIFFERENT nets at the same alongSteps - the exact shape
  // `field-shares-a-strip` refused. It is now a placement question, not a
  // field question, so building the netlist must succeed.
  const part = fixedField("U1", SYNTHETIC_TWO_ROW, [
    { pin: "1", net: "A", alongSteps: 0, acrossSteps: 0 },
    { pin: "2", net: "B", alongSteps: 0, acrossSteps: 3 },
  ])
  expect(() => netlistOf([part])).not.toThrow()
  expect(refusalFrom(() => validateNetlist(netlistOf([part])))).toBe("")
})

test("the board edge refuses a join that has no column left", () => {
  // Two holes wide, and two parts that both have to reach from A to B across
  // seven strips - one hole further than this fixture's ceiling. Each puts its
  // stray lead on a scratch strip of its own, filling one of the two columns on
  // each, and the bridge that would make B whole then has no column with both
  // holes free.
  const netlist = netlistOf([
    twoLead("R1", WIDE, ["1", "A"], ["2", "B"]),
    twoLead("R2", WIDE, ["1", "A"], ["2", "B"]),
  ])
  const message = refusalFrom(() =>
    seedsFrom(netlist, { strips: 7, columns: 2 }, SPANS, [ordering("narrow", ["A", "B"], 6)]),
  )
  expect(message).toStartWith("stripboard-seed-no-column-to-join")
  expect(message, "it names the net it could not make whole").toContain('"B"')
  expect(message, "and the stock that ran out").toContain("7 strips of 2 holes")
})
