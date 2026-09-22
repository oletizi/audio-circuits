import { test, expect } from "bun:test"
import type { ReactElement } from "react"
import { renderCircuit } from "./circuit-assertions.ts"
import { computeTier1, type Tier1Metrics } from "./schematic-tier1.ts"
import { assertReadabilityGate, BASELINES } from "./schematic-gate.ts"

/**
 * FALSIFIABILITY TESTS (design §8).
 *
 * Each constructs the defect deliberately and asserts the gate catches it.
 * A threshold that has never been seen to fire is not enforcing anything —
 * this project already shipped one metric that read 0 partly because of a
 * classifier bug nobody had tested.
 */

const render = (node: ReactElement, w = "60mm", h = "40mm") =>
  renderCircuit(
    <board width={w} height={h}>
      {node}
    </board>,
  )

const twoParts = (
  <>
    <resistor name="R1" resistance="10k" footprint="0805" schX={-2} schY={0} />
    <resistor name="R2" resistance="10k" footprint="0805" schX={2} schY={0} />
  </>
)

// --- F1/F2/F3: M1 and the rail list ----------------------------------------

test("F1: a named net absent from RAIL_NETS counts toward M1", async () => {
  const el = await render(
    <>
      {twoParts}
      <net name="SIGNAL" />
      <trace from=".R1 > .pin2" to="net.SIGNAL" />
      <trace from=".R2 > .pin1" to="net.SIGNAL" />
    </>,
  )
  expect(computeTier1(el, { railNets: [] }).nonRailLabels).toBeGreaterThan(0)
}, 120000)

test("F2: a net explicitly listed in RAIL_NETS does not count", async () => {
  const el = await render(
    <>
      {twoParts}
      <net name="MY_RAIL" />
      <trace from=".R1 > .pin2" to="net.MY_RAIL" />
      <trace from=".R2 > .pin1" to="net.MY_RAIL" />
    </>,
  )
  const listed = computeTier1(el, { railNets: ["MY_RAIL"] })
  const unlisted = computeTier1(el, { railNets: [] })
  expect(listed.nonRailLabels).toBe(0)
  expect(unlisted.nonRailLabels).toBeGreaterThan(0)
}, 120000)

test("F3: a rail-LOOKING net that is not listed still counts", async () => {
  // THE important one. The previous implementation matched endsWith("_GND"),
  // so any author could exempt a net by naming it well. Explicit enumeration
  // is the whole point of §6, and this test is what proves it.
  const el = await render(
    <>
      {twoParts}
      <net name="FOO_GND" />
      <trace from=".R1 > .pin2" to="net.FOO_GND" />
      <trace from=".R2 > .pin1" to="net.FOO_GND" />
    </>,
  )
  expect(
    computeTier1(el, { railNets: ["REAL_GND"] }).nonRailLabels,
  ).toBeGreaterThan(0)
}, 120000)

// --- F4/F5/F6: collisions, crossings, hops ---------------------------------

test("F4: overlapping labels are counted as collisions", () => {
  // Unit-tests the collision geometry directly rather than through a render.
  // The rendered version of this fixture took 300s - crowding components to
  // force overlap also triggers tscircuit's router pathology, which makes it
  // a test of the renderer's patience rather than of the detector.
  const label = (text: string, x: number, y: number) => ({
    type: "schematic_net_label",
    text,
    anchor_side: "left",
    anchor_position: { x: x + (text.length * 0.1) / 2, y },
    center: { x, y },
  })
  const overlapping = [label("LONG_NAME_A", 0, 0), label("LONG_NAME_B", 0.2, 0)]
  const apart = [label("LONG_NAME_A", 0, 0), label("LONG_NAME_B", 50, 0)]
  expect(computeTier1(overlapping).labelCollisions).toBeGreaterThan(0)
  expect(computeTier1(apart).labelCollisions).toBe(0)
})

test("F5: crossing traces are counted; parallel ones are not", () => {
  const trace = (x1: number, y1: number, x2: number, y2: number) => ({
    type: "schematic_trace",
    edges: [{ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } }],
  })
  const crossing = [trace(-1, 0, 1, 0), trace(0, -1, 0, 1)]
  const parallel = [trace(-1, 0, 1, 0), trace(-1, 5, 1, 5)]
  expect(computeTier1(crossing).wireCrossings).toBe(1)
  expect(computeTier1(parallel).wireCrossings).toBe(0)
})

test("F6: separating connected components raises the long-hop fraction", async () => {
  const near = await render(
    <>
      <resistor name="R1" resistance="1k" footprint="0805" schX={0} schY={0} />
      <resistor name="R2" resistance="1k" footprint="0805" schX={1} schY={0} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </>,
  )
  const far = await render(
    <>
      <resistor name="R1" resistance="1k" footprint="0805" schX={-20} schY={0} />
      <resistor name="R2" resistance="1k" footprint="0805" schX={20} schY={0} />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </>,
    "120mm",
    "40mm",
  )
  expect(far.length).toBeGreaterThan(0)
  expect(computeTier1(far).longHopFraction).toBeGreaterThan(
    computeTier1(near).longHopFraction,
  )
}, 120000)

