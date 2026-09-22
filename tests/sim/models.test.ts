import { test, expect } from "bun:test"
import { deviceModel, allModels } from "../../lib/sim/models/index.ts"

test("a discrete model carries its SPICE text and its provenance", () => {
  const d = deviceModel("1N4148")
  expect(d.category).toBe("discrete")
  expect(d.spice).toMatch(/^\.model\s+1N4148\s+D\(/im)
  expect(d.provenance.length).toBeGreaterThan(0)
})

test("an unknown model throws, listing what is known", () => {
  expect(() => deviceModel("NOT_A_PART")).toThrow(/NOT_A_PART.*known/i)
})

test("every registered model declares a non-empty provenance", () => {
  for (const m of allModels()) {
    expect(m.provenance.length, `${m.name} has no provenance`).toBeGreaterThan(0)
  }
})

test("every subcircuit-backed model declares a pin order", () => {
  for (const m of allModels()) {
    if (m.spice.match(/^\.subckt/im)) {
      expect(m.pinOrder, `${m.name} is a subcircuit but declares no pinOrder`).toBeDefined()
    }
  }
})

// The two sweep tests above iterate allModels(): each is vacuously true over
// an empty (or truncated) registry, since a for-loop over nothing runs no
// expect() calls. This test pins the registry down directly so an empty or
// wrong-shaped allModels() fails loudly here instead of satisfying every
// invariant by having nothing left to check. Count and membership are both
// asserted: count alone would survive a registry that swapped an entry for a
// duplicate; membership alone would survive one that silently grew a fourth
// entry.
test("the registry holds exactly its three expected entries, no more and no fewer", () => {
  const all = allModels()
  expect(all.length).toBe(3)
  expect(all.map(m => m.name).sort()).toEqual(["1N4148", "2N3904", "IDEAL_OPAMP"])
})

test("2N3904 resolves directly to its own registered entry", () => {
  const d = deviceModel("2N3904")
  expect(d.name).toBe("2N3904")
  expect(d.category).toBe("discrete")
})

test("IDEAL_OPAMP resolves directly to its own entry with its declared pin order", () => {
  const d = deviceModel("IDEAL_OPAMP")
  expect(d.name).toBe("IDEAL_OPAMP")
  expect(d.category).toBe("behavioural")
  // Must match the argument order of ".subckt IDEAL_OPAMP inp inn out"
  // exactly: the emitter reads pinOrder to place its arguments, and a wrong
  // order here would wire a real circuit's signals into the wrong pins
  // without any error - a silently mis-wired amplifier.
  expect(d.pinOrder).toEqual(["in+", "in-", "out"])
})

test("a registered model's SPICE text actually simulates", async () => {
  const { runOperatingPoint } = await import("../../lib/sim/operating-point.ts")
  const d = deviceModel("1N4148")
  const v = await runOperatingPoint({
    netlist: `probe\nV1 in 0 DC 1\nR1 in a 1k\nD1 a 0 1N4148\n${d.spice}\n.op\n.end`,
    nodes: ["a"],
  })
  expect(v["a"]).toBeGreaterThan(0.3)
  expect(v["a"]).toBeLessThan(0.9)
})
