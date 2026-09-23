import { test, expect } from "bun:test"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { parseValue } from "../../lib/model/units.ts"
import { net } from "../../lib/model/types.ts"
import type { Connection, Network } from "../../lib/model/types.ts"

/** Our network expressed the way the KiCad netlist expresses itself. */
function asDesignatorNets(
  n: Network,
  designators: Readonly<Record<string, string>>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (netName: string, member: string) => {
    ;(out[netName] ??= []).push(member)
  }
  const addPins = (
    kind: string,
    designator: string,
    pins: Readonly<Record<string, Connection>>,
  ) => {
    for (const [pin, conn] of Object.entries(pins)) {
      if (conn.kind === "nc") continue
      const number = PIN_NUMBERS[kind]?.[pin] ?? pin
      add(conn.net, `${designator}.${number}`)
    }
  }
  for (const component of n.components) {
    const designator = designators[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    addPins(component.kind, designator, component.pins)
    for (const unit of component.units) {
      addPins(component.kind, designator, unit.pins)
    }
  }
  for (const key of Object.keys(out)) out[key] = (out[key] ?? []).sort()
  return out
}

const built = async () =>
  importLegacyNetlist(await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text())

test("the authored network matches the netlist of the built unit", async () => {
  const imported = await built()
  const ours = asDesignatorNets(pt2399Core(), DESIGNATORS)

  // Compare connectivity as sets of members, keyed by net name.
  expect(Object.keys(ours).sort()).toEqual(Object.keys(imported.nets).sort())
  for (const [name, members] of Object.entries(imported.nets)) {
    expect(ours[name]).toEqual([...members])
  }
})

test("the designator map walks package pins, not only unit pins", () => {
  const withPackagePins: Network = {
    components: [{
      id: "amp", kind: "opamp", parameters: {},
      pins: { "v+": net("VCC"), "v-": net("GND") },
      units: [{ name: "A", pins: { "in+": net("IN"), "in-": net("FB"), out: net("FB") } }],
    }, {
      id: "load", kind: "resistor", parameters: { ohms: 1000 },
      pins: {}, units: [{ name: "MAIN", pins: { a: net("VCC"), b: net("GND") } }],
    }],
    ports: { IN: "IN" },
  }
  const nets = asDesignatorNets(withPackagePins, { amp: "U9", load: "R9" })
  expect(nets["VCC"]).toContain("U9.v+")
  expect(nets["GND"]).toContain("U9.v-")
})

test("every component in the built unit is present, with its value", async () => {
  const imported = await built()
  const ours = pt2399Core()
  expect(ours.components).toHaveLength(imported.components.length)

  const byDesignator = new Map(ours.components.map((c) => [DESIGNATORS[c.id], c]))
  for (const c of imported.components) {
    const authored = byDesignator.get(c.designator)
    if (authored === undefined) {
      throw new Error(`no authored component maps to designator "${c.designator}"`)
    }

    const label = `${c.designator} (${authored.kind}, netlist value "${c.value}")`

    // The netlist's "value" field means something different per kind, and
    // that mapping is made explicit here rather than left implicit:
    //   - resistor / capacitor: value is a quantity -> compare to parameters.
    //   - ic: value is the part's genuine manufacturer part number
    //     (e.g. "PT2399") -> compare to part.mpn.
    //   - connector: value is a KiCad generic-connector *symbol* name
    //     (e.g. "Conn_01x05"), not a manufacturer part number -> compare to
    //     the part name half of part.symbol ("Lib:Part").
    // The final `else { throw }` guard means a future kind cannot silently
    // fall out of this check.
    if (authored.kind === "resistor" && "ohms" in authored.parameters) {
      const expected = parseValue(c.value)
      expect(authored.parameters.ohms, label).toBe(expected)
    } else if (authored.kind === "capacitor" && "farads" in authored.parameters) {
      const expected = parseValue(c.value)
      expect(authored.parameters.farads, label).toBe(expected)
    } else if (authored.kind === "ic") {
      expect(authored.part?.mpn, label).toBe(c.value)
    } else if (authored.kind === "connector") {
      const symbol = authored.part?.symbol
      const symbolPart = symbol?.split(":").at(-1)
      expect(symbolPart, label).toBe(c.value)
    } else {
      throw new Error(
        `component "${c.designator}" (kind "${authored.kind}") has no part ` +
          "identity this test knows how to compare",
      )
    }
  }
})

/**
 * The board was built from the VeroRoute netlist; the s-expression export came
 * from the same schematic 22 minutes later. Asserting they agree is what
 * licenses Plan C to use pt2399-core.kicad_sch as a fixture for a circuit known
 * to work. Net NAMES are ignored - the two exporters generate them differently
 * and only the partition carries electrical meaning.
 */
test("the schematic export describes the same circuit as the built board", async () => {
  const legacy = await built()
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())

  const partition = (n: { nets: Readonly<Record<string, readonly string[]>> }) =>
    Object.values(n.nets)
      .map((members) => [...members].sort().join(" "))
      .sort()

  expect(partition(modern)).toEqual(partition(legacy))

  const values = (cs: readonly { designator: string; value: string }[]) =>
    Object.fromEntries(cs.map((c) => [c.designator, c.value]))
  expect(values(modern.components)).toEqual(values(legacy.components))
})

test("every component's footprint matches the netlist of the built unit", async () => {
  const modern = importNetlist(await Bun.file("tests/fixtures/pt2399-core.net").text())
  const byDesignator = new Map(modern.components.map((c) => [c.designator, c.footprint]))

  for (const component of pt2399Core().components) {
    const designator = DESIGNATORS[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    const expected = byDesignator.get(designator)
    if (expected === undefined) throw new Error(`${designator} is absent from the netlist`)
    expect(component.part?.footprint).toBe(expected)
  }
})
