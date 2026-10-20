/**
 * Ported from digital-pedal-platform's `tools/schgen/render/bus.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, res, symbols, VSSA } from "../__fixtures__/circuits.ts";
import { GRID } from "../../../lib/schgen/render/geometry.ts";
import { STUB } from "../../../lib/schgen/render/layout-kit.ts";
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../__fixtures__/layout-checks.ts";
import type { PartSpec } from "../../../lib/schgen/ir/types.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { realiseBus, renderBlock } from "../../../lib/schgen/render/bus.ts";
import { blockFields } from "../../../lib/schgen/render/field-placement.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";

const flash: PartSpec = {
  label: "U_FLASH", refPrefix: "U", libId: "Fix:BIG8", units: [1], value: "BIG8", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: {
    "1": { net: "Q_IO0", identity: "D0" }, "2": { net: "Q_IO1", identity: "D1" }, "3": { net: "Q_CLK", identity: "CLK" },
    "4": { net: "GND", identity: "GND" }, "5": { net: "Q_NCS", identity: "CS" }, "6": { net: "Q_IO2", identity: "D2" },
    "7": { nc: true, identity: "NC" }, "8": { net: "3V3", identity: "VCC" },
  },
};
const BUS = {
  kind: "bus" as const,
  groups: [{ name: "QSPI data", nets: ["Q_IO0", "Q_IO1", "Q_IO2"] }, { name: "QSPI control", nets: ["Q_CLK", "Q_NCS"] }],
};
const EXT = ["Q_IO0", "Q_IO1", "Q_CLK", "Q_NCS", "Q_IO2"];

describe("realiseBus", () => {
  it("lists each group's nets in its declared order, not pin order (SDRAM_D4…D15, D0…D3 on the core sheet)", () => {
    const declared = { ...BUS, groups: [{ name: "QSPI data", nets: ["Q_IO2", "Q_IO0", "Q_IO1"] }, { name: "QSPI control", nets: ["Q_NCS", "Q_CLK"] }] };
    const c = blockCircuit([flash], declared, { external: EXT });
    expect(realiseBus(c, "B", symbols).legend).toEqual(["QSPI data: Q_IO2, Q_IO0, Q_IO1", "QSPI control: Q_NCS, Q_CLK"]);
  });

  it("lengthens a stub until its power glyph clears another net's glyph on the neighbouring pin (GND and VSSA under U_MCU)", () => {
    // Pins 2 and 3 sit one pitch apart on the left side: GND and VSSA glyphs on equal stubs meet.
    const grounds: PartSpec = { ...flash, pins: { ...flash.pins, "2": { net: "GND", identity: "D1" }, "3": { net: "VSSA", identity: "CLK" } } };
    const nets = ["Q_IO0", "Q_NCS", "Q_IO2"];
    const c = blockCircuit([grounds], { kind: "bus", groups: [{ name: "rest", nets }] }, { external: nets, moreRails: [VSSA] });
    const r = realiseBus(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), r.layout)).toEqual([]);
    const at = (net: string) => r.layout.anchors.find((a) => a.net === net)?.at;
    // GND keeps the one-step stub; VSSA's glyph needs three grid steps more to clear it at the corner.
    expect(at("GND")).toEqual({ x: -10_160 - STUB, y: 0 });
    expect(at("VSSA")).toEqual({ x: -10_160 - STUB - 3 * GRID, y: 2 * GRID });
  });

  it("gives every connected pin a stub and a label or power symbol, and builds the legend", () => {
    const c = blockCircuit([flash], BUS, { external: EXT });
    const g = subgraphOf(c, "B", symbols);
    const r = realiseBus(c, "B", symbols);
    expect(checkLayout(g, r.layout)).toEqual([]);
    expect(unattachedWireEnds(g, r.layout)).toEqual([]);
    expect(r.layout.anchors).toHaveLength(7);
    expect(r.legend).toEqual(["QSPI data: Q_IO0, Q_IO1, Q_IO2", "QSPI control: Q_CLK, Q_NCS"]);
  });

  it("refuses a bus block with two units", () => {
    const c = blockCircuit([flash, res("R_PU", "Q_NCS", "3V3")], BUS, { external: EXT });
    expect(() => realiseBus(c, "B", symbols)).toThrow(/bus block B must hold exactly one unit \(holds 2\)/);
  });

  it("refuses a block that is not rendered as a bus", () => {
    const c = blockCircuit([flash], { kind: "auto" }, { external: EXT });
    expect(() => realiseBus(c, "B", symbols)).toThrow(/block B is rendered "auto"/);
  });

  it("refuses an unknown block", () => {
    const c = blockCircuit([flash], BUS, { external: EXT });
    expect(() => realiseBus(c, "NOPE", symbols)).toThrow(/unknown block NOPE/);
  });

  it("shares one stub between pins whose ends coincide on the same net", () => {
    const stack: PartSpec = {
      ...flash, label: "J_S", libId: "Fix:STACK4", value: "STACK4",
      pins: { "1": { net: "Q_CLK", identity: "VBUS" }, "2": { net: "Q_CLK", identity: "VBUS" }, "3": { net: "Q_NCS", identity: "CC" }, "4": { net: "GND", identity: "GND" } },
    };
    const c = blockCircuit([stack], { kind: "bus", groups: [{ name: "g", nets: ["Q_CLK", "Q_NCS"] }] }, { external: ["Q_CLK", "Q_NCS"] });
    const g = subgraphOf(c, "B", symbols);
    const r = realiseBus(c, "B", symbols);
    expect(checkLayout(g, r.layout)).toEqual([]);
    expect(unattachedWireEnds(g, r.layout)).toEqual([]);
    expect(r.layout.anchors).toHaveLength(3);
    expect(r.layout.wires).toHaveLength(3);
  });

  it("refuses pins that share a location but sit on different nets", () => {
    const stack: PartSpec = {
      ...flash, label: "J_S", libId: "Fix:STACK4", value: "STACK4",
      pins: { "1": { net: "Q_CLK", identity: "VBUS" }, "2": { net: "Q_NCS", identity: "VBUS" }, "3": { net: "Q_IO0", identity: "CC" }, "4": { net: "GND", identity: "GND" } },
    };
    const c = blockCircuit([stack], { kind: "bus", groups: [{ name: "g", nets: ["Q_CLK", "Q_NCS", "Q_IO0"] }] }, { external: ["Q_CLK", "Q_NCS", "Q_IO0"] });
    expect(() => realiseBus(c, "B", symbols)).toThrow(/bus block B: pins 1 and 2 share a location but are on Q_CLK and Q_NCS/);
  });

  it("refuses a connected pin sharing a location with a not-connected pin", () => {
    const stack: PartSpec = {
      ...flash, label: "J_S", libId: "Fix:STACK4", value: "STACK4",
      pins: { "1": { net: "Q_CLK", identity: "VBUS" }, "2": { nc: true, identity: "VBUS" }, "3": { net: "Q_NCS", identity: "CC" }, "4": { net: "GND", identity: "GND" } },
    };
    const c = blockCircuit([stack], { kind: "bus", groups: [{ name: "g", nets: ["Q_CLK", "Q_NCS"] }] }, { external: ["Q_CLK", "Q_NCS"] });
    expect(() => realiseBus(c, "B", symbols)).toThrow(/pins 1 and 2 share a location but are on Q_CLK and NC/);
  });
});

describe("renderBlock", () => {
  it("dispatches a bus block to the bus renderer", () => {
    const c = blockCircuit([flash], BUS, { external: EXT });
    const r = renderBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, r.layout)).toEqual([]);
    expect(unattachedWireEnds(g, r.layout)).toEqual([]);
    expect(r.legend).toHaveLength(2);
  });

  it("dispatches a wired block to its template with an empty legend", () => {
    const c = blockCircuit(
      [res("R1", "A", "GND"), res("R2", "A", "GND")],
      { kind: "wired", template: "rail-row", anchor: null },
      { external: ["A"] },
    );
    const r = renderBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, r.layout)).toEqual([]);
    expect(unattachedWireEnds(g, r.layout)).toEqual([]);
    expect(r.legend).toEqual([]);
    expect(r.layout.placements).toHaveLength(2);
  });

  // Pins 1 and 2 share a location on different nets, so the renderer's stub builder throws.
  const clash: PartSpec = {
    ...flash, label: "J_S", libId: "Fix:STACK4", value: "STACK4",
    pins: { "1": { net: "Q_CLK", identity: "VBUS" }, "2": { net: "Q_NCS", identity: "VBUS" }, "3": { net: "Q_IO0", identity: "CC" }, "4": { net: "GND", identity: "GND" } },
  };
  const NETS = ["Q_CLK", "Q_NCS", "Q_IO0"];
  const STUB_CLASH = "bus block B: pins 1 and 2 share a location but are on Q_CLK and Q_NCS";

  function thrown(run: () => unknown): Error {
    try {
      run();
    } catch (e) {
      if (e instanceof Error) return e;
      throw new Error("renderBlock threw a non-Error");
    }
    throw new Error("renderBlock did not throw");
  }

  it.each([
    ["bus", { kind: "bus", groups: [{ name: "g", nets: NETS }] }],
  ] as const)("attributes a %s renderer throw to its block, keeping the cause", (kind, rendering) => {
    const c = blockCircuit([clash], rendering, { external: NETS });
    const e = thrown(() => renderBlock(c, "B", symbols));
    expect(e.message).toBe(`block B: ${kind} rendering failed: ${STUB_CLASH}`);
    const cause = e.cause;
    if (!(cause instanceof Error)) throw new Error("the attributed error kept no cause");
    expect(cause.message).toBe(STUB_CLASH);
  });
});

describe("IC field placement (search)", () => {
  const fieldsOf = (spec: PartSpec, rendering: typeof BUS) => {
    const c = blockCircuit([spec], rendering, { external: EXT });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBus(c, "B", symbols).layout;
    expect(checkLayout(g, layout)).toEqual([]);
    return blockFields(g, layout, symbols)[0]!;
  };

  it("puts a four-sided IC's fields centred inside its body when no side is free", () => {
    const t = fieldsOf(flash, BUS);
    expect(t.inside).toBe(true);
    expect(t.fields.reference).toEqual({ at: { x: 0, y: -1270 }, justify: "center" });
    expect(t.fields.value).toEqual({ at: { x: 0, y: 1270 }, justify: "center" });
  });

  it("falls back beside the outermost pins when centred pin names fill a small body (original BIG8 geometry)", () => {
    // Pins on all four sides and VCC/GND names down the middle: no free side, no clear spot inside.
    const t = fieldsOf({ ...flash, libId: "Fix:BIG8C" }, BUS);
    expect(t.inside).toBe(false);
    expect(t.fields.reference.justify).toBe("left");
  });

  it("puts a narrow one-sided connector's fields beside it on a free side (original STACK4 width)", () => {
    const stack: PartSpec = {
      ...flash, label: "J_N", refPrefix: "J", libId: "Fix:STACK4N", value: "STACK4",
      pins: { "1": { net: "Q_CLK", identity: "VBUS" }, "2": { net: "Q_CLK", identity: "VBUS" }, "3": { net: "Q_NCS", identity: "CC" }, "4": { net: "GND", identity: "GND" } },
    };
    const t = fieldsOf(stack, { kind: "bus", groups: [{ name: "g", nets: ["Q_CLK", "Q_NCS"] }] } as unknown as typeof BUS);
    expect(t.inside).toBe(false);
  });

});
