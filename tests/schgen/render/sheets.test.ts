/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheets.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, RAILS, res, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { BlockSpec, CircuitSpec, Paper } from "../../../lib/schgen/ir/types.ts";
import { boxesOverlap, onGrid, type Side } from "../../../lib/schgen/render/geometry.ts";
import { layoutSheet, powerRotation } from "../../../lib/schgen/render/sheets.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const DEC = { kind: "wired" as const, template: "decoupling-bank" as const, anchor: null };
const DIV = { kind: "wired" as const, template: "divider" as const, anchor: null };

function spec(paper: Paper, extraBlocks = 0): CircuitSpec {
  const parts = [cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND"), res("R_T", "3V3", "TAP"), res("R_B", "TAP", "GND"), res("R_L", "TAP", "GND")];
  const blocks: BlockSpec[] = [
    { id: "DEC", sheet: "s", title: "Decoupling", members: ["C1", "C2"], checklist: ["CORE-01"], rendering: DEC },
    { id: "DIV", sheet: "s", title: "Strap", members: ["R_T", "R_B"], checklist: [], rendering: DIV },
    { id: "LOAD", sheet: "s", title: "Load", members: ["R_L"], checklist: [], rendering: { kind: "bus", groups: [] } },
  ];
  for (let i = 0; i < extraBlocks; i += 1) {
    parts.push(cap(`CX${i}`, "3V3", "GND"), cap(`CY${i}`, "3V3", "GND"));
    blocks.push({ id: `X${i}`, sheet: "s", title: `Extra ${i}`, members: [`CX${i}`, `CY${i}`], checklist: [], rendering: DEC });
  }
  return {
    parts, blocks,
    sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper, notes: [{ lines: ["Layout note line 1", "line 2"], checklist: ["CORE-22"] }] }],
    rails: RAILS.map((r) => (r.net === "3V3" ? { ...r, pwrFlag: { sheet: "s" } } : r)),
    orientations: noOrientationPreferences(parts),
    portDirections: NO_PORT_DIRECTIONS,
  };
}

describe("layoutSheet", () => {
  const d = layoutSheet(buildCircuit(spec("A4"), { symbols }), "s", symbols, "Pwr:PWR_FLAG");

  it("keeps every connection point on the grid", () => {
    const points = [
      ...d.symbols.map((s) => s.at), ...d.powers.map((p) => p.at), ...d.labels.map((l) => l.at),
      ...d.wires.flatMap((w) => [w.a, w.b]), ...d.noConnects, ...d.junctions,
    ];
    expect(points.filter((p) => !onGrid(p))).toEqual([]);
  });

  it("packs frames without overlap and titles them with their checklist ids", () => {
    for (let i = 0; i < d.frames.length; i += 1) {
      for (let j = i + 1; j < d.frames.length; j += 1) expect(boxesOverlap(d.frames[i]!.box, d.frames[j]!.box)).toBe(false);
    }
    expect(d.frames.map((f) => f.title)).toEqual(["Decoupling [CORE-01]", "Strap", "Load", "Notes", "Power flags"]);
    expect(d.texts.map((t) => t.text)).toContain("line 2 [CORE-22]");
  });

  it("labels the TAP net in both blocks it crosses", () => {
    expect(d.labels.filter((l) => l.net === "TAP")).toHaveLength(2);
  });

  it("puts cosmetic junctions exactly at the split taps", () => {
    // DEC: the left end of each rail row (pin + row wire + anchor stub), 2; DIV: R_B's end of the TAP row
    // (pin + row wire + right stub), 1. Power symbols and PWR_FLAG meet only one wire end or pin each.
    expect(d.junctions).toHaveLength(3);
  });

  it("puts a PWR_FLAG on the flagged rail at the same point as a 3V3 power symbol", () => {
    const flag = d.powers.find((p) => p.flag);
    expect(flag?.net).toBe("3V3");
    expect(d.powers.some((p) => !p.flag && p.net === "3V3" && p.at.x === flag?.at.x && p.at.y === flag?.at.y)).toBe(true);
  });

  it("refuses to overflow the paper instead of enlarging it", () => {
    const big = buildCircuit(spec("A4", 200), { symbols });
    expect(() => layoutSheet(big, "s", symbols, "Pwr:PWR_FLAG")).toThrow(/sheet s: blocks do not fit on A4; give the sheet a larger paper in its SheetSpec/);
  });
});

describe("powerRotation", () => {
  it("points ground bodies away from the circuit", () => {
    expect(powerRotation("ground", "down")).toBe(0);
    expect(powerRotation("ground", "up")).toBe(180);
    expect(powerRotation("supply", "up")).toBe(0);
    expect(powerRotation("supply", "right")).toBe(270);
  });

  it("covers every side of both kinds", () => {
    const groundSides: Side[] = ["down", "up", "right", "left"];
    const supplySides: Side[] = ["up", "down", "left", "right"];
    expect(groundSides.map((s) => powerRotation("ground", s))).toEqual([0, 180, 90, 270]);
    expect(supplySides.map((s) => powerRotation("supply", s))).toEqual([0, 180, 90, 270]);
  });
});

