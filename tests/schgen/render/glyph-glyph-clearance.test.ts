/**
 * Ported from digital-pedal-platform's `tools/schgen/render/glyphGlyphClearance.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, res, symbols, VSSA } from "../__fixtures__/circuits.ts";
import type { BlockLayout } from "../../../lib/schgen/render/block-types.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { GRID, type Point } from "../../../lib/schgen/render/geometry.ts";
import { glyphGlyphProblems } from "../../../lib/schgen/render/glyph-clearance.ts";
import { assertSheetSafe, type SheetScene } from "../../../lib/schgen/render/sheet-check.ts";
import type { PowerSymbol } from "../../../lib/schgen/render/sheet-types.ts";

/**
 * A GND glyph spans 1.27 mm either side of its pin, so two on pins one 2.54 mm pitch apart meet
 * at their corners: the shape of GND and VSSA under U_MCU on the H7 core sheet. Nothing else saw
 * it: neither glyph is a body, and the text checks treat glyphs only as obstacles for text.
 */
const gnd = (net: string, at: Point, flag = false): PowerSymbol => ({
  net, libId: flag ? "Pwr:PWR_FLAG" : "Pwr:GND", at, rot: 0, flag, valueAlong: false,
});
const O: Point = { x: 0, y: 0 };
const PITCH_RIGHT: Point = { x: 2 * GRID, y: 0 };

describe("glyphGlyphProblems", () => {
  it("refuses glyphs of different nets that meet, naming both", () => {
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("VSSA", PITCH_RIGHT)] })).toEqual([
      "the glyph of power symbol GND 0 at (0, 0) touches the glyph of power symbol VSSA 1 at (2.54, 0), which is on another net",
    ]);
  });

  it("accepts glyphs of different nets a grid step apart", () => {
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("VSSA", { x: 3 * GRID, y: 0 })] })).toEqual([]);
  });

  it("accepts glyphs of one net that meet one pitch apart, and refuses them overlapping", () => {
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("GND", PITCH_RIGHT)] })).toEqual([]);
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("GND", { x: GRID, y: 0 })] })).toEqual([
      "the glyph of power symbol GND 0 at (0, 0) overlaps the glyph of power symbol GND 1 at (1.27, 0)",
    ]);
  });

  it("accepts a PWR_FLAG on its rail's symbol at one point, but not on another net's", () => {
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("GND", O, true)] })).toEqual([]);
    expect(glyphGlyphProblems({ symbols, powers: [gnd("GND", O), gnd("VSSA", O, true)] })).toEqual([
      "the glyph of power symbol GND 0 at (0, 0) touches the glyph of PWR_FLAG VSSA 1 at (0, 0), which is on another net",
    ]);
  });
});

/** R1 (3V3 to GND) and R2 (3V3 to VSSA) in one block, VSSA drawn with the GND glyph as on the H7. */
const c = blockCircuit(
  [res("R1", "3V3", "GND"), res("R2", "3V3", "VSSA")],
  { kind: "wired", template: "decoupling-bank", anchor: null },
  { external: [], moreRails: [VSSA] },
);
const g = subgraphOf(c, "B", symbols);

/** R1 and R2 upright `dx` apart, each with its power symbols on its own pin ends. */
function pair(dx: number): BlockLayout {
  return {
    placements: [0, dx].map((x, i) => ({ part: `R${i + 1}`, unit: 1, at: { x, y: 0 }, rot: 0 as const })),
    wires: [],
    anchors: [
      { net: "3V3", at: { x: 0, y: -3 * GRID }, side: "up" },
      { net: "GND", at: { x: 0, y: 3 * GRID }, side: "down" },
      { net: "3V3", at: { x: dx, y: -3 * GRID }, side: "up" },
      { net: "VSSA", at: { x: dx, y: 3 * GRID }, side: "down" },
    ],
  };
}

const glyphLines = (lines: readonly string[]): string[] => lines.filter((l) => / (touches|overlaps) the glyph /.test(l));

describe("checkLayout: no two power glyphs of a block meet across nets", () => {
  it("refuses GND and VSSA symbols on neighbouring pins one pitch apart", () => {
    expect(glyphLines(checkLayout(g, pair(2 * GRID)).map((f) => f.what))).toEqual([
      "the glyph of power symbol GND 1 at (0, 3.81) touches the glyph of power symbol VSSA 3 at (2.54, 3.81), which is on another net",
    ]);
  });

  it("accepts them three grid steps apart", () => expect(glyphLines(checkLayout(g, pair(3 * GRID)).map((f) => f.what))).toEqual([]));
});

describe("assertSheetSafe: no two power glyphs on a sheet meet across nets", () => {
  const scene = (powers: readonly PowerSymbol[]): SheetScene => ({ sheet: "s", symbols, blocks: [], powers, labels: [] });

  it("refuses glyphs of different blocks that meet", () => {
    expect(() => assertSheetSafe(scene([gnd("GND", O), gnd("VSSA", PITCH_RIGHT)]))).toThrow(
      /^sheet s: body clearance:\n {2}- the glyph of power symbol GND 0 at \(0, 0\) touches the glyph of power symbol VSSA 1 at \(2\.54, 0\), which is on another net$/,
    );
  });

  it("accepts a PWR_FLAG on its rail's symbol", () => {
    expect(() => assertSheetSafe(scene([gnd("GND", O), gnd("GND", O, true)]))).not.toThrow();
  });
});
