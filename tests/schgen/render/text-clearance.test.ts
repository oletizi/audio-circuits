/**
 * Ported from digital-pedal-platform's `tools/schgen/render/textClearance.test.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only), and DIVERGED from it by Task 8 of the M1
 * schematic-authoring plan, twice over.
 *
 * **One:** decision D3 deletes the `labels` rendering this file passed to `blockCircuit` twice,
 * and it is `{ kind: "bus", groups: [] }` - the kind `valuesAlong` still treats as `labels` was
 * treated, so the power values this file measures run the same way.
 *
 * **Two:** the `FieldScene` literal in "placeFields refusal" names `block: "B"` where it named
 * `scope: "block B"`. `tryPlaceFields` needs the block's ID to build the `clearance` mismatch its
 * widened result carries, and carrying the id and the prose would be one fact in two places, so
 * the prose is derived from the id. The message this test asserts is unchanged.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

import { describe, expect, it } from "bun:test";
import { blockCircuit, res, symbols } from "../__fixtures__/circuits.ts";
import type { BlockLayout } from "../../../lib/schgen/render/block-types.ts";
import { checkLayout, subgraphOf } from "../../../lib/schgen/render/blocks.ts";
import { blockFields, placeFields } from "../../../lib/schgen/render/field-placement.ts";
import { GRID, segmentHitsBox } from "../../../lib/schgen/render/geometry.ts";
import {
  frameTitleSpot, INSIDE_SLOTS, OUTSIDE_SLOTS, slotFields, labelBox, powerValueBox, powerValueSpot, refsSpot, REFS_GAP, reservedReference, textBox,
} from "../../../lib/schgen/render/text-boxes.ts";
import { textProblems, type TextScene } from "../../../lib/schgen/render/text-scene.ts";

describe("body boxes", () => {
  it("exclude pin tips: graphics plus the body-side pin ends only", () => {
    const c = symbols.resolve("Fix:C");
    expect(c.bodies.get(1)).toEqual({ minX: -2032, minY: -1016, maxX: 2032, maxY: 1016 });
    expect(c.boxes.get(1)).toEqual({ minX: -2032, minY: -3810, maxX: 2032, maxY: 3810 });
  });

  it("key a unit-0-only symbol's body as unit 1", () => {
    expect([...symbols.resolve("Pwr:PWR_FLAG").bodies.keys()]).toEqual([1]);
  });
});

describe("field placement", () => {
  const body = { minX: -2032, minY: -1016, maxX: 2032, maxY: 1016 };

  it("places outside slots by KiCad's convention: right/left stacked about the middle, centred above/below", () => {
    expect(slotFields(body, "right")).toEqual({
      reference: { at: { x: 2032 + GRID, y: -GRID }, justify: "left" }, value: { at: { x: 2032 + GRID, y: GRID }, justify: "left" },
    });
    expect(slotFields(body, "left").value).toEqual({ at: { x: -2032 - GRID, y: GRID }, justify: "right" });
    expect(slotFields(body, "up")).toEqual({
      reference: { at: { x: 0, y: -1016 - 3 * GRID }, justify: "center" }, value: { at: { x: 0, y: -1016 - GRID }, justify: "center" },
    });
    expect(slotFields(body, "down").reference).toEqual({ at: { x: 0, y: 1016 + GRID }, justify: "center" });
  });

  it("places inside slots on the body's centre and the centres of its quarters", () => {
    const big = { minX: 0, minY: 0, maxX: 40_000, maxY: 20_000 };
    expect(slotFields(big, "centre").reference.at).toEqual({ x: 20_000, y: 10_000 - GRID });
    expect(slotFields(big, "top-left").value.at).toEqual({ x: 10_000, y: 5_000 + GRID });
    expect(slotFields(big, "bottom-right").reference.at).toEqual({ x: 30_000, y: 15_000 - GRID });
    expect(INSIDE_SLOTS).toEqual(["centre", "top-left", "top-right", "bottom-left", "bottom-right"]);
    expect(OUTSIDE_SLOTS).toEqual(["right", "up", "left", "down"]);
  });

  it("puts a power value beyond its glyph on the side away from the pin", () => {
    const at = { x: 0, y: 0 };
    expect(powerValueSpot({ minX: -762, minY: -2540, maxX: 762, maxY: 0 }, at, false)).toEqual({ at: { x: 0, y: -2540 - GRID }, justify: "center", vertical: false });
    expect(powerValueSpot({ minX: -1270, minY: 0, maxX: 1270, maxY: 2540 }, at, false)).toEqual({ at: { x: 0, y: 2540 + GRID }, justify: "center", vertical: false });
    expect(powerValueSpot({ minX: -2540, minY: -762, maxX: 0, maxY: 762 }, at, false)).toEqual({ at: { x: -2540 - GRID, y: 0 }, justify: "right", vertical: false });
    expect(powerValueSpot({ minX: 0, minY: -762, maxX: 2540, maxY: 762 }, at, false)).toEqual({ at: { x: 2540 + GRID, y: 0 }, justify: "left", vertical: false });
  });

  it("runs a bus block's power value along an up/down glyph, so adjacent pins' values do not collide", () => {
    const at = { x: 0, y: 0 };
    const up = powerValueSpot({ minX: -762, minY: -2540, maxX: 762, maxY: 0 }, at, true);
    expect(up).toEqual({ at: { x: 0, y: -2540 - 635 }, justify: "left", vertical: true });
    expect(powerValueBox(up, "3V3")).toEqual({ minX: -635, minY: -3175 - 3 * GRID, maxX: 635, maxY: -3175 });
    const down = powerValueSpot({ minX: -1270, minY: 0, maxX: 1270, maxY: 2540 }, at, true);
    expect(powerValueBox(down, "GND")).toEqual({ minX: -635, minY: 3175, maxX: 635, maxY: 3175 + 3 * GRID });
    expect(powerValueSpot({ minX: 0, minY: -762, maxX: 2540, maxY: 762 }, at, true).vertical).toBe(false);
  });

  it("insets a frame title at least 1.905 mm from the frame's top and left borders", () => {
    const frame = { minX: 0, minY: 0, maxX: 50_800, maxY: 25_400 };
    const b = textBox(frameTitleSpot(frame), "Title");
    expect(b.minX - frame.minX).toBeGreaterThanOrEqual(1905);
    expect(b.minY - frame.minY).toBeGreaterThanOrEqual(1905);
  });

  it("sizes text one grid step per character and reserves three reference digits", () => {
    expect(textBox({ at: { x: 0, y: 0 }, justify: "left" }, "abc")).toEqual({ minX: 0, minY: -635, maxX: 3 * GRID, maxY: 635 });
    expect(textBox({ at: { x: 0, y: 0 }, justify: "right" }, "ab")).toEqual({ minX: -2 * GRID, minY: -635, maxX: 0, maxY: 635 });
    expect(reservedReference("R")).toBe("R000");
    expect(labelBox({ net: "AB", at: { x: 0, y: 0 }, side: "up", refs: "" })).toEqual({ minX: -GRID, minY: -4 * GRID, maxX: GRID, maxY: 0 });
  });

  it("extends a global label's box past its outline by its intersheet references and their gap", () => {
    const at = { x: 0, y: 0 };
    expect(labelBox({ net: "AB", at, side: "right", refs: "[2,3]" })).toEqual({ minX: 0, minY: -GRID, maxX: 4 * GRID + REFS_GAP + 5 * GRID, maxY: GRID });
    expect(labelBox({ net: "AB", at, side: "down", refs: "[2]" })).toEqual({ minX: -GRID, minY: 0, maxX: GRID, maxY: 4 * GRID + REFS_GAP + 3 * GRID });
    expect(refsSpot({ net: "AB", at, side: "left", refs: "[2]" })).toEqual({ at: { x: -(4 * GRID + REFS_GAP), y: 0 }, justify: "right", vertical: false });
    expect(refsSpot({ net: "AB", at, side: "up", refs: "[2]" })).toEqual({ at: { x: 0, y: -(4 * GRID + REFS_GAP) }, justify: "left", vertical: true });
  });
});

describe("textProblems", () => {
  const empty: TextScene = { scope: "t", texts: [], segments: [], bodies: [], pinTexts: [], strokes: [], frames: [], crosses: [] };
  const t = (what: string, minX: number, minY: number, maxX: number, maxY: number) => ({ what, box: { minX, minY, maxX, maxY } });

  it("names both items of a text overlapping a text, a wire, a body and a frame border", () => {
    const scene: TextScene = {
      ...empty,
      texts: [t("A", 0, 0, 10, 10), t("B", 5, 5, 15, 15)],
      segments: [{ what: "W", a: { x: -5, y: 2 }, b: { x: 3, y: 2 } }],
      bodies: [t("BODY", 8, -5, 9, 1)],
      frames: [t("F", 12, 12, 100, 100)],
    };
    expect(textProblems(scene)).toEqual(["A overlaps B", "A overlaps W", "A overlaps BODY", "B crosses the border of F"]);
  });

  it("allows a wire that only touches a text box's edge and a text strictly inside a frame", () => {
    const scene: TextScene = {
      ...empty,
      texts: [t("L", 0, -10, 20, 10)],
      segments: [{ what: "stub", a: { x: -10, y: 0 }, b: { x: 0, y: 0 } }],
      frames: [t("F", -50, -50, 50, 50)],
    };
    expect(textProblems(scene)).toEqual([]);
  });
});

describe("block-level text clearance (checkLayout)", () => {
  const two = () => {
    const c = blockCircuit([res("R1", "N1", "N2"), res("R2", "N1", "N2")], { kind: "bus", groups: [] }, { external: [] });
    return subgraphOf(c, "B", symbols);
  };

  it("moves fields off a wire that crosses the conventional slot: R1's go left of its body", () => {
    const g = two();
    // R1 and R2 upright 10.16 apart; the N1 row is split at x = 3.81, where a stub drops through R1's right-hand slot.
    const layout: BlockLayout = {
      placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }, { part: "R2", unit: 1, at: { x: 10_160, y: 0 }, rot: 0 }],
      wires: [
        { a: { x: 0, y: -3810 }, b: { x: 3810, y: -3810 }, net: "N1" },
        { a: { x: 3810, y: -3810 }, b: { x: 10_160, y: -3810 }, net: "N1" },
        { a: { x: 3810, y: -3810 }, b: { x: 3810, y: 0 }, net: "N1" },
        { a: { x: 0, y: 3810 }, b: { x: 10_160, y: 3810 }, net: "N2" },
      ],
      anchors: [],
    };
    // (The fixture's nets are labelled, so checkLayout also reports their missing labels; only text is asserted here.)
    expect(checkLayout(g, layout).filter((p) => p.includes(" overlaps "))).toEqual([]);
    const r1 = blockFields(g, layout, symbols).find((t) => t.key === "R1#1")!;
    expect(r1.inside).toBe(false);
    expect(r1.fields.reference).toEqual({ at: { x: -1016 - GRID, y: -GRID }, justify: "right" });
  });

  it("reports a label drawn over another unit's body, naming both", () => {
    const g = two();
    const layout: BlockLayout = {
      placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }, { part: "R2", unit: 1, at: { x: 5080, y: -7620 }, rot: 0 }],
      wires: [{ a: { x: 0, y: -3810 }, b: { x: 0, y: -6350 }, net: "N1" }],
      anchors: [{ net: "N1", at: { x: 0, y: -6350 }, side: "right" }],
    };
    expect(checkLayout(g, layout).filter((p) => p.startsWith("label "))).toContain("label N1 at (0, -6.35) overlaps body of R2#1");
  });
});

describe("segmentHitsBox", () => {
  const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  it("counts a diagonal through the interior, not one grazing a corner or running along an edge", () => {
    expect(segmentHitsBox({ x: -5, y: -5 }, { x: 15, y: 15 }, box)).toBe(true);
    expect(segmentHitsBox({ x: -5, y: 5 }, { x: 5, y: -5 }, box)).toBe(false);
    expect(segmentHitsBox({ x: 0, y: -5 }, { x: 0, y: 15 }, box)).toBe(false);
    expect(segmentHitsBox({ x: 20, y: 0 }, { x: 30, y: 10 }, box)).toBe(false);
  });
});

/**
 * **THIS WAS "placeFields refusal" AND TASK 24 DELETED THE REFUSAL.** The placer takes the
 * least-covered candidate instead, so what the saturated neighbourhood now produces is a placement
 * with a `FieldFallback` naming what it is drawn over. The case is kept rather than deleted: it is
 * the only one in this file that drives the whole-neighbourhood case, and a saturated scene is
 * exactly where the behaviour changed.
 */
