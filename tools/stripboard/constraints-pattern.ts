/**
 * `HC10` - **every placed part's pins lie on straight lines parallel to the
 * strips**, which is the owner's rule and a cost judgement rather than a
 * geometric impossibility.
 *
 * WHY IT IS ITS OWN FILE. `./constraints-physical.ts` passed the 500-line
 * ceiling, and this is the cut its own module comment had already named: `HC10`
 * and the four functions only it uses are the ONLY dependants of
 * `lib/kicad/pin-pattern.ts` and `pin-pattern-model.ts` among the ten checks,
 * so the seam takes two imports with it and leaves `HC4`, `HC5`, `HC6` and
 * `HC9` reading only `lead-span*` and `./extent.ts`. `./constraints.ts`
 * re-exports `hc10` from here and nothing else changed.
 *
 * ONE ENTRY CONJOINING TWO HALVES, and `ConstraintId` is unchanged at ten,
 * because both are clauses of one criterion sentence. Task 2 proved a footprint
 * COULD be placed compatibly; nothing proved the produced layout DID, and a
 * verdict asserting `HC10` on the footprint half alone is this plan's own crux
 * turned on itself. Both halves have their own negative fixture, because a
 * single fixture would let one half be vacuous while the other carried the test.
 */
import { usableDirection, type Pin } from "../guide/dump.ts"
import { pinPatternFor } from "../../lib/kicad/pin-pattern.ts"
import { admitPattern } from "../../lib/kicad/pin-pattern-model.ts"
import type { PadPosition, PinPattern } from "../../lib/kicad/pin-pattern-model.ts"
import {
  at,
  broken,
  footprintOf,
  holds,
  placedParts,
  stripOf,
  type CheckInput,
  type ConstraintResult,
} from "./constraints-model.ts"

/** `HC10`'s footprint half: Task 2's check, called from here. */
function hc10FootprintEligibility(input: CheckInput): string | undefined {
  for (const [part, pins] of placedParts(input.dump)) {
    const footprint = footprintOf(part, pins, input.footprints)
    if (footprint === undefined) continue
    const eligibility = admitPattern(patternFor(footprint, input))
    if (eligibility.kind === "refused") {
      return (
        `the footprint half refuses part ${part.ref}: ${eligibility.reason} ` +
        "The remedy is in the footprint data, not in the layout."
      )
    }
  }
  return undefined
}

/** The pattern lookup, honouring `CheckInput.patterns` when the caller injected one. */
function patternFor(footprint: string, input: CheckInput): PinPattern {
  return input.patterns === undefined
    ? pinPatternFor(footprint)
    : pinPatternFor(footprint, input.patterns)
}

/** Pads grouped by the across-coordinate of one axis: `"x"` means rows of constant y. */
function rowsAlong(pads: readonly PadPosition[], axis: "x" | "y"): readonly (readonly string[])[] {
  const across = axis === "x" ? (pad: PadPosition) => pad.yMm : (pad: PadPosition) => pad.xMm
  const buckets = new Map<string, string[]>()
  for (const pad of pads) {
    // Keyed on the rounded coordinate, the same four decimals classifyPads
    // uses: finer than any footprint dimension, coarser than IEEE754 noise.
    const key = across(pad).toFixed(4)
    const bucket = buckets.get(key) ?? []
    bucket.push(pad.pad)
    buckets.set(key, bucket)
  }
  return [...buckets.values()]
}

