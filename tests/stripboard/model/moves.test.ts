/**
 * THE MOVE GENERATOR: what it proposes, what it refuses to propose, and the one
 * claim this task exists to establish - **that a part moved and the wire that
 * re-joins its net arrive as ONE candidate.**
 *
 * **THE BRIEF'S SNIPPET NAMED SIX HELPERS THAT DID NOT EXIST**
 * (`padContiguousOnOneStrip`, `reference`, `spans`, `patterns`, `weights`,
 * `movedRefs`). The first and the last are now real, in `./moves-fixtures.ts`,
 * with `reference` folded into the fixture it belongs to so a board and the nets
 * it is read against cannot be mismatched. The middle three were already here:
 * `spans` is `RECORDED_SPANS`, `patterns` is `PIN_PATTERNS` and `weights` is
 * `WEIGHTS`, all from `./seed-fixtures.ts` and `lib/kicad/`, so nothing in this
 * file states a weight or a span of its own.
 *
 * **EVERY LOOP THAT ASSERTS A PROPERTY OVER A FILTERED SET FIRST ASSERTS THE SET
 * IS NOT EMPTY, and one of them counts what it examined out loud.** A predicate
 * that cannot fire is the defect this plan has now caught three times -
 * `freeHolesBetween`'s off-by-one, the unreachable same-net cut guard, and the
 * comfort tier that could never rank below `roomy` - so a `for` loop over an
 * empty list is treated here as a failing test rather than a passing one.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { holesOverlap, type Candidate, type Placement } from "../../../lib/stripboard/board.ts"
import { derivedCuts, holeKey, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { movesFrom, partAreasOf } from "../../../lib/stripboard/moves.ts"
import { objectiveOf } from "../../../lib/stripboard/score.ts"
import { holeInRect, routedUnderRigid } from "../../../lib/stripboard/seed-area.ts"
import { RECORDED_SPANS, WEIGHTS, refusalFrom } from "./seed-fixtures.ts"
import {
  movedRefs,
  noColumnLeftToJoinIn,
  padContiguousOnOneStrip,
  partFittedWithNothing,
  pinPrint,
  trimmerBesideAResistor,
  twoNetsShareStripZero,
} from "./moves-fixtures.ts"

/** `F` for one board, from the owner's recorded weights and nothing else. */
function costOf(candidate: Candidate, reference: ReferenceNets): number {
  return objectiveOf(candidate, derivedCuts(candidate, reference), WEIGHTS)
}

function sound(candidate: Candidate, reference: ReferenceNets): boolean {
  return violationsOf(candidate, derivedCuts(candidate, reference), reference).length === 0
}

function moves(fixture: { base: Candidate; reference: ReferenceNets }): readonly Candidate[] {
  return movesFrom(fixture.base, fixture.reference, RECORDED_SPANS, PIN_PATTERNS)
}

/** One board as a string, so two generator runs can be compared directly. */
function print(candidate: Candidate): string {
  return [
    `${candidate.grid.strips}x${candidate.grid.columns}`,
    ...candidate.placements.map((placement) => `${placement.ref}[${pinPrint(placement)}]`),
    ...candidate.wires.map(
      (wire) => `W ${wire.net} ${holeKey(wire.from)}-${holeKey(wire.to)}`,
    ),
    ...candidate.bridges.map(
      (bridge) => `B ${bridge.net} ${bridge.strips[0]}/${bridge.strips[1]}@${bridge.column}`,
    ),
  ].join(" | ")
}

/** Every pin pair's offset, which a rigid translation leaves untouched. */
function spanPrint(placement: Placement): string {
  const pins = [...placement.pins].sort(([a], [b]) => a.localeCompare(b))
  const first = pins[0]
  if (first === undefined) throw new Error(`"${placement.ref}" has no pins`)
  return pins
    .map(([pin, hole]) => `${pin}:${hole.strip - first[1].strip},${hole.column - first[1].column}`)
    .join(" ")
}

test("a move that only pays once its wire exists is proposed as ONE candidate", () => {
  const { base, reference } = padContiguousOnOneStrip()
  expect(costOf(base, reference), "the base is at the objective's floor").toBe(0)
  const proposals = movesFrom(base, reference, RECORDED_SPANS, PIN_PATTERNS)

  // A candidate that both relocated a part AND added a wire, relative to base.
  const compound = proposals.filter(
    (next) => next.wires.length > base.wires.length && movedRefs(base, next).length > 0,
  )
  expect(compound.length, "move-and-wire is proposed as one candidate").toBeGreaterThan(0)

  // AND THE RELOCATION ALONE DOES NOT PAY - which is exactly why the old search
  // never found it. Build the same move WITHOUT its wire and score both.
  //
  // **THIS ASSERTION IS NOT FALSIFIABLE ON THIS FIXTURE AND IS KEPT ANYWAY.**
  // The base is asserted above to cost 0, and `F = C + rho_w*W + rho_s*B` is a
  // sum of non-negative terms, so the inequality reduces to `x >= 0` and no
  // generator could fail it. It is the brief's own assertion and it states the
  // shape of the claim, so it stays - but the weight is carried by the two
  // tests that follow: `the wire is load bearing`, which fails if the wire can
  // be stripped without opening a net, and `a compound move reaches a board
  // strictly cheaper than a base that has a cut`, which fails if no compound
  // proposal improves on a board that is not already at the cut term's floor.
  // Why the inequality cannot be made falsifiable HERE rather than being moved:
  // a wire only ever ADDS contacts, contacts only ever split a strip's runs
  // further, so `C` never falls when a wire is added - which means on a base
  // that already carries cuts a relocation can pay off on its own, and the
  // inequality is then false of a perfectly good compound move.
  for (const next of compound) {
    const withoutWire = { ...next, wires: base.wires }
    expect(
      costOf(withoutWire, reference),
      "the relocation alone is no better than the base",
    ).toBeGreaterThanOrEqual(costOf(base, reference))
  }
})

