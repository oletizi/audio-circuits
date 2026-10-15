/**
 * THE SPACE A PART ACTUALLY TAKES UP, and the rules the owner stated about it:
 * nothing routed under a rigid part, nothing overlapping a rigid part at all, and
 * room to work where there is room.
 *
 * **WHY THIS EXISTS, AND IT IS A DEFECT REPORT RATHER THAN A FEATURE.** The
 * first version of the seed builder placed every part at the lowest free column,
 * so on a 34 x 27 stock - 918 holes - it produced a board 31 strips by THREE
 * columns, put 37 leads in it, left about 790 holes untouched, and stacked a
 * 10mm electrolytic can on a trimmer. The owner's word was *"kafkaesque"*. It
 * was not choosing density; nothing in it reached sideways, so it never
 * considered the alternative.
 *
 * **THE TWO RULES, VERBATIM.** *"I try to cluster related parts, AND I try to
 * give myself room to work. I have actual fingers—I'm not a pick and place
 * machine."* And: *"Rigid parts shouldn't be routed through/under. Resistors,
 * diodes, most capacitors can be jostled out of the way of each other, but if
 * there's room for parts to have their own space, they should be given that
 * space. Dense layouts are harder to work with than layouts with enough room."*
 * With the priority he gave afterwards: *"Clustering is nice, but secondary to
 * ease of assembly."*
 *
 * **THIS IS A BUILD CONSTRAINT AND NOT A LEGIBILITY METRIC, which is what keeps
 * it clear of `OBJ2`.** A part wedged between two others cannot be soldered by a
 * person with a hand and an iron. **`F` IS NOT TOUCHED**: there is no area term,
 * no spacing penalty and no score of any kind in this file. Everything here
 * decides WHERE a part goes, which is a constructor's business; what a board
 * COSTS stays `C + rho_w*W + rho_s*B`, and a layout that uses the width needs
 * fewer wires and therefore scores better on the owner's own objective than the
 * ribbon did.
 *
 * **WHERE THE RULES COME FROM, AND IT IS NOT THE MEASUREMENTS.** Every hard rule
 * here is one of the owner's stated directives. The figures below are measured on
 * `transistor-preamp-feedback` and `transistor-preamp-buffered` - boards he laid
 * out by hand, built and uses - and they record **how his as-built boards compare
 * to the rules**, which is a different claim from being the evidence for them.
 *
 * **THAT DISTINCTION IS A CORRECTION AND NOT A NUANCE.** Until 2026-10-15 this
 * comment presented the figures as the justification, and "this rule would refuse
 * a board he built" was treated here as a veto on the rule. He ruled otherwise,
 * verbatim: ***"I've already told you how rigid parts operate. The as-built
 * diagram is instructive, but my directives are more authoritative than a file on
 * disk."*** So a spot on one of his boards that a rule refuses is a spot that was
 * harder to build than it needed to be, not a counter-example. The figures stay
 * because a rule whose disagreement with the built boards is unmeasured is a rule
 * nobody can see the cost of.
 *
 * **THE TWO HARD RULES, both his words, both refusals rather than tiers.**
 *
 *   - *"Rigid parts shouldn't be routed through/under."* - `routedUnderRigid`
 *     below: no LEAD inside a rigid part's area;
 *   - *"Rigid parts are rigid. You cant push them out of the way or rout under
 *     them."* (2026-10-15) - `rigidOverlap` below: two AREAS may not overlap when
 *     EITHER part is rigid, because the one that would have to give way cannot.
 *     Formable-on-formable overlap stays admitted, by his other directive:
 *     *"Resistors, diodes, most capacitors can be jostled out of the way of each
 *     other"*, and *"Don't worry about body collisions on the stripboard. It's
 *     extremely flexible."*
 *
 * **HOW HIS BOARDS COMPARE, over 37 parts and 85 leads with each part's area
 * derived from its own `.kicad_mod`. FOUR OF THE FIVE OVERLAPS ON HIS TWO BOARDS
 * ARE ONES THIS TOOL WILL NOT REPRODUCE**, and that is the intended outcome of
 * the ruling above rather than a contradiction of it:
 *
 *   - `feedback` has 2 overlapping pairs - `Q1`(rigid)/`RV3`(rigid) and
 *     `R4`(formable)/`RV4`(rigid). **Both refused** by `rigidOverlap`;
 *   - `buffered` has 3 - `C1`(formable)/`RV4`(rigid), `C3`(formable)/`Q1`(rigid)
 *     and `C3`(formable)/`R1`(formable). **The first two refused, the third
 *     admitted**, which is the rigid/formable split doing exactly what he said;
 *   - **one lead of 85 sits inside a rigid part's occupied area**: `R4`'s lower
 *     lead at strip 14, column 13 on `feedback`, inside `RV4`'s rectangle. It is
 *     under the trimmer's moulded BODY OVERHANG and not between its terminals -
 *     `RV4`'s three terminals span columns 10-12 and the body reaches one column
 *     further - and the question was put to him in exactly those terms, which is
 *     what produced the 2026-10-15 ruling. The rule therefore tests the whole
 *     RECTANGLE, body included, and is not narrowed to the terminal span.
 *
 *     **THIS FIGURE WAS 0 UNTIL 2026-10-15 AND THE 0 WAS AN ARTEFACT**, which is
 *     why it is spelled out rather than quietly updated. `handBoard` built each
 *     rectangle from the FOOTPRINT'S PAD TABLE instead of from the leads as
 *     placed, and an RM-065 trimmer can only be fitted REFLECTED (the fork's cell
 *     map exchanges its end terminals) - a reflection `Placement` does not carry.
 *     So all eight trimmer rectangles across the two boards were drawn on the
 *     wrong side of their own origin, each by two strips, and none of them
 *     contained its own leads. The fixture now derives areas through
 *     `partAreasOf`, the same derivation the placer and the move generator use,
 *     and a test asserts the premise every figure here rests on: a part's
 *     rectangle contains that part's own leads;
 *   - **nearest-neighbour clearance on `feedback`: 14 of 16 parts are ADJACENT to
 *     their nearest neighbour with no free hole between, one has one free hole and
 *     one has two.** So `touching` is what he mostly leaves, and both looser tiers
 *     are things he builds - which is why neither is REFUSED and `crowded` is a
 *     tier rather than an error;
 *   - **5 of his 8 wires cross no part's area at all**; two cross a formable part
 *     and one crosses a rigid trimmer on `buffered`. A crossing is ordered last
 *     rather than forbidden: he gave no directive against one, and absent a
 *     directive the measurement is all there is.
 *
 * **THE TIERS ARE THEREFORE A PREFERENCE ORDER OVER POSITIONS, NOT A COST.** A
 * placer asks for the best tier available and takes it; nothing is added up and
 * nothing is compared against a threshold.
 */