/**
 * The footprint's rows AS `HC10`'s placement rule means them: the decomposition
 * whose rows are the LONGER of the two, by pads per row.
 *
 * WHY THIS IS NOT `classification.rows`, which is the one judgement in this file
 * that had to be read rather than quoted, and is flagged in the task report as
 * such. Any grid pad pattern decomposes into rows along EITHER axis, and
 * `classifyPads` returns the first axis that works - `x` whenever `x` works -
 * which for three recorded footprints is the axis giving many SHORT rows rather
 * than few LONG ones. Measured: `DIP-16_W7.62mm` records eight rows of two (the
 * pad PAIRS, `1`+`16`, `2`+`15`, ...), and `PinHeader_1x02`/`1x05` record two
 * and five rows of one. The other ten recorded footprints are identical either
 * way.
 *
 * THE OWNER'S RULE NAMES THE OTHER ONE FOR THE DIP, and his sentence is what
 * settles it: *"dips should span strips with a cut down the middle, like a
 * breadboard."* A breadboard-mounted DIP-16 puts one pin from each SIDE on each
 * of eight strips, with the cut between them - so its 16 pins DO sit two to a
 * strip, and the pair sharing a strip is the mounting being ruled IN rather than
 * out. Read against `classification.rows`, where the pair IS a row, the rule
 * would refuse exactly that mounting: measured on `pt2399-core`'s `U1`, eight
 * violations, one per strip. Read against the two rows of eight - the
 * decomposition the plan's own direction names, *"U1's two rows of eight each
 * cross eight strips"* - it passes, and so does every other part on every board.
 *
 * MEASURED BEFORE BEING RELIED ON, on four committed boards: zero violations on
 * `pt2399-core` (12 graded), `transistor-preamp-feedback` (16) and
 * `transistor-preamp-staged` (30), all three of which pass `make check`; and
 * FIVE on `transistor-preamp-lab`, which does not - `C3`, `R4`, `RV2`, `RV4`
 * and `RV5` each have both leads of one row on a single strip. So the rule is
 * satisfied by every board a person built and in service, and is not vacuous:
 * it discriminates on real data. The figures are in
 * `docs/stripboard/pipeline-verification.md` section 3.
 *
 * IT READS THE RECORDED PADS AND RE-DERIVES NOTHING ELSE. `classification`
 * remains the authority for the FOOTPRINT half (`admitPattern`), which is the
 * clause about whether a pattern decomposes at all; this is only the grouping
 * the placement rule is phrased over.
 */
function hc10Rows(pattern: PinPattern): readonly (readonly string[])[] {
  const alongX = rowsAlong(pattern.pads, "x")
  const alongY = rowsAlong(pattern.pads, "y")
  const widest = (rows: readonly (readonly string[])[]): number =>
    Math.max(...rows.map((row) => row.length))
  const byX = widest(alongX)
  const byY = widest(alongY)
  // A TIE REFUSES, AND IT IS NOT BROKEN SILENTLY. When neither axis yields the
  // longer rows there is no longer-row axis to group by, so THE RULE HAS NO
  // ANSWER - and a tie-break would make the verdict the tie-break rather than
  // the rule. Measured consequence of falling to one axis: a 2 x 2 square
  // footprint gives held=false and then, rotated 90 degrees, held=true - two
  // different verdicts for what is physically the same arrangement.
  //
  // So it throws, which is this repository's standard: an empty whitelist that
  // refuses loudly beats a general rule that quietly accepts a guess.
  //
  // WHICH SHAPES ACTUALLY REACH THIS, stated accurately because an earlier
  // version of this comment got it wrong. It claimed a single pad was "decided
  // by the comparison rather than by a tie"; A SINGLE PAD IS A TIE - its widest
  // row is 1 along either axis. So is any square field. What keeps the one-pad
  // case out of here is not this comparison but two things in
  // `hc10PlacementOrientation`: pad membership is checked BEFORE the rows are
  // derived, so a part with more holes than the footprint has pads gets that
  // accurate refusal instead of this one; and a part with fewer than two holes
  // skips the derivation entirely, because one pin cannot share a strip with
  // itself. So a genuine one-pad part never reaches this function.
  //
  // NO RECORDED FOOTPRINT WITH TWO OR MORE PADS IS AFFECTED: of the thirteen,
  // twelve have one axis strictly longer, and `PinHeader_1x01` is the one-pad
  // case above. This refuses for no board today and stops an arbitrary verdict
  // the day a square part arrives.
  if (byX === byY) {
    throw new Error(
      `HC10's placement half cannot decide footprint "${pattern.footprint}": its pads give ` +
        `rows of at most ${byX} along x and at most ${byY} along y, so NEITHER AXIS IS THE ` +
        "longer one and the owner's rule - no two pins of the same footprint row may share a " +
        "strip - has no row decomposition to be read over.\nThis is NOT broken by a tie-break: " +
        "which axis won would then decide the verdict, and the same part rotated a quarter turn " +
        "would grade differently. A square pin field needs a rule the owner has not given. " +
        "Take it to him, and record the answer in docs/stripboard/pipeline-verification.md " +
        "section 3 beside the rule it extends.",
    )
  }
  return byY > byX ? alongY : alongX
}

