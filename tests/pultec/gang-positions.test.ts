/**
 * G39: two poles of one gang must declare the same `positions` list, not just
 * resolve to the same SELECTED position at simulation time. `checkGangs` and
 * `validateControlState` (`lib/model/control-state.ts`) only ever compare a
 * `ControlState`'s selected position against one switch's own list, so one
 * pole's declared list can drift from its gang-mate's and nothing notices
 * until a simulation happens to pick a position the edited pole dropped. See
 * `docs/known-gaps.md` G39.
 *
 * `assertGangsDeclareSamePositions` (`circuits/pultec/electrical/controls.ts`)
 * is the narrower check: it compares the declared lists of every gang whose
 * members are enumerable through `SELECTORS` itself.
 */
import { test, expect } from "bun:test"
import {
  assertGangsDeclareSamePositions,
  SELECTORS,
} from "../../circuits/pultec/electrical/controls.ts"
import type { SelectorTerminals } from "../../circuits/pultec/electrical/controls.ts"

const GANG = "test_gang"

function poleFixture(ref: string, positions: readonly string[]): SelectorTerminals {
  return {
    kind: "selector",
    ref,
    commonConnector: "J900",
    throwsConnector: "J901",
    positions,
    gang: GANG,
    source: "fixture",
  }
}

test("the committed SELECTORS gangs agree, and the check accepts them", () => {
  expect(() => assertGangsDeclareSamePositions(SELECTORS)).not.toThrow()
})

test("two poles of one gang declaring different positions are refused", () => {
  const poleA = poleFixture("SW_FIXTURE_A", ["20Hz", "30Hz", "60Hz"])
  const poleB = poleFixture("SW_FIXTURE_B", ["20Hz", "99Hz", "60Hz"])
  expect(() => assertGangsDeclareSamePositions([poleA, poleB])).toThrow(
    'Gang "test_gang" poles declare different positions: '
      + "SW_FIXTURE_A=[20Hz, 30Hz, 60Hz] vs SW_FIXTURE_B=[20Hz, 99Hz, 60Hz]",
  )
})

test("the refusal names the gang, both refs and both lists", () => {
  const poleA = poleFixture("SW_FIXTURE_A", ["20Hz", "30Hz"])
  const poleB = poleFixture("SW_FIXTURE_B", ["30Hz", "20Hz"])
  try {
    assertGangsDeclareSamePositions([poleA, poleB])
    throw new Error("expected a refusal")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    expect(message).toContain(GANG)
    expect(message).toContain("SW_FIXTURE_A")
    expect(message).toContain("SW_FIXTURE_B")
    expect(message).toContain("[20Hz, 30Hz]")
    expect(message).toContain("[30Hz, 20Hz]")
  }
})

test("a gang's poles may declare the same positions in the same order without refusal", () => {
  const poleA = poleFixture("SW_FIXTURE_A", ["20Hz", "30Hz", "60Hz"])
  const poleB = poleFixture("SW_FIXTURE_B", ["20Hz", "30Hz", "60Hz"])
  expect(() => assertGangsDeclareSamePositions([poleA, poleB])).not.toThrow()
})

test("a selector with no gang is ignored, even if its positions differ from everything else", () => {
  const ganged = poleFixture("SW_FIXTURE_A", ["20Hz", "30Hz"])
  const ungangedDifferent: SelectorTerminals = {
    kind: "selector",
    ref: "SW_FIXTURE_UNGANGED",
    commonConnector: "J902",
    throwsConnector: "J903",
    positions: ["1kHz"],
    source: "fixture",
  }
  expect(() => assertGangsDeclareSamePositions([ganged, ungangedDifferent])).not.toThrow()
})
