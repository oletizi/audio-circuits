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
import { holeInFrame, type Hole, type Placement } from "./board.ts"
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
  type SeedFieldPin,
  type SeedLead,
  type TwoLeadPart,
} from "./seed-model.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

/**
 * The facings a moulded pin field may be laid at: **all four, and it used to be
 * two.**
 *
 * `holeInFrame` in `./board.ts` maps a footprint's own x axis - the axis
 * `classifyPads` decomposes its pin ROW along - onto the board. Under `E` and
 * `W` that axis runs along a strip and the y axis across the strips; under `S`
 * and `N` it is the other way about. So which facing puts one pin per strip is a
 * property of the FOOTPRINT and not of the facing: `TO-92_Inline` has its three
 * pads at x 0..2 and y 0, so `S`/`N` give it three strips and `E`/`W` one, while
 * `PinHeader_1x05` has all five at x 0 and y 0..4 and the counts are the other
 * way round - one strip against five. `DIP-16_W7.62mm`, at x {0,3} and y 0..7,
 * goes two against eight.
 *
 * **THE PARAGRAPH THAT RULED `E` AND `W` OUT IS QUOTED RATHER THAN DELETED,
 * because it is why this file tried only two facings for as long as it did**:
 * *"Only the second is used, because a row along one strip is several nets' leads
 * interleaved on one conductor, and that is the open no cut list can close."*
 * That was true while every strip carried exactly one net, and **Task 2 made it
 * false**: a strip may now carry several nets with the cut parting them derived
 * rather than planned (`derivedCuts` in `./cuts.ts`, and this module's own
 * `placeTwoLead` comment on the relaxation of 2026-10-15). A row of DISTINCT
 * nets along one strip is that admitted case, and it is an open only if the nets
 * INTERLEAVE - which `interleavingOn` in `./separable.ts` decides, per candidate
 * column, inside `chooseColumn`. With the premise gone, the restriction was
 * holding out a 1xN header and a DIP, both of which only an `E` or a `W` can lay
 * down at all.
 *
 * **S AND N STAY FIRST IN THIS LIST**, which is the direction tie-break
 * `placeFixedField` sorts on after the strip count: a part whose two counts are
 * equal is laid the way it was laid before this list grew. Which of two opposed
 * facings a part takes decides only which side of it the other rows sit on, and
 * the owner has ruled that question away for the one part here it applies to:
 * *"I dont care about trimmer orientation."*
 */
const FIELD_FACINGS: readonly Placement["direction"][] = ["S", "N", "E", "W"]

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
 *
 * **THE STRAY'S OWN HOME STRIP IS IN NEITHER TIER EITHER, AND LEAVING IT IN WAS
 * A CANDIDATE THAT COULD NEVER FIRE.** `scratchFree` excludes it from the
 * scratch tier already, because a net's home strip is hosted; the SHARED tier
 * admitted it - it is not scratch - and the sort by distance put it FIRST, at a
 * distance of zero. A stray lead on its own net's home strip is not a stray: the
 * two leads then sit on the two home strips, which is the same low strip, the
 * same direction, the same `acrossFrame` and the same `seatPair` that
 * `acrossTwoHomes` builds, and `acrossTwoHomes` has already been tried and
 * failed on those exact inputs with nothing committed in between. So it was a
 * candidate `chooseColumn` could only reject again, and *"a predicate that can
 * never fire"* is this repository's named recurring defect. It is excluded in
 * both tiers rather than only in the one where it bit, because the reason is a
 * fact about what a stray lead IS and not about which tier is being walked.
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
    if (strip === strayHome) continue
    if (scratchFree(workspace, strip) === shared) continue
    const holes = Math.abs(strip - anchorHome) + 1
    if (holes < span.minSpanHoles || holes > span.maxSpanHoles) continue
    reachable.push(strip)
  }
  reachable.sort((a, b) => Math.abs(a - strayHome) - Math.abs(b - strayHome) || a - b)
  return shared ? reachable : reachable.slice(0, 1)
}

/**
 * Where a field's pins land at one facing, one starting strip and one column -
 * through `holeInFrame`, **which is this model's one owner of the four
 * quarter-turns and stays so.** This file widened which facings are TRIED; it
 * holds no mapping of its own, and the two ternaries that used to spell `S` and
 * `N` out here are gone rather than extended to four cases.
 *
 * **A PIN'S STRIP DOES NOT DEPEND ON THE COLUMN, at any of the four facings**,
 * because a facing is a quarter-turn and carries neither a shear nor a
 * reflection - see `Facing` in `./board.ts`, which declares that convention.
 * That is what lets a window be ranked by the strips it lands on before any
 * column has been chosen: `placeFixedField` reads the strips off this function
 * at column 0, and `chooseColumn` then takes the seats from the same function at
 * the column it picks, so the two agree by construction rather than by a second
 * derivation that could drift.
 */
function fieldHoles(
  field: readonly SeedFieldPin[],
  direction: Placement["direction"],
  originStrip: number,
  column: number,
): readonly { readonly pin: SeedFieldPin; readonly hole: Hole }[] {
  return field.map((pin) => ({
    pin,
    hole: holeInFrame({ strip: originStrip, column }, direction, pin.alongSteps, pin.acrossSteps),
  }))
}

