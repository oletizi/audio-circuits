import { test, expect } from "bun:test"
import { declaredGuideNotes } from "../../tools/guide/guide-notes.ts"
import * as stagedBoard from "../../circuits/transistor-preamp/staged-board.ts"
import * as bufferedBoard from "../../circuits/transistor-preamp/buffered-board.ts"

test("declaredGuideNotes: a module with no guideNotes export returns undefined", () => {
  expect(declaredGuideNotes({}, "m.ts")).toBeUndefined()
})

test("declaredGuideNotes: returns the lines a module's guideNotes() returns, in order", () => {
  const module = { guideNotes: () => ["A", "  B"] }
  expect(declaredGuideNotes(module, "m.ts")).toEqual(["A", "  B"])
})

test("declaredGuideNotes: a non-function export is refused, naming the module", () => {
  expect(() => declaredGuideNotes({ guideNotes: 3 }, "m.ts")).toThrow(/m\.ts/)
  expect(() => declaredGuideNotes({ guideNotes: 3 }, "m.ts")).toThrow(/not a function/)
})

test("declaredGuideNotes: a function returning a string (not an array) is refused, naming the module", () => {
  const module = { guideNotes: () => "nope" }
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/m\.ts/)
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/not an array of strings/)
})

test("declaredGuideNotes: an array with a non-string element is refused, naming the module", () => {
  const module = { guideNotes: () => [1] }
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/m\.ts/)
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/guideNotes\(\)\[0\]/)
})

test("declaredGuideNotes: an empty array is refused, naming the module", () => {
  const module = { guideNotes: () => [] }
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/m\.ts/)
  expect(() => declaredGuideNotes(module, "m.ts")).toThrow(/returned no lines/)
})

test("declaredGuideNotes: the staged board's module yields exactly its own schematicNotes()", () => {
  expect(declaredGuideNotes(stagedBoard, "circuits/transistor-preamp/staged-board.ts")).toEqual(
    stagedBoard.schematicNotes(),
  )
})

test("declaredGuideNotes: the buffered board's module declares no guideNotes", () => {
  expect(declaredGuideNotes(bufferedBoard, "circuits/transistor-preamp/buffered-board.ts")).toBeUndefined()
})
