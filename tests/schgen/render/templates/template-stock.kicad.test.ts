/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/templateStock.kicad.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "bun:test";
import { RAILS } from "../../__fixtures__/circuits.ts";
import { fixtureResolver, TEST_BOM } from "../../__fixtures__/fixture-lib.ts";
import { unattachedWireEnds } from "../../__fixtures__/layout-checks.ts";
import { skipWithout } from "../../__fixtures__/require-tool.ts";
import { twoPin, UNNAMED } from "../../../../lib/schgen/ir/author.ts";
import { buildCircuit } from "../../../../lib/schgen/ir/build.ts";
import type { Circuit, PartSpec, PinConnection, Rendering } from "../../../../lib/schgen/ir/types.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";
import { createResolver, stockSymbolDir, type SymbolResolver } from "../../../../lib/schgen/render/library.ts";
import { layoutSheet } from "../../../../lib/schgen/render/sheets.ts";

/**
 * regulator, crystal and connector-fanout on the H7 stock bodies with stock passives: each block
 * is valid, every text clear (checkLayout's block-level text check), no wire end dangles, and its
 * sheet lays out. TPS7A49 is not in the KiCad 10 stock libraries; TPS7A0533PDBV stands in for an
 * LDO with an EN pin.
 */

function stockDir(): string | null {
  try {
    return stockSymbolDir();
  } catch {
    return null;
  }
}
const dir = stockDir();
const LIBS = ["Device", "Regulator_Linear", "Connector"];
const ready = dir !== null && LIBS.every((l) => fs.existsSync(path.join(dir, `${l}.kicad_sym`)));

function resolver(): SymbolResolver {
  const libs = new Map([...fixtureResolver().files]);
  for (const lib of LIBS) libs.set(lib, path.join(dir ?? "", `${lib}.kicad_sym`));
  return createResolver(libs);
}

const passive = (prefix: "R" | "C") => (label: string, a: string, b: string, value: string): PartSpec =>
  twoPin({ label, refPrefix: prefix, libId: `Device:${prefix}`, value, footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false });
const R = passive("R");
const C = passive("C");

function stock(label: string, refPrefix: string, libId: string, value: string, pins: Record<string, string | null>): PartSpec {
  return {
    label, refPrefix, libId, units: [1], value, footprint: "F", bom: TEST_BOM,
    dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
    pins: Object.fromEntries(Object.entries(pins).map(([k, net]): [string, PinConnection] => [k, net === null ? { nc: true, identity: k } : { net, identity: k }])),
  };
}

interface Case {
  readonly parts: PartSpec[];
  readonly rendering: Rendering;
  readonly external: readonly string[];
}

