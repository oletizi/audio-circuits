/**
 * Ported from digital-pedal-platform's `tools/schgen/render/drawnExtent.ts`, and DIVERGED from it
 * by Task 8 of the M1 schematic-authoring plan, which gave `Measured`'s false arm a classified
 * `Mismatch`.
 *
 * **DIVERGED FURTHER BY TASK 24, AND THE DIVERGENCE IS A DELETION: `Measured` IS GONE and
 * `drawnBoxes` returns the boxes.** Its only failure was a field with nowhere to go, and
 * `field-placement.ts` no longer refuses that - it places at the least-covered slot and records a
 * `FieldFallback`. A union whose false arm nothing can build is a check that cannot fail
 * (`docs/known-gaps.md` **G236**), and the two templates that forwarded it (`regulator.ts`,
 * `crystal.ts`) no longer have a `clearance` mismatch to forward.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139**.
 */

/**
 * What a partly drawn block layout covers, measured on its real drawing: unit bodies and pin
 * lines, pin text, fields where the placer puts them, labels, power glyphs and values, wires. A
 * template measures what it has drawn so far before placing more beyond it.
 */
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { unionBox } from "./geometry.ts";
import type { Box } from "./lib-pins.ts";
import { anchorsToSymbols, blockPowerLibs, valuesAlong } from "./power-text.ts";
import { textScene } from "./text-scene.ts";

/**
 * Every box `layout` draws.
 *
 * **It cannot fail any more.** Its one failure was a unit whose fields had nowhere to go; the
 * placer now places them at the least-covered slot and reports the overlap as a `FieldFallback`,
 * so the extent measured here is the extent of what is actually drawn, fallbacks included - which
 * is what a frame sized from it needs to contain.
 */
export function drawnBoxes(g: BlockSubgraph, layout: BlockLayout): readonly Box[] {
  const libs = blockPowerLibs(g);
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  const scene = textScene(`block ${g.block.id}`, libs, { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] });
  const segments = scene.segments.map((s) => ({ minX: Math.min(s.a.x, s.b.x), minY: Math.min(s.a.y, s.b.y), maxX: Math.max(s.a.x, s.b.x), maxY: Math.max(s.a.y, s.b.y) }));
  return [...scene.texts, ...scene.bodies, ...scene.pinTexts].map((n) => n.box).concat(segments);
}

/** The union of `boxes`; throws on none (a placed unit always draws its body). */
export function boundsOf(boxes: readonly Box[]): Box {
  const [first, ...rest] = boxes;
  if (first === undefined) throw new Error("boundsOf: nothing drawn");
  return rest.reduce(unionBox, first);
}
