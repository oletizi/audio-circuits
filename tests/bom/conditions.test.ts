import { test, expect } from "bun:test"
import { declaredBomConditions, highestRailVolts } from "../../tools/bom/conditions.ts"
import type { BomConditions } from "../../tools/bom/conditions.ts"
import { bomConditions } from "../../circuits/transistor-preamp/staged-board.ts"

const WHERE = "test module"

function moduleOf(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return value
}

const VALID_RESULT = {
  description: "Supply 10 V; controls at START.",
  environment: {
    source: { port: "source", amplitude: 1, seriesOhms: 0 },
    load: { port: "load", ohms: 10_000 },
    supplies: [{ port: "vcc", volts: 10 }],
    groundPort: "ground",
  },
  controlState: { potPositions: { pot1: 0.5 }, switchPositions: { sw1: "a" } },
}

test("declaredBomConditions throws when the module exports no bomConditions", async () => {
  await expect(declaredBomConditions(moduleOf({}), WHERE)).rejects.toThrow(/no "bomConditions" export/)
})

test("declaredBomConditions throws when bomConditions is not a function", async () => {
  await expect(declaredBomConditions(moduleOf({ bomConditions: 42 }), WHERE)).rejects.toThrow(
    /not a function/,
  )
})

test("declaredBomConditions throws when the result is not an object", async () => {
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => "nope" }), WHERE),
  ).rejects.toThrow(/not an object/)
})

test("declaredBomConditions throws when description is missing or blank", async () => {
  const { description: _description, ...rest } = VALID_RESULT
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => rest }), WHERE),
  ).rejects.toThrow(/description/)
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => ({ ...VALID_RESULT, description: "  " }) }), WHERE),
  ).rejects.toThrow(/description/)
})

test("declaredBomConditions throws when environment is missing", async () => {
  const { environment: _environment, ...rest } = VALID_RESULT
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => rest }), WHERE),
  ).rejects.toThrow(/environment/)
})

test("declaredBomConditions throws when environment.groundPort is missing", async () => {
  const malformed = {
    ...VALID_RESULT,
    environment: { ...VALID_RESULT.environment, groundPort: undefined },
  }
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => malformed }), WHERE),
  ).rejects.toThrow(/groundPort/)
})

test("declaredBomConditions throws when environment.supplies is not an array", async () => {
  const malformed = {
    ...VALID_RESULT,
    environment: { ...VALID_RESULT.environment, supplies: "not an array" },
  }
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => malformed }), WHERE),
  ).rejects.toThrow(/supplies/)
})

test("declaredBomConditions throws when controlState.potPositions is malformed", async () => {
  const malformed = {
    ...VALID_RESULT,
    controlState: { potPositions: { pot1: "half" }, switchPositions: {} },
  }
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => malformed }), WHERE),
  ).rejects.toThrow(/potPositions/)
})

test("declaredBomConditions accepts a well-formed result, sync or async", async () => {
  const sync: BomConditions = await declaredBomConditions(
    moduleOf({ bomConditions: () => VALID_RESULT }),
    WHERE,
  )
  expect(sync).toEqual(VALID_RESULT)

  const asynchronous = await declaredBomConditions(
    moduleOf({ bomConditions: async () => VALID_RESULT }),
    WHERE,
  )
  expect(asynchronous).toEqual(VALID_RESULT)
})

test("highestRailVolts throws when there are no supplies", () => {
  const noSupplies: BomConditions = { ...VALID_RESULT, environment: { ...VALID_RESULT.environment, supplies: [] } }
  expect(() => highestRailVolts(noSupplies)).toThrow(/no supplies/)
})

test("highestRailVolts is the magnitude of the largest declared rail", () => {
  const bipolar: BomConditions = {
    ...VALID_RESULT,
    environment: {
      ...VALID_RESULT.environment,
      supplies: [{ port: "vcc", volts: 12 }, { port: "vee", volts: -15 }],
    },
  }
  expect(highestRailVolts(bipolar)).toBe(15)
})

const VALID_RAIL_BOUND = {
  description: "Supply 5 V; no controls. Resistor ratings bounded by the rail.",
  railBound: {
    supplies: [{ port: "vcc", volts: 5 }],
    ratedWatts: 0.25,
    basis: 'the owner: "it doesn\'t need to be above 1/4 watt"',
  },
  controlState: { potPositions: {}, switchPositions: {} },
}

test("declaredBomConditions accepts the rail-bound arm, with no source and no load", async () => {
  const conditions = await declaredBomConditions(
    moduleOf({ bomConditions: () => VALID_RAIL_BOUND }),
    WHERE,
  )
  expect(conditions).toEqual(VALID_RAIL_BOUND)
  // The rail is still the rail, whichever arm declared it - a capacitor's voltage
  // rating comes from it either way.
  expect(highestRailVolts(conditions)).toBe(5)
})

test("declaring BOTH environment and railBound is refused: two bases for one figure", async () => {
  const both = { ...VALID_RESULT, railBound: VALID_RAIL_BOUND.railBound }
  await expect(declaredBomConditions(moduleOf({ bomConditions: () => both }), WHERE)).rejects.toThrow(
    /declares BOTH "environment" and "railBound"/,
  )
})

test("declaring NEITHER is refused, and the refusal names both arms", async () => {
  const { environment: _environment, ...neither } = VALID_RESULT
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => neither }), WHERE),
  ).rejects.toThrow(/declares neither "environment" nor "railBound"/)
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => neither }), WHERE),
  ).rejects.toThrow(/tools\/bom\/rail-bound\.ts/)
})

test("a railBound missing its basis is refused: a claimed rating with no stated basis", async () => {
  const { basis: _basis, ...railBound } = VALID_RAIL_BOUND.railBound
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => ({ ...VALID_RAIL_BOUND, railBound }) }), WHERE),
  ).rejects.toThrow(/railBound\.basis/)
})

test("a railBound missing its ratedWatts, or with malformed supplies, is refused", async () => {
  const { ratedWatts: _ratedWatts, ...noRating } = VALID_RAIL_BOUND.railBound
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => ({ ...VALID_RAIL_BOUND, railBound: noRating }) }), WHERE),
  ).rejects.toThrow(/railBound\.ratedWatts/)
  const badSupplies = { ...VALID_RAIL_BOUND.railBound, supplies: "5 V" }
  await expect(
    declaredBomConditions(moduleOf({ bomConditions: () => ({ ...VALID_RAIL_BOUND, railBound: badSupplies }) }), WHERE),
  ).rejects.toThrow(/railBound\.supplies is a string, not an array/)
})

test("highestRailVolts names the arm that declared no supplies", () => {
  const noSupplies: BomConditions = {
    ...VALID_RAIL_BOUND,
    railBound: { ...VALID_RAIL_BOUND.railBound, supplies: [] },
  }
  expect(() => highestRailVolts(noSupplies)).toThrow(/bomConditions\(\)\.railBound declares no supplies/)
})

test("the staged board's bomConditions declares the 24 V rail", async () => {
  const conditions = await declaredBomConditions(moduleOf({ bomConditions }), "staged-board")
  expect(highestRailVolts(conditions)).toBe(24)
  expect(conditions.description).toContain("24")
  expect(conditions.description).toContain("START")
})
