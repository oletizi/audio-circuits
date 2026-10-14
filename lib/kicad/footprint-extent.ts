/**
 * Which holes a footprint OCCUPIES, read out of its own `.kicad_mod` at run
 * time - the question `PinPattern` declines to answer.
 *
 * WHY IT EXISTS, MEASURED BY THE TASK THAT NEEDED IT. `lib/stripboard/board.ts`'s
 * `geometryOf` refused every footprint, because a `PinPattern` records PADS and
 * says nothing about a part's body - its own entry for
 * `Capacitor_THT:C_Rect_L7.2mm_W3.5mm_P5.00mm` says so outright, *"a body width
 * is not a pin position and does not enter this classification at all"* - and
 * the three `C_Rect` footprints there carry byte-identical pads, `(0,0)` and
 * `(5,0)`, at body widths of 2.5, 3.5 and 4.5mm. No function of the pads tells
 * those three apart, and the difference is not cosmetic: the frozen low-boost
 * board places the 3.5mm one as a three-row `CAP_FILM_WIDE` and the 2.5mm one as
 * a one-row `CAP_FILM`.
 *
 * SO IT IS A SEPARATE MODULE AND NOT A FIELD ON `PinPattern`. That type's
 * stated scope is pad classification; widening it to carry body data would
 * contradict what it says about itself. Both live in `lib/`, so
 * `lib/stripboard/` can reach either.
 *
 * NOTHING IS TRANSCRIBED HERE. Every number is derived from the file the
 * footprint's own `PinPattern` names, and the file's `(version <n>)` token is
 * checked against the one that pattern recorded - a file that changed under us
 * refuses rather than being re-read silently. This repository has shipped
 * footprint names that nobody can look up - twice, by `pin-pattern.ts`'s own
 * record, and `tests/kicad/footprint-names.test.ts` found nine more the first
 * time its sweep ran. A hand-typed extent table would be the same failure in a
 * new place, with nothing to sweep it against.
 *
 * **IT IS `F.Fab` AND NOT `F.CrtYd`, AND THAT IS MEASURED.** The courtyard is
 * the body PLUS the pads PLUS an assembly clearance, and the clearance is not
 * occupancy. Read off the three `C_Rect` files: the `F.Fab` rectangles are
 * 7.2 x 2.5, 7.2 x 3.5 and 7.2 x 4.5mm - exactly the `L` and `W` in each
 * footprint's own NAME, which is a cross-check that cannot have been written to
 * match - while the courtyards are 7.7mm by 3.0, 4.0 and 5.0mm, each 0.25mm
 * larger all round, and the silkscreen outlines sit 0.12mm out. Deriving from
 * the courtyard puts the 2.5mm-bodied part's edge at 1.5mm, past the 1.27mm
 * half-strip, so it would claim three strips - and the frozen low-boost board
 * places that part (`C19`) as a ONE-row `CAP_FILM`. The body outline agrees with
 * that board on both parts; the courtyard disagrees on one.
 *
 * **THIS IS THE FIRST THING IN `lib/` TO READ A `.kicad_mod` AT RUN TIME**, which
 * `lib/kicad/pin-pattern.ts` deliberately does not do: its pads are committed
 * data so that a test can compare them against the file. The two are not in
 * tension. A pad list is small, stable and worth having in a diff; a body
 * outline is a bounding box over a dozen graphic forms, and a committed one
 * would be exactly the hand-typed table the rule above forbids. What keeps this
 * honest is the version check and the fact that an unreadable file refuses.
 *
 * **`padHolesFor` AND `PadHole` LIVE IN `./formed-frame.ts`**, which is where
 * the forming anchor's arithmetic is. They were declared here until that file
 * existed, and they are NOT re-exported from here: two names for one function
 * is how the next reader comes to guess which is current. Both importers moved
 * in the same change. This module imports `formedFrameOf` from there, because
 * the hole spans below cannot be stated without it.
 */
import { GRID_MM } from "./grid.ts"
import { formedFrameOf } from "./formed-frame.ts"
import { PIN_PATTERNS, pinPatternFor } from "./pin-pattern.ts"
import type { PinPattern } from "./pin-pattern-model.ts"
import { parseSexpr, type SNode } from "./sexpr.ts"
import fs from "node:fs"

/** Half a grid step: how far a hole's own strip and column reach from its centre. */
const HALF_GRID_MM = GRID_MM / 2

