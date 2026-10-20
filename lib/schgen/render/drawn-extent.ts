/**
 * Ported from digital-pedal-platform's `tools/schgen/render/drawnExtent.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * What a partly drawn block layout covers, measured on its real drawing: unit bodies and pin
 * lines, pin text, fields where the placer puts them, labels, power glyphs and values, wires. A
 * template measures what it has drawn so far before placing more beyond it.
 */
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { blockFieldProblems } from "./field-placement.ts";
import { unionBox } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { anchorsToSymbols, blockPowerLibs, valuesAlong } from "./power-text.ts";
import { textScene } from "./text-scene.ts";

export type Measured = { readonly ok: true; readonly boxes: readonly Box[] } | { readonly ok: false; readonly reason: string };

/** Every box `layout` draws, or why a unit of it has no room for its fields. */
export function drawnBoxes(g: BlockSubgraph, layout: BlockLayout): Measured {
  const libs = blockPowerLibs(g);
  const unplaced = blockFieldProblems(g, layout, libs);
  if (unplaced.length > 0) return { ok: false, reason: unplaced.join("; ") };
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  const scene = textScene(`block ${g.block.id}`, libs, { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] });
  const segments = scene.segments.map((s) => ({ minX: Math.min(s.a.x, s.b.x), minY: Math.min(s.a.y, s.b.y), maxX: Math.max(s.a.x, s.b.x), maxY: Math.max(s.a.y, s.b.y) }));
  return { ok: true, boxes: [...scene.texts, ...scene.bodies, ...scene.pinTexts].map((n) => n.box).concat(segments) };
}

/** The union of `boxes`; throws on none (a placed unit always draws its body). */
export function boundsOf(boxes: readonly Box[]): Box {
  const [first, ...rest] = boxes;
  if (first === undefined) throw new Error("boundsOf: nothing drawn");
  return rest.reduce(unionBox, first);
}
