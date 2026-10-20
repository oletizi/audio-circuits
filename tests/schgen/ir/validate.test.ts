/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/validate.test.ts` (with the MCU pin-map
 * cuts of `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1
 * schematic-authoring plan: decision D3 deletes the `labels` rendering, and with it the V6 rule
 * "labels rendering needs a reason" that one test here exercised.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 *
 * **WHY THE SHARED RENDERING IS `auto` HERE AND `bus` IN `__fixtures__/circuits.ts`.** Every spec
 * in this file must validate CLEAN except for the one rule under test, and `bus` does not: the
 * `renderings` rule requires every non-rail net of a bus block to be in exactly one group, so
 * `{ kind: "bus", groups: [] }` would add "net X is in no bus group" to every assertion in the
 * file. `{ kind: "auto" }` has no rule of its own, which is what this block needs - it is here to
 * hold the parts, not to be rendered.
 */

import { describe, expect, it } from "bun:test";
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { CircuitSpec, PartSpec, Rendering } from "../../../lib/schgen/ir/types.ts";
import { validateCircuit } from "../../../lib/schgen/ir/validate.ts";

const symbols = fixtureResolver();
const res = (label: string, a: string, b: string): PartSpec =>
  twoPin({ label, refPrefix: "R", libId: "Fix:R", value: "1k", footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false });
const NO_TEMPLATE: Rendering = { kind: "auto" };
const base = (parts: PartSpec[], over: Partial<CircuitSpec> = {}): CircuitSpec => ({
  parts,
  blocks: [{ id: "B", sheet: "s", title: "B", members: parts.map((p) => p.label), checklist: [], rendering: NO_TEMPLATE }],
  sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
  rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
  ...over,
});
const problems = (spec: CircuitSpec) => validateCircuit(buildCircuit(spec, { symbols }), symbols);

