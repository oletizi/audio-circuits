/**
 * Ported from digital-pedal-platform's `tools/schgen/render/templates/opampStock.kicad.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, plus the MCU pin-map cuts of
 * `docs/known-gaps.md` **G112**), and DIVERGED from it by Task 8 of the M1 schematic-authoring
 * plan: decision D3 deletes the `labels` rendering the SPLIT and PEER blocks declared, and they
 * are `{ kind: "bus", groups: [] }` - the kind `labelledNets` and `valuesAlong` still treat as
 * `labels` was treated, so the drawing this file exports is unmoved.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
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
import type { BlockMember, Circuit, PartSpec, RailSpec, Rendering } from "../../../../lib/schgen/ir/types.ts";
import { checkLayout, realiseBlock, subgraphOf } from "../../../../lib/schgen/render/blocks.ts";
import { createResolver, stockSymbolDir, type SymbolResolver } from "../../../../lib/schgen/render/library.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../../__fixtures__/orientations.ts";

/** The H7 op-amp stages (h7-platform/ANALOG.md) on the stock OPA1678 / MCP6001-OT bodies and stock passives. */

function stockDir(): string | null {
  try {
    return stockSymbolDir();
  } catch {
    return null;
  }
}
const dir = stockDir();
const ready = dir !== null && fs.existsSync(path.join(dir, "Amplifier_Operational.kicad_sym"));

function resolver(): SymbolResolver {
  const libs = new Map([...fixtureResolver().files]);
  for (const lib of ["Amplifier_Operational", "Device"]) libs.set(lib, path.join(dir ?? "", `${lib}.kicad_sym`));
  return createResolver(libs);
}

const passive = (prefix: "R" | "C") => (label: string, a: string, b: string, value: string): PartSpec =>
  twoPin({ label, refPrefix: prefix, libId: `Device:${prefix}`, value, footprint: "F", bom: TEST_BOM, nets: [a, b], identities: UNNAMED, checklist: [], source: "t", dnp: false });
const R = passive("R");
const C = passive("C");

/** OPA1678 (LM2904 pinout): unit 1 is the stage; units 2 (unused) and 3 (supplies) go to a labels block. */
function opa(label: string, out: string, inv: string, noninv: string): PartSpec {
  return {
    label, refPrefix: "U", libId: "Amplifier_Operational:OPA1678", units: [1, 2, 3], value: "OPA1678", footprint: "F", bom: TEST_BOM,
    dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
    pins: {
      "1": { net: out, identity: "" }, "2": { net: inv, identity: "-" }, "3": { net: noninv, identity: "+" },
      "5": { nc: true, identity: "+" }, "6": { nc: true, identity: "-" }, "7": { nc: true, identity: "" },
      "4": { net: "GND", identity: "V-" }, "8": { net: "3V3", identity: "V+" },
    },
  };
}

const roles = (part: string, out: string, inv: string, noninv: string): Rendering => ({
  kind: "wired", template: "opamp-stage", anchor: { part, unit: 1, roles: { out, inv, noninv } },
});

interface Stage {
  readonly parts: PartSpec[];
  readonly rendering: Rendering;
  readonly external: readonly string[];
  readonly split?: { readonly part: string; readonly units: readonly number[] };
  readonly rails?: readonly RailSpec[];
}

function circuit(s: Stage, symbols: SymbolResolver): Circuit {
  const peers = s.external.map((n, i) => R(`R_PEER${i}`, n, "GND", "10k"));
  const members: BlockMember[] = s.parts.flatMap((p): BlockMember[] =>
    s.split?.part === p.label ? p.units.filter((u) => !s.split!.units.includes(u)).map((unit) => ({ part: p.label, unit })) : [p.label],
  );
  const split: BlockMember[] = s.split === undefined ? [] : s.split.units.map((unit) => ({ part: s.split!.part, unit }));
  return buildCircuit(
    {
      parts: [...s.parts, ...peers],
      blocks: [
        { id: "B", sheet: "s", title: "Block", members, checklist: [], rendering: s.rendering },
        ...(split.length > 0 ? [{ id: "SPLIT", sheet: "s", title: "Split", members: split, checklist: [], rendering: { kind: "bus" as const, groups: [] } }] : []),
        ...(peers.length > 0 ? [{ id: "PEER", sheet: "s", title: "Peer", members: peers.map((p) => p.label), checklist: [], rendering: { kind: "bus" as const, groups: [] } }] : []),
      ],
      sheets: [{ id: "s", title: "S", file: "s.kicad_sch", paper: "A3", notes: [] }],
      rails: s.rails ?? RAILS,
      orientations: noOrientationPreferences([...s.parts, ...peers]),
      portDirections: NO_PORT_DIRECTIONS,
    },
    { symbols },
  );
}

const SPLIT = (part: string) => ({ part, units: [2, 3] });

/** U_IN: the full input front end into a unity follower, AC-coupled out through C2. */
const U_IN: Stage = {
  parts: [
    opa("U_IN", "BUF", "BUF", "T"),
    R("R_RF", "TIP", "N_RF", "1k"), C("C_RF", "N_RF", "GND", "100p"), R("R_PD", "N_RF", "GND", "22M"), C("C_IN", "N_RF", "N_A", "47n"),
    R("R1", "N_A", "T", "1.50M"), C("C1", "N_A", "T", "110p"), R("R2", "T", "VMID_L", "1.00M"), C("C_T", "T", "GND", "160p"),
    C("C2", "BUF", "AC_L", "22u"),
  ],
  rendering: roles("U_IN", "1", "2", "3"),
  external: ["TIP", "VMID_L", "AC_L"],
  split: SPLIT("U_IN"),
};

