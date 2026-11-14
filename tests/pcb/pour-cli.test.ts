/**
 * `tools/pcb/pour-cli.ts` - the report that goes beside a render.
 *
 * The arithmetic is `./pour.test.ts`'s. What is tested here is the ONE thing
 * this file can get wrong on its own, and it is not a formatting preference:
 *
 * **IT MUST NEVER PUT `leastUncovered` IN FRONT OF A READER WITHOUT THE PROFILE
 * OR THE BAND.** That figure is the loop of least uncovered length in a band of
 * loops, so it is optimistic by construction: a break that dead-ends short of
 * the IC depresses only the loops beyond its end, which means the headline can
 * read 100% covered while a real break exists further out. Measured on the real
 * board - `tools/pcb/pour-types.ts` records the three different single-loop
 * figures that construct produced. A report quoting the headline alone is
 * therefore a measurement that hides its own counter-example, and the fixture
 * below is built to hold exactly that case: a slot cut through the middle of the
 * band, where the headline reads whole and the outer loops do not.
 *
 * **AND AN UNAVAILABLE FIGURE MUST PRINT ITS REASON, NEVER A ZERO.** `Reading<T>`
 * is measured-or-absent-with-a-reason so that a figure the board gives no answer
 * to cannot be read as a measured zero; a formatter that collapsed the two would
 * reintroduce that defect one layer out, where no test of `pour.ts` would see it.
 */
import { afterAll, test, expect } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { OPEN_PLACE, RECTANGLE, fixtureBoard } from "./pour-fixtures.ts"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"

afterAll(cleanUpTempScratch)

const CLI = path.join(import.meta.dir, "..", "..", "tools", "pcb", "pour-cli.ts")

function run(board: string, ...args: string[]): { status: number; out: string } {
  const result = spawnSync("bun", [CLI, board, ...args], { encoding: "utf8" })
  if (result.error !== undefined && result.error !== null) throw result.error
  return { status: result.status ?? -1, out: (result.stdout ?? "") + (result.stderr ?? "") }
}

function board(name: string, text: string): string {
  const file = path.join(freshTempScratch("pcb-pour-cli-"), name)
  fs.writeFileSync(file, text)
  return file
}

/**
 * A pour with a slot that DEAD-ENDS short of the IC: the case the headline hides.
 *
 * The slot is cut into the fill polygon itself and not declared as a keepout
 * zone, because this fixture's fill is authored by hand rather than poured by
 * KiCad - a keepout would sit beside the fill without carving it, which is how
 * the first version of this test proved nothing. (`./pour-refill-configurations.test.ts`
 * is the file that cuts a slot with a real keepout, on a board `kicad-cli` fills.)
 *
 * U1's two 1.6 mm pads sit at (30, 18) and (30, 24), so its pad extent is
 * x 29.2 to 30.8. A loop at offset `d` has its left edge at x = 29.2 - d, so a
 * slot reaching in to x = 27.0 is crossed only once d >= 2.2: the loops out at
 * 2.25 mm and beyond are broken and the inner ones are whole.
 */
function slottedBoard(): string {
  const slotted: readonly (readonly [number, number])[] = [
    [0, 0], [60, 0], [60, 40], [0, 40], [0, 20.8], [27, 20.8], [27, 20.5], [0, 20.5],
  ]
  return fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [slotted] } })
}

test("the plain report prints the band and every loop in it, not only the loop of least uncovered", () => {
  const { status, out } = run(board("slotted.kicad_pcb", slottedBoard()))
  expect(status).toBe(0)
  expect(out).toContain("band 0.00 to 3.00 mm in 0.25 mm steps, 13 loop(s)")
  expect(out).toContain("every loop in the band:")
  // 13 loops in the band, and the report prints an offset line for each one.
  expect(out.match(/^ {4}\+\d+\.\d\d mm /gm)?.length).toBe(14) // 13 in the profile plus the headline's own line
  // The headline names what it is rather than reading as a grade.
  expect(out).toContain("least uncovered of the band")
  expect(out).toContain("leastUncovered alone is optimistic by construction")
})

test("on that fixture the headline reads whole while outer loops do not, which is why both are printed", () => {
  const { out } = run(board("slotted.kicad_pcb", slottedBoard()), "--json")
  const parsed = JSON.parse(out) as {
    continuity_around_ic: { measured: Record<string, {
      band_mm: { from_mm: number; to_mm: number; step_mm: number }
      least_uncovered: { covered_fraction: number }
      profile: { offset_mm: number; covered_fraction: number; breaks_mm: number[] }[]
    }> }
  }
  const front = parsed.continuity_around_ic.measured["F.Cu"]
  if (front === undefined) throw new Error("the JSON report carries no F.Cu continuity")
  expect(front.band_mm).toEqual({ from_mm: 0, to_mm: 3, step_mm: 0.25 })
  expect(front.profile.length).toBe(13)
  expect(front.least_uncovered.covered_fraction).toBe(1)
  // The slot is beyond the inner loops, so the OUTER ones are broken and the headline is not.
  const broken = front.profile.filter((loop) => loop.covered_fraction < 1 && loop.offset_mm > 0.5)
  expect(broken.length).toBeGreaterThan(0)
  expect(broken.every((loop) => loop.breaks_mm.length > 0)).toBe(true)
})

test("an unavailable figure prints its reason, and no zero stands in for it", () => {
  // One connected region on the only pour layer: there is no bridge to measure.
  const { status, out } = run(board("whole.kicad_pcb", fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } })))
  expect(status).toBe(0)
  expect(out).toContain("narrowest bridge BETWEEN separate regions: unavailable - every pour layer is one connected piece of fill")
  expect(out).not.toContain("narrowest bridge BETWEEN separate regions: 0")
})

test("the JSON form keeps an unavailable figure as a reason rather than a value", () => {
  const { out } = run(board("whole.kicad_pcb", fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } })), "--json")
  const parsed = JSON.parse(out) as { narrowest_bridge_mm: Record<string, unknown> }
  expect(Object.keys(parsed.narrowest_bridge_mm)).toEqual(["unavailable"])
  expect(typeof parsed.narrowest_bridge_mm["unavailable"]).toBe("string")
})

test("a board whose zone was never refilled is refused, with the guard named, rather than reported as zeroes", () => {
  const unfilled = fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] }, zoneLayers: ["F.Cu"], filledLayers: [] })
  const { status, out } = run(board("unfilled.kicad_pcb", unfilled))
  expect(status).toBe(2)
  expect(out).toContain("REFUSED (zone-unfilled)")
})

test("a path that is not a board refuses, and an unrecognised argument is not silently ignored", () => {
  expect(run("/nonexistent/board.kicad_pcb").status).toBe(2)
  const good = board("whole.kicad_pcb", fixtureBoard({ place: OPEN_PLACE, pour: { "F.Cu": [RECTANGLE] } }))
  expect(run(good, "--summary").status).toBe(2)
})
