/**
 * Ported from digital-pedal-platform's `tools/schgen/render/frames.ts`, and DIVERGED from it by
 * Task 12 of the M1 schematic-authoring plan: `blockContent` takes the ELK `Backend` and passes it
 * to `renderBlock`. That one parameter is the whole divergence.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G186**.
 */

/**
 * Frame contents in local coordinates: a realised block, the sheet's notes, or the sheet's
 * PWR_FLAGs. Each content knows its local extent; the sheet packer places the frames and each
 * content is translated by a grid-multiple offset into its frame, below the title band.
 */
import type { Finding } from "../findings.ts";
import type { BlockId, Circuit, NetName, RailSpec, SheetId, SheetSpec } from "../ir/types.ts";
import type { Backend, BlockLayout, BlockSubgraph } from "./block-types.ts";
import { subgraphOf } from "./blocks.ts";
import { renderBlock } from "./bus.ts";
import { assertOnGrid, GRID, gridCeil, gridFloor, placeBox, unionBox, type Point, type Side, type Um } from "./geometry.ts";
import { PITCH } from "./layout-kit.ts";
import type { Box, SymbolResolver } from "./library.ts";
import type { Size } from "./pack.ts";
import type { Frame, PowerSymbol, SheetText } from "./sheet-types.ts";
import { powerRotation, textBox, textWidth } from "./text-boxes.ts";
import { anchorsToSymbols, valuesAlong } from "./power-text.ts";
import { textScene, type SceneParts } from "./text-scene.ts";

/** Pitch of text lines: title band rows, legend lines and note lines. */
export const LINE: Um = 2 * GRID;

export { labelExtent, powerRotation, textWidth } from "./text-boxes.ts";

export interface FrameContent {
  readonly blockId: BlockId | null;
  readonly title: string;
  /** Lines printed in the title band under the title. */
  readonly legend: readonly string[];
  /** Local extent of everything drawn inside the frame. */
  readonly box: Box;
  readonly block: { readonly g: BlockSubgraph; readonly layout: BlockLayout } | null;
  readonly powers: readonly PowerSymbol[];
  readonly texts: readonly SheetText[];
  /**
   * **What a gate found wrong with this frame's block, empty for a clean one and for the notes and
   * power-flag frames** - Task 3 of `docs/superpowers/plans/2026-10-27-gates-classify.md`.
   *
   * `layoutSheet` reads the packed contents and never calls `renderBlock` itself, so this field is
   * the only route a block-level finding has onto the sheet. Without it a crowded drawing had to be
   * thrown at the block to be reported at all, which is the hiding the spec forbids.
   */
  readonly findings: readonly Finding[];
}

const pointBox = (p: Point): Box => ({ minX: p.x, minY: p.y, maxX: p.x, maxY: p.y });

/** Every drawn text and power glyph of `parts` (textScene), as boxes. */
function drawnBoxes(symbols: SymbolResolver, parts: SceneParts): Box[] {
  const scene = textScene("frame", symbols, parts);
  return [...scene.texts, ...scene.bodies].map((n) => n.box);
}

function unionAll(boxes: readonly Box[], what: string): Box {
  const [first, ...rest] = boxes;
  if (first === undefined) throw new Error(`${what} draws nothing`);
  return rest.reduce(unionBox, first);
}

export function titleOf(title: string, checklist: readonly string[]): string {
  return checklist.length === 0 ? title : `${title} [${checklist.join(", ")}]`;
}

/**
 * **`elk` IS TASK 12's ADDITION AND IT IS WHY THIS FILE IS DIVERGED** (`docs/known-gaps.md`
 * **G186**). An `auto` block that no template draws needs the ELK backend, and `renderBlock` ->
 * `realiseBlock` is where it is used; this is the parameter that carries it from `layoutSheet`.
 * It defaults to `null` for `docs/known-gaps.md` **G146**'s reason - a missing backend REFUSES,
 * naming the block - and the default is what keeps every ported caller unchanged.
 */
export function blockContent(c: Circuit, id: BlockId, symbols: SymbolResolver, elk: Backend | null = null): FrameContent {
  const block = c.blocks.get(id);
  if (block === undefined) throw new Error(`unknown block ${id}`);
  const { layout, legend, findings } = renderBlock(c, id, symbols, elk);
  const g = subgraphOf(c, id, symbols);
  const bodies = layout.placements.map((pl) => {
    const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    const box = u?.symbol.boxes.get(pl.unit);
    if (box === undefined) throw new Error(`block ${id}: no body box for ${pl.part}#${pl.unit}`);
    return placeBox(pl.at, pl.rot, box);
  });
  const wireEnds = layout.wires.flatMap((w) => [pointBox(w.a), pointBox(w.b)]);
  const { powers, labels } = anchorsToSymbols(g, layout.anchors, valuesAlong(block.rendering));
  const drawn = drawnBoxes(symbols, { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] });
  return {
    blockId: id,
    title: titleOf(block.title, block.checklist),
    legend,
    box: unionAll([...bodies, ...wireEnds, ...drawn], `block ${id}`),
    block: { g, layout },
    powers: [],
    texts: [],
    findings,
  };
}

