/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pack.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { GRID } from "../../../lib/schgen/render/geometry.ts";
import { GAP, MARGIN, packFrames, TITLE_BLOCK } from "../../../lib/schgen/render/pack.ts";

const PAPER = { w: 100 * GRID, h: 100 * GRID };

describe("packFrames", () => {
  it("places frames left to right from the top-left margin, a gap apart", () => {
    const r = packFrames([{ w: 20 * GRID, h: 10 * GRID }, { w: 30 * GRID, h: 6 * GRID }], PAPER);
    expect(r).toEqual({ ok: true, at: [{ x: MARGIN, y: MARGIN }, { x: MARGIN + 20 * GRID + GAP, y: MARGIN }] });
  });

  it("starts a new shelf below the tallest frame of the last one when the width runs out", () => {
    const r = packFrames([{ w: 40 * GRID, h: 10 * GRID }, { w: 30 * GRID, h: 6 * GRID }, { w: 20 * GRID, h: 4 * GRID }], PAPER);
    expect(r).toEqual({ ok: true, at: [{ x: MARGIN, y: MARGIN }, { x: MARGIN + 40 * GRID + GAP, y: MARGIN }, { x: MARGIN, y: MARGIN + 10 * GRID + GAP }] });
  });

  it("keeps the title block area free and reports the size it would need", () => {
    const usable = PAPER.h - 2 * MARGIN - TITLE_BLOCK;
    expect(packFrames([{ w: 10 * GRID, h: usable }], PAPER).ok).toBe(true);
    const r = packFrames([{ w: 10 * GRID, h: usable + GRID }], PAPER);
    expect(r).toEqual({ ok: false, needed: { w: PAPER.w, h: PAPER.h + GRID } });
  });

  it("reports a frame wider than the paper", () => {
    const r = packFrames([{ w: 90 * GRID, h: 10 * GRID }], PAPER);
    expect(r).toEqual({ ok: false, needed: { w: 90 * GRID + 2 * MARGIN, h: PAPER.h } });
  });

  it("refuses an off-grid frame size", () => {
    expect(() => packFrames([{ w: 1000, h: GRID }], PAPER)).toThrow(/frame 0 size 1 × 1.27 mm is not a whole number of grid steps/);
  });
});
