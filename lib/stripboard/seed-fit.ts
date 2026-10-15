/**
 * THE TWO PLACERS: where a two-lead part's leads go, and how a moulded pin field
 * is laid down.
 *
 * Both decide the STRIPS themselves - that is what the net-to-strip assignment
 * is for - and both hand the COLUMN to `chooseColumn` in `./seed-place.ts`,
 * which ranks it by how comfortable the position is to build. Split from that
 * file for the line ceiling; the seam is that this file decides which strips a
 * part may sit on and that one decides where along them.
 */
import type { Hole, Placement } from "./board.ts"
import type { FramePin } from "./seed-area.ts"
import {
  chooseColumn,
  commit,
  homeOf,
  scratchFree,
  type Position,
  type Seat,
  type Workspace,
} from "./seed-place.ts"
import {
  refuse,
  spanFor,
  type FixedFieldPart,
  type SeedLead,
  type TwoLeadPart,
} from "./seed-model.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/**
 * The directions a pin row may be laid in, and **why there are two of them
 * rather than four.**
 *
 * `holeInFrame` in `./board.ts` maps a footprint's own x axis - the axis
 * `classifyPads` decomposes its pin ROW along - onto the board. Under `E` and
 * `W` that axis runs along a strip, which puts every pin of the row on ONE
 * strip; under `S` and `N` it runs across the strips, one pin per strip. **Only
 * the second is used**, because a row along one strip is several nets' leads
 * interleaved on one conductor, and that is the open no cut list can close.
 * Which of `S` and `N` a part takes decides only which side of it the other rows
 * sit on, and the owner has ruled that question away for the one part here it
 * applies to: *"I dont care about trimmer orientation."*
 */
const ACROSS_DIRECTIONS: readonly ("S" | "N")[] = ["S", "N"]

const SPAN_SOURCE =
  "The bounds are the owner's recorded part geometry (lib/kicad/lead-span.ts, HC5 and HC9) and " +
  "are not negotiable by a layout: a span the part cannot make is a board that scores well and " +
  "cannot be built"

/** Two leads across the strips: the first at frame step 0, the second at the span. */
function acrossFrame(steps: number): readonly FramePin[] {
  return [
    { alongSteps: 0, acrossSteps: 0 },
    { alongSteps: steps, acrossSteps: 0 },
  ]
}

function seatPair(first: SeedLead, second: SeedLead, a: Hole, b: Hole): readonly Seat[] {
  return [
    { lead: first, hole: a },
    { lead: second, hole: b },
  ]
}

/**
 * A two-lead part, placed across the strips its two nets host, or with one lead
 * on a scratch strip and a join.
 *
 * **THE ORDER THE TWO SHAPES ARE TRIED IN IS BY COST AND NOT BY TASTE.** Both
 * leads on their own home strips costs nothing; one lead off its home strip
 * costs exactly one join, which `F` prices at `rho_w` or `rho_s`. There is no
 * third shape: a part whose anchor lead cannot sit on its own home strip either
 * way round is one this construction has nothing left to offer, and it refuses
 * rather than substituting a placement. (A part whose two leads are on ONE net
 * is a separate branch, not a third shape - it lies along that strip, because
 * the two holes are already on one conductor.)
 *
 * **A STRAY LEAD GOES ON THE SCRATCH STRIP CLOSEST TO ITS OWN NET'S HOME** that
 * the anchor lead can still reach. Closest, because the join is then shortest -
 * and at a distance of one strip it is a solder bridge rather than a wire, which
 * is how the owner's own board joins a trimmer's wiper to the end it is tied to
 * (`SOLDER 4,5 5,5` on `transistor-preamp-feedback`: strip 5 column 5 holds
 * `RV1.3`, and strip 4 is where its wiper `RV1.2` sits - checked against the
 * dump's own `PIN` lines, not read off the picture). It is a measurable quantity
 * driven down, not a preference.
 */