/**
 * `HC10`'s placement half - **THE OWNER'S RULE, decided by him on 2026-10-11**:
 *
 *   > **No two pins belonging to the same footprint row may share a strip.**
 *
 * His sentence, quoted: *"dips should span strips with a cut down the middle,
 * like a breadboard."*
 *
 * THE TASK BRIEF'S ORIGINAL WORDING WAS INVERTED, and recording that is the
 * point of this paragraph rather than tidiness. It asked that a part's pins
 * *"fall on a set of strips whose occupied strips are exactly the rows the
 * footprint's classification predicts"* - which requires a footprint row to lie
 * ALONG a strip. Measured against the three committed boards that pass
 * `make check`, that refused 13 of 16, 27 of 34 and 10 of 12 placed parts,
 * because a two-terminal part's leads sit on two strips BECAUSE THEY SIT ON TWO
 * NETS: both leads on one strip is a short across the part. The owner settled
 * it the other way round, and the measurements are in
 * `docs/stripboard/pipeline-verification.md` section 3.
 *
 * WHY IT IS A SHORT AND NOT A PREFERENCE: a row lying along a strip puts every
 * pin of that row on ONE piece of copper. A row crossing the strips puts each
 * of its pins on its own strip, which is the breadboard mounting. The DIP's
 * centre cut is `HC1`'s and `HC8`'s business, where connectivity is decided;
 * `HC10` does not assert it a second time.
 *
 * `DIRECTION` IS READ AS WELL AS THE PIN HOLES - TWO WITNESSES, for `M1.1`'s
 * own reason: *"reading the orientation directly is what makes the check
 * independent of the lead pattern, and a single-pad or symmetric part has no
 * lead pattern to read."* Same shape as `HC3`'s two signals, so a change keeping
 * one and dropping the other fails loudly. The direction is reported rather than
 * re-derived from the holes, because a part whose rows are all one pin long has
 * no readable orientation at all.
 *
 * WHAT THE `DIRECTION` WITNESS DOES AND DOES NOT DO, stated so nobody reads it
 * as more than it is. It REFUSES a placed part whose orientation the dump does
 * not state, or states as `UNKNOWN`, and it reports the one it read. It does
 * NOT independently re-derive whether that orientation is the correct one,
 * because nothing states the correspondence between a KiCad footprint's pad
 * axes and VeroRoute's own footprint rows and columns - that is
 * `admitPattern`'s own documented weakness and it is not closed here. So: a
 * second REFUSAL path that works for a single-pad or symmetric part with no
 * lead pattern to read, which is what `M1.1` asks for; not a second derivation
 * of the verdict.
 *
 * A ONE-PIN ROW CANNOT VIOLATE THE RULE, and that is correct rather than a gap:
 * a row of one pin cannot be shorted to itself. Negative fixture:
 * `rows-along-a-strip`.
 */
