import { expect, test } from "bun:test"
import { VENDORED_SYMBOLS } from "../../lib/kicad/symbol-library.ts"
import { PARITY_CIRCUITS, renderCensus, symbolCensus } from "../../tools/schgen/symbol-census.ts"

/**
 * `tools/schgen/symbol-census.ts` is the committed form of the measurement
 * `docs/known-gaps.md` **G118** records. These tests exist so it cannot rot
 * into a script nobody runs - a committed tool that nothing exercises is
 * exactly the shape this repository treats as a check that looks like it
 * passed while reading nothing.
 *
 * **THEY DO NOT PIN THE NUMBERS.** The counts are a MEASUREMENT: they change
 * when a circuit gains a part and when a symbol is vendored, and a test that
 * froze them would turn every such change into a failure that says nothing
 * about correctness. What is asserted is the census's own structure, plus the
 * one thing G118 states as a criterion rather than a figure - **every symbol a
 * parity circuit names resolves**.
 *
 * They do NOT skip when KiCad is absent: `symbolLibraries` refuses and the
 * test fails, for the reason `tests/kicad/symbol-library-disk.ts` gives.
 */

const CENSUS = symbolCensus()

test("the census covers all four parity circuits, by the entry point it names", () => {
  expect(CENSUS.circuits.map((c) => c.name)).toEqual(PARITY_CIRCUITS.map((c) => c.name))
  expect(CENSUS.circuits.length).toBe(4)
  for (const circuit of CENSUS.circuits) {
    // A circuit that built to nothing would make every count below pass for
    // the wrong reason.
    expect(circuit.components, circuit.name).toBeGreaterThan(0)
    expect(circuit.declaring, circuit.name).toBeLessThanOrEqual(circuit.components)
  }
})

test("the census finds symbols to measure, so it cannot pass over an empty set", () => {
  // A floor, not the count: the measured value at the time of writing is 10.
  // The named id is the one that reaches a part through a shared constructor
  // (circuits/transistor-preamp/parts.ts), which a text sweep would miss.
  expect(CENSUS.declared.size).toBeGreaterThanOrEqual(8)
  expect([...CENSUS.declared.keys()]).toContain("Device:R")
  for (const [libId, sites] of CENSUS.declared) {
    expect(sites.length, libId).toBeGreaterThan(0)
  }
})

test("every symbol a parity circuit names resolves, which is G118's criterion", () => {
  const unresolved = [...CENSUS.unresolved].map(([libId, why]) => `${libId}: ${why}`).sort()
  expect(
    unresolved,
    "these lib ids are declared by a parity circuit and resolve through neither the vendored " +
      "set nor the installed KiCad. A name is never guessed to make this pass: either vendor " +
      "the symbol, install the library, or record the shortfall in docs/known-gaps.md G118.",
  ).toEqual([])
  expect(CENSUS.resolved.size).toBe(CENSUS.declared.size)
  for (const [libId, { pins, units }] of CENSUS.resolved) {
    expect(pins, libId).toBeGreaterThan(0)
    expect(units, libId).toBeGreaterThan(0)
  }
})

test("the vendored split accounts for every declared id, in both directions", () => {
  // The split is what makes G118's real finding visible - an id that resolves
  // but is pinned by nothing - so a partition that lost an id would hide it.
  const vendored = new Set<string>(VENDORED_SYMBOLS)
  const declared = [...CENSUS.declared.keys()].sort()
  const accounted = [...new Set([...CENSUS.notVendored, ...declared.filter((id) => vendored.has(id))])].sort()
  expect(accounted).toEqual(declared)
  for (const id of CENSUS.notVendored) expect(vendored.has(id), id).toBe(false)
  for (const id of CENSUS.vendoredNotDeclared) expect(CENSUS.declared.has(id), id).toBe(false)
})

test("the rendered census names the entry point it read, so that claim cannot drift", () => {
  // G118's undiagnosed disagreement with the plan's line 831 is most likely a
  // difference of entry point, so the output has to say which one it used.
  const text = renderCensus(CENSUS)
  for (const { name, entry } of PARITY_CIRCUITS) expect(text).toContain(`${name} (${entry})`)
  expect(text).toContain("resolve: ")
  expect(text).toContain("declared but NOT vendored")
})
