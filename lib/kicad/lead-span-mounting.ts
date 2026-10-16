/**
 * WHICH MOUNTING A PLACED PART'S SPAN REQUIRES, so an artifact a person builds
 * from can say it.
 *
 * **WHY THIS EXISTS, IN THE OWNER'S WORDS.** `84d8adf` taught the span model
 * that an axial part can be STOOD ON END - body perpendicular to the board, one
 * lead straight down, the other folded over the top and back down beside it -
 * because `HC9` was rejecting his own hand-laid low-boost, where `R2` spans 3
 * holes against a flat minimum of 5. His warrant: *"It's standard practice to
 * stand resistors on end when their holes are next to each other. That's should
 * NOT be a failure condition"*. That cleared twelve `HC9` failures across four
 * boards. **But nothing the pipeline emitted said WHICH parts stand up**, so a
 * reader got a layout with a resistor in two nearly adjacent holes and no
 * instruction that it must be mounted vertically. Standard practice to him;
 * invisible to anybody else reading the board.
 *
 * **IT DERIVES THE ANSWER AND INVENTS NO FIELD.** The flat floor is already
 * recorded - `axialFlatMinPitchMm` is the manufacturer's own `Mmin` where there
 * is one and body-plus-standoff otherwise, and each axial family's `minBasis`
 * carries the figure in prose - so *"is this span below the flat floor"* is a
 * question the span model can already answer. Nothing here records a mounting
 * per part, per board or per footprint: a second place to keep that correct is a
 * second place for it to go wrong, and the dump's own hole positions plus
 * `./lead-span.ts`'s own geometry are between them enough.
 *
 * **ITS OWN MODULE because `./lead-span-model.ts` and `./lead-span.ts` are both
 * at the 500-line ceiling**, and because this is a different question from
 * theirs: those two answer *what span can this family reach*, and this one
 * answers *what does a span the board already has oblige the builder to do*. The
 * consumers are `tools/guide/checklist.ts`, which is the sheet a person builds
 * from, and `tools/stripboard/constraints-physical.ts`'s `HC9`, which is the
 * line about spans a person reads in a run's report.
 */
import { gridStepsAtLeast, holesForSteps } from "./grid.ts"
import {
  TOOL_MAX_SPAN_HOLES,
  TOOL_MIN_SPAN_HOLES,
  axialFlatMinPitchMm,
  axialStandsOnEnd,
  type FormableGeometry,
  type LeadSpan,
} from "./lead-span-model.ts"

/**
 * What a span obliges the builder to do with the part.
 *
 * Three members and no "unknown": a caller that cannot read a footprint's span
 * has nothing to ask about, and a caller holding a span this part cannot reach
 * in ANY mounting gets a refusal rather than a fourth member - see
 * `mountingForSpan`.
 */
export type SpanMounting = "stood-on-end" | "flat-fits" | "one-mounting"

/**
 * What each mounting is called where a person reads it, in ONE place.
 *
 * It lives here rather than in the guide or the grader for `describeCutCounts`'s
 * reason: the module that derives the fact is where what it MEANS belongs, and
 * two emitters wording one instruction two ways is how a build sheet and a
 * report come to disagree about the same board.
 *
 * `stood-on-end` SHOUTS and the other two do not, which is deliberate: it is the
 * only one of the three that is an INSTRUCTION. The other two say that there is
 * nothing to decide, and a build sheet whose every row shouts has no emphasis
 * left for the row that matters.
 */
export const MOUNTING_LABEL: Readonly<Record<SpanMounting, string>> = {
  "stood-on-end": "STAND ON END",
  "flat-fits": "flat ok",
  "one-mounting": "one mounting",
}

/**
 * The tightest span, in HOLES, this family can be mounted at LYING FLAT -
 * `undefined` for a family that has no flat mounting to be below.
 *
 * **IT GOES THROUGH THE SAME GRID AND CLAMP `deriveSpanHoles` USES**, so the
 * figure it returns is comparable with a `minSpanHoles` and with a span counted
 * off a dump. A millimetre pitch converted some other way here would be a second
 * arithmetic, and the comparison in `mountingForSpan` would be between two
 * different units that happen to look alike.
 *
 * `undefined` rather than a number for a radial or rigid family, because the
 * question has no answer for them: both leads leave the same face, so there is
 * no body to take out from between the holes and no flat mounting to fall below.
 */
