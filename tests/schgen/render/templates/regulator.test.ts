/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/regulator.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, symbols } from "../../__fixtures__/circuits.ts";
import { TEST_BOM } from "../../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import type { PartSpec, PinNumber, Rendering } from "../../../../lib/schgen/ir/types.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";

const reg = (enNet: string): PartSpec => ({
  label: "U_LDO", refPrefix: "U", libId: "Fix:REG3", units: [1], value: "REG3", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: {
    "1": { net: "VIN", identity: "IN" }, "2": { net: enNet, identity: "EN" }, "3": { net: "GND", identity: "GND" },
    "4": { net: "NR", identity: "NR" }, "5": { net: "VOUT", identity: "OUT" },
  },
});
const R: Rendering = { kind: "wired", template: "regulator", anchor: { part: "U_LDO", unit: 1, roles: { in: "1", out: "5" } } };
const RAILS_PLUS = ["VIN", "VOUT"];
const withRoles = (roles: Record<string, PinNumber> | null): Rendering => ({
  kind: "wired", template: "regulator", anchor: roles === null ? null : { part: "U_LDO", unit: 1, roles },
});
const refusal = (parts: PartSpec[], r: Rendering = R, external: string[] = RAILS_PLUS) => {
  const c = blockCircuit(parts, r, { external });
  return () => realiseBlock(c, "B", symbols);
};
const NR_CAP = cap("C_NR", "NR", "GND");

