import { test, expect } from "bun:test"
import { runOperatingPoint } from "../../lib/sim/operating-point.ts"

test("a resistive divider sits at half its supply", async () => {
  const v = await runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["mid"],
  })
  expect(v["mid"]).toBeCloseTo(4.5, 3)
})

test("a node absent from the output throws, naming it", async () => {
  await expect(runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["nowhere"],
  })).rejects.toThrow(/nowhere/i)
})

test("an engine error is surfaced, not swallowed", async () => {
  await expect(runOperatingPoint({
    netlist: `broken
R1 a b
.op
.end`,
    nodes: ["a"],
  })).rejects.toThrow()
})

test("rejects an empty node request instead of returning an empty result", async () => {
  await expect(runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: [],
  })).rejects.toThrow("Empty node request: OperatingPointRequest.nodes must name at least one node")
})

test("resolves every requested node from a single call", async () => {
  const v = await runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.op
.end`,
    nodes: ["vcc", "mid"],
  })
  expect(v["vcc"]).toBeCloseTo(9, 3)
  expect(v["mid"]).toBeCloseTo(4.5, 3)
})

test("rejects a non-operating-point analysis with complex-valued output", async () => {
  const acDeck = [
    "RC lowpass analytic fixture",
    "V1 in 0 AC 1",
    "R1 in out 1000",
    "C1 out 0 159.1549431n",
    ".ac dec 20 10 100k",
    ".end",
  ].join("\n")
  await expect(runOperatingPoint({ netlist: acDeck, nodes: ["out"] }))
    .rejects.toThrow("Unexpected simulation data type: complex (expected real; check the .op line)")
})

test("rejects a node that resolves to more than one value, such as from a .dc sweep", async () => {
  // A .dc sweep also reports dataType "real" like .op does, so the data-type guard
  // alone cannot catch it: each requested node comes back as a multi-point series,
  // not a single bias value, and that has to be caught explicitly.
  await expect(runOperatingPoint({
    netlist: `divider
V1 vcc 0 DC 9
R1 vcc mid 10k
R2 mid 0 10k
.dc V1 0 9 1
.end`,
    nodes: ["mid"],
  })).rejects.toThrow(/mid.*10 values/i)
})
