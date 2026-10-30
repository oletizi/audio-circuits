import { test, expect } from "bun:test"
import { circuit } from "../../lib/model/index.ts"
import { net } from "../../lib/model/types.ts"
import type { Network } from "../../lib/model/types.ts"
import { railBoundResistorWatts } from "../../tools/bom/rail-bound.ts"
import type { RailBoundPower } from "../../tools/bom/rail-bound.ts"
import { railBoundMinimumOhms, requiredResistorWatts } from "../../tools/bom/ratings.ts"

const RES = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"
const WHERE = "tests/bom/rail-bound.test.ts fixture"

const OWNER_WORDS =
  'the owner, 2026-10-30: "pt2399 is a 5 volt dsp chip. It doesn\'t need to be above 1/4 watt"'

/** Two resistors across the rail: one comfortably large, one whose value the test names.
 * `smallest` is the one the threshold is exercised against. */
function fixture(smallest: string): Network {
  return circuit()
    .resistor("bias", "10K", { a: "VCC", b: "GND" }, { footprint: RES })
    .resistor("sense", smallest, { a: "VCC", b: "GND" }, { footprint: RES })
    .port("vcc", "VCC")
    .port("ground", "GND")
    .done()
}

function railBound(volts: number, overrides: Partial<RailBoundPower> = {}): RailBoundPower {
  return {
    supplies: [{ port: "vcc", volts }],
    ratedWatts: 0.25,
    basis: OWNER_WORDS,
    ...overrides,
  }
}

test("a rail bound is the whole rail across each resistor: P = V^2 / R, with no simulation", () => {
  const watts = railBoundResistorWatts(fixture("2.7K"), railBound(5), WHERE)
  expect([...watts.keys()].sort()).toEqual(["bias", "sense"])
  // 25 / 10000 and 25 / 2700 - arithmetic, not an operating point.
  expect(watts.get("bias")).toBeCloseTo(0.0025, 9)
  expect(watts.get("sense")).toBeCloseTo(25 / 2700, 9)
})

test("the bound a 1/4 W part covers at 5 V still covers the whole of pt2399-core's smallest resistor", () => {
  // The margin, computed from the declaration rather than written down: 200 ohms is the
  // threshold a 1/4 W part honours under requiredResistorWatts, and 2.7K is 13.5x it.
  expect(railBoundMinimumOhms(5, 0.25)).toBeCloseTo(200, 9)
  const watts = railBoundResistorWatts(fixture("2.7K"), railBound(5), WHERE)
  const worst = Math.max(...watts.values())
  expect(requiredResistorWatts(worst)).toBeCloseTo(0.25, 9)
})

/** REFUSAL ARM ONE. */
test("a resistor below the implied minimum resistance is REFUSED, by name", () => {
  expect(() => railBoundResistorWatts(fixture("47"), railBound(5), WHERE)).toThrow(
    /resistor "sense" is 47 ohms/,
  )
  expect(() => railBoundResistorWatts(fixture("47"), railBound(5), WHERE)).toThrow(/200 ohms/)
  expect(() => railBoundResistorWatts(fixture("47"), railBound(5), WHERE)).toThrow(/0\.25 W/)
  // The basis is quoted in the refusal: the claim being contradicted is named, not just the number.
  expect(() => railBoundResistorWatts(fixture("47"), railBound(5), WHERE)).toThrow(/5 volt dsp chip/)
})

