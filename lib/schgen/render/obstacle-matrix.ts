/**
 * The obstacle-category matrix, enumerated once.
 *
 * Hand-written: it has no pedals source, because the pedals generator never
 * did this. `docs/known-gaps.md` **G85** records why it exists - that
 * generator's ~160 clearance refusals accreted ONE PAIR AT A TIME over eleven
 * steps, and every new check found that the previous checks had a blind spot
 * of the same shape: *category A had been modelled as an obstacle for category
 * B but not for category C.* Body-vs-anchor but not body-vs-glyph.
 * Glyph-vs-text but not glyph-vs-body. Text-vs-everything but not
 * text-vs-no-connect-marker.
 *
 * This module is therefore not a check. It is the LEDGER of which pairs a
 * check decides, so a reader can see the blind spots instead of discovering
 * them one drawing at a time, and so Tasks 12-13's second geometry source
 * meets a stated matrix rather than a set of habits.
 *
 * **Every `checkedBy` names a function this repository contains**, with the
 * file it lives in, traced to the lines that compare those two categories -
 * not inferred from a name. Several are private to their module; a reader goes
 * and reads them there. **Nothing here was taken from the brief's `Produces`
 * block or from a function's name.**
 *
 * See `docs/known-gaps.md` for which cells were established by reading rather
 * than by a test that could have failed, and for the deviations from G85's
 * suggested mechanism that filling the matrix forced.
 *
 * The 105 cells live in five sibling `obstacle-pairs-*.ts` modules, split by
 * row family so no file passes this repository's 300-500 line ceiling, with
 * the reasons several cells share written once in
 * `obstacle-pairs-reasons.ts`. Those modules import this file's types only
 * (`import type`, erased), so the dependency runs one way at run time.
 */
import { BODY_PAIRS, PIN_LINE_PAIRS } from "./obstacle-pairs-body.ts"
import {
  INTERIOR_GRAPHIC_PAIRS, JUNCTION_PAIRS, WIRE_PAIRS,
} from "./obstacle-pairs-graphic-wire.ts"
import { LABEL_OUTLINE_PAIRS, POWER_GLYPH_PAIRS, PWR_FLAG_GLYPH_PAIRS } from "./obstacle-pairs-glyph.ts"
import { PIN_NAME_PAIRS, PIN_NUMBER_PAIRS } from "./obstacle-pairs-pin-text.ts"
import {
  DNP_CROSS_PAIRS, FIELD_TEXT_PAIRS, FRAME_BORDER_PAIRS, NO_CONNECT_MARKER_PAIRS,
} from "./obstacle-pairs-text-frame.ts"

/**
 * What a drawn schematic is made of, for clearance purposes. G85's list, in
 * G85's order, extended by nothing: the point of enumerating up front is that
 * the list is fixed before the drawings exist, so a later category is a
 * deliberate, reviewed addition rather than a discovery.
 *
 * What each one IS in this tree, so a `checkedBy` can be checked:
 *
 * - `body` - a placed unit's box. Three boxes answer to this name and they are
 *   NOT interchangeable: `LibSymbol.boxes` (graphics plus BOTH pin ends, so it
 *   spans out to the pin tips - `lib-pins.ts`'s `unitBoxes`), used by
 *   `layout-check.ts`'s `overlapProblems` and `body-clearance.ts`;
 *   `LibSymbol.bodies` (graphics plus the body-side pin ends only -
 *   `bodyBoxes`), which text is placed against; and `graphicsBox(graphics)`
 *   (the drawn strokes and text areas alone), which `glyph-clearance.ts` uses.
 *   Where the distinction decides a cell, the cell says so.
 * - `pin-line` - the drawn pin segment, tip to body: `unitText`'s `pins`, and
 *   `body-clearance.ts`'s `PlacedSegment` (`end`/`inner`).
 * - `pin-number` - the pin number drawn along the pin line: `unitText`'s
 *   `decorations`, which also carry an offset-0 pin NAME.
 * - `pin-name` - an inside pin name (`namesOffset > 0`): `unitText`'s
 *   `nameBoxes`, reaching the scene inside `interiorBoxes`.
 * - `interior-graphic` - a unit's graphic strokes (`unitText`'s `strokes`) and
 *   its interior text and arc areas (`graphics.blocks`, in `interiorBoxes`).
 * - `wire` - a `layout.wires` entry; `ConnItem` of kind `"wire"`.
 * - `junction` - a cosmetic dot from `junctionPoints` (`connectivity.ts`).
 * - `power-glyph` - `powerText(...).glyph` of a `PowerSymbol` with
 *   `flag: false`.
 * - `pwr-flag-glyph` - the same with `flag: true`.
 * - `label-outline` - `labelBox(l)`: a global label's outline and its
 *   intersheet references.
 * - `field-text` - a text item in `TextScene.texts`: a unit's Reference and
 *   Value, a power symbol's value, a sheet text, a frame title, and a DNP
 *   pin-polarity mark (`Named.mark === true`). `pin-marks.ts` states that the
 *   marks ARE sheet text and the checks treat them as such.
 * - `frame-border` - a `Frame.box` edge; `TextScene.frames`.
 * - `no-connect-marker` - the X at a `noConnectEnds` pin, HIDDEN PINS
 *   INCLUDED: a one-grid-step box in `unitText`'s `decorations`.
 * - `dnp-cross` - `dnpCross(u, pl)`; `TextScene.crosses`.
 */