/**
 * One part in 10^9 of a step, absorbed so that an outline edge landing EXACTLY
 * on a half-step boundary does not acquire a neighbouring hole through IEEE754
 * noise. It is not a tolerance and is not `PITCH_TOLERANCE_MM`: `2.54 / 2.54` is
 * exactly 1, but `-3.81 / 2.54` need not be exactly `-1.5`, and a hole either
 * side of a boundary is a whole strip of difference.
 */
const BOUNDARY_SLACK = 1e-9

/**
 * A bounding box in the footprint's own millimetres, origin at its own (0,0).
 *
 * **IT IS THE `F.Fab` OUTLINE'S BOX AND NOT ALWAYS JUST THE BODY'S**, which is
 * why it is not called a body box. For the three `C_Rect` footprints it is
 * exactly the moulded body, 7.2mm by the `W` in the name. For
 * `Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` the `F.Fab`
 * layer also draws the two LEADS - `fp_line` from (0,0) to (1.93,0) and from
 * (10.16,0) to (8.23,0) - so the box runs 0 to 10.16mm while the body rectangle
 * inside it runs 1.93 to 8.23, which is the `L6.3mm` the name states. Measured,
 * not assumed. For stripboard occupancy that is the wanted answer either way: a
 * drawn lead lies on the board between its hole and the body, and the holes it
 * adds are the ones the part's own leads already occupy.
 */
export interface OutlineBoxMm {
  readonly minXMm: number
  readonly maxXMm: number
  readonly minYMm: number
  readonly maxYMm: number
}

/** An inclusive run of holes, counted in grid steps from the footprint origin. */
export interface HoleSpan {
  readonly minSteps: number
  readonly maxSteps: number
}

/**
 * A footprint's body: the box its `F.Fab` outline occupies, and the holes that
 * box covers.
 *
 * THE HOLES ARE THE OUTLINE'S ALONE and do NOT include the pads'. A pad's hole is
 * a function of the pads and the recorded accommodation, which is
 * `pin-pattern-model.ts`'s subject and not this module's; `geometryOf` unions
 * the two. Keeping them apart is what makes this module answerable: it reports
 * only the thing a `PinPattern` cannot say.
 *
 * `outlineMm` IS CARRIED ALONGSIDE THE HOLE SPANS BECAUSE IT IS THE EVIDENCE, and
 * because the hole spans alone cannot tell every footprint apart: a 3.5mm and a
 * 4.5mm body both reach into the neighbouring strip and neither reaches the one
 * beyond it, so both cover three strips. That is a fact about 2.54mm strips, not
 * a weakness in the derivation, and `outlineMm` is where the two stay
 * distinguishable.
 */
export interface FootprintExtent {
  readonly footprint: string
  /** The `.kicad_mod` read, and its own `(version <n>)` token. */
  readonly file: string
  readonly version: string
  /** The box as the FILE states it, around the MOULDED lead positions. */
  readonly outlineMm: OutlineBoxMm
  /** Holes the body covers along the footprint's own x axis, in the PREPARED frame. */
  readonly alongX: HoleSpan
  /** Holes the body covers along the footprint's own y axis, in the PREPARED frame. */
  readonly alongY: HoleSpan
  /**
   * How far the body was moved along the lead row to get from `outlineMm` into
   * the frame `alongX`/`alongY` are counted in, and along which axis.
   *
   * IT IS CARRIED BECAUSE IT IS THE EVIDENCE for the two hole spans, which are
   * otherwise a derived number with nothing to check it against. Zero, with the
   * axis the row runs along, for every `as-moulded` footprint - which is all
   * ten of them - so a non-zero value here names a formed part and says which
   * bend was recorded for it. `./formed-frame.ts` derives it from the recorded
   * `FormingAnchor` and never from the box above.
   */
  readonly anchorShiftMm: number
  readonly alongRowAxis: "x" | "y" | null
  /** Every `F.Fab` graphic form the box was taken over, in file order. */
  readonly forms: readonly string[]
}

/**
 * The `F.Fab` forms this module takes a bounding box over - EXACTLY the five the
 * thirteen recorded footprints use, and nothing else.
 *
 * It is a whitelist and stays one. A general rule - "any form with coordinates"
 * - would quietly accept a form whose coordinates do not mean what this code
 * assumes, and a body outline wrong by a strip is a part that will not fit.
 * `fp_poly` is deliberately ABSENT although KiCad writes it: no recorded
 * footprint carries one on `F.Fab`, so handling it here would be untested code
 * that looks like a working derivation.
 */
