/**
 * Ported from digital-pedal-platform's `tools/schgen/render/bodyClearance.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, symbols } from "../__fixtures__/circuits.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../lib/schgen/render/blocks.ts";

const DEC = { kind: "wired" as const, template: "decoupling-bank" as const, anchor: null };

describe("checkLayout body clearance", () => {
  const c = blockCircuit([cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND")], DEC, { external: [] });
  const g = subgraphOf(c, "B", symbols);
  const good = realiseBlock(c, "B", symbols);
  const c1 = good.placements.find((p) => p.part === "C1")!;
  // C1 stands vertically: its pin ends are 3.81 mm above and below its origin, its body box 2.032 mm either side.
  const onPin = { x: c1.at.x, y: c1.at.y - 2540 };

  it("accepts the template's own layout", () => {
    expect(checkLayout(g, good)).toEqual([]);
  });

  it("refuses an anchor on a pin's line and inside a body", () => {
    const bad = { ...good, anchors: [...good.anchors, { net: "GND", at: onPin, side: "left" as const }] };
    const p = checkLayout(g, bad);
    expect(p.some((l) => /^anchor GND \d+ at .* lies on the line of pin C1#1\.\d$/.test(l))).toBe(true);
    expect(p.some((l) => /^anchor GND \d+ at .* lies inside the body of C1#1$/.test(l))).toBe(true);
  });

  it("refuses a wire end on a pin's line", () => {
    const stray = { a: { x: c1.at.x - 5080, y: onPin.y }, b: onPin, net: "GND" };
    const p = checkLayout(g, { ...good, wires: [...good.wires, stray] });
    expect(p.some((l) => /^wire \d+ of B \(GND\) end at .* lies on the line of pin C1#1\.\d$/.test(l))).toBe(true);
  });

  it("refuses a wire through a body it does not attach to", () => {
    const through = { a: { x: c1.at.x - 2540, y: c1.at.y }, b: { x: c1.at.x + 2540, y: c1.at.y }, net: "GND" };
    const p = checkLayout(g, { ...good, wires: [...good.wires, through] });
    expect(p.some((l) => /^wire \d+ of B \(GND\) from .* passes through the body of C1#1$/.test(l))).toBe(true);
  });
});
