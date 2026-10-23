/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/railRow.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../../__fixtures__/circuits.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import { checkLayout, layoutItems, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";
import { junctionPoints } from "../../../../lib/schgen/render/connectivity.ts";

const DEC = { kind: "wired" as const, template: "decoupling-bank" as const, anchor: null };
const ROW = { kind: "wired" as const, template: "rail-row" as const, anchor: null };

describe("decoupling-bank", () => {
  it("splits each rail row at every capacitor, so every tap is a shared wire end (KiCad 10 needs no junction)", () => {
    const c = blockCircuit([cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND"), cap("C3", "3V3", "GND")], DEC, { external: [] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    const rowPieces = (net: string) => layout.wires.filter((w) => w.net === net && w.a.y === w.b.y);
    // Column pitch leaves room for each capacitor's fields: body half 2.032 + 1.27 + "C000" 5.08 + 1.27 + body half 2.032, on the grid.
    expect(rowPieces("3V3").map((w) => Math.abs(w.b.x - w.a.x))).toEqual([12700, 12700]);
    expect(rowPieces("GND").map((w) => Math.abs(w.b.x - w.a.x))).toEqual([12700, 12700]);
    // Cosmetic dots: on each row, the left end (pin + row piece + anchor stub) and the middle tap (pin + two pieces).
    expect(junctionPoints(layoutItems(g, layout))).toHaveLength(4);
  });

  it("lays out capacitors from two supply rails to ground with one anchor per rail segment", () => {
    const c = blockCircuit([cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND"), cap("C3", "VDDA", "GND")], DEC, { external: [] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:up", "GND:down", "VDDA:up"]);
    expect(layout.placements.map((p) => p.part)).toEqual(["C1", "C2", "C3"]);
  });

  it("keeps same-rail capacitors adjacent even when listed apart", () => {
    const c = blockCircuit([cap("C1", "3V3", "GND"), cap("C2", "VDDA", "GND"), cap("C3", "3V3", "GND")], DEC, { external: [] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.placements.map((p) => p.part)).toEqual(["C1", "C3", "C2"]);
  });

  it("refuses a resistor, with the specified generation error", () => {
    const c = blockCircuit([cap("C1", "3V3", "GND"), res("R1", "3V3", "GND")], DEC, { external: [] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(
      'block B has rendering="wired" but template decoupling-bank cannot realise its subgraph: decoupling-bank holds only capacitors; R1 is R',
    );
  });
});

describe("rail-row", () => {
  it("hangs pull-ups from a supply rail at the top, with external signal nets labelled below", () => {
    const c = blockCircuit([res("R1", "3V3", "SIG_A"), res("R2", "3V3", "SIG_B")], ROW, { external: ["SIG_A", "SIG_B"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:up", "SIG_A:down", "SIG_B:down"]);
  });

  it("fails when no net is common to every part", () => {
    const c = blockCircuit([res("R1", "3V3", "A"), res("R2", "B", "GND")], ROW, { external: ["A", "B"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/template rail-row cannot realise its subgraph: no net is common to every part/);
  });
});
