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

test("a backslash escape inside a quoted atom is unescaped", () => {
  const node = parseSexpr(`(field (name "Description") "She said \\"hi\\"")`)
  expect(node.atoms).toContain(`She said "hi"`)
})

test("a quoted form name parses as that name", () => {
  const node = parseSexpr(`("weird name" (x "1"))`)
  expect(node.name).toBe("weird name")
})

test("trailing garbage after the root form throws rather than being discarded", () => {
  expect(() => parseSexpr(`(root (a "1")) THIS SHOULD NOT BE HERE`)).toThrow(/trailing/i)
})

test("a second top-level form throws rather than being silently discarded", () => {
  expect(() => parseSexpr(`(root) (second-form)`)).toThrow(/trailing/i)
})

test("a stray close paren after the root form throws", () => {
  expect(() => parseSexpr(`(root) )`)).toThrow(/trailing/i)
})

test("trailing whitespace and newlines after the root form still parse", () => {
  const node = parseSexpr(`(root (a "1"))\n\n`)
  expect(node.name).toBe("root")
  expect(attr(node, "a")).toBe("1")
})
