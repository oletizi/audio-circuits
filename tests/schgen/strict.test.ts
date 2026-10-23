import { test, expect } from "bun:test"
import { isRecord, rejectUnknown } from "../../lib/schgen/strict.ts"

test("isRecord accepts a plain object and rejects arrays, null and primitives", () => {
  expect(isRecord({})).toBe(true)
  expect(isRecord({ a: 1 })).toBe(true)
  expect(isRecord([])).toBe(false)
  expect(isRecord(null)).toBe(false)
  expect(isRecord("x")).toBe(false)
  expect(isRecord(1)).toBe(false)
})

test("rejectUnknown passes when every key is allowed", () => {
  expect(() => rejectUnknown({ a: 1, b: 2 }, ["a", "b"], "spec.json")).not.toThrow()
})

test("rejectUnknown names the unknown key and where it was found", () => {
  expect(() => rejectUnknown({ a: 1, cc: 2 }, ["a", "b"], "spec.json")).toThrow(
    /spec\.json.*unknown key "cc"/,
  )
})
