/**
 * What a stripboard layout IS: a grid of strips, parts occupying hole sets,
 * wires joining holes, solder bridges joining adjacent strips.
 *
 * IT IS DATA, AND IT SAYS NOTHING ABOUT WHETHER A BOARD IS GOOD. There is no
 * scoring here, no objective, no weights, no connectivity, no cut derivation
 * and no search. Those live in `./connectivity.ts`, `./cuts.ts` and the scorer,
 * and they are deliberately not here: a module that both defines the artifact
 * and grades it is a module that can be adjusted until it passes, which is the
 * failure CLAUDE.md names - "an agent may never author the acceptance criteria
 * for the artifact it is producing". This file is the first half only.
 *
 * WHY IT EXISTS. The layout search drove a forked VeroRoute GUI one gesture at
 * a time, at 126,435 subprocess launches and about 25 minutes per run, and it
 * never finished a board. The owner's decision: *"being tied to a forked gui
 * for our core logic is a bad idea... the core agent-focused layout solution
 * code should be ours."* This is the model that core rests on.
 *
 * `lib/stripboard/` IS THE CORE AND MAY NOT IMPORT FROM `tools/`. Everything
 * here reaches `lib/` only, and the one thing this module wanted from `tools/`
 * and did NOT take is recorded in `geometryOf`'s refusal below.
 *
 * TWO REFUSALS ARE THE POINT OF THE MODULE, not decoration:
 *
 *   1. a footprint with no recorded pin pattern refuses BY NAME, rather than
 *      getting a plausible default;
 *   2. a part's occupied holes are NEVER reconstructed from its pins, and
 *      nothing in `lib/` records them, so `geometryOf` refuses rather than
 *      inferring. The evidence for that is in its own comment and in
 *      `tests/stripboard/model/board.test.ts`, which reads it off the recorded
 *      pads instead of restating it.
 */
import { admitPattern } from "../kicad/pin-pattern-model.ts"
import type { PinPattern } from "../kicad/pin-pattern-model.ts"
import { pinPatternFor } from "../kicad/pin-pattern.ts"

/** The stock: how many strips of copper, and how many holes along each. */
export interface Grid {
  readonly strips: number
  readonly columns: number
}

/** One hole, by the strip it is in and its position along that strip. */
export interface Hole {
  readonly strip: number
  readonly column: number
}

export interface Placement {
  readonly ref: string
  readonly footprint: string
  readonly origin: Hole
  readonly direction: "W" | "E" | "N" | "S"
  /** Every hole this part occupies, derived from its footprint and direction. */
  readonly holes: readonly Hole[]
  /** Pin name to the hole it sits in. */
  readonly pins: ReadonlyMap<string, Hole>
}

/**
 * A length of wire soldered between two holes.
 *
 * ITS `net` IS AN INPUT AND NOT A DISCOVERY. A wire is added in order to carry
 * a particular net, so the net is known before the wire exists, and the field
 * is required so that it cannot be left to be worked out afterwards. A wire
 * whose declared net no component pin reaches connects nothing - DETECTING that
 * is the connectivity module's job, not this one's. The type's only job is to
 * make the field impossible to omit.
 */
export interface Wire {
  readonly from: Hole
  readonly to: Hole
  /** The net this wire exists to carry. Declared, never discovered. */
  readonly net: string
}

/**
 * A solder blob joining two ADJACENT strips at one column.
 *
 * IT IS IN THE MODEL BECAUSE `B` IS IN THE OBJECTIVE. `F = C + rho_w*W +
 * rho_s*B`, and a `Candidate` with no way to express a bridge would force the
 * scorer to assume `B` is zero, infer it, or ask VeroRoute - and all three
 * defeat scoring a candidate in process, which is the whole point of the
 * rewrite.
 *
 * A BRIDGE IS A ROUTING DECISION, NOT A CONSEQUENCE, which is why it is priced
 * beside a wire rather than counted as free. The owner's reason, verbatim: *"A
 * solder blob will turn into a wire on my bench."* It is a short-hop
 * alternative to a wire, and the committed boards use them. MEASURED, not
 * assumed: the dumps under `tests/fixtures/stripboard/` carry 15 `SOLDER` lines
 * between them (6, 5, 3 and 1, with `pultec-low-boost-imported` carrying none),
 * and all 15 join two consecutively-numbered strips at a single shared column -
 * checked by arithmetic over the coordinates rather than by reading them. The
 * frozen low-boost board's one bridge is `SOLDER 9,6 10,6`.
 *
 * ADJACENCY IS A CLAIM THIS TYPE CANNOT ENFORCE. `readonly [number, number]`
 * admits `[1, 7]`, and nothing in this file rejects it: a predicate here would
 * be a second owner of a rule the connectivity and cut modules have to apply
 * anyway. What the type does is make the shape - one column, exactly two strips
 * - the only shape expressible, so a bridge cannot quietly become a diagonal.
 */
