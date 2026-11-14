/**
 * SMALL HELPERS SHARED BY `tests/pcb/pour*.test.ts`. Nothing here asserts a
 * measurement and nothing here is a threshold.
 */
import { expect } from "bun:test"
import { measurePourText, PT2399_CORE, PourRefusal } from "../../tools/pcb/pour.ts"
import type { PourGuard, PourMetrics, Reading } from "../../tools/pcb/pour.ts"

export const measure = (text: string): PourMetrics => measurePourText(text, "fixture", PT2399_CORE)

export function near(actual: number | null | undefined, expected: number, tolerance: number): void {
  if (actual === null || actual === undefined) throw new Error(`expected ${expected} but measured ${String(actual)}`)
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

/** The value of a measured reading; throws, with the reason, on an unavailable one. */
export function valueOf<T>(reading: Reading<T>): T {
  if (reading.kind === "unavailable") throw new Error(`expected a measured figure but it is unavailable: ${reading.reason}`)
  return reading.value
}

/** The reason of an unavailable reading; throws on a measured one. */
export function reasonOf<T>(reading: Reading<T>): string {
  if (reading.kind === "measured") throw new Error(`expected an unavailable figure but it measured ${JSON.stringify(reading.value, (_k, v) => (v instanceof Map ? [...v] : v))}`)
  return reading.reason
}

/** Guards seen across a test file, so a final test can show every declared guard was reached. */
export const seenGuards = new Set<PourGuard>()

export function refusalOf(body: () => unknown): PourRefusal {
  try {
    body()
  } catch (error) {
    if (error instanceof PourRefusal) {
      seenGuards.add(error.guard)
      return error
    }
    throw error
  }
  throw new Error("expected a PourRefusal but nothing was thrown")
}
