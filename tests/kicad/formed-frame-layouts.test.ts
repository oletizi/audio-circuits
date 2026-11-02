/**
 * The forming anchor against the owner's own committed layouts.
 *
 * **IT ASSERTS AGAINST REAL PLACEMENTS, NOT AGAINST A RULE.** The committed
 * `--dump-board` captures under `tests/fixtures/stripboard/` say where every
 * lead of every part sits. For each formed part placed at its own prepared
 * span, the recorded anchor's holes are checked against every OTHER part's
 * leads - and the loop board's `C6` is named, because it is the one placement
 * in this repository that refutes both alternative anchors by itself: its row
 * carries `J2.2` in the hole before its first lead and `R9.1` in the hole after
 * its last.
 *
 * **IT IS CORROBORATION AND NOT THE BASIS, and the difference matters.** The
 * loop board is laid out and NOT built (`docs/transistor-preamp/README.md`,
 * Build 4: *"paused, not built"*), and the two boards that ARE built place no
 * formed part with a neighbouring lead in its own row, so they do not
 * distinguish the anchors at all. The basis is KiCad's own prepared-pitch
 * footprints, in `./formed-frame.test.ts`.
 *
 * Split from that file because the two together went past this repository's
 * 300-500 line ceiling; the footprint list and the pad helpers both files need
 * are in `./formed-frame-fixtures.ts` rather than copied.
 */