import { holeInFrame, type Hole, type Placement } from "./board.ts"

/** An inclusive rectangle of holes. */
export interface Rect {
  readonly minStrip: number
  readonly maxStrip: number
  readonly minColumn: number
  readonly maxColumn: number
}

/**
 * How far a part's body reaches beyond its outermost PADS, in whole holes, on
 * each side of its own frame.
 *
 * `along` is the pin row's own axis and `across` is the other. All four are at
 * least zero: a body that stops short of a pad still has that pad's hole in the
 * part's area, because a lead is soldered there.
 *
 * **THESE ARE THE MOULDED MARGINS AND ARE APPLIED TO THE PLACED PADS, WHICH IS
 * CONSERVATIVE BY AT MOST `beforeAlong + afterAlong` HOLES.** A two-lead part
 * stretched past its moulded pitch keeps its body the same size while its leads
 * move apart, so the body no longer reaches beyond them - the real area is the
 * pad box, and this derivation claims up to two holes more. Measured over the
 * thirteen recorded footprints, `beforeAlong + afterAlong` is 0 for ten of them
 * and 2 for the three radial cans. Overstating a part's own space errs towards
 * more room, which is the direction the owner asked for; understating it would
 * wedge a part, which is the defect this file exists to fix.
 */
export interface BodyMargins {
  readonly beforeAlong: number
  readonly afterAlong: number
  readonly beforeAcross: number
  readonly afterAcross: number
}

