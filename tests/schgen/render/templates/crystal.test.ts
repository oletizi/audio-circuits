/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/crystal.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../../__fixtures__/circuits.ts";
import { TEST_BOM } from "../../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import type { PartSpec, PinNumber, Rendering } from "../../../../lib/schgen/ir/types.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";

const xtalOf = (libId: string, pins: Record<string, string>, label = "Y_HSE"): PartSpec => ({
  label, refPrefix: "Y", libId, units: [1], value: "25MHz", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: Object.fromEntries(Object.entries(pins).map(([k, net]) => [k, { net, identity: k }])),
});
const xtal = xtalOf("Fix:XTAL4", { "1": "HSE_IN", "3": "HSE_OUT", "2": "GND", "4": "GND" });
const rendering = (roles: Record<string, PinNumber> | null): Rendering => ({
  kind: "wired", template: "crystal", anchor: roles === null ? null : { part: "Y_HSE", unit: 1, roles },
});
const R = rendering({ a: "1", b: "3" });
const CAPS = [cap("C_HSE1", "HSE_IN", "GND"), cap("C_HSE2", "HSE_OUT", "GND")];
const EXT = { external: ["HSE_IN", "HSE_OUT"] };
const refusal = (parts: PartSpec[], r: Rendering, external = EXT) => {
  const c = blockCircuit(parts, r, external);
  return () => realiseBlock(c, "B", symbols);
};

describe("crystal", () => {
  it("draws the crystal with a load capacitor under each pin and labels on the clock nets", () => {
    const c = blockCircuit([xtal, ...CAPS], R, EXT);
    const layout = realiseBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual([
      "GND:down", "GND:down", "GND:down", "GND:up", "HSE_IN:up", "HSE_OUT:up",
    ]);
  });

  it("draws no label stubs when the clock nets stay inside the block", () => {
    const c = blockCircuit([xtal, ...CAPS], R, { external: [] });
    const layout = realiseBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => a.net)).not.toContain("HSE_IN");
  });

  it("refuses a missing load capacitor", () => {
    expect(refusal([xtal, CAPS[0]!], R)).toThrow(/crystal needs one load capacitor from each crystal pin to ground/);
  });

  it("refuses a block with no anchor or without roles a and b", () => {
    expect(refusal([xtal, ...CAPS], rendering(null))).toThrow(/crystal needs an anchor with roles a and b/);
    expect(refusal([xtal, ...CAPS], rendering({ a: "1" }))).toThrow(/crystal needs an anchor with roles a and b/);
  });

  it("refuses crystal pins on one net or on a rail", () => {
    const same = xtalOf("Fix:XTAL4", { "1": "HSE_IN", "3": "HSE_IN", "2": "GND", "4": "GND" });
    expect(refusal([same, CAPS[0]!], R, { external: ["HSE_IN"] })).toThrow(/crystal pins a and b must be on two different non-rail nets/);
    const rail = xtalOf("Fix:XTAL4", { "1": "3V3", "3": "HSE_OUT", "2": "GND", "4": "GND" });
    expect(refusal([rail, CAPS[1]!], R, { external: ["HSE_OUT"] })).toThrow(/crystal pins a and b must be on two different non-rail nets/);
  });

  it("refuses a case pin that is not on a ground rail", () => {
    const hot = xtalOf("Fix:XTAL4", { "1": "HSE_IN", "3": "HSE_OUT", "2": "GND", "4": "HSE_IN" });
    expect(refusal([hot, ...CAPS], R)).toThrow(/case pin 4 is on HSE_IN, not a ground rail/);
  });

  it("refuses a load capacitor that is not between a crystal pin and ground", () => {
    expect(refusal([xtal, CAPS[0]!, cap("C_X", "HSE_OUT", "3V3")], R)).toThrow(/crystal needs one load capacitor.*found: C_HSE1, C_X/);
    expect(refusal([xtal, CAPS[0]!, cap("C_X", "HSE_IN", "HSE_OUT")], R)).toThrow(/crystal needs one load capacitor/);
  });

  it("refuses two capacitors on one crystal pin and extra parts", () => {
    expect(refusal([xtal, CAPS[0]!, cap("C_DUP", "HSE_IN", "GND")], R)).toThrow(/crystal needs one load capacitor/);
    expect(refusal([xtal, ...CAPS, res("R_X", "HSE_IN", "GND")], R)).toThrow(/crystal needs one load capacitor/);
  });

  it("refuses an anchor part without a two-terminal capacitor candidate (multi-pin other unit)", () => {
    const three = xtalOf("Fix:REG3", { "1": "HSE_IN", "2": "HSE_OUT", "3": "GND" }, "U_X");
    expect(refusal([xtal, three, ...CAPS], R)).toThrow(/crystal needs one load capacitor/);
  });

  it("refuses role pins that cannot lie on one horizontal line", () => {
    const reg = xtalOf("Fix:REG3", { "1": "HSE_IN", "3": "HSE_OUT", "2": "GND", "4": "GND", "5": "GND" });
    const skew = rendering({ a: "1", b: "3" });
    expect(refusal([reg, ...CAPS], skew)).toThrow(/crystal pins a and b cannot be put on one horizontal line/);
  });
});