export function placeTwoLead(workspace: Workspace, part: TwoLeadPart): void {
  const span = spanFor(part.footprint, workspace.spans)
  const [first, second] = part.leads
  const homes = [homeOf(workspace, first.net), homeOf(workspace, second.net)] as const

  const direct =
    homes[0] === homes[1]
      ? alongOneStrip(workspace, part, span, homes[0])
      : acrossTwoHomes(workspace, part, span, homes)
  if (direct !== undefined) {
    commit(workspace, part, direct)
    return
  }
  if (homes[0] !== homes[1]) {
    for (const [anchor, stray] of [[first, second], [second, first]] as const) {
      const placed = withOneStray(workspace, part, span, anchor, stray)
      if (placed === undefined) continue
      commit(workspace, part, placed)
      return
    }
  }
  refuse(
    "leads-cannot-reach",
    `"${part.ref}" (${part.footprint}) has "${first.pin}" on net "${first.net}" and ` +
      `"${second.pin}" on net "${second.net}", and under ordering "${workspace.ordering}" those ` +
      `two nets are hosted on strips ${homes[0]} and ${homes[1]} - a span of ` +
      `${Math.abs(homes[0] - homes[1]) + 1} holes against this footprint's recorded ` +
      `[${span.minSpanHoles}, ${span.maxSpanHoles}].\nNo scratch strip the anchor lead can ` +
      "reach is free either, so neither a direct placement nor a single join can realise this " +
      `assignment - the board edge, the holes already taken, or a rigid part it would have to ` +
      `be routed under is what closed it off.\n${SPAN_SOURCE}.\nNothing is substituted: a ` +
      "placement outside the band is a seed the optimizer would have to repair, and a decision " +
      "that should never have been accepted is worse than a construction that stopped. Change " +
      "the ordering - the stride is what sets how far apart two hosted nets are - or give the " +
      "circuit a wider piece of stock.",
  )
}

/** Both leads on one net: along that strip, at the part's minimum span. */
function alongOneStrip(
  workspace: Workspace,
  part: TwoLeadPart,
  span: LeadSpan,
  strip: number,
): Position | undefined {
  const steps = span.minSpanHoles - 1
  const [first, second] = part.leads
  return chooseColumn(
    workspace,
    part,
    "E",
    acrossFrame(steps),
    (column) => ({ strip, column }),
    (column) =>
      seatPair(first, second, { strip, column }, { strip, column: column + steps }),
  )
}

/** Both leads on their own nets' home strips, if the span crosses the gap. */
function acrossTwoHomes(
  workspace: Workspace,
  part: TwoLeadPart,
  span: LeadSpan,
  homes: readonly [number, number],
): Position | undefined {
  const holes = Math.abs(homes[0] - homes[1]) + 1
  if (holes < span.minSpanHoles || holes > span.maxSpanHoles) return undefined
  const [first, second] = part.leads
  const direction: Placement["direction"] = homes[1] > homes[0] ? "S" : "N"
  return chooseColumn(
    workspace,
    part,
    direction,
    acrossFrame(holes - 1),
    (column) => ({ strip: homes[0], column }),
    (column) =>
      seatPair(
        first,
        second,
        { strip: homes[0], column },
        { strip: homes[1], column },
      ),
  )
}

/** One lead on its home strip, the other on the nearest free scratch strip it can reach. */
function withOneStray(
  workspace: Workspace,
  part: TwoLeadPart,
  span: LeadSpan,
  anchor: SeedLead,
  stray: SeedLead,
): Position | undefined {
  const anchorHome = homeOf(workspace, anchor.net)
  const strayHome = homeOf(workspace, stray.net)
  const strip = nearestScratch(workspace, anchorHome, strayHome, span)
  if (strip === undefined) return undefined
  const [first] = part.leads
  const anchorFirst = anchor === first
  const low = anchorFirst ? anchorHome : strip
  const high = anchorFirst ? strip : anchorHome
  const direction: Placement["direction"] = high > low ? "S" : "N"
  return chooseColumn(
    workspace,
    part,
    direction,
    acrossFrame(Math.abs(high - low)),
    (column) => ({ strip: low, column }),
    (column) =>
      anchorFirst
        ? seatPair(anchor, stray, { strip: anchorHome, column }, { strip, column })
        : seatPair(stray, anchor, { strip, column }, { strip: anchorHome, column }),
  )
}

/** The free scratch strip nearest the stray lead's own home that the anchor can still reach. */
function nearestScratch(
  workspace: Workspace,
  anchorHome: number,
  strayHome: number,
  span: LeadSpan,
): number | undefined {
  let best: number | undefined
  for (let strip = 0; strip < workspace.grid.strips; strip += 1) {
    if (!scratchFree(workspace, strip)) continue
    const holes = Math.abs(strip - anchorHome) + 1
    if (holes < span.minSpanHoles || holes > span.maxSpanHoles) continue
    if (best === undefined || Math.abs(strip - strayHome) < Math.abs(best - strayHome)) best = strip
  }
  return best
}