describe("validateCircuit", () => {
  it("accepts a well-formed circuit", () => {
    expect(problems(base([res("R_A", "X", "GND"), res("R_B", "X", "GND")]))).toEqual([]);
  });

  it("V1: rejects a net that is not UPPER_SNAKE", () => {
    expect(problems(base([res("R_A", "x", "GND"), res("R_B", "x", "GND")]))).toContain('net "x" is not UPPER_SNAKE (^[A-Z0-9][A-Z0-9_]*$)');
  });

  it("V2: every part names its source; an empty or blank source is refused", () => {
    for (const source of ["", "   "]) {
      const p = problems(base([{ ...res("R_A", "X", "GND"), source }, res("R_B", "X", "GND")]));
      expect(p).toContain("part R_A: source is empty; name the design-note section or datasheet the part comes from");
    }
  });

  it("V3: reports an undeclared symbol pin", () => {
    const half: PartSpec = { ...res("R_A", "X", "GND"), pins: { "1": { net: "X", identity: "" } } };
    expect(problems(base([half, res("R_B", "X", "GND")]))).toContain("part R_A: pin 2 () is neither on a net nor declared not connected");
  });

  it("V4: reports a unit no block places", () => {
    const spec = base([res("R_A", "X", "GND"), res("R_B", "X", "GND")]);
    const unplaced = { ...spec, blocks: [{ ...spec.blocks[0]!, members: ["R_A"] }] };
    expect(problems(unplaced)).toContain("part R_B: unit 1 is placed by no block");
  });

  // The V6 test "requires a reason for label rendering" was here. Its rule is DELETED with the
  // `labels` rendering (D3) - `ir/validate.ts`'s one-line clause is removed by a declared `cuts`
  // entry in the port manifest - so the test is deleted with it rather than left as a stub
  // asserting a message nothing can produce. `docs/known-gaps.md` **G140** records the deletion.

  it("V6: every non-rail bus net is in exactly one group", () => {
    const spec = base([res("R_A", "X", "GND"), res("R_B", "X", "Y"), res("R_C", "Y", "GND")]);
    const bus: Rendering = { kind: "bus", groups: [{ name: "g1", nets: ["X"] }, { name: "g2", nets: ["X", "Q"] }] };
    const p = problems({ ...spec, blocks: [{ ...spec.blocks[0]!, rendering: bus }] });
    expect(p).toContain("block B: net Y is in no bus group");
    expect(p).toContain("block B: net X is in bus groups g1 and g2");
    expect(p).toContain("block B: bus group g2 lists Q, which no pin of the block is on");
  });

  it("V6: bus group names are unique", () => {
    const spec = base([res("R_A", "X", "GND"), res("R_B", "X", "GND")]);
    const bus: Rendering = { kind: "bus", groups: [{ name: "g1", nets: ["X"] }, { name: "g1", nets: ["X"] }] };
    const p = problems({ ...spec, blocks: [{ ...spec.blocks[0]!, rendering: bus }] });
    expect(p).toContain("block B: bus group g1 is declared twice");
    expect(p.some((m) => m.includes("in bus groups"))).toBe(false);
  });

  it("build: NC-declared pins carry net null", () => {
    const nc: PartSpec = { ...res("R_A", "X", "GND"), pins: { "1": { net: "X", identity: "" }, "2": { nc: true, identity: "" } } };
    const c = buildCircuit(base([nc, res("R_B", "X", "GND")]), { symbols });
    expect(c.pins.find((q) => q.part === "R_A" && q.pin === "2")?.net).toBeNull();
  });

  it("V7: rejects a single-pin net", () => {
    expect(problems(base([res("R_A", "LONELY", "GND"), res("R_B", "GND", "Z"), res("R_C", "Z", "GND")]))).toContain(
      "net LONELY has only one pin (R_A.1); connect it or declare the pin not connected",
    );
  });

  it("V8: a rail must be a power symbol", () => {
    const p = problems(base([res("R_A", "X", "GND"), res("R_B", "X", "GND")], { rails: [{ net: "GND", symbol: "Fix:R", kind: "ground", pwrFlag: null }] }));
    expect(p).toContain("rail GND: symbol Fix:R is not a power symbol");
  });

  it("V9: a power input must sit on a rail, and only one output may drive a net", () => {
    const amp: PartSpec = {
      label: "U_A", refPrefix: "U", libId: "Fix:OPAMP2", units: [1, 2, 3], value: "OPAMP2", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
      pins: {
        "1": { net: "OUT", identity: "" }, "2": { net: "OUT", identity: "-" }, "3": { net: "IN", identity: "+" },
        "5": { net: "IN", identity: "+" }, "6": { net: "OUT", identity: "-" }, "7": { net: "OUT", identity: "" },
        "4": { net: "GND", identity: "V-" }, "8": { net: "VP", identity: "V+" },
      },
    };
    const p = problems(base([amp, res("R_V", "VP", "GND")]));
    expect(p).toContain("part U_A: pin 8 (V+) is a power input on VP, which is not a rail");
    expect(p).toContain("net OUT has 2 driving outputs (U_A.1, U_A.7)");
  });

  it("V9: a no_connect symbol pin must be declared not connected", () => {
    const big: PartSpec = {
      label: "U_B", refPrefix: "U", libId: "Fix:BIG8", units: [1], value: "BIG8", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
      pins: {
        "1": { net: "A", identity: "D0" }, "2": { nc: true, identity: "D1" }, "3": { nc: true, identity: "CLK" },
        "4": { net: "GND", identity: "GND" }, "5": { nc: true, identity: "CS" }, "6": { nc: true, identity: "D2" },
        "7": { net: "A", identity: "NC" }, "8": { net: "GND", identity: "VCC" },
      },
    };
    expect(problems(base([big]))).toContain("part U_B: pin 7 is a no_connect pin but is on net A");
  });

  it("V10: DNP parts still need every BOM field", () => {
    const dnp: PartSpec = { ...res("R_A", "X", "GND"), dnp: true, bom: { ...TEST_BOM, SupplierPart: "" } };
    expect(problems(base([dnp, res("R_B", "X", "GND")]))).toContain("part R_A: BOM field SupplierPart is empty");
  });

  it("V10: TP, H and FID parts are exempt from BOM fields", () => {
    const tp: PartSpec = { ...res("R_A", "X", "GND"), refPrefix: "TP", bom: { ...TEST_BOM, MPN: "" } };
    expect(problems(base([tp, res("R_B", "X", "GND")]))).not.toContain("part R_A: BOM field MPN is empty");
  });

  it("V11: sheet files end in .kicad_sch and are unique", () => {
    const spec = base([res("R_A", "X", "GND"), res("R_B", "X", "GND")]);
    const sheets = [
      { id: "s", title: "S", file: "s.txt", paper: "A4" as const, notes: [] },
      { id: "t", title: "T", file: "s.txt", paper: "A4" as const, notes: [] },
    ];
    const p = problems({ ...spec, sheets });
    expect(p).toContain('sheet s: file "s.txt" must end in .kicad_sch');
    expect(p).toContain("sheets s and t share file s.txt");
  });

  it("V11: sheet files are plain names inside the output directory", () => {
    const spec = base([res("R_A", "X", "GND"), res("R_B", "X", "GND")]);
    for (const file of ["../s.kicad_sch", "sub/s.kicad_sch", "sub\\s.kicad_sch"]) {
      const p = problems({ ...spec, sheets: [{ id: "s", title: "S", file, paper: "A4" as const, notes: [] }] });
      expect(p).toContain(`sheet s: file "${file}" must be a plain file name in the output directory (no path separator or "..")`);
    }
  });

  it("V12: mechanical pads are unique and not symbol pins", () => {
    const a = res("R_A", "X", "GND");
    const mech: PartSpec = { ...a, mechanicalPads: [{ pad: "1", connection: { nc: true } }, { pad: "S", connection: { nc: true } }, { pad: "S", connection: { nc: true } }] };
    const p = problems(base([mech, res("R_B", "X", "GND")]));
    expect(p).toContain("part R_A: mechanical pad 1 is also a symbol pin");
    expect(p).toContain("part R_A: mechanical pad S listed twice");
  });

  it("V12: a mechanical pad cannot carry a net", () => {
    const a = res("R_A", "X", "GND");
    const mech: PartSpec = { ...a, mechanicalPads: [{ pad: "S", connection: { net: "GND" } }, { pad: "T", connection: { nc: true } }] };
    expect(problems(base([mech, res("R_B", "X", "GND")]))).toEqual([
      "part R_A: mechanical pad S is declared on net GND, but the schematic cannot carry a net on a pad without a symbol pin; use a symbol pin or declare the pad NC",
    ]);
  });
});
