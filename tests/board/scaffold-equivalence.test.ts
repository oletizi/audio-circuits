import { test, expect } from "bun:test"
import { REFERENCE_FLAT, allStandIns, standIn } from "../../lib/board/scaffold/index.ts"
import { resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

const modules = partitionReference().modules
const SECTIONS = ["hi-boost", "hi-cut", "low-cut", "low-boost", "mid"] as const

test("GATE A1: a stand-in is a SUBSET of the section's flat-resolved components", () => {
  // Exact, with no tolerance. This is the real guarantee: nothing is being fitted, so
  // no numerical threshold should ever be what decides correctness. The numerical
  // boundary gate exists only to catch these invariants being implemented wrongly.
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const live = new Map(
      resolveSectionFlat(section, modules, REFERENCE_FLAT).components.map((c) => [c.id, c]),
    )
    for (const component of derived.components) {
      const original = live.get(component.id)
      expect(original, `${section}: ${component.id} is not a component of the section`)
        .toBeDefined()
      // Identical, not merely present: same kind, same parameters, same nets on the
      // same pins. A "subset" that silently changed a value would be an approximation.
      expect(component.kind, `${section}: ${component.id} kind`).toBe(original!.kind)
      expect(component.parameters, `${section}: ${component.id} parameters`)
        .toEqual(original!.parameters)
      expect(component.units, `${section}: ${component.id} pins`).toEqual(original!.units)
    }
  }
})

test("GATE A1: boundary node identities are unchanged by derivation", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const nodes = new Set(
      derived.components.flatMap((c) => c.units.flatMap((u) => Object.values(u.pins))),
    )
    for (const boundaryNet of derived.boundary) {
      expect(nodes.has(boundaryNet), `${section}: ${boundaryNet} vanished`).toBe(true)
    }
  }
})

test("no stand-in invents a net the section does not have", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const sectionNets = new Set(
      resolveSectionFlat(section, modules, REFERENCE_FLAT).components.flatMap((c) =>
        c.units.flatMap((u) => Object.values(u.pins)),
      ),
    )
    for (const component of derived.components) {
      for (const net of Object.values(component.units[0]!.pins)) {
        expect(sectionNets.has(net), `${section}: invented net ${net}`).toBe(true)
      }
    }
  }
})

test("a stand-in carries the flat state it emulates", () => {
  expect(standIn("hi-cut", modules, REFERENCE_FLAT).flat).toEqual(REFERENCE_FLAT)
})

test("the isolation count matches the spec", () => {
  const expected: Record<string, number> = {
    "hi-boost": 1,
    "hi-cut": 1,
    "low-cut": 1,
    "low-boost": 2,
    mid: 2,
  }
  let total = 0
  for (const section of SECTIONS) {
    const count = standIn(section, modules, REFERENCE_FLAT).isolation.length
    expect(count, section).toBe(expected[section]!)
    total += count
  }
  expect(total).toBe(7)
})

test("every section's stand-in is smaller than the section", () => {
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const resolved = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    expect(derived.components.length, section).toBeLessThan(resolved.components.length)
  }
})

test("hi-boost's stand-in keeps the reactive bridge, not just the ladder arm", () => {
  // The branch whose absence made the resistor-only approach wrong by 8.23 dB. Nobody
  // wrote it down; the derivation found it. If this ever reduces to resistors only,
  // the reduction has started discarding live reactance.
  const derived = standIn("hi-boost", modules, REFERENCE_FLAT)
  const kinds = new Set(derived.components.map((c) => c.kind))
  expect(kinds.has("inductor")).toBe(true)
  expect(kinds.has("capacitor")).toBe(true)
})

test("mid's stand-in keeps its inductor tap", () => {
  // Standing in for an absent mid needs a 1 H inductor, which is the part mid's model
  // specifies electrically with no part number. The contract surfaces that; it does
  // not resolve it.
  const derived = standIn("mid", modules, REFERENCE_FLAT)
  const inductors = derived.components.filter((c) => c.kind === "inductor")
  expect(inductors).toHaveLength(1)
  expect(inductors[0]!.parameters).toEqual({ henries: 1 })
})

test("a section sharing fewer than two nets refuses rather than returning nothing", () => {
  const isolated = { lonely: modules["low-boost"]!, other: [] }
  expect(() => standIn("lonely", isolated, REFERENCE_FLAT)).toThrow(/boundary net/)
})

test("allStandIns covers every section, in a stable order", () => {
  const all = allStandIns(modules, REFERENCE_FLAT)
  expect(Object.keys(all)).toEqual([...SECTIONS].sort())
})

test("derivation is deterministic", () => {
  expect(JSON.stringify(allStandIns(modules, REFERENCE_FLAT)))
    .toBe(JSON.stringify(allStandIns(modules, REFERENCE_FLAT)))
})
