/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pageRefs.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, RAILS, res, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { CircuitSpec } from "../../../lib/schgen/ir/types.ts";
import { intersheetRefs, refsMatchProblems, sheetPage } from "../../../lib/schgen/render/page-refs.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const PARTS = [cap("C1", "3V3", "GND"), res("R_T", "3V3", "TAP"), res("R_B", "TAP", "GND"), res("R_L", "TAP", "MID"), res("R_M", "MID", "GND")];
const spec: CircuitSpec = {
  parts: PARTS,
  blocks: [
    { id: "DEC", sheet: "pwr", title: "Decoupling", members: ["C1"], checklist: [], rendering: { kind: "wired", template: "decoupling-bank", anchor: null } },
    { id: "DIV", sheet: "pwr", title: "Divider", members: ["R_T", "R_B"], checklist: [], rendering: { kind: "wired", template: "divider", anchor: null } },
    { id: "LOAD", sheet: "io", title: "Load", members: ["R_L"], checklist: [], rendering: { kind: "bus", groups: [] } },
    { id: "MIDL", sheet: "io", title: "Mid load", members: ["R_M"], checklist: [], rendering: { kind: "bus", groups: [] } },
  ],
  sheets: [
    { id: "pwr", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] },
    { id: "io", title: "IO", file: "io.kicad_sch", paper: "A4", notes: [] },
  ],
  rails: RAILS,
  orientations: noOrientationPreferences(PARTS),
  portDirections: NO_PORT_DIRECTIONS,
};
const c = buildCircuit(spec, { symbols });

describe("sheetPage", () => {
  it("numbers sheets from 2 in circuit order (the root is page 1)", () => {
    expect([sheetPage(c, "pwr"), sheetPage(c, "io")]).toEqual([2, 3]);
    expect(() => sheetPage(c, "nope")).toThrow(/sheet nope is not a sheet of the circuit/);
  });
});

describe("intersheetRefs", () => {
  it("lists, for each labelled net, every page its labels are on, own page included, as KiCad prints them", () => {
    const refs = intersheetRefs(c);
    expect(refs.get("TAP")).toBe("[2,3]");
    expect(refs.get("MID")).toBe("[3]");
  });

  // **AGAINST `refsMatchProblems` AND NOT `assertRefsMatchDrawings`, WHICH IS DELETED.** Task 3 of
  // `docs/superpowers/plans/2026-10-27-gates-classify.md` made this a GENERATION-level finding -
  // `tools/schgen/generate.ts` tags each line `reference-disagreement`, which `findings.ts` classes
  // `defective`, so the drawing is marked rather than withheld. The throwing wrapper was left with
  // this test as its only caller, which would have kept a refusal path green that production had
  // abandoned; `CLAUDE.md`'s *supersede means delete*. The assertion is STRONGER as a result: it
  // compares the exact problem list instead of matching a regex against a thrown message.
  it("agrees with the pages the laid-out sheets actually draw each label on, and reports a drawing that disagrees", () => {
    const drawings = c.sheets.map((s) => layoutSheet(c, s.id, symbols, "Pwr:PWR_FLAG"));
    expect(refsMatchProblems(c, drawings)).toEqual([]);
    const [pwr, io] = drawings;
    const stray = { ...pwr!, labels: [...pwr!.labels, { net: "MID", at: { x: 0, y: 0 }, side: "left" as const, refs: "[3]" }] };
    expect(refsMatchProblems(c, [stray, io!])).toEqual(["net MID: its labels print [3] but are drawn on pages [2,3]"]);
  });

  it("gives rails none: they are drawn as power symbols, which carry no page reference", () => {
    const refs = intersheetRefs(c);
    expect(refs.has("GND")).toBe(false);
    expect(refs.has("3V3")).toBe(false);
  });
});
