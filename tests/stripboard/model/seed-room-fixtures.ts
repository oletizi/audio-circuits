/**
 * The owner's two hand-built boards, measured the same way a generated seed is -
 * so the clearance figures the construction cites are checked against the boards
 * rather than quoted from a comment.
 *
 * **WHY THIS IS A FIXTURE AND NOT A COMMENT.** `lib/stripboard/seed-area.ts`
 * states four measurements as its evidence: no lead under a rigid part, the
 * nearest-neighbour clearance distribution, the four overlapping pairs on
 * `buffered`, and seven of eight wires crossing nothing. *"Check any claim you
 * put in a comment against something you ran"* is this plan's most reliable
 * lesson, so `./seed-room.test.ts` re-derives all four from the dumps and the
 * KiCad files every run.
 *
 * **THE MEASUREMENT USES THE SAME `areaRect` THE PLACER USES**, from each part's
 * real lead holes and solved facing, so the two sides of the comparison are the
 * same quantity. The alternative - `geometryOf`'s body-and-pads union - differs
 * on a STRETCHED part, where the moulded body no longer reaches past the leads
 * and `areaRect` claims up to two holes more than the union does. Measuring the
 * hand boards one way and the seeds the other would have made every figure here
 * incomparable with the thing it is evidence for.
 */
import fs from "node:fs"
import { parseBoardDump } from "../../../tools/guide/dump.ts"
import { facingOf, type PinHole } from "../../../tools/stripboard/vero-import-facing.ts"
import { LEAD_SPANS, leadSpanFor } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import { padHolesFor } from "../../../lib/kicad/formed-frame.ts"
import type { Hole } from "../../../lib/stripboard/board.ts"
import { areaRect, type BodyMargins, type FramePin, type PartArea } from "../../../lib/stripboard/seed-area.ts"
import { bodyMarginsFor } from "../../../lib/stripboard/seed-parts.ts"
import { COMMITTED_BOARDS, footprintsOf } from "../vero-import-fixtures.ts"

/** One hand-built board, reduced to the areas its parts cover and the wires it carries. */
export interface HandBoard {
  readonly name: string
  readonly areas: readonly PartArea[]
  readonly wires: readonly { readonly from: Hole; readonly to: Hole }[]
  readonly skipped: readonly string[]
}

/**
 * A part's pins in its own frame, from the holes the dump puts them in.
 *
 * For a part with one pin row the along steps are the hole offsets along that
 * row; for a multi-row field they are the recorded pad offsets, which a layout
 * cannot change. Both are taken relative to the solved origin, which is the
 * frame `areaRect` applies the margins in.
 */
function framePinsOf(footprint: string, pins: readonly PinHole[], origin: Hole): readonly FramePin[] {
  const pattern = PIN_PATTERNS.get(footprint)
  if (pattern === undefined || pattern.classification.kind !== "rows") {
    throw new Error(`"${footprint}" has no row classification, so it has no frame to measure in.`)
  }
  if (pattern.classification.rows.length > 1) {
    const pads = padHolesFor(pattern)
    return pins.map((pin) => {
      const pad = pads.find((entry) => entry.pad === pin.pin)
      if (pad === undefined) throw new Error(`"${footprint}" has no pad "${pin.pin}".`)
      return { alongSteps: pad.xSteps, acrossSteps: pad.ySteps }
    })
  }
  // One row: the leads lie on a line, and the layout may have stretched them, so
  // the along step is the distance from the origin along whichever axis moved.
  return pins.map((pin) => ({
    alongSteps:
      pin.hole.strip === origin.strip
        ? Math.abs(pin.hole.column - origin.column)
        : Math.abs(pin.hole.strip - origin.strip),
    acrossSteps: 0,
  }))
}

export function handBoard(name: string): HandBoard {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) throw new Error(`"${name}" is not in COMMITTED_BOARDS.`)
  const dump = parseBoardDump(fs.readFileSync(board.dump, "utf8"))
  const footprints = footprintsOf(board)
  const areas: PartArea[] = []
  const skipped: string[] = []
  for (const [ref, pins] of Object.entries(dump.pins).sort(([a], [b]) => a.localeCompare(b))) {
    const footprint = footprints.get(ref)
    if (footprint === undefined) {
      skipped.push(`${ref}: no footprint in the map`)
      continue
    }
    const holes: readonly PinHole[] = pins.map((pin) => ({
      pin: pin.pin,
      hole: { strip: pin.row, column: pin.col },
    }))
    const fit = facingOf(footprint, holes, PIN_PATTERNS)
    if (fit.kind !== "fitted") {
      skipped.push(`${ref}: facing ${fit.kind}`)
      continue
    }
    const margins = marginsOf(footprint)
    areas.push({
      ref,
      rigid: leadSpanFor(footprint).geometry.kind === "rigid",
      rect: areaRect(
        framePinsOf(footprint, holes, fit.facing.origin),
        margins,
        fit.facing.origin,
        fit.facing.direction,
      ),
      leads: holes.map((entry) => entry.hole),
    })
  }
  return {
    name,
    areas,
    wires: dump.wires.map((wire) => ({
      from: { strip: wire.ends[0].row, column: wire.ends[0].col },
      to: { strip: wire.ends[1].row, column: wire.ends[1].col },
    })),
    skipped,
  }
}

/**
 * The same margins `lib/stripboard/seed-parts.ts` derives, reached through that
 * module so the hand-board measurement and the placer cannot drift apart.
 */
function marginsOf(footprint: string): BodyMargins {
  return bodyMarginsFor(footprint, { patterns: PIN_PATTERNS, spans: LEAD_SPANS })
}