export interface Bridge {
  readonly column: number
  readonly strips: readonly [number, number]
  readonly net: string
}

export interface Candidate {
  readonly grid: Grid
  readonly placements: readonly Placement[]
  readonly wires: readonly Wire[]
  readonly bridges: readonly Bridge[]
}

/**
 * The recorded pin patterns `geometryOf` resolves a footprint against.
 *
 * It is the map `lib/kicad/pin-pattern.ts` exports as `PIN_PATTERNS` and takes
 * as `pinPatternFor`'s optional second argument - named here so a caller can
 * see what it is being asked for, and injectable for the same reason that
 * function's parameter is.
 */
export type PinPatterns = ReadonlyMap<string, PinPattern>

/** Two or more parts claiming one hole: which hole, and every part claiming it. */
export interface HoleClash {
  readonly hole: Hole
  readonly refs: readonly string[]
}

const holeKey = (hole: Hole): string => `${hole.strip},${hole.column}`

/**
 * The first hole two or more placements both occupy, or `null`.
 *
 * WHAT IT READS AND WHAT IT DOES NOT. It reads `Placement.holes` and nothing
 * else. **Wires and bridges occupy holes too** - the fork refuses a part moved
 * onto a wire's own span, which is measured and recorded in
 * `tools/stripboard/seed-geometry.ts` - and they are deliberately NOT included
 * here, because which features a candidate must keep clear of which is a rule
 * the placement checks own and not a definition of the board. A caller that
 * needs the wider test must say so; this function's name is about holes that
 * two PARTS share.
 *
 * **WHICH CLASH IS RETURNED IS A DECLARED CONVENTION:** the lowest strip, then
 * the lowest column. It is declared rather than left to map iteration order so
 * that two runs over equal candidates report the same hole, which a search that
 * reports a clash to a human needs.
 *
 * A placement's own hole list is read as a SET, so a hole mentioned twice in
 * one list is not a part clashing with itself. Two placements sharing one
 * `ref` are not checked for: that is a malformed candidate rather than an
 * overlap, and this function would report it as a part clashing with itself
 * under its own name.
 */
export function holesOverlap(candidate: Candidate): HoleClash | null {
  const claimants = new Map<string, { readonly hole: Hole; readonly refs: string[] }>()
  for (const placement of candidate.placements) {
    const own = new Set<string>()
    for (const hole of placement.holes) {
      const key = holeKey(hole)
      if (own.has(key)) continue
      own.add(key)
      const claimed = claimants.get(key)
      if (claimed === undefined) claimants.set(key, { hole, refs: [placement.ref] })
      else claimed.refs.push(placement.ref)
    }
  }
  let first: HoleClash | null = null
  for (const { hole, refs } of claimants.values()) {
    if (refs.length < 2) continue
    if (
      first === null ||
      hole.strip < first.hole.strip ||
      (hole.strip === first.hole.strip && hole.column < first.hole.column)
    ) {
      first = { hole, refs: [...refs] }
    }
  }
  return first
}

const WHERE_THE_HOLES_ARE_READ =
  "a placement's holes are read by overlap detection (holesOverlap, here), by the stock-fit " +
  "measurement and by the buildability check, so a guessed occupied area is wrong in three " +
  "places at once rather than one"

/**
 * A footprint's occupied holes and its pin-to-hole map, at an origin and
 * direction - **and it refuses every footprint today.**
 *
 * **IT CANNOT BE BUILT FROM `pinPatternFor` ALONE, AND THAT IS THE FINDING, NOT
 * A BUG IN THIS FILE.** A `PinPattern` (`lib/kicad/pin-pattern-model.ts`)
 * records PADS and says nothing about a part's body. Its own entry for
 * `Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm` says so outright - *"a body
 * width is not a pin position and does not enter this classification at all"* -
 * and the three `C_Rect` footprints in `lib/kicad/pin-pattern.ts` carry
 * IDENTICAL pads, `(0,0)` and `(5,0)`, across body widths of 2.5mm, 3.5mm and
 * 4.5mm. No function of the pads can tell those three apart, so no derivation
 * from the recorded pattern yields an occupied area.
 *
 * **THE DIFFERENCE IS NOT COSMETIC, AND THE FROZEN BOARD MEASURES IT.** On
 * `tests/fixtures/stripboard/pultec-low-boost-frozen.dump`, `C18` is a
 * `CAP_FILM_WIDE` and `C19` a `CAP_FILM`;
 * `pultec-low-boost-frozen.footprints.json` gives `C18` the 3.5mm-bodied
 * `C_Rect` and `C19` the 2.5mm one - the two whose pads are identical - and
 * `VEROROUTE_FOOTPRINT_ROWS` in `tools/stripboard/seed-geometry.ts` records
 * three footprint rows for the first and one for the second, transcribed from
 * `CompTypes::GetMakeInstructions`. That file also records what happens to code
 * that derives the row count from the leads instead: it was wrong by one on
 * `C18`, whose leads sit in the middle row of three, and the fork refused the
 * moves it proposed.
 *
 * **AND THAT TABLE IS NOT THE FIX.** It lives in `tools/`, which this module
 * may not import, and it is keyed by VeroRoute component TYPE rather than by
 * KiCad footprint - so it answers a different question in a different
 * vocabulary, and routing it here would both breach the boundary and make the
 * core's geometry depend on the fork it exists to replace.
 *
 * **SO THE REMEDY IS A RECORD, AND WHERE IT GOES IS NOT THIS AGENT'S CALL.**
 * The occupied area has to be recorded per KiCad footprint, from the
 * `.kicad_mod` whose path and `(version <n>)` token every `PinPattern` already
 * carries, with a test that opens that file - the shape
 * `tests/kicad/pin-pattern.test.ts` already has, and for the reason it has it:
 * this repository has twice shipped a footprint that does not exist. Until such
 * a record exists this function refuses, because the alternative is a plausible
 * number in a field three checks believe.
 *
 * **NO PIN DERIVATION IS WRITTEN HERE EITHER**, although the pads do determine
 * it. Code after an unconditional refusal cannot run and cannot be tested, and
 * untested unreachable code that looks like a derivation is worse than its
 * absence: the next reader would take it for a working one.
 */
