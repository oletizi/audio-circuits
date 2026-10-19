/**
 * THE HATCH FILLS THE STAND-IN-GROUPS IMAGE USES - **RATIFIED BY THE OWNER,
 * 2026-10-18, AND RATIFIED WITH A KNOWN WEAKNESS HE WAS TOLD ABOUT FIRST.**
 *
 * He was asked to approve a hatch styling before it existed and rightly
 * declined to: *"hatching - I don't know until i see it"*. So the fills were
 * built as a candidate, rendered, and put in front of him; he read page 5 of
 * `boards/pultec-low-boost/guide/guide.pdf` and ruled, verbatim: **_"the
 * hatching looks good."_** `CLAUDE.md`'s invariant is that an agent may never
 * author the acceptance criteria for the artifact it produces, and the fills
 * are the one purely visual decision in this image, so they were his to settle
 * and are now settled.
 *
 * **THE DISCLOSURE TRAVELS WITH THE RULING, because the ruling is not legible
 * without it.** Before he ruled he was told plainly, and in these terms, that
 * the two diagonals **do not separate at a glance at printed size**: `/` is the
 * first group's fill and `\` the second's - hi-boost and hi-cut on both low
 * boards - and both read as striped grey from arm's length, so which way the
 * lines lean is legible on a deliberate look and not before. **The worst case
 * is a part standing on end**, whose white body covers the middle of its patch
 * and leaves only a margin of hatch showing, and that margin carries two or
 * three lines. He was also told that the lattice and the stipple had to be
 * COARSENED to the spacings below after a first attempt at which both read as
 * one uniform fine grey and the two adjacent groups merged into a single
 * textured area. **He accepted the fills with all of that known.**
 *
 * **SO A CHANGE TO THESE GEOMETRIES NEEDS A FRESH RULING FROM HIM, NOT AN
 * AGENT'S JUDGEMENT.** The weak diagonal pair is a measured property of a
 * ratified artifact, not an open defect, and the reason to say so here is the
 * specific failure it prevents: a later reader notices the pair, assumes nobody
 * checked at printed size, and either re-opens a settled question with him or -
 * worse - quietly "fixes" it, overturning a decision that was made with the
 * evidence in hand. `docs/known-gaps.md`'s G59 carries the whole printed-scale
 * measurement, including what survives a photocopy and what nothing guards.
 *
 * **THIS FILE REMAINS THE ONE PLACE TO EDIT IF HE RULES AGAIN.** Everything
 * else about the image - which part belongs to which group, the legend, the
 * checks that the two agree - is independent of what these patterns look like:
 * `tools/guide/clusters.ts` assigns `HATCH_STYLES[i]` to the i-th group and
 * `tests/guide/clusters-view.test.ts` asserts the assignment is a bijection
 * onto whatever this array holds, never what any entry draws. Replace the
 * entries, reorder them, or change their spacings and widths, and the mapping
 * and its tests still hold - which is also why no test had to change when he
 * ratified them, and why none would have to change if he rejected them later.
 *
 * **WHY HATCHING RATHER THAN GREY TINTS OR COLOUR - a reason rather than a
 * taste, and settled before and independently of his ruling.** The packet is
 * printed on a black-and-white laser printer and photocopied at the bench
 * (`./svg.ts`: "the only colours anywhere are black ink, white paper and one
 * light grey"). Four grey tints stop being distinguishable after one generation
 * of photocopying, and colour is not available at all; four distinct hatch
 * GEOMETRIES survive both, because what tells them apart is direction and shape
 * rather than density.
 *
 * **WHY THERE IS NO PER-PART TEXT TO GO WITH THEM.** A group is named in the
 * legend and nowhere inside the board outline: `docs/known-gaps.md`'s G2
 * records that pad labels already crowd the row they sit in and G17 that a long
 * part label runs off the board outline, and a third per-part string feeds
 * both.
 */
import { INK, PITCH, fmt, type Point } from "./svg.ts"

/** One hatch: the SVG pattern that fills with it, and the id a fill points at. */
export interface HatchStyle {
  readonly id: string
  /** The `<pattern>` element, emitted into the drawing's `<defs>` when it is used. */
  readonly pattern: string
}

/**
 * A tile holding one line down its middle, rotated: parallel lines `spacing`
 * apart at `degrees`.
 *
 * The line sits at `spacing / 2` rather than at 0 so the whole stroke falls
 * inside the tile - a line on the tile's edge is clipped to half its width and
 * prints at half the weight asked for.
 */
function ruled(id: string, spacing: number, degrees: number, width: number): HatchStyle {
  const mid = fmt(spacing / 2)
  return {
    id,
    pattern:
      `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${fmt(spacing)}" height="${fmt(spacing)}" ` +
      `patternTransform="rotate(${fmt(degrees)})">` +
      `<line x1="${mid}" y1="0" x2="${mid}" y2="${fmt(spacing)}" stroke="${INK}" stroke-width="${fmt(width)}"/>` +
      "</pattern>",
  }
}