describe("placeFields with nowhere clear to go", () => {
  it("places a unit whose every candidate slot is crossed by wiring, and says what it covers", () => {
    const c = blockCircuit([res("R1", "N1", "N2")], { kind: "bus", groups: [] }, { external: [] });
    const g = subgraphOf(c, "B", symbols);
    // Horizontal wires every 1.27 mm across the whole neighbourhood: no text box can avoid them.
    const wires = Array.from({ length: 41 }, (_, i) => ({ a: { x: -40_000, y: (i - 20) * 1270 }, b: { x: 40_000, y: (i - 20) * 1270 }, net: "N1" }));
    const placed = placeFields({ block: "B", units: g.units, placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }], wires, powers: [], labels: [], libs: symbols });
    const u = placed.find((p) => p.key === "R1#1");
    if (u === undefined) throw new Error("R1#1 was not placed");
    expect(u.fallback).not.toBeNull();
    expect(u.fallback?.key).toBe("R1#1");
    expect(u.fallback?.libId).toBe("Fix:R");
    expect(u.fallback?.covers.some((cover) => cover.startsWith("wire "))).toBe(true);
    // CONTROL: the same unit with no wires at all places cleanly, so the fallback above is the
    // saturation and not a property of this fixture.
    const clean = placeFields({ block: "B", units: g.units, placements: [{ part: "R1", unit: 1, at: { x: 0, y: 0 }, rot: 0 }], wires: [], powers: [], labels: [], libs: symbols });
    expect(clean.find((p) => p.key === "R1#1")?.fallback).toBeNull();
  });
});

