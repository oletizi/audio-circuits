import { test, expect } from "bun:test"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"

const SAMPLE = `( { EESchema Netlist Version 1.1 created  2026-09-15T21:32:09 }
 ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
  (    1 Net-(C12-Pad1) )
  (    2 GND )
 )
 ( /304173c5-1ea4-4fe8-87ec-61bada675f8a RESISTOR4  R7 10K
  (    1 Net-(C12-Pad1) )
  (    2 Net-(U1-LPF2-IN) )
 )
)`

test("components carry designator, value and footprint", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.components).toHaveLength(2)
  const c12 = n.components.find((c) => c.designator === "C12")
  expect(c12?.value).toBe("5600pF")
  expect(c12?.footprint).toBe("CAP_CERAMIC1")
})

test("nets map to sorted designator.pin members", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.nets["Net-(C12-Pad1)"]).toEqual(["C12.1", "R7.1"])
  expect(n.nets["GND"]).toEqual(["C12.2"])
})

test("net names containing parentheses survive tokenising", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(Object.keys(n.nets)).toContain("Net-(U1-LPF2-IN)")
})

test("the brace header is not mistaken for a component", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.components.map((c) => c.designator).sort()).toEqual(["C12", "R7"])
})

test("a stray token at the top level throws instead of being silently skipped", () => {
  const bad = `( { header }
   GARBAGE
   ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
    (    1 GND )
   )
  )`
  expect(() => importLegacyNetlist(bad)).toThrow(/unexpected token "GARBAGE"/i)
})

test("a stray extra ) between component forms throws instead of being silently absorbed", () => {
  // Simulates a component form whose content was lost but whose closing
  // paren survived: a bare ")" sits where a second component form's
  // remnant would be, ahead of a real, well-formed component form.
  const bad = `( { header }
   )
   ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
    (    1 GND )
   )
  )`
  expect(() => importLegacyNetlist(bad)).toThrow(/unexpected|trailing/i)
})

test("trailing tokens after the terminal ) throw", () => {
  const bad = `( { header }
   ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
    (    1 GND )
   )
  )
  ( /304173c5-1ea4-4fe8-87ec-61bada675f8a RESISTOR4  R7 10K
   (    1 GND )
  )`
  expect(() => importLegacyNetlist(bad)).toThrow(/trailing/i)
})

test("a truncated netlist that never closes throws", () => {
  const bad = `( { header }
   ( /04737d7e-1324-4a9b-8c05-3227c13a478c CAP_CERAMIC1  C12 5600pF
    (    1 GND )
   )`
  expect(() => importLegacyNetlist(bad)).toThrow(/never closes|close/i)
})

test("a real EESchema export's trailing end-of-file marker is accepted", () => {
  // EESchema always appends a bare "*" after the closing paren; VeroRoute-fed
  // exports (e.g. the pt2399-core fixture) always carry it.
  const withEof = `${SAMPLE}\n*\n`
  const n = importLegacyNetlist(withEof)
  expect(n.components).toHaveLength(2)
})

test("trailing content after the end-of-file marker still throws", () => {
  const bad = `${SAMPLE}\n* GARBAGE\n`
  expect(() => importLegacyNetlist(bad)).toThrow(/trailing/i)
})

test("a well-formed netlist still parses exactly as before", () => {
  const n = importLegacyNetlist(SAMPLE)
  expect(n.components).toEqual([
    { designator: "C12", value: "5600pF", footprint: "CAP_CERAMIC1" },
    { designator: "R7", value: "10K", footprint: "RESISTOR4" },
  ])
  expect(n.nets).toEqual({
    "Net-(C12-Pad1)": ["C12.1", "R7.1"],
    "GND": ["C12.2"],
    "Net-(U1-LPF2-IN)": ["R7.2"],
  })
})
