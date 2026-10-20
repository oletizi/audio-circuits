/**
 * Ported from digital-pedal-platform's `tools/schgen/render/noConnectEnds.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only), and DIVERGED from it by Task 8 of the M1
 * schematic-authoring plan: decision D3 deletes the `labels` rendering this file passed to
 * `blockCircuit` twice, and it is `{ kind: "bus", groups: [] }` - the kind `labelledNets` and
 * `valuesAlong` still treat as `labels` was treated, so nothing this file measures moves.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, res, symbols } from "../__fixtures__/circuits.ts";
import { TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import type { PartSpec } from "../../../lib/schgen/ir/types.ts";
import type { BlockSubgraph, BlockUnit, Placement } from "../../../lib/schgen/render/block-types.ts";
import { placedNoConnects, placedPins, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { GRID, type Point } from "../../../lib/schgen/render/geometry.ts";
import { unitText } from "../../../lib/schgen/render/unit-text.ts";

/** A dual op-amp with its power unit: unit 2's three pins (5, 6, 7) are not connected. */
const AMP: PartSpec = {
  label: "U_A", refPrefix: "U", libId: "Fix:OPAMP2", units: [1, 2, 3], value: "OPAMP2", footprint: "F", bom: TEST_BOM,
  dnp: false, checklist: [], source: "fixture", pinTable: null, mechanicalPads: [], ncUnlisted: null,
  pins: {
    "1": { net: "O", identity: "" }, "2": { net: "O", identity: "-" }, "3": { net: "P", identity: "+" },
    "5": { nc: true, identity: "+" }, "6": { nc: true, identity: "-" }, "7": { nc: true, identity: "" },
    "4": { net: "GND", identity: "V-" }, "8": { net: "3V3", identity: "V+" },
  },
};

function ampBlock(): BlockSubgraph {
  return subgraphOf(blockCircuit([AMP, res("R_P", "P", "GND")], { kind: "bus", groups: [] }, { external: [] }), "B", symbols);
}

function unitOf(g: BlockSubgraph, part: string, unit: number): BlockUnit {
  const u = g.units.find((x) => x.part.label === part && x.unit === unit);
  if (u === undefined) throw new Error(`${part}#${unit} is not in the block`);
  return u;
}

const at = (part: string, unit: number): Placement => ({ part, unit, at: { x: 20 * GRID, y: 20 * GRID }, rot: 0 });

/** Centres of the no-connect markers unitText reports. */
function markerCentres(u: BlockUnit, pl: Placement): Point[] {
  return unitText(u, pl)
    .decorations.filter((o) => o.what.includes("no-connect"))
    .map((o) => ({ x: o.box.minX + GRID / 2, y: o.box.minY + GRID / 2 }));
}

const sortPts = (ps: readonly Point[]): Point[] => [...ps].sort((a, b) => a.x - b.x || a.y - b.y);

describe("no-connect ends: one rule for the X emitter and the text obstacles (Task 14 review minor 5)", () => {
  it("marks a multi-unit part's unit-2 NC pins where the sheet draws its Xs", () => {
    const g = ampBlock();
    const pl = at("U_A", 2);
    const xs = placedNoConnects(g, [pl]).map((p) => p.at);
    expect(xs).toHaveLength(3);
    expect(sortPts(markerCentres(unitOf(g, "U_A", 2), pl))).toEqual(sortPts(xs));
  });

  it("draws no X and no marker for unit 1 of the same part, whose pins are all connected", () => {
    const g = ampBlock();
    const pl = at("U_A", 1);
    expect(placedNoConnects(g, [pl])).toEqual([]);
    expect(markerCentres(unitOf(g, "U_A", 1), pl)).toEqual([]);
  });

  it("refuses, in both consumers, a unit that carries another unit's pins", () => {
    const g = ampBlock();
    const u1 = unitOf(g, "U_A", 1);
    const u2 = unitOf(g, "U_A", 2);
    const bad: BlockUnit = { ...u1, pins: [...u1.pins, ...u2.pins] };
    const badG: BlockSubgraph = { ...g, units: g.units.map((u) => (u === u1 ? bad : u)) };
    const pl = at("U_A", 1);
    expect(() => unitText(bad, pl)).toThrow(/U_A unit 1 carries pin 5 of unit 2/);
    expect(() => placedNoConnects(badG, [pl])).toThrow(/U_A unit 1 carries pin 5 of unit 2/);
    expect(() => placedPins(badG, [pl])).toThrow(/U_A unit 1 carries pin 5 of unit 2/);
  });
});

describe("no X for a hidden no_connect-typed pin (Task 14 review minor 3: J_SWD's KEY pin)", () => {
  /** R1 with pin 2 NC; the symbol's pin 2 is hidden and typed `type`. */
  function ncBlock(type: "no_connect" | "passive"): BlockSubgraph {
    const r = res("R1", "N1", "GND");
    const p2 = r.pins["2"];
    if (p2 === undefined) throw new Error("fixture resistor has no pin 2");
    const part: PartSpec = { ...r, pins: { ...r.pins, "2": { nc: true, identity: p2.identity } } };
    const g = subgraphOf(blockCircuit([part], { kind: "bus", groups: [] }, { external: [] }), "B", symbols);
    return {
      ...g,
      units: g.units.map((u) =>
        u.part.label !== "R1" ? u : { ...u, symbol: { ...u.symbol, pins: u.symbol.pins.map((p) => (p.number === "2" ? { ...p, hidden: true, type } : p)) } },
      ),
    };
  }

  it("emits neither the X nor its text obstacle when the hidden pin is typed no_connect", () => {
    const g = ncBlock("no_connect");
    const pl = at("R1", 1);
    expect(placedNoConnects(g, [pl])).toEqual([]);
    expect(markerCentres(unitOf(g, "R1", 1), pl)).toEqual([]);
  });

  it("still emits both for a hidden NC pin of any other type, which KiCad ERC needs flagged", () => {
    const g = ncBlock("passive");
    const pl = at("R1", 1);
    expect(placedNoConnects(g, [pl])).toHaveLength(1);
    expect(markerCentres(unitOf(g, "R1", 1), pl)).toHaveLength(1);
  });
});
