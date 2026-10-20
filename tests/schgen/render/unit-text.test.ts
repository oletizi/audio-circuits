/**
 * Ported from digital-pedal-platform's `tools/schgen/render/unitText.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, res, symbols } from "../__fixtures__/circuits.ts";
import type { BlockUnit } from "../../../lib/schgen/render/block-types.ts";
import { subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { boxesOverlap, GRID, pinEnd, type Point } from "../../../lib/schgen/render/geometry.ts";
import type { PartSpec } from "../../../lib/schgen/ir/types.ts";
import { unitText } from "../../../lib/schgen/render/unit-text.ts";

/** R1 with pin 2 explicitly not connected; `hidePin2` hides that pin in the symbol, as stock symbols hide a KEY pin. */
function unitWithNcPin2(hidePin2: boolean): BlockUnit {
  const r = res("R1", "N1", "N2");
  const p2 = r.pins["2"];
  if (p2 === undefined) throw new Error("fixture resistor has no pin 2");
  const part: PartSpec = { ...r, pins: { ...r.pins, "2": { nc: true, identity: p2.identity } } };
  const g = subgraphOf(blockCircuit([part], { kind: "labels", reason: "fixture" }, { external: [] }), "B", symbols);
  const u = g.units.find((x) => x.part.label === "R1");
  if (u === undefined) throw new Error("R1 is not in block B");
  if (!hidePin2) return u;
  return { ...u, symbol: { ...u.symbol, pins: u.symbol.pins.map((p) => (p.number === "2" ? { ...p, hidden: true } : p)) } };
}

const pl = { part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 } as const;

function end(u: BlockUnit, n: string): Point {
  const p = u.symbol.pins.find((q) => q.number === n);
  if (p === undefined) throw new Error(`no pin ${n}`);
  return pinEnd(pl.at, pl.rot, p);
}

/** The 1.27 mm no-connect X drawn at `at`. */
const ncMark = (at: Point) => ({ minX: at.x - GRID / 2, minY: at.y - GRID / 2, maxX: at.x + GRID / 2, maxY: at.y + GRID / 2 });

describe("unitText no-connect markers (A2 Task 14: J_SWD's reference was drawn over its hidden KEY pin's X)", () => {
  it("makes the X on a hidden NC pin an obstacle, so no field or text is placed over it", () => {
    const u = unitWithNcPin2(true);
    const mark = ncMark(end(u, "2"));
    expect(unitText(u, pl).decorations.some((o) => boxesOverlap(o.box, mark) && o.what.includes("no-connect"))).toBe(true);
  });

  it("makes the X on a visible NC pin an obstacle too", () => {
    const u = unitWithNcPin2(false);
    const mark = ncMark(end(u, "2"));
    expect(unitText(u, pl).decorations.some((o) => boxesOverlap(o.box, mark) && o.what.includes("no-connect"))).toBe(true);
  });

  it("adds no marker for a connected pin", () => {
    const u = unitWithNcPin2(false);
    const markers = unitText(u, pl).decorations.filter((o) => o.what.includes("no-connect"));
    expect(markers).toHaveLength(1);
    expect(markers.some((o) => boxesOverlap(o.box, ncMark(end(u, "1"))))).toBe(false);
    expect(markers.map((o) => o.box)).toEqual([ncMark(end(u, "2"))]);
  });
});
