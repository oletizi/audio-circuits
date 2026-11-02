/**
 * `F = C + rho_w*W + rho_s*B` over a candidate, against hand arithmetic with the
 * COMMITTED weights, and against the absence of one.
 *
 * **EVERY FIGURE BELOW IS ARITHMETIC DONE BY HAND AND NOT RECOMPUTED FROM THE
 * LOADED VALUES.** A test that multiplies the same two numbers the module
 * multiplies asserts that multiplication works. So the weights are read from
 * `stripboard/rules.json` through its own strict loader, the first test holds
 * them to the two quarters the figures were worked out against, and every
 * expectation after it is a literal. If the owner changes a weight, that first
 * test fails by name and the literals here are reworked by hand - which is the
 * intended cost.
 *
 * **ONE SET OF WEIGHTS HERE IS DELIBERATELY NOT THE COMMITTED ONE, AND IT IS NOT
 * A PROPOSAL.** `rho_w` and `rho_s` are both 0.25, so `C + rho_w*W + rho_s*B`
 * and `C + rho_w*(W + B)` give the same number on every board, and an
 * implementation that added the two counts together and priced them once would
 * pass every test written with the committed values. The discriminating test
 * passes two UNEQUAL weights to tell the terms apart; the values it passes price
 * nothing and are not offered as an alternative to PAR1's.
 *
 * **THIS FILE IMPORTS `tools/`, AND THAT IS ALLOWED HERE AND NOT IN THE CORE.**
 * The boundary Task 3 enforces is on `lib/stripboard/`'s import closure, and
 * `tests/stripboard/model/cuts-agree.test.ts` already reaches across it the same
 * way. The weights arrive at `objectiveOf` as a plain value, which is the whole
 * reason its third parameter exists.
 */
import { expect, test } from "bun:test"
import type { Bridge, Candidate, Wire } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type Cut } from "../../../lib/stripboard/cuts.ts"
import { objectiveOf } from "../../../lib/stripboard/score.ts"
import { loadRules } from "../../../tools/stripboard/rules.ts"
import { objectiveOf as objectiveFromLineCounts } from "../../../tools/stripboard/score.ts"
import {
  at,
  bridge,
  bridgeInsideAGap,
  reference,
  twoNetsOnStripThree,
  wire,
  wireOnlyStripTwoNets,
} from "./cuts-fixtures.ts"

/**
 * The owner's reviewed parameter file, read through the loader that refuses a
 * missing or unknown key - handed to `objectiveOf` unchanged, and with no cast.
 * That it type-checks is half of what this file proves.
 */
const COMMITTED = loadRules()

/** The message a call refused with, or "" when it did not refuse. */
function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/**
 * A board carrying the given wires and bridges and nothing else.
 *
 * It has no placements, which is enough because the scorer reads the two list
 * LENGTHS and nothing about where anything is. Where the derived cut count is
 * what is under test the fixtures in `./cuts-fixtures.ts` are used instead, and
 * those are real little boards.
 */
function boardWith(wires: readonly Wire[], bridges: readonly Bridge[]): Candidate {
  return { grid: { strips: 12, columns: 12 }, placements: [], wires, bridges }
}

/** `n` distinct wires, each on its own column, to be counted and not read. */
function wiresNumbering(n: number): readonly Wire[] {
  return Array.from({ length: n }, (_unused, index) => wire(at(0, index), at(1, index), "NET_A"))
}

/** `n` distinct bridges between strips 0 and 1, to be counted and not read. */
function bridgesNumbering(n: number): readonly Bridge[] {
  return Array.from({ length: n }, (_unused, index) => bridge(index, [0, 1], "NET_A"))
}

/** `n` distinct cuts on strip 0, standing in for a derivation's output. */
function cutsNumbering(n: number): readonly Cut[] {
  return Array.from({ length: n }, (_unused, index) => ({ strip: 0, afterColumn: index }))
}

test("the committed weights are the two quarters every figure in this file was worked out against", () => {
  expect(COMMITTED.rhoWire, "rho_w, from stripboard/rules.json").toBe(0.25)
  expect(COMMITTED.rhoSolder, "rho_s, from stripboard/rules.json").toBe(0.25)
})

test("F is the cut count plus a quarter per wire plus a quarter per bridge", () => {
  // 5 + 0.25*2 + 0.25*3 = 5 + 0.5 + 0.75 = 6.25. Every term is a sum of
  // quarters, which binary floating point holds exactly, so this is toBe.
  const candidate = boardWith(wiresNumbering(2), bridgesNumbering(3))
  expect(objectiveOf(candidate, cutsNumbering(5), COMMITTED)).toBe(6.25)
})

test("a board with no wires and no bridges costs exactly its cuts", () => {
  expect(objectiveOf(boardWith([], []), cutsNumbering(3), COMMITTED)).toBe(3)
})

test("one cut costs what four wires cost, and not what five do", () => {
  // PAR1's own statement of what rho_w = 0.25 buys, as arithmetic rather than
  // as prose: the exchange rate is the thing the value was settled for.
  const oneCut = objectiveOf(boardWith([], []), cutsNumbering(1), COMMITTED)
  const fourWires = objectiveOf(boardWith(wiresNumbering(4), []), [], COMMITTED)
  const fiveWires = objectiveOf(boardWith(wiresNumbering(5), []), [], COMMITTED)
  expect(oneCut).toBe(1)
  expect(fourWires).toBe(oneCut)
  expect(fiveWires).toBeGreaterThan(oneCut)
})

