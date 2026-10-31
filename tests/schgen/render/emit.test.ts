/**
 * Ported from digital-pedal-platform's `tools/schgen/render/emit.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { parse, type SList } from "../../../lib/kicad/sexpr.ts";
import { cap, RAILS, res, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { CircuitSpec } from "../../../lib/schgen/ir/types.ts";
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts";
import { emitContext, emitRoot, emitSheet } from "../../../lib/schgen/render/emit.ts";
import { fmtMm } from "../../../lib/schgen/render/geometry.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { refsSpot } from "../../../lib/schgen/render/text-boxes.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const PARTS = [cap("C1", "3V3", "GND"), { ...cap("C2", "3V3", "GND"), dnp: true }];
const spec: CircuitSpec = {
  parts: PARTS,
  blocks: [{ id: "DEC", sheet: "pwr", title: "Decoupling", members: ["C1", "C2"], checklist: [], rendering: { kind: "wired", template: "decoupling-bank", anchor: null } }],
  sheets: [{ id: "pwr", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] }],
  rails: RAILS,
  orientations: noOrientationPreferences(PARTS),
  portDirections: NO_PORT_DIRECTIONS,
};
const c = buildCircuit(spec, { symbols });
const refs = annotate(c, EMPTY_LOCK, new Map()).refs;
const ctx = emitContext("mini", c, symbols, refs, ["generated", "kicad 10.0.5"], "usable");
const text = () => emitSheet(layoutSheet(c, "pwr", symbols, "Pwr:PWR_FLAG"), ctx);

const kids = (l: SList, head: string) => l.lists.filter((x) => x.head === head);

describe("emitSheet", () => {
  it("writes the KiCad 10 header and a closing embedded_fonts", () => {
    const root = parse(text());
    expect(root.head).toBe("kicad_sch");
    expect(kids(root, "version")[0]?.atoms[1]?.value).toBe("20260306");
    expect(kids(root, "generator")[0]?.atoms[1]?.value).toBe("schgen");
    expect(kids(root, "generator_version")[0]?.atoms[1]?.value).toBe("10.0");
    expect(root.lists[root.lists.length - 1]?.head).toBe("embedded_fonts");
  });

  it("is byte-identical across runs", () => {
    expect(text()).toBe(text());
  });

  it("gives each placed symbol its instance path under the root and sheet uuids", () => {
    const root = parse(text());
    const c1 = kids(root, "symbol").find((s) => s.lists.some((p) => p.head === "property" && p.atoms[2]?.value === "C1"));
    const path = c1?.lists.find((l) => l.head === "instances")?.lists[0]?.lists[0];
    expect(path?.atoms[1]?.value).toBe(`/${ctx.rootUuid}/${ctx.sheetUuids.get("pwr")}`);
  });

  it("marks DNP parts (dnp yes) and keeps their BOM fields", () => {
    const root = parse(text());
    const c2 = kids(root, "symbol").find((s) => s.lists.some((p) => p.head === "property" && p.atoms[2]?.value === "C2"));
    expect(c2?.lists.find((l) => l.head === "dnp")?.atoms[1]?.value).toBe("yes");
    expect(c2?.lists.some((l) => l.head === "property" && l.atoms[1]?.value === "SupplierPart")).toBe(true);
  });

  it("embeds each lib symbol once, named Lib:Name", () => {
    const names = kids(kids(parse(text()), "lib_symbols")[0]!, "symbol").map((s) => s.atoms[1]?.value);
    expect(names).toEqual(["Fix:C", "Pwr:+3V3", "Pwr:GND"]);
  });

  it("emits a junction at every junctionPoints() point and nowhere else", () => {
    const d = layoutSheet(c, "pwr", symbols, "Pwr:PWR_FLAG");
    const at = kids(parse(text()), "junction").map((j) => j.lists.find((l) => l.head === "at")!.atoms.slice(1, 3).map((a) => a.value).join(","));
    // C1 and C2 share each rail row; the left end of each row (pin + row wire + anchor stub) is the only 3-way meeting.
    expect(d.junctions).toHaveLength(2);
    expect(at.sort()).toEqual(d.junctions.map((p) => `${fmtMm(p.x)},${fmtMm(p.y)}`).sort());
  });

  it("gives power symbols the rail as Value", () => {
    const values = kids(parse(text()), "symbol")
      .filter((s) => s.lists.some((l) => l.head === "lib_id" && l.atoms[1]?.value.startsWith("Pwr:")))
      .map((s) => s.lists.find((p) => p.head === "property" && p.atoms[1]?.value === "Value")?.atoms[2]?.value);
    expect(new Set(values)).toEqual(new Set(["3V3", "GND"]));
  });
});

describe("emitRoot", () => {
  it("lists every sheet with page numbers and the root sheet_instances", () => {
    const root = parse(emitRoot(ctx));
    const sheet = kids(root, "sheet")[0]!;
    expect(sheet.lists.find((l) => l.head === "uuid")?.atoms[1]?.value).toBe(ctx.sheetUuids.get("pwr"));
    expect(sheet.lists.find((l) => l.head === "instances")?.lists[0]?.lists[0]?.lists[0]?.atoms[1]?.value).toBe("2");
    expect(kids(root, "sheet_instances")).toHaveLength(1);
  });
});

describe("global labels", () => {
  const twoParts = [res("R_T", "3V3", "TAP"), res("R_B", "TAP", "GND"), res("R_L", "TAP", "GND")];
  const twoSheets: CircuitSpec = {
    parts: twoParts,
    blocks: [
      { id: "DIV", sheet: "pwr", title: "Divider", members: ["R_T", "R_B"], checklist: [], rendering: { kind: "wired", template: "divider", anchor: null } },
      { id: "LOAD", sheet: "io", title: "Load", members: ["R_L"], checklist: [], rendering: { kind: "bus", groups: [] } },
    ],
    sheets: [
      { id: "pwr", title: "Power", file: "power.kicad_sch", paper: "A4", notes: [] },
      { id: "io", title: "IO", file: "io.kicad_sch", paper: "A4", notes: [] },
    ],
    rails: RAILS,
    orientations: noOrientationPreferences(twoParts),
    portDirections: NO_PORT_DIRECTIONS,
  };
  const c2 = buildCircuit(twoSheets, { symbols });
  const ctx2 = emitContext("mini", c2, symbols, annotate(c2, EMPTY_LOCK, new Map()).refs, ["generated"], "usable");

  it("show their intersheet references beyond the label outline, where the layout reserved room for them", () => {
    const d = layoutSheet(c2, "io", symbols, "Pwr:PWR_FLAG");
    const label = d.labels.find((l) => l.net === "TAP");
    expect(label?.refs).toBe("[2,3]");
    const node = kids(parse(emitSheet(d, ctx2)), "global_label").find((l) => l.atoms[1]?.value === "TAP");
    const field = node?.lists.find((l) => l.head === "property" && l.atoms[1]?.value === "Intersheetrefs");
    expect(field?.atoms[2]?.value).toBe("${INTERSHEET_REFS}");
    expect(field?.lists.some((l) => l.head === "hide")).toBe(false);
    const spot = refsSpot(label!);
    const at = field?.lists.find((l) => l.head === "at")?.atoms.slice(1).map((a) => a.value);
    expect(at).toEqual([fmtMm(spot.at.x), fmtMm(spot.at.y), spot.vertical ? "90" : "0"]);
  });
});
