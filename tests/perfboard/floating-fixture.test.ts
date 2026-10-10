import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"

/**
 * The negative fixture for the "nothing floating" hard constraint: a low-boost
 * board with C19 off the board and nothing else changed. Its provenance, the
 * exact commands that made it and the binary that wrote it are in
 * `tests/fixtures/pultec-low-boost-c19-floated.provenance.txt`.
 *
 * It is committed and cannot be regenerated. The only thing that ever produced
 * such a board was `--stretch` exiting 0 while floating a part, and that is the
 * defect the fork's `PlacementSnapshot` check (M1.2) removes, so this capture
 * was taken from the pre-fix binary on purpose and before the fix landed.
 *
 * What these tests are for: the fixture is only worth committing if the thing
 * it demonstrates is asserted, and the thing it demonstrates is that a board
 * with a part in mid-air reports every term of the placement cost objective as
 * healthy. A capture nobody reads is a capture somebody deletes as
 * unexplained.
 */
const DUMP_PATH = "tests/fixtures/pultec-low-boost-c19-floated.dump"

const DUMP_TEXT = await Bun.file(DUMP_PATH).text()
const dump = parseBoardDump(DUMP_TEXT)

/**
 * The same dump with C19 put back where the committed layout has it: its PART
 * line placed again and its two PIN lines restored, both taken from
 * `boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`'s own dump. This is
 * the control - without a dump that reports nothing floating, "no part is
 * floating" would also be satisfied by a reader that never reports one.
 */
const REPLACED_TEXT = DUMP_TEXT.replace(
  "PART C19 CAP_FILM .22uF FLOATING SPAN 1",
  "PART C19 CAP_FILM .22uF AT 3,13 SPAN 1",
).replace("PIN C20 1 AT 5,16", "PIN C19 1 AT 5,13\nPIN C19 2 AT 3,13\nPIN C20 1 AT 5,16")
const healthy = parseBoardDump(REPLACED_TEXT)

test("the fixture's C19 reports as floating on its PART line", () => {
  const c19 = dump.parts.find((part) => part.ref === "C19")
  if (c19 === undefined) throw new Error(`${DUMP_PATH} has no PART C19 line`)
  expect(c19.placement).toBe("floating")
})

test("the fixture's C19 prints no PIN line at all - the second signal, asserted separately", () => {
  // Two assertions rather than one, deliberately. Both signals derive from
  // Component::GetIsPlaced(), so they are one predicate reported twice and not
  // two witnesses - but a future fork change that kept one and dropped the
  // other must fail loudly here rather than quietly halve the evidence.
  expect(dump.pins["C19"]).toBeUndefined()
})

test("every part other than C19 is still placed, so the fixture isolates one float", () => {
  const floating = dump.parts.filter((part) => part.placement === "floating").map((part) => part.ref)
  expect(floating).toEqual(["C19"])
})

test("the cost objective's terms all read as a healthy board - which is why the refusal is in the verb", () => {
  // This is the whole reason M1.2 is a refusal in the actuator rather than a
  // line in the dump. Nothing a score is computed from moved: the grid, the
  // cut count, the node count, the wire count and the solder-bridge count are
  // what the committed, conducting layout reports.
  expect(dump.grid).toEqual({ rows: 14, cols: 32 })
  expect(dump.cutState).toBe("COMPUTED")
  expect(dump.cuts).toHaveLength(5)
  expect(Object.keys(dump.nodes)).toHaveLength(9)
  expect(dump.wires).toHaveLength(0)
  expect(dump.bridges).toHaveLength(1)
})

test("the same board with C19 put back reports nothing floating and both of its PIN lines", () => {
  // The control, and it is the SAME board: the only difference from the
  // fixture is the one part's placement, so the two assertions above are
  // reading that difference and not an artefact of the reader.
  expect(healthy.parts.filter((part) => part.placement === "floating")).toEqual([])
  expect(healthy.pins["C19"]).toEqual([
    { pin: "1", row: 5, col: 13 },
    { pin: "2", row: 3, col: 13 },
  ])
  expect(healthy.parts).toHaveLength(dump.parts.length)
})