test("the wire term and the bridge term are priced separately, not as one sum", () => {
  // THE TWO WEIGHTS HERE ARE UNEQUAL ON PURPOSE AND PRICE NOTHING - see the
  // module comment. With the committed 0.25/0.25 both boards below cost the
  // same, so an implementation pricing (W + B) once would pass unnoticed.
  const unequal = { rhoWire: 0.25, rhoSolder: 2 }
  const twoWiresOneBridge = boardWith(wiresNumbering(2), bridgesNumbering(1))
  const oneWireTwoBridges = boardWith(wiresNumbering(1), bridgesNumbering(2))
  expect(objectiveOf(twoWiresOneBridge, [], unequal)).toBe(2.5)
  expect(objectiveOf(oneWireTwoBridges, [], unequal)).toBe(4.25)
  expect(objectiveOf(twoWiresOneBridge, [], COMMITTED)).toBe(
    objectiveOf(oneWireTwoBridges, [], COMMITTED),
  )
})

test("C is the count of the cut list handed in, which is what the derivation returns", () => {
  // Two nets on one strip, their leads in neighbouring holes: one cut, nothing
  // else on the board, so F is exactly 1.
  const oneCut = twoNetsOnStripThree()
  const cuts = derivedCuts(oneCut, reference())
  expect(cuts.length, "the fixture's derived cut count").toBe(1)
  expect(objectiveOf(oneCut, cuts, COMMITTED)).toBe(1)
})

test("a derived cut and two wires cost 1.5, and a derived cut and a bridge cost 1.25", () => {
  const wired = wireOnlyStripTwoNets()
  const wiredCuts = derivedCuts(wired, reference())
  expect(wiredCuts.length, "the wire-only strip needs one cut").toBe(1)
  expect(wired.wires.length).toBe(2)
  expect(objectiveOf(wired, wiredCuts, COMMITTED)).toBe(1.5)

  const bridged = bridgeInsideAGap()
  const bridgedCuts = derivedCuts(bridged, reference())
  expect(bridgedCuts.length, "the bridged strip needs one cut").toBe(1)
  expect(bridged.bridges.length).toBe(1)
  expect(objectiveOf(bridged, bridgedCuts, COMMITTED)).toBe(1.25)
})

test("an absent wire weight refuses by name rather than defaulting", () => {
  expect(
    refusalFrom(() =>
      objectiveOf(boardWith(wiresNumbering(2), []), cutsNumbering(1), {
        rhoWire: undefined,
        rhoSolder: 0.25,
      }),
    ),
  ).toStartWith('stripboard-score-weight-absent: "rhoWire"')
})

test("an absent solder weight refuses by name rather than defaulting", () => {
  expect(
    refusalFrom(() =>
      objectiveOf(boardWith([], bridgesNumbering(2)), cutsNumbering(1), {
        rhoWire: 0.25,
        rhoSolder: undefined,
      }),
    ),
  ).toStartWith('stripboard-score-weight-absent: "rhoSolder"')
})

test("an absent weight refuses even when the board has none of the thing it prices", () => {
  // The alternative is a parameter that is missing and says nothing until some
  // later board happens to carry a wire - mid-search, on a different candidate,
  // where it reads as a fault in the move that added the wire.
  const noWires = boardWith([], bridgesNumbering(1))
  expect(noWires.wires.length, "the board the weight would price is empty of them").toBe(0)
  const absentWire = { rhoWire: undefined, rhoSolder: 0.25 }
  expect(refusalFrom(() => objectiveOf(noWires, cutsNumbering(1), absentWire))).toStartWith(
    'stripboard-score-weight-absent: "rhoWire"',
  )
})

test("a weight that is not a finite number refuses by name", () => {
  const board = boardWith(wiresNumbering(1), bridgesNumbering(1))
  expect(
    refusalFrom(() => objectiveOf(board, [], { rhoWire: Number.NaN, rhoSolder: 0.25 })),
  ).toStartWith('stripboard-score-weight-not-finite: "rhoWire"')
  const infiniteSolder = { rhoWire: 0.25, rhoSolder: Number.POSITIVE_INFINITY }
  expect(refusalFrom(() => objectiveOf(board, [], infiniteSolder))).toStartWith(
    'stripboard-score-weight-not-finite: "rhoSolder"',
  )
})

test("the range of a weight is the rules loader's business and is not re-judged here", () => {
  // A negative weight is refused by stripboard/rules.json's loader, which owns
  // every parameter's range (PAR3). This module does NOT refuse one, and that
  // is asserted rather than left to be discovered: a second owner of one bound
  // is two places to keep in step, and a core that rejected a value the
  // reviewed file accepted would be the core overruling the parameter file.
  const negativeWire = { rhoWire: -1, rhoSolder: 0.25 }
  expect(objectiveOf(boardWith(wiresNumbering(2), []), [], negativeWire)).toBe(-2)
})

test("the candidate scorer and the dump scorer agree on one board's three counts", () => {
  // TWO IMPLEMENTATIONS OF F NOW EXIST - this one over a Candidate, and
  // tools/stripboard/score.ts's over a dump's line counts - because the core
  // scores a candidate in memory and the old pipeline scores an exported
  // artifact. They are held together here rather than trusted to stay in step.
  const candidate = boardWith(wiresNumbering(2), bridgesNumbering(3))
  expect(objectiveOf(candidate, cutsNumbering(5), COMMITTED)).toBe(
    objectiveFromLineCounts({ cuts: 5, wires: 2, solder: 3 }, COMMITTED),
  )
})
