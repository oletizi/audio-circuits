import { test, expect } from "bun:test"
import { importLegacyNetlist, writeLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core.ts"
import type { ImportedNetlist } from "../../lib/kicad/netlist.ts"

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

/** Component order is a set, so compare it sorted. Nets are already sorted by the reader. */
function normalize(netlist: ImportedNetlist) {
  return {
    components: [...netlist.components].sort((a, b) => a.designator.localeCompare(b.designator)),
    nets: netlist.nets,
  }
}

const FIXTURE = "tests/fixtures/pt2399-core-veroroute.net"
const CREATED_AT = "2026-09-15T21:32:09"

test("the writer is self-consistent through the reader", async () => {
  const a = importLegacyNetlist(await Bun.file(FIXTURE).text())
  const b = importLegacyNetlist(writeLegacyNetlist(a, { createdAt: CREATED_AT }))
  expect(normalize(b)).toEqual(normalize(a))
})

test("the full chain reproduces the netlist the built board was laid out from", async () => {
  const fixture = importLegacyNetlist(await Bun.file(FIXTURE).text())
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)
  const ours = importLegacyNetlist(writeLegacyNetlist(lowered, { createdAt: CREATED_AT }))
  expect(normalize(ours)).toEqual(normalize(fixture))
})

test("renaming a net without changing its membership is not an electrical change", async () => {
  // WHY THIS EXISTS. The two assertions above compare `nets` maps keyed by NAME,
  // which is stricter than the identity model requires: a net renamed without a
  // membership change is the same net, and reconciliation would treat it as a
  // no-op. The strictness is kept because it currently holds and a stricter
  // passing assertion is a better statement - but it invites the reading that
  // names ARE identity, which is the failure the membership model exists to
  // prevent. This workflow was built to survive KiCad's generated net names
  // migrating between electrical nets.
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)

  const renamed = {
    components: lowered.components,
    nets: Object.fromEntries(
      Object.entries(lowered.nets).map(([name, members]) =>
        [name.startsWith("Net-(") ? `renamed_${name.length}_${members.join("_")}` : name, members]),
    ),
  }

  // Membership comparison: the set of nets as sorted member lists, names discarded.
  const membership = (netlist: ImportedNetlist) =>
    Object.values(netlist.nets).map((members) => [...members].sort().join(",")).sort()

  const viaRenamed = importLegacyNetlist(writeLegacyNetlist(renamed, { createdAt: CREATED_AT }))
  const fixture = importLegacyNetlist(await Bun.file(FIXTURE).text())
  expect(membership(viaRenamed)).toEqual(membership(fixture))
})

test("net names containing parentheses survive a write/read round trip", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "C12", value: "5600pF", footprint: "CAP_CERAMIC1" }],
    nets: { "Net-(C12-Pad1)": ["C12.1"], GND: ["C12.2"] },
  }
  const reread = importLegacyNetlist(writeLegacyNetlist(netlist, { createdAt: CREATED_AT }))
  expect(reread.nets["Net-(C12-Pad1)"]).toEqual(["C12.1"])
})

test("a component with no pins refuses rather than writing a part VeroRoute cannot place", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R9", value: "10K", footprint: "RESISTOR4" }],
    nets: {},
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(/R9/)
})

// Every field below becomes its own whitespace-delimited token in the written file.
// A field written empty or containing whitespace shifts the token stream, and the
// reader then throws pointing at whichever field happens to fall out of alignment -
// not the field that is actually wrong. These five tests pin that the writer catches
// each such field AT WRITE TIME, and that the message names the actual offending field.

test("write refuses a designator containing whitespace, naming the designator field", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R 9", value: "10K", footprint: "RESISTOR4" }],
    nets: { GND: ["R 9.1"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(
    /designator.*must not contain whitespace.*R 9/,
  )
})

test("write refuses a value containing whitespace, naming the value field", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R9", value: "10 K", footprint: "RESISTOR4" }],
    nets: { GND: ["R9.1"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(
    /value.*must not contain whitespace.*10 K/,
  )
})

test("write refuses a footprint containing whitespace, naming the footprint field", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R9", value: "10K", footprint: "RESISTOR 4" }],
    nets: { GND: ["R9.1"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(
    /footprint.*must not contain whitespace.*RESISTOR 4/,
  )
})

test("write refuses a net name containing whitespace, naming the net name field", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R9", value: "10K", footprint: "RESISTOR4" }],
    nets: { "Net 1": ["R9.1"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(
    /net name.*must not contain whitespace.*Net 1/,
  )
})

test("write refuses a pin label containing whitespace, naming the pin label field", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "U1", value: "PT2399", footprint: "DIP16" }],
    nets: { GND: ["U1.1 6"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(
    /pin label.*must not contain whitespace.*1 6/,
  )
})