/** U_ADC: inverting driver, R_F ∥ C_F, + on VBIAS_L, out through R_O with 2.2 nF to ground. */
const U_ADC: Stage = {
  parts: [
    opa("U_ADC", "ADC_O", "ADC_N", "VBIAS_L"),
    R("R_IN", "AC_L", "ADC_N", "10.0k"), R("R_F", "ADC_N", "ADC_O", "10.0k"), C("C_F", "ADC_N", "ADC_O", "47p"),
    R("R_O", "ADC_O", "VINL", "100"), C("C_AAF", "VINL", "GND", "2.2n"),
  ],
  rendering: roles("U_ADC", "1", "2", "3"),
  external: ["AC_L", "VBIAS_L", "VINL"],
  split: SPLIT("U_ADC"),
};

/** U_OUT: difference amp, R_G ∥ C_G to VMID_L, out through R_S, C_O, C_DC and R_B to the jack. */
const U_OUT: Stage = {
  parts: [
    opa("U_OUT", "DO", "DN", "DP"),
    C("C_AP", "VOUTP", "XP", "10u"), R("R_DP", "XP", "DN", "20.0k"), C("C_AM", "VOUTM", "XM", "10u"), R("R_DM", "XM", "DP", "20.0k"),
    R("R_FO", "DN", "DO", "19.1k"), C("C_FO", "DN", "DO", "47p"), R("R_G", "DP", "VMID_L", "19.1k"), C("C_G", "DP", "VMID_L", "47p"),
    R("R_S", "DO", "NS", "100"), C("C_O", "NS", "GND", "220p"), C("C_DC", "NS", "NJ", "22u"), R("R_B", "NJ", "GND", "100k"),
  ],
  rendering: roles("U_OUT", "1", "2", "3"),
  external: ["VOUTP", "VOUTM", "VMID_L", "NJ"],
  split: SPLIT("U_OUT"),
};

/** U_EXP: MCP6001 follower with its supplies drawn in the block. */
const U_EXP: Stage = {
  parts: [
    {
      label: "U_EXP", refPrefix: "U", libId: "Amplifier_Operational:MCP6001-OT", units: [1], value: "MCP6001", footprint: "F", bom: TEST_BOM,
      dnp: false, checklist: [], source: "t", pinTable: null, mechanicalPads: [], ncUnlisted: null,
      pins: {
        "1": { net: "EXP_BUF", identity: "" }, "2": { net: "GND", identity: "V-" }, "3": { net: "TIPF", identity: "+" },
        "4": { net: "EXP_BUF", identity: "-" }, "5": { net: "VDDA", identity: "V+" },
      },
    },
    R("R_TIP", "EXP_TIP", "TIPF", "10k"), C("C_TF", "TIPF", "GND", "100n"), R("R_EO", "EXP_BUF", "EXPR", "1k"),
  ],
  rendering: roles("U_EXP", "1", "4", "3"),
  external: ["EXP_TIP", "EXPR"],
};

/** A VMID follower: the divider inside the block, VMID leaving as a label. */
const VMID_FOLLOWER: Stage = {
  parts: [opa("U_VM", "VMID_L", "VMID_L", "VM_T"), R("R_VT", "3V3", "VM_T", "100k"), R("R_VB", "VM_T", "GND", "100k"), C("C_VM", "VM_T", "GND", "10u")],
  rendering: roles("U_VM", "1", "2", "3"),
  external: ["VMID_L"],
  split: SPLIT("U_VM"),
};

/** A VMID follower driving VMID as a rail, its divider tap external. */
const VMID_RAIL: Stage = {
  parts: [opa("U_VM", "VMID", "VMID", "VM_T"), R("R_VI", "VM_TAP", "VM_T", "1k"), C("C_VM", "VM_T", "GND", "10u")],
  rendering: roles("U_VM", "1", "2", "3"),
  external: ["VM_TAP"],
  split: SPLIT("U_VM"),
  rails: [...RAILS, { net: "VMID", symbol: "Pwr:+3V3", kind: "supply", pwrFlag: null }],
};

describe.skipIf(skipWithout(ready, "the KiCad stock symbol library Amplifier_Operational"))("opamp-stage on the H7 stock bodies", () => {
  const symbols = resolver();
  it.each([
    ["U_IN input follower with the full front end", U_IN],
    ["U_ADC inverting driver", U_ADC],
    ["U_OUT difference amp", U_OUT],
    ["U_EXP MCP6001 follower", U_EXP],
    ["VMID follower, divider inside", VMID_FOLLOWER],
    ["VMID follower driving a VMID rail", VMID_RAIL],
  ] as const)("%s: valid, text clear, no dangling wire end", (_name, stage) => {
    const c = circuit(stage, symbols);
    const layout = realiseBlock(c, "B", symbols);
    const g = subgraphOf(c, "B", symbols);
    expect(checkLayout(g, layout)).toEqual([]);
    expect(unattachedWireEnds(g, layout)).toEqual([]);
  });
});
