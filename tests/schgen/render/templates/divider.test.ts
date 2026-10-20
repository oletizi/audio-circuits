/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/divider.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../../__fixtures__/circuits.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";

const DIV = { kind: "wired" as const, template: "divider" as const, anchor: null };

describe("divider", () => {
  it("draws a strap divider with a filter capacitor: top rail up, tap labelled right, ground down", () => {
    const c = blockCircuit([res("R_TOP", "3V3", "TAP"), res("R_BOT", "TAP", "GND"), cap("C_TAP", "TAP", "GND")], DIV, { external: ["TAP"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:up", "GND:down", "TAP:right"]);
    // The TAP row is split at R_BOT's tap: R_TOP→R_BOT, R_BOT→C_TAP, then the anchor stub to the right.
    expect(layout.wires.filter((w) => w.net === "TAP" && w.a.y === w.b.y)).toHaveLength(3);
  });

  it("stacks a three-resistor chain in order", () => {
    const c = blockCircuit([res("R1", "3V3", "A"), res("R2", "A", "B"), res("R3", "B", "GND")], DIV, { external: [] });
    const layout = realiseBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    const ys = layout.placements.map((p) => [p.part, p.at.y] as const).sort((a, b) => a[1] - b[1]);
    expect(ys.map(([p]) => p)).toEqual(["R1", "R2", "R3"]);
  });

  it("puts a feed-forward capacitor beside the top resistor (parallel step)", () => {
    const c = blockCircuit([res("R_LDOT", "3V3", "FB"), cap("C_FF", "3V3", "FB"), res("R_LDOB", "FB", "GND")], DIV, { external: ["FB"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    const y = (l: string) => layout.placements.find((p) => p.part === l)!.at.y;
    expect(y("C_FF")).toBe(y("R_LDOT"));
  });

  it("refuses a T network (a shunt from a node above the last one)", () => {
    const c = blockCircuit([res("R1", "3V3", "A"), res("R2", "A", "B"), res("R3", "B", "GND"), cap("C1", "A", "GND")], DIV, { external: [] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/template divider cannot realise its subgraph: parts to GND start from different nodes \(B, A\)/);
  });
});