const OUTLINE_FORMS: ReadonlySet<string> = new Set([
  "fp_rect",
  "fp_line",
  "fp_circle",
  "fp_arc",
  "point",
])

/**
 * Forms that sit on `F.Fab` and are TEXT rather than body, skipped by name.
 *
 * A MEASUREMENT, NOT A RULE: every one of the thirteen recorded footprints puts
 * its `Value` property and a `${REFERENCE}` text form on `F.Fab`, and a
 * reference designator is not part geometry. They are named rather than filtered
 * by some property of theirs, so that a form nobody has looked at still reaches
 * the refusal below.
 */
const TEXT_FORMS: ReadonlySet<string> = new Set(["property", "fp_text", "fp_text_box"])

const numbers = (node: SNode | undefined): readonly number[] =>
  node === undefined ? [] : node.atoms.map(Number)

function point(node: SNode | undefined, form: string, file: string): readonly [number, number] {
  const values = numbers(node)
  const x = values[0]
  const y = values[1]
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(
      `footprint-extent-unreadable-coordinate: ${file} has an ${form} form on F.Fab whose ` +
        `${node?.name ?? "missing"} coordinate does not read as two finite numbers ` +
        `(${JSON.stringify(node?.atoms ?? [])}).\nThis is not skipped: a dropped graphic is how ` +
        "a body outline comes out smaller than the part and the board comes out unbuildable.",
    )
  }
  return [x, y]
}

const child = (node: SNode, name: string): SNode | undefined =>
  node.nodes.find((candidate) => candidate.name === name)

const TWO_PI = 2 * Math.PI

const normalised = (angle: number): number => ((angle % TWO_PI) + TWO_PI) % TWO_PI

/**
 * The points an arc's bounding box is taken over: its three stated points, plus
 * whichever of the circle's four axis extremes the arc actually passes through.
 *
 * KiCad states an arc as start, mid and end, so the circle is the one through
 * those three points. The box over the three points alone UNDERSTATES a bulging
 * arc, which is the silent-undercount failure this file refuses elsewhere, so
 * the extremes are included when - and only when - they lie on the arc.
 *
 * THREE COLLINEAR POINTS ARE A STRAIGHT LINE, not a degenerate circle: the
 * perpendicular bisectors never meet, and the extremes of a segment are its
 * ends. That case returns the three points, which is correct rather than
 * defaulted.
 */
