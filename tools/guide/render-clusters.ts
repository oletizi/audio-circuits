/**
 * The stand-in-group hatching, drawn over the component-side layout: one patch
 * of hatch per marked part, in its group's fill.
 *
 * **A PATCH IS THE GROUND A PART STANDS ON, NOT A FILL OF ITS BODY**, and that
 * one decision answers the two problems this drawing has:
 *
 * - **A part drawn as a line has no area to fill.** A stand-in that resolves to
 *   0 Ω is drawn as the wire it is and not as a resistor (`./part-shapes.ts`'s
 *   `wireLinkBody`, `docs/known-gaps.md`'s G55), and on `pultec-low-boost`
 *   three of the eight stand-ins are such parts - one of them the whole of the
 *   low-cut group. Hatching bodies would leave that group invisible, and
 *   nothing on the sheet would say so. A footprint, unlike a body, is something
 *   every part has.
 * - **A body is too small to carry four distinguishable geometries.** An axial
 *   resistor's body on these layouts is about 11 user units across. See
 *   `HATCH_PAD` in `./hatch.ts`.
 *
 * So the zero-ohm parts need no special case here: the patch for a wire link is
 * the band its wire runs down, and the wire itself is drawn on top of the
 * hatch, unchanged.
 *
 * **IT CHANGES NOTHING ELSE ABOUT THE DRAWING.** The patches are recorded in no
 * `Occupied` (`./placement.ts`), so no checkbox, label, cut number or edge
 * label moves because of them: this image is the designators image with hatch
 * added, which is what lets `tests/guide/clusters-view.test.ts` assert that it
 * adds no text inside the board outline by comparing the two.
 *
 * **IT REFUSES A PATCH THAT REACHES OVER ANOTHER PART'S BODY.** A hatch
 * spilling onto a neighbour says that neighbour is in the group, and the five
 * Pultec layouts are frozen and owner-approved - so a builder who finds the
 * picture and the board disagreeing has no reason to suspect the picture. The
 * guard is what bounds `HATCH_PAD`, rather than somebody's eye.
 */
import { hatchFor, type ClusterMarking } from "./clusters.ts"
import { HATCH_PAD, hatchFill } from "./hatch.ts"
import type { DrawnPad, PlacedPart } from "./render-parts.ts"
import { fmt, grow, type Box, type Canvas, type Frame } from "./svg.ts"

/** The clip that keeps every patch inside the board outline. */
const BOARD_CLIP = "cluster-board-clip"

function overlaps(a: Box, b: Box): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY
}

/** One part's patch: its drawn footprint, widened by `HATCH_PAD`. */
function patchBox(part: PlacedPart): Box {
  return grow(part.body.extent, HATCH_PAD)
}

/**
 * Refuse a patch that covers any of `others` - the body of a part in another
 * group or in the board's own circuit, or a landing pad's ring.
 *
 * A pad is included because a patch over one would say that off-board terminal
 * belongs to the group, which is the same misidentification as a part.
 */
function assertClearOfOthers(
  part: PlacedPart,
  group: string,
  patch: Box,
  others: readonly { readonly what: string; readonly group: string | undefined; readonly extent: Box }[],
): void {
  for (const other of others) {
    if (other.group === group) continue
    if (!overlaps(patch, other.extent)) continue
    throw new Error(
      [
        `guide-cluster-hatch-spills: the ${group} group's hatch for ${part.part.ref} reaches over ` +
          `${other.what}, which is not in that group, so the stand-in-groups image would say ` +
          `${other.what} stands in for the absent ${group} section.`,
        "The five Pultec layouts are frozen and owner-approved, so this is the picture being wrong " +
          "about the board and not the other way round.",
        "Reduce HATCH_PAD in tools/guide/hatch.ts until it clears, rather than letting the patch " +
          "claim a part the group does not hold; that constant's comment says it is this guard, not " +
          "an eye, that bounds it.",
      ].join("\n"),
    )
  }
}

/**
 * Draw every marked part's hatch patch into `canvas`, as one clipped group.
 *
 * Refuses a marked ref that is not among `placed`: the marking is built against
 * the same dump (`./clusters.ts`), so a miss here means two different boards'
 * data met, and an unhatched stand-in reads as one of this board's own parts.
 */
export function drawClusters(
  canvas: Canvas,
  frame: Frame,
  placed: readonly PlacedPart[],
  pads: readonly DrawnPad[],
  marking: ClusterMarking,
): void {
  const others = [
    ...placed.map((part) => ({
      what: part.part.ref,
      group: marking.groupOf.get(part.part.ref),
      extent: part.body.extent,
    })),
    ...pads.map((pad) => ({ what: `the pad ${pad.pad.identity}`, group: undefined, extent: pad.body.extent })),
  ]
  const patches: string[] = []
  const drawn = new Set<string>()
  for (const part of placed) {
    const group = marking.groupOf.get(part.part.ref)
    if (group === undefined) continue
    const patch = patchBox(part)
    assertClearOfOthers(part, group, patch, others)
    patches.push(
      `<rect class="cluster" data-part="${part.part.ref}" data-group="${group}" ` +
        `x="${fmt(patch.minX)}" y="${fmt(patch.minY)}" width="${fmt(patch.maxX - patch.minX)}" ` +
        `height="${fmt(patch.maxY - patch.minY)}" fill="${hatchFill(hatchFor(marking, group))}"/>`,
    )
    drawn.add(part.part.ref)
  }
  const missing = [...marking.groupOf.keys()].filter((ref) => !drawn.has(ref)).sort()
  if (missing.length > 0) {
    throw new Error(
      `the stand-in groups image was asked to hatch ${missing.join(", ")}, and this layout places no ` +
        "such part. The marking and the drawing must come from one dump (tools/guide/clusters.ts' " +
        "clusterMarking takes the same BoardDump renderLayout is given); an unhatched stand-in reads " +
        "as a part of this board's own circuit, which is the exact confusion this image removes.",
    )
  }
  canvas.add(`<g class="clusters" clip-path="url(#${BOARD_CLIP})">${patches.join("")}</g>`, frame.board)
}

/**
 * The `<defs>` the hatching needs: the pattern for each group in use, and the
 * clip that keeps a patch inside the board outline.
 *
 * Only the patterns actually used are emitted, so a drawing never carries a
 * definition nothing points at.
 */
export function clusterDefs(frame: Frame, marking: ClusterMarking): readonly string[] {
  const board = frame.board
  return [
    ...marking.groups.map((group) => hatchFor(marking, group).pattern),
    `<clipPath id="${BOARD_CLIP}"><rect x="${fmt(board.minX)}" y="${fmt(board.minY)}" ` +
      `width="${fmt(board.maxX - board.minX)}" height="${fmt(board.maxY - board.minY)}"/></clipPath>`,
  ]
}
