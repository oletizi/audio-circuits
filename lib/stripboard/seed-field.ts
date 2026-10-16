/**
 * THE FIELD PLACER: how a part whose terminals are moulded where they are gets
 * laid down - which of the four facings it is turned to, and which strip its
 * frame starts on.
 *
 * **SPLIT OUT OF `./seed-fit.ts` ON THE SEAM THAT FILE'S HEADER ALREADY
 * NAMED**: it called itself "THE TWO PLACERS", a third placer arrived with the
 * off-board kind, and 485 lines plus a third placer is over this repository's
 * line ceiling. The two-lead placer and the landing-pad placer stayed there,
 * both of which decide a part's strips from the HOMES OF ITS NETS; this one
 * decides them from the part's own moulded steps, which is the different
 * decision. Nothing moved twice and nothing was copied: `FIELD_FACINGS`,
 * `fieldHoles`, `FieldWindow` and `placeFixedField` are here and are nowhere
 * else.
 *
 * Like the placers it was split from, it decides the STRIPS and hands the
 * COLUMN to `chooseColumn` in `./seed-place.ts`, which ranks it by how
 * comfortable the position is to build.
 */
import { holeInFrame, type Hole, type Placement } from "./board.ts"
import {
  chooseColumn,
  commit,
  homeOf,
  scratchFree,
  type Workspace,
} from "./seed-place.ts"
import { refuse, type FixedFieldPart, type SeedFieldPin } from "./seed-model.ts"

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
 * because it is why the placer tried only two facings for as long as it did**:
 * *"Only the second is used, because a row along one strip is several nets' leads
 * interleaved on one conductor, and that is the open no cut list can close."*
 * That was true while every strip carried exactly one net, and **Task 2 made it
 * false**: a strip may now carry several nets with the cut parting them derived
 * rather than planned (`derivedCuts` in `./cuts.ts`, and `placeTwoLead`'s own
 * comment in `./seed-fit.ts` on the relaxation of 2026-10-15). A row of DISTINCT
 * nets along one strip is that admitted case, and it is an open only if the nets
 * INTERLEAVE - which `interleavingOn` in `./separable.ts` decides, per candidate
 * column, inside `chooseColumn`. With the premise gone, the restriction was
 * holding out a 1xN header and a DIP, both of which only an `E` or a `W` can lay
 * down at all.
 *
 * **S AND N STAY FIRST IN THIS LIST**, which is the direction tie-break
 * `placeFixedField` sorts on after the strip count: a part whose two counts are
 * equal is laid the way it was laid before this list grew.
 *
 * **WHICH OF TWO OPPOSED FACINGS A PART TAKES IS NOT A QUESTION THIS MODULE
 * OWES AN ANSWER FOR, BECAUSE THE OWNER HAS RETIRED IT - FOR BOTH OF THE PARTS
 * IT APPLIES TO HERE.** It decides only which side of the part the other rows
 * sit on. For a trimmer he said *"I dont care about trimmer orientation."*, and
 * on 2026-10-16 he extended that to the other moulded field this placer lays
 * down: ***"i don't care about dip orientation."*** So **what remains is a
 * DETERMINISM requirement and not a preference**: the order of this list needs
 * no justification beyond reproducibility - two runs over equal inputs must
 * return equal boards, which a list with a fixed order gives and a tie broken
 * by map iteration or by a judgement about which way round a part "should" go
 * does not. **No criterion is being authored here; one is being retired**, and
 * `FIELD_FACINGS.indexOf` in the sort below is therefore a tie-break and not a
 * ranking.
 */
const FIELD_FACINGS: readonly Placement["direction"][] = ["S", "N", "E", "W"]

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
 * the fewest strips is the facing that can force the most cuts of the part's own
 * making - a `PinHeader_1x05` laid at `E` has its pin row ALONG one strip, which
 * is five nets on one conductor and four cuts before anything else is placed,
 * against five strips and none at `S`.
 *
 * **THE COUNT IS A BOUND AND NOT THE CUT COUNT, and this comment said it WAS the
 * cut count until 2026-10-16.** `distinctStrips` counts STRIPS. The cuts a facing
 * forces are at MOST `pins - distinctStrips`, and fewer whenever two pins sharing
 * a strip are on the same net - those need no cut between them - so the actual
 * number depends on which of the field's nets land together and is not known from
 * the count alone. What the count does say is that crowding the pins onto one
 * fewer strip raises that ceiling by one, and a cut is the dearest term in the
 * committed objective (1.0 against 0.25 for a wire or a bridge). So the key is
 * the DIRECTION the owner's preference runs in, stated over a quantity this file
 * can read before a column exists, and no number is weighed against another here.
 * **Nothing this file ranks is a quantity `objectiveOf` prices** - it prices the
 * board it is handed, and `violationsOf` judges it; what this function decides is
 * which boards get offered at all.
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
