/**
 * Ported from digital-pedal-platform's `tools/schgen/render/project.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { INTERSHEET_REFS, libTable, projectFile } from "../../../lib/schgen/render/project.ts";

describe("project files", () => {
  it("writes a minimal project with an empty exclusion list", () => {
    expect(JSON.parse(projectFile("h7-platform", []))).toEqual({
      erc: { erc_exclusions: [] },
      meta: { filename: "h7-platform.kicad_pro", version: 3 },
      schematic: { drawing: INTERSHEET_REFS },
    });
    expect(projectFile("h7-platform", []).endsWith("}\n")).toBe(true);
  });

  it("shows every global label's intersheet references, own page included, as [2,4] (the format pageRefs reserves room for)", () => {
    expect(INTERSHEET_REFS).toEqual({
      intersheets_ref_show: true,
      intersheets_ref_own_page: true,
      intersheets_ref_short: false,
      intersheets_ref_prefix: "[",
      intersheets_ref_suffix: "]",
    });
  });

  it("writes a KIPRJMOD-relative library table", () => {
    expect(libTable("sym", { H7: "${KIPRJMOD}/../../symbols/H7.kicad_sym" })).toBe(
      '(sym_lib_table\n\t(version 7)\n\t(lib\n\t\t(name "H7")\n\t\t(type "KiCad")\n\t\t(uri "${KIPRJMOD}/../../symbols/H7.kicad_sym")\n\t\t(options "")\n\t\t(descr "")\n\t)\n)\n',
    );
  });

  it("sorts entries by nickname and names the footprint table fp_lib_table", () => {
    const t = libTable("fp", { Zeta: "${KIPRJMOD}/z.pretty", Alpha: "${KIPRJMOD}/a.pretty" });
    expect(t.startsWith("(fp_lib_table\n")).toBe(true);
    expect(t.indexOf('"Alpha"')).toBeLessThan(t.indexOf('"Zeta"'));
  });

  it("refuses a library path that is not KIPRJMOD-relative", () => {
    expect(() => libTable("sym", { H7: "/abs/H7.kicad_sym" })).toThrow(/library H7: uri "\/abs\/H7.kicad_sym" must start with \$\{KIPRJMOD\}\//);
  });
});