test("the wire is load bearing: the same relocation without it leaves a net open", () => {
  const { base, reference } = padContiguousOnOneStrip()
  expect(base.wires.length, "so stripping the wires IS the relocation alone").toBe(0)
  const compound = moves({ base, reference }).filter(
    (next) =>
      next.wires.length > base.wires.length &&
      movedRefs(base, next).length > 0 &&
      sound(next, reference),
  )
  expect(compound.length, "a sound move-and-wire candidate exists").toBeGreaterThan(0)
  for (const next of compound) {
    const withoutWire = { ...next, wires: base.wires }
    const violations = violationsOf(withoutWire, derivedCuts(withoutWire, reference), reference)
    expect(
      violations.map((violation) => violation.kind),
      "without its wire the same relocation is unsound",
    ).toContain("open")
  }
})

test("a compound move reaches a board strictly cheaper than a base that has a cut", () => {
  const { base, reference } = twoNetsShareStripZero()
  expect(derivedCuts(base, reference).length, "the base needs one cut").toBe(1)
  expect(sound(base, reference), "and the base is sound as it stands").toBe(true)

  const better = moves({ base, reference }).filter(
    (next) =>
      next.wires.length > base.wires.length &&
      movedRefs(base, next).length > 0 &&
      sound(next, reference) &&
      costOf(next, reference) < costOf(base, reference),
  )
  expect(
    better.length,
    "a sound move-and-wire candidate is strictly cheaper than the base",
  ).toBeGreaterThan(0)

  // THE HALFWAY STATE IS INADMISSIBLE, which is the whole claim: a search that
  // could only change one thing at a time would have had to hold this board,
  // and no acceptance rule would have let it.
  for (const next of better) {
    const withoutWire = { ...next, wires: base.wires }
    expect(
      violationsOf(withoutWire, derivedCuts(withoutWire, reference), reference).length,
      "the relocation on its own does not realise the netlist",
    ).toBeGreaterThan(0)
  }
})

test("nothing is proposed that routes a lead under a rigid part", () => {
  const { base, reference } = trimmerBesideAResistor()
  const areas = partAreasOf(base, RECORDED_SPANS, PIN_PATTERNS)
  const trimmer = areas.find((area) => area.ref === "RV1")
  if (trimmer === undefined) throw new Error("the fixture lost its trimmer")
  expect(trimmer.rigid, "the trimmer is the rigid part").toBe(true)

  const proposals = moves({ base, reference })
  expect(
    proposals.some((next) => movedRefs(base, next).includes("R1")),
    "the resistor is moved by some proposal, so the exclusion below is not vacuous",
  ).toBe(true)

  // EVERY POSITION THE RULE MUST HAVE EXCLUDED, enumerated independently of the
  // generator: the resistor translated so that a lead lands in one of the nine
  // EMPTY holes inside the trimmer's area. Free holes, on the stock, and
  // forbidden only by the owner's rule.
  const resistor = base.placements.find((placement) => placement.ref === "R1")
  if (resistor === undefined) throw new Error("the fixture lost its resistor")
  const taken = new Set(
    base.placements
      .filter((placement) => placement.ref !== "R1")
      .flatMap((placement) => placement.holes.map(holeKey)),
  )
  const underRigid = new Set<string>()
  for (let strip = -base.grid.strips; strip < base.grid.strips; strip += 1) {
    for (let column = -base.grid.columns; column < base.grid.columns; column += 1) {
      const holes = resistor.holes.map((hole) => ({
        strip: hole.strip + strip,
        column: hole.column + column,
      }))
      const onStock = holes.every(
        (hole) =>
          hole.strip >= 0 &&
          hole.column >= 0 &&
          hole.strip < base.grid.strips &&
          hole.column < base.grid.columns,
      )
      if (!onStock) continue
      if (holes.some((hole) => taken.has(holeKey(hole)))) continue
      if (!holes.some((hole) => holeInRect(hole, trimmer.rect))) continue
      underRigid.add(holes.map((hole) => holeKey(hole)).sort().join(" "))
    }
  }
  expect(underRigid.size, "the rule had something to exclude").toBeGreaterThan(0)

  let checked = 0
  for (const next of proposals) {
    const moved = next.placements.find((placement) => placement.ref === "R1")
    if (moved === undefined) throw new Error("a proposal dropped the resistor")
    checked += 1
    expect(
      underRigid.has(moved.holes.map(holeKey).sort().join(" ")),
      "no proposal puts the resistor's lead inside the trimmer's area",
    ).toBe(false)
  }
  expect(checked, "every proposal was checked").toBe(proposals.length)

  // And the rule holds over the finished boards too, in both directions - a
  // lead under a rigid part, and a rigid part moved over a lead.
  for (const next of proposals) {
    const placed = partAreasOf(next, RECORDED_SPANS, PIN_PATTERNS)
    for (const area of placed) {
      expect(routedUnderRigid(area, placed.filter((other) => other !== area))).toBeNull()
    }
  }
})

