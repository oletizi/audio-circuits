/**
 * Ported from digital-pedal-platform's `tools/schgen/render/glyphClearance.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../__fixtures__/circuits.ts";
import type { Anchor, BlockLayout, BlockSubgraph } from "../../../lib/schgen/render/block-types.ts";
import { checkLayout, placedPins, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { GRID, type Point, type Side } from "../../../lib/schgen/render/geometry.ts";
import { bodyGlyphProblems } from "../../../lib/schgen/render/glyph-clearance.ts";
import { assertSheetSafe, type SheetScene } from "../../../lib/schgen/render/sheet-check.ts";

const DEC = { kind: "wired" as const, template: "decoupling-bank" as const, anchor: null };

/**
 * R1 stands vertically at the origin with a 3V3 symbol on pin 1; pin 2 (3.81 mm below the origin)
 * runs down a wire to a GND symbol at 6.35 mm, whose glyph hangs to 8.89 mm, 1.27 mm either side.
 * C1 stands beside it: the shape that slipped through on the H7 power sheet (C_NR over the
 * neighbouring pin's GND symbol). At OVER its lower plate (y 8.382 mm, x 0.508 to 4.572 mm) crosses
 * that glyph, yet its pin-tip box only abuts R1's, no anchor lies inside a body or on a pin line, no
 * wire crosses a body and every text is clear: no earlier check sees it.
 */
const c = blockCircuit([res("R1", "3V3", "GND"), cap("C1", "3V3", "GND")], DEC, { external: [] });
const g = subgraphOf(c, "B", symbols);

const OVER: Point = { x: 2 * GRID, y: 6 * GRID };
const CLEAR: Point = { x: 10 * GRID, y: 6 * GRID };

const sideOf = (pin: Point, centre: Point): Side => {
  if (pin.x < centre.x) return "left";
  if (pin.x > centre.x) return "right";
  return pin.y < centre.y ? "up" : "down";
};

/**
 * C1 at `at`, upright, with its own power symbols: GND on its lower pin end, 3V3 two grid steps
 * right of its upper pin end along a wire (so that symbol's value clears R1).
 */
function capPart(sub: BlockSubgraph, at: Point): BlockLayout {
  const placements = [{ part: "C1", unit: 1, at, rot: 0 as const }];
  const pins = placedPins(sub, placements);
  const top = pins.find((p) => sideOf(p.at, at) === "up");
  const bottom = pins.find((p) => sideOf(p.at, at) === "down");
  if (top?.net == null || bottom?.net == null) throw new Error("fixture: C1 must stand upright with both pins connected");
  const feed = { x: top.at.x + 2 * GRID, y: top.at.y };
  return {
    placements,
    wires: [{ a: top.at, b: feed, net: top.net }],
    anchors: [
      { net: top.net, at: feed, side: "up" },
      { net: bottom.net, at: bottom.at, side: "down" },
    ],
  };
}

function r1Part(net: string): BlockLayout {
  return {
    placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }],
    wires: [{ a: { x: 0, y: 3 * GRID }, b: { x: 0, y: 5 * GRID }, net }],
    anchors: [
      { net: "3V3", at: { x: 0, y: -3 * GRID }, side: "up" },
      { net, at: { x: 0, y: 5 * GRID }, side: "down" },
    ],
  };
}

function layout(capAt: Point, r1: BlockLayout, sub: BlockSubgraph): BlockLayout {
  const cl = capPart(sub, capAt);
  return { placements: [...r1.placements, ...cl.placements], wires: [...r1.wires, ...cl.wires], anchors: [...r1.anchors, ...cl.anchors] };
}

describe("checkLayout: a part body never covers another connection's power glyph or label", () => {
  it("accepts the same parts set apart, each with power symbols on its own pins", () => {
    expect(checkLayout(g, layout(CLEAR, r1Part("GND"), g))).toEqual([]);
  });

  it("refuses a capacitor body drawn over a neighbouring pin's GND symbol, and nothing else", () => {
    expect(checkLayout(g, layout(OVER, r1Part("GND"), g)).map((f) => f.what)).toEqual(["body of C1#1 overlaps the glyph of power symbol GND 1 at (0, 6.35)"]);
  });

  it("refuses a body over a global label's outline", () => {
    const tapC = blockCircuit([res("R1", "3V3", "TAP"), cap("C1", "3V3", "GND")], DEC, { external: ["TAP"] });
    const tapG = subgraphOf(tapC, "B", symbols);
    expect(checkLayout(tapG, layout(OVER, r1Part("TAP"), tapG)).map((f) => f.what)).toContain("body of C1#1 overlaps label TAP at (0, 6.35)");
  });
});

