/**
 * Ported from digital-pedal-platform's `tools/schgen/render/bus.kicad.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import path from "node:path";
import { describe, expect, it } from "bun:test";
import { RAILS, res } from "../__fixtures__/circuits.ts";
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../__fixtures__/layout-checks.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { BlockMember, PartSpec, PinConnection } from "../../../lib/schgen/ir/types.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { realiseBus } from "../../../lib/schgen/render/bus.ts";
import { blockFields } from "../../../lib/schgen/render/field-placement.ts";
import { createResolver, stockSymbolDir } from "../../../lib/schgen/render/library.ts";

// Needs the stock KiCad symbol libraries; fails (never skips) when they are missing.
describe("realiseBus on the stock STM32H743IITx symbol", () => {
  it("keeps every stub clear of the other stubs and of the body", () => {
    const libId = "MCU_ST_STM32H7:STM32H743IITx";
    const resolver = createResolver(
      new Map([...fixtureResolver().files, ["MCU_ST_STM32H7", path.join(stockSymbolDir(), "MCU_ST_STM32H7.kicad_sym")]]),
    );
    const sym = resolver.resolve(libId);
    expect(sym.pins).toHaveLength(176);
    const railOf = (name: string): string | null =>
      name.startsWith("VSS") ? "GND" : name === "VDDA" ? "VDDA" : name.startsWith("VDD") ? "3V3" : null;
    const netOf = (name: string): string => railOf(name) ?? `N_${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const pins: Record<string, PinConnection> = Object.fromEntries(
      sym.pins.map((p): [string, PinConnection] => [
        p.number,
        p.type === "no_connect" ? { nc: true, identity: p.name } : { net: netOf(p.name), identity: p.name },
      ]),
    );
    const mcu: PartSpec = {
      label: "U_MCU", refPrefix: "U", libId, units: [1], value: "H743", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null, pins,
    };
    const nets = [...new Set(Object.values(pins).flatMap((p) => ("net" in p && railOf(p.identity) === null ? [p.net] : [])))].sort();
    const peers = nets.map((n, i) => res(`R_P${i}`, n, "GND"));
    const members: BlockMember[] = [mcu.label];
    const c = buildCircuit(
      {
        parts: [mcu, ...peers],
        blocks: [
          { id: "B", sheet: "s", title: "MCU", members, checklist: [], rendering: { kind: "bus", groups: [{ name: "all", nets }] } },
          { id: "PEER", sheet: "s", title: "Peer", members: peers.map((p) => p.label), checklist: [], rendering: { kind: "bus", groups: [] } },
        ],
        sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A3", notes: [] }],
        rails: RAILS,
          },
      { symbols: resolver },
    );
    const g = subgraphOf(c, "B", resolver);
    const r = realiseBus(c, "B", resolver);
    expect(checkLayout(g, r.layout)).toEqual([]);
    expect(unattachedWireEnds(g, r.layout)).toEqual([]);
    expect(r.layout.anchors.length).toBeGreaterThan(100);
    const t = blockFields(g, r.layout, resolver)[0]!;
    for (const f of [t.fields.reference, t.fields.value]) {
      expect(f.justify).toBe("center");
      expect(f.at.x > t.body.minX && f.at.x < t.body.maxX && f.at.y > t.body.minY && f.at.y < t.body.maxY).toBe(true);
    }
  });
});
