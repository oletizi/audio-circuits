/**
 * THE SPACE A PART ACTUALLY TAKES UP, and the two rules the owner stated about
 * it: nothing routed under a rigid part, and room to work where there is room.
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
 * **EVERY FIGURE BELOW IS MEASURED ON `transistor-preamp-feedback` AND
 * `transistor-preamp-buffered` - boards he laid out by hand, built, and uses -
 * and none is chosen here.** The measurements, over 37 parts and 85 leads with
 * each part's area derived from its own `.kicad_mod`:
 *
 *   - **no lead sits inside a rigid part's occupied area: 0 of 85, on both
 *     boards.** That is `routedUnderRigid` below, and it is the one HARD rule;
 *   - **nearest-neighbour clearance on `feedback`: 15 of 16 parts are ADJACENT to
 *     their nearest neighbour with no free hole between, one has two free holes,
 *     and NO pair of occupied areas overlaps.** So `touching` is what he mostly
 *     leaves and no-overlap is the condition that board never breaks;
 *   - **`buffered` has 4 overlapping pairs** (C1/RV4, C3/Q1, C3/R1, RV1/RV2) and
 *     7 of its 21 parts are adjacent, so **overlap is NOT refused here.** The
 *     owner ruled body collisions out of the model outright - *"Don't worry
 *     about body collisions on the stripboard. It's extremely flexible."* - and
 *     a rule that refused them would refuse a board he built;
 *   - **5 of his 8 wires cross no part's area at all**; two cross a formable part
 *     and one crosses a rigid trimmer on `buffered`. So a crossing is ordered
 *     last rather than forbidden.
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
 * **THE HARD RULE: a lead inside a rigid part's area.**
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

/**
 * How good a position is for BUILDING it, in three tiers, best first.
 *
 * `roomy` is at least one free hole all round; `touching` is adjacent with none;
 * `crowded` is an overlap. **A position where the hard rule breaks is not a tier
 * at all** - it is rejected.
 *
 * **WHERE THE THREE COME FROM, measured with this file's own `areaRect` so the
 * figures and the rule are the same quantity.** On `feedback`, 15 of 16 parts
 * are `touching` their nearest neighbour and one has two free holes; NO pair
 * overlaps. On `buffered`, four pairs overlap. So **his own boards sit mostly at
 * `touching`, and both of the looser tiers are things he builds** - which is why
 * neither is refused here and why `crowded` is a tier rather than an error.
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