/** One way of laying a moulded field down: where it sits, and what it would cost. */
interface FieldWindow {
  readonly direction: "S" | "N"
  readonly originStrip: number
  readonly rows: readonly { readonly pin: FramePin & SeedLead; readonly strip: number }[]
  readonly joins: number
}

/**
 * A part with a moulded pin field, laid across the strips.
 *
 * **THE FIELD IS ORIENTED AND NEVER RESHAPED.** Every window below places every
 * pin at the step offsets the part was declared with; what varies is the
 * direction (two of them - see `ACROSS_DIRECTIONS`) and which strip the field
 * starts on. **A pin may land only on its OWN net's home strip or on a free
 * scratch strip** - never on another net's home strip, which is what keeps every
 * strip to one net and therefore keeps the cut count at zero.
 *
 * **WINDOWS ARE ORDERED BY JOIN COUNT, WHICH IS THE COST `F` PRICES**, then by
 * direction and then by the lowest starting strip so that two runs over equal
 * inputs return equal boards. **The COLUMN is then chosen by comfort**, which
 * costs nothing in `F` - a column changes no join - so the two keys never
 * compete. The first window that has any admissible column wins.
 */
export function placeFixedField(workspace: Workspace, part: FixedFieldPart): void {
  const windows: FieldWindow[] = []
  for (const direction of ACROSS_DIRECTIONS) {
    for (let originStrip = 0; originStrip < workspace.grid.strips; originStrip += 1) {
      const rows = part.field.map((pin) => ({
        pin,
        strip: direction === "S" ? originStrip + pin.alongSteps : originStrip - pin.alongSteps,
      }))
      let joins = 0
      let sound = true
      for (const { pin, strip } of rows) {
        if (strip < 0 || strip >= workspace.grid.strips) {
          sound = false
          break
        }
        if (strip === homeOf(workspace, pin.net)) continue
        if (!scratchFree(workspace, strip)) {
          sound = false
          break
        }
        joins += 1
      }
      if (sound) windows.push({ direction, originStrip, rows, joins })
    }
  }
  windows.sort(
    (a, b) =>
      a.joins - b.joins ||
      ACROSS_DIRECTIONS.indexOf(a.direction) - ACROSS_DIRECTIONS.indexOf(b.direction) ||
      a.originStrip - b.originStrip,
  )
  for (const window of windows) {
    const position = chooseColumn(
      workspace,
      part,
      window.direction,
      part.field,
      (column) => ({ strip: window.originStrip, column }),
      (column) =>
        window.rows.map(({ pin, strip }) => ({
          lead: pin,
          hole: {
            strip,
            column: window.direction === "S" ? column - pin.acrossSteps : column + pin.acrossSteps,
          },
        })),
    )
    if (position === undefined) continue
    commit(workspace, part, position)
    return
  }
  refuse(
    "field-cannot-be-seated",
    `"${part.ref}" (${part.footprint}) has a moulded field of ${part.field.length} terminals ` +
      `and under ordering "${workspace.ordering}" there is no way to lay it down.\nIts ` +
      "terminals and the strips hosting their nets are:\n" +
      part.field
        .map(
          (pin) =>
            `  "${pin.pin}" on net "${pin.net}", hosted on strip ${homeOf(workspace, pin.net)}, ` +
            `at ${pin.alongSteps} steps along the row and ${pin.acrossSteps} across`,
        )
        .join("\n") +
      `\n${windows.length} of the ${ACROSS_DIRECTIONS.length * workspace.grid.strips} windows ` +
      "were sound in strips, and none of those had an admissible column - every one was off " +
      "the stock, had a hole already taken, or would have put a lead under a rigid part.\nA " +
      "field pin may land on its own net's home strip or on a strip no net hosts and no other " +
      "lead has claimed; a pin on another net's home strip is refused rather than placed, " +
      "because two nets' leads on one conductor is the open no cut list can close.\nNothing is " +
      "substituted. Change the ordering - which nets sit beside each other, and the stride " +
      "between them, is what decides whether a moulded field reaches two home strips at once.",
  )
}
