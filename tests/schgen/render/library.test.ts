/**
 * Ported from digital-pedal-platform's `tools/schgen/render/library.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { parse } from "../../../lib/kicad/sexpr.ts";
import { fixtureResolver } from "../__fixtures__/fixture-lib.ts";
import { createResolver, flattenSymbol, type SymbolResolver } from "../../../lib/schgen/render/library.ts";
import { print } from "../../../lib/schgen/render/sexpr-write.ts";

describe("createResolver", () => {
  it("loads a plain symbol, renamed to its lib id", () => {
    const r = fixtureResolver().resolve("Fix:R");
    expect(r.libId).toBe("Fix:R");
    expect(print(r.node).startsWith('(symbol "Fix:R"')).toBe(true);
    expect(r.pins.map((p) => [p.number, p.name, p.type, p.unit, p.x, p.y, p.angle])).toEqual([
      ["1", "", "passive", 1, 0, 3810, 270],
      ["2", "", "passive", 1, 0, -3810, 90],
    ]);
    expect(r.unitCount).toBe(1);
    expect(r.isPower).toBe(false);
  });

  it("flattens extends: the child keeps every parent pin and unit, renamed to the child", () => {
    const x = fixtureResolver().resolve("Fix:OPAMP2X");
    const text = print(x.node);
    expect(text).not.toMatch(/extends/);
    expect(text).toMatch(/\(symbol "OPAMP2X_1_1"/);
    expect(text).toMatch(/\(symbol "OPAMP2X_3_1"/);
    expect(text).not.toMatch(/OPAMP2_1_1/);
    expect(text).toMatch(/"Value" "OPAMP2X"/);
    expect(text).toMatch(/"Description" "child of OPAMP2"/);
    expect(x.pins.map((p) => p.number).sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(x.unitCount).toBe(3);
  });

  it("skips body style 2 (De Morgan) pins so each pin appears once", () => {
    const x = fixtureResolver().resolve("Fix:OPAMP2");
    expect(x.pins.filter((p) => p.number === "8")).toHaveLength(1);
  });

  it("recognises KiCad 10 power symbols and reads unit-0 style-0 pins", () => {
    const flag = fixtureResolver().resolve("Pwr:PWR_FLAG");
    expect(flag.isPower).toBe(true);
    expect(flag.pins).toHaveLength(1);
    expect(flag.pins[0]?.unit).toBe(0);
  });

  it("allows the hidden pin of a power symbol", () => {
    expect(fixtureResolver().resolve("Pwr:GND").pins[0]?.hidden).toBe(true);
  });

  it("refuses a hidden power input on an ordinary symbol, naming the implicit net", () => {
    expect(() => fixtureResolver().resolve("Fix:HIDPWR")).toThrow(
      /Fix:HIDPWR: pin 2 \(VDD\) is a hidden power input; KiCad joins it implicitly to net VDD/,
    );
  });

  it("computes a body box per unit that covers the pins", () => {
    const r = fixtureResolver().resolve("Fix:REG3");
    expect(r.boxes.get(1)).toEqual({ minX: -7620, minY: -6350, maxX: 7620, maxY: 6350 });
  });

  it("names the missing symbol and library", () => {
    expect(() => fixtureResolver().resolve("Fix:NOPE")).toThrow(/no symbol "NOPE"/);
    expect(() => fixtureResolver().resolve("Nope:R")).toThrow(/library nickname "Nope" is not configured/);
    expect(() => fixtureResolver().resolve("R")).toThrow(/lib id "R" is not in Lib:Name form/);
  });

  it("caches: resolving twice returns the same object", () => {
    const res = fixtureResolver();
    expect(res.resolve("Fix:C")).toBe(res.resolve("Fix:C"));
  });

  it("refuses a symbol whose strings carry a \\n escape (stock Analog_DAC style) rather than corrupting it", () => {
    const lib = tempLib('(symbol "T_1_1" (text "BYTE\\nSTROBE" (at 0 0 0)) (pin passive line (at 0 0 0) (length 2.54) (name "A") (number "1")))');
    expect(() => lib.resolve("T:T")).toThrow(/T\.kicad_sym: symbol "T": fromParsed: string at offset \d+ uses escape \\n/);
  });
});

describe("flattenSymbol", () => {
  it("refuses an extends cycle", () => {
    const lib = parse('(kicad_symbol_lib (symbol "A" (extends "B")) (symbol "B" (extends "A")))');
    expect(() => flattenSymbol(lib, "A", "L:A", "L.kicad_sym")).toThrow(/extends cycle: A -> B -> A/);
  });

  it("keeps a flag present only on the child, after the parent's flags", () => {
    const lib = parse('(kicad_symbol_lib (symbol "P" (in_bom yes) (property "Reference" "U")) (symbol "C" (extends "P") (on_board no)))');
    expect(print(flattenSymbol(lib, "C", "L:C", "L.kicad_sym"))).toBe(
      '(symbol "L:C"\n\t(in_bom yes)\n\t(on_board no)\n\t(property "Reference" "U")\n)',
    );
  });
});

describe("pin rules", () => {
  it("refuses an off-grid pin", () => {
    expect(() => fixtureResolver().resolve("Fix:OFFGRID")).toThrow(/Fix:OFFGRID: pin 1 at \(-3.175, 0\) is off the 1.27 mm grid/);
  });

  it("treats a bare hide atom as hidden", () => {
    const lib = tempLib('(symbol "T_1_1" (pin passive line (at 0 0 0) (length 2.54) hide (name "A") (number "1")))');
    expect(lib.resolve("T:T").pins[0]?.hidden).toBe(true);
  });

  it("refuses unsupported angles, unknown pin types and sub-symbols without _U_S", () => {
    expect(() => tempLib('(symbol "T_1_1" (pin passive line (at 0 0 45) (length 2.54) (name "A") (number "1")))').resolve("T:T")).toThrow(
      /T:T: pin 1 has unsupported angle 45/,
    );
    expect(() => tempLib('(symbol "T_1_1" (pin weird line (at 0 0 0) (length 2.54) (name "A") (number "1")))').resolve("T:T")).toThrow(
      /T:T: pin 1 has unknown electrical type weird/,
    );
    expect(() => tempLib('(symbol "T_body" (pin passive line (at 0 0 0) (length 2.54) (name "A") (number "1")))').resolve("T:T")).toThrow(
      /T:T: sub-symbol "T_body" has no _U_S suffix/,
    );
  });

  it("computes the length-along-angle box for every unit", () => {
    const x = fixtureResolver().resolve("Fix:OPAMP2");
    expect(x.boxes.get(3)).toEqual({ minX: -2540, minY: -7620, maxX: -2540, maxY: 7620 });
    expect(x.boxes.get(1)).toEqual({ minX: -7620, minY: -5080, maxX: 7620, maxY: 5080 });
    const flag = fixtureResolver().resolve("Pwr:PWR_FLAG");
    expect(flag.unitCount).toBe(1);
    expect([...flag.boxes.keys()]).toEqual([1]);
    expect(flag.boxes.get(1)).toEqual({ minX: -1016, minY: 0, maxX: 1016, maxY: 2540 });
  });

  it("bounds sub-micrometre graphics outward (floor minima, ceil maxima) while pins stay exact", () => {
    const lib = tempLib(
      '(symbol "T_1_1" (circle (center 0 0) (radius 0.0001)) (polyline (pts (xy 0 0) (xy 4.4423 1.27))) (pin passive line (at 0 0 0) (length 0) (name "A") (number "1")))',
    );
    expect(lib.resolve("T:T").boxes.get(1)).toEqual({ minX: -1, minY: -1, maxX: 4443, maxY: 1270 });
  });

  it("still refuses a sub-micrometre pin coordinate", () => {
    expect(() => tempLib('(symbol "T_1_1" (pin passive line (at 0.0001 0 0) (length 0) (name "A") (number "1")))').resolve("T:T")).toThrow(
      /0.0001 mm is not a whole number of micrometres/,
    );
  });

  it("includes the axis extremes an arc sweeps through, not just its three points", () => {
    const lib = tempLib(
      '(symbol "T_1_1" (arc (start -0.6 0.8) (mid 0.6 0.8) (end 0.8 -0.6)) (pin passive line (at 0 0 0) (length 0) (name "A") (number "1")))',
    );
    expect(lib.resolve("T:T").boxes.get(1)).toEqual({ minX: -600, minY: -600, maxX: 1000, maxY: 1000 });
  });
});

const tempDirs: string[] = [];

afterEach(() => {
  for (const d of tempDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** Write a one-symbol library "T" holding the given sub-symbol text, under nickname "T". */
function tempLib(sub: string): SymbolResolver {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-lib-"));
  tempDirs.push(dir);
  const file = path.join(dir, "T.kicad_sym");
  fs.writeFileSync(file, `(kicad_symbol_lib (version 20251024)\n  (symbol "T" (property "Reference" "U" (at 0 0 0))\n    ${sub}))\n`);
  return createResolver(new Map([["T", file]]));
}
