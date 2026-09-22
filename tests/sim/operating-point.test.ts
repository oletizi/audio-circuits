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
