/**
 * Ported from digital-pedal-platform's `tools/schgen/render/stockFields.kicad.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import { RAILS, res } from "../__fixtures__/circuits.ts";
import { fixtureResolver, TEST_BOM } from "../__fixtures__/fixture-lib.ts";
import { skipWithout } from "../__fixtures__/require-tool.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { BlockSpec, Circuit, PartSpec, PinConnection } from "../../../lib/schgen/ir/types.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { realiseBus } from "../../../lib/schgen/render/bus.ts";
import { blockFields } from "../../../lib/schgen/render/field-placement.ts";
import { createResolver, stockSymbolDir, type SymbolResolver } from "../../../lib/schgen/render/library.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { textProblems, textScene } from "../../../lib/schgen/render/text-scene.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

/** The H7 platform's stock symbols: every unit gets clear fields alone, in a labels block and bus-rendered. */
const STOCK: ReadonlyArray<readonly [string, string]> = [
  ["Regulator_Switching:TPS62933F", "TPS62933F"],
  ["Regulator_Linear:AMS1117-3.3", "AMS1117-3.3"],
  ["Regulator_Linear:L78L05_TO92", "L78L05"],
  ["Amplifier_Operational:MCP6001-OT", "MCP6001"],
  ["Power_Protection:USBLC6-2SC6", "USBLC6-2SC6"],
  ["Audio:PCM3060", "PCM3060"],
  ["MCU_ST_STM32H7:STM32H743IITx", "H743"],
  ["Amplifier_Operational:OPA1678", "OPA1678"],
  ["Device:Crystal_GND24", "25MHz"],
  ["Connector:USB_C_Receptacle_USB2.0_16P", "USB_C"],
  ["Connector:Conn_ARM_JTAG_SWD_10", "SWD"],
  ["Transistor_FET:BSS138", "BSS138"],
  ["Relay_SolidState:CPC1117N", "CPC1117N"],
  ["Diode:PMEG4030ER", "PMEG4030ER"],
  ["Amplifier_Operational:TL072", "TL072"],
  ["Memory_Flash:W25Q128JVS", "W25Q128JVS"],
  ["Memory_RAM:MT48LC16M16A2P", "MT48LC16M16A2P"],
  ["Audio:PT2399", "PT2399"],
  ["Connector_Audio:AudioJack3_Switch", "Jack"],
];

function stockDir(): string | null {
  try {
    return stockSymbolDir();
  } catch {
    return null;
  }
}
const dir = stockDir();

const railOf = (name: string): string | null =>
  /^(VSS|GND|AGND|DGND|PGND|EP)/.test(name) ? "GND" : name === "VDDA" ? "VDDA" : /^(VDD|VCC|VIN|VBUS|V\+)/.test(name) ? "3V3" : null;

type Mode = "bus";

/** Every pin of every unit on its own net (stacked pins share one; supply-named pins on rails), in `mode` blocks on sheet "s". */
function stockCircuit(resolver: SymbolResolver, libId: string, value: string, mode: Mode): { c: Circuit; blocks: string[] } {
  const sym = resolver.resolve(libId);
  const units = [...sym.bodies.keys()].sort((a, b) => a - b);
  const atLoc = new Map<string, string>();
  const pins: Record<string, PinConnection> = Object.fromEntries(
    sym.pins.map((q): [string, PinConnection] => {
      if (q.type === "no_connect") return [q.number, { nc: true, identity: q.name }];
      // Pins stacked at one location share the first one's net.
      const loc = `${q.unit}:${q.x},${q.y}`;
      const net = atLoc.get(loc) ?? railOf(q.name) ?? `N_${q.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${q.number}`;
      atLoc.set(loc, net);
      return [q.number, { net, identity: q.name }];
    }),
  );
  const part: PartSpec = {
    label: "U1", refPrefix: "U", libId, units, value, footprint: "F", bom: TEST_BOM,
    dnp: false, checklist: [], source: "stock", pinTable: null, mechanicalPads: [], ncUnlisted: null, pins,
  };
  const nets = [...new Set(Object.values(pins).flatMap((q) => ("net" in q && !RAILS.some((r) => r.net === q.net) ? [q.net] : [])))].sort();
  const peers = nets.map((n, i) => res(`R_P${i}`, n, "GND"));
  const groups = Array.from({ length: Math.ceil(nets.length / 3) }, (_, i) => ({ name: `g${i}`, nets: nets.slice(3 * i, 3 * i + 3) }));
  const blocks: BlockSpec[] = units.map((unit) => ({
    id: `B${unit}`, sheet: "s", title: `${libId} #${unit}`, members: [{ part: "U1", unit }], checklist: [], rendering: { kind: "bus", groups },
  }));
  const c = buildCircuit(
    {
      parts: [part, ...peers],
      blocks: [...blocks, { id: "PEER", sheet: "p", title: "Peer", members: peers.map((x) => x.label), checklist: [], rendering: { kind: "bus", groups: [] } }],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A1", notes: [] }, { id: "p", title: "P", file: "p.kicad_sch", paper: "A1", notes: [] }],
      rails: RAILS,
      orientations: noOrientationPreferences([part, ...peers]),
      portDirections: NO_PORT_DIRECTIONS,
    },
    { symbols: resolver },
  );
  return { c, blocks: blocks.map((b) => b.id) };
}

describe.skipIf(skipWithout(dir !== null && fs.existsSync(path.join(dir, "Audio.kicad_sym")), "the KiCad stock symbol libraries"))("fields of the H7 stock symbols", () => {
  const libs = new Map([...fixtureResolver().files]);
  for (const [id] of STOCK) libs.set(id.split(":")[0]!, path.join(dir ?? "", `${id.split(":")[0]}.kicad_sym`));
  const resolver = createResolver(libs);
  const cases = STOCK.map(([id, value]) => [id, value] as const);

  it.each(cases)("%s: every unit alone has clear fields", (libId, value) => {
    const { c, blocks } = stockCircuit(resolver, libId, value, "bus");
    for (const id of blocks) {
      const g = subgraphOf(c, id, resolver);
      const u = g.units[0]!;
      const layout = { placements: [{ part: u.part.label, unit: u.unit, at: { x: 0, y: 0 }, rot: 0 as const }], wires: [], anchors: [] };
      expect(textProblems(textScene(`bare ${id}`, resolver, { blocks: [{ g, layout }], powers: [], labels: [], texts: [], frames: [] }))).toEqual([]);
    }
  });

  it.each(cases)("%s: every unit's fields placed clear in a bus block", (libId, value) => {
    const { c, blocks } = stockCircuit(resolver, libId, value, "bus");
    for (const id of blocks) {
      const g = subgraphOf(c, id, resolver);
      const layout = realiseBus(c, id, resolver).layout;
      expect(checkLayout(g, layout)).toEqual([]);
      expect(blockFields(g, layout, resolver)).toHaveLength(1);
    }
    expect(layoutSheet(c, "s", resolver, "Pwr:PWR_FLAG").symbols).toHaveLength(blocks.length);
  });
});
