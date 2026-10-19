import { test, expect } from "bun:test"
import { parseSexpr, children, attr, parse, quoteString } from "../../lib/kicad/sexpr.ts"

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

// --- `parse`'s richer reader: offsets, quoting, and lossy-escape tracking ---

test("an atom's quoted flag survives: bare and quoted atoms are distinguished", () => {
  // atoms[0] ("field") is the head; the two atoms under test follow it.
  const root = parse(`(field yes "yes")`)
  const [, bare, quoted] = root.atoms
  expect(bare?.quoted).toBe(false)
  expect(quoted?.quoted).toBe(true)
  expect(bare?.value).toBe("yes")
  expect(quoted?.value).toBe("yes")
})

test("lossyEscape is \\n for KiCad's multi-line text escape", () => {
  // atoms[0] ("text") is the head; the quoted atom under test is atoms[1].
  const root = parse(`(text "line one\\nline two")`)
  const atom = root.atoms[1]
  expect(atom?.lossyEscape).toBe("\\n")
  // The escape decodes to its literal second character ("n"), not a real
  // newline - that is the loss `lossyEscape` exists to flag.
  expect(atom?.value).toBe("line onenline two")
})

test("lossyEscape is null for the two escapes quoteString emits: \\\" and \\\\", () => {
  const root = parse(`(text "quote: \\" backslash: \\\\")`)
  const atom = root.atoms[1]
  expect(atom?.lossyEscape).toBe(null)
  expect(atom?.value).toBe(`quote: " backslash: \\`)
})

test("quoteString round-trips through parse", () => {
  for (const value of ["plain", `has "quotes"`, `has\\backslash`, "has (parens) and spaces"]) {
    const root = parse(`(text ${quoteString(value)})`)
    const atom = root.atoms[1]
    expect(atom?.value).toBe(value)
    expect(atom?.lossyEscape).toBe(null)
  }
})
