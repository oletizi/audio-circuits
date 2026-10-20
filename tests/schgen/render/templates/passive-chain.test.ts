/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/passiveChain.test.ts`, and
 * DIVERGED from it by Task 8 of the M1 schematic-authoring plan: twelve assertions compared a
 * `classifyChain` refusal against `{ ok: false, reason }`, and its false arm now carries a
 * classified `Mismatch`.
 *
 * **The assertions got STRONGER rather than being relaxed to pass.** Each now states the KIND as
 * well as the reason, so a site that silently became `invalid-geometry` or `clearance` - which
 * would send a block to a refusal instead of to another renderer - fails here. That is the one
 * edit ruling R4 allows to a ported test's assertions: the widening this task performs requires
 * it, and it is part of the declared divergence rather than a fix smuggled in to make a test green.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, cap, diode, res, symbols } from "../../__fixtures__/circuits.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";
import { classifyChain, type Classified } from "../../../../lib/schgen/render/templates/passive-chain.ts";

const CHAIN = { kind: "wired" as const, template: "passive-chain" as const, anchor: null };

/**
 * The refusal every site in `classifyChain` produces: a shape test over the subgraph, with nothing
 * drawn. Written once here so each assertion below reads as it did and still pins the kind.
 */
const notApplicable = (reason: string): Classified => ({ ok: false, mismatch: { kind: "not-applicable", reason } });

describe("passive-chain", () => {
  it("draws an input chain: series parts in line, a parallel pair, shunts to ground, ends labelled", () => {
    const parts = [
      res("R_RF", "TIP", "N_RF"),
      cap("C_RF", "N_RF", "GND"),
      diode("D_ESD", "N_RF", "GND"),
      cap("C_IN", "N_RF", "N_DIV"),
      res("R_DIV1", "N_DIV", "T"),
      cap("C_COMP", "N_DIV", "T"),
      cap("C_T", "T", "GND"),
      res("R_DIV2", "T", "VMID"),
    ];
    const c = blockCircuit(parts, CHAIN, { external: ["TIP", "T", "VMID"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual([
      "GND:down", "GND:down", "GND:down", "T:up", "TIP:left", "VMID:right",
    ]);
    const y = (label: string) => layout.placements.find((p) => p.part === label)?.at.y;
    expect(y("C_COMP")).toBeLessThan(y("R_DIV1")!);
  });

  it("puts a mid-chain pull-up above the line and a pull-down below", () => {
    const parts = [res("R_S1", "IN", "MID"), res("R_S2", "MID", "OUT"), res("R_PU", "MID", "3V3"), cap("C_PD", "MID", "GND")];
    const c = blockCircuit(parts, CHAIN, { external: ["IN", "OUT"] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    const at = (l: string) => layout.placements.find((p) => p.part === l)!.at;
    expect(at("R_PU").y).toBeLessThan(at("R_S1").y);
    expect(at("C_PD").y).toBeGreaterThan(at("R_S1").y);
  });

  it("runs from one supply rail to another (input filter shape)", () => {
    const c = blockCircuit([res("D_REV", "3V3", "N_SCH"), cap("C_SCH", "N_SCH", "GND"), res("FB_IN", "N_SCH", "VDDA")], CHAIN, { external: [] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:left", "GND:down", "VDDA:right"]);
  });

  it("draws a ferrite between two supply rails as a one-step chain", () => {
    const c = blockCircuit([res("FB_VDDA", "3V3", "VDDA")], CHAIN, { external: [] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:left", "VDDA:right"]);
  });

  it("makes a pull-up at an open end the chain's last step", () => {
    const c = blockCircuit([res("R_S", "IN", "NODE"), res("R_PU", "NODE", "3V3"), cap("C_D", "NODE", "GND")], CHAIN, { external: ["IN", "NODE"] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["3V3:right", "GND:down", "IN:left", "NODE:up"]);
  });

  it("parallels a second unit to the same rail at an open end into that rail step", () => {
    const c = blockCircuit([res("R_S", "IN", "NODE"), res("R_PU1", "NODE", "3V3"), res("R_PU2", "NODE", "3V3")], CHAIN, { external: ["IN"] });
    const g = subgraphOf(c, "B", symbols);
    const r = classifyChain(g.units, g, null, null);
    expect(r.ok && r.spec.nodes).toEqual(["IN", "NODE", "3V3"]);
    expect(r.ok && r.spec.steps.map((s) => s.units.map((u) => u.part.label))).toEqual([["R_S"], ["R_PU1", "R_PU2"]]);
    expect(checkLayout(g, realiseBlock(c, "B", symbols))).toEqual([]);
    expect(unattachedWireEnds(g, realiseBlock(c, "B", symbols))).toEqual([]);
  });

  it("separates two parallel steps that meet at a bare internal node", () => {
    const parts = [res("R1", "A", "B"), cap("C1", "A", "B"), res("R2", "B", "C"), cap("C2", "B", "C")];
    const c = blockCircuit(parts, CHAIN, { external: ["A", "C"] });
    const g = subgraphOf(c, "B", symbols);
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layout.wires.filter((w) => w.net === "B" && w.a.y === w.b.y && w.a.y === layout.anchors[0]!.at.y)).toHaveLength(1);
  });

  it("leaves no dangling wire end at an unlabelled chain end, at either end", () => {
    for (const parts of [
      [res("R1", "A", "N"), cap("C1", "N", "GND")],
      [res("R1", "N", "A"), cap("C1", "N", "GND")],
    ]) {
      const c = blockCircuit(parts, CHAIN, { external: ["A"] });
      const g = subgraphOf(c, "B", symbols);
      const layout = realiseBlock(c, "B", symbols);
      expect(checkLayout(g, layout)).toEqual([]);
      expect(unattachedWireEnds(g, layout)).toEqual([]);
    }
  });

  it("labels a lone node once", () => {
    const c = blockCircuit([cap("C1", "N", "GND"), cap("C2", "N", "GND")], CHAIN, { external: ["N"] });
    const layout = realiseBlock(c, "B", symbols);
    expect(checkLayout(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(unattachedWireEnds(subgraphOf(c, "B", symbols), layout)).toEqual([]);
    expect(layout.anchors.map((a) => `${a.net}:${a.side}`).sort()).toEqual(["GND:down", "GND:down", "N:left"]);
  });

  it("refuses a branching network", () => {
    const c = blockCircuit([res("R1", "A", "N"), res("R2", "N", "B"), res("R3", "N", "C")], CHAIN, { external: ["A", "B", "C"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/series parts do not form a simple path: node N has 3 series neighbours/);
  });

  it("refuses a part across two rails", () => {
    const c = blockCircuit([res("R1", "A", "B"), cap("C9", "3V3", "GND")], CHAIN, { external: ["A", "B"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(/C9 has both pins on rails \(3V3, GND\)/);
  });
});

describe("classifyChain direction hints", () => {
  const c = blockCircuit([res("R_S1", "IN", "MID"), res("R_S2", "MID", "OUT")], CHAIN, { external: ["IN", "OUT"] });
  const g = subgraphOf(c, "B", symbols);

  it("orders nodes by member order with no hint, and from the far end when lastHint names an end", () => {
    const free = classifyChain(g.units, g, null, null);
    expect(free.ok && free.spec.nodes).toEqual(["IN", "MID", "OUT"]);
    const toIn = classifyChain(g.units, g, null, "IN");
    expect(toIn.ok && toIn.spec.nodes).toEqual(["OUT", "MID", "IN"]);
    expect(toIn.ok && toIn.spec.steps.map((s) => s.units.map((u) => u.part.label))).toEqual([["R_S2"], ["R_S1"]]);
  });

  it("refuses a hint that is not an end, and contradictory hints", () => {
    expect(classifyChain(g.units, g, null, "MID")).toEqual(notApplicable("MID is not an end of the chain"));
    expect(classifyChain(g.units, g, "IN", "IN")).toEqual(notApplicable("chain cannot run from IN to IN"));
  });

  it("honours firstHint, refuses a firstHint that is not an end, and accepts consistent hints", () => {
    const fromOut = classifyChain(g.units, g, "OUT", null);
    expect(fromOut.ok && fromOut.spec.nodes).toEqual(["OUT", "MID", "IN"]);
    expect(classifyChain(g.units, g, "MID", null)).toEqual(notApplicable("MID is not an end of the chain"));
    const both = classifyChain(g.units, g, "OUT", "IN");
    expect(both.ok && both.spec.nodes).toEqual(["OUT", "MID", "IN"]);
    expect(classifyChain(g.units, g, "MID", "OUT")).toEqual(notApplicable("chain cannot run from MID to OUT"));
  });

  it("lets either hint name the lone node of a zero-step chain", () => {
    const lone = blockCircuit([cap("C1", "N", "GND"), cap("C2", "N", "GND")], CHAIN, { external: ["N"] });
    const lg = subgraphOf(lone, "B", symbols);
    const r = classifyChain(lg.units, lg, "N", "N");
    expect(r.ok && r.spec.nodes).toEqual(["N"]);
    expect(r.ok && r.spec.steps).toEqual([]);
  });
});

describe("classifyChain refusals", () => {
  const classify = (parts: Parameters<typeof blockCircuit>[0], external: string[]) => {
    const g = subgraphOf(blockCircuit(parts, CHAIN, { external }), "B", symbols);
    return classifyChain(g.units, g, null, null);
  };

  it("refuses a part with a pin not connected", () => {
    const g = subgraphOf(blockCircuit([res("R1", "A", "B")], CHAIN, { external: ["A", "B"] }), "B", symbols);
    const u = g.units[0]!;
    const broken = { ...u, pins: [u.pins[0]!, { ...u.pins[1]!, net: null }] };
    expect(classifyChain([broken], g, null, null)).toEqual(
      notApplicable("passive-chain needs two-terminal parts with both pins connected; R1#1 pin 2 is not connected"),
    );
  });

  it("refuses an empty block", () => {
    const g = subgraphOf(blockCircuit([res("R1", "A", "B")], CHAIN, { external: ["A", "B"] }), "B", symbols);
    expect(classifyChain([], g, null, null)).toEqual(notApplicable("passive-chain block has no parts"));
  });

  it("refuses rail-to-rail parts that do not all join the same two supply rails", () => {
    const base = subgraphOf(blockCircuit([res("R1", "3V3", "VDDA"), res("R2", "VDDA", "SUP_X")], CHAIN, { external: [] }), "B", symbols);
    const g = { ...base, rails: new Set([...base.rails, "SUP_X"]) };
    expect(classifyChain(g.units, g, null, null)).toEqual(notApplicable("passive-chain needs at least one non-rail node"));
  });

  it("refuses a rail-to-ground part even with no non-rail net", () => {
    expect(classify([cap("C1", "3V3", "GND")], [])).toEqual(notApplicable("C1 has both pins on rails (3V3, GND)"));
  });

  it("refuses series parts that form separate chains", () => {
    expect(classify([res("R1", "A", "B"), res("R2", "C", "D")], ["A", "B", "C", "D"])).toEqual(
      notApplicable("series parts form 2 separate chains"),
    );
  });

  it("refuses series parts that form a loop", () => {
    expect(classify([res("R1", "A", "B"), res("R2", "B", "C"), res("R3", "C", "A")], ["A"])).toEqual(
      notApplicable("series parts form a loop through A"),
    );
  });

  it("refuses shunt-only parts on several non-rail nets", () => {
    expect(classify([cap("C1", "A", "GND"), cap("C2", "B", "GND")], ["A", "B"])).toEqual(
      notApplicable("series parts form 2 separate chains"),
    );
  });

  it("refuses a shunt that hangs from a net off the chain", () => {
    expect(classify([res("R1", "A", "B"), cap("C1", "X", "GND")], ["A", "B", "X"])).toEqual(
      notApplicable("C1 hangs from X, which is not on the chain"),
    );
  });

  it("reports a classifier refusal as the template's generation error", () => {
    const c = blockCircuit([res("R1", "A", "B"), res("R2", "C", "D")], CHAIN, { external: ["A", "B", "C", "D"] });
    expect(() => realiseBlock(c, "B", symbols)).toThrow(
      'block B has rendering="wired" but template passive-chain cannot realise its subgraph: series parts form 2 separate chains',
    );
  });
});
