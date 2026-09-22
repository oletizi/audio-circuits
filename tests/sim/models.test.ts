import { test, expect } from "bun:test"
import { deviceModel, allModels } from "../../lib/sim/models/index.ts"

test("a discrete model carries its SPICE text and its provenance", () => {
  const d = deviceModel("1N4148")
  expect(d.category).toBe("discrete")
  expect(d.spice).toMatch(/^\.model\s+1N4148\s+D\(/im)
  expect(d.provenance.length).toBeGreaterThan(0)
})

test("an unknown model throws, listing what is known", () => {
  // /NOT_A_PART.*known/i would match a message with an empty list (it only
  // needs to reach the word "known" and stop); this instead requires the
  // message to actually name a registered model after "Known models:".
  expect(() => deviceModel("NOT_A_PART")).toThrow(/Known models:.*1N4148/)
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

// Nothing else compares pinOrder to the .subckt line itself - both are only
// ever checked against constants. Permuting the .subckt argument list, or
// permuting pinOrder, would leave every other test green while every
// amplifier the emitter produces is wired to the wrong pins. This sweep
// parses the node list straight off each subcircuit-backed model's own
// .subckt line and checks it against that same entry's pinOrder length.
test("every subcircuit-backed model's pinOrder matches its .subckt argument count", () => {
  for (const m of allModels()) {
    const subcktLine = m.spice.match(/^\.subckt\s+\S+\s+(.+)$/im)
    if (!subcktLine) continue
    const nodes = subcktLine[1].trim().split(/\s+/)
    expect(
      m.pinOrder?.length,
      `${m.name} declares ${nodes.length} .subckt node(s) (${nodes.join(", ")}) but pinOrder has a different length`,
    ).toBe(nodes.length)
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
  // Confirms the text really is the model it claims - name, category and
  // pinOrder alone would still pass if `spice` were empty, truncated, or
  // loaded from the wrong file.
  expect(d.spice).toMatch(/^\.model\s+2N3904\s+NPN\(/im)
})

test("IDEAL_OPAMP resolves directly to its own entry with its declared pin order", () => {
  const d = deviceModel("IDEAL_OPAMP")
  expect(d.name).toBe("IDEAL_OPAMP")
  expect(d.category).toBe("behavioural")
  // Must match the argument order of
  // ".subckt IDEAL_OPAMP inp inn out vplus vminus" exactly: the emitter
  // reads pinOrder to place its arguments, and a wrong order here would
  // wire a real circuit's signals into the wrong pins without any error -
  // a silently mis-wired amplifier.
  expect(d.pinOrder).toEqual(["in+", "in-", "out", "v+", "v-"])
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

test("2N3904's SPICE text actually simulates a common-emitter stage", async () => {
  const { runOperatingPoint } = await import("../../lib/sim/operating-point.ts")
  const d = deviceModel("2N3904")
  const v = await runOperatingPoint({
    netlist: [
      "common-emitter",
      "V1 vcc 0 DC 10",
      "Rb vcc base 470k",
      "Rc vcc coll 4.7k",
      "Q1 coll base 0 2N3904",
      d.spice,
      ".op",
      ".end",
    ].join("\n"),
    nodes: ["base", "coll"],
  })
  // A forward-biased silicon base-emitter junction sits roughly 0.6-0.75V.
  // Bounds are physically meaningful, not the run's own printed digits, so
  // a legitimate model refinement would not fail this while a broken model
  // (e.g. the base-emitter junction not conducting at all) would.
  expect(v["base"]).toBeGreaterThan(0.6)
  expect(v["base"]).toBeLessThan(0.75)
  // The collector must be pulled well below the 10V supply, showing real
  // conduction through Rc rather than the transistor sitting off.
  expect(v["coll"]).toBeGreaterThan(0)
  expect(v["coll"]).toBeLessThan(5)
})
