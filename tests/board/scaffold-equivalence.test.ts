import { test, expect } from "bun:test"
import { REFERENCE_FLAT, allStandIns, standIn } from "../../lib/board/scaffold/index.ts"
import { resolveSectionFlat } from "../../lib/board/scaffold/flat.ts"
import { boundaryAdmittance } from "../../lib/board/scaffold/admittance.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"
import type { ResolvedComponent } from "../../lib/model/control-state.ts"

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

const SAMPLE_HZ = [20, 50, 120, 300, 800, 2000, 5000, 12000, 20000]
const RELATIVE = 1e-9
const FLOOR = 1e-15

test("GATE A2: stand-in and real flat section agree on boundary admittance", () => {
  // Solver-noise tolerances, not perceptual ones: Gate A1 has already shown the two
  // networks are structurally identical, so anything above arithmetic noise is a
  // defect. If this ever needs loosening, the reduction has started approximating.
  for (const section of SECTIONS) {
    const derived = standIn(section, modules, REFERENCE_FLAT)
    const whole = resolveSectionFlat(section, modules, REFERENCE_FLAT)
    const boundary = new Set(derived.boundary)
    for (const hz of SAMPLE_HZ) {
      const reduced = boundaryAdmittance(derived.components, boundary, hz)
      const full = boundaryAdmittance(whole.components, boundary, hz)
      expect(reduced.size, `${section} @${hz}Hz matrix size`).toBe(full.size)
      for (const [key, expected] of full) {
        const actual = reduced.get(key)
        expect(actual, `${section} ${key} @${hz}Hz missing`).toBeDefined()
        for (const part of ["re", "im"] as const) {
          const tolerance = Math.max(Math.abs(expected[part]) * RELATIVE, FLOOR)
          expect(
            Math.abs(actual![part] - expected[part]),
            `${section} ${key}.${part} @${hz}Hz: ${actual![part]} vs ${expected[part]}`,
          ).toBeLessThanOrEqual(tolerance)
        }
      }
    }
  }
})

test("GATE A2 can fail: perturbing one value breaks the agreement", () => {
  // A gate that cannot fail proves nothing, exactly as with the intent gate. Change
  // low-boost's 56k by one part in a thousand and the comparison must notice.
  const derived = standIn("low-boost", modules, REFERENCE_FLAT)
  const boundary = new Set(derived.boundary)
  const perturbed = derived.components.map((component) =>
    component.id === "R2"
      ? { ...component, parameters: { ohms: 56_000 * 1.001 } }
      : component,
  )
  const good = boundaryAdmittance(derived.components, boundary, 1000)
  const bad = boundaryAdmittance(perturbed, boundary, 1000)
  let worst = 0
  for (const [key, expected] of good) {
    const actual = bad.get(key)!
    worst = Math.max(worst, Math.abs(actual.re - expected.re), Math.abs(actual.im - expected.im))
  }
  expect(worst).toBeGreaterThan(FLOOR)
})

test("boundary admittance refuses a one-terminal network", () => {
  const derived = standIn("low-boost", modules, REFERENCE_FLAT)
  expect(() => boundaryAdmittance(derived.components, new Set(["out"]), 1000))
    .toThrow(/at least two boundary nets/)
})

test("boundary admittance refuses a kind it has no branch rule for", () => {
  // Never default an unknown kind to zero: a silently omitted branch would read as
  // agreement.
  const opamp: ResolvedComponent = {
    id: "buffer_amp",
    kind: "opamp",
    parameters: {},
    pins: {},
    units: [{ name: "MAIN", pins: { "in+": "IN", out: "OUT" } }],
  }
  expect(() => boundaryAdmittance([opamp], new Set(["IN", "OUT"]), 1000))
    .toThrow(/No branch admittance/)
})
