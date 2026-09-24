import { test, expect } from "bun:test"
import { foldCutState, unresolvedCutsMessage } from "../../tools/perfboard/cut-state.ts"

/** A dump shaped like the pinned fork's --dump-board output for a strip board
 * saved before its tracks were committed. */
const UNRESOLVED_DUMP = [
  "NODE 3 NAME BASE C2.1 Q1.2",
  "NODE 5 NAME GND J1.2 J2.2",
  "NODE 7 NAME COLLECTOR_LOAD_FLOOR R3.2 RV3.1",
  "PART J2 SIP2 Conn_01x02 AT 15,7 SPAN 1",
  "CUT_STATE UNRESOLVED",
  "CUT_CONFLICT 15,8,5 15,16,3",
  "CUT_CONFLICT 15,16,3 15,23,7",
  "",
].join("\n")

const COMPUTED_DUMP = ["NODE 5 NAME GND J1.2", "CUT_STATE COMPUTED", "CUT 15,8,5 15,9,3", ""].join("\n")

test("an unresolved cut state is explained by net name and position, with the fix", () => {
  const message = unresolvedCutsMessage("board.vrt", UNRESOLVED_DUMP)
  expect(message).toContain("board.vrt")
  expect(message).toContain("(15,8) GND")
  expect(message).toContain("(15,16) BASE")
  expect(message).toContain("(15,23) COLLECTOR_LOAD_FLOOR")
  expect(message).toMatch(/2 places/)
  expect(message).toMatch(/Paste/)
  expect(message).not.toContain("CUT_CONFLICT")
})

test("a conflict naming a node the dump never declared refuses rather than printing a bare id", () => {
  const dump = ["CUT_STATE UNRESOLVED", "CUT_CONFLICT 1,1,5 1,4,9", ""].join("\n")
  expect(() => unresolvedCutsMessage("board.vrt", dump)).toThrow(/node 5/)
})

test("a passing check on a board whose cuts are unresolved becomes a failing one", () => {
  const folded = foldCutState({ status: 0, output: "Layout state\n  BASE complete\n" }, UNRESOLVED_DUMP, "board.vrt")
  expect(folded.status).toBe(1)
  expect(folded.output).toContain("BASE complete")
  expect(folded.output).toContain("(15,8) GND")
})

test("computed and not-applicable cut states leave the check's verdict alone", () => {
  const passing = { status: 0, output: "Layout state\n" }
  expect(foldCutState(passing, COMPUTED_DUMP, "board.vrt")).toEqual(passing)
  expect(foldCutState(passing, "CUT_STATE NOT_APPLICABLE\n", "board.vrt")).toEqual(passing)
})

test("an already-failing check is left alone: its own report says what is wrong", () => {
  const failing = { status: 1, output: "Layout state\n  BASE incomplete\n" }
  expect(foldCutState(failing, UNRESOLVED_DUMP, "board.vrt")).toEqual(failing)
})

test("a dump with no CUT_STATE line refuses rather than passing the check", () => {
  expect(() => foldCutState({ status: 0, output: "" }, "NODE 5 NAME GND\n", "board.vrt"))
    .toThrow(/CUT_STATE/)
})