import fs from "node:fs"
import path from "node:path"
import { expect, test } from "bun:test"
import { GRID_MM } from "../../lib/kicad/grid.ts"
import { occupiedAreaFor } from "../../lib/kicad/footprint-extent.ts"
import { formedFrameOf } from "../../lib/kicad/formed-frame.ts"
import { PIN_PATTERNS, pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import { FORMED, PAIRS } from "./formed-frame-fixtures.ts"


const FIXTURES = path.resolve(import.meta.dir, "..", "fixtures", "stripboard")

/**
 * The five committed dumps that carry a formed part.
 *
 * `transistor-preamp-loop` and `transistor-preamp-buffered` were captured for
 * this test; the other three were already here. Their provenance, and the
 * commands that made them, are in `tests/fixtures/stripboard/provenance.txt`.
 */
const BOARDS = [
  "pt2399-core",
  "transistor-preamp-buffered",
  "transistor-preamp-feedback",
  "transistor-preamp-loop",
  "transistor-preamp-staged",
] as const

const dumpOf = (board: string): BoardDump =>
  parseBoardDump(fs.readFileSync(path.join(FIXTURES, `${board}.dump`), "utf8"))

interface Placed {
  readonly board: string
  readonly ref: string
  readonly footprint: string
  /** Leads in pin-number order, each as a board hole. */
  readonly pins: readonly { readonly pin: string; readonly row: number; readonly col: number }[]
  /** Whether the placement's own lead span is the footprint's prepared span. */
  readonly atPreparedSpan: boolean
}

/** Every placed formed part on the committed boards, with its leads. */
function formedPlacements(): readonly Placed[] {
  const byType = new Map<string, string>(PAIRS.map((pair) => [pair.type, pair.moulded]))
  const found: Placed[] = []
  for (const board of BOARDS) {
    const dump = dumpOf(board)
    for (const part of dump.parts) {
      const footprint = byType.get(part.type)
      if (footprint === undefined) continue
      const pins = [...(dump.pins[part.ref] ?? [])].sort((a, b) => Number(a.pin) - Number(b.pin))
      if (pins.length < 2) continue
      const pattern = pinPatternFor(footprint)
      if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
      const first = pins[0]
      const last = pins[pins.length - 1]
      if (first === undefined || last === undefined) throw new Error("unreachable")
      const steps = Math.abs(last.row - first.row) + Math.abs(last.col - first.col)
      const prepared = (pins.length - 1) * pattern.accommodation.preparedPitchSteps
      found.push({ board, ref: part.ref, footprint, pins, atPreparedSpan: steps === prepared })
    }
  }
  return found
}

/** Every hole some part's lead sits in on one board, by `ref.pin`. */
function occupiedHoles(board: string): ReadonlyMap<string, string> {
  const occupied = new Map<string, string>()
  for (const [ref, pins] of Object.entries(dumpOf(board).pins)) {
    for (const pin of pins) occupied.set(`${pin.row},${pin.col}`, `${ref}.${pin.pin}`)
  }
  return occupied
}

/**
 * The holes an anchor's body outline would claim BEYOND the lead holes, as
 * positions on the board, for one placement.
 *
 * It walks only the along-row axis, which is the axis the anchor decides. The
 * across-strip extent is the same under every anchor - forming moves a lead
 * along its own strip - so including it would put the same holes in all three
 * answers and hide the difference the test is looking for.
 */
function extraAlongRow(placement: Placed, shiftMm: number): readonly string[] {
  const extent = occupiedAreaFor(placement.footprint)
  const pattern = pinPatternFor(placement.footprint)
  if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
  const lo = extent.outlineMm.minXMm + shiftMm
  const hi = extent.outlineMm.maxXMm + shiftMm
  const half = GRID_MM / 2
  const slack = 1e-9
  const firstHole = Math.floor((lo - half) / GRID_MM + slack) + 1
  const lastHole = Math.ceil((hi + half) / GRID_MM - slack) - 1
  const span = (placement.pins.length - 1) * pattern.accommodation.preparedPitchSteps
  const first = placement.pins[0]
  const last = placement.pins[placement.pins.length - 1]
  if (first === undefined || last === undefined) throw new Error("unreachable")
  const stepRow = Math.sign(last.row - first.row)
  const stepCol = Math.sign(last.col - first.col)
  const holes: string[] = []
  for (let before = 1; before <= 0 - firstHole; before += 1) {
    holes.push(`${first.row - stepRow * before},${first.col - stepCol * before}`)
  }
  for (let after = 1; after <= lastHole - span; after += 1) {
    holes.push(`${last.row + stepRow * after},${last.col + stepCol * after}`)
  }
  return holes
}

const shiftFor = (footprint: string, anchor: "lead-row-midpoint" | "first-lead" | "last-lead") => {
  const pattern = pinPatternFor(footprint)
  if (pattern.accommodation.kind !== "formed-to-grid") throw new Error("unreachable")
  return formedFrameOf({
    ...pattern,
    accommodation: { ...pattern.accommodation, anchor },
  }).shiftMm
}

test("the committed boards carry formed parts at their prepared span, so this test has teeth", () => {
  const placements = formedPlacements()
  expect(placements.length, "formed parts across the five committed dumps").toBeGreaterThan(20)
  const atSpan = placements.filter((placement) => placement.atPreparedSpan)
  expect(atSpan.length, "placements at the footprint's own prepared span").toBeGreaterThan(9)
  // A measurement, reported rather than engineered around: VeroRoute stretches
  // a two-pin part to whatever span the layout wants, so most electrolytics on
  // these boards are placed WIDER than the prepared pitch. A placement like
  // that is not evidence about the anchor - the body sits somewhere along a span
  // the footprint does not describe - so the anchor checks below use `atSpan`.
  expect(atSpan.length, "and most are not").toBeLessThan(placements.length)
})

test("the recorded anchor claims no hole another part's lead occupies", () => {
  const shift = new Map<string, number>(
    FORMED.map((footprint) => [footprint, shiftFor(footprint, "lead-row-midpoint")]),
  )
  for (const placement of formedPlacements()) {
    if (!placement.atPreparedSpan) continue
    const occupied = occupiedHoles(placement.board)
    const taken = extraAlongRow(placement, shift.get(placement.footprint) ?? NaN).filter((hole) => {
      const holder = occupied.get(hole)
      return holder !== undefined && !holder.startsWith(`${placement.ref}.`)
    })
    expect(taken, `${placement.board} ${placement.ref} (${placement.footprint})`).toEqual([])
  }
})

test("the loop board's C6 refutes both alternatives by itself", () => {
  // The decisive placement: a 5mm can at its prepared span with its row full on
  // both sides. `first-lead` puts the can over the hole before its first lead
  // and `last-lead` over the hole after its last, and the owner's layout has a
  // lead in each. Both holder names are read out of the dump, not written here.
  const c6 = formedPlacements().find(
    (placement) => placement.board === "transistor-preamp-loop" && placement.ref === "C6",
  )
  if (c6 === undefined) throw new Error("the loop board's C6 is missing from the committed dump")
  expect(c6.footprint).toBe("Capacitor_THT:CP_Radial_D5.0mm_P2.00mm")
  expect(c6.atPreparedSpan, "C6 is placed at the prepared one-step span").toBe(true)
  const occupied = occupiedHoles("transistor-preamp-loop")
  for (const anchor of ["first-lead", "last-lead"] as const) {
    const extras = extraAlongRow(c6, shiftFor(c6.footprint, anchor))
    expect(extras.length, `${anchor} claims a hole beyond C6's leads`).toBe(1)
    const hole = extras[0]
    if (hole === undefined) throw new Error("unreachable")
    expect(occupied.get(hole), `${anchor}'s extra hole ${hole} is another part's lead`).toBeString()
  }
  // And the recorded anchor claims neither.
  expect(extraAlongRow(c6, shiftFor(c6.footprint, "lead-row-midpoint"))).toEqual([])
})

