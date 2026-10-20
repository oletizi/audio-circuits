/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/opampStage.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, res, symbols } from "../../__fixtures__/circuits.ts";
import { TEST_BOM } from "../../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import type { Circuit, PartSpec, PinNumber, Rendering } from "../../../../lib/schgen/ir/types.ts";
import type { BlockLayout } from "../../../../lib/schgen/render/block-types.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";

const amp = (out: string, inv: string, noninv: string): PartSpec => ({
  label: "U_OUT", refPrefix: "U", libId: "Fix:OPAMP2", units: [1, 2, 3], value: "OPAMP2", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: {
    "1": { net: out, identity: "" }, "2": { net: inv, identity: "-" }, "3": { net: noninv, identity: "+" },
    "5": { nc: true, identity: "+" }, "6": { nc: true, identity: "-" }, "7": { nc: true, identity: "" },
    "4": { net: "GND", identity: "V-" }, "8": { net: "3V3", identity: "V+" },
  },
});
const R: Rendering = { kind: "wired", template: "opamp-stage", anchor: { part: "U_OUT", unit: 1, roles: { out: "1", inv: "2", noninv: "3" } } };

/** Puts units 2 and 3 of U_OUT in their own labels block so block "B" holds unit 1 only. */
function stage(parts: PartSpec[], external: string[]) {
  return blockCircuit(parts, R, { external, splitUnits: [{ part: "U_OUT", units: [2, 3] }] });
}

/** Realises block B and asserts the layout is valid and has no dangling wire end. */
function valid(c: Circuit): BlockLayout {
  const layout = realiseBlock(c, "B", symbols);
  const g = subgraphOf(c, "B", symbols);
  expect(checkLayout(g, layout)).toEqual([]);
  expect(unattachedWireEnds(g, layout)).toEqual([]);
  return layout;
}

const withRoles = (roles: Record<string, PinNumber>): Rendering => ({ kind: "wired", template: "opamp-stage", anchor: { part: "U_OUT", unit: 1, roles } });