function hc10PlacementOrientation(input: CheckInput): string | undefined {
  for (const [part, pins] of placedParts(input.dump)) {
    const footprint = footprintOf(part, pins, input.footprints)
    if (footprint === undefined) continue
    const pattern = patternFor(footprint, input)
    if (pattern.classification.kind !== "rows") continue
    // PAD MEMBERSHIP IS CHECKED BEFORE THE ROWS ARE DERIVED, AND THE ORDER IS A
    // FIX RATHER THAN A PREFERENCE. `hc10Rows` refuses a footprint whose two
    // axes tie, and a SINGLE PAD ties trivially - 1 === 1. With the derivation
    // first, a two-hole part mis-declared with a one-pad footprint refused with
    // the square-pin-field message, which tells the reader to take an
    // undecidable pad geometry to the owner when what they actually have is a
    // wrong footprint name. A refusal that sends somebody to the owner for a
    // decision when they have a typo is worse than no message, because it
    // teaches the wrong thing - which is the same rule that makes the tie
    // refuse at all. So the accurate fault is diagnosed first, and the tie
    // refusal speaks only for a part whose pads genuinely tie on both axes.
    const padNames = new Set(pattern.pads.map((pad) => pad.pad))
    for (const pin of pins) {
      if (!padNames.has(pin.pin)) {
        throw new Error(
          `HC10 cannot place part ${part.ref}: the dump prints PIN ${part.ref} ${pin.pin}, and ` +
            `"${pin.pin}" is not a pad of footprint ${footprint} as lib/kicad/pin-pattern.ts ` +
            `records it - that footprint's pads are ${[...padNames].join(", ")}.\nThis is NOT ` +
            "skipped: a pin the footprint does not have means the " +
            "footprint declared for this part is the wrong one, or the recorded pad list is " +
            "incomplete, and either way the rows this check reads are not this part's.",
        )
      }
    }
    // A PART WITH FEWER THAN TWO HOLES CANNOT VIOLATE THE RULE, so no row
    // decomposition is needed and none is derived. The rule is that no two pins
    // of one row share a strip; one pin cannot share a strip with itself. This
    // guard is what keeps a legitimately placed one-pad part - `PinHeader_1x01`
    // is the recorded one - away from `hc10Rows`, whose two axes tie at 1 for a
    // single pad and which would otherwise refuse a part that trivially
    // complies. Its DIRECTION is still read below for the parts that do reach
    // the grouping; a one-hole part has no orientation to be wrong about.
    if (pins.length < 2) continue
    const rowOfPad = new Map<string, number>()
    hc10Rows(pattern).forEach((row, index) => {
      for (const pad of row) rowOfPad.set(pad, index)
    })
    // Witness 2, read before any hole is grouped so that a part with no usable
    // DIRECTION refuses here rather than passing on the holes alone.
    const direction = usableDirection(part, `HC10's placement half for part ${part.ref}`)
    const byRowAndStrip = new Map<string, Pin[]>()
    for (const pin of pins) {
      const row = rowOfPad.get(pin.pin)
      if (row === undefined) {
        throw new Error(
          `unreachable: PIN ${part.ref} ${pin.pin} passed the pad-membership check above and ` +
            `then was not in ${footprint}'s row decomposition, which is built from the same pads`,
        )
      }
      const key = `${row}|${stripOf(pin, input.dump.verticalStrips)}`
      const group = byRowAndStrip.get(key) ?? []
      group.push(pin)
      byRowAndStrip.set(key, group)
    }
    const shared = [...byRowAndStrip.entries()].filter(([, group]) => group.length > 1)
    const first = shared[0]
    if (first !== undefined) {
      const [key, group] = first
      const [row, strip] = key.split("|")
      return (
        `the placement half refuses part ${part.ref} (${footprint}, DIRECTION ${direction}): ` +
        `row ${row ?? ""} of its footprint has ${group.length} pins on strip ${strip ?? ""} - ` +
        `pins ${group.map((pin) => pin.pin).join(" and ")} at ${group.map(at).join(" and ")}` +
        `${shared.length > 1 ? `, and ${shared.length - 1} further row(s) likewise` : ""}. ` +
        "A row lying along a strip puts every pin of that row on one piece of copper. Turn the " +
        "part so its rows cross the strips; the remedy is in the layout, not in the data."
      )
    }
  }
  return undefined
}

/**
 * `HC10` - **every placed part's pins lie on straight lines parallel to the
 * strips**, *"the owner's rule, and a cost judgement rather than a geometric
 * impossibility."*
 *
 * ONE ENTRY CONJOINING TWO HALVES, with `detail` naming WHICH half failed so a
 * failure points at the remedy: the footprint half points at the data, the
 * placement half points at the layout.
 */
export function hc10(input: CheckInput): ConstraintResult {
  const footprintFailure = hc10FootprintEligibility(input)
  if (footprintFailure !== undefined) return broken("HC10", footprintFailure)
  const placementFailure = hc10PlacementOrientation(input)
  if (placementFailure !== undefined) return broken("HC10", placementFailure)
  const placed = placedParts(input.dump).filter(
    ([part, pins]) => footprintOf(part, pins, input.footprints) !== undefined,
  )
  return holds(
    "HC10",
    `the footprint half admits all ${placed.length} placed part(s) with a declared footprint, ` +
      "and the placement half finds no footprint row with two pins on one strip - each row " +
      "crosses the strips, which is the mounting the owner's rule requires.",
  )
}