/** One way of laying a moulded field down: where it sits, and what it would cost. */
interface FieldWindow {
  readonly direction: Placement["direction"]
  readonly originStrip: number
  /**
   * How many DISTINCT strips the field's pins land on at this facing - the first
   * key the windows are ordered by, and the whole of how a facing is chosen.
   *
   * It is a property of the FOOTPRINT and the facing and not of this starting
   * strip: every window at one facing has the same count, so ranking on it ranks
   * facings and nothing else. See `placeFixedField` for why that ranking is
   * structural rather than a weighting.
   */
  readonly distinctStrips: number
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
 * A part with a moulded pin field, laid down at one of four facings.
 *
 * **THE FIELD IS ORIENTED AND NEVER RESHAPED.** Every window below places every
 * pin at the step offsets the part was declared with; what varies is the facing
 * (four of them - see `FIELD_FACINGS`) and which strip the field starts on. **A
 * pin may land on any strip on the stock**; one that is neither its own net's
 * home nor scratch is admitted and counted, and `chooseColumn` then refuses the
 * positions on it that would leave a net interleaved.
 *
 * **THE SENTENCE THAT REPLACES IS QUOTED RATHER THAN DELETED, because it is why
 * this function was built the way it is**: *"A pin may land only on its OWN
 * net's home strip or on a free scratch strip - never on another net's home
 * strip, which is what keeps every strip to one net and therefore keeps the cut
 * count at zero."* The owner's correction of 2026-10-15 is that zero cuts was
 * never a requirement, and a field that cannot be laid down at all is worse than
 * one laid down across a shared strip.
 *
 * **THE FACING IS CHOSEN BY HOW MANY DISTINCT STRIPS THE FIELD LANDS ON, MOST
 * FIRST, AND THAT IS STRUCTURAL RATHER THAN A WEIGHTING.** Two pins of DIFFERENT
 * nets on one strip force a cut between them, so the facing that puts the pins on
 * the fewest strips is the facing that forces the most cuts of the part's own
 * making - a `PinHeader_1x05` laid at `S` is five nets on one conductor and four
 * cuts before anything else is placed, against five strips and none at `E`. No
 * number is weighed against another here: the count IS how many cuts the facing
 * forces, and a cut is the dearest term in the committed objective. **Nothing
 * this file ranks is a quantity `objectiveOf` prices** - it prices the board it
 * is handed, and `violationsOf` judges it; what this function decides is which
 * boards get offered at all.
 *
 * **THE REMAINING KEYS ARE THE ONES THAT WERE ALREADY HERE, IN THE ORDER THEY
 * WERE IN**: shared strips (a cut, 1.0) before joins (0.25), then by facing and
 * then by the lowest starting strip so that two runs over equal inputs return
 * equal boards. **And the new first key cannot reorder the windows that existed
 * before it**: a window's distinct-strip count depends on the facing alone, so
 * all of one facing's windows carry the same count, and the `S` and `N` windows
 * that were the only ones enumerated are therefore still in their old relative
 * order. What the key does is decide between FACINGS, which is the decision that
 * did not exist when two of them were opposed halves of one orientation.
 *
 * **THE COLUMN IS THEN CHOSEN BY COMFORT**, which costs nothing in `F` - a
 * column changes no join - so the two keys never compete. The first window that
 * has any admissible column wins.
 */
export function placeFixedField(workspace: Workspace, part: FixedFieldPart): void {
  const windows: FieldWindow[] = []
  for (const direction of FIELD_FACINGS) {
    for (let originStrip = 0; originStrip < workspace.grid.strips; originStrip += 1) {
      // Column 0 is a reading position and not a candidate: a pin's STRIP does
      // not depend on the column at any facing (see `fieldHoles`), and the
      // column `chooseColumn` settles on is applied through the same function.
      const landed = fieldHoles(part.field, direction, originStrip, 0)
      let joins = 0
      let shared = 0
      let onBoard = true
      for (const { pin, hole } of landed) {
        if (hole.strip < 0 || hole.strip >= workspace.grid.strips) {
          onBoard = false
          break
        }
        if (hole.strip === homeOf(workspace, pin.net)) continue
        joins += 1
        if (!scratchFree(workspace, hole.strip)) shared += 1
      }
      if (!onBoard) continue
      windows.push({
        direction,
        originStrip,
        distinctStrips: new Set(landed.map(({ hole }) => hole.strip)).size,
        joins,
        shared,
      })
    }
  }
  windows.sort(
    (a, b) =>
      b.distinctStrips - a.distinctStrips ||
      a.shared - b.shared ||
      a.joins - b.joins ||
      FIELD_FACINGS.indexOf(a.direction) - FIELD_FACINGS.indexOf(b.direction) ||
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
        fieldHoles(part.field, window.direction, window.originStrip, column).map(
          ({ pin, hole }) => ({ lead: pin, hole }),
        ),
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
      `\n${windows.length} of the ${FIELD_FACINGS.length * workspace.grid.strips} windows ` +
      `(${FIELD_FACINGS.join("/")} by every starting strip) put every pin on a strip that ` +
      "exists, and none of those had an admissible column - every one ran off the end of a " +
      "strip, had a hole already taken, would have left a net INTERLEAVED on a strip the field " +
      "lands on, would have put a lead under a rigid part, or would have overlapped a rigid " +
      "part's area, which cannot be pushed aside to make room.\nRunning off the END of a strip " +
      "is the reason a wide field refuses on narrow stock: at `E` and `W` the pin row lies ALONG " +
      "a strip, so the field needs as many columns as it has steps along its row, where at `S` " +
      "and `N` it needs that many strips.\nA field pin may land on any strip, including " +
      "one another net already occupies, which costs a cut; what it may not do is leave a net " +
      "in two runs on one strip, because this construction's join step joins a net's STRIPS and " +
      "cannot rejoin those (lib/stripboard/separable.ts).\nNothing is " +
      "substituted. Change the ordering - which nets sit beside each other, and the stride " +
      "between them, is what decides whether a moulded field reaches two home strips at once.",
  )
}
