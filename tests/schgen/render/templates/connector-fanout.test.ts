/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/connectorFanout.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../../__fixtures__/circuits.ts";
import { TEST_BOM } from "../../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import type { PartSpec, Rendering } from "../../../../lib/schgen/ir/types.ts";
import { checkLayout, layoutItems, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";
import { junctionPoints } from "../../../../lib/schgen/render/connectivity.ts";

const conn = (nets: [string, string, string, string]): PartSpec => ({
  label: "J_USB", refPrefix: "J", libId: "Fix:CONN4", units: [1], value: "CONN4", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: Object.fromEntries(nets.map((n, i) => [String(i + 1), { net: n, identity: `P${i + 1}` }])),
});
const R: Rendering = { kind: "wired", template: "connector-fanout", anchor: { part: "J_USB", unit: 1, roles: {} } };

describe("connector-fanout", () => {
  it("joins two pins on one net, runs a series resistor to ground, labels the rest", () => {
    const c = blockCircuit([conn(["DP", "CC", "DP", "GND"]), res("R_CC", "CC", "GND")], R, { external: ["DP"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.filter((a) => a.net === "DP")).toHaveLength(1);
    // The only point where three wire/pin ends meet is DP's first member's join point (stub, join wire, continuation);
    // CC's stub crosses the join wire through both interiors, which is neither a connection nor a dot.
    expect(junctionPoints(layoutItems(g, layout))).toHaveLength(1);
  });

  it("refuses a branching pin net", () => {
    const c = blockCircuit([conn(["A", "CC", "B", "GND"]), res("R1", "CC", "GND"), res("R2", "CC", "3V3")], R, { external: ["A", "B"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/net CC branches; one series path per pin is supported/);
  });

  it("refuses a block without an anchor", () => {
    const c = blockCircuit([conn(["A", "B", "C", "GND"])], { ...R, anchor: null }, { external: ["A", "B", "C"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/connector-fanout needs an anchor/);
  });

  it("spreads rows whose parts need more room than the pin pitch, every body and field clear", () => {
    // Two capacitors on adjacent pins 2.54 mm apart: their rows are moved apart by jogs beyond the pins.
    const c = blockCircuit([conn(["A", "B", "C", "GND"]), cap("C1", "A", "GND"), cap("C2", "B", "GND")], R, { external: ["C"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    const ys = ["C1", "C2"].map((p) => layout.placements.find((pl) => pl.part === p)!.at.y);
    expect(ys[1]! - ys[0]!).toBeGreaterThan(2540);
  });

  it("refuses when every rotation collides", () => {
    // EAR's outline overhangs its own pin, so the pin's label lands on its body in every rotation.
    const ear: PartSpec = { ...conn(["A", "A", "A", "A"]), libId: "Fix:EAR", value: "EAR", pins: { "1": { net: "A", identity: "P" } } };
    const c = blockCircuit([ear], R, { external: ["A"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/connector-fanout found no rotation without collisions \(rotation 0: .*label A at .* overlaps body of J_USB#1/);
  });
});
