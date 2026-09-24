import { test, expect } from "bun:test"
import { assertOffBoardIds, assertPadOrder } from "../../tools/perfboard/check.ts"
import type { PerfboardDeclaration } from "../../tools/perfboard/declaration.ts"

const DECLARATION: PerfboardDeclaration = {
  file: "/tmp/perfboard.json",
  dir: "/tmp",
  circuitPath: "/tmp/circuit.ts",
  exportName: "board",
  vrtPath: "/tmp/board.vrt",
}

test("an absent off-board export is an empty set, so existing boards keep working", () => {
  expect(assertOffBoardIds(undefined, DECLARATION).size).toBe(0)
})

test("a Set of ids is accepted", () => {
  expect([...assertOffBoardIds(new Set(["RV1", "SW1"]), DECLARATION)].sort()).toEqual(["RV1", "SW1"])
})

test("a non-set off-board export refuses", () => {
  expect(() => assertOffBoardIds(["RV1"], DECLARATION)).toThrow(/must be a Set/)
})

test("an absent pad order export is an empty map", () => {
  expect(assertPadOrder(undefined, DECLARATION)).toEqual({})
})

test("a pad order of string arrays is accepted", () => {
  expect(assertPadOrder({ RV1: ["ccw", "wiper", "cw"] }, DECLARATION))
    .toEqual({ RV1: ["ccw", "wiper", "cw"] })
})

test("a pad order whose entry is not an array of strings refuses, naming the id", () => {
  expect(() => assertPadOrder({ RV1: "ccw" }, DECLARATION)).toThrow(/PAD_ORDER\["RV1"\]/)
  expect(() => assertPadOrder({ RV1: [1, 2] }, DECLARATION)).toThrow(/PAD_ORDER\["RV1"\]/)
})