describe("bodyGlyphProblems: a rotated unit's body is the rotated library box", () => {
  /**
   * The fixture C's body is one plate, a line in library coordinates from (−2.032, −0.762) to
   * (2.032, −0.762) mm: off-centre, so 90° and 270° put it on opposite sides of the anchor. Turned
   * 90° it is the vertical line x = at.x + 0.762 mm, turned 270° x = at.x − 0.762 mm, each spanning
   * at.y ± 2.032 mm. Upright at these anchors it lies at y = at.y + 0.762 = 5.842 mm, above R1's GND
   * glyph (x −1.27…1.27, y 6.35…8.89 mm). So the unrotated box, a box swapped the wrong way, or 90°
   * and 270° exchanged each give a wrong verdict in at least one case below.
   */
  const r1 = r1Part("GND");
  const gnd = { net: "GND", libId: "Pwr:GND", at: { x: 0, y: 5 * GRID }, rot: 0 as const, flag: false, valueAlong: false };
  const scene = (at: Point, rot: 0 | 90 | 270) => ({
    symbols,
    blocks: [{ g, layout: { ...r1, placements: [...r1.placements, { part: "C1", unit: 1, at, rot }] } }],
    powers: [gnd],
    labels: [],
  });
  const RIGHT: Point = { x: GRID, y: 4 * GRID };
  const LEFT: Point = { x: -GRID, y: 4 * GRID };
  const HIT = ["body of C1#1 overlaps the glyph of power symbol GND 0 at (0, 6.35)"];

  it("upright, the plate clears the glyph at both anchors", () => {
    expect(bodyGlyphProblems(scene(RIGHT, 0))).toEqual([]);
    expect(bodyGlyphProblems(scene(LEFT, 0))).toEqual([]);
  });

  it("rot 270 right of the glyph: the plate at x 0.508 mm reaches down into it", () => {
    expect(bodyGlyphProblems(scene(RIGHT, 270))).toEqual(HIT);
  });

  it("rot 90 right of the glyph: the plate at x 2.032 mm stands clear of it", () => {
    expect(bodyGlyphProblems(scene(RIGHT, 90))).toEqual([]);
  });

  it("rot 90 left of the glyph: the plate at x −0.508 mm reaches down into it", () => {
    expect(bodyGlyphProblems(scene(LEFT, 90))).toEqual(HIT);
  });

  it("rot 270 left of the glyph: the plate at x −2.032 mm stands clear of it", () => {
    expect(bodyGlyphProblems(scene(LEFT, 270))).toEqual([]);
  });
});

describe("assertSheetSafe: a part body of one block never covers another block's power glyph", () => {
  const power = (a: Anchor) => ({ net: a.net, libId: a.net === "GND" ? "Pwr:GND" : "Pwr:+3V3", at: a.at, rot: 0 as const, flag: false, valueAlong: false });
  const r1 = r1Part("GND");
  /** Two blocks on one sheet: the first draws R1 and its symbols, the second only C1 and its own. */
  const scene = (capAt: Point, flags: readonly Point[] = []): SheetScene => {
    const capBlock = capPart(g, capAt);
    return {
      sheet: "s",
      symbols,
      blocks: [{ g, layout: r1 }, { g, layout: capBlock }],
      powers: [
        ...[...r1.anchors, ...capBlock.anchors].map(power),
        ...flags.map((at) => ({ net: "GND", libId: "Pwr:PWR_FLAG", at, rot: 0 as const, flag: true, valueAlong: false })),
      ],
      labels: [],
    };
  };

  it("accepts blocks whose bodies clear every glyph", () => {
    expect(() => assertSheetSafe(scene(CLEAR))).not.toThrow();
  });

  it("refuses a body over another block's GND symbol, naming both", () => {
    expect(() => assertSheetSafe(scene(OVER))).toThrow(/^sheet s: body clearance:\n {2}- body of C1#1 overlaps the glyph of power symbol GND 1 at \(0, 6\.35\)$/);
  });

  it("refuses a body over a PWR_FLAG glyph", () => {
    // C1's lower plate: y 8.382 mm, x 36.068 to 40.132 mm. The flag rises 2.54 mm from 10.16 mm, 1.016 mm either side of 40.64 mm.
    const s = scene({ x: 30 * GRID, y: 6 * GRID }, [{ x: 32 * GRID, y: 8 * GRID }]);
    expect(() => assertSheetSafe(s)).toThrow(/body of C1#1 overlaps the glyph of PWR_FLAG GND 4 at \(40\.64, 10\.16\)/);
  });
});
