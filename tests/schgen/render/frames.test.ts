/**
 * Ported from digital-pedal-platform's `tools/schgen/render/frames.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { cap, RAILS, symbols } from "../__fixtures__/circuits.ts";
import { buildCircuit } from "../../../lib/schgen/ir/build.ts";
import type { SheetSpec } from "../../../lib/schgen/ir/types.ts";
import { blockContent, flagsContent, frameSize, notesContent, titleOf } from "../../../lib/schgen/render/frames.ts";
import { GRID } from "../../../lib/schgen/render/geometry.ts";

const sheet = (notes: SheetSpec["notes"]): SheetSpec => ({ id: "s", title: "S", file: "s.kicad_sch", paper: "A4", notes });

describe("frame contents", () => {
  it("titles with checklist ids only when there are some", () => {
    expect(titleOf("Strap", [])).toBe("Strap");
    expect(titleOf("Dec", ["CORE-01", "CORE-02"])).toBe("Dec [CORE-01, CORE-02]");
  });

  it("puts a note's checklist ids on its last line only, and has no notes frame without notes", () => {
    expect(notesContent(sheet([]))).toBeNull();
    const n = notesContent(sheet([{ lines: ["a", "b"], checklist: ["X-1"] }, { lines: ["c"], checklist: [] }]))!;
    expect(n.texts.map((t) => t.text)).toEqual(["a", "b [X-1]", "c"]);
    expect(n.texts.map((t) => t.at.y)).toEqual([0, 2 * GRID, 4 * GRID]);
  });

  it("points a ground rail's symbol down and its PWR_FLAG up, a supply's the other way", () => {
    const rails = RAILS.map((r) => ({ ...r, pwrFlag: { sheet: "s" } }));
    const f = flagsContent(rails, "s", "Pwr:PWR_FLAG", symbols)!;
    expect(f.powers.map((p) => [p.net, p.flag, p.rot, p.at.x])).toEqual([
      ["GND", false, 0, 0], ["GND", true, 0, 0],
      ["3V3", false, 0, 10 * GRID], ["3V3", true, 180, 10 * GRID],
      ["VDDA", false, 0, 20 * GRID], ["VDDA", true, 180, 20 * GRID],
    ]);
    expect(flagsContent(rails, "other", "Pwr:PWR_FLAG", symbols)).toBeNull();
  });

  it("sizes frames on the grid and wide enough for their title", () => {
    const n = notesContent(sheet([{ lines: ["x"], checklist: [] }]))!;
    const long = { ...n, title: "A very long frame title indeed" };
    expect(frameSize(long).w).toBeGreaterThanOrEqual(long.title.length * GRID);
    expect(frameSize(long).w % GRID).toBe(0);
  });

  it("refuses an unknown block", () => {
    const c = buildCircuit(
      {
        parts: [cap("C1", "3V3", "GND")],
        blocks: [{ id: "B", sheet: "s", title: "B", members: ["C1"], checklist: [], rendering: { kind: "bus", groups: [] } }],
        sheets: [sheet([])], rails: RAILS,
      },
      { symbols },
    );
    expect(() => blockContent(c, "NOPE", symbols)).toThrow(/unknown block NOPE/);
  });
});
