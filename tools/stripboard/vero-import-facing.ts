/**
 * Which way round a part on an imported board is: the one facing of
 * `lib/stripboard/board.ts`'s four under which a footprint's recorded pads land
 * on the holes a dump's `PIN` lines report.
 *
 * ITS OWN FILE for the reason `./pad-provenance.ts` is its own file: the walk
 * over a dump's lines (`./vero-import.ts`) and this arithmetic are two
 * different things, one file carrying both went past this repository's 300-500
 * line ceiling, and a reader who wants to know how a direction is decided
 * should not have to read a wire-net derivation to find out.
 *
 * **THE PINS ARE NEVER PRODUCED HERE.** An imported board's pin-to-hole map
 * comes from its `PIN` lines and nothing else - the dump is the authority for a
 * board that already exists, which is the direction of authority
 * `CLAUDE.md` states for a design being brought in. What this module decides is
 * the single field a dump does not reliably carry: `Placement.direction`. Four
 * of the seven committed dumps print no `DIRECTION` at all (they predate the
 * field), so it is solved from the pins rather than read.
 *
 * **A STRETCH IS ADMITTED AND IS NOT A DEFECT**, which is the owner's ruling:
 * *"the whole point of stripboards is to use the flexibility of the leads to
 * afford more layout possibilities."* VeroRoute stretches a two-terminal part to
 * whatever span the layout wants, so a placement's lead spacing is routinely not
 * its footprint's pitch - measured, 16 of 25 formed electrolytic placements
 * across these boards. A fit therefore compares the ORDER and AXIS of a
 * two-pin part's leads, not their spacing, and only for a footprint
 * `lib/kicad/lead-span.ts` records as formable. **The span bounds are NOT
 * applied here**: `HC5`/`HC9` own them, this module would be a second owner, and
 * two of the owner's built `buffered` resistors sit at a span of one hole
 * against a recorded floor of two - a finding to report, not a board to refuse
 * inside an adapter.
 *
 * **THE EIGHTH TRANSFORM, AND WHY IT IS A LABELLING FACT RATHER THAN A FLIP.**
 * The fit is sought over the eight symmetries of the square - the four facings,
 * each with and without a reflection - and not the four facings alone. Measured:
 * every `TRIM_FLAT` placement on every committed board (17 of them, on four
 * boards including both the owner BUILT) fits only a reflected transform,
 * because the pinned fork's own cell map for that type,
 * `"+2++++1+3"` (`CompTypes.h`, transcribed in `lib/kicad/import-string.ts`),
 * exchanges the two END terminals relative to the pads in
 * `Potentiometer_Runtron_RM-065_Vertical.kicad_mod` (`1` at `0,0`, `2` at
 * `2.5,5`, `3` at `5,0`). The RM-065's three pads are mirror-symmetric as a
 * POSITION SET, so the holes such a placement occupies are reachable by a plain
 * quarter turn and nothing is mounted on the copper side; what differs is which
 * hole is called pin 1.
 *
 * So a reflected fit is admitted ONLY when the hole set is also reachable
 * unreflected, and `mirroredLabels` is set to say so. A reflected fit whose
 * holes are NOT so reachable would need the part turning over, and that
 * **refuses by name** - the owner's ruling, verbatim: *"I don't want to mount
 * parts on the copper side. It's harder to solder."*
 */
import type { Hole, PinPatterns, Placement } from "../../lib/stripboard/board.ts"
import { geometryOf } from "../../lib/stripboard/board.ts"
import { leadSpanFor } from "../../lib/kicad/lead-span.ts"
import type { LeadSpan } from "../../lib/kicad/lead-span-model.ts"

/** The four facings, in the order a fit tries them, so two runs agree. */
export const FACINGS: readonly Placement["direction"][] = ["E", "S", "W", "N"]

/** One pin as a dump reports it: its name and the hole it sits in. */
export interface PinHole {
  readonly pin: string
  readonly hole: Hole
}

/**
 * A solved placement frame: where the footprint's own origin lands, which way
 * it faces, and the two things about the fit a caller may need to report.
 */
export interface Facing {
  readonly origin: Hole
  readonly direction: Placement["direction"]
  /** True when the leads are at a span their footprint does not state. */
  readonly stretched: boolean
  /**
   * True when the fit needed the reflection - the pads' positions match and
   * their LABELS are exchanged, as the fork's `TRIM_FLAT` does to the RM-065.
   */
  readonly mirroredLabels: boolean
}

const key = (hole: Hole): string => `${hole.strip},${hole.column}`

