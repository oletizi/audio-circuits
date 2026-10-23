/**
 * Ported from digital-pedal-platform's `tools/schgen/report.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, labelsCircuit, RAILS, res, symbols } from "./__fixtures__/circuits.ts";
import { TEST_BOM } from "./__fixtures__/fixture-lib.ts";
import type { PartSpec } from "../../lib/schgen/ir/types.ts";
import { layoutSheet } from "../../lib/schgen/render/sheets.ts";
import { buildReport, renderReport } from "../../lib/schgen/report.ts";

// Block "B" (labels, reason "fixture") holds the dummy load R1; DEC is the wired block.
const c = labelsCircuit([cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND"), res("R1", "3V3", "GND")], {
  rails: RAILS.filter((r) => r.net !== "VDDA").map((r) => ({ ...r, pwrFlag: { sheet: "s" } })),
  notes: [],
  checklist: [],
  others: [{ id: "DEC", sheet: "s", title: "D", members: ["C1", "C2"], checklist: [], rendering: { kind: "wired", template: "decoupling-bank", anchor: null } }],
});

describe("render report", () => {
  const drawing = layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG");
  const md = renderReport(buildReport(c, [drawing]));

  it("lists templates and label-rendered blocks with reasons", () => {
    expect(md).toContain("| DEC | s | wired | decoupling-bank |");
  });

  it("counts per sheet", () => {
    expect(md).toMatch(/\| s \| 3 \| 3 \| \d+ \| 0 \| \d+ \| 0 \| \d+ \|/);
  });

  it("prints None. under empty sections and is byte-stable", () => {
    expect(md).toMatch(/## Pins declared not connected in bulk\n\nNone\.\n/);
    expect(renderReport(buildReport(c, [layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG")]))).toBe(md);
  });
});

describe("render report: pins declared not connected in bulk", () => {
  // Supplies on nets; every other pin of the op-amp declared not connected in bulk.
  const amp: PartSpec = {
    label: "U_AMP", refPrefix: "U", libId: "Fix:OPAMP2", units: [1, 2, 3], value: "OPA1688", footprint: "F", bom: TEST_BOM,
    dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: { reason: "spare pins" },
    pins: { "4": { net: "GND", identity: "V-" }, "8": { net: "3V3", identity: "V+" } },
  };
  const nc = labelsCircuit([amp, res("R1", "3V3", "GND")], { rails: [], notes: [], checklist: [], others: [] });

  it("lists the part, its reason and every nc-unlisted pin in pin order", () => {
    expect(buildReport(nc, []).ncUnlisted).toEqual([{ part: "U_AMP", reason: "spare pins", pins: ["1", "2", "3", "5", "6", "7"] }]);
    expect(renderReport(buildReport(nc, []))).toMatch(/## Pins declared not connected in bulk\n\n- U_AMP \(spare pins\): 6 pins: 1, 2, 3, 5, 6, 7\n/);
  });
});
