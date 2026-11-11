import { expect, test } from "bun:test"
import { assertFootprintComparisons } from "./drafted-sheet.ts"

const none = { footprints: [], footprintsUndeclared: ["A", "B"] }

test("footprintComparisons none: passes when no footprint is compared and every component is footprintless", () => {
  expect(() => assertFootprintComparisons("none", none, ["A", "B"], ["A", "B"])).not.toThrow()
})

test("footprintComparisons none: a part that acquires a footprint fails", () => {
  expect(() => assertFootprintComparisons("none", { footprints: ['A: footprint "<none>"'], footprintsUndeclared: ["B"] }, ["B"], ["A", "B"])).toThrow()
  expect(() => assertFootprintComparisons("none", { footprints: [], footprintsUndeclared: ["B"] }, ["B"], ["A", "B"])).toThrow()
})

test("footprintComparisons some: needs a non-empty footprints list", () => {
  expect(() => assertFootprintComparisons("some", { footprints: [], footprintsUndeclared: ["A"] }, ["A"], ["A"])).toThrow()
  expect(() => assertFootprintComparisons("some", { footprints: ['A: footprint "<none>"'], footprintsUndeclared: ["B"] }, ["B"], ["A", "B"])).not.toThrow()
})
