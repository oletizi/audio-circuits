import { test, expect } from "bun:test"
import { importLegacyNetlist, writeLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { toImportedNetlist } from "../../lib/kicad/from-network.ts"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core/pt2399-core.ts"
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

/**
 * FIXTURE predates the operator's schematic correction to C2 (see the module
 * comment in circuits/pt2399-core/pt2399-core.ts): it was the netlist VeroRoute actually
 * consumed to lay out the board that was built, back when C2 still carried
 * an inflated CAP_ELECTRO_300 footprint to buy pad span the fork could not
 * yet stretch a radial electrolytic's leads to provide. It stays checked in
 * as a genuine historical artifact, and its provenance comment stays true.
 *
 * Every other component must still reproduce exactly - dropping to a subset
 * comparison here would hide a real regression anywhere else in the chain.
 */
function dropComponent(netlist: ImportedNetlist, designator: string): ImportedNetlist {
  return {
    components: netlist.components.filter((c) => c.designator !== designator),
    nets: netlist.nets,
  }
}

test("the full chain reproduces the netlist the built board was laid out from, except C2", async () => {
  const fixture = importLegacyNetlist(await Bun.file(FIXTURE).text())
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)
  const ours = importLegacyNetlist(writeLegacyNetlist(lowered, { createdAt: CREATED_AT }))

  const fixtureC2 = fixture.components.find((c) => c.designator === "C2")
  const oursC2 = ours.components.find((c) => c.designator === "C2")
  if (fixtureC2 === undefined) throw new Error("C2 missing from the fixture")
  if (oursC2 === undefined) throw new Error("C2 missing from our derivation")
  // The one asserted, explained divergence: see the doc comment above.
  expect(fixtureC2.footprint).toBe("CAP_ELECTRO_300")
  expect(oursC2.footprint).toBe("CAP_ELECTRO_200")

  expect(normalize(dropComponent(ours, "C2"))).toEqual(normalize(dropComponent(fixture, "C2")))
})

/**
 * F8: closes the writer's unverified-behaviour gap. Every round-trip proof
 * above re-parses the written text through `importLegacyNetlist`, which
 * treats both the trailing "*" EOF marker and the header brace comment as
 * optional - so a writer that dropped either would still pass every one of
 * them. This compares the written TEXT against the fixture text directly,
 * normalizing away exactly what the pipeline does not carry: the uuid field
 * (never read back by anything downstream) and component block order (a set,
 * not a sequence - nothing in the model orders components).
 */
/** The designator a component block's first line names: "( /UUID <type>  <designator> <value>". */
function blockDesignator(block: string[]): string {
  const firstLine = block[0]
  if (firstLine === undefined) throw new Error("empty component block")
  const tokens = firstLine.trim().split(/\s+/)
  const designator = tokens[3]
  if (designator === undefined) {
    throw new Error(`could not read a designator out of component block first line: "${firstLine}"`)
  }
  return designator
}

/**
 * excludeDesignators drops named component blocks entirely before comparing -
 * used to carve out C2, whose footprint text is the one asserted, explained
 * divergence from this pre-correction fixture (see the doc comment on
 * dropComponent above).
 */
function normalizeNetlistText(text: string, excludeDesignators: readonly string[] = []): string {
  const uuidNormalized = text.replace(/\( \/\S+/g, "( /UUID")
  const lines = uuidNormalized.split("\n")
  const header = lines[0]
  const blocks: string[][] = []
  let current: string[] | null = null
  let rest: string[] = []
  let i = 1
  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) break
    if (current === null) {
      if (line === ")") {
        rest = lines.slice(i)
        break
      }
      current = [line]
    } else {
      current.push(line)
      if (line === " )") {
        blocks.push(current)
        current = null
      }
    }
    i++
  }
  const kept = blocks.filter((block) => !excludeDesignators.includes(blockDesignator(block)))
  const sortedBlocks = kept.map((block) => block.join("\n")).sort()
  return [header, ...sortedBlocks, ...rest].join("\n")
}

test("the written netlist's text matches the fixture, modulo uuid and block order, except C2", async () => {
  const fixtureText = await Bun.file(FIXTURE).text()
  const lowered = toImportedNetlist(pt2399Core(), DESIGNATORS, PIN_NUMBERS)
  const writtenText = writeLegacyNetlist(lowered, { createdAt: CREATED_AT })

  // The one asserted, explained divergence: see dropComponent's doc comment above.
  expect(fixtureText).toContain("CAP_ELECTRO_300  C2")
  expect(writtenText).toContain("CAP_ELECTRO_200  C2")

  expect(normalizeNetlistText(writtenText, ["C2"])).toBe(normalizeNetlistText(fixtureText, ["C2"]))
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

test("an orphan net member naming an undeclared component refuses, not silently drops it", () => {
  const netlist: ImportedNetlist = {
    components: [{ designator: "R1", value: "10K", footprint: "RESISTOR4" }],
    nets: { IN: ["R1.1"], GND: ["R1.2", "R99.1"] },
  }
  expect(() => writeLegacyNetlist(netlist, { createdAt: CREATED_AT })).toThrow(/GND.*R99/s)
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