describe("library pin text and interior graphics", () => {
  it("reads pin_names offset/hide and pin_numbers hide, defaulting the offset to KiCad's 0.508 mm", () => {
    expect(symbols.resolve("Fix:OPAMP2").pinText).toEqual({ namesOffset: 1016, namesHidden: false, numbersHidden: false });
    expect(symbols.resolve("Fix:C").pinText).toEqual({ namesOffset: 508, namesHidden: false, numbersHidden: true });
    expect(symbols.resolve("Pwr:GND").pinText).toEqual({ namesOffset: 0, namesHidden: true, numbersHidden: true });
  });

  it("collects a unit's strokes: rectangle edges, polyline legs", () => {
    const big = symbols.resolve("Fix:BIG8").graphics.get(1)!;
    expect(big.segments).toHaveLength(4);
    expect(big.segments[0]).toEqual([[-7620, 5080], [7620, 5080]]);
    const d = symbols.resolve("Fix:D").graphics.get(1)!;
    expect(d.segments).toHaveLength(1 + 3);
    expect(d.blocks).toEqual([]);
  });
});

describe("own-body exemption", () => {
  it("lets a unit's fields overlap its body only when they were placed inside it", () => {
    const body = { what: "body of U1#1", box: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, owner: "U1#1" };
    const field = (owner: string | undefined) => ({ what: "Value of U1#1", box: { minX: 2, minY: 2, maxX: 8, maxY: 4 }, owner });
    const scene = (owner: string | undefined): TextScene => ({ scope: "t", texts: [field(owner)], segments: [], bodies: [body], pinTexts: [], strokes: [], frames: [], crosses: [] });
    expect(textProblems(scene("U1#1"))).toEqual([]);
    expect(textProblems(scene(undefined))).toEqual(["Value of U1#1 overlaps body of U1#1"]);
  });
});
