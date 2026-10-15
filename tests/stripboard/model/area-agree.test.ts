/**
 * The two derivations of a placed part's occupied rectangle, tied to each other
 * over real placements.
 *
 * `areaFor` in `lib/stripboard/moves.ts` (reached through `partAreasOf`) and
 * `areaRect` in `lib/stripboard/seed-area.ts` both answer *"how much of the
 * board does this part take"*, and both feed the SAME hard rule -
 * `routedUnderRigid`, the owner's *"rigid parts shouldn't be routed
 * through/under"* - from opposite sides: the seed rejects a column with
 * `areaRect`, and the move generator rejects a relocation with `areaFor` via
 * `partAreasOf`. Until this file there was no test in which both ran over one
 * placement. `./moves.test.ts` uses `partAreasOf`, `./seed-room.test.ts`
 * rebuilds with `areaRect`, and the two never met - so a drift between them
 * would have shown up as the seed and the move generator silently disagreeing
 * about how big a part is, with every test still green.
 *
 * **WHAT IS TIED AND WHAT IS NOT.** The two take their input in different
 * vocabularies: `areaFor` reads the placed lead holes, `areaRect` reads frame
 * coordinates plus an origin and a facing. Putting one placement into both
 * therefore needs a conversion, and the conversion is CHECKED rather than
 * assumed - `frameOf` inverts a lead hole through the two unit vectors
 * `holeInFrame` itself returns, and every converted lead is mapped back through
 * `holeInFrame` and asserted to land in the hole it came from before any
 * rectangle is compared. Without that round trip a converted frame could be
 * wrong in a way that made both sides wrong together.
 *
 * The body margins are NOT tied here, because there is only one derivation of
 * them to tie: `geometryFor` and this file both call `bodyMarginsFor`, which is
 * the single owner. What this file establishes is that two ways of growing a
 * lead set by those margins produce one rectangle.
 *
 * **WHY THE FRAME IS TAKEN FROM THE PLACED LEADS AND NOT FROM THE FOOTPRINT'S
 * MOULDED PADS.** Both functions' own comments say the quantity is the leads AS
 * PLACED - `areaFor`'s says so and points at `areaRect` for the same reason -
 * and on these boards the two differ in two ways that are both admitted and
 * neither a defect. A stretched two-terminal part's leads are not at its
 * moulded pitch (3 placements here), and a `TRIM_FLAT` RM-065 fits only a
 * reflected transform, whose label exchange `Placement` does not carry (9
 * placements here, which is every RM-065 on both boards). A frame built from
 * `padHolesFor` instead would put all 12 of those rectangles somewhere the part
 * is not - by two strips for the trimmers - and this comparison would read as a
 * disagreement between the two functions when it is nothing of the kind.
 * `tools/stripboard/vero-import-facing.ts` states both admissions.
 */
import { expect, test } from "bun:test"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { holeInFrame, type Hole, type Placement } from "../../../lib/stripboard/board.ts"
import { partAreasOf } from "../../../lib/stripboard/moves.ts"
import { areaRect, type FramePin, type Rect } from "../../../lib/stripboard/seed-area.ts"
import { bodyMarginsFor } from "../../../lib/stripboard/seed-parts.ts"
import { candidateFromDump } from "../../../tools/stripboard/vero-import.ts"
import { facingOf } from "../../../tools/stripboard/vero-import-facing.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  type CommittedBoard,
} from "../vero-import-fixtures.ts"
import { RECORDED_SPANS } from "./seed-fixtures.ts"

/**
 * The boards this comparison runs on, with the number of placements each
 * contributes.
 *
 * **THE COUNTS ARE PINNED SO THE COMPARISON CANNOT SHRINK QUIETLY**, which is
 * the failure mode `./cuts-agree.test.ts` names for the same reason: a
 * differential test that still passes over fewer cases is worse than one that
 * fails. These two are the committed boards `candidateFromDump` accepts; the
 * other five refuse before a candidate exists, and that table is
 * `./cuts-agree.test.ts`'s to keep.
 */
const COMPARED: ReadonlyMap<string, number> = new Map([
  ["transistor-preamp-feedback", 16],
  ["transistor-preamp-loop", 25],
])

const FRAME_ORIGIN: Hole = { strip: 0, column: 0 }

/**
 * A placed hole's position in its part's own frame, inverted through
 * `holeInFrame`'s two unit vectors.
 *
 * **IT DOES NOT RE-SPELL THE SIGN TABLE**, which is the mistake `board.ts`
 * names at `holeInFrame` and both area derivations avoid the same way: the
 * along and across steps come from calling `holeInFrame` itself, and the
 * inversion is one dot product each. The two vectors are unit and orthogonal,
 * so projecting onto them is exact.
 */
function frameOf(hole: Hole, origin: Hole, direction: Placement["direction"]): FramePin {
  const along = holeInFrame(FRAME_ORIGIN, direction, 1, 0)
  const across = holeInFrame(FRAME_ORIGIN, direction, 0, 1)
  const dStrip = hole.strip - origin.strip
  const dColumn = hole.column - origin.column
  return {
    alongSteps: dStrip * along.strip + dColumn * along.column,
    acrossSteps: dStrip * across.strip + dColumn * across.column,
  }
}

