/**
 * Ported from digital-pedal-platform's `tools/schgen/gates/traceability.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus this entry's declared
 * `cuts` (a deliberate content deletion - see `docs/known-gaps.md`), per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, labelsCircuit, RAILS } from "../__fixtures__/circuits.ts";
import { checklistIds, checkTraceability } from "../../../lib/schgen/gates/traceability.ts";

const MD = ["# x", "- [ ] **CORE-01** a", "- [x] **CORE-02** b", "- [ ] **OWN-01** c", "* not an item **CORE-99**"].join("\n");
const circuit = (partIds: string[], blockIds: string[], noteIds: string[]) =>
  labelsCircuit([{ ...cap("C1", "3V3", "GND"), checklist: partIds }, cap("C2", "3V3", "GND")], {
    rails: RAILS.filter((r) => r.net !== "VDDA"),
    notes: [{ lines: ["n"], checklist: noteIds }],
    checklist: blockIds,
    others: [],
  });

describe("checklistIds", () => {
  it("reads only item lines", () => {
    expect(checklistIds(MD)).toEqual(["CORE-01", "CORE-02", "OWN-01"]);
  });

  it.each([
    ["capital X", "- [X] **CORE-01** a"],
    ["one-digit number", "- [ ] **CORE-1** a"],
    ["lower-case prefix", "- [ ] **core-01** a"],
    ["extra indent space", "-  [ ] **CORE-01** a"],
    ["no bold", "- [ ] CORE-01 a"],
    ["three-digit number", "- [ ] **CORE-001** a"],
    ["star marker", "* [ ] **CORE-01** a"],
    ["empty brackets", "- [] **CORE-01** a"],
    ["two chars in brackets", "- [ x] **CORE-01** a"],
  ])("throws on a malformed item line: %s", (_name, line) => {
    expect(() => checklistIds(["# x", line].join("\n"))).toThrow(`SCHEMATIC-CHECKLIST.md line 2 looks like a checklist item but is malformed: ${line}`);
  });

  it("ignores a list-item link line", () => {
    expect(checklistIds("- [text](http://x) **CORE-99**\n- [ ] **CORE-01** a")).toEqual(["CORE-01"]);
  });

  it("throws on a repeated id", () => {
    expect(() => checklistIds("- [ ] **CORE-01** a\n- [x] **CORE-01** b")).toThrow("SCHEMATIC-CHECKLIST.md line 2 repeats checklist id CORE-01: - [x] **CORE-01** b");
  });
});

describe("checkTraceability", () => {
  const allIds = checklistIds(MD);

  it("passes when every id is drawn or explained", () => {
    expect(checkTraceability({ circuit: circuit(["CORE-01"], [], []), allIds, prefixes: ["CORE"], nonSchematic: [{ id: "CORE-02", reason: "layout note" }] })).toEqual([]);
  });

  it("reports an untraced id, an unknown reference and a double listing", () => {
    const p = checkTraceability({ circuit: circuit(["CORE-01", "CORE-77"], ["CORE-01"], []), allIds, prefixes: ["CORE"], nonSchematic: [{ id: "CORE-01", reason: "x" }] });
    expect(p).toContain("CORE-02 is referenced by no part, block or sheet note and is not listed in non-schematic.ts");
    expect(p).toContain("CORE-77 is referenced by part C1 but does not exist in SCHEMATIC-CHECKLIST.md");
    expect(p).toContain("CORE-01 is listed in non-schematic.ts but is also referenced by part C1");
  });

  it("counts sheet notes as references and requires a reason", () => {
    const p = checkTraceability({ circuit: circuit([], [], ["CORE-01"]), allIds, prefixes: ["CORE"], nonSchematic: [{ id: "CORE-02", reason: " " }] });
    expect(p).toEqual(["CORE-02 is listed in non-schematic.ts with an empty reason"]);
  });

  const base = { allIds, prefixes: ["CORE"] };

  it("throws on an invalid id in allIds", () => {
    expect(() => checkTraceability({ circuit: circuit([], [], []), allIds: ["CORE1"], prefixes: ["CORE"], nonSchematic: [] })).toThrow('checkTraceability: invalid checklist id "CORE1" in allIds');
  });

  it("reports a non-schematic id that is not in the checklist", () => {
    const p = checkTraceability({ ...base, circuit: circuit(["CORE-01"], [], []), nonSchematic: [{ id: "CORE-02", reason: "x" }, { id: "CORE-55", reason: "x" }] });
    expect(p).toEqual(["CORE-55 is listed in non-schematic.ts but does not exist in SCHEMATIC-CHECKLIST.md"]);
  });

  it("reports a duplicate non-schematic entry", () => {
    const p = checkTraceability({ ...base, circuit: circuit(["CORE-01"], [], []), nonSchematic: [{ id: "CORE-02", reason: "x" }, { id: "CORE-02", reason: "y" }] });
    expect(p).toEqual(["CORE-02 is listed in non-schematic.ts twice"]);
  });

  it("names a block and a sheet note that reference an unknown id", () => {
    const p = checkTraceability({ ...base, circuit: circuit(["CORE-01"], ["CORE-80"], ["CORE-81"]), nonSchematic: [{ id: "CORE-02", reason: "x" }] });
    expect(p).toEqual([
      "CORE-80 is referenced by block B but does not exist in SCHEMATIC-CHECKLIST.md",
      "CORE-81 is referenced by sheet note s#1 but does not exist in SCHEMATIC-CHECKLIST.md",
    ]);
  });

  it("names the part first, then the block, then the note when several reference one id", () => {
    const nonSchematic = [{ id: "CORE-01", reason: "x" }];
    const only = (c: ReturnType<typeof circuit>) => checkTraceability({ ...base, circuit: c, nonSchematic }).filter((m) => m.includes("also referenced"));
    expect(only(circuit(["CORE-01"], ["CORE-01"], ["CORE-01"]))).toEqual(["CORE-01 is listed in non-schematic.ts but is also referenced by part C1"]);
    expect(only(circuit([], ["CORE-01"], ["CORE-01"]))).toEqual(["CORE-01 is listed in non-schematic.ts but is also referenced by block B"]);
    expect(only(circuit([], [], ["CORE-01"]))).toEqual(["CORE-01 is listed in non-schematic.ts but is also referenced by sheet note s#1"]);
  });

  it("does not require ids outside the prefixes", () => {
    const ids = [...allIds, "BU-01"];
    expect(checkTraceability({ circuit: circuit(["CORE-01", "CORE-02"], [], []), allIds: ids, prefixes: ["CORE"], nonSchematic: [] })).toEqual([]);
    expect(checkTraceability({ circuit: circuit(["CORE-01", "CORE-02"], [], []), allIds: ids, prefixes: ["CORE", "BU"], nonSchematic: [] })).toEqual([
      "BU-01 is referenced by no part, block or sheet note and is not listed in non-schematic.ts",
    ]);
  });
});
