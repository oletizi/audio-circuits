/**
 * A panel control legitimately reaches a board as a header `PART`
 * (`tools/guide/off-board.ts`) or as landing `PAD` lines
 * (`tools/guide/pads.ts`) - `./circuit.test.ts` covers the PART-only case and
 * `./circuit-pads.test.ts` covers the PAD-only one. This file is the third
 * case neither of those covers: a ref carrying BOTH at once, which is not a
 * third legitimate representation but the same control wired, or counted,
 * twice. `assertNoControlReachesTwice` in `../../tools/guide/circuit.ts` is
 * the guard; this is its witness.
 */
import { test, expect } from "bun:test"
import { net, type Component } from "../../lib/model/types.ts"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { assertLayoutMatchesCircuit, boardCircuitFrom } from "../../tools/guide/circuit.ts"
import type { PadTerminal } from "../../tools/guide/pads.ts"

/** A panel pot placed as a header PART, with PIN lines, at ref RV_BOTH. */
const DUMP_WITH_PART_TEXT = [
  "GRID 11 12",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART RV_BOTH SIP3 25K AT 7,0 SPAN 1",
  "PIN RV_BOTH 1 AT 7,1",
  "PIN RV_BOTH 2 AT 8,1",
  "PIN RV_BOTH 3 AT 9,1",
  "",
].join("\n")

/** The same ref the circuit declares as a panel pot, matching `tests/guide/circuit-pads.test.ts`. */
const BOTH_POT: Component = {
  id: "both_pot",
  kind: "potentiometer",
  parameters: {},
  pins: {},
  units: [{ name: "MAIN", pins: { ccw: net("GND"), wiper: net("PAD_WIPER"), cw: net("PAD_TOP") } }],
}

function bothCircuit() {
  return boardCircuitFrom(
    { components: [BOTH_POT], ports: {} },
    { both_pot: "RV_BOTH" },
    { potentiometer: { ccw: "1", wiper: "2", cw: "3" } },
    undefined,
  )
}

/** The three `PadTerminal`s a real `PAD ... FROM RV_BOTH.<pin>` set reads as. */
function padTerminalsFor(ref: string): readonly PadTerminal[] {
  return (["1", "2", "3"] as const).map((pin, index) => ({
    identity: `${ref}.${pin}`,
    ref,
    pin,
    row: 0,
    col: index,
  }))
}

test("a control with both a PART line and PAD lines for the same ref is refused, naming the ref", () => {
  const dump = parseBoardDump(DUMP_WITH_PART_TEXT)
  expect(() =>
    assertLayoutMatchesCircuit(dump, bothCircuit(), padTerminalsFor("RV_BOTH")),
  ).toThrow(/RV_BOTH/)
})

test("the refusal names both representations it found", () => {
  const dump = parseBoardDump(DUMP_WITH_PART_TEXT)
  let message = ""
  try {
    assertLayoutMatchesCircuit(dump, bothCircuit(), padTerminalsFor("RV_BOTH"))
    throw new Error("expected assertLayoutMatchesCircuit to throw")
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  expect(message).toMatch(/PART line/)
  expect(message).toMatch(/PAD lines/)
  expect(message).toMatch(/tools\/guide\/off-board\.ts/)
  expect(message).toMatch(/tools\/guide\/pads\.ts/)
})
