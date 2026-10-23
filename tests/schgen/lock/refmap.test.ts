/**
 * Ported from digital-pedal-platform's `tools/schgen/lock/refmap.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, labelsCircuit, RAILS, res } from "../__fixtures__/circuits.ts";
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts";
import { renderRefmap } from "../../../lib/schgen/lock/refmap.ts";

const GND = RAILS.filter((r) => r.net === "GND");

describe("renderRefmap", () => {
  it("lists references in natural order with label, sheet, block, value and MPN", () => {
    const parts = Array.from({ length: 10 }, (_, i) => res(`R_${String.fromCharCode(65 + i)}`, "X", "GND"));
    const c = labelsCircuit(parts, { rails: GND, notes: [], checklist: [], others: [] });
    const md = renderRefmap(c, annotate(c, EMPTY_LOCK, new Map()));
    const rows = md.split("\n").filter((l) => /^\| R\d/.test(l));
    expect(rows[0]).toBe("| R1 | R_A | s | B | 10k | TEST-MPN |");
    expect(rows[9]).toBe("| R10 | R_J | s | B | 10k | TEST-MPN |");
  });

  it("states its source and lists retired references", () => {
    const first = labelsCircuit([res("R_A", "X", "GND"), res("R_B", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const lock = annotate(first, EMPTY_LOCK, new Map()).lock;
    const c = labelsCircuit([res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const md = renderRefmap(c, annotate(c, lock, new Map()));
    expect(md).toContain("generated from `refs.lock.json`");
    expect(md).toContain("| Reference | Former label |");
    expect(md).toContain("| R2 | R_B |");
  });

  it("refuses an annotation that lacks a part", () => {
    const c = labelsCircuit([res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    expect(() => renderRefmap(c, { refs: new Map(), lock: EMPTY_LOCK })).toThrow(/R_A has no reference/);
  });

  it("sorts across prefixes when references are out of part order", () => {
    const first = labelsCircuit([res("R_A", "X", "GND"), cap("C_A", "X", "GND"), res("R_B", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const lock = annotate(first, EMPTY_LOCK, new Map()).lock;
    const c = labelsCircuit([res("R_B", "X", "GND"), cap("C_A", "X", "GND"), res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const rows = renderRefmap(c, annotate(c, lock, new Map())).split("\n").filter((l) => /^\| [A-Z]+\d/.test(l));
    expect(rows.map((l) => l.split(" | ")[0])).toEqual(["| C1", "| R1", "| R2"]);
  });

  it("sorts the retired table naturally", () => {
    const names = Array.from({ length: 10 }, (_, i) => `R_${String.fromCharCode(65 + i)}`);
    const first = labelsCircuit(names.map((n) => res(n, "X", "GND")), { rails: GND, notes: [], checklist: [], others: [] });
    const lock = annotate(first, EMPTY_LOCK, new Map()).lock;
    const c = labelsCircuit([res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const md = renderRefmap(c, annotate(c, lock, new Map()));
    const retired = md.slice(md.indexOf("## Retired")).split("\n").filter((l) => /^\| R\d/.test(l));
    expect(retired[0]).toBe("| R2 | R_B |");
    expect(retired[8]).toBe("| R10 | R_J |");
  });

  it("escapes pipes in table cells", () => {
    const c = labelsCircuit([res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    const part = c.parts.get("R_A");
    if (part === undefined) throw new Error("fixture");
    const odd = { ...c, parts: new Map([["R_A", { ...part, value: "a|b" }]]) };
    expect(renderRefmap(odd, annotate(c, EMPTY_LOCK, new Map()))).toContain("| a\\|b |");
  });

  it("states the rename trade-off", () => {
    const c = labelsCircuit([res("R_A", "X", "GND")], { rails: GND, notes: [], checklist: [], others: [] });
    expect(renderRefmap(c, annotate(c, EMPTY_LOCK, new Map()))).toContain("Renaming a functional label");
  });
});
