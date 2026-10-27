/**
 * Ported from digital-pedal-platform's `tools/schgen/render/layoutCheck.ts`, and DIVERGED from it
 * by Task 24 of the M1 schematic-authoring plan: `textClearanceProblems` no longer early-returns a
 * field-placement refusal, because the placer no longer produces one.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G258**.
 */

/**
 * Checks a template's layout against the block's IR subgraph: placements, grid, body overlaps,
 * wire safety, dangling wire ends, bodies over power glyphs and labels, power glyphs that meet, shorts, unlabelled pieces of labelled nets, split internal nets and stray anchors.
 * Kept apart from the template registry so templates may call it while choosing a layout.
 *
 * **DIVERGED BY TASK 2 of `docs/superpowers/sdd/2026-10-27-gates-classify`: `checkLayout` returns
 * `readonly Finding[]` rather than `string[]`, so a later task can classify a refusal without
 * reading a class off a sentence.** Every `Finding.what` is byte-identical to the string this
 * function used to put at that position - no refusal text changed. The `kind` on each is decided
 * here, by which check produced it, never by inspecting the text: a helper this file defines
 * (`placementProblems`, `gridProblems`, `overlapProblems`, `shapeProblems`, `componentProblems`,
 * `internalSplitProblems`, `anchorProblems`) tags its own findings directly; a helper this file
 * only calls (`checkWireSafety`, `danglingWireEnds`, `clearanceProblems`, `bodyGlyphProblems`,
 * `glyphGlyphProblems`) still returns `string[]`, because splitting ITS internal branches by kind
 * without parsing the string it already decided to return would be exactly the thing `Finding`
 * exists to avoid doing from outside. Each such batch is tagged with the one kind that best
 * represents what that whole function checks; `textClearanceProblems` is the exception, because
 * `text-scene.ts`'s `textProblems` was converted by this same task and already returns
 * `Finding[]` tagged `"text-clearance"`, so it is returned here unchanged.
 */
import { unitKey, type PartLabel } from "../ir/types.ts";
import type { Finding } from "../findings.ts";
import type { BlockLayout, BlockSubgraph, BlockUnit, Placement } from "./block-types.ts";
import { clearanceProblems } from "./body-clearance.ts";
import { assertWireShape, connectedComponents, type ConnComponent, type ConnItem } from "./connectivity.ts";
import { bodyGlyphProblems, glyphGlyphProblems } from "./glyph-clearance.ts";
import { assertOnGrid, boxesOverlap, placeBox, type Point } from "./geometry.ts";
import { anchorsToSymbols, blockPowerLibs, valuesAlong } from "./power-text.ts";
import { textProblems, textScene } from "./text-scene.ts";
import { noConnectEnds, unitPinEnds, type PlacedPin } from "./unit-pins.ts";
import { checkWireSafety, danglingWireEnds } from "./wire-safety.ts";

/** Builds one `Finding`, so every conversion below states its `kind` next to the text it covers. */
function finding(kind: Finding["kind"], what: string, where: string): Finding {
  return { kind, what, where };
}

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

function placementProblems(g: BlockSubgraph, layout: BlockLayout): Finding[] {
  const where = `block ${g.block.id}`;
  const out: Finding[] = [];
  const counts = new Map<string, number>();
  for (const pl of layout.placements) {
    const key = unitKey(pl.part, pl.unit);
    if (unitOf(g, pl.part, pl.unit) === undefined) out.push(finding("invariant-violated", `placement ${key} is not a unit of this block`, where));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const u of g.units) {
    const key = unitKey(u.part.label, u.unit);
    const n = counts.get(key) ?? 0;
    if (n === 0) out.push(finding("invariant-violated", `unit ${key} is not placed`, where));
    else if (n > 1) out.push(finding("invariant-violated", `unit ${key} is placed ${n} times`, where));
  }
  return out;
}

function gridProblems(g: BlockSubgraph, layout: BlockLayout): Finding[] {
  const where = `block ${g.block.id}`;
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
      return [finding("invariant-violated", e instanceof Error ? e.message : String(e), where)];
    }
  });
}

