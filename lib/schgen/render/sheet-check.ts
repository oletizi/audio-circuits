/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheetCheck.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Sheet-wide backstop over every block's translated layout plus the sheet's power symbols and
 * labels. Each block was checked on its own; this catches what only appears once blocks share a
 * sheet: contacts between blocks, bodies of different blocks overlapping or crossed by another
 * block's wiring, a body drawn over another block's power glyph, PWR_FLAG or label, two power glyphs that meet (glyphClearance), and a power symbol (a pin to KiCad: it joins by coincidence only) left mid-wire
 * where its block's label anchor would have joined anywhere on the wire, and a wire end that
 * touches nothing once every block's pins, power symbols and labels are on the sheet.
 */
import { unitKey, type SheetId } from "../ir/types.ts";
import type { BlockLayout, BlockSubgraph } from "./block-types.ts";
import { placedPins } from "./blocks.ts";
import { sceneClearanceProblems } from "./body-clearance.ts";
import type { ConnItem } from "./connectivity.ts";
import { boxesOverlap, placeBox } from "./geometry.ts";
import { bodyGlyphProblems, glyphGlyphProblems } from "./glyph-clearance.ts";
import type { LibLookup } from "./power-text.ts";
import type { GlobalLabel, PowerSymbol } from "./sheet-types.ts";
import { checkWireSafety, danglingWireEnds } from "./wire-safety.ts";

export interface SheetBlock {
  readonly g: BlockSubgraph;
  /** The block's layout in sheet coordinates. */
  readonly layout: BlockLayout;
}

export interface SheetScene {
  readonly sheet: SheetId;
  /** Resolves every power symbol's lib id (its glyph is checked against every body). */
  readonly symbols: LibLookup;
  readonly blocks: readonly SheetBlock[];
  readonly powers: readonly PowerSymbol[];
  readonly labels: readonly GlobalLabel[];
}

const powerWhat = (p: PowerSymbol, i: number): string => (p.flag ? `PWR_FLAG ${p.net} ${i}` : `power ${p.net} ${i}`);

/** Wires, placed pin ends, power symbol pins (on their rail) and label anchors of the whole sheet. */
export function sheetItems(scene: SheetScene): ConnItem[] {
  const wires: ConnItem[] = scene.blocks.flatMap(({ g, layout }) =>
    layout.wires.map((w, i): ConnItem => ({ kind: "wire", a: w.a, b: w.b, net: w.net, what: `wire ${i} of ${g.block.id}` })),
  );
  const pins: ConnItem[] = scene.blocks.flatMap(({ g, layout }) =>
    placedPins(g, layout.placements).map((p): ConnItem => ({ kind: "pin", at: p.at, net: p.net, what: `${p.part}.${p.pin}` })),
  );
  const powers: ConnItem[] = scene.powers.map((p, i): ConnItem => ({ kind: "pin", at: p.at, net: p.net, what: powerWhat(p, i) }));
  const labels: ConnItem[] = scene.labels.map((l, i): ConnItem => ({ kind: "anchor", at: l.at, net: l.net, what: `label ${l.net} ${i}` }));
  return [...wires, ...pins, ...powers, ...labels];
}

function bodyOverlaps(scene: SheetScene): string[] {
  const placed = scene.blocks.flatMap(({ g, layout }) =>
    layout.placements.map((pl) => {
      const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
      if (u === undefined) throw new Error(`sheet ${scene.sheet}: placement ${unitKey(pl.part, pl.unit)} is not a unit of block ${g.block.id}`);
      const box = u.symbol.boxes.get(pl.unit);
      if (box === undefined) throw new Error(`${u.symbol.libId} has no body box for unit ${pl.unit}`);
      return { key: unitKey(pl.part, pl.unit), box: placeBox(pl.at, pl.rot, box) };
    }),
  );
  return placed.flatMap((p, i) => placed.slice(i + 1).flatMap((q) => (boxesOverlap(p.box, q.box) ? [`bodies of ${p.key} and ${q.key} overlap`] : [])));
}

function clearance(scene: SheetScene): string[] {
  return sceneClearanceProblems({
    scope: `sheet ${scene.sheet}`,
    units: scene.blocks.flatMap((b) => b.g.units),
    placements: scene.blocks.flatMap((b) => b.layout.placements),
    wires: scene.blocks.flatMap((b) => b.layout.wires),
    anchors: [...scene.powers, ...scene.labels],
  });
}

const lines = (problems: readonly string[]): string => problems.map((p) => `\n  - ${p}`).join("");

/** Throws `sheet <id>: wire safety:` or `sheet <id>: body clearance:` with one line per problem. */
export function assertSheetSafe(scene: SheetScene): void {
  const items = sheetItems(scene);
  const safety = [...checkWireSafety(items), ...danglingWireEnds(items)];
  if (safety.length > 0) throw new Error(`sheet ${scene.sheet}: wire safety:${lines(safety)}`);
  const bodies = [...bodyOverlaps(scene), ...clearance(scene), ...bodyGlyphProblems(scene), ...glyphGlyphProblems(scene)];
  if (bodies.length > 0) throw new Error(`sheet ${scene.sheet}: body clearance:${lines(bodies)}`);
}
