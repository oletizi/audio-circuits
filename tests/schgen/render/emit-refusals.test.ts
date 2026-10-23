/**
 * Ported from digital-pedal-platform's `tools/schgen/render/emitRefusals.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { parse } from "../../../lib/kicad/sexpr.ts";
import { cap, RAILS, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { CircuitSpec } from "../../../lib/schgen/ir/types.ts";
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts";
import { emitContext, emitRoot, emitSheet } from "../../../lib/schgen/render/emit.ts";
import { fieldOrientation, globalLabel } from "../../../lib/schgen/render/emit-items.ts";
import { print } from "../../../lib/schgen/render/sexpr-write.ts";
import { fmtMm } from "../../../lib/schgen/render/geometry.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { uuidV5 } from "../../../lib/schgen/render/uuid.ts";
import type { SheetDrawing } from "../../../lib/schgen/render/sheet-types.ts";
import { NO_PORT_DIRECTIONS, noOrientationPreferences } from "../__fixtures__/orientations.ts";

const PARTS = [cap("C1", "3V3", "GND"), cap("C2", "3V3", "GND")];
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
const ctx = emitContext("mini", c, symbols, refs, ["generated"]);
const d = layoutSheet(c, "pwr", symbols, "Pwr:PWR_FLAG");

describe("emit refusals", () => {
  it("refuses a placed part with no reference", () => {
    const noRefs = emitContext("mini", c, symbols, new Map(), []);
    expect(() => emitSheet(d, noRefs)).toThrow(/C1 has no reference/);
  });

  it("refuses a reference longer than the width its fields were laid out for", () => {
    const long = emitContext("mini", c, symbols, new Map([...refs, ["C1", "C1000"]]), []);
    expect(() => emitSheet(d, long)).toThrow(/part C1's reference C1000 is longer than the 4 characters \(C000\)/);
  });

  it("refuses a placed part the circuit does not know", () => {
    const first = d.symbols[0]!;
    const bad: SheetDrawing = { ...d, symbols: [{ ...first, part: "NOPE" }] };
    expect(() => emitSheet(bad, ctx)).toThrow(/unknown part NOPE/);
  });

  it("refuses a sheet with no uuid in the context", () => {
    expect(() => emitSheet(d, { ...ctx, sheetUuids: new Map() })).toThrow(/sheet pwr has no uuid/);
  });

  it("refuses two items with the same uuid key", () => {
    const bad: SheetDrawing = { ...d, wires: [...d.wires, d.wires[0]!] };
    expect(() => emitSheet(bad, ctx)).toThrow(/duplicate item key wire:pwr:/);
  });

  it("keys a wire independently of its drawing direction", () => {
    const w = d.wires[0]!;
    const bad: SheetDrawing = { ...d, wires: [...d.wires, { ...w, a: w.b, b: w.a }] };
    expect(() => emitSheet(bad, ctx)).toThrow(/duplicate item key wire:pwr:/);
  });

  it("refuses more title comments than KiCad's nine", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `c${i}`);
    expect(() => emitContext("mini", c, symbols, refs, ten)).toThrow(/at most 9 title comments/);
  });

  it("refuses duplicate sheet ids", () => {
    const twice = { ...c, sheets: [...c.sheets, ...c.sheets] };
    expect(() => emitContext("mini", twice, symbols, refs, [])).toThrow(/duplicate sheet id pwr/);
  });

  it("refuses an empty project name", () => {
    expect(() => emitContext("", c, symbols, refs, [])).toThrow(/project name/);
  });

  it("refuses a lib id that does not resolve to the drawn power symbol", () => {
    const p = d.powers[0]!;
    const bad: SheetDrawing = { ...d, powers: [{ ...p, libId: "Fix:R" }] };
    expect(() => emitSheet(bad, ctx)).toThrow(/Fix:R is not a power symbol/);
  });

  it("maps every label side to KiCad's angle and justify", () => {
    const shape = (side: "left" | "right" | "up" | "down"): string => {
      const n = globalLabel("pwr", { net: "SIG", at: { x: 0, y: 0 }, side, refs: "[2]" }).node;
      const root = parse(print(n));
      const at = root.lists.find((l) => l.head === "at")!.atoms.map((x) => x.value).join(" ");
      const justify = root.lists.find((l) => l.head === "effects")!.lists.find((l) => l.head === "justify")!.atoms.map((x) => x.value).join(" ");
      return `${at} | ${justify}`;
    };
    expect([shape("right"), shape("left"), shape("up"), shape("down")]).toEqual([
      "at 0 0 0 | justify left", "at 0 0 180 | justify right", "at 0 0 90 | justify left", "at 0 0 270 | justify right",
    ]);
  });
});

describe("emitRoot layout", () => {
  it("wraps sheets every four and numbers pages from 2", () => {
    const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, title: `S${i}`, file: `s${i}.kicad_sch`, paper: "A4" as const, notes: [] }));
    const many = emitContext("mini", { ...c, sheets }, symbols, refs, []);
    const text = emitRoot(many);
    expect(text).toContain("(at 25.4 25.4)");
    expect(text).toContain("(at 215.9 25.4)");
    expect(text).toContain("(at 25.4 76.2)");
    expect(text).toContain('(page "6")');
    expect(text.endsWith(")\n")).toBe(true);
  });
});

describe("emitted fields and pins", () => {
  const root = parse(emitSheet(d, ctx));
  const c1 = root.lists.find((l) => l.head === "symbol" && l.lists.some((p) => p.head === "property" && p.atoms[2]?.value === "C1"))!;
  const placed = d.symbols.find((s) => s.part === "C1")!;

  it("draws Reference and Value right of the body (pin tips excluded), justified left", () => {
    const at = (name: string) => c1.lists.find((p) => p.head === "property" && p.atoms[1]?.value === name)!.lists.find((l) => l.head === "at")!;
    expect(at("Reference").atoms.slice(1, 3).map((a) => a.value)).toEqual([fmtMm(placed.body.maxX + 1270), fmtMm(placed.at.y - 1270)]);
    expect(at("Value").atoms.slice(1, 3).map((a) => a.value)).toEqual([fmtMm(placed.body.maxX + 1270), fmtMm(placed.at.y + 1270)]);
    expect(placed.body.minY).toBeGreaterThan(placed.box.minY);
  });

  it("keys pin uuids pin:<label>:<unit>:<n>", () => {
    const pin = c1.lists.find((l) => l.head === "pin" && l.atoms[1]?.value === "1")!;
    expect(pin.lists.find((l) => l.head === "uuid")?.atoms[1]?.value).toBe(uuidV5("pin:C1:1:1"));
  });
});

describe("field orientation", () => {
  it("compensates KiCad turning fields with their symbol (kicad-cli 10.0.5 SVG experiment)", () => {
    const rows = ([0, 90, 180, 270] as const).map((rot) => [rot, fieldOrientation(rot, false, "left"), fieldOrientation(rot, true, "left")]);
    expect(rows).toEqual([
      [0, { angle: 0, justify: "left" }, { angle: 90, justify: "left" }],
      [90, { angle: 90, justify: "right" }, { angle: 0, justify: "left" }],
      [180, { angle: 0, justify: "right" }, { angle: 90, justify: "right" }],
      [270, { angle: 90, justify: "left" }, { angle: 0, justify: "right" }],
    ]);
    expect(fieldOrientation(90, false, "center")).toEqual({ angle: 90, justify: null });
  });
});