// --- F7a/F7b: the two area metrics must move independently -----------------

test("F7: component extent and drawing extent are not the same number", async () => {
  // If these always moved together the M5 split bought nothing. Long label
  // names inflate the DRAWING extent while component placement is identical.
  const shortNames = await render(
    <>
      {twoParts}
      <net name="N" />
      <trace from=".R1 > .pin2" to="net.N" />
      <trace from=".R2 > .pin1" to="net.N" />
    </>,
  )
  const longNames = await render(
    <>
      {twoParts}
      <net name="AN_EXTREMELY_LONG_NET_NAME_THAT_WIDENS_THE_DRAWING" />
      <trace
        from=".R1 > .pin2"
        to="net.AN_EXTREMELY_LONG_NET_NAME_THAT_WIDENS_THE_DRAWING"
      />
      <trace
        from=".R2 > .pin1"
        to="net.AN_EXTREMELY_LONG_NET_NAME_THAT_WIDENS_THE_DRAWING"
      />
    </>,
  )
  const a = computeTier1(shortNames)
  const b = computeTier1(longNames)
  // Components sit at identical coordinates in both.
  expect(a.componentAreaPerComponent).toBeCloseTo(b.componentAreaPerComponent, 1)
  // But the drawing extent differs, which is exactly why M5 was split.
  expect(b.drawingAreaPerComponent).toBeGreaterThan(a.drawingAreaPerComponent)
}, 120000)

test("worstHops names the components at each end, longest first", async () => {
  const el = await render(
    <>
      <resistor name="NEAR_A" resistance="1k" footprint="0805" schX={0} schY={0} />
      <resistor name="NEAR_B" resistance="1k" footprint="0805" schX={1} schY={0} />
      <resistor name="FAR_A" resistance="1k" footprint="0805" schX={-25} schY={0} />
      <resistor name="FAR_B" resistance="1k" footprint="0805" schX={25} schY={0} />
      <trace from=".NEAR_A > .pin2" to=".NEAR_B > .pin1" />
      <trace from=".FAR_A > .pin2" to=".FAR_B > .pin1" />
    </>,
    "160mm",
    "40mm",
  )
  const hops = computeTier1(el).worstHops
  expect(hops.length).toBeGreaterThan(0)
  const worst = hops[0]
  expect(worst).toBeDefined()
  if (!worst) return
  // The 50-unit connection must rank above the 1-unit one.
  expect(worst.distance).toBeGreaterThan(10)
  // Enforce COMPONENT.pin. Asserting bare component names here would
  // enshrine the weaker contract and let the diagnostic silently regress.
  expect([worst.from, worst.to].sort()).toEqual(["FAR_A.pin2", "FAR_B.pin1"])
  expect(worst.net.length).toBeGreaterThan(0)
  // Sorted descending.
  for (let i = 1; i < hops.length; i++) {
    const prev = hops[i - 1]
    const cur = hops[i]
    if (!prev || !cur) continue
    expect(prev.distance).toBeGreaterThanOrEqual(cur.distance)
  }
}, 120000)

// --- F8: the gate itself ---------------------------------------------------

test("F8: the gate throws when a metric exceeds its baseline", () => {
  const base = BASELINES["optical-compressor"]
  expect(base).toBeDefined()
  if (!base) return
  const worse: Tier1Metrics = {
    components: 51,
    nonRailLabels: base.nonRailLabels + 1,
    labelCollisions: base.labelCollisions,
    wireCrossings: base.wireCrossings,
    longHopFraction: base.longHopFraction,
    componentAreaPerComponent: base.componentAreaPerComponent,
    drawingAreaPerComponent: base.drawingAreaPerComponent,
    worstHops: [],
  }
  expect(() => assertReadabilityGate("optical-compressor", worse)).toThrow(
    /REGRESSED/,
  )
})

test("F8b: the gate passes when every metric sits at its baseline", () => {
  const base = BASELINES["optical-compressor"]
  expect(base).toBeDefined()
  if (!base) return
  assertReadabilityGate("optical-compressor", {
    components: 51,
    ...base,
    worstHops: [],
  })
})

test("F8c: an unknown module throws rather than silently passing", () => {
  expect(() =>
    assertReadabilityGate("no-such-module", {
      components: 1,
      nonRailLabels: 0,
      labelCollisions: 0,
      wireCrossings: 0,
      longHopFraction: 0,
      componentAreaPerComponent: 5,
      drawingAreaPerComponent: 5,
      worstHops: [],
    }),
  ).toThrow(/No baseline/)
})