/** REFUSAL ARM TWO: the threshold is not a constant - it moves with the declared rail. */
test("raising the rail moves the threshold past a resistor that passed at the lower rail", () => {
  const board = fixture("220")
  // 220 ohms is above the 200-ohm threshold at 5 V, so it passes.
  expect(railBoundMinimumOhms(5, 0.25)).toBeCloseTo(200, 9)
  expect(railBoundResistorWatts(board, railBound(5), WHERE).get("sense")).toBeCloseTo(25 / 220, 9)
  // At 12 V the threshold is 2 x 144 / 0.25 = 1152 ohms, and the same part is refused.
  expect(railBoundMinimumOhms(12, 0.25)).toBeCloseTo(1152, 9)
  expect(() => railBoundResistorWatts(board, railBound(12), WHERE)).toThrow(
    /resistor "sense" is 220 ohms/,
  )
  expect(() => railBoundResistorWatts(board, railBound(12), WHERE)).toThrow(/1152 ohms/)
  // And `bias` at 10K is still fine at 12 V, so the refusal names the one part, not the board.
  expect(() => railBoundResistorWatts(board, railBound(12), WHERE)).not.toThrow(/"bias"/)
})

test("a bipolar pair is bounded by the rail furthest from ground, by magnitude", () => {
  const bipolar = railBound(5, { supplies: [{ port: "vcc", volts: 5 }, { port: "ground", volts: -15 }] })
  // 15 V across 10K is 22.5 mW, not the 2.5 mW the +5 V rail alone would give.
  expect(railBoundResistorWatts(fixture("2.7K"), bipolar, WHERE).get("bias")).toBeCloseTo(0.0225, 9)
})

test("a supply on a port the circuit does not declare is refused, naming the ports it does", () => {
  const unknownPort = railBound(5, { supplies: [{ port: "v_plus", volts: 5 }] })
  expect(() => railBoundResistorWatts(fixture("2.7K"), unknownPort, WHERE)).toThrow(
    /"v_plus", which is not a port this circuit declares/,
  )
  expect(() => railBoundResistorWatts(fixture("2.7K"), unknownPort, WHERE)).toThrow(/ground, vcc/)
})

test("no supplies at all is refused: there is no rail to bound anything by", () => {
  expect(() => railBoundResistorWatts(fixture("2.7K"), railBound(5, { supplies: [] }), WHERE)).toThrow(
    /declares no supplies/,
  )
})

test("a non-positive rail is refused rather than yielding a bound of zero watts", () => {
  expect(() => railBoundResistorWatts(fixture("2.7K"), railBound(0), WHERE)).toThrow(/0 V/)
})

test("a potentiometer is refused: a wiper that can reach 0 ohms has no rail bound", () => {
  const withPot: Network = {
    components: [
      {
        id: "level", kind: "potentiometer",
        parameters: { ohms: 10_000, taper: { type: "linear" } },
        pins: {},
        units: [{ name: "MAIN", pins: { a: net("VCC"), wiper: net("OUT"), b: net("GND") } }],
      },
      {
        id: "bias", kind: "resistor", parameters: { ohms: 10_000 },
        pins: {}, units: [{ name: "MAIN", pins: { a: net("VCC"), b: net("GND") } }],
      },
    ],
    ports: { vcc: "VCC", ground: "GND" },
  }
  expect(() => railBoundResistorWatts(withPot, railBound(5), WHERE)).toThrow(
    /potentiometer "level"/,
  )
})

test("railBoundMinimumOhms inverts requiredResistorWatts exactly at the threshold", () => {
  // Not a restatement of the formula: the threshold is the resistance at which the rule
  // deriveNeeds actually applies asks for exactly the rating claimed, and one ohm below
  // it asks for more. If requiredResistorWatts changes, this is what catches the drift.
  for (const [volts, rated] of [[5, 0.25], [12, 0.5], [24, 1]] as const) {
    const threshold = railBoundMinimumOhms(volts, rated)
    expect(requiredResistorWatts((volts ** 2) / threshold)).toBeCloseTo(rated, 9)
    expect(requiredResistorWatts((volts ** 2) / (threshold - 1))).toBeGreaterThan(rated)
  }
})

test("railBoundMinimumOhms refuses a rating below the floor requiredResistorWatts applies", () => {
  expect(() => railBoundMinimumOhms(5, 0.125)).toThrow(/0\.25 W/)
})