/** The footprint's pads at one facing, as offsets from the origin hole. */
function offsetsAt(
  footprint: string,
  direction: Placement["direction"],
  patterns: PinPatterns,
): ReadonlyMap<string, Hole> {
  return geometryOf(footprint, { strip: 0, column: 0 }, direction, patterns).pins
}

/** The same offsets reflected across the board's strip axis - the eighth transform. */
function reflected(offsets: ReadonlyMap<string, Hole>): ReadonlyMap<string, Hole> {
  return new Map([...offsets].map(([pad, at]) => [pad, { strip: -at.strip, column: at.column }]))
}

/**
 * The unit step from a two-pad transform's first pad to its second, or `null`
 * when the two are not one step apart along a single axis.
 *
 * Two pads only: a stretch is admitted for a two-terminal part and nothing
 * else, so a three-pad footprint has no axis as far as this module is
 * concerned even when its pads are collinear. Task 13 measured all nine `TO92`
 * placements on the committed boards at exactly their prepared span, so a
 * stretched three-lead part is a shape nothing here has seen.
 */
function twoPinAxis(offsets: ReadonlyMap<string, Hole>): Hole | null {
  const away = [...offsets.values()].filter((at) => at.strip !== 0 || at.column !== 0)
  const only = away[0]
  if (away.length !== 1 || only === undefined) return null
  if ((only.strip === 0) === (only.column === 0)) return null
  return { strip: Math.sign(only.strip), column: Math.sign(only.column) }
}

/** Every pad name mapped to the hole the dump reports for it, or `null` when one is absent. */
function holesByPad(
  offsets: ReadonlyMap<string, Hole>,
  pins: readonly PinHole[],
): ReadonlyMap<string, Hole> | null {
  const byName = new Map(pins.map((pin) => [pin.pin, pin.hole]))
  const out = new Map<string, Hole>()
  for (const pad of offsets.keys()) {
    const hole = byName.get(pad)
    if (hole === undefined) return null
    out.set(pad, hole)
  }
  return out
}

/** An exact fit of one transform: the origin it implies, or `null`. */
function exactOrigin(
  offsets: ReadonlyMap<string, Hole>,
  holes: ReadonlyMap<string, Hole>,
): Hole | null {
  let origin: Hole | null = null
  for (const [pad, at] of offsets) {
    const hole = holes.get(pad)
    if (hole === undefined) return null
    const implied = { strip: hole.strip - at.strip, column: hole.column - at.column }
    if (origin === null) origin = implied
    else if (origin.strip !== implied.strip || origin.column !== implied.column) return null
  }
  return origin
}

/**
 * A two-pin fit whose span differs from the footprint's, or `null`.
 *
 * The axis and the ORDER must agree - pad 1's hole then pad 2's hole, along the
 * direction this transform points the lead axis - and the two holes must be
 * distinct. The spacing is whatever the board says.
 */
function stretchedOrigin(
  offsets: ReadonlyMap<string, Hole>,
  holes: ReadonlyMap<string, Hole>,
  span: LeadSpan,
): Hole | null {
  if (!span.formable || offsets.size !== 2) return null
  const axis = twoPinAxis(offsets)
  if (axis === null) return null
  const atOrigin = [...offsets].find(([, at]) => at.strip === 0 && at.column === 0)
  const away = [...offsets].find(([, at]) => at.strip !== 0 || at.column !== 0)
  if (atOrigin === undefined || away === undefined) return null
  const first = holes.get(atOrigin[0])
  const second = holes.get(away[0])
  if (first === undefined || second === undefined) return null
  const steps = {
    strip: second.strip - first.strip,
    column: second.column - first.column,
  }
  const along = steps.strip * axis.strip + steps.column * axis.column
  const across = steps.strip * axis.column + steps.column * axis.strip
  if (across !== 0 || along < 1) return null
  return first
}

/** Whether a hole set is reachable by one of the four facings, without reflection. */
function reachableUnreflected(
  footprint: string,
  patterns: PinPatterns,
  pins: readonly PinHole[],
): boolean {
  const wanted = new Set(pins.map((pin) => key(pin.hole)))
  for (const direction of FACINGS) {
    const offsets = offsetsAt(footprint, direction, patterns)
    if (offsets.size !== wanted.size) continue
    for (const pin of pins) {
      const shifted = [...offsets.values()].map((at) => ({
        strip: pin.hole.strip - at.strip,
        column: pin.hole.column - at.column,
      }))
      for (const origin of shifted) {
        const got = new Set(
          [...offsets.values()].map((at) =>
            key({ strip: origin.strip + at.strip, column: origin.column + at.column }),
          ),
        )
        if (got.size === wanted.size && [...got].every((hole) => wanted.has(hole))) return true
      }
    }
  }
  return false
}

