import { test, expect } from "bun:test"
import {
  renderCircuit,
  expectConnected,
  expectNotConnected,
  expectComponentValue,
  expectNoFloatingPins,
  findComponent,
  type SourceComponent,
} from "./circuit-assertions.ts"

const Fixture = () => (
  <board width="20mm" height="20mm">
    <resistor name="R1" resistance="10k" footprint="0805" />
    <resistor name="R2" resistance="22k" footprint="0805" />
    <capacitor name="C1" capacitance="100nF" footprint="0805" />
    <transistor name="Q1" type="npn" footprint="sot23" />
    <net name="MID" />
    <trace from=".R1 > .pin2" to="net.MID" />
    <trace from=".C1 > .pin1" to="net.MID" />
    <trace from=".R1 > .pin1" to=".R2 > .pin1" />
    <trace from=".Q1 > .emitter" to=".R2 > .pin2" />
  </board>
)

test("renderCircuit returns source elements", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(findComponent(el, "R1")?.name).toBe("R1")
  expect(findComponent(el, "NOPE")).toBeUndefined()
})

test("expectConnected passes for pins on a shared net", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "R1.pin2", "C1.pin1")
})

test("expectConnected passes for a direct trace", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "R1.pin1", "R2.pin1")
})

test("expectConnected resolves named pins via port hints", async () => {
  const el = await renderCircuit(<Fixture />)
  expectConnected(el, "Q1.emitter", "R2.pin2")
})

test("expectConnected throws for unconnected pins", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(() => expectConnected(el, "R1.pin1", "C1.pin1")).toThrow()
})

test("expectConnected throws for a pin that does not exist", async () => {
  const el = await renderCircuit(<Fixture />)
  expect(() => expectConnected(el, "R1.pin9", "C1.pin1")).toThrow(/pin9/)
})

test("expectNotConnected is the inverse", async () => {
  const el = await renderCircuit(<Fixture />)
  expectNotConnected(el, "R1.pin1", "C1.pin1")
  expect(() => expectNotConnected(el, "R1.pin2", "C1.pin1")).toThrow()
})

test("expectComponentValue checks parsed values", async () => {
  const el = await renderCircuit(<Fixture />)
  expectComponentValue(el, "R1", "resistance", 10_000)
  expectComponentValue(el, "C1", "capacitance", 100e-9)
  expect(() => expectComponentValue(el, "R1", "resistance", 22_000)).toThrow()
})

test("expectNoFloatingPins reports floating pins and honours the allowlist", async () => {
  const el = await renderCircuit(<Fixture />)
  // C1.pin2, Q1.collector and Q1.base are deliberately unconnected here
  expect(() => expectNoFloatingPins(el)).toThrow(/C1/)
  expectNoFloatingPins(el, ["C1.pin2", "Q1.collector", "Q1.base"])
})

test("expectComponentValue throws instead of failing open when the value is NaN", () => {
  const handBuilt: SourceComponent[] = [
    {
      type: "source_component",
      source_component_id: "test-nan",
      name: "R_NAN",
      resistance: NaN,
    },
  ]
  expect(() =>
    expectComponentValue(handBuilt, "R_NAN", "resistance", 10_000),
  ).toThrow()
})

test("expectComponentValue throws when the value is not finite (Infinity)", () => {
  const handBuilt: SourceComponent[] = [
    {
      type: "source_component",
      source_component_id: "test-inf",
      name: "R_INF",
      resistance: Infinity,
    },
  ]
  expect(() =>
    expectComponentValue(handBuilt, "R_INF", "resistance", 10_000),
  ).toThrow()
})