function overlapProblems(g: BlockSubgraph, layout: BlockLayout): Finding[] {
  const where = `block ${g.block.id}`;
  const placed = layout.placements.flatMap((pl) => {
    const u = unitOf(g, pl.part, pl.unit);
    if (u === undefined) return [];
    const box = u.symbol.boxes.get(pl.unit);
    if (box === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${pl.unit}`);
    return [{ key: unitKey(pl.part, pl.unit), box: placeBox(pl.at, pl.rot, box) }];
  });
  const out: Finding[] = [];
  placed.forEach((p, i) => {
    for (const q of placed.slice(i + 1)) {
      if (boxesOverlap(p.box, q.box)) out.push(finding("body-clearance", `bodies of ${p.key} and ${q.key} overlap`, where));
    }
  });
  return out;
}

function shapeProblems(g: BlockSubgraph, items: readonly ConnItem[]): Finding[] {
  const where = `block ${g.block.id}`;
  return items.flatMap((item) => {
    try {
      assertWireShape(item);
      return [];
    } catch (e) {
      return [finding("invariant-violated", e instanceof Error ? e.message : String(e), where)];
    }
  });
}

const whats = (items: readonly ConnItem[]): string => items.map((i) => i.what).join(", ");

/**
 * **`"split-net"` ON THE THIRD LOOP IS A JUDGEMENT CALL, STATED HERE RATHER THAN LEFT IMPLICIT.**
 * A rail or external net's piece with no label or power symbol anchored to it is not literally
 * cut into two pieces the way `internalSplitProblems` means it, but it is the same failure in
 * spirit: the net does not cohere into one recognisable, labelled whole, which is wrong about the
 * circuit rather than merely hard to read. `findings.ts` has no more specific kind for "a net
 * piece with nothing anchoring it to the rest of its name", so this is the closest honest fit.
 */
function componentProblems(g: BlockSubgraph, comps: readonly ConnComponent[]): Finding[] {
  const where = `block ${g.block.id}`;
  const out: Finding[] = [];
  for (const comp of comps) {
    const nets = [...comp.nets].sort();
    if (nets.length >= 2) out.push(finding("short", `short between ${nets[0]} and ${nets[1]} through ${whats(comp.items)}`, where));
    for (const nc of comp.ncPins) {
      const others = comp.items.filter((i) => i !== nc);
      if (others.length > 0) out.push(finding("nc-contact", `not-connected pin ${nc.what} touches ${whats(others)}`, where));
    }
    for (const net of nets) {
      if (!g.rails.has(net) && !g.external.has(net)) continue;
      if (!comp.items.some((i) => i.kind === "anchor" && i.net === net)) {
        const members = comp.items.filter((i) => i.net === net && i.kind !== "anchor");
        out.push(finding("split-net", `piece of net ${net} containing ${whats(members)} has no label or power symbol`, where));
      }
    }
  }
  return out;
}

function internalSplitProblems(g: BlockSubgraph, comps: readonly ConnComponent[]): Finding[] {
  const where = `block ${g.block.id}`;
  const internal = new Set(
    g.units.flatMap((u) => u.pins.flatMap((p) => (p.net !== null && !g.rails.has(p.net) && !g.external.has(p.net) ? [p.net] : []))),
  );
  return [...internal].sort().flatMap((net) => {
    const pieces = comps.filter((comp) => comp.items.some((i) => i.kind === "pin" && i.net === net)).length;
    return pieces > 1 ? [finding("split-net", `net ${net} is split into ${pieces} pieces`, where)] : [];
  });
}

function anchorProblems(g: BlockSubgraph, layout: BlockLayout): Finding[] {
  const where = `block ${g.block.id}`;
  const touched = new Set(g.units.flatMap((u) => u.pins.flatMap((p) => (p.net === null ? [] : [p.net]))));
  const out: Finding[] = [];
  for (const net of [...new Set(layout.anchors.map((a) => a.net))]) {
    if (!touched.has(net)) out.push(finding("invariant-violated", `anchor for ${net}, which this block does not touch`, where));
    else if (!g.rails.has(net) && !g.external.has(net)) {
      out.push(finding("invariant-violated", `internal net ${net} has a label anchor; internal nets are wired, never labelled`, where));
    }
  }
  return out;
}

/**
 * The block's own text (fields, power values, labels) against its own drawing. Throws when a power
 * symbol is not one of the block's rails.
 *
 * **IT USED TO RETURN THE FIELD-PLACEMENT REFUSAL AND STOP, WHICH IS HOW ONE DEFECT HID ANOTHER
 * FOR THE WHOLE OF G232's LIFE** (`docs/known-gaps.md` **G258**): building a text scene places
 * fields, so a block whose fields did not place had no scene, and every other text-clearance
 * problem it carried went unreported. `field-placement.ts` no longer refuses, so there is no
 * refusal to early-return and the full text pass runs on every block. **The mask is gone as a
 * consequence of Task 24 rather than as a fix aimed at it**, and what it was hiding is now in this
 * function's own output.
 */
/**
 * `textProblems` (`text-scene.ts`) already returns `Finding[]` tagged `"text-clearance"` with
 * `where` set to its scene's own scope - so this is a pass-through, not a re-tagging.
 */
function textClearanceProblems(g: BlockSubgraph, layout: BlockLayout): readonly Finding[] {
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  return textProblems(textScene(`block ${g.block.id}`, blockPowerLibs(g), { blocks: [{ g, layout }], powers, labels, texts: [], frames: [] }));
}

/** Unit bodies over the block's own power glyphs and labels, and power glyphs that meet (glyphClearance). */
function blockGlyphProblems(g: BlockSubgraph, layout: BlockLayout): Finding[] {
  const where = `block ${g.block.id}`;
  const { powers, labels } = anchorsToSymbols(g,layout.anchors, valuesAlong(g.block.rendering));
  const symbols = blockPowerLibs(g);
  const msgs = [...bodyGlyphProblems({ symbols, blocks: [{ g, layout }], powers, labels }), ...glyphGlyphProblems({ symbols, powers })];
  return msgs.map((what) => finding("glyph-clearance", what, where));
}

/**
 * Every way `layout` disagrees with the block's IR subgraph, one finding each; empty means valid.
 *
 * `checkWireSafety` and `danglingWireEnds` (`wire-safety.ts`) are each tagged with one kind for
 * their whole batch - `"short"` and `"dangling-end"` respectively - because neither is restructured
 * by this task and reading a finer kind off their text from outside would be exactly the string-
 * sniffing `Finding` exists to replace. `danglingWireEnds` is a clean 1:1 fit (every line it
 * produces is about a dangling end); `checkWireSafety` mixes unintended cross-net joins with
 * same-net mid-wire junction cases under one return value, and `"short"` is this file's
 * representative choice for that whole batch. Either choice classifies to `"defective"` via
 * `classOf`, which is the only thing Task 4's census reads from it.
 */
export function checkLayout(g: BlockSubgraph, layout: BlockLayout): readonly Finding[] {
  const where = `block ${g.block.id}`;
  const items = layoutItems(g, layout);
  const out = [...placementProblems(g, layout), ...gridProblems(g, layout), ...overlapProblems(g, layout)];
  const shapes = shapeProblems(g, items);
  if (shapes.length > 0) return [...out, ...shapes, ...anchorProblems(g, layout)];
  const comps = connectedComponents(items);
  return [
    ...out,
    ...checkWireSafety(items).map((what) => finding("short", what, where)),
    ...danglingWireEnds(items).map((what) => finding("dangling-end", what, where)),
    ...clearanceProblems(g, layout).map((what) => finding("body-clearance", what, where)),
    ...blockGlyphProblems(g, layout),
    ...componentProblems(g, comps),
    ...internalSplitProblems(g, comps),
    ...anchorProblems(g, layout),
    ...textClearanceProblems(g, layout),
  ];
}