/** One text per note line; the last line of each note carries its checklist ids. */
export function notesContent(sheet: SheetSpec): FrameContent | null {
  const lines = sheet.notes.flatMap((n) =>
    n.lines.map((line, i) => (i === n.lines.length - 1 && n.checklist.length > 0 ? `${line} [${n.checklist.join(", ")}]` : line)),
  );
  if (lines.length === 0) return null;
  const texts = lines.map((text, k) => ({ text, at: { x: 0, y: k * LINE } }));
  return {
    blockId: null, title: "Notes", legend: [], block: null, powers: [], texts, findings: [],
    box: unionAll(texts.map((t) => textBox({ at: t.at, justify: "left" }, t.text)), "notes"),
  };
}

/** One PWR_FLAG and the rail's power symbol per flagged rail, at one point (the coincidence connects them). */
export function flagsContent(rails: readonly RailSpec[], sheet: SheetId, flagLibId: string, symbols: SymbolResolver): FrameContent | null {
  const flagged = rails.filter((r) => r.pwrFlag?.sheet === sheet);
  if (flagged.length === 0) return null;
  // One column per rail, wide enough that neighbouring values ("PWR_FLAG", the rail name) keep a grid step apart.
  const step = Math.max(2 * PITCH, gridCeil(Math.max(...flagged.map((r) => textWidth(r.net)), textWidth("PWR_FLAG"))) + 2 * GRID);
  const powers = flagged.flatMap((r, i): PowerSymbol[] => {
    const at = { x: i * step, y: 0 };
    const side: Side = r.kind === "ground" ? "down" : "up";
    // PWR_FLAG's body points up at rotation 0, like a supply symbol; point it opposite the rail's body.
    const flagSide: Side = side === "up" ? "down" : "up";
    return [
      { net: r.net, libId: r.symbol, at, rot: powerRotation(r.kind, side), flag: false, valueAlong: false },
      { net: r.net, libId: flagLibId, at, rot: powerRotation("supply", flagSide), flag: true, valueAlong: false },
    ];
  });
  const box = unionAll(drawnBoxes(symbols, { blocks: [], powers, labels: [], texts: [], frames: [] }), "power flags");
  return { blockId: null, title: "Power flags", legend: [], block: null, powers, texts: [], box, findings: [] };
}

const bandHeight = (f: FrameContent): Um => (1 + f.legend.length) * LINE;

/** Content box grown by two grid steps, title band on top, wide enough for the band's text. */
export function frameSize(f: FrameContent): Size {
  const content = gridCeil(f.box.maxX) - gridFloor(f.box.minX) + 4 * GRID;
  const text = gridCeil(Math.max(...[f.title, ...f.legend].map(textWidth))) + 4 * GRID;
  return { w: Math.max(content, text), h: gridCeil(f.box.maxY) - gridFloor(f.box.minY) + 4 * GRID + bandHeight(f) };
}

/** Grid-multiple offset putting the content inside a frame at `at`, below the title band. */
export function contentOffset(f: FrameContent, at: Point): Point {
  return { x: at.x + 2 * GRID - gridFloor(f.box.minX), y: at.y + bandHeight(f) + 2 * GRID - gridFloor(f.box.minY) };
}

export function frameAt(f: FrameContent, at: Point): Frame {
  const s = frameSize(f);
  return { blockId: f.blockId, title: f.title, box: { minX: at.x, minY: at.y, maxX: at.x + s.w, maxY: at.y + s.h } };
}

/** Legend lines in the title band, one line under the title each (the title is at frameTitleSpot). */
export function legendTexts(f: FrameContent, at: Point): SheetText[] {
  return f.legend.map((text, r) => ({ text, at: { x: at.x + 2 * GRID, y: at.y + LINE * (r + 2) } }));
}

const shift = (p: Point, d: Point): Point => ({ x: p.x + d.x, y: p.y + d.y });

export function translateLayout(l: BlockLayout, d: Point): BlockLayout {
  assertOnGrid(d, "layout offset");
  return {
    placements: l.placements.map((p) => ({ ...p, at: shift(p.at, d) })),
    wires: l.wires.map((w) => ({ ...w, a: shift(w.a, d), b: shift(w.b, d) })),
    anchors: l.anchors.map((a) => ({ ...a, at: shift(a.at, d) })),
  };
}

export function translatePowers(ps: readonly PowerSymbol[], d: Point): PowerSymbol[] {
  return ps.map((p) => ({ ...p, at: shift(p.at, d) }));
}

export function translateTexts(ts: readonly SheetText[], d: Point): SheetText[] {
  return ts.map((t) => ({ ...t, at: shift(t.at, d) }));
}
