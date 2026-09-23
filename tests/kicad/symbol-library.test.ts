import { test, expect } from "bun:test"
import {
  VENDORED_SYMBOLS, embeddedSymbol, flattenedSymbol, librarySymbols, splitLibId, symbolPins,
  vendoredSymbolText,
} from "../../lib/kicad/symbol-library.ts"

const LIBRARY = [
  "(kicad_symbol_lib",
  "\t(version 20241209)",
  '\t(symbol "Base"',
  '\t\t(property "Reference" "Q" (at 0 0 0))',
  '\t\t(property "Value" "Base (parent)" (at 0 0 0))',
  '\t\t(symbol "Base_0_1" (polyline (pts (xy 0 0) (xy 1 1))))',
  '\t\t(symbol "Base_1_1"',
  '\t\t\t(pin passive line (at 0 2.54 270) (length 1.27) (name "~") (number "1"))',
  '\t\t\t(pin passive line (at 0 -2.54 90) (length 1.27) (name "~") (number "2"))',
  "\t\t)",
  "\t)",
  '\t(symbol "Child" (extends "Base")',
  '\t\t(property "Value" "Child" (at 0 0 0))',
  '\t\t(property "ki_fp_filters" "TO?92*" (at 0 0 0))',
  "\t)",
  ")",
].join("\n")

test("library symbols are found by name, even with parentheses inside quoted strings", () => {
  const symbols = librarySymbols(LIBRARY)
  expect([...symbols.keys()].sort()).toEqual(["Base", "Child"])
  expect(symbols.get("Base")).toContain('"Base (parent)"')
})

test("flattening an extends copies the parent's body under the child's name and properties", () => {
  const flat = flattenedSymbol(librarySymbols(LIBRARY), "Child")
  expect(flat.startsWith('(symbol "Child"')).toBe(true)
  expect(flat).toContain('(symbol "Child_1_1"')
  expect(flat).toContain('(property "Value" "Child"')
  expect(flat).toContain('(property "Reference" "Q"')
  expect(flat).toContain('(property "ki_fp_filters" "TO?92*"')
  expect(flat).not.toContain("extends")
  expect(flat).not.toContain('"Base')
})

test("pin geometry comes from the symbol's units", () => {
  const pins = symbolPins(flattenedSymbol(librarySymbols(LIBRARY), "Child"))
  expect(pins).toEqual([
    { number: "1", x: 0, y: 2.54, angle: 270 },
    { number: "2", x: 0, y: -2.54, angle: 90 },
  ])
})

test("embedding renames the top-level symbol to its lib id and leaves its units alone", () => {
  const block = flattenedSymbol(librarySymbols(LIBRARY), "Child")
  const embedded = embeddedSymbol("Lib:Child", block)
  expect(embedded.startsWith('(symbol "Lib:Child"')).toBe(true)
  expect(embedded).toContain('(symbol "Child_1_1"')
})

test("a lib id without a colon, or an unvendored symbol, refuses", () => {
  expect(() => splitLibId("R")).toThrow(/Library:Name/)
  expect(() => vendoredSymbolText("Device:NoSuchPart")).toThrow(/Device:NoSuchPart/)
})

test("every vendored symbol loads, is self-contained, and has pins", () => {
  for (const libId of VENDORED_SYMBOLS) {
    const text = vendoredSymbolText(libId)
    expect(text).not.toContain("(extends")
    expect(symbolPins(text).length).toBeGreaterThan(0)
  }
})
