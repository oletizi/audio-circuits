import { test, expect } from "bun:test"
import { parseValue } from "../lib/passives/units.ts"

test("parses SI suffixes to base units", () => {
  expect(parseValue("1k")).toBe(1000)
  expect(parseValue("100nF")).toBeCloseTo(1e-7, 20)
  expect(parseValue("100mH")).toBeCloseTo(0.1, 12)
  expect(parseValue("4.7uF")).toBeCloseTo(4.7e-6, 18)
  expect(parseValue("1e-6")).toBe(1e-6)
  expect(parseValue("620")).toBe(620)
})

test("rejects unparseable values instead of guessing", () => {
  expect(() => parseValue("")).toThrow("Unparseable value")
  expect(() => parseValue("about 1k")).toThrow("Unparseable value")
  expect(() => parseValue("1Q")).toThrow("Unparseable value")
})