export function flatMinSpanHoles(span: LeadSpan): number | undefined {
  const geometry = twoMountingGeometry(span)
  if (geometry === undefined) return undefined
  const holes = holesForSteps(gridStepsAtLeast(axialFlatMinPitchMm(geometry)))
  return Math.min(Math.max(holes, TOOL_MIN_SPAN_HOLES), TOOL_MAX_SPAN_HOLES)
}

/**
 * The geometry of a family that HAS two mountings, or `undefined` for one that
 * does not - the ONE place that condition is written.
 *
 * Both functions below need it, and they need it as a narrowed type rather than
 * as a boolean: this repository forbids `as Type`, so a predicate returning
 * `true` would leave the geometry still unnarrowed at the call site and the
 * `axial*` helpers unreachable without a cast.
 */
function twoMountingGeometry(span: LeadSpan): FormableGeometry | undefined {
  const geometry = span.geometry
  if (geometry.kind !== "formable") return undefined
  if (geometry.mounting !== "axial-horizontal") return undefined
  return geometry
}

/**
 * Which mounting a part of this family, placed at this span, has to be built in.
 *
 * `stood-on-end` is returned when the span is BELOW the flat floor, and the
 * reading is physical rather than stylistic: at that span the body does not fit
 * between the holes, so the part cannot lie flat however it is formed. At or
 * above the floor the answer is `flat-fits`, which is NOT an instruction to lie
 * it flat - the owner stands parts up whenever he likes - but a statement that
 * the body fits, so nothing is required of the builder.
 *
 * **A SPAN BELOW `minSpanHoles` REFUSES, AND IS NOT REPORTED AS
 * `stood-on-end`.** `minSpanHoles` is already the looser of the part's two
 * mountings (`minReachPitchMm`), so a span beneath it is one NO mounting
 * reaches: telling a builder to stand such a part on end would be an
 * instruction that cannot be carried out, printed on the sheet he works from.
 * `HC9` is the check that catches the board, and this refusal names it rather
 * than inventing a fourth answer.
 */
export function mountingForSpan(span: LeadSpan, spanHoles: number): SpanMounting {
  const geometry = twoMountingGeometry(span)
  const flat = flatMinSpanHoles(span)
  if (geometry === undefined || flat === undefined) return "one-mounting"
  if (spanHoles >= flat) return "flat-fits"
  if (spanHoles < span.minSpanHoles) {
    throw new Error(
      `${span.footprint} is placed at a ${spanHoles}-hole span, below its recorded ` +
        `minSpanHoles of ${span.minSpanHoles} - so NO mounting reaches it, and which mounting ` +
        "to name is not a question with an answer.\nThis is NOT reported as STAND ON END: " +
        "minSpanHoles is already the looser of the part's two mountings (minReachPitchMm in " +
        "lib/kicad/lead-span-model.ts), standing it up included, so the part cannot be built at " +
        "this span at all and a build sheet saying otherwise would be an instruction nobody can " +
        "carry out.\nHC9 is the check that rejects the board " +
        "(tools/stripboard/constraints-physical.ts); fix the layout's span, or correct the " +
        "family's recorded dimensions in lib/kicad/lead-span.ts if the floor itself is wrong.",
    )
  }
  if (!axialStandsOnEnd(geometry)) {
    throw new Error(
      `${span.footprint} is placed at a ${spanHoles}-hole span, below the ${flat}-hole floor for ` +
        "the part LYING FLAT, but its worst-case lead is too short to fold the part over and " +
        "stand it on end (axialStandsOnEnd in lib/kicad/lead-span-model.ts).\nThis is NOT " +
        "reported as STAND ON END and is NOT defaulted to flat: the span is below the flat " +
        "floor, so neither mounting reaches it. Reaching here means minSpanHoles and this " +
        "derivation disagree about the same family, which is a defect in one of them rather " +
        "than a fact about the board - check the recorded leadLengthMm against the datasheet " +
        "named in the family's source.",
    )
  }
  return "stood-on-end"
}