export function geometryOf(
  footprint: string,
  origin: Hole,
  direction: Placement["direction"],
  patterns: PinPatterns,
): { holes: readonly Hole[]; pins: ReadonlyMap<string, Hole> } {
  const asked =
    `asked for strip ${origin.strip}, column ${origin.column}, facing ${direction}`
  // NO REFUSAL KEY BELOW ENDS IN THE WORD THE SWEEP LOOKS FOR, AND THAT IS
  // MEASURED RATHER THAN STYLISTIC. `tests/kicad/footprint-sweep.ts` collects
  // every declaration-shaped footprint name in the repository, and its pattern
  // has a word boundary in front - so a key ending in that word, followed by a
  // colon and a quoted interpolation, reads to the sweep as a declaration of a
  // footprint named after the placeholder. The first spelling of these keys did
  // exactly that and two tests in that file failed by name; the keys were
  // renamed. The offending spelling is NOT written out here, for the reason
  // that file gives for not writing out its own: prose that matches the sweep
  // becomes a finding about the file explaining the sweep.
  if (!patterns.has(footprint)) {
    throw new Error(
      `stripboard-geometry-unrecorded-pattern: "${footprint}" is not in the pin-pattern map ` +
        `handed to geometryOf, so neither the holes it occupies nor the hole each of its pins ` +
        `sits in can be derived (${asked}).\nThis is not defaulted to a plausible shape: ` +
        `${WHERE_THE_HOLES_ARE_READ}.\nTo record a pattern, follow pinPatternFor in ` +
        "lib/kicad/pin-pattern.ts, which states the procedure and names every footprint that " +
        "has one.",
    )
  }
  // Cannot throw: the map was just shown to hold this key.
  const pattern = pinPatternFor(footprint, patterns)
  const eligibility = admitPattern(pattern)
  if (eligibility.kind === "refused") {
    throw new Error(
      `stripboard-geometry-unmountable-pattern: "${footprint}" has a recorded pin pattern ` +
        `that is not mountable on stripboard, so its pads do not all land on holes and there ` +
        `is no pad-to-hole mapping to return (${asked}).\n${eligibility.reason}\nThis is not ` +
        "defaulted to the nearest holes: a pattern admitPattern refuses is a pattern the " +
        "owner has said he will not build, and holes for it would be the geometry of a part " +
        "that is never mounted.",
    )
  }
  throw new Error(
    `stripboard-geometry-no-occupied-area: "${footprint}" has a recorded pin pattern and is ` +
      `mountable on the strips, and nothing records WHICH HOLES IT OCCUPIES, so geometryOf ` +
      `cannot return (${asked}).\n` +
      "WHAT IS MISSING: a PinPattern records pads and nothing about the part's body. The three " +
      "C_Rect footprints in lib/kicad/pin-pattern.ts carry identical pads at three different " +
      "body widths, and the 3.5mm and 2.5mm ones are the two parts the frozen low-boost board " +
      "places as a three-row CAP_FILM_WIDE and a one-row CAP_FILM.\n" +
      `WHY IT IS NOT INFERRED FROM THE PINS: ${WHERE_THE_HOLES_ARE_READ}. Deriving the extent ` +
      "from the leads is recorded in tools/stripboard/seed-geometry.ts as having been wrong by " +
      "one on C18, whose leads sit in the middle row of three.\n" +
      "WHERE TO FIX IT: record the occupied area per KiCad footprint, from the .kicad_mod whose " +
      "path and (version <n>) token the PinPattern already carries, with a test that opens that " +
      "file. VEROROUTE_FOOTPRINT_ROWS is not that record: it is in tools/, which lib/stripboard " +
      "may not import, and it is keyed by VeroRoute component type rather than by footprint.",
  )
}
