/**
 * Tests for tools/perfboard/schematic-notice.ts: the notice a board prints
 * when its perfboard.json declares no "sch"/"netlist" pair.
 *
 * This is a pure function - no filesystem, no spawn - so these tests pin its
 * content directly rather than through the CLI verb (tests/cli/perfboard-
 * schematic-notice-verb.test.ts covers wiring that content into `runCli`).
 */
import { test, expect } from "bun:test"
import { schematicNoticeLines } from "../../tools/perfboard/schematic-notice.ts"

test("names the exact perfboard.json path it was given", () => {
  const lines = schematicNoticeLines("/boards/widget/perfboard.json")
  const joined = lines.join("\n")
  expect(joined).toContain("/boards/widget/perfboard.json")
})

test("states plainly that no schematic was compared against", () => {
  const joined = schematicNoticeLines("/x/perfboard.json").join(" ")
  expect(joined).toMatch(/did NOT compare the circuit against any schematic/)
  expect(joined).toMatch(/drift .* cannot have been detected/)
})

test("says this is a legitimate configuration, not a failure", () => {
  const joined = schematicNoticeLines("/x/perfboard.json").join(" ")
  expect(joined).toMatch(/legitimate\s+configuration, not a failure/)
  expect(joined).toMatch(/exits 0 on a clean result/)
})

test("teaches the fix: declare sch and netlist in this exact file", () => {
  const joined = schematicNoticeLines("/x/perfboard.json").join("\n")
  expect(joined).toContain('Declare "sch" and "netlist" in /x/perfboard.json')
})

test("opens with a NOTICE header distinct from \"ok\"/\"FAIL\" check output", () => {
  const [first] = schematicNoticeLines("/x/perfboard.json")
  expect(first).toMatch(/^NOTICE: /)
  expect(first).not.toMatch(/^ok /)
  expect(first).not.toMatch(/^FAIL /)
})
