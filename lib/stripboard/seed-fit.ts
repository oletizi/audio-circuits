/**
 * THE TWO PLACERS THAT WORK FROM A NET'S HOME STRIP: where a two-lead part's
 * leads go, and where a panel-mounted control's landing pad goes.
 *
 * Both decide the STRIPS themselves - that is what the net-to-strip assignment
 * is for - and both hand the COLUMN to `chooseColumn` in `./seed-place.ts`,
 * which ranks it by how comfortable the position is to build. Split from that
 * file for the line ceiling; the seam is that this file decides which strips a
 * part may sit on and that one decides where along them.
 *
 * **THE FIELD PLACER WAS HERE AND IS NOW `./seed-field.ts`.** This file said
 * "THE TWO PLACERS" while holding two, the off-board kind made it three, and
 * 485 lines plus a third placer is over the line ceiling. The seam it was split
 * on is the one these two share and the field placer does not: a part here takes
 * its strips from the HOMES OF ITS NETS, where a moulded field takes them from
 * its own moulded steps and is then only turned.
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
  type OffBoardPart,
  type SeedLead,
  type TwoLeadPart,
} from "./seed-model.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

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
 * The frame of a landing pad: one pin at the origin, and nothing else.
 *
 * It is not `acrossFrame(0)`, which would be two frame pins in the same hole: a
 * pad has ONE terminal, and the frame is what `areaRect` measures the part's
 * rectangle from, so a second pin there would be a second claim on one hole in
 * every rectangle the pad appears in.
 */
const PAD_FRAME: readonly FramePin[] = [{ alongSteps: 0, acrossSteps: 0 }]

/**
 * The facing recorded for a landing pad, **which is arbitrary, and the import
 * path says so in the same words.**
 *
 * The owner settled what a pad is, verbatim: *"yeah - a single pad has no
 * orientation. It's just a place to solder an off-board wire or a test point
 * to."* A one-hole part occupies the same hole at all four facings and its
 * rectangle is the same 1x1 at all four, so there is nothing to derive and
 * nothing a wrong answer could change. `Placement.direction` cannot express "no
 * orientation" - it is a required field of four values - and widening it is a
 * change to `./board.ts` that belongs to a plan rather than to a placer. **`E`
 * is the value `padPlacementOf` in `tools/stripboard/vero-import.ts` records for
 * an imported pad**, and this matches it so that a constructed pad and an
 * imported one are the same placement rather than two spellings of one.
 */
const PAD_FACING: Placement["direction"] = "E"

/**
 * A panel-mounted control's one terminal, landed on the strip hosting its net.
 *
 * **THERE IS ONE CANDIDATE STRIP AND THAT IS THE WHOLE DECISION.** A pad has a
 * single lead, so it has no anchor to reach from and no second net to span to:
 * the strip its own net is hosted on is where that lead belongs, and
 * `chooseColumn` then picks the column by comfort exactly as it does for every
 * other placement - including rejecting a column whose hole is taken, whose
 * position would leave a net INTERLEAVED on that strip, or which would put the
 * pad's hole under a rigid part.
 *
 * **A PAD'S HOLE IS REFUSED UNDER A RIGID PART; A JOINING WIRE'S END OR A
 * BRIDGE'S HOLE IS ONLY RANKED LAST. BOTH ARE DELIBERATE AND THE TWO ARE SAID
 * HERE TOGETHER, because nothing said them together until 2026-10-16.** This
 * paragraph replaces a clause reading that the rejection "is the owner's rule
 * applying to a soldered wire end as it does to a lead" - which a reader could
 * fairly take to mean the model refuses every soldered joint under a rigid part.
 * It does not. A pad is a PLACEMENT, so it goes through `chooseColumn` and the
 * rejection is hard. The two ends of a joining wire and the holes of a solder
 * bridge go through `joinColumnFor` in `./join-column.ts`, where `over-rigid` is
 * the LAST tier of `ROUTE_ORDER` and not a rejection. The asymmetry is the
 * SAMPLE SIZE and that file argues it: the lead rule is refused because 85 leads
 * across the owner's two boards hold it, while eight wires is thin evidence for
 * a hard constraint and one of those eight crosses a rigid trimmer on
 * `buffered`. **So a board with nowhere clear left still gets joined, and a pad
 * with nowhere clear left is refused.**
 *
 * **AND THE SOFTER RULE IS ALREADY BEING USED, which is why the distinction is
 * worth writing down.** Measured over the eleven sound low-boost candidates: of
 * 274 wire ends and bridge holes, NONE lands inside a rigid part's pin box - so
 * no soldered joint on any of those boards is one the pad rule would have
 * refused. But of 634 intermediate wire-span holes, FIVE are inside one: on
 * `reference-order s1` a jumper in column 0 runs over all five pins of the rigid
 * `junction_grounds` header. That is `over-rigid` being taken because
 * `joinColumnFor` found nothing clearer, which is the tier working as designed
 * and not a defect - and it is exactly the case a reader who took the pad rule
 * to cover wires would expect to be impossible.
 *
 * **IT DOES NOT TRY A SECOND STRIP PLUS A JOIN, AND THAT LIMIT IS STATED RATHER
 * THAN HIDDEN.** A stray pad on another strip with a wire back to its net is
 * expressible - `joinNets` joins every strip a net landed on - and it is not
 * attempted here because nothing in this construction asks for it: a pad is the
 * least constrained part on the board, `placementOrder` places it last for that
 * reason, and a tier that has never been needed is a tier with no evidence
 * behind its cost. The refusal below says so, so that a board which genuinely
 * needs one is a measured reason to add it with a test beside it rather than a
 * silent near-miss.
 */
export function placeOffBoard(workspace: Workspace, part: OffBoardPart): void {
  const strip = homeOf(workspace, part.lead.net)
  const position = chooseColumn(
    workspace,
    part,
    PAD_FACING,
    PAD_FRAME,
    (column) => ({ strip, column }),
    (column) => [{ lead: part.lead, hole: { strip, column } }],
  )
  if (position === undefined) {
    refuse(
      "pad-cannot-be-seated",
      `"${part.ref}" terminal "${part.lead.pin}" is a landing pad for net "${part.lead.net}", ` +
        `which ordering "${workspace.ordering}" hosts on strip ${strip}, and not one of the ` +
        `${workspace.grid.columns} columns of that strip will take it.\nA pad is one hole, so ` +
        "what closed every column off is a hole already holding a lead, a wire end or a bridge, " +
        "a position that would have left a net INTERLEAVED on that strip, or a hole inside a " +
        "rigid part's area - nothing may be routed under one, and an off-board wire soldered " +
        "beneath a part whose terminals cannot be formed is exactly the joint the owner's rule " +
        "is about.\nNo other strip is tried: a pad has one terminal and no anchor lead to reach " +
        "from, so its net's home strip is the only strip it has a reason to be on. A pad landed " +
        "elsewhere with a wire back to its net is expressible and is deliberately not attempted " +
        "- see this function's comment.\nNothing is substituted: a pad placed on a strip its " +
        "net does not reach is a hole somebody solders a panel wire into and a net that is open " +
        "at the panel. Change the ordering, or give the circuit a wider piece of stock.",
    )
  }
  commit(workspace, part, position)
}