/** A placed part's footprint on the board, with what it is and where its leads are. */
export interface PartArea {
  readonly ref: string
  /** `true` when the part's terminals cannot be formed - `LeadSpan.geometry.kind`. */
  readonly rigid: boolean
  readonly rect: Rect
  readonly leads: readonly Hole[]
}

/** A pin's position in its part's own frame, which is where the margins apply. */
export interface FramePin {
  readonly alongSteps: number
  readonly acrossSteps: number
}

/**
 * The rectangle a part covers, from its pins' own frame positions, its body
 * margins, and the turn it is placed at.
 *
 * The four grown corners are mapped through `holeInFrame` - **this model's one
 * owner of the four quarter-turns** - and the result is their bounding box. It
 * is a filled rectangle rather than the exact union of body and pads, which is
 * conservative for an L-shaped part and is the only shape clearance arithmetic
 * over two parts can be done in without a hole-by-hole set comparison per
 * candidate column.
 */
export function areaRect(
  pins: readonly FramePin[],
  margins: BodyMargins,
  origin: Hole,
  direction: Placement["direction"],
): Rect {
  const along = pins.map((pin) => pin.alongSteps)
  const across = pins.map((pin) => pin.acrossSteps)
  const alongLo = Math.min(...along) - margins.beforeAlong
  const alongHi = Math.max(...along) + margins.afterAlong
  const acrossLo = Math.min(...across) - margins.beforeAcross
  const acrossHi = Math.max(...across) + margins.afterAcross
  const corners = [
    holeInFrame(origin, direction, alongLo, acrossLo),
    holeInFrame(origin, direction, alongLo, acrossHi),
    holeInFrame(origin, direction, alongHi, acrossLo),
    holeInFrame(origin, direction, alongHi, acrossHi),
  ]
  return {
    minStrip: Math.min(...corners.map((hole) => hole.strip)),
    maxStrip: Math.max(...corners.map((hole) => hole.strip)),
    minColumn: Math.min(...corners.map((hole) => hole.column)),
    maxColumn: Math.max(...corners.map((hole) => hole.column)),
  }
}

/** Whether a rectangle lies wholly inside the stock. */
export function rectOnBoard(rect: Rect, strips: number, columns: number): boolean {
  return (
    rect.minStrip >= 0 &&
    rect.minColumn >= 0 &&
    rect.maxStrip < strips &&
    rect.maxColumn < columns
  )
}

export function holeInRect(hole: Hole, rect: Rect): boolean {
  return (
    hole.strip >= rect.minStrip &&
    hole.strip <= rect.maxStrip &&
    hole.column >= rect.minColumn &&
    hole.column <= rect.maxColumn
  )
}

/**
 * **How many FREE HOLES separate two rectangles** - `0` when they are adjacent
 * or overlapping, `1` when exactly one empty hole is between them.
 *
 * Chebyshev rather than Manhattan because a finger and an iron need room on
 * whichever side they come from, and a diagonal neighbour is as much in the way
 * as an orthogonal one. It cannot distinguish adjacent from overlapping, so
 * `rectsOverlap` is a separate predicate rather than a sign on this one.
 *
 * **THE NAME IS "FREE HOLES" AND NOT "GAP" BECAUSE THE OFF-BY-ONE WAS A REAL
 * BUG.** The first version returned the difference between the two edges, which
 * is 1 for adjacent rectangles and 0 only for overlapping ones - so the
 * `touching` tier below, written as "gap < 1", could never fire and every
 * non-overlapping position ranked `roomy`. A test premise caught it; the measured
 * histogram of his own boards is what made the discrepancy visible, because 15
 * of `feedback`'s 16 parts came back at "1" and his board plainly has parts
 * against each other. A predicate that cannot fire is the pattern this plan has
 * now caught three times.
 */
