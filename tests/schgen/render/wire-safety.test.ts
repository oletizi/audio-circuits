/**
 * Ported from digital-pedal-platform's `tools/schgen/render/wireSafety.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import type { ConnItem } from "../../../lib/schgen/render/connectivity.ts";
import { checkWireSafety } from "../../../lib/schgen/render/wire-safety.ts";

/** Wire `what` names the wire as the generator does ("wire 0 of B"): messages never add the word again. */
const W = (what: string, ax: number, ay: number, bx: number, by: number, net: string): ConnItem =>
  ({ kind: "wire", a: { x: ax, y: ay }, b: { x: bx, y: by }, net, what });
const P = (what: string, x: number, y: number, net: string | null): ConnItem => ({ kind: "pin", at: { x, y }, net, what });
const A = (what: string, x: number, y: number, net: string): ConnItem => ({ kind: "anchor", at: { x, y }, net, what });

describe("checkWireSafety (Review Focus 1)", () => {
  it("is silent for a clean layout", () => {
    expect(checkWireSafety([W("wire w", 0, 0, 5080, 0, "A"), P("R1.1", 0, 0, "A"), P("R2.1", 5080, 0, "A")])).toEqual([]);
  });

  it("names a generator wire once: wire 0 of B, never wire wire 0 of B", () => {
    expect(checkWireSafety([W("wire 0 of B", 0, 0, 5080, 0, "A"), P("R3.2", 2540, 0, "B")])).toEqual([
      "wire 0 of B (net A) passes over pin end R3.2 (B) at (2.54, 0)",
    ]);
  });

  it("refuses a wire passing over a foreign pin end", () => {
    expect(checkWireSafety([W("wire w1", 0, 0, 5080, 0, "A"), P("R3.2", 2540, 0, "B")])).toEqual([
      "wire w1 (net A) passes over pin end R3.2 (B) at (2.54, 0)",
    ]);
  });

  it("refuses a wire over a not-connected pin", () => {
    expect(checkWireSafety([W("wire w1", 0, 0, 5080, 0, "A"), P("U1.7", 5080, 0, null)])).toEqual([
      "wire w1 (net A) passes over pin end U1.7 (NC) at (5.08, 0)",
    ]);
  });

  it("refuses overlapping collinear wires of different nets", () => {
    expect(checkWireSafety([W("wire w1", 0, 0, 5080, 0, "A"), W("wire w2", 2540, 0, 7620, 0, "B")])).toEqual([
      "collinear wire w1 (A) and wire w2 (B) overlap from (2.54, 0) to (5.08, 0)",
    ]);
  });

  it("refuses a T into a foreign wire", () => {
    expect(checkWireSafety([W("wire h", 0, 0, 5080, 0, "A"), W("wire v", 2540, 0, 2540, 2540, "B")])).toEqual([
      "wire v (net B) ends on wire h (net A) at (2.54, 0)",
    ]);
  });

  it("refuses a label anchor on a foreign wire", () => {
    expect(checkWireSafety([W("wire h", 0, 0, 5080, 0, "A"), A("label VMID", 2540, 0, "VMID")])).toEqual([
      "anchor label VMID (net VMID) lies on wire h (net A) at (2.54, 0)",
    ]);
  });

  it("allows crossing interiors of different nets", () => {
    expect(checkWireSafety([W("wire h", 0, 2540, 5080, 2540, "A"), W("wire v", 2540, 0, 2540, 5080, "B")])).toEqual([]);
  });

  it("refuses a diagonal wire rather than misjudging it", () => {
    expect(() => checkWireSafety([W("wire d", 0, 0, 1270, 1270, "A")])).toThrow(/wire d is not orthogonal/);
  });

  it("refuses a pin coinciding with an NC pin and an anchor on a foreign pin end", () => {
    expect(checkWireSafety([P("R1.1", 0, 0, "A"), P("U1.7", 0, 0, null), A("label B", 0, 0, "B")])).toEqual([
      "pin end R1.1 (A) coincides with pin end U1.7 (NC) at (0, 0)",
      "anchor label B (net B) lies on pin end R1.1 (A) at (0, 0)",
      "anchor label B (net B) lies on pin end U1.7 (NC) at (0, 0)",
    ]);
  });

  it("refuses a same-net pin end mid-wire (KiCad connects it only with a junction)", () => {
    expect(checkWireSafety([W("wire w", 0, 0, 5080, 0, "A"), P("R1.1", 2540, 0, "A")])).toEqual([
      "pin end R1.1 (A) lies mid-wire on wire w at (2.54, 0); split the wire there",
    ]);
  });

  it("refuses a same-net T without a split", () => {
    expect(checkWireSafety([W("wire h", 0, 0, 5080, 0, "A"), W("wire v", 2540, 0, 2540, 2540, "A")])).toEqual([
      "wire v ends mid-wire on wire h at (2.54, 0); split the wire there",
    ]);
  });

  it("allows a split T and two wire ends meeting on a same-net pin end", () => {
    const splitT = [W("wire h1", 0, 0, 2540, 0, "A"), W("wire h2", 2540, 0, 5080, 0, "A"), W("wire v", 2540, 0, 2540, 2540, "A")];
    expect(checkWireSafety(splitT)).toEqual([]);
    expect(checkWireSafety([W("wire a", 0, 0, 2540, 0, "A"), W("wire b", 2540, 0, 2540, 2540, "A"), P("R1.1", 2540, 0, "A")])).toEqual([]);
  });

  it("refuses same-net collinear overlap once, without mid-wire duplicates", () => {
    expect(checkWireSafety([W("wire w1", 0, 0, 5080, 0, "A"), W("wire w2", 2540, 0, 7620, 0, "A")])).toEqual([
      "collinear wire w1 (A) and wire w2 (A) overlap from (2.54, 0) to (5.08, 0)",
    ]);
  });

  it("allows a same-net label anchor on a wire interior", () => {
    expect(checkWireSafety([W("wire w", 0, 0, 5080, 0, "A"), A("label A", 2540, 0, "A")])).toEqual([]);
  });

  it("refuses a label anchor where two wire interiors cross", () => {
    expect(
      checkWireSafety([W("wire h", 0, 2540, 5080, 2540, "A"), W("wire v", 2540, 0, 2540, 5080, "A"), A("label A", 2540, 2540, "A")]),
    ).toEqual(["anchor label A (net A) sits where wire h and wire v cross at (2.54, 2.54)"]);
  });

  it("refuses coincident label anchors of different nets", () => {
    expect(checkWireSafety([A("label A", 0, 0, "A"), A("label B", 0, 0, "B"), A("label A2", 0, 0, "A")])).toEqual([
      "anchor label A (net A) coincides with anchor label B (net B) at (0, 0)",
      "anchor label B (net B) coincides with anchor label A2 (net A) at (0, 0)",
    ]);
  });
});
