import { test, expect } from "bun:test"
import { parseBoardDump } from "../../tools/guide/dump.ts"
import { assertLayoutMatchesCircuit } from "../../tools/guide/circuit.ts"
import { declaredPowerUpChecks } from "../../tools/guide/power-up.ts"
import { COMPONENTS, DUMP_TEXT, fixtureCircuit } from "./fixture.ts"

test("a layout that holds exactly the circuit's parts passes", () => {
  expect(() => assertLayoutMatchesCircuit(parseBoardDump(DUMP_TEXT), fixtureCircuit())).not.toThrow()
})

test("a circuit part missing from the layout is refused, on-board or off-board alike", () => {
  const dump = parseBoardDump(
    DUMP_TEXT.replace("PART R1 RESISTOR 10K AT 2,3 SPAN 1\n", "")
      .replace("PART RV2 SIP3 25K AT 7,0 SPAN 1\n", "")
      .replace(/PIN R1 .*\n/g, "")
      .replace(/PIN RV2 .*\n/g, ""),
  )
  expect(() => assertLayoutMatchesCircuit(dump, fixtureCircuit())).toThrow(
    /in the circuit but not on the board: R1, RV2[\s\S]*make update/,
  )
})

test("a layout part the circuit does not have is refused", () => {
  const circuit = fixtureCircuit(undefined, COMPONENTS.filter((component) => component.id !== "bias_resistor"))
  expect(() => assertLayoutMatchesCircuit(parseBoardDump(DUMP_TEXT), circuit)).toThrow(
    /on the board but not in the circuit: R1/,
  )
})

test("powerUpChecks: absent is none; a non-function, missing conditions, an empty list or a bad row is refused", async () => {
  expect(await declaredPowerUpChecks({}, "m.ts")).toBeUndefined()
  await expect(declaredPowerUpChecks({ powerUpChecks: 3 }, "m.ts")).rejects.toThrow(/not a function/)
  await expect(declaredPowerUpChecks({ powerUpChecks: async () => "nope" }, "m.ts")).rejects.toThrow(
    /not { conditions, checks }/,
  )
  await expect(
    declaredPowerUpChecks(
      { powerUpChecks: async () => ({ conditions: "", checks: [{ label: "x", node: "n", expectedVolts: 1 }] }) },
      "m.ts",
    ),
  ).rejects.toThrow(/declared no conditions/)
  await expect(
    declaredPowerUpChecks({ powerUpChecks: async () => ({ conditions: "24 V", checks: [] }) }, "m.ts"),
  ).rejects.toThrow(/declared no checks/)
  await expect(
    declaredPowerUpChecks({ powerUpChecks: () => ({ conditions: "24 V", checks: [{ label: "x" }] }) }, "m.ts"),
  ).rejects.toThrow(/no node/)
  await expect(
    declaredPowerUpChecks({ powerUpChecks: async () => ({ conditions: "24 V", checks: "nope" }) }, "m.ts"),
  ).rejects.toThrow(/not an array/)
})

test("powerUpChecks: an async export is awaited", async () => {
  const row = { label: "Q1 collector", node: "COLLECTOR", expectedVolts: 12.1 }
  const module = { powerUpChecks: async () => ({ conditions: "24 V supply", checks: [row] }) }
  expect(await declaredPowerUpChecks(module, "m.ts")).toEqual({ conditions: "24 V supply", checks: [row] })
})
