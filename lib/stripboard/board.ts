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
 * here reaches `lib/` only. The one thing this module wanted from `tools/` and
 * did NOT take is `VEROROUTE_FOOTPRINT_ROWS`: it is behind that boundary, and it
 * is keyed by VeroRoute component TYPE rather than by KiCad footprint, so it
 * answers a different question in a different vocabulary. What replaced it is
 * `lib/kicad/footprint-extent.ts`, which derives a part's body outline from the
 * `.kicad_mod` the footprint's own `PinPattern` names.
 *
 * TWO REFUSALS ARE THE POINT OF THE MODULE, not decoration:
 *
 *   1. a footprint with no recorded pin pattern refuses BY NAME, rather than
 *      getting a plausible default;
 *   2. a part's occupied holes are NEVER reconstructed from its pins. The body
 *      half and the pads' half are derived separately and unioned, because the
 *      three `C_Rect` footprints carry identical pads at three body widths and
 *      the frozen low-boost board puts two of them on three strips and one
 *      strip. Where the body outline cannot be read, `geometryOf` still
 *      refuses.
 */
import { occupiedAreaFor } from "../kicad/footprint-extent.ts"
import type { FootprintExtent } from "../kicad/footprint-extent.ts"
import { padHolesFor } from "../kicad/formed-frame.ts"
import type { PadHole } from "../kicad/formed-frame.ts"
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
 * Where a footprint's own x and y axes point on the board, at each of the four
 * directions.
 *
 * **A DECLARED CONVENTION OF THIS MODEL, and deliberately NOT a claim about what
 * VeroRoute's `DIRECTION` token means.** The four entries are the quarter-turns
 * of one rotation - `E` is the identity, `S` is a quarter turn with column
 * increasing to the east and strip increasing to the south, and `W`/`N` are the
 * other two - so a part cannot acquire a shear or a reflection by being turned.
 * Which of these four a dump's `DIRECTION W` corresponds to is NOT asserted
 * here: the frozen low-boost dump carries no `DIRECTION` field at all, so there
 * is nothing in the fixtures to check such a mapping against, and that mapping
 * belongs where a dump is read. Asserting one from this side would be a guess
 * with a board's worth of consequences.
 */
interface Facing {
  readonly columnPerX: number
  readonly columnPerY: number
  readonly stripPerX: number
  readonly stripPerY: number
}

const FACINGS: Readonly<Record<Placement["direction"], Facing>> = {
  E: { columnPerX: 1, columnPerY: 0, stripPerX: 0, stripPerY: 1 },
  S: { columnPerX: 0, columnPerY: -1, stripPerX: 1, stripPerY: 0 },
  W: { columnPerX: -1, columnPerY: 0, stripPerX: 0, stripPerY: -1 },
  N: { columnPerX: 0, columnPerY: 1, stripPerX: -1, stripPerY: 0 },
}

/** A footprint-frame offset in grid steps, turned and placed at an origin hole. */
function holeAt(origin: Hole, facing: Facing, xSteps: number, ySteps: number): Hole {
  return {
    strip: origin.strip + facing.stripPerX * xSteps + facing.stripPerY * ySteps,
    column: origin.column + facing.columnPerX * xSteps + facing.columnPerY * ySteps,
  }
}

/**
 * Re-raises a `lib/kicad/footprint-extent.ts` refusal under this module's own
 * key, and lets anything else through untouched.
 *
 * TASK 1's `no-occupied-area` REFUSAL IS KEPT RATHER THAN REPLACED, narrowed to
 * the cases that genuinely have no body outline to read - a footprint whose
 * `.kicad_mod` carries no `F.Fab` graphic, a file that is not there, a file
 * whose `(version <n>)` no longer matches the one its pads were recorded at,
 * and an `F.Fab` form nothing has looked at. A caller that was handling this key
 * still sees it; what has changed is that a recorded, mountable footprint with a
 * body outline no longer reaches it.
 *
 * ONLY A `footprint-extent-` OR `formed-frame-` REFUSAL IS WRAPPED. A
 * `TypeError` from a bug in the derivation would otherwise come back wearing
 * this key and read as a missing record, which is the shape of mistake this
 * file's comments keep warning about. The second prefix arrived with
 * `lib/kicad/formed-frame.ts`, and it is listed rather than loosened to
 * "anything with a hyphen": the point of the test is that the message came from
 * a module that states its refusals, not that it has a key-shaped first word.
 */
const DERIVATION_REFUSALS: readonly string[] = ["footprint-extent-", "formed-frame-"]