function boardNamed(name: string): CommittedBoard {
  const found = COMMITTED_BOARDS.find((board) => board.name === name)
  if (found === undefined) {
    throw new Error(
      `"${name}" is not in COMMITTED_BOARDS, so this comparison has no board to run on. ` +
        "Fix COMPARED above or tests/stripboard/vero-import-fixtures.ts; nothing is substituted, " +
        "because a comparison that silently ran on one board would still pass.",
    )
  }
  return found
}

/** What one placement contributes, so the coverage below is counted and not claimed. */
interface Compared {
  readonly ref: string
  readonly direction: Placement["direction"]
  readonly leads: number
  readonly stretched: boolean
  readonly mirroredLabels: boolean
  readonly fromLeads: Rect
  readonly fromFrame: Rect
}

function comparedOn(name: string): readonly Compared[] {
  const board = boardNamed(name)
  const candidate = candidateFromDump(
    dumpTextOf(board),
    referenceOf(board),
    footprintsOf(board),
    PIN_PATTERNS,
  )
  const areas = partAreasOf(candidate, RECORDED_SPANS, PIN_PATTERNS)
  return candidate.placements.map((placement, index) => {
    const area = areas[index]
    if (area === undefined) {
      throw new Error(
        `${name}: index ${index} names no area, although partAreasOf maps over this same ` +
          "placement list. Fix partAreasOf; the placement is not skipped, because a skipped " +
          "placement is a rectangle nobody compared that still counts as compared.",
      )
    }
    expect(area.ref, `${name}: partAreasOf keeps the placement order`).toBe(placement.ref)
    const leads = [...placement.pins.values()]
    const frame = leads.map((hole) => frameOf(hole, placement.origin, placement.direction))
    // THE CONVERSION, CHECKED. Every converted lead maps back through
    // holeInFrame to the hole the dump put it in, so the frame handed to
    // areaRect below really is this placement and not a mirror or a turn of it.
    for (const [at, pin] of frame.entries()) {
      const lead = leads[at]
      if (lead === undefined) {
        throw new Error(`${name} ${placement.ref}: lead ${at} vanished between two maps.`)
      }
      expect(
        holeInFrame(placement.origin, placement.direction, pin.alongSteps, pin.acrossSteps),
        `${name} ${placement.ref}: frame coordinate ${at} does not map back to its hole`,
      ).toEqual(lead)
    }
    const fit = facingOf(
      placement.footprint,
      [...placement.pins].map(([pin, hole]) => ({ pin, hole })),
      PIN_PATTERNS,
      RECORDED_SPANS,
    )
    if (fit.kind !== "fitted") {
      throw new Error(
        `${name} ${placement.ref}: facingOf reports "${fit.kind}" for a placement ` +
          "candidateFromDump already accepted, so the two disagree about what fits. Fix " +
          "tools/stripboard/vero-import-facing.ts; this placement is not dropped from the " +
          "comparison, because a dropped placement leaves the counts below passing on less.",
      )
    }
    return {
      ref: placement.ref,
      direction: placement.direction,
      leads: leads.length,
      stretched: fit.facing.stretched,
      mirroredLabels: fit.facing.mirroredLabels,
      fromLeads: area.rect,
      fromFrame: areaRect(
        frame,
        bodyMarginsFor(placement.footprint, { patterns: PIN_PATTERNS, spans: RECORDED_SPANS }),
        placement.origin,
        placement.direction,
      ),
    }
  })
}

const ALL: readonly Compared[] = [...COMPARED.keys()].flatMap((name) => comparedOn(name))

for (const [name, placements] of COMPARED) {
  test(`areaFor and areaRect give one rectangle per part on ${name}`, () => {
    const compared = comparedOn(name)
    expect(compared.length, `${name}'s placement count`).toBe(placements)
    for (const entry of compared) {
      expect(
        entry.fromFrame,
        `${name} ${entry.ref} (${entry.direction}, ${entry.leads} leads): the seed's areaRect ` +
          "and the move generator's areaFor disagree about how big this part is",
      ).toEqual(entry.fromLeads)
    }
  })
}

test("the placements compared cover every facing, a multi-lead part, a stretch and a reflection", () => {
  // WITHOUT THIS THE AGREEMENT ABOVE COULD BE AGREEMENT ON THE EASY CASE. The
  // quarter-turns are where a re-spelled sign table would diverge, a part with
  // more than two leads is where a bounding box stops being a line, a stretch
  // is where the moulded pads stop describing the part, and a reflected fit is
  // where the facing alone stops describing it. All four are present, counted
  // here rather than asserted in the comment above.
  expect(ALL.length, "placements compared in total").toBe(41)
  expect([...new Set(ALL.map((entry) => entry.direction))].sort()).toEqual(["E", "N", "S", "W"])
  expect(ALL.filter((entry) => entry.leads > 2).length, "placements with more than two leads")
    .toBe(12)
  expect(ALL.filter((entry) => entry.stretched).length, "stretched placements").toBe(3)
  expect(ALL.filter((entry) => entry.mirroredLabels).length, "reflected-label placements").toBe(9)
})
