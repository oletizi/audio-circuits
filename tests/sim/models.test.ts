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
