import { test, expect } from "bun:test"
import { parseSexpr, children, attr } from "../../lib/kicad/sexpr.ts"

test("parses a nested form with quoted atoms", () => {
  const node = parseSexpr(`(comp (ref "C1") (value ".1uF"))`)
  expect(node.name).toBe("comp")
  expect(attr(node, "ref")).toBe("C1")
  expect(attr(node, "value")).toBe(".1uF")
})

test("quoted atoms may contain spaces and parentheses", () => {
  const node = parseSexpr(`(field (name "Description") "Unpolarized (film) capacitor")`)
  expect(node.atoms).toContain("Unpolarized (film) capacitor")
})

test("children returns every matching sub-form", () => {
  const node = parseSexpr(`(net (node (ref "C1")) (node (ref "R2")))`)
  expect(children(node, "node").map((n) => attr(n, "ref"))).toEqual(["C1", "R2"])
})

test("an unbalanced form throws rather than returning a partial tree", () => {
  expect(() => parseSexpr(`(comp (ref "C1")`)).toThrow(/unbalanced/i)
})