describe("layoutSheet details and refusals", () => {
  const c = buildCircuit(spec("A4"), { symbols });
  const d = layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG");

  it("keeps every frame inside the margins and above the title block", () => {
    for (const f of d.frames) {
      expect(f.box.minX).toBeGreaterThanOrEqual(12700);
      expect(f.box.minY).toBeGreaterThanOrEqual(12700);
      expect(f.box.maxX).toBeLessThanOrEqual(d.paper.w - 12700);
      expect(f.box.maxY).toBeLessThanOrEqual(d.paper.h - 12700 - 38100);
    }
    expect(d.paper).toEqual({ w: 297000, h: 210000 });
  });

  it("draws each block inside its own frame", () => {
    const inside = (p: { x: number; y: number }, id: string) => {
      const b = d.frames.find((f) => f.blockId === id)!.box;
      return b.minX < p.x && p.x < b.maxX && b.minY < p.y && p.y < b.maxY;
    };
    const blockOf = new Map([["C1", "DEC"], ["C2", "DEC"], ["R_T", "DIV"], ["R_B", "DIV"], ["R_L", "LOAD"]]);
    for (const s of d.symbols) expect(inside(s.at, blockOf.get(s.part)!)).toBe(true);
  });

  it("gives rails power symbols with the rail's library symbol and labels only to other nets", () => {
    expect(d.labels.every((l) => !c.rails.has(l.net))).toBe(true);
    const blockPowers = d.powers.filter((p) => !p.flag);
    expect(blockPowers.filter((p) => p.net === "GND").every((p) => p.libId === "Pwr:GND")).toBe(true);
    expect(blockPowers.filter((p) => p.net === "3V3").every((p) => p.libId === "Pwr:+3V3")).toBe(true);
    expect(d.powers.filter((p) => p.flag)).toEqual([expect.objectContaining({ libId: "Pwr:PWR_FLAG", net: "3V3" })]);
  });

  it("omits the notes and power flags frames when the sheet has neither", () => {
    const plain = spec("A4");
    const c2 = buildCircuit({ ...plain, rails: RAILS, sheets: plain.sheets.map((s) => ({ ...s, notes: [] })) }, { symbols });
    const d2 = layoutSheet(c2, "s", symbols, "Pwr:PWR_FLAG");
    expect(d2.frames.map((f) => f.title)).toEqual(["Decoupling [CORE-01]", "Strap", "Load"]);
    expect(d2.powers.some((p) => p.flag)).toBe(false);
  });

  it("puts a no-connect at the end of every NC pin", () => {
    const r = res("R_NC", "TAP", "GND");
    const nc = { ...r, pins: { "1": r.pins["1"]!, "2": { nc: true as const, identity: "" } } };
    const base = spec("A4");
    const c3 = buildCircuit(
      {
        ...base,
        parts: [...base.parts, nc],
        blocks: [...base.blocks, { id: "NCB", sheet: "s", title: "NC", members: ["R_NC"], checklist: [], rendering: { kind: "bus", groups: [] } }],
        // The spread carries `base`'s orientation map, which does not cover the part added here.
        // `buildCircuit` refuses a hole in it by name (ruling R29) - and it DID, on this call site,
        // which is the clearest evidence that refusal is not decorative.
        orientations: noOrientationPreferences([...base.parts, nc]),
      },
      { symbols },
    );
    const d3 = layoutSheet(c3, "s", symbols, "Pwr:PWR_FLAG");
    expect(d3.noConnects).toHaveLength(1);
    expect(d.noConnects).toEqual([]);
  });

  it("refuses an unknown sheet", () => {
    expect(() => layoutSheet(c, "nope", symbols, "Pwr:PWR_FLAG")).toThrow(/unknown sheet nope/);
  });

  it("refuses a PWR_FLAG symbol that is not a one-pin power symbol at its origin", () => {
    expect(() => layoutSheet(c, "s", symbols, "Fix:R")).toThrow(/PWR_FLAG symbol Fix:R must be a power symbol with one pin at its origin/);
  });

  it("refuses a rail whose symbol is not a one-pin power symbol at its origin", () => {
    const base = spec("A4");
    const bad = buildCircuit({ ...base, rails: base.rails.map((r) => (r.net === "GND" ? { ...r, symbol: "Fix:C" } : r)) }, { symbols });
    expect(() => layoutSheet(bad, "s", symbols, "Pwr:PWR_FLAG")).toThrow(/rail GND: power symbol Fix:C must be a power symbol with one pin at its origin/);
  });

  it("accepts the same circuit on a larger paper", () => {
    const big = buildCircuit(spec("A1", 40), { symbols });
    expect(layoutSheet(big, "s", symbols, "Pwr:PWR_FLAG").paper).toEqual({ w: 841000, h: 594000 });
  });

  it("is deterministic", () => {
    expect(layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG")).toEqual(d);
  });
});