/** A tile crossed both ways: a lattice at `spacing`, rotated to stand on its corner. */
function crossed(id: string, spacing: number, degrees: number, width: number): HatchStyle {
  const mid = fmt(spacing / 2)
  const full = fmt(spacing)
  return {
    id,
    pattern:
      `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${full}" height="${full}" ` +
      `patternTransform="rotate(${fmt(degrees)})">` +
      `<line x1="${mid}" y1="0" x2="${mid}" y2="${full}" stroke="${INK}" stroke-width="${fmt(width)}"/>` +
      `<line x1="0" y1="${mid}" x2="${full}" y2="${mid}" stroke="${INK}" stroke-width="${fmt(width)}"/>` +
      "</pattern>",
  }
}

/** A tile holding one dot: a stipple at `spacing`. */
function stippled(id: string, spacing: number, radius: number): HatchStyle {
  const mid = fmt(spacing / 2)
  return {
    id,
    pattern:
      `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${fmt(spacing)}" height="${fmt(spacing)}">` +
      `<circle cx="${mid}" cy="${mid}" r="${fmt(radius)}" fill="${INK}"/>` +
      "</pattern>",
  }
}

/**
 * THE RATIFIED FOUR, in the order groups take it (the owner, 2026-10-18: *"the
 * hatching looks good."* - read the module comment above for what he was told
 * before he said it). Four geometries that differ in KIND rather than in
 * density - two opposite slopes, a lattice, a stipple - so that telling them
 * apart does not depend on how heavily the sheet printed.
 *
 * The spacings and widths are part of what he ratified, not free parameters:
 * the lattice at 9 and the stipple at 8 are the COARSENED values, after 7 and 6
 * merged into one grey at printed size, and the diagonals were taken to 6 units
 * at 1.3 wide so that their lean reads at all. Changing a number here is
 * changing the artifact he approved.
 *
 * There are four because the five-section Pultec ladder puts four absent
 * sections on every board. A fifth group refuses in `./clusters.ts` rather than
 * reusing a hatch, and the remedy is to add a fifth entry HERE.
 */
export const HATCH_STYLES: readonly HatchStyle[] = [
  ruled("cluster-hatch-a", 6, 45, 1.3),
  ruled("cluster-hatch-b", 6, -45, 1.3),
  crossed("cluster-hatch-c", 9, 45, 1.2),
  stippled("cluster-hatch-d", 8, 1.8),
]

/** What a `fill` attribute says to use one of these. */
export function hatchFill(hatch: HatchStyle): string {
  return `url(#${hatch.id})`
}

/**
 * How far a part's hatch patch reaches beyond the part's own extent.
 *
 * **IT IS NOT ZERO, AND THAT IS WHAT MAKES THE IMAGE READABLE ON PAPER.** An
 * axial resistor's body on these boards is about 11 user units across - a tenth
 * of an inch once the sheet is printed - and no four geometries are
 * distinguishable inside that. The patch is the ground the part stands on
 * rather than a fill of its body, which is also why a part drawn as a line (a
 * stand-in that resolves to 0 Ω - `./wire-links.ts`) needs no special case: a
 * line has no area to fill, but it has a footprint to stand on.
 *
 * **IT IS BOUNDED BY A GUARD, NOT BY TASTE.** `./render-clusters.ts` refuses a
 * patch that reaches over another part's body, because a hatch spilling onto a
 * neighbour says that neighbour is in the group - and the five layouts are
 * frozen and owner-approved, so a builder who sees the picture disagree with
 * the board has no reason to suspect the picture. Widen this and that guard is
 * what tells you it is too wide.
 */
export const HATCH_PAD = PITCH * 0.55

const SWATCH_WIDTH = 18
const SWATCH_HEIGHT = 11

/** The legend's sample of one hatch, centred on `at`, carrying the group it stands for. */
export function hatchSwatch(at: Point, hatch: HatchStyle, group: string): string {
  return (
    `<rect class="cluster-swatch" data-group="${group}" x="${fmt(at.x - SWATCH_WIDTH / 2)}" ` +
    `y="${fmt(at.y - SWATCH_HEIGHT / 2)}" width="${fmt(SWATCH_WIDTH)}" height="${fmt(SWATCH_HEIGHT)}" ` +
    `fill="${hatchFill(hatch)}" stroke="${INK}" stroke-width="0.6"/>`
  )
}

/** An unhatched legend sample, the same size: the key to a part with no hatch at all. */
export function plainSwatch(at: Point): string {
  return (
    `<rect class="cluster-swatch-plain" x="${fmt(at.x - SWATCH_WIDTH / 2)}" ` +
    `y="${fmt(at.y - SWATCH_HEIGHT / 2)}" width="${fmt(SWATCH_WIDTH)}" height="${fmt(SWATCH_HEIGHT)}" ` +
    `fill="none" stroke="${INK}" stroke-width="0.6"/>`
  )
}