export function freeHolesBetween(a: Rect, b: Rect): number {
  const strips = Math.max(b.minStrip - a.maxStrip, a.minStrip - b.maxStrip, 0)
  const columns = Math.max(b.minColumn - a.maxColumn, a.minColumn - b.maxColumn, 0)
  return Math.max(0, Math.max(strips, columns) - 1)
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.minStrip <= b.maxStrip &&
    b.minStrip <= a.maxStrip &&
    a.minColumn <= b.maxColumn &&
    b.minColumn <= a.maxColumn
  )
}

/**
 * **THE FIRST HARD RULE: a lead inside a rigid part's area.**
 *
 * Returns the offending pair, or `null`. It is checked in both directions - a
 * new part's leads against the rigid parts already down, and the placed parts'
 * leads against a new rigid part - because the rule is about the pair and not
 * about which went down first.
 *
 * **`rigid` IS NOT THIS MODULE'S JUDGEMENT.** It is `LeadSpan.geometry.kind`
 * from `lib/kicad/lead-span.ts`, where each family's rigidity is recorded with
 * the reason its terminals cannot be formed. The owner's rule names exactly that
 * distinction: a resistor or most capacitors *"can be jostled out of the way of
 * each other"*, a trimmer, a transistor, a header and a DIP cannot.
 */
export function routedUnderRigid(
  candidate: PartArea,
  placed: readonly PartArea[],
): { readonly host: string; readonly guest: string; readonly hole: Hole } | null {
  for (const other of placed) {
    if (other.rigid) {
      for (const lead of candidate.leads) {
        if (holeInRect(lead, other.rect)) {
          return { host: other.ref, guest: candidate.ref, hole: lead }
        }
      }
    }
    if (candidate.rigid) {
      for (const lead of other.leads) {
        if (holeInRect(lead, candidate.rect)) {
          return { host: candidate.ref, guest: other.ref, hole: lead }
        }
      }
    }
  }
  return null
}

/** The offending pair `rigidOverlap` reports, with which of the two cannot move. */
export interface RigidOverlap {
  /** A part of the pair whose terminals cannot be formed, so it cannot give way. */
  readonly rigid: string
  /** The other part of the pair, rigid or formable. */
  readonly other: string
  /** `true` when `other` is rigid too, so NEITHER of the two can be moved aside. */
  readonly bothRigid: boolean
}

/**
 * **THE SECOND HARD RULE: two areas overlapping when EITHER part is rigid.**
 *
 * Returns the offending pair, or `null`. It needs no second direction the way
 * `routedUnderRigid` does, because `rectsOverlap` is symmetric and so is "either
 * of these two is rigid".
 *
 * **IT DOES NOT REPLACE `routedUnderRigid` AND NEITHER SUBSUMES THE OTHER.** A
 * lead can sit inside a rigid part's rectangle while the two RECTANGLES do not
 * meet - a formable part with no body margin whose rectangle is the bare line
 * between its leads is the ordinary case - and two rectangles can meet with
 * neither part's lead inside the other, which is body-on-body. Both are checked,
 * at the same two sites.
 *
 * **WHY IT IS A REFUSAL AND NOT A TIER, in the owner's words, 2026-10-15:**
 * ***"Rigid parts are rigid. You cant push them out of the way or rout under
 * them."*** A formable part sharing space with a trimmer, a transistor, a header
 * or a DIP is a part that has to be bent aside, and the only candidate for being
 * bent is the one that cannot be. When both are rigid neither can, which is why
 * `bothRigid` is reported rather than inferred by the caller.
 *
 * **FORMABLE-ON-FORMABLE IS DELIBERATELY ADMITTED**, by his other directives:
 * *"Resistors, diodes, most capacitors can be jostled out of the way of each
 * other"*, and *"Don't worry about body collisions on the stripboard. It's
 * extremely flexible."* A rule here that refused every overlap would be stricter
 * than anything he stated, and `comfortOf`'s `crowded` tier is where that case
 * goes instead - ranked last, never rejected.
 *
 * **`rigid` IS NOT THIS MODULE'S JUDGEMENT**, for the reason `routedUnderRigid`
 * gives: it is `LeadSpan.geometry.kind` from `lib/kicad/lead-span.ts`.
 */
