/**
 * Ported from digital-pedal-platform's `tools/schgen/render/pinMarks.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

import { describe, expect, it } from "bun:test";
import { parse } from "../../../lib/kicad/sexpr.ts";
import { blockCircuit, diode, res, symbols } from "../__fixtures__/circuits.ts";
import type { PartSpec } from "../../../lib/schgen/ir/types.ts";
import { annotate, EMPTY_LOCK } from "../../../lib/schgen/lock/annotate.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { realiseBus } from "../../../lib/schgen/render/bus.ts";
import { emitContext, emitSheet } from "../../../lib/schgen/render/emit.ts";
import { boxesOverlap, GRID } from "../../../lib/schgen/render/geometry.ts";
import { dnpCross, pinMarkBox, pinMarks } from "../../../lib/schgen/render/pin-marks.ts";
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts";
import { textProblems, textScene } from "../../../lib/schgen/render/text-scene.ts";

const LABELS = { kind: "bus", groups: [] } as const;
const dnp = (p: PartSpec): PartSpec => ({ ...p, dnp: true });

function unitOf(parts: PartSpec[], label: string) {
  const c = blockCircuit(parts, LABELS, { external: ["N1", "N2"] });
  const g = subgraphOf(c, "B", symbols);
  const layout = realiseBus(c, "B", symbols).layout;
  const u = g.units.find((x) => x.part.label === label);
  const pl = layout.placements.find((p) => p.part === label);
  if (u === undefined || pl === undefined) throw new Error(`fixture: no unit ${label}`);
  return { c, g, layout, u, pl };
}

describe("pinMarks", () => {
  it("prints a DNP diode's pin identities beside its pin tips, clear of its pin lines and the DNP cross", () => {
    const { u, pl } = unitOf([dnp(diode("D_Z", "N1", "N2"))], "D_Z");
    const marks = pinMarks(u, pl);
    expect(marks.map((m) => m.text)).toEqual(["K", "A"]);
    // Fix:D pins: K at (-3.81, 0), A at (3.81, 0); horizontal pins put the mark two grid steps below the tip.
    expect(marks.map((m) => m.spot)).toEqual([
      { at: { x: pl.at.x - 3810, y: pl.at.y + 2 * GRID }, justify: "center" },
      { at: { x: pl.at.x + 3810, y: pl.at.y + 2 * GRID }, justify: "center" },
    ]);
    for (const m of marks) expect(pinMarkBox(m).minY).toBeGreaterThan(pl.at.y);
  });

  it("models KiCad's DNP cross (body box grown by 0.6 of the pin overhang, PlotDNP) and keeps every mark off it", () => {
    const { u, pl } = unitOf([dnp(diode("D_Z", "N1", "N2"))], "D_Z");
    // Fix:D body ±1.27 mm, pins out to ±3.81 mm along x: margins 1.524 mm along, 0.457 mm across.
    expect(dnpCross(u, pl)).toEqual({ minX: pl.at.x - 2794, minY: pl.at.y - 1727, maxX: pl.at.x + 2794, maxY: pl.at.y + 1727 });
    const cross = dnpCross(u, pl);
    for (const m of pinMarks(u, pl)) expect(boxesOverlap(pinMarkBox(m), cross!)).toBe(false);
    const fitted = unitOf([diode("D_Z", "N1", "N2")], "D_Z");
    expect(dnpCross(fitted.u, fitted.pl)).toBeNull();
  });

  it("refuses a pin mark under a DNP cross", () => {
    const { g, layout } = unitOf([dnp(diode("D_Z", "N1", "N2"))], "D_Z");
    const scene = textScene("t", symbols, { blocks: [{ g, layout }], powers: [], labels: [], texts: [], frames: [] });
    const cross = scene.crosses[0]!;
    const box = { minX: cross.box.minX + 10, minY: cross.box.minY + 10, maxX: cross.box.minX + 20, maxY: cross.box.minY + 20 };
    expect(textProblems({ ...scene, texts: [{ what: "stray mark", box, mark: true }] }).map((f) => f.what)).toContain("stray mark lies under DNP cross of D_Z#1");
    expect(textProblems({ ...scene, texts: [{ what: "own field", box }] }).map((f) => f.what)).not.toContain("own field lies under DNP cross of D_Z#1");
  });

  it("marks nothing on a fitted diode, or on a DNP part whose pins carry no polarity", () => {
    expect(pinMarks(unitOf([diode("D_Z", "N1", "N2")], "D_Z").u, unitOf([diode("D_Z", "N1", "N2")], "D_Z").pl)).toEqual([]);
    const r = unitOf([dnp(res("R_X", "N1", "N2"))], "R_X");
    expect(pinMarks(r.u, r.pl)).toEqual([]);
  });

  it("puts the marks in the text scene, so the layout and text checks treat them as text", () => {
    const { g, layout } = unitOf([dnp(diode("D_Z", "N1", "N2"))], "D_Z");
    const scene = textScene("t", symbols, { blocks: [{ g, layout }], powers: [], labels: [], texts: [], frames: [] });
    expect(scene.texts.map((t) => t.what)).toEqual(expect.arrayContaining(["pin mark K of D_Z#1", "pin mark A of D_Z#1"]));
    expect(checkLayout(g, layout)).toEqual([]);
  });

  it("is emitted as sheet text at the mark's spot", () => {
    const { c } = unitOf([dnp(diode("D_Z", "N1", "N2"))], "D_Z");
    const d = layoutSheet(c, "s", symbols, "Pwr:PWR_FLAG");
    expect(d.pinMarks.map((m) => m.text)).toEqual(["K", "A"]);
    const ctx = emitContext("mini", c, symbols, annotate(c, EMPTY_LOCK, new Map()).refs, ["generated"]);
    const texts = parse(emitSheet(d, ctx)).lists.filter((l) => l.head === "text").map((t) => t.atoms[1]?.value);
    expect(texts).toEqual(expect.arrayContaining(["K", "A"]));
  });
});
