/**
 * Ported from digital-pedal-platform's `tools/schgen/render/layoutCheck.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Checks a template's layout against the block's IR subgraph: placements, grid, body overlaps,
 * wire safety, dangling wire ends, bodies over power glyphs and labels, power glyphs that meet, shorts, unlabelled pieces of labelled nets, split internal nets and stray anchors.
 * Kept apart from the template registry so templates may call it while choosing a layout.
 */
import { unitKey, type PartLabel } from "../ir/types.ts";
import type { BlockLayout, BlockSubgraph, BlockUnit, Placement } from "./block-types.ts";
import { clearanceProblems } from "./body-clearance.ts";
import { assertWireShape, connectedComponents, type ConnComponent, type ConnItem } from "./connectivity.ts";
import { blockFieldProblems } from "./field-placement.ts";
import { bodyGlyphProblems, glyphGlyphProblems } from "./glyph-clearance.ts";
import { assertOnGrid, boxesOverlap, placeBox, type Point } from "./geometry.ts";
import { anchorsToSymbols, blockPowerLibs, valuesAlong } from "./power-text.ts";
import { textProblems, textScene } from "./text-scene.ts";
import { noConnectEnds, unitPinEnds, type PlacedPin } from "./unit-pins.ts";
import { checkWireSafety, danglingWireEnds } from "./wire-safety.ts";

export type { PlacedPin };

function unitOf(g: BlockSubgraph, part: PartLabel, unit: number): BlockUnit | undefined {
  return g.units.find((u) => u.part.label === part && u.unit === unit);
}

/** Pin ends of every placement that is a unit of this block (others are reported by checkLayout). */
export function placedPins(g: BlockSubgraph, placements: readonly Placement[]): PlacedPin[] {
  return placements.flatMap((pl) => {
    const u = unitOf(g, pl.part, pl.unit);
    return u === undefined ? [] : unitPinEnds(u, pl);
  });
}

/** Where the sheet draws a no-connect X, per placement that is a unit of this block (the rule unitText's obstacles use). */
export function placedNoConnects(g: BlockSubgraph, placements: readonly Placement[]): PlacedPin[] {
  return placements.flatMap((pl) => {
    const u = unitOf(g, pl.part, pl.unit);
    return u === undefined ? [] : noConnectEnds(u, pl);
  });
}

export function layoutItems(g: BlockSubgraph, layout: BlockLayout): ConnItem[] {
  const wires: ConnItem[] = layout.wires.map((w, i) => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i} of ${g.block.id}` }));
  const pins: ConnItem[] = placedPins(g, layout.placements).map((p) => ({ kind: "pin", at: p.at, net: p.net, what: `${p.part}.${p.pin}` }));
  const anchors: ConnItem[] = layout.anchors.map((a, i) => ({ kind: "anchor", at: a.at, net: a.net, what: `anchor ${a.net} ${i}` }));
  return [...wires, ...pins, ...anchors];
}

function placementProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const out: string[] = [];
  const counts = new Map<string, number>();
  for (const pl of layout.placements) {
    const key = unitKey(pl.part, pl.unit);
    if (unitOf(g, pl.part, pl.unit) === undefined) out.push(`placement ${key} is not a unit of this block`);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const u of g.units) {
    const key = unitKey(u.part.label, u.unit);
    const n = counts.get(key) ?? 0;
    if (n === 0) out.push(`unit ${key} is not placed`);
    else if (n > 1) out.push(`unit ${key} is placed ${n} times`);
  }
  return out;
}

function gridProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const checks: [Point, string][] = [
    ...layout.placements.map((p): [Point, string] => [p.at, `placement ${unitKey(p.part, p.unit)}`]),
    ...layout.wires.flatMap((w, i): [Point, string][] => [
      [w.a, `wire ${i} of ${g.block.id} end a`],
      [w.b, `wire ${i} of ${g.block.id} end b`],
    ]),
    ...layout.anchors.map((a, i): [Point, string] => [a.at, `anchor ${a.net} ${i}`]),
    ...placedPins(g, layout.placements).map((p): [Point, string] => [p.at, `pin end ${p.part}.${p.pin}`]),
  ];
  return checks.flatMap(([p, what]) => {
    try {
      assertOnGrid(p, what);
      return [];
    } catch (e) {
      return [e instanceof Error ? e.message : String(e)];
    }
  });
}

function overlapProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const placed = layout.placements.flatMap((pl) => {
    const u = unitOf(g, pl.part, pl.unit);
    if (u === undefined) return [];
    const box = u.symbol.boxes.get(pl.unit);
    if (box === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${pl.unit}`);
    return [{ key: unitKey(pl.part, pl.unit), box: placeBox(pl.at, pl.rot, box) }];
  });
  const out: string[] = [];
  placed.forEach((p, i) => {
    for (const q of placed.slice(i + 1)) {
      if (boxesOverlap(p.box, q.box)) out.push(`bodies of ${p.key} and ${q.key} overlap`);
    }
  });
  return out;
}

