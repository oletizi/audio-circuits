import { test, expect } from "bun:test"
import {
  STANDARD_CAPACITOR_VOLTS,
  requiredCapacitorVolts,
  requiredResistorWatts,
} from "../../tools/bom/ratings.ts"

test("requiredCapacitorVolts rounds up to the next standard rating at or above 1.2x the rail", () => {
  expect(requiredCapacitorVolts(9)).toBe(16) // 10.8
  expect(requiredCapacitorVolts(12)).toBe(16) // 14.4
  expect(requiredCapacitorVolts(24)).toBe(35) // 28.8
  expect(requiredCapacitorVolts(25)).toBe(35) // 30
})

test("requiredCapacitorVolts throws when 1.2x the rail exceeds the highest standard rating", () => {
  expect(() => requiredCapacitorVolts(400)).toThrow(/450/) // 480
})

test("STANDARD_CAPACITOR_VOLTS is the decided list, in order", () => {
  expect(STANDARD_CAPACITOR_VOLTS).toEqual([
    6.3, 10, 16, 25, 35, 50, 63, 100, 160, 200, 250, 350, 400, 450,
  ])
})

test("requiredResistorWatts is dissipation doubled, never less than 0.25 W", () => {
  expect(requiredResistorWatts(0.01)).toBeCloseTo(0.25)
  expect(requiredResistorWatts(0.2)).toBeCloseTo(0.4)
})