describe("opamp-stage", () => {
  it("draws a difference amplifier: input chains, parallel feedback, return to VMID above the + input, output chain", () => {
    const parts = [
      amp("O", "N", "P"),
      cap("C_AP", "VOUTP", "XP"), res("R_D1", "XP", "N"),
      cap("C_AM", "VOUTM", "XM"), res("R_D2", "XM", "P"),
      res("R_FO", "N", "O"), cap("C_FO", "N", "O"),
      res("R_GO", "P", "VMID"), cap("C_GO", "P", "VMID"),
      res("R_S", "O", "NS"), cap("C_OUT", "NS", "GND"),
    ];
    const c = stage(parts, ["VOUTP", "VOUTM", "VMID", "NS"]);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    const at = (l: string) => layout.placements.find((p) => p.part === l)!.at;
    expect(at("R_FO").y).toBeGreaterThan(0);
    expect(at("R_GO").y).toBeLessThan(at("R_D2").y);
    expect(at("R_S").x).toBeGreaterThan(0);
    // Two feedback rows (R_FO, C_FO): each corridor vertical is split at the first row, so two wires at A.x on N and two at xo on O.
    expect(layout.wires.filter((w) => w.net === "N" && w.a.x === w.b.x)).toHaveLength(2);
    expect(layout.wires.filter((w) => w.net === "O" && w.a.x === w.b.x)).toHaveLength(2);
  });

  it("draws a follower with its input chain", () => {
    const parts = [amp("O", "O", "P"), res("R_IN", "SIG", "P"), cap("C_F", "P", "GND")];
    const c = stage(parts, ["SIG", "O"]);
    expect(checkLayout(subgraphOf(c, "B", symbols), realiseBlock(c, "B", symbols))).toEqual([]);
    const layout = valid(c);
    // One feedback row: down at A.x, across, up at xo; plus the output stub to its right-side label.
    expect(layout.anchors.filter((a) => a.net === "O").map((a) => a.side)).toEqual(["right"]);
  });

  it("draws the supply pins of a single-unit op-amp as power symbols", () => {
    const one: PartSpec = {
      label: "U_EXP", refPrefix: "U", libId: "Fix:OPAMP1P", units: [1], value: "OPAMP1P", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
      pins: {
        "1": { net: "BUF", identity: "OUT" }, "2": { net: "GND", identity: "V-" }, "3": { net: "TIPF", identity: "+" },
        "4": { net: "BUF", identity: "-" }, "5": { net: "VDDA", identity: "V+" },
      },
    };
    const R1: Rendering = { kind: "wired", template: "opamp-stage", anchor: { part: "U_EXP", unit: 1, roles: { out: "1", inv: "4", noninv: "3" } } };
    const c = blockCircuit([one, res("R_TIP", "TIP", "TIPF"), cap("C_TF", "TIPF", "GND"), res("R_O", "BUF", "EXPR")], R1, { external: ["TIP", "EXPR"] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(layout.anchors.filter((a) => a.net === "VDDA")).toHaveLength(1);
  });

  it("refuses a ground shunt on the non-inverting chain when the inverting input has its own parts", () => {
    const parts = [amp("O", "N", "P"), res("R_IN", "SIG", "X"), res("R_X", "X", "P"), cap("C_X", "X", "GND"), res("R_F", "N", "O"), res("R_G", "N", "GND")];
    const c = stage(parts, ["SIG", "O"]);
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/non-inverting chain cannot hang C_X below the line/);
  });

  it("draws an inverting amplifier with a parallel input step, a ground shunt at N and + on an external reference", () => {
    const parts = [
      amp("O", "N", "VREF"), cap("C_A", "SIG", "X"), res("R_IN", "X", "N"), cap("C_IN", "X", "N"), cap("C_N", "N", "GND"),
      res("R_F", "N", "O"), res("R_O", "O", "OUT"),
    ];
    const layout = valid(stage(parts, ["SIG", "VREF", "OUT"]));
    expect(layout.anchors.filter((a) => a.net === "VREF").map((a) => a.side)).toEqual(["left"]);
  });

  it("bridges a parallel last input step clear of the feedback corridor at A", () => {
    const parts = [amp("O", "N", "VREF"), cap("C_A", "SIG", "X"), res("R_IN", "X", "N"), cap("C_IN", "X", "N"), res("R_F", "N", "O")];
    const layout = valid(stage(parts, ["SIG", "VREF", "O"]));
    // Inverting pin end is at (-7.62, 2.54); A is 2.54 mm left of it. The parallel step ends one PITCH left of A, bridged to A.
    expect(layout.wires).toContainEqual({ a: { x: -15240, y: 2540 }, b: { x: -10160, y: 2540 }, net: "N" });
    expect(layout.wires.filter((w) => w.net === "N" && w.a.x === -10160 && w.b.x === -10160)).toHaveLength(1);
  });

  it("anchors an inverting input fed only through the feedback at A, with no second stub, and allows a + ground shunt", () => {
    const parts = [amp("O", "N", "P"), res("R_P", "SIG", "P"), cap("C_P", "P", "GND"), res("R_F", "N", "O")];
    const layout = valid(stage(parts, ["SIG", "N", "O"]));
    expect(layout.anchors.filter((a) => a.net === "N")).toEqual([{ net: "N", at: { x: -10160, y: 2540 }, side: "left" }]);
    expect(layout.wires.filter((w) => w.net === "N" && w.a.y === 2540 && w.b.y === 2540)).toHaveLength(1);
  });

  it("labels an external output in its own column and bridges it to the output node, with a shunt at an internal output", () => {
    valid(stage([amp("O", "O", "P"), res("R_P", "SIG", "P"), res("R_S", "O", "NS")], ["SIG", "O", "NS"]));
    valid(stage([amp("O", "O", "P"), res("R_P", "SIG", "P"), cap("C_O", "O", "GND"), res("R_S", "O", "NS")], ["SIG", "NS"]));
  });

  it("hangs two external dead ends at - below it as shunts, not a parallel step", () => {
    const layout = valid(stage([amp("O", "N", "VREF"), res("R_IN", "SIG", "N"), cap("C_IN", "SIG", "N"), res("R_F", "N", "O")], ["SIG", "VREF", "O"]));
    expect(layout.anchors.filter((a) => a.net === "SIG").map((a) => a.side)).toEqual(["down", "down"]);
  });

  it("puts two external dead ends at + as shunts above it", () => {
    const layout = valid(stage([amp("O", "O", "P"), res("R_A", "SA", "P"), res("R_B", "SB", "P")], ["SA", "SB", "O"]));
    expect(layout.anchors.filter((a) => a.net === "SA" || a.net === "SB").map((a) => a.side)).toEqual(["up", "up"]);
  });

  describe("text clearance", () => {
    it("spaces three feedback rows so each row's fields clear the row above", () => {
      const parts = [amp("O", "N", "VREF"), res("R_IN", "SIG", "N"), cap("C_F1", "N", "O"), cap("C_F2", "N", "O"), cap("C_F3", "N", "O")];
      const layout = valid(stage(parts, ["SIG", "VREF", "O"]));
      const ys = ["C_F1", "C_F2", "C_F3"].map((l) => layout.placements.find((p) => p.part === l)!.at.y);
      expect(ys[1]! - ys[0]!).toBe(ys[2]! - ys[1]!);
      expect(ys[1]! - ys[0]!).toBeGreaterThan(3 * 1270);
    });

    it("centres a feedback unit with long fields between the corridor verticals", () => {
      const wide: PartSpec = { ...res("R_F", "N", "O"), value: "1.000000M" };
      const layout = valid(stage([amp("O", "N", "VREF"), res("R_IN", "SIG", "N"), wide], ["SIG", "VREF", "O"]));
      // A lead on N from the corridor at A.x = -10.16 mm to the unit, which sits mid-corridor.
      const y = layout.placements.find((p) => p.part === "R_F")!.at.y;
      expect(layout.wires.filter((w) => w.net === "N" && w.a.y === y && w.b.y === y && Math.min(w.a.x, w.b.x) === -10160)).toHaveLength(1);
    });

    it("clears a follower's feedback row of the supply symbols' text below the body", () => {
      const one: PartSpec = {
        label: "U_EXP", refPrefix: "U", libId: "Fix:OPAMP1P", units: [1], value: "OPAMP1P", footprint: "F", bom: TEST_BOM,
        dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
        pins: {
          "1": { net: "BUF", identity: "OUT" }, "2": { net: "GND", identity: "V-" }, "3": { net: "TIPF", identity: "+" },
          "4": { net: "BUF", identity: "-" }, "5": { net: "VDDA", identity: "V+" },
        },
      };
      const r1: Rendering = { kind: "wired", template: "opamp-stage", anchor: { part: "U_EXP", unit: 1, roles: { out: "1", inv: "4", noninv: "3" } } };
      valid(blockCircuit([one, res("R_TIP", "TIP", "TIPF")], r1, { external: ["TIP", "BUF"] }));
    });

    it("ends a + chain with shunts below the line left of the corridor, bridged to the + input", () => {
      const parts = [amp("O", "O", "P"), res("R_T", "3V3", "P"), res("R_B", "P", "GND"), cap("C_B", "P", "GND")];
      const layout = valid(stage(parts, ["O"]));
      // + pin end (-7.62, -2.54); A.x = -10.16: the chain ends at A.x, bridged to the pin.
      expect(layout.wires).toContainEqual({ a: { x: -10160, y: -2540 }, b: { x: -7620, y: -2540 }, net: "P" });
    });

    it("keeps a + chain's shunts below the line clear of a long label on the inverting input", () => {
      const n = "SUMMING_NODE_LEFT";
      const parts = [amp("O", n, "P"), res("R_P", "SIG", "P"), cap("C_P", "P", "GND"), res("R_F", n, "O")];
      valid(stage(parts, ["SIG", n, "O"]));
    });
  });

  describe("refusals", () => {
    const refuse = (parts: PartSpec[], external: string[]) => () => realiseBlock(stage(parts, external), "B", symbols);

    it("needs roles out, inv and noninv", () => {
      const c = blockCircuit([amp("O", "O", "P"), res("R_P", "SIG", "P")], withRoles({ out: "1", inv: "2" }), {
        external: ["SIG", "O"], splitUnits: [{ part: "U_OUT", units: [2, 3] }],
      });
      expect(() => realiseBlock(c, "B", symbols)).toThrow(/opamp-stage needs an anchor with roles out, inv and noninv/);
    });

    it("holds one op-amp unit and two-terminal parts only", () => {
      const c = blockCircuit([amp("O", "O", "P"), res("R_P", "SIG", "P")], R, { external: ["SIG", "O"] });
      expect(() => realiseBlock(c, "B", symbols)).toThrow(/opamp-stage holds one op-amp unit and two-terminal parts; U_OUT#2 is neither/);
    });

    it("needs + above - with the output on the right", () => {
      const c = blockCircuit([amp("O", "N", "P"), res("R_P", "SIG", "P"), res("R_F", "N", "O")], withRoles({ out: "1", inv: "3", noninv: "2" }), {
        external: ["SIG", "O"], splitUnits: [{ part: "U_OUT", units: [2, 3] }],
      });
      expect(() => realiseBlock(c, "B", symbols)).toThrow(/opamp-stage expects the non-inverting input above the inverting input with the output on the right/);
    });

    it("needs every role pin connected", () => {
      const open: PartSpec = { ...amp("O", "O", "P"), pins: { ...amp("O", "O", "P").pins, "3": { nc: true, identity: "+" } } };
      expect(refuse([open], ["O"])).toThrow(/opamp-stage pins out, inv and noninv must all be connected/);
    });

    it("refuses + on the output or - net", () => {
      expect(refuse([amp("O", "N", "O"), res("R_F", "N", "O")], ["O"])).toThrow(/opamp-stage: noninv shares net O with out/);
      expect(refuse([amp("O", "N", "N"), res("R_F", "N", "O")], ["O"])).toThrow(/opamp-stage: noninv shares net N with inv/);
    });

    it("refuses a non-role op-amp pin on a signal net", () => {
      const bad: PartSpec = {
        label: "U_EXP", refPrefix: "U", libId: "Fix:OPAMP1P", units: [1], value: "OPAMP1P", footprint: "F", bom: TEST_BOM,
        dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
        pins: {
          "1": { net: "BUF", identity: "OUT" }, "2": { net: "GND", identity: "V-" }, "3": { net: "TIPF", identity: "+" },
          "4": { net: "BUF", identity: "-" }, "5": { net: "SIG", identity: "V+" },
        },
      };
      const r1: Rendering = { kind: "wired", template: "opamp-stage", anchor: { part: "U_EXP", unit: 1, roles: { out: "1", inv: "4", noninv: "3" } } };
      const c = blockCircuit([bad, res("R_TIP", "TIP", "TIPF")], r1, { external: ["TIP", "SIG", "BUF"] });
      expect(() => realiseBlock(c, "B", symbols)).toThrow(/opamp-stage: pin 5 of the op-amp is on SIG, which is neither a rail nor a role/);
    });

    it("refuses a part joining two terminals outside the feedback path", () => {
      expect(refuse([amp("O", "N", "P"), res("R_IN", "SIG", "P"), cap("C_X", "N", "P"), res("R_F", "N", "O")], ["SIG", "O"])).toThrow(
        /C_X joins N and P outside the feedback path/,
      );
    });

    it("refuses a part reaching no terminal", () => {
      expect(refuse([amp("O", "O", "P"), res("R_IN", "SIG", "P"), res("R_Z", "Q1", "Q2")], ["SIG", "O", "Q1", "Q2"])).toThrow(
        /R_Z reaches none of the op-amp's out, inv and noninv nets/,
      );
    });

    it("refuses an input chain that passes through its terminal", () => {
      const parts = [amp("O", "O", "P"), res("R_IN", "SIG", "X"), res("R_X", "X", "P"), res("R_PY", "P", "Y"), cap("C_Y", "Y", "GND")];
      expect(refuse(parts, ["SIG", "O"])).toThrow(/chain toward P must end at P/);
    });

    it("passes any other chain reason through", () => {
      const parts = [amp("O", "O", "P"), res("R_1", "P", "X"), res("R_2", "X", "Y"), res("R_3", "Y", "P")];
      expect(refuse(parts, ["O"])).toThrow(/series parts form a loop/);
    });

    it("refuses an up shunt on the inverting chain", () => {
      const parts = [amp("O", "N", "VREF"), res("R_IN", "SIG", "N"), res("R_PU", "N", "3V3"), res("R_F", "N", "O")];
      expect(refuse(parts, ["SIG", "VREF", "O"])).toThrow(/inverting-input chain cannot hang R_PU above the line/);
    });

    it("refuses inputs that reach the op-amp from nowhere", () => {
      expect(refuse([amp("O", "O", "P")], ["O"])).toThrow(/P reaches the non-inverting input from nowhere/);
      expect(refuse([amp("O", "N", "VREF"), res("R_F", "N", "O")], ["VREF", "O"])).toThrow(/N reaches the inverting input from nowhere/);
    });

    it("refuses an input net that leaves the block and has parts here", () => {
      expect(refuse([amp("O", "O", "P"), res("R_IN", "SIG", "P"), cap("C_P", "P", "GND")], ["SIG", "O", "P"])).toThrow(
        /opamp-stage: input net P leaves the block and has parts here/,
      );
    });
  });
});