function circuit(s: Case, symbols: SymbolResolver): Circuit {
  const peers = s.external.map((n, i) => R(`R_PEER${i}`, n, "GND", "10k"));
  return buildCircuit(
    {
      parts: [...s.parts, ...peers],
      blocks: [
        { id: "B", sheet: "s", title: "Block", members: s.parts.map((p) => p.label), checklist: [], rendering: s.rendering },
        ...(peers.length > 0 ? [{ id: "PEER", sheet: "p", title: "Peer", members: peers.map((p) => p.label), checklist: [], rendering: { kind: "bus" as const, groups: [] } }] : []),
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A3", notes: [] }, { id: "p", title: "P", file: "p.kicad_sch", paper: "A3", notes: [] }],
      rails: RAILS,
      },
    { symbols },
  );
}

const wired = (template: "regulator" | "crystal" | "connector-fanout", part: string, roles: Record<string, string>): Rendering => ({
  kind: "wired", template, anchor: { part, unit: 1, roles },
});

const AMS1117: Case = {
  parts: [
    stock("U_LDO", "U", "Regulator_Linear:AMS1117-3.3", "AMS1117-3.3", { "1": "GND", "2": "VOUT", "3": "VIN" }),
    C("C_IN", "VIN", "GND", "10u"), C("C_OUT1", "VOUT", "GND", "22u"), C("C_OUT2", "VOUT", "GND", "100n"),
  ],
  rendering: wired("regulator", "U_LDO", { in: "3", out: "2" }),
  external: ["VIN", "VOUT"],
};

/** LP5907-family LDO (IN, EN left; GND below; OUT right) with EN on its own label and a ground-referenced input cap. */
const ldoEn = (en: string): Case => ({
  parts: [
    stock("U_LDO", "U", "Regulator_Linear:TPS7A0533PDBV", "TPS7A0533", { "1": "VIN", "2": "GND", "3": en, "4": null, "5": "VOUT" }),
    C("C_IN", "VIN", "GND", "1u"), C("C_OUT", "VOUT", "GND", "1u"),
  ],
  rendering: wired("regulator", "U_LDO", { in: "1", out: "5" }),
  external: en === "VIN" ? ["VIN", "VOUT"] : ["VIN", "VOUT", en],
});

const CRYSTAL: Case = {
  parts: [
    stock("Y_HSE", "Y", "Device:Crystal_GND24", "25MHz", { "1": "HSE_IN", "2": "GND", "3": "HSE_OUT", "4": "GND" }),
    C("C_HSE1", "HSE_IN", "GND", "12p"), C("C_HSE2", "HSE_OUT", "GND", "12p"),
  ],
  rendering: wired("crystal", "Y_HSE", { a: "1", b: "3" }),
  external: ["HSE_IN", "HSE_OUT"],
};

const USB_C: Case = {
  parts: [
    stock("J_USB", "J", "Connector:USB_C_Receptacle_USB2.0_16P", "USB_C", {
      A1: "GND", A12: "GND", B1: "GND", B12: "GND", A4: "VBUS", A9: "VBUS", B4: "VBUS", B9: "VBUS",
      A5: "CC1", B5: "CC2", A6: "USB_DP", B6: "USB_DP", A7: "USB_DM", B7: "USB_DM", A8: null, B8: null, SH: "GND",
    }),
    R("R_CC1", "CC1", "GND", "5.1k"), R("R_CC2", "CC2", "GND", "5.1k"),
  ],
  rendering: wired("connector-fanout", "J_USB", {}),
  external: ["VBUS", "USB_DP", "USB_DM"],
};

/** SWD header: VTref on 3V3, both grounds and GNDDetect to GND, series resistors on the adjacent SWDIO/SWCLK pins. */
const SWD: Case = {
  parts: [
    stock("J_SWD", "J", "Connector:Conn_ARM_JTAG_SWD_10", "SWD", {
      "1": "3V3", "2": "SWDIO_C", "3": "GND", "4": "SWCLK_C", "5": "GND", "6": "SWO", "7": null, "8": null, "9": "GND", "10": "NRST",
    }),
    R("R_DIO", "SWDIO_C", "SWDIO", "22"), R("R_CLK", "SWCLK_C", "SWCLK", "22"),
  ],
  rendering: wired("connector-fanout", "J_SWD", {}),
  external: ["SWDIO", "SWCLK", "SWO", "NRST"],
};

describe.skipIf(skipWithout(ready, `the KiCad stock symbol libraries ${LIBS.join(", ")}`))("regulator, crystal and connector-fanout on the H7 stock bodies", () => {
  const symbols = resolver();
  it.each([
    ["regulator: AMS1117-3.3 with input and output banks", AMS1117],
    ["regulator: LDO with EN labelled and a ground-referenced input cap", ldoEn("LDO_EN")],
    ["regulator: LDO with EN tied to IN", ldoEn("VIN")],
    ["crystal: Crystal_GND24 with load capacitors", CRYSTAL],
    ["connector-fanout: USB-C receptacle with CC resistors", USB_C],
    ["connector-fanout: SWD header with series resistors", SWD],
  ] as const)("%s: valid, text clear, no dangling wire end", (_name, s) => {
    const c = circuit(s, symbols);
    const layout = realiseBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
    expect(layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG").symbols).toHaveLength(s.parts.length);
  });
});
