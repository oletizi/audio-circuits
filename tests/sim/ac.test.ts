import { test, expect } from "bun:test"
import { runAcSweep } from "../../lib/sim/ac.ts"

const RC_NETLIST = [
  "RC lowpass analytic fixture",
  "V1 in 0 AC 1",
  "R1 in out 1000",
  "C1 out 0 159.1549431n",
  ".ac dec 20 10 100k",
  ".end",
].join("\n")

const FC = 1000 // 1 / (2*pi*1000*159.1549431n)

test("matches the analytic RC response at decade and corner frequencies", async () => {
  const [sweep] = await runAcSweep({ netlist: RC_NETLIST, nodes: ["out"] })
  expect(sweep.points).toHaveLength(81)

  for (const target of [10, 1000, 100000]) {
    const point = sweep.points.find(p => Math.abs(p.frequency - target) < target * 1e-9)
    if (!point) throw new Error(`No sweep point at ${target} Hz`)
    const magnitude = Math.hypot(point.real, point.imaginary)
    const phase = (Math.atan2(point.imaginary, point.real) * 180) / Math.PI
    const analyticMagnitude = 1 / Math.hypot(1, target / FC)
    const analyticPhase = (-Math.atan(target / FC) * 180) / Math.PI
    expect(Math.abs(magnitude - analyticMagnitude)).toBeLessThan(1e-9)
    expect(Math.abs(phase - analyticPhase)).toBeLessThan(1e-6)
  }
})

test("reports a requested node that the engine did not return", async () => {
  await expect(runAcSweep({ netlist: RC_NETLIST, nodes: ["nonexistent"] }))
    .rejects.toThrow("Node not present in simulation output: nonexistent")
})

test("surfaces netlist errors instead of returning empty data", async () => {
  const broken = ["broken", "R1 in out", ".ac dec 20 10 100k", ".end"].join("\n")
  await expect(runAcSweep({ netlist: broken, nodes: ["out"] })).rejects.toThrow()
})
