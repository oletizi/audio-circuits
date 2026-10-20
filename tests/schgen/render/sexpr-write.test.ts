/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sexprWrite.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { parse } from "../../../lib/kicad/sexpr.ts";
import { fmtMm, um } from "../../../lib/schgen/render/geometry.ts";
import { fromParsed, headOf, int, list, mm, print, str, sym, yesNo } from "../../../lib/schgen/render/sexpr-write.ts";

describe("micrometre formatting", () => {
  it("converts millimetres to integer micrometres", () => {
    expect(um(3.81)).toBe(3810);
    expect(um(-7.62)).toBe(-7620);
    expect(um(0.635)).toBe(635);
  });

  it("refuses sub-micrometre values instead of rounding them", () => {
    expect(() => um(1.0005)).toThrow(/1.0005 mm is not a whole number of micrometres/);
  });

  it("formats with trailing zeros stripped and no negative zero", () => {
    expect(fmtMm(50800)).toBe("50.8");
    expect(fmtMm(72390)).toBe("72.39");
    expect(fmtMm(0)).toBe("0");
    expect(fmtMm(-1270)).toBe("-1.27");
    expect(fmtMm(635)).toBe("0.635");
  });
});

describe("print", () => {
  it("prints an all-atom list on one line", () => {
    expect(print(list("at", mm(50800), mm(46990), int(0)))).toBe("(at 50.8 46.99 0)");
  });

  it("puts each nested list on its own line, tab-indented, closing at the parent's indent", () => {
    const node = list("property", str("Reference"), str("R1"), list("at", mm(0), mm(0), int(0)), list("hide", yesNo(true)));
    expect(print(node)).toBe('(property "Reference" "R1"\n\t(at 0 0 0)\n\t(hide yes)\n)');
  });

  it("escapes quotes and backslashes in strings", () => {
    expect(print(list("text", str('a "b" \\c')))).toBe('(text "a \\"b\\" \\\\c")');
  });

  it("refuses newlines in strings (one text item per line instead)", () => {
    expect(() => str("a\nb")).toThrow(/control character/);
  });

  it("refuses a bare symbol that would not round-trip", () => {
    expect(() => sym("a b")).toThrow(/not a bare symbol/);
    expect(() => sym("")).toThrow(/not a bare symbol/);
  });

  it("flattens array arguments in place", () => {
    expect(print(list("pts", [list("xy", mm(0), mm(0)), list("xy", mm(1270), mm(0))]))).toBe(
      "(pts\n\t(xy 0 0)\n\t(xy 1.27 0)\n)",
    );
  });

  it("round-trips through the repository parser", () => {
    const text = print(list("kicad_sch", list("version", int(20260306)), list("generator", str("schgen"))));
    const parsed = parse(text);
    expect(parsed.head).toBe("kicad_sch");
    expect(print(fromParsed(parsed))).toBe(text);
  });
});

describe("fromParsed", () => {
  it("keeps atom and list order exactly as in the source", () => {
    const n = fromParsed(parse('(symbol "R" (pin_numbers (hide yes)) (exclude_from_sim no) "tail")'));
    expect(headOf(n)).toBe("symbol");
    expect(print(n)).toBe('(symbol "R"\n\t(pin_numbers\n\t\t(hide yes)\n\t)\n\t(exclude_from_sim no)\n\t"tail"\n)');
  });

  it("round-trips the escapes the parser decodes exactly (\\\" and \\\\)", () => {
    const src = '(property "V" "a\\"b\\\\c")';
    expect(print(fromParsed(parse(src)))).toBe(src);
  });

  it("refuses a string the parser decoded lossily instead of corrupting it", () => {
    expect(() => fromParsed(parse('(symbol "X" (text "BYTE\\nSTROBE"))'))).toThrow(
      /string at offset 18 uses escape \\n, which the S-expression parser cannot decode faithfully/,
    );
  });
});
