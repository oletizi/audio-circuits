/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/build.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus the MCU pin-map cuts of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1 schematic-authoring
 * plan: decision D3 deletes the `labels` rendering three block specs here declared, and they are
 * `{ kind: "bus", groups: [] }` - the kind `labelledNets` and `valuesAlong` still treat as
 * `labels` was treated, so nothing this file measures moves.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { describe, expect, it } from "bun:test";
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { twoPin, UNNAMED } from "../../../lib/schgen/ir/author.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { CircuitSpec, PartSpec } from "../../../lib/schgen/ir/types.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const symbols = fixtureResolver();
const res = (label: string, a: string, b: string): PartSpec =>
  twoPin({ label, refPrefix: "R", libId: "Fix:R", value: "10k", footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false });

const spec = (parts: PartSpec[]): CircuitSpec => ({
  parts,
  blocks: [{ id: "B", sheet: "s", title: "B", members: parts.map((p) => p.label), checklist: [], rendering: { kind: "bus", groups: [] } }],
  sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
  rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
  orientations: noOrientationPreferences(parts),
  portDirections: NO_PORT_DIRECTIONS,
});

describe("buildCircuit", () => {
  it("collects nets with sorted pins and sorts nets by name", () => {
    const c = buildCircuit(spec([res("R_B", "X", "GND"), res("R_A", "X", "GND")]), { symbols });
    expect([...c.nets.keys()]).toEqual(["GND", "X"]);
    expect(c.nets.get("X")).toEqual([{ part: "R_B", pin: "1" }, { part: "R_A", pin: "1" }]);
  });

  it("refuses a pin number the symbol does not have", () => {
    const bad: PartSpec = { ...res("R_X", "A", "GND"), pins: { "1": { net: "A", identity: "" }, "3": { net: "GND", identity: "" } } };
    expect(() => buildCircuit(spec([bad]), { symbols })).toThrow(/R_X: pin 3 is not a pin of Fix:R \(pins: 1, 2\)/);
  });

  it("expands a whole-part member to every listed unit and refuses a unit placed twice", () => {
    const amp: PartSpec = {
      label: "U_A", refPrefix: "U", libId: "Fix:OPAMP2X", units: [1, 2, 3], value: "OPAMP2X", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, pins: {}, mechanicalPads: [], ncUnlisted: { reason: "test" },
    };
    const c = buildCircuit(spec([amp]), { symbols });
    expect([...c.unitBlock.entries()]).toEqual([["U_A#1", "B"], ["U_A#2", "B"], ["U_A#3", "B"]]);
    const twice: CircuitSpec = {
      ...spec([amp]),
      blocks: [
        { id: "B1", sheet: "s", title: "B1", members: ["U_A"], checklist: [], rendering: { kind: "bus", groups: [] } },
        { id: "B2", sheet: "s", title: "B2", members: [{ part: "U_A", unit: 2 }], checklist: [], rendering: { kind: "bus", groups: [] } },
      ],
    };
    expect(() => buildCircuit(twice, { symbols })).toThrow(/unit U_A#2 is placed by blocks B1 and B2/);
  });
});
