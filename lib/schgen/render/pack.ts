/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pack.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Shelf packing of frames on a sheet: left to right inside the margins, a new shelf when a frame
 * does not fit the remaining width, the bottom strip kept free for KiCad's title block. The packer
 * never picks a larger paper; it reports the size it would have needed.
 */
import { fmtMm, GRID, type Point, type Um } from "./geometry.ts";

export const MARGIN: Um = 12_700;
export const TITLE_BLOCK: Um = 38_100;
export const GAP: Um = 2 * GRID;

export interface Size {
  readonly w: Um;
  readonly h: Um;
}

export type PackResult = { readonly ok: true; readonly at: readonly Point[] } | { readonly ok: false; readonly needed: Size };

export function packFrames(sizes: readonly Size[], paper: Size): PackResult {
  sizes.forEach((s, i) => {
    if (s.w % GRID !== 0 || s.h % GRID !== 0) {
      throw new Error(`packFrames: frame ${i} size ${fmtMm(s.w)} × ${fmtMm(s.h)} mm is not a whole number of grid steps`);
    }
  });
  const right = paper.w - MARGIN;
  const bottom = paper.h - MARGIN - TITLE_BLOCK;
  const at: Point[] = [];
  let x = MARGIN;
  let y = MARGIN;
  let shelf = 0;
  let maxRight = 0;
  let maxBottom = 0;
  for (const s of sizes) {
    if (x > MARGIN && x + s.w > right) {
      y += shelf + GAP;
      x = MARGIN;
      shelf = 0;
    }
    at.push({ x, y });
    maxRight = Math.max(maxRight, x + s.w);
    maxBottom = Math.max(maxBottom, y + s.h);
    x += s.w + GAP;
    shelf = Math.max(shelf, s.h);
  }
  if (maxRight <= right && maxBottom <= bottom) return { ok: true, at };
  return {
    ok: false,
    needed: { w: Math.max(paper.w, maxRight + MARGIN), h: Math.max(paper.h, maxBottom + MARGIN + TITLE_BLOCK) },
  };
}