/** One candidate transform, named for a refusal that has to say what it tried. */
interface Attempt {
  readonly direction: Placement["direction"]
  readonly mirroredLabels: boolean
  readonly offsets: ReadonlyMap<string, Hole>
}

function attempts(footprint: string, patterns: PinPatterns): readonly Attempt[] {
  const out: Attempt[] = []
  for (const direction of FACINGS) {
    const offsets = offsetsAt(footprint, direction, patterns)
    out.push({ direction, mirroredLabels: false, offsets })
  }
  for (const direction of FACINGS) {
    const offsets = offsetsAt(footprint, direction, patterns)
    out.push({ direction, mirroredLabels: true, offsets: reflected(offsets) })
  }
  return out
}

/** A solved fit, or what was wrong with every transform, for the caller to refuse with. */
export type FacingResult =
  | { readonly kind: "fitted"; readonly facing: Facing }
  | { readonly kind: "none"; readonly tried: readonly string[] }
  | { readonly kind: "ambiguous"; readonly directions: readonly Placement["direction"][] }
  | { readonly kind: "copper-side"; readonly direction: Placement["direction"] }
  | { readonly kind: "pin-names"; readonly pads: readonly string[] }

/**
 * Solve one placement's frame from its footprint and the holes its pins are in.
 *
 * The order of preference is declared rather than incidental, because two
 * transforms can both describe a mirror-symmetric pad set: an exact unreflected
 * fit first, then a stretched unreflected one, then the reflected pair in the
 * same order. Two exact unreflected fits are AMBIGUOUS and refuse - that is a
 * footprint whose pads cannot tell two orientations apart, and picking one would
 * be a coin toss recorded as a fact.
 */
export function facingOf(
  footprint: string,
  pins: readonly PinHole[],
  patterns: PinPatterns,
  spans: ReadonlyMap<string, LeadSpan> | undefined = undefined,
): FacingResult {
  const sample = offsetsAt(footprint, "E", patterns)
  if (holesByPad(sample, pins) === null || pins.length !== sample.size) {
    return { kind: "pin-names", pads: [...sample.keys()].sort() }
  }
  let span: LeadSpan | null = null
  try {
    span = spans === undefined ? leadSpanFor(footprint) : leadSpanFor(footprint, spans)
  } catch {
    // No recorded span means no stretch is admitted for this footprint, which is
    // the strict reading: a part whose reach nothing records is not one this
    // module may assume bends. It is not an error on its own - an exact fit
    // needs no span at all - so the refusal belongs to the fit, not to here.
    span = null
  }
  const tried: string[] = []
  const exact: Facing[] = []
  const loose: Facing[] = []
  for (const attempt of attempts(footprint, patterns)) {
    const holes = holesByPad(attempt.offsets, pins)
    if (holes === null) continue
    const name = `${attempt.direction}${attempt.mirroredLabels ? " (mirrored labels)" : ""}`
    const at = exactOrigin(attempt.offsets, holes)
    if (at !== null) {
      exact.push({
        origin: at,
        direction: attempt.direction,
        stretched: false,
        mirroredLabels: attempt.mirroredLabels,
      })
      continue
    }
    const stretch = span === null ? null : stretchedOrigin(attempt.offsets, holes, span)
    if (stretch !== null) {
      loose.push({
        origin: stretch,
        direction: attempt.direction,
        stretched: true,
        mirroredLabels: attempt.mirroredLabels,
      })
      continue
    }
    tried.push(name)
  }
  // THE FOUR TIERS ARE CHECKED IN ORDER AND EACH IS CHECKED FOR AMBIGUITY
  // SEPARATELY. Taking the first of several would record a coin toss as a fact
  // about a board, and it is a tier at a time because a mirror-symmetric pad set
  // fits a reflected transform whenever it fits an unreflected one - so the
  // mirrored tiers are never empty for such a footprint and would make every
  // placement of it look ambiguous if the tiers were pooled.
  for (const tier of [
    exact.filter((facing) => !facing.mirroredLabels),
    loose.filter((facing) => !facing.mirroredLabels),
    exact.filter((facing) => facing.mirroredLabels),
    loose.filter((facing) => facing.mirroredLabels),
  ]) {
    const only = tier[0]
    if (tier.length > 1) {
      return { kind: "ambiguous", directions: tier.map((facing) => facing.direction) }
    }
    if (only === undefined) continue
    if (only.mirroredLabels && !reachableUnreflected(footprint, patterns, pins)) {
      return { kind: "copper-side", direction: only.direction }
    }
    return { kind: "fitted", facing: only }
  }
  return { kind: "none", tried }
}
