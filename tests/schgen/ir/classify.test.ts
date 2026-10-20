/**
 * Ported from digital-pedal-platform's `tools/schgen/ir/classify.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus the MCU pin-map cuts of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1 schematic-authoring
 * plan: decision D3 deletes the `labels` rendering, so the two block specs here declare
 * `{ kind: "bus", groups: [] }` and one test is renamed for it.
 *
 * **The renamed test's ASSERTION is unchanged, and that is the point.** It asserts that every net
 * of an unwired block is labelled. `bus` is now the kind that is unwired in that sense, because
 * `auto` - the variant D3 adds - is drawn with real wires and its internal nets are NOT labelled.
 * `lib/schgen/ir/classify.ts`'s `isUnwired` is where that distinction lives.
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
import { labelledNets, pinsOfUnit } from "../../../lib/schgen/ir/classify.ts";
import type { CircuitSpec, PartSpec, Rendering } from "../../../lib/schgen/ir/types.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const symbols = fixtureResolver();
const res = (label: string, a: string, b: string): PartSpec =>
  twoPin({ label, refPrefix: "R", libId: "Fix:R", value: "1k", footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false });
const wired: Rendering = { kind: "wired", template: "passive-chain", anchor: null };

describe("labelledNets", () => {
  it("labels rails and nets that cross blocks; leaves block-internal nets unlabelled", () => {
    const parts = [res("R1", "IN", "MID"), res("R2", "MID", "GND"), res("R3", "IN", "GND")];
    const spec: CircuitSpec = {
      parts,
      blocks: [
        { id: "A", sheet: "s", title: "A", members: ["R1", "R2"], checklist: [], rendering: wired },
        { id: "B", sheet: "s", title: "B", members: ["R3"], checklist: [], rendering: wired },
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    };
    const c = buildCircuit(spec, { symbols });
    expect([...labelledNets(c)].sort()).toEqual(["GND", "IN"]);
  });

  it("a whole design has no off-sheet nets", () => {
    const parts = [res("R1", "P", "Q")];
    const spec: CircuitSpec = {
      parts,
      blocks: [{ id: "A", sheet: "s", title: "A", members: ["R1"], checklist: [], rendering: wired }],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: [],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    };
    expect([...buildCircuit(spec, { symbols }).offSheet]).toEqual([]);
  });

  it("labels an off-sheet net even when one block holds all its pins here (A2 Task 12: a sheet subset)", () => {
    const parts = [res("R1", "MUTE", "MUTE_G"), res("R2", "MUTE_G", "GND")];
    const spec: CircuitSpec = {
      parts,
      blocks: [{ id: "A", sheet: "s", title: "A", members: ["R1", "R2"], checklist: [], rendering: wired }],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    };
    const whole = buildCircuit(spec, { symbols });
    expect([...labelledNets(whole)].sort()).toEqual(["GND"]);
    expect([...labelledNets({ ...whole, offSheet: new Set(["MUTE"]) })].sort()).toEqual(["GND", "MUTE"]);
  });

  it("labels every net of a bus-rendered block", () => {
    const parts = [res("R1", "P", "Q"), res("R2", "P", "Q")];
    const spec: CircuitSpec = {
      parts,
      blocks: [{ id: "A", sheet: "s", title: "A", members: ["R1", "R2"], checklist: [], rendering: { kind: "bus", groups: [] } }],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: [],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    };
    expect([...labelledNets(buildCircuit(spec, { symbols }))].sort()).toEqual(["P", "Q"]);
  });
});

describe("pinsOfUnit", () => {
  it("gives unit-0 pins to the lowest listed unit only", () => {
    const flag: PartSpec = {
      label: "FLG", refPrefix: "X", libId: "Pwr:PWR_FLAG", units: [1], value: "PWR_FLAG", footprint: "", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, pins: { "1": { net: "GND", identity: "" } }, mechanicalPads: [], ncUnlisted: null,
    };
    const parts = [flag, res("R1", "GND", "Z"), res("R2", "Z", "GND")];
    const spec: CircuitSpec = {
      parts,
      blocks: [{ id: "A", sheet: "s", title: "A", members: ["FLG", "R1", "R2"], checklist: [], rendering: { kind: "bus", groups: [] } }],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes: [] }],
      rails: [{ net: "GND", symbol: "Pwr:GND", kind: "ground", pwrFlag: null }],
      orientations: noOrientationPreferences(parts),
      portDirections: NO_PORT_DIRECTIONS,
    };
    const c = buildCircuit(spec, { symbols });
    expect(pinsOfUnit(c, "FLG", 1).map((p) => p.pin)).toEqual(["1"]);
  });
});