test("proposals are not ranked, filtered by cost, or sorted", () => {
  const { base, reference } = padContiguousOnOneStrip()
  const proposals = moves({ base, reference })
  const costs = proposals.map((next) => costOf(next, reference))
  expect(costs.length).toBeGreaterThan(1)
  expect(
    costs.some((cost, index) => index > 0 && cost < (costs[index - 1] ?? cost)),
    "the list is not in ascending cost order",
  ).toBe(true)
  expect(
    costs.some((cost) => cost > costOf(base, reference)),
    "candidates worse than the base are proposed rather than withheld",
  ).toBe(true)
  expect(
    proposals.some((next) => !sound(next, reference)),
    "unsound candidates are proposed too - violationsOf is the caller's to run",
  ).toBe(true)
})

test("two runs over one base propose the same boards in the same order", () => {
  const fixture = padContiguousOnOneStrip()
  expect(moves(fixture).map(print)).toEqual(moves(fixture).map(print))
})

test("every proposal is a board: one lead per hole, on the stock, at an unchanged span", () => {
  const { base, reference } = padContiguousOnOneStrip()
  const proposals = moves({ base, reference })
  expect(proposals.length).toBeGreaterThan(0)
  const spans = new Map(base.placements.map((placement) => [placement.ref, spanPrint(placement)]))
  for (const next of proposals) {
    expect(holesOverlap(next), "two parts claim one hole").toBeNull()
    expect(movedRefs(base, next).length, "one part moves per proposal").toBe(1)
    expect(next.placements.map((placement) => placement.ref)).toEqual(
      base.placements.map((placement) => placement.ref),
    )
    for (const placement of next.placements) {
      const before = spans.get(placement.ref)
      if (before === undefined) throw new Error(`"${placement.ref}" is not on the base board`)
      expect(spanPrint(placement), `"${placement.ref}" was stretched, not translated`).toBe(before)
      for (const hole of placement.holes) {
        expect(hole.strip).toBeGreaterThanOrEqual(0)
        expect(hole.column).toBeGreaterThanOrEqual(0)
        expect(hole.strip).toBeLessThan(next.grid.strips)
        expect(hole.column).toBeLessThan(next.grid.columns)
      }
    }
    // The cut derivation refuses an off-grid contact and a hole holding two
    // nets, so deriving cuts at all is the rest of the claim.
    expect(() => derivedCuts(next, reference)).not.toThrow()
  }
})

test("a relocation whose join has nowhere to run is not proposed", () => {
  const { base, reference } = noColumnLeftToJoinIn()
  const proposals = moves({ base, reference })
  expect(proposals.length, "the fixture is not simply barren").toBeGreaterThan(0)

  // R1 one strip up: both holes it needs are empty, no rigid part is anywhere
  // near, and NET_A's two strips then have no column with a free hole on both.
  const blocked = "1@1,0 2@5,0"
  const takenByOthers = new Set(
    base.placements.flatMap((placement) =>
      placement.ref === "R1" ? [] : placement.holes.map(holeKey),
    ),
  )
  expect(takenByOthers.has("1,0"), "no other part holds the hole it would move to").toBe(false)
  expect(takenByOthers.has("5,0"), "nor the other one, so the move is not blocked by a lead").toBe(
    false,
  )
  const at = proposals
    .map((next) => next.placements.find((placement) => placement.ref === "R1"))
    .map((placement) => (placement === undefined ? "" : pinPrint(placement)))
  expect(at, "R1 is proposed somewhere, so the check below is not vacuous").toContain("1@1,1 2@5,1")
  expect(at, "but not where its join could not be run").not.toContain(blocked)
})

test("a part fitted with nothing refuses by name", () => {
  const { base, reference } = partFittedWithNothing()
  const message = refusalFrom(() => movesFrom(base, reference, RECORDED_SPANS, PIN_PATTERNS))
  expect(message).toContain("stripboard-moves-")
  expect(message).toContain("a fixture placement, fitted with no part")
  expect(message).toContain("movesFrom")
})

test("a board with no parts on it refuses rather than returning no moves", () => {
  const { base, reference } = padContiguousOnOneStrip()
  const empty = { ...base, placements: [] }
  const message = refusalFrom(() => movesFrom(empty, reference, RECORDED_SPANS, PIN_PATTERNS))
  expect(message).toContain("stripboard-moves-no-placements")
})