function asGeometryRefusal(error: unknown, key: string, footprint: string, asked: string): never {
  const named =
    error instanceof Error && DERIVATION_REFUSALS.some((prefix) => error.message.startsWith(prefix))
  if (!named) throw error
  throw new Error(
    `${key}: "${footprint}" has a recorded pin pattern and is mountable on the strips, and the ` +
      `geometry it needs could not be derived from its own .kicad_mod (${asked}).\n` +
      `${error.message}\nWHY IT IS NOT DEFAULTED: ${WHERE_THE_HOLES_ARE_READ}. Deriving the ` +
      "extent from the leads is recorded in tools/stripboard/seed-geometry.ts as having been " +
      "wrong by one on C18, whose leads sit in the middle row of three.",
  )
}

/**
 * A footprint's occupied holes and its pin-to-hole map, at an origin and a
 * direction.
 *
 * **WHAT THE ORIGIN IS: the hole that the footprint's OWN (0,0) lands on.** It
 * is not "the first pad" and not a corner. For all thirteen recorded footprints
 * (0,0) happens to be pad 1's centre, which
 * `tests/kicad/footprint-extent.test.ts` asserts rather than assumes - but the
 * definition is the footprint's coordinate system, because that is the frame
 * both the pads and the `F.Fab` body outline are stated in, and a part's body
 * can and does reach to negative coordinates on either axis.
 *
 * **THE OCCUPIED HOLES ARE THE BODY'S HOLES UNIONED WITH THE PADS'.** A part
 * occupies more than its leads: `tools/stripboard/seed-geometry.ts` records the
 * fork refusing a move because `C18`'s *footprint* would occupy three rows while
 * both its leads sit in the middle one, and a lead-derived extent was wrong by
 * exactly that one row. The body half comes from `occupiedAreaFor`, which reads
 * the `F.Fab` outline out of the `.kicad_mod` the footprint's `PinPattern`
 * names; the pads' half comes from `padHolesFor`. **Neither is inferred from the
 * other**, which is the point: the three `C_Rect` footprints carry identical
 * pads at three body widths, and the frozen low-boost board places two of them
 * on three strips and one strip respectively.
 *
 * **MEASURED AGAINST THAT BOARD.** Derived, the 3.5mm-bodied `C_Rect` covers
 * three holes along its lead axis and three across it, and the 2.5mm one covers
 * three along and ONE across. `tests/fixtures/stripboard/pultec-low-boost-frozen.dump`
 * places `C18` - the 3.5mm part - as a `CAP_FILM_WIDE` at `AT 3,8 SPAN 3` with
 * its leads at rows 3 and 5, a 3x3 footprint; and `C19` - the 2.5mm part - as a
 * `CAP_FILM` at `AT 3,13 SPAN 1` with its leads at rows 3 and 5, a 3x1
 * footprint. Both agree.
 *
 * The three refusals are: a footprint with no recorded pin pattern, a pattern
 * `admitPattern` will not mount, and geometry its own file cannot supply.
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
  // THE PADS ARE RESOLVED FIRST, AND THE ORDER IS LOAD BEARING. Both halves
  // need the formed frame - `occupiedAreaFor` shifts the body into it - so a
  // formed pattern in a shape no anchor record covers would refuse in whichever
  // of the two is called first. It belongs under the PADS key: the frame is a
  // fact about where the bent leads are, and reporting it as "no occupied area"
  // would send the reader to the `.kicad_mod`'s F.Fab layer, which is present
  // and fine. The body-only refusals - no F.Fab graphic, a missing file, a
  // changed version, an unhandled form - are unaffected by this order, because
  // the three fixtures that reach them are all as-moulded.
  let pads: readonly PadHole[]
  try {
    pads = padHolesFor(pattern)
  } catch (error) {
    asGeometryRefusal(error, "stripboard-geometry-no-pad-holes", footprint, asked)
  }
  let extent: FootprintExtent
  try {
    extent = occupiedAreaFor(footprint, patterns)
  } catch (error) {
    asGeometryRefusal(error, "stripboard-geometry-no-occupied-area", footprint, asked)
  }
  const facing = FACINGS[direction]
  const byKey = new Map<string, Hole>()
  // The WHOLE rectangle, not its outline: the fork's own placement moves a
  // part's entire element grid, body cells included, so two parts whose leads
  // miss each other can still collide.
  for (let xSteps = extent.alongX.minSteps; xSteps <= extent.alongX.maxSteps; xSteps += 1) {
    for (let ySteps = extent.alongY.minSteps; ySteps <= extent.alongY.maxSteps; ySteps += 1) {
      const hole = holeAt(origin, facing, xSteps, ySteps)
      byKey.set(holeKey(hole), hole)
    }
  }
  const pins = new Map<string, Hole>()
  for (const pad of pads) {
    const hole = holeAt(origin, facing, pad.xSteps, pad.ySteps)
    byKey.set(holeKey(hole), hole)
    pins.set(pad.pad, hole)
  }
  return { holes: [...byKey.values()], pins }
}
