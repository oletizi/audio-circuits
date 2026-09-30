import { test, expect } from "bun:test"
import { circuit, net } from "../../lib/model/index.ts"
import { RESISTOR, transistor2N3904 } from "../../circuits/transistor-preamp/parts.ts"
import { resistorDissipation } from "../../tools/bom/dissipation.ts"
import type { BomConditions } from "../../tools/bom/conditions.ts"

/** A minimal, valid `BomConditions`: `source` and `load` both land on a "SRC" net that
 * carries a dummy resistor to ground and touches nothing else in the circuit under
 * test, so attaching the deck's AC source and load never perturbs the network being
 * measured. */
function conditionsFor(supplyVolts: number): BomConditions {
  return {
    description: "test conditions",
    environment: {
      source: { port: "source", amplitude: 1, seriesOhms: 0 },
      load: { port: "load", ohms: 100_000 },
      supplies: [{ port: "vcc", volts: supplyVolts }],
      groundPort: "ground",
    },
    controlState: { potPositions: {}, switchPositions: {} },
  }
}

test("resistorDissipation on a two-resistor divider gives (Va - Vb)^2 / R for each", async () => {
  const network = circuit()
    .resistor("r1", "1k", { a: "VCC", b: "MID" }, RESISTOR)
    .resistor("r2", "1k", { a: "MID", b: "GND" }, RESISTOR)
    .resistor("raux", "1k", { a: "SRC", b: "GND" }, RESISTOR)
    .port("ground", "GND")
    .port("vcc", "VCC")
    .port("source", "SRC")
    .port("load", "SRC")
    .done()

  const dissipation = await resistorDissipation(network, conditionsFor(10))

  // 10 V across two equal 1k resistors: 5 V at the midpoint, 25 mW in each.
  expect(dissipation.size).toBe(3)
  expect(dissipation.get("r1")).toBeCloseTo(0.025, 4)
  expect(dissipation.get("r2")).toBeCloseTo(0.025, 4)
  // "raux" hangs off the source/load anchor net, which the ideal AC source holds at
  // 0 V DC; both its ends are at 0 V, so it dissipates nothing.
  expect(dissipation.get("raux")).toBeCloseTo(0, 4)
})

test("resistorDissipation returns the resistors' dissipation and ignores an active device", async () => {
  const network = circuit()
    .resistor("r_bias_upper", "100k", { a: "VCC", b: "BASE" }, RESISTOR)
    .resistor("r_bias_lower", "15k", { a: "BASE", b: "GND" }, RESISTOR)
    .resistor("r_collector", "5.6k", { a: "VCC", b: "COLLECTOR" }, RESISTOR)
    .resistor("r_emitter", "1.2k", { a: "EMITTER", b: "GND" }, RESISTOR)
    .add(transistor2N3904("q1", "BASE", "COLLECTOR", "EMITTER"))
    .resistor("raux", "1k", { a: "SRC", b: "GND" }, RESISTOR)
    .port("ground", "GND")
    .port("vcc", "VCC")
    .port("source", "SRC")
    .port("load", "SRC")
    .done()

  const dissipation = await resistorDissipation(network, conditionsFor(24))

  expect([...dissipation.keys()].sort()).toEqual(
    ["r_bias_lower", "r_bias_upper", "r_collector", "r_emitter", "raux"].sort(),
  )
  for (const [id, watts] of dissipation) {
    expect(Number.isFinite(watts)).toBe(true)
    expect(watts).toBeGreaterThanOrEqual(0)
    if (id !== "raux") expect(watts).toBeGreaterThan(0)
  }
})

test("resistorDissipation maps a pot's zero-ohm section (fully ccw) to 0 W, not NaN", async () => {
  const network = circuit()
    .add({
      id: "pot1", kind: "potentiometer",
      parameters: { ohms: 1000, taper: { type: "linear" } }, pins: {},
      units: [{ name: "MAIN", pins: { ccw: net("GND"), wiper: net("WIPER"), cw: net("CW") } }],
    })
    .resistor("raux", "1k", { a: "SRC", b: "GND" }, RESISTOR)
    .port("ground", "GND")
    .port("wiper", "WIPER")
    .port("cw", "CW")
    .port("source", "SRC")
    .port("load", "SRC")
    .done()

  const conditions: BomConditions = {
    description: "pot1 fully ccw",
    environment: {
      source: { port: "source", amplitude: 1, seriesOhms: 0 },
      load: { port: "load", ohms: 100_000 },
      supplies: [],
      groundPort: "ground",
    },
    controlState: { potPositions: { pot1: 0 }, switchPositions: {} },
  }

  const dissipation = await resistorDissipation(network, conditions)

  // Fraction 0 (fully ccw) puts the whole 1k on the wiper-cw section and leaves the
  // ccw-wiper section at exactly 0 ohms - a legal, documented state
  // (control-state.ts's expandPot), not an error.
  expect(dissipation.get("pot1.ccw-wiper")).toBe(0)
  const otherSection = dissipation.get("pot1.wiper-cw")
  if (otherSection === undefined) throw new Error("missing pot1.wiper-cw dissipation")
  expect(Number.isFinite(otherSection)).toBe(true)
})

test("resistorDissipation on a network with no resistors returns an empty map", async () => {
  const network = circuit()
    .add(transistor2N3904("q1", "BASE", "COLLECTOR", "EMITTER"))
    .port("ground", "EMITTER")
    .port("base", "BASE")
    .port("collector", "COLLECTOR")
    .done()

  const dissipation = await resistorDissipation(network, conditionsFor(24))
  expect(dissipation.size).toBe(0)
})