function shapeProblems(items: readonly ConnItem[]): string[] {
  return items.flatMap((item) => {
    try {
      assertWireShape(item);
      return [];
    } catch (e) {
      return [e instanceof Error ? e.message : String(e)];
    }
  });
}

const whats = (items: readonly ConnItem[]): string => items.map((i) => i.what).join(", ");

function componentProblems(g: BlockSubgraph, comps: readonly ConnComponent[]): string[] {
  const out: string[] = [];
  for (const comp of comps) {
    const nets = [...comp.nets].sort();
    if (nets.length >= 2) out.push(`short between ${nets[0]} and ${nets[1]} through ${whats(comp.items)}`);
    for (const nc of comp.ncPins) {
      const others = comp.items.filter((i) => i !== nc);
      if (others.length > 0) out.push(`not-connected pin ${nc.what} touches ${whats(others)}`);
    }
    for (const net of nets) {
      if (!g.rails.has(net) && !g.external.has(net)) continue;
      if (!comp.items.some((i) => i.kind === "anchor" && i.net === net)) {
        const members = comp.items.filter((i) => i.net === net && i.kind !== "anchor");
        out.push(`piece of net ${net} containing ${whats(members)} has no label or power symbol`);
      }
    }
  }
  return out;
}

function internalSplitProblems(g: BlockSubgraph, comps: readonly ConnComponent[]): string[] {
  const internal = new Set(
    g.units.flatMap((u) => u.pins.flatMap((p) => (p.net !== null && !g.rails.has(p.net) && !g.external.has(p.net) ? [p.net] : []))),
  );
  return [...internal].sort().flatMap((net) => {
    const pieces = comps.filter((comp) => comp.items.some((i) => i.kind === "pin" && i.net === net)).length;
    return pieces > 1 ? [`net ${net} is split into ${pieces} pieces`] : [];
  });
}

function anchorProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const touched = new Set(g.units.flatMap((u) => u.pins.flatMap((p) => (p.net === null ? [] : [p.net]))));
  const out: string[] = [];
  for (const net of [...new Set(layout.anchors.map((a) => a.net))]) {
    if (!touched.has(net)) out.push(`anchor for ${net}, which this block does not touch`);
    else if (!g.rails.has(net) && !g.external.has(net)) {
      out.push(`internal net ${net} has a label anchor; internal nets are wired, never labelled`);
    }
  }
  return out;
}

/**
 * The block's own text (fields, power values, labels) against its own drawing; a unit whose
 * fields have no clear slot (fieldPlacement) is a problem too. Throws when a power symbol is not
 * one of the block's rails.
 */
function textClearanceProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const unplaced = blockFieldProblems(g, layout, blockPowerLibs(g));
  if (unplaced.length > 0) return unplaced;
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  return textProblems(textScene(`block ${g.block.id}`, blockPowerLibs(g), { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] }));
}

/** Unit bodies over the block's own power glyphs and labels, and power glyphs that meet (glyphClearance). */
function blockGlyphProblems(g: BlockSubgraph, layout: BlockLayout): string[] {
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  const symbols = blockPowerLibs(g);
  return [...bodyGlyphProblems({ symbols, blocks: [{ g, layout }], powers, labels }), ...glyphGlyphProblems({ symbols, powers })];
}

/** Every way `layout` disagrees with the block's IR subgraph, one line each; empty means valid. */
export function checkLayout(g: BlockSubgraph, layout: BlockLayout): string[] {
  const items = layoutItems(g, layout);
  const out = [...placementProblems(g, layout), ...gridProblems(g, layout), ...overlapProblems(g, layout)];
  const shapes = shapeProblems(items);
  if (shapes.length > 0) return [...out, ...shapes, ...anchorProblems(g, layout)];
  const comps = connectedComponents(items);
  return [
    ...out,
    ...checkWireSafety(items),
    ...danglingWireEnds(items),
    ...clearanceProblems(g, layout),
    ...blockGlyphProblems(g, layout),
    ...componentProblems(g, comps),
    ...internalSplitProblems(g, comps),
    ...anchorProblems(g, layout),
    ...textClearanceProblems(g, layout),
  ];
}

