import { test, expect } from "bun:test"
import { pt2399Core, DESIGNATORS, PIN_NUMBERS } from "../../circuits/pt2399-core.ts"
import { importNetlist } from "../../lib/kicad/netlist.ts"
import { importLegacyNetlist } from "../../lib/kicad/legacy-netlist.ts"
import { parseValue } from "../../lib/model/units.ts"
import type { Network } from "../../lib/model/types.ts"

/** Our network expressed the way the KiCad netlist expresses itself. */
function asDesignatorNets(n: Network): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const add = (netName: string, member: string) => {
    ;(out[netName] ??= []).push(member)
  }
  for (const component of n.components) {
    const designator = DESIGNATORS[component.id]
    if (designator === undefined) throw new Error(`no designator mapped for "${component.id}"`)
    for (const unit of component.units) {
      for (const [pin, conn] of Object.entries(unit.pins)) {
        if (conn.kind === "nc") continue
        const number = PIN_NUMBERS[component.kind]?.[pin] ?? pin
        add(conn.net, `${designator}.${number}`)
      }
    }
  }
  for (const key of Object.keys(out)) out[key] = (out[key] ?? []).sort()
  return out
}

const built = async () =>
  importLegacyNetlist(await Bun.file("tests/fixtures/pt2399-core-veroroute.net").text())

test("the authored network matches the netlist of the built unit", async () => {
  const imported = await built()
  const ours = asDesignatorNets(pt2399Core())

  // Compare connectivity as sets of members, keyed by net name.
  expect(Object.keys(ours).sort()).toEqual(Object.keys(imported.nets).sort())
  for (const [name, members] of Object.entries(imported.nets)) {
    expect(ours[name]).toEqual([...members])
  }
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

    // The PT2399 (ic) and the header (connector) carry a part name in the
    // netlist's "value" field (e.g. "PT2399", "Conn_01x05"), not a quantity -
    // there is nothing numeric to compare for these kinds, so they are
    // skipped explicitly rather than falling through a numeric check by
    // accident.
    if (authored.kind === "ic" || authored.kind === "connector") continue

    const expected = parseValue(c.value)
    const label = `${c.designator} (${authored.kind}, netlist value "${c.value}")`
    if (authored.kind === "resistor" && "ohms" in authored.parameters) {
      expect(authored.parameters.ohms, label).toBe(expected)
    } else if (authored.kind === "capacitor" && "farads" in authored.parameters) {
      expect(authored.parameters.farads, label).toBe(expected)
    } else {
      throw new Error(
        `component "${c.designator}" (kind "${authored.kind}") has no numeric ` +
          "parameter this test knows how to compare",
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
