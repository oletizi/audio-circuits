import { test, expect } from "bun:test"
import { importNetlist, isUndeclaredRefMessage } from "../../lib/kicad/netlist.ts"

const SAMPLE = `(export
  (version "E")
  (components
    (comp (ref "C1") (value ".1uF")
      (footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm")
      (libsource (lib "Device") (part "C")))
    (comp (ref "R1") (value "10k")
      (libsource (lib "Device") (part "R"))))
  (nets
    (net (code "1") (name "+5V")
      (node (ref "C1") (pin "1") (pintype "passive"))
      (node (ref "R1") (pin "1") (pintype "passive")))
    (net (code "2") (name "GND")
      (node (ref "C1") (pin "2") (pintype "passive"))
      (node (ref "R1") (pin "2") (pintype "passive")))))`

test("components carry designator, value, footprint and libsource part", () => {
  const n = importNetlist(SAMPLE)
  expect(n.components).toHaveLength(2)
  const c1 = n.components.find((c) => c.designator === "C1")
  expect(c1?.value).toBe(".1uF")
  expect(c1?.libPart).toBe("C")
  expect(c1?.footprint).toContain("C_Disc")
})

test("nets map to sorted designator.pin members", () => {
  const n = importNetlist(SAMPLE)
  expect(n.nets["+5V"]).toEqual(["C1.1", "R1.1"])
  expect(n.nets["GND"]).toEqual(["C1.2", "R1.2"])
})

test("a netlist with no components section throws", () => {
  expect(() => importNetlist(`(export (version "E") (nets))`))
    .toThrow(/no \(components\) section/i)
})

test("a netlist with no nets section throws", () => {
  expect(() => importNetlist(`(export (version "E") (components))`))
    .toThrow(/no \(nets\) section/i)
})

test("a node referencing an undeclared component throws", () => {
  const bad = `(export (components (comp (ref "C1") (value "1n")))
    (nets (net (code "1") (name "N") (node (ref "C1") (pin "1")) (node (ref "R9") (pin "1")))))`
  expect(() => importNetlist(bad)).toThrow(/"R9".*not declared/i)
})

test("isUndeclaredRefMessage recognises that throw's own message, and not an unrelated one", () => {
  // THE WORDING LIVES IN ONE PLACE. tools/pcb/update-from-schematic.ts re-raises
  // this error under its own net-member guard and has to recognise it; the
  // predicate is exported beside the throw so there is not a second copy of the
  // string in that file to drift. This pins the pairing from the library side:
  // a reword that forgot the predicate fails here.
  const bad = `(export (components (comp (ref "C1") (value "1n")))
    (nets (net (code "1") (name "N") (node (ref "R9") (pin "1")))))`
  let message = ""
  try {
    importNetlist(bad)
  } catch (error) {
    message = error instanceof Error ? error.message : String(error)
  }
  expect(message).not.toBe("")
  expect(isUndeclaredRefMessage(message)).toBe(true)
  expect(isUndeclaredRefMessage('component "C1" has no (value)')).toBe(false)
})

test("a (field) with no (name) names the component, and says why no name may be invented", () => {
  // A nameless field cannot be stored: a schematic field is identified only by
  // its name. The refusal must not merely restate that the name is missing -
  // this repository treats a rule that refuses with a restatement of itself as a
  // demand to question rather than a refusal to satisfy.
  const bad = `(export
    (components (comp (ref "C7") (value "1n") (fields (field "orphaned value"))))
    (nets (net (code "1") (name "N") (node (ref "C7") (pin "1")))))`
  expect(() => importNetlist(bad)).toThrow(/component "C7" has a \(field\) with no \(name\)/)
  expect(() => importNetlist(bad)).toThrow(/orphaned value/)
  expect(() => importNetlist(bad)).toThrow(/identified only by its name/)
})

test("a (fields) block with named fields is carried, and an empty value is the empty string", () => {
  const withFields = `(export
    (components (comp (ref "C7") (value "1n")
      (fields (field (name "Description") "a cap") (field (name "Datasheet")))
      (sheetpath (names "/") (tstamps "/")) (tstamps "a-uuid")))
    (nets (net (code "1") (name "N") (node (ref "C7") (pin "1")))))`
  const component = importNetlist(withFields).components[0]
  expect(component?.fields).toEqual({ Description: "a cap", Datasheet: "" })
  expect(component?.uuidPath).toBe("/a-uuid")
})
