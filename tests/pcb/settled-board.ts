/**
 * THE COMMITTED pt2399-core BOARD AND ITS APPROVED CRITERIA, for the three test
 * files that check the settled geometry.
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
