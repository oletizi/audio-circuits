import { test, expect } from "bun:test"
import type { ReactElement } from "react"
import {
  renderCircuit,
  type CircuitElement,
} from "./circuit-assertions.ts"
import { classifyLabels, computeSchematicMetrics } from "./schematic-metrics.ts"

/**
 * Unit tests for the readability classifier itself.
 *
 * These exist because `gratuitousLabels` reached 0 on the compressor the
 * moment the `junction` class was introduced, which is indistinguishable
 * from having defined the problem away. A metric that cannot be shown to
 * fire is not a metric. Each test below constructs the defect deliberately
 * and asserts the classifier catches it.
 */

const justificationsFor = async (node: ReactElement) => {
  const el = await renderCircuit(
    <board width="60mm" height="40mm">
      {node}
    </board>,
  )
  return { el, classified: classifyLabels(el) }
}

test("a 2-terminal named net IS gratuitous - a wire is strictly better", async () => {
  const { classified } = await justificationsFor(
    <group>
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <net name="MID" />
      <trace from=".R1 > .pin2" to="net.MID" />
      <trace from=".R2 > .pin1" to="net.MID" />
    </group>,
  )
  const mid = classified.filter((c) => c.text === "MID")
  expect(mid.length).toBeGreaterThan(0)
  for (const c of mid) expect(c.justification).toBe("gratuitous")
})

test("a short net name yields a narrower label than the pin-to-pin auto-name", async () => {
  // THE RELIABLE DIFFERENCE, measured. Two earlier claims of mine were
  // wrong and are retracted here:
  //   "pin-to-pin produces no label at all"  - it does, in some contexts
  //   "pin-to-pin produces fewer labels"     - not for a 2-terminal net;
  //                                            both produce exactly one
  // What IS stable is label WIDTH, and width is what drives collisions:
  //   pin-to-pin -> "R1_pin2/R2_pin1" (15 chars, concatenates every member)
  //   named      -> "MID"             (3 chars)
  // Label-count differences between the two styles are context-dependent
  // and this project has not isolated the rule, so no convention rests on
  // them.
  const two = (
    <>
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
    </>
  )
  const p2p = await renderCircuit(
    <board width="60mm" height="40mm">
      {two}
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )
  const named = await renderCircuit(
    <board width="60mm" height="40mm">
      {two}
      <net name="MID" />
      <trace from=".R1 > .pin2" to="net.MID" />
      <trace from=".R2 > .pin1" to="net.MID" />
    </board>,
  )
  const widest = (el: readonly CircuitElement[]) => {
    let w = 0
    for (const e of el) {
      if (e.type !== "schematic_net_label") continue
      const t = Reflect.get(e, "text")
      if (typeof t === "string") w = Math.max(w, t.length)
    }
    return w
  }
  expect(widest(named)).toBeLessThan(widest(p2p))
})

test("a 3+ terminal named net is a junction, not gratuitous", async () => {
  const { classified } = await justificationsFor(
    <group>
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <resistor name="R3" resistance="10k" footprint="0805" schX={0} schY={2} />
      <net name="JUNC" />
      <trace from=".R1 > .pin2" to="net.JUNC" />
      <trace from=".R2 > .pin1" to="net.JUNC" />
      <trace from=".R3 > .pin1" to="net.JUNC" />
    </group>,
  )
  const j = classified.filter((c) => c.text === "JUNC")
  expect(j.length).toBeGreaterThan(0)
  for (const c of j) expect(c.justification).toBe("junction")
})

test("a rail is exempt regardless of member count", async () => {
  const { classified } = await justificationsFor(
    <group>
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <net name="GND" />
      <trace from=".R1 > .pin2" to="net.GND" />
      <trace from=".R2 > .pin1" to="net.GND" />
    </group>,
  )
  const g = classified.filter((c) => c.text === "GND")
  expect(g.length).toBeGreaterThan(0)
  for (const c of g) expect(c.justification).toBe("rail")
})

test("an UNAPPROVED declaration does NOT exempt - it stays a defect", async () => {
  const el = await renderCircuit(
    <board width="60mm" height="40mm">
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <net name="MID" />
      <trace from=".R1 > .pin2" to="net.MID" />
      <trace from=".R2 > .pin1" to="net.MID" />
    </board>,
  )
  // Writing a justification must not be enough. If it were, the author of
  // the schematic would also be the author of its exemptions.
  const declared = {
    MID: { reason: "I would rather not wire this one" },
  }
  const classified = classifyLabels(el, { declared })
  const mid = classified.filter((c) => c.text === "MID")
  expect(mid.length).toBeGreaterThan(0)
  for (const c of mid) expect(c.justification).toBe("pending-approval")
  // and it still counts against the enforced metric
  expect(computeSchematicMetrics(el, { declared }).gratuitousLabels).toBeGreaterThan(0)
})

test("an APPROVED declaration does exempt", async () => {
  const el = await renderCircuit(
    <board width="60mm" height="40mm">
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <net name="MID" />
      <trace from=".R1 > .pin2" to="net.MID" />
      <trace from=".R2 > .pin1" to="net.MID" />
    </board>,
  )
  const withReason = classifyLabels(el, {
    declared: {
      MID: {
        reason: "kept named because a downstream board taps it here",
        approvedBy: "oletizi",
        approvedOn: "2026-09-21",
      },
    },
  })
  const mid = withReason.filter((c) => c.text === "MID")
  expect(mid.length).toBeGreaterThan(0)
  for (const c of mid) expect(c.justification).toBe("declared")
})

test("gratuitousLabels in the metric bundle reflects the classifier", async () => {
  const el = await renderCircuit(
    <board width="60mm" height="40mm">
      <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
      <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
      <net name="MID" />
      <trace from=".R1 > .pin2" to="net.MID" />
      <trace from=".R2 > .pin1" to="net.MID" />
    </board>,
  )
  expect(computeSchematicMetrics(el).gratuitousLabels).toBeGreaterThan(0)
})