function arcPoints(
  start: readonly [number, number],
  mid: readonly [number, number],
  end: readonly [number, number],
): readonly (readonly [number, number])[] {
  const [x1, y1] = start
  const [x2, y2] = mid
  const [x3, y3] = end
  const twiceArea = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
  if (Math.abs(twiceArea) < 1e-12) return [start, mid, end]
  const s1 = x1 * x1 + y1 * y1
  const s2 = x2 * x2 + y2 * y2
  const s3 = x3 * x3 + y3 * y3
  const cx = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / twiceArea
  const cy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / twiceArea
  const radius = Math.hypot(x1 - cx, y1 - cy)
  const from = Math.atan2(y1 - cy, x1 - cx)
  const sweepToEnd = normalised(Math.atan2(y3 - cy, x3 - cx) - from)
  const sweepToMid = normalised(Math.atan2(y2 - cy, x2 - cx) - from)
  // The arc runs the way that passes through the stated mid point.
  const counterClockwise = sweepToMid <= sweepToEnd
  const sweep = counterClockwise ? sweepToEnd : TWO_PI - sweepToEnd
  const found: (readonly [number, number])[] = [start, mid, end]
  for (const quarter of [0, 1, 2, 3]) {
    const angle = (quarter * Math.PI) / 2
    const reached = counterClockwise ? normalised(angle - from) : normalised(from - angle)
    if (reached > sweep) continue
    found.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return found
}

/** Every point one `F.Fab` form contributes to the body's bounding box. */
function formPoints(node: SNode, file: string): readonly (readonly [number, number])[] {
  if (node.name === "fp_rect" || node.name === "fp_line") {
    return [
      point(child(node, "start"), node.name, file),
      point(child(node, "end"), node.name, file),
    ]
  }
  if (node.name === "fp_circle") {
    // KiCad states a circle as its centre and ONE POINT ON IT, which the form
    // calls `end`. The radius is the distance between them.
    const [cx, cy] = point(child(node, "center"), node.name, file)
    const [ex, ey] = point(child(node, "end"), node.name, file)
    const radius = Math.hypot(ex - cx, ey - cy)
    return [
      [cx - radius, cy - radius],
      [cx + radius, cy + radius],
    ]
  }
  if (node.name === "fp_arc") {
    return arcPoints(
      point(child(node, "start"), node.name, file),
      point(child(node, "mid"), node.name, file),
      point(child(node, "end"), node.name, file),
    )
  }
  // A `point` form is a fabrication marker - the pin-1 dimple a DIP carries at
  // its own centre. Its `at` is taken and its `size` is not: a marker's size is
  // how large the dot is drawn, and a dot drawn inside a body does not make the
  // body larger. Measured on Package_DIP:DIP-16_W7.62mm, whose marker sits at
  // (3.81, 8.89) inside a body spanning 0.635..6.985 by -1.27..19.05.
  return [point(child(node, "at"), node.name, file)]
}

/** The smallest hole index whose own strip or column an outline edge at `lo` reaches into. */
function firstHole(lo: number): number {
  return Math.floor((lo - HALF_GRID_MM) / GRID_MM + BOUNDARY_SLACK) + 1
}

/** The largest such hole index, for the far edge at `hi`. */
function lastHole(hi: number): number {
  return Math.ceil((hi + HALF_GRID_MM) / GRID_MM - BOUNDARY_SLACK) - 1
}

/**
 * The holes a body edge-to-edge span covers.
 *
 * THE RULE, STATED SO IT CAN BE DISAGREED WITH: hole `k` sits at `k` grid steps
 * and owns the strip or column from `k*2.54 - 1.27` to `k*2.54 + 1.27`, and the
 * body covers that hole when it OVERLAPS that interval - touching it exactly at
 * the boundary does not count. A 2.5mm body reaches 1.25mm, inside its own
 * strip, and covers one; a 3.5mm body reaches 1.75mm, past the 1.27mm boundary,
 * and covers three. Those two answers are what the frozen low-boost board
 * records for `C19` and `C18`.
 */
function holeSpan(lo: number, hi: number): HoleSpan {
  return { minSteps: firstHole(lo), maxSteps: lastHole(hi) }
}

/** Keyed by file AND version, so a re-read after a library change is not served a stale box. */
const DERIVED = new Map<string, FootprintExtent>()

function readFile(pattern: PinPattern): string {
  if (!fs.existsSync(pattern.source.file)) {
    throw new Error(
      `footprint-extent-missing-file: "${pattern.footprint}" records its pads as read from ` +
        `${pattern.source.file}, and that file is not there, so the holes its body covers ` +
        "cannot be derived.\nThis is not defaulted to a plausible box: a body outline wrong by " +
        "one strip is a part that does not fit, and three checks read the result - overlap " +
        "detection in lib/stripboard/board.ts, the stock-fit measurement and the buildability " +
        "check.\nInstall the KiCad footprint libraries, or correct the path in " +
        "lib/kicad/pin-pattern.ts, which is the one place it is written down.",
    )
  }
  return fs.readFileSync(pattern.source.file, "utf8")
}

interface DerivedOutline {
  readonly box: OutlineBoxMm
  readonly forms: readonly string[]
}

function outlineBox(root: SNode, pattern: PinPattern): DerivedOutline {
  const file = pattern.source.file
  const xs: number[] = []
  const ys: number[] = []
  const forms: string[] = []
  for (const node of root.nodes) {
    if (child(node, "layer")?.atoms[0] !== "F.Fab") continue
    if (TEXT_FORMS.has(node.name)) continue
    if (!OUTLINE_FORMS.has(node.name)) {
      throw new Error(
        `footprint-extent-unknown-body-shape: "${pattern.footprint}" has a (${node.name} ...) ` +
          `form on F.Fab in ${file}, and this module takes a bounding box over exactly ` +
          `${[...OUTLINE_FORMS].join(", ")} - the five forms the thirteen recorded footprints ` +
          "use.\nIt is not ignored and it is not guessed at: a form skipped silently makes the " +
          "body outline smaller than the part, and a form read on an assumption about what its " +
          "coordinates mean makes it wrong in a way nothing would notice.\nTo fix it, add the " +
          "form to OUTLINE_FORMS and formPoints in lib/kicad/footprint-extent.ts with a test " +
          "over a footprint that carries one, or to TEXT_FORMS if it is text rather than body.",
      )
    }
    forms.push(node.name)
    for (const [x, y] of formPoints(node, file)) {
      xs.push(x)
      ys.push(y)
    }
  }
  if (xs.length === 0 || ys.length === 0) {
    throw new Error(
      `footprint-extent-no-body-outline: "${pattern.footprint}" has no F.Fab graphic at all in ` +
        `${file}, so nothing in that file states where the part's body is and the holes it ` +
        "covers cannot be derived.\nWHY IT IS NOT DEFAULTED: the pads are already known and " +
        "they are not the answer - the three C_Rect footprints in lib/kicad/pin-pattern.ts " +
        "carry identical pads at three body widths, which is the whole reason this module " +
        "exists. A box over the pads alone would silently claim the 3.5mm-bodied part fits one " +
        "strip, and the frozen low-boost board puts it on three.\nTO FIX IT: give the footprint " +
        "an F.Fab body outline, or place the part from a footprint that has one. All 15,447 " +
        "footprints in the installed KiCad libraries carry F.Fab - measured on 2026-10-14 - so " +
        "a file reaching this refusal is hand-made.",
    )
  }
  return {
    box: {
      minXMm: Math.min(...xs),
      maxXMm: Math.max(...xs),
      minYMm: Math.min(...ys),
      maxYMm: Math.max(...ys),
    },
    forms,
  }
}

/**
 * The holes a footprint's body covers, derived from the `.kicad_mod` its
 * recorded `PinPattern` names.
 *
 * `patterns` is injectable for the reason `pinPatternFor`'s is: a test must be
 * able to hand in a footprint this repository does not place without adding one
 * to the recorded map.
 */
export function occupiedAreaFor(
  footprint: string,
  patterns: ReadonlyMap<string, PinPattern> = PIN_PATTERNS,
): FootprintExtent {
  // Refuses by name when the footprint has no recorded pattern: without one
  // there is no file to read, and inventing a path is the opposite of the
  // provenance this module runs on.
  const pattern = pinPatternFor(footprint, patterns)
  // Refuses by name for a formed pattern in a shape no anchor record covers,
  // BEFORE the file is read: a box derived and then discarded would put the
  // refusal behind an I/O error on a library that is not installed.
  const frame = formedFrameOf(pattern)
  // KEYED ON THE FRAME AS WELL AS THE FILE. Two patterns may name one file and
  // record different anchors - the fixtures in tests/kicad do exactly that -
  // and a key on the file alone would serve the first one's spans to the second.
  const cacheKey =
    `${pattern.source.file}|${pattern.source.version}|${frame.axis ?? "none"}|${frame.shiftMm}`
  const cached = DERIVED.get(cacheKey)
  if (cached !== undefined) return cached
  const text = readFile(pattern)
  const root = parseSexpr(text)
  const version = child(root, "version")?.atoms[0]
  if (version !== pattern.source.version) {
    throw new Error(
      `footprint-extent-version-changed: "${pattern.footprint}" was recorded from ` +
        `${pattern.source.file} at (version ${pattern.source.version}), and that file now ` +
        `carries (version ${version ?? "none"}).\nThis is a refusal and not a silent re-read: ` +
        "the recorded pads, the recorded accommodation and its datasheet basis were all taken " +
        "from the earlier file, so a body outline from the later one would be a box that does " +
        "not belong to the pads beside it.\nTo fix it, re-read the footprint and update its " +
        "entry in lib/kicad/pin-pattern.ts - pads, padCount and version together - so the " +
        "test that opens the file passes again.",
    )
  }
  const { box, forms } = outlineBox(root, pattern)
  // The shift moves the body along the lead row and NEVER across the strips: a
  // formed lead travels along its own strip, which is the asymmetry
  // classifyPads is built on. So exactly one of the two spans is shifted.
  const shiftX = frame.axis === "x" ? frame.shiftMm : 0
  const shiftY = frame.axis === "y" ? frame.shiftMm : 0
  const extent: FootprintExtent = {
    footprint: pattern.footprint,
    file: pattern.source.file,
    version,
    outlineMm: box,
    alongX: holeSpan(box.minXMm + shiftX, box.maxXMm + shiftX),
    alongY: holeSpan(box.minYMm + shiftY, box.maxYMm + shiftY),
    anchorShiftMm: frame.shiftMm,
    alongRowAxis: frame.axis,
    forms,
  }
  DERIVED.set(cacheKey, extent)
  return extent
}

