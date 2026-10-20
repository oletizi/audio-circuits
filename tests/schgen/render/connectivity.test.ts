/**
 * Ported from digital-pedal-platform's `tools/schgen/render/connectivity.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { connectedComponents, junctionPoints, onSegment, strictlyInside, type ConnItem } from "../../../lib/schgen/render/connectivity.ts";

const W = (what: string, ax: number, ay: number, bx: number, by: number, net = "N"): ConnItem =>
  ({ kind: "wire", a: { x: ax, y: ay }, b: { x: bx, y: by }, net, what });
const P = (what: string, x: number, y: number, net: string | null = "N"): ConnItem => ({ kind: "pin", at: { x, y }, net, what });
const A = (what: string, x: number, y: number, net = "N"): ConnItem => ({ kind: "anchor", at: { x, y }, net, what });

describe("onSegment / strictlyInside", () => {
  it("includes ends and interior of an axis-aligned segment", () => {
    expect(onSegment({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2540, y: 0 })).toBe(true);
    expect(onSegment({ x: 1270, y: 0 }, { x: 0, y: 0 }, { x: 2540, y: 0 })).toBe(true);
    expect(onSegment({ x: 1270, y: 1270 }, { x: 0, y: 0 }, { x: 2540, y: 0 })).toBe(false);
  });

  it("strictlyInside excludes the ends", () => {
    expect(strictlyInside({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2540, y: 0 })).toBe(false);
    expect(strictlyInside({ x: 1270, y: 0 }, { x: 0, y: 0 }, { x: 2540, y: 0 })).toBe(true);
  });
});

describe("connectedComponents (KiCad 10 as observed)", () => {
  it("joins a pin on a wire end", () => {
    expect(connectedComponents([W("w", 0, 0, 5080, 0), P("R1.1", 5080, 0)])).toHaveLength(1);
  });

  it("does not join a pin on the interior of a wire (KiCad needs a junction there)", () => {
    expect(connectedComponents([W("w", 0, 0, 5080, 0), P("R1.1", 2540, 0)])).toHaveLength(2);
  });

  it("does not join an unsplit T (KiCad needs a junction there)", () => {
    expect(connectedComponents([W("h", 0, 0, 5080, 0), W("v", 2540, 0, 2540, 2540)])).toHaveLength(2);
  });

  it("joins a split T: three wires meeting at the tap", () => {
    const items = [W("h1", 0, 0, 2540, 0), W("h2", 2540, 0, 5080, 0), W("v", 2540, 0, 2540, 2540)];
    expect(connectedComponents(items)).toHaveLength(1);
  });

  it("joins two wire ends meeting on a pin end", () => {
    const items = [W("a", 0, 0, 2540, 0), W("b", 2540, 0, 2540, 2540), P("R1.1", 2540, 0)];
    expect(connectedComponents(items)).toHaveLength(1);
  });

  it("joins a label anchor anywhere on a wire", () => {
    expect(connectedComponents([W("w", 0, 0, 5080, 0), A("label N", 2540, 0)])).toHaveLength(1);
  });

  it("does not join crossing wire interiors", () => {
    const comps = connectedComponents([W("h", 0, 2540, 5080, 2540, "A"), W("v", 2540, 0, 2540, 5080, "B")]);
    expect(comps).toHaveLength(2);
  });

  it("refuses a diagonal wire", () => {
    expect(() => connectedComponents([W("wire d", 0, 0, 1270, 1270)])).toThrow(/wire d is not orthogonal/);
  });

  it("refuses a zero-length wire", () => {
    expect(() => connectedComponents([W("wire z", 0, 0, 0, 0)])).toThrow(/wire z has zero length/);
  });

  it("keeps NC pins in their own component list", () => {
    const [c] = connectedComponents([P("U1.7", 0, 0, null)]);
    expect(c?.ncPins).toHaveLength(1);
    expect(c?.nets.size).toBe(0);
  });
});

describe("junctionPoints (cosmetic)", () => {
  it("marks 3+ coincident wire ends and pin ends, not a corner or an unsplit T", () => {
    expect(junctionPoints([W("h", 0, 0, 5080, 0), W("v", 2540, 0, 2540, 2540)])).toEqual([]);
    expect(junctionPoints([W("a", 0, 0, 2540, 0), W("b", 2540, 0, 2540, 2540)])).toEqual([]);
    expect(junctionPoints([W("a", 0, 0, 2540, 0), W("b", 2540, 0, 2540, 2540), P("p", 2540, 0)])).toEqual([{ x: 2540, y: 0 }]);
    const splitT = [W("h1", 0, 0, 2540, 0), W("h2", 2540, 0, 5080, 0), W("v", 2540, 0, 2540, 2540)];
    expect(junctionPoints(splitT)).toEqual([{ x: 2540, y: 0 }]);
  });

  it("does not count label anchors", () => {
    expect(junctionPoints([W("a", 0, 0, 2540, 0), W("b", 2540, 0, 2540, 2540), A("l", 2540, 0)])).toEqual([]);
  });

  it("sorts by y then x", () => {
    const items = [
      W("a", 0, 2540, 2540, 2540), W("b", 2540, 2540, 5080, 2540), P("p", 2540, 2540),
      W("c", 0, 0, 2540, 0), W("d", 2540, 0, 5080, 0), P("q", 2540, 0),
    ];
    expect(junctionPoints(items)).toEqual([{ x: 2540, y: 0 }, { x: 2540, y: 2540 }]);
  });
});
