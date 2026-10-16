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
 * on another strip - scratch, or shared with a net already there - and a join.
 *
 * **THE ORDER THE THREE SHAPES ARE TRIED IN IS BY COST AND NOT BY TASTE.** Both
 * leads on their own home strips costs nothing; one lead on a SCRATCH strip costs
 * exactly one join, which `F` prices at `rho_w` or `rho_s` (0.25); one lead on a
 * strip ANOTHER net already occupies costs that join and a cut besides, and `F`
 * prices a cut at 1.0. So the three are tried cheapest first, and **both
 * orientations of the second shape are tried before either orientation of the
 * third** - which is what makes this relaxation unable to change a board that
 * the one-net-per-strip rule could already build. A part none of the three can
 * seat is one this construction has nothing left to offer, and it refuses rather
 * than substituting a placement. (A part whose two leads are on ONE net is a
 * separate branch, not a fourth shape - it lies along that strip, because the two
 * holes are already on one conductor.)
 *
 * **THE THIRD SHAPE IS THE 2026-10-15 RELAXATION** - *"Zero cuts was never a
 * requirement"* - and the strip it shares is still subject to `interleavingOn`,
 * which `chooseColumn` applies to every candidate position. Which of the three a
 * board ends up with is not scored here: `objectiveOf` prices and `violationsOf`
 * judges.
 *
 * **A STRAY LEAD GOES ON THE STRIP CLOSEST TO ITS OWN NET'S HOME** that
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
    const orientations = [[first, second], [second, first]] as const
    for (const shared of [false, true]) {
      for (const [anchor, stray] of orientations) {
        const placed = withOneStray(workspace, part, span, anchor, stray, shared)
        if (placed === undefined) continue
        commit(workspace, part, placed)
        return
      }
    }
  }
  refuse(
    "leads-cannot-reach",
    `"${part.ref}" (${part.footprint}) has "${first.pin}" on net "${first.net}" and ` +
      `"${second.pin}" on net "${second.net}", and under ordering "${workspace.ordering}" those ` +
      `two nets are hosted on strips ${homes[0]} and ${homes[1]} - a span of ` +
      `${Math.abs(homes[0] - homes[1]) + 1} holes against this footprint's recorded ` +
      `[${span.minSpanHoles}, ${span.maxSpanHoles}].\nNo strip the anchor lead can reach will ` +
      "take the stray one either - neither a scratch strip, which costs one join, nor a strip " +
      "another net already occupies, which costs that join and a cut besides. So neither a " +
      "direct placement nor a single join can realise this assignment, and what closed every " +
      "column off is the board edge, the holes already taken, a net left INTERLEAVED on the " +
      "shared strip, or a rigid part this one would have to be routed under or laid over.\nAn " +
      "interleaving is refused rather than placed because leads of one net astride another's " +
      "run leave it in two pieces that this construction's join step cannot rejoin: it joins a " +
      "net's STRIPS, not two runs on one strip (lib/stripboard/separable.ts). A rigid part " +
      "cannot be pushed aside to make room, so an overlap with one is refused as flatly as a " +
      "lead under one; two FORMABLE parts overlapping is admitted and is never what closed a " +
      "column off.\n" +
      `${SPAN_SOURCE}.\nNothing is substituted: a ` +
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

/**
 * One lead on its home strip, the other on a strip it can reach: the nearest
 * free SCRATCH strip when `shared` is false, and otherwise every OCCUPIED strip
 * within reach, nearest to the stray's own home first.
 *
 * **THE TWO TIERS DIFFER IN HOW MANY CANDIDATES THEY TRY, AND THAT IS
 * DELIBERATE.** The scratch tier offers the one strip it has always offered, so
 * a board this construction could already build comes out hole-for-hole as it
 * did. The shared tier walks its candidates, because before 2026-10-15 it had no
 * candidates at all - there is no earlier behaviour for it to preserve, and
 * stopping at the first shared strip whose columns are all closed off would hand
 * back a refusal with strips left untried.
 */
function withOneStray(
  workspace: Workspace,
  part: TwoLeadPart,
  span: LeadSpan,
  anchor: SeedLead,
  stray: SeedLead,
  shared: boolean,
): Position | undefined {
  const anchorHome = homeOf(workspace, anchor.net)
  const strayHome = homeOf(workspace, stray.net)
  for (const strip of landingStrips(workspace, anchorHome, strayHome, span, shared)) {
    const [first] = part.leads
    const anchorFirst = anchor === first
    const low = anchorFirst ? anchorHome : strip
    const high = anchorFirst ? strip : anchorHome
    const direction: Placement["direction"] = high > low ? "S" : "N"
    const position = chooseColumn(
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
    if (position !== undefined) return position
  }
  return undefined
}

/**
 * The strips a stray lead may land on, in the order they are tried: nearest the
 * stray's own net's home first, so the join it needs is shortest - and at a
 * distance of one strip that join is a solder bridge rather than a wire.
 *
 * `shared` picks the tier. False yields at most the ONE nearest scratch strip,
 * which is what this function returned before the strips were allowed to be
 * shared; true yields every strip that is NOT scratch, which is the tier that
 * costs a cut. A strip the anchor lead's span cannot reach is in neither.
 */
function landingStrips(
  workspace: Workspace,
  anchorHome: number,
  strayHome: number,
  span: LeadSpan,
  shared: boolean,
): readonly number[] {
  const reachable: number[] = []
  for (let strip = 0; strip < workspace.grid.strips; strip += 1) {
    if (scratchFree(workspace, strip) === shared) continue
    const holes = Math.abs(strip - anchorHome) + 1
    if (holes < span.minSpanHoles || holes > span.maxSpanHoles) continue
    reachable.push(strip)
  }
  reachable.sort((a, b) => Math.abs(a - strayHome) - Math.abs(b - strayHome) || a - b)
  return shared ? reachable : reachable.slice(0, 1)
}

/** One way of laying a moulded field down: where it sits, and what it would cost. */
interface FieldWindow {
  readonly direction: "S" | "N"
  readonly originStrip: number
  readonly rows: readonly { readonly pin: FramePin & SeedLead; readonly strip: number }[]
  readonly joins: number
  /**
   * How many of its pins land on a strip that is neither their own net's home
   * nor scratch - each of which asks for at least one cut.
   *
   * It is a count of SHARED STRIPS and not a cut count: how many cuts a board
   * needs is `derivedCuts`' answer and what they cost is `objectiveOf`'s. This
   * figure exists only to order the windows by the dearer resource first.
   */
  readonly shared: number
}

/**
 * A part with a moulded pin field, laid across the strips.
 *
 * **THE FIELD IS ORIENTED AND NEVER RESHAPED.** Every window below places every
 * pin at the step offsets the part was declared with; what varies is the
 * direction (two of them - see `ACROSS_DIRECTIONS`) and which strip the field
 * starts on. **A pin may land on any strip on the stock**; one that is neither
 * its own net's home nor scratch is admitted and counted, and `chooseColumn`
 * then refuses the positions on it that would leave a net interleaved.
 *
 * **THE SENTENCE THAT REPLACES IS QUOTED RATHER THAN DELETED, because it is why
 * this function was built the way it is**: *"A pin may land only on its OWN
 * net's home strip or on a free scratch strip - never on another net's home
 * strip, which is what keeps every strip to one net and therefore keeps the cut
 * count at zero."* The owner's correction of 2026-10-15 is that zero cuts was
 * never a requirement, and a field that cannot be laid down at all is worse than
 * one laid down across a shared strip.
 *
 * **WINDOWS ARE ORDERED BY WHAT `F` PRICES, DEAREST RESOURCE FIRST**: shared
 * strips (a cut, 1.0) before joins (0.25), then by direction and then by the
 * lowest starting strip so that two runs over equal inputs return equal boards.
 * Ordering the shared count first is also what makes this relaxation unable to
 * change a field that could already be seated: every window admissible before
 * 2026-10-15 has `shared === 0`, so all of them still sort ahead of every window
 * this change added, in the order they were already in. **The COLUMN is then
 * chosen by comfort**, which costs nothing in `F` - a column changes no join -
 * so the two keys never compete. The first window that has any admissible column
 * wins.
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
      let shared = 0
      let onBoard = true
      for (const { pin, strip } of rows) {
        if (strip < 0 || strip >= workspace.grid.strips) {
          onBoard = false
          break
        }
        if (strip === homeOf(workspace, pin.net)) continue
        joins += 1
        if (!scratchFree(workspace, strip)) shared += 1
      }
      if (onBoard) windows.push({ direction, originStrip, rows, joins, shared })
    }
  }
  windows.sort(
    (a, b) =>
      a.shared - b.shared ||
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
      "put every pin on the stock, and none of those had an admissible column - every one had " +
      "a hole already taken, would have left a net INTERLEAVED on a strip the field lands on, " +
      "would have put a lead under a rigid part, or would have overlapped a rigid part's area, " +
      "which cannot be pushed aside to make room.\nA field pin may land on any strip, including " +
      "one another net already occupies, which costs a cut; what it may not do is leave a net " +
      "in two runs on one strip, because this construction's join step joins a net's STRIPS and " +
      "cannot rejoin those (lib/stripboard/separable.ts).\nNothing is " +
      "substituted. Change the ordering - which nets sit beside each other, and the stride " +
      "between them, is what decides whether a moulded field reaches two home strips at once.",
  )
}
