/**
 * THE SETTLED pt2399-core BOARD AND ITS APPROVED CRITERIA, for the three test
 * files that check the settled geometry.
 *
 * `BOARD` IS THE OWNER'S LIVE BOARD, AND DELIBERATELY SO. He adopted the routed
 * candidate on 2026-11-17 to hand-edit it in KiCad, and the assertions reached
 * through here are about THE DELIVERABLE: that the board being sent out grades
 * clean against the engine's own `oob_count`, and that its `.kicad_dru` is what
 * the approved 2 mm figure generates. Those have to fail when a hand edit breaks
 * a rule, so they must read his file and not a copy of it.
 *
 * A TEST THAT ASKS ABOUT THE TOOLING TAKES `./placed-board.ts`'s FIXTURE
 * INSTEAD, and `tests/pcb/mounting-hole-placement.test.ts` is the worked
 * example: byte-for-byte idempotence and the six-decimal coordinate spelling are
 * properties of what the placer writes, and a person saving in KiCad reformats
 * both without changing anything that matters. That module states the dividing
 * line; `../fixtures/pcb/pt2399-core-placed/NOTES.txt` records the eight tests
 * that had it the wrong way round and what broke them.
 *
 * `BOARD` WAS POINTED AT THE FIXTURE FOR ONE REVISION OF THIS FILE AND THAT WAS
 * TOO BROAD - it took the three engine-integration tests and the `.kicad_dru`
 * check off the deliverable with them, and the fixture has no project or rules
 * file beside it, so all four went red and said so immediately. Left recorded
 * because the handle being shared is exactly what makes the mistake easy: the
 * four files below do not all ask the same kind of question.
 *
 * It exists because `tests/pcb/settled-geometry.test.ts` passed this project's
 * 300-500 line ceiling at 540, holding three separable responsibilities. Those
 * are now three files - the outline and what leaves it, the mounting hardware on
 * the board, and the `.kicad_dru` mechanism - and this is the paths and the
 * readers they share rather than copy.
 *
 * NOTHING HERE ASSERTS ANYTHING. Every reader opens a file on every call rather
 * than caching it at import time, so a test that rewrites the board in scratch
 * and a test that reads the committed bytes cannot see each other's state.
 */
import fs from "node:fs"
import path from "node:path"
import { MOUNTING_FOOTPRINT } from "../../tools/pcb/mounting-hardware.ts"
import type { Bounds } from "../../tools/pcb/resolve-intent-zones.ts"
import { placedCourtyards } from "../../tools/pcb/board-outline.ts"

export const CIRCUIT = path.resolve(import.meta.dir, "../../circuits/pt2399-core")
/** The owner's live board, which is the deliverable. See this file's header. */
export const BOARD = path.join(CIRCUIT, "pt2399-core.kicad_pcb")
export const INTENT = path.join(CIRCUIT, "floorplan-intent.json")
export const RULES = path.join(CIRCUIT, "placement-rules.json")
export const PROJECT = path.join(CIRCUIT, "pt2399-core.kicad_pro")
export const LIB_TABLE = path.join(CIRCUIT, "fp-lib-table")
export const LIBRARY = path.join(CIRCUIT, "pt2399-core.pretty", `${MOUNTING_FOOTPRINT}.kicad_mod`)

export const boardText = (): string => fs.readFileSync(BOARD, "utf8")
export const intent = (): unknown => JSON.parse(fs.readFileSync(INTENT, "utf8"))
export const rules = (): unknown => JSON.parse(fs.readFileSync(RULES, "utf8"))

/**
 * How far a rect leaves `inset`, by the engine's own measure: the overhang
 * SUMMED OVER EDGES, not the worst one.
 *
 * That is `BoardOutlineGate.rect_outside_amount`'s semantics
 * (`.tools/krt/py_placer/placement/legality.py:568` adds `margin - d` per rect
 * edge) and it is why a CORNER part counts twice.
 *
 * **WHAT HOLDS THIS REIMPLEMENTATION TO THE THING IT REIMPLEMENTS, stated
 * precisely because an earlier version of this comment overstated it.** It
 * claimed the integration test cross-checked the arithmetic, but that test ran
 * `check_floorplan.py` with NO `--clearance`, where the margin is 0.5 mm and
 * BOTH implementations are zero - so the only agreement it established was the
 * degenerate one, and the 12.000 mm figure this function actually produces
 * rested on a run recorded in prose. `tests/pcb/settled-geometry.test.ts` now
 * runs the grader a SECOND time at the approved 2.0 mm margin and compares the
 * engine's own `oob_count` and `oob_amount` against what this function sums,
 * part by part as well as in total. That is the cross-check; the zero-margin
 * run is a separate assertion about the board.
 */
export function outsideAmount(rect: Bounds, inset: Bounds): number {
  return (
    Math.max(0, inset.x0 - rect.x0) +
    Math.max(0, rect.x1 - inset.x1) +
    Math.max(0, inset.y0 - rect.y0) +
    Math.max(0, rect.y1 - inset.y1)
  )
}

export function insetBy(bounds: Bounds, margin: number): Bounds {
  return {
    x0: bounds.x0 + margin,
    y0: bounds.y0 + margin,
    x1: bounds.x1 - margin,
    y1: bounds.y1 - margin,
  }
}

/** Which of the committed board's parts leave `inset`, and by how much. */
export function partsLeaving(inset: Bounds): readonly { readonly ref: string; readonly amount: number }[] {
  return placedCourtyards(boardText(), BOARD)
    .map((c) => ({ ref: c.ref, amount: outsideAmount(c.box, inset) }))
    .filter((p) => p.amount > 1e-9)
    .sort((a, b) => a.ref.localeCompare(b.ref))
}