describe("regulator", () => {
  it("draws input and output banks, the NR capacitor off its pin, EN tied to the input rail", () => {
    const c = blockCircuit(
      [reg("VIN"), cap("C_IN", "VIN", "GND"), cap("C_OUT1", "VOUT", "GND"), cap("C_OUT2", "VOUT", "GND"), cap("C_NR", "NR", "GND")],
      R,
      { external: RAILS_PLUS },
    );
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    const inCap = layout.placements.find((p) => p.part === "C_IN")!;
    const outCap = layout.placements.find((p) => p.part === "C_OUT1")!;
    expect(inCap.at.x).toBeLessThan(0);
    expect(outCap.at.x).toBeGreaterThan(0);
    // Rotation 0; IN and OUT pin ends sit 2.54 mm above the symbol origin. Each bus is split at every tap:
    // VIN at the IN pin, the EN stub column, C_IN's column and the far end; VOUT at OUT, C_OUT1, C_OUT2 and the far end.
    const busY = layout.placements.find((p) => p.part === "U_LDO")!.at.y - 2540;
    expect(layout.wires.filter((w) => w.net === "VIN" && w.a.y === busY && w.b.y === busY)).toHaveLength(3);
    expect(layout.wires.filter((w) => w.net === "VOUT" && w.a.y === busY && w.b.y === busY)).toHaveLength(3);
    expect(layout.anchors.filter((a) => a.net === "VIN").map((a) => a.side)).toEqual(["left"]);
    expect(layout.anchors.filter((a) => a.net === "VOUT").map((a) => a.side)).toEqual(["right"]);
  });

  it("refuses a part that leaves the output net toward a signal", () => {
    const c = blockCircuit([reg("VIN"), cap("C_IN", "VIN", "GND"), cap("C_X", "VOUT", "FB"), cap("C_NR", "NR", "GND")], R, { external: [...RAILS_PLUS, "FB"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/C_X leaves the out net toward FB; put it in its own block/);
  });

  it("stands a bank capacitor to a supply rail above the bus, and labels EN on its own net", () => {
    const c = blockCircuit([reg("EN"), cap("C_UP", "VIN", "3V3"), cap("C_OUT", "VOUT", "GND"), NR_CAP], R, { external: [...RAILS_PLUS, "EN"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.filter((a) => a.net === "3V3").map((a) => a.side)).toEqual(["up"]);
    expect(layout.anchors.filter((a) => a.net === "EN").map((a) => a.side)).toEqual(["left"]);
  });

  it("keeps a labelled EN stub clear of a ground-referenced input bank", () => {
    const c = blockCircuit([reg("EN"), cap("C_IN", "VIN", "GND"), cap("C_OUT", "VOUT", "GND"), NR_CAP], R, { external: [...RAILS_PLUS, "EN"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    const en = layout.anchors.find((a) => a.net === "EN")!;
    const inCap = layout.placements.find((p) => p.part === "C_IN")!;
    // The bank starts a pitch beyond the fan-out on its side; the C_IN body is 2.032 mm either side of its column.
    expect(en.at.x).toBeGreaterThan(inCap.at.x + 2032);
  });

  it("refuses a tied pin whose end is not in line with the bus pin's end", () => {
    const step: PartSpec = { ...reg("VIN"), libId: "Fix:REGSTEP", value: "REGSTEP" };
    expect(refusal([step, NR_CAP])).toThrow(/pin 2 is tied to the in bus but its end is at x -10\.16, not the in pin's -7\.62/);
  });

  it("draws no far-end piece on an unlabelled bus", () => {
    const c = blockCircuit([reg("VIN"), cap("C_IN", "VIN", "GND"), cap("C_OUT", "VOUT", "GND"), NR_CAP], R, { external: ["VIN"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => a.net)).not.toContain("VOUT");
  });

  it("refuses a block without roles in and out", () => {
    const parts = [reg("VIN"), NR_CAP];
    expect(refusal(parts, withRoles(null))).toThrow(/regulator needs an anchor with roles in and out/);
    expect(refusal(parts, withRoles({ in: "1" }))).toThrow(/regulator needs an anchor with roles in and out/);
  });

  it("refuses roles that no rotation puts on the left and right", () => {
    expect(refusal([reg("EN"), NR_CAP], withRoles({ in: "1", out: "2" }), [...RAILS_PLUS, "EN"])).toThrow(
      /regulator: no rotation puts IN on the left and OUT on the right/,
    );
  });

  it("refuses in and out on one net", () => {
    const same: PartSpec = { ...reg("VIN"), pins: { ...reg("VIN").pins, "5": { net: "VIN", identity: "OUT" } } };
    expect(refusal([same, NR_CAP], R, ["VIN"])).toThrow(/regulator pins in and out must be on two different nets/);
  });

  it("refuses a part that leaves the input net toward a signal", () => {
    expect(refusal([reg("VIN"), cap("C_X", "VIN", "SIG"), NR_CAP], R, [...RAILS_PLUS, "SIG"])).toThrow(
      /C_X leaves the in net toward SIG; put it in its own block/,
    );
  });

  it("refuses a part across the input and output nets", () => {
    expect(refusal([reg("VIN"), cap("C_X", "VIN", "VOUT"), NR_CAP])).toThrow(/C_X leaves the in net toward VOUT; put it in its own block/);
  });

  it("refuses a multi-pin part on the input net", () => {
    const other: PartSpec = { ...reg("VIN"), label: "U_2", pins: { ...reg("VIN").pins, "4": { net: "NR2", identity: "NR" } } };
    expect(refusal([reg("VIN"), other, NR_CAP, cap("C_NR2", "NR2", "GND")])).toThrow(
      /U_2 touches the in net but is not a two-terminal part; put it in its own block/,
    );
  });

  it("refuses a pin on the input net that is not on the input pin's side", () => {
    const nrOnVin: PartSpec = { ...reg("VIN"), pins: { ...reg("VIN").pins, "4": { net: "VIN", identity: "NR" } } };
    expect(refusal([nrOnVin])).toThrow(/pin 4 is on the in net VIN but on the up side; only left-side pins are tied to the in bus/);
  });

  it("passes the fan-out's refusals on", () => {
    expect(refusal([reg("VIN")])).toThrow(/net NR of pin 4 leads nowhere in this block and is not labelled/);
  });
});
