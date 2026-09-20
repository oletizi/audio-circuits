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

test("parses RKM notation, where the multiplier replaces the decimal point", () => {
  // Every one of these appears verbatim in the reference netlist export.
  expect(parseValue("4n7")).toBeCloseTo(4.7e-9, 18)
  expect(parseValue("2n2")).toBeCloseTo(2.2e-9, 18)
  expect(parseValue("1n8")).toBeCloseTo(1.8e-9, 18)
  expect(parseValue("3n3")).toBeCloseTo(3.3e-9, 18)
  expect(parseValue("1n5")).toBeCloseTo(1.5e-9, 18)
  expect(parseValue("4K7")).toBeCloseTo(4700, 9)
  expect(parseValue("1R5")).toBeCloseTo(1.5, 12)
})

test("plain forms still win over RKM where both could apply", () => {
  // "430R" and "56K" are ordinary suffixed values, not RKM triples.
  expect(parseValue("430R")).toBe(430)
  expect(parseValue("56K")).toBe(56000)
  expect(parseValue("18n")).toBeCloseTo(1.8e-8, 18)
  expect(parseValue("470pF")).toBeCloseTo(4.7e-10, 20)
})

test("rejects unparseable values instead of guessing", () => {
  expect(() => parseValue("")).toThrow("Unparseable value")
  expect(() => parseValue("about 1k")).toThrow("Unparseable value")
  expect(() => parseValue("1Q")).toThrow("Unparseable value")
})