export function rigidOverlap(
  candidate: PartArea,
  placed: readonly PartArea[],
): RigidOverlap | null {
  for (const other of placed) {
    if (!candidate.rigid && !other.rigid) continue
    if (!rectsOverlap(candidate.rect, other.rect)) continue
    return {
      rigid: candidate.rigid ? candidate.ref : other.ref,
      other: candidate.rigid ? other.ref : candidate.ref,
      bothRigid: candidate.rigid && other.rigid,
    }
  }
  return null
}

/**
 * How good a position is for BUILDING it, in three tiers, best first.
 *
 * `roomy` is at least one free hole all round; `touching` is adjacent with none;
 * `crowded` is an overlap. **A position where either hard rule breaks is not a
 * tier at all** - it is rejected.
 *
 * **SO `crowded` NOW MEANS EXACTLY ONE THING: A FORMABLE PART OVERLAPPING ANOTHER
 * FORMABLE PART.** Every other overlap is refused by `rigidOverlap` before a tier
 * is asked for, and a caller that ranks positions is ranking positions that
 * already passed both rules. The tier is still reached - his `buffered` board has
 * one such pair, `C3`/`R1`, and the owner admits that case in terms - so it is
 * not a tier that cannot fire.
 *
 * **WHAT THE TIERS ARE MEASURED AGAINST, with this file's own `areaRect` so the
 * figures and the rules are the same quantity.** On `feedback`, 14 of 16 parts
 * are `touching` their nearest neighbour, one has one free hole and one has two.
 * So **his own boards sit mostly at `touching`, and both of the looser tiers are
 * things he builds** - which is why neither is refused here.
 *
 * **THE TIERS STOP AT ONE FREE HOLE, AND THAT IS NOT A CHOSEN THRESHOLD.** One
 * free hole all round is the smallest amount of "its own space" there is, and it
 * is already more room than he leaves on `feedback`. Ranking by a LARGER gap
 * would spread parts to the board's edges and defeat the other half of his
 * instruction - *"I try to cluster related parts, AND I try to give myself room
 * to work"* - so past one hole the tiebreak is clustering, which is the order he
 * gave: *"Clustering is nice, but secondary to ease of assembly."*
 */
export type Comfort = "roomy" | "touching" | "crowded"

export const COMFORT_ORDER: readonly Comfort[] = ["roomy", "touching", "crowded"]

/** The best tier this rectangle achieves against the parts already placed. */
export function comfortOf(rect: Rect, placed: readonly PartArea[]): Comfort {
  let worst: Comfort = "roomy"
  for (const other of placed) {
    if (rectsOverlap(rect, other.rect)) return "crowded"
    if (freeHolesBetween(rect, other.rect) === 0) worst = "touching"
  }
  return worst
}

/** Every hole a wire or bridge passes through, ends included. */
export function spanHoles(from: Hole, to: Hole): readonly Hole[] {
  const steps = Math.max(Math.abs(to.strip - from.strip), Math.abs(to.column - from.column))
  const stripStep = Math.sign(to.strip - from.strip)
  const columnStep = Math.sign(to.column - from.column)
  const holes: Hole[] = []
  for (let step = 0; step <= steps; step += 1) {
    holes.push({
      strip: from.strip + stripStep * step,
      column: from.column + columnStep * step,
    })
  }
  return holes
}

/**
 * What a wire route runs over, in three tiers, best first - **a preference and
 * not a constraint.**
 *
 * Measured on his boards: **7 of 8 wires cross no part's area at all.** One
 * crosses a formable capacitor on `feedback` and one crosses a rigid trimmer on
 * `buffered`, so neither case is refused; they are ordered after the clear
 * route, which is what he reached for seven times out of eight.
 */
export type Route = "clear" | "over-formable" | "over-rigid"

export const ROUTE_ORDER: readonly Route[] = ["clear", "over-formable", "over-rigid"]

export function routeOf(from: Hole, to: Hole, placed: readonly PartArea[]): Route {
  let worst: Route = "clear"
  for (const hole of spanHoles(from, to)) {
    for (const other of placed) {
      if (!holeInRect(hole, other.rect)) continue
      if (other.rigid) return "over-rigid"
      worst = "over-formable"
    }
  }
  return worst
}
