import { test, expect } from "bun:test"
import { importNetlist } from "../../lib/kicad/netlist.ts"

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