export const OBSTACLE_CATEGORIES = [
  "body",
  "pin-line",
  "pin-number",
  "pin-name",
  "interior-graphic",
  "wire",
  "junction",
  "power-glyph",
  "pwr-flag-glyph",
  "label-outline",
  "field-text",
  "frame-border",
  "no-connect-marker",
  "dnp-cross",
] as const

export type ObstacleCategory = (typeof OBSTACLE_CATEGORIES)[number]

export interface PairCoverage {
  readonly a: ObstacleCategory
  readonly b: ObstacleCategory
  /** The function that decides this pair, named so a reader can go and read it. */
  readonly checkedBy: string | null
  /** Why the pair needs no check — never blank when `checkedBy` is null. */
  readonly meaninglessBecause: string | null
  /**
   * The pair is decided in one direction only, with the reason.
   *
   * **WIDENED, AND THE WIDENING IS RECORDED** (`docs/known-gaps.md`): the
   * brief's wording is direction-sensitivity, and most of this repository's
   * geometry tests are symmetric box-or-segment overlaps with no direction to
   * be sensitive to. What they DO have is partial subjects - a check that
   * decides a pair for a point rather than for a box, for a foreign unit but
   * not for the same unit, or for one subset of a category. That is the same
   * failure G85 names (A modelled as an obstacle for B but not for C) one
   * level down, so it is recorded here rather than dropped for want of a
   * field. Non-null means: there is a check, AND here is what it does not
   * reach.
   */
  readonly asymmetric: string | null
}

/** Every unordered pair of categories including self-pairs, as `a|b` with a and b sorted. */
export function allPairKeys(): readonly string[] {
  const out: string[] = []
  for (let i = 0; i < OBSTACLE_CATEGORIES.length; i += 1) {
    for (let j = i; j < OBSTACLE_CATEGORIES.length; j += 1) {
      const a = OBSTACLE_CATEGORIES[i]
      const b = OBSTACLE_CATEGORIES[j]
      if (a === undefined || b === undefined) throw new Error("unreachable: index inside OBSTACLE_CATEGORIES")
      out.push([a, b].sort().join("|"))
    }
  }
  return out
}

/**
 * Every cell, in `OBSTACLE_CATEGORIES` order by row then by column, so the
 * concatenation reads as the upper triangle of the matrix including its
 * diagonal.
 */
export const PAIR_COVERAGE: readonly PairCoverage[] = [
  ...BODY_PAIRS,
  ...PIN_LINE_PAIRS,
  ...PIN_NUMBER_PAIRS,
  ...PIN_NAME_PAIRS,
  ...INTERIOR_GRAPHIC_PAIRS,
  ...WIRE_PAIRS,
  ...JUNCTION_PAIRS,
  ...POWER_GLYPH_PAIRS,
  ...PWR_FLAG_GLYPH_PAIRS,
  ...LABEL_OUTLINE_PAIRS,
  ...FIELD_TEXT_PAIRS,
  ...FRAME_BORDER_PAIRS,
  ...NO_CONNECT_MARKER_PAIRS,
  ...DNP_CROSS_PAIRS,
]

/**
 * The pairs this matrix accounts for neither with a check nor with a reason -
 * the blind spots G85 is about, as data. Empty is the only acceptable value,
 * and `tests/schgen/render/obstacle-matrix.test.ts` is where that is asserted.
 *
 * A pair MISSING from `PAIR_COVERAGE` altogether is uncovered too: an
 * enumeration that silently omits a pair is exactly the failure mode this
 * module exists to stop, so omission counts as uncovered rather than as
 * nothing.
 */
export function uncoveredPairs(): readonly string[] {
  const present = new Map<string, PairCoverage>()
  for (const p of PAIR_COVERAGE) present.set([p.a, p.b].sort().join("|"), p)
  return allPairKeys().filter((key) => {
    const p = present.get(key)
    if (p === undefined) return true
    return p.checkedBy === null && p.meaninglessBecause === null
  })
}
