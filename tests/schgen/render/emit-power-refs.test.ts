/**
 * Ported from digital-pedal-platform's `tools/schgen/render/emitPowerRefs.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { parse } from "../../../lib/kicad/sexpr.ts";
import { cap, RAILS, res, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { BlockSpec, CircuitSpec } from "../../../lib/schgen/ir/types.ts";
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts";
import { emitContext, emitSheet, powerRefs } from "../../../lib/schgen/render/emit.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

describe("powerRefs", () => {
  it("numbers #PWR and #FLG independently inside the sheet's block of 1000", () => {
    const pwr = powerRefs(2);
    expect([pwr.next(false), pwr.next(true), pwr.next(false)]).toEqual(["#PWR2001", "#FLG2001", "#PWR2002"]);
  });

  it("refuses more than 999 of a kind on one sheet", () => {
    const pwr = powerRefs(1);
    for (let i = 1; i <= 999; i += 1) pwr.next(false);
    expect(pwr.next(true)).toBe("#FLG1001");
    expect(() => pwr.next(false)).toThrow("more than 999 #PWR references on sheet 1");
  });

  it("refuses a sheet ordinal that is not a positive integer", () => {
    expect(() => powerRefs(0)).toThrow("power references: sheet ordinal 0 is not a positive integer");
    expect(() => powerRefs(1.5)).toThrow("power references: sheet ordinal 1.5 is not a positive integer");
  });
});

/** Two sheets; `extra` adds a labels-rendered resistor (two more power symbols) to sheet "a". */
function twoSheets(extra: boolean): CircuitSpec {
  const blocks: BlockSpec[] = [
    { id: "DA", sheet: "a", title: "A", members: ["C1", "C2"], checklist: [], rendering: { kind: "wired", template: "decoupling-bank", anchor: null } },
    { id: "DB", sheet: "b", title: "B", members: ["C3", "C4"], checklist: [], rendering: { kind: "wired", template: "decoupling-bank", anchor: null } },
  ];
  const parts = [cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND"), cap("C3", "3V3", "GND"), cap("C4", "3V3", "GND"), ...(extra ? [res("R9", "3V3", "GND")] : [])];
  return {
    parts,
    blocks: extra ? [...blocks, { id: "LA", sheet: "a", title: "L", members: ["R9"], checklist: [], rendering: { kind: "bus", groups: [] } }] : blocks,
    sheets: [
      { id: "a", title: "A", file: "a.kicad_sch", paper: "A4", notes: [] },
      { id: "b", title: "B", file: "b.kicad_sch", paper: "A4", notes: [] },
    ],
    rails: RAILS,
    orientations: noOrientationPreferences(parts),
    portDirections: NO_PORT_DIRECTIONS,
  };
}

function emitted(extra: boolean): Map<string, string> {
  const c = buildCircuit(twoSheets(extra), { symbols });
  const ctx = emitContext("mini", c, symbols, annotate(c, EMPTY_LOCK, new Map()).refs, []);
  return new Map(c.sheets.map((s) => [s.id, emitSheet(layoutSheet(c, s.id, symbols, "Pwr:PWR_FLAG"), ctx)]));
}

function powerReferences(text: string): string[] {
  return parse(text)
    .lists.filter((s) => s.head === "symbol" && s.lists.some((l) => l.head === "lib_id" && l.atoms[1]?.value.startsWith("Pwr:")))
    .flatMap((s) => s.lists.filter((p) => p.head === "property" && p.atoms[1]?.value === "Reference").map((p) => p.atoms[2]?.value ?? ""));
}

describe("emitSheet power references", () => {
  it("numbers each sheet in its own block, unique across the project", () => {
    const sheets = emitted(false);
    const a = powerReferences(sheets.get("a") ?? "");
    const b = powerReferences(sheets.get("b") ?? "");
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((r) => /^#PWR1\d{3}$/.test(r))).toBe(true);
    expect(b.every((r) => /^#PWR2\d{3}$/.test(r))).toBe(true);
    expect(new Set([...a, ...b]).size).toBe(a.length + b.length);
  });

  it("leaves other sheets byte-identical when a power symbol is added to one", () => {
    const before = emitted(false);
    const after = emitted(true);
    expect(powerReferences(after.get("a") ?? "").length).toBeGreaterThan(powerReferences(before.get("a") ?? "").length);
    expect(after.get("b")).toBe(before.get("b"));
  });
});
