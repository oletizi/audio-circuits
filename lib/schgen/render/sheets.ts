/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheets.ts`, mechanically
 * rewritten by `tools/schgen/port.ts` (imports only, per
 * `tools/schgen/port-manifest.json`). Edit the pedals source and re-run the
 * port rather than hand-editing this file - see `lib/schgen/README.md`.
 */

/**
 * Sheet arrangement: every block of a sheet realised, framed and titled, frames shelf-packed on the
 * sheet's declared paper (never a larger one), anchors turned into power symbols (rails) or global
 * labels (everything else), NC pins marked, then a sheet-wide wire-safety and body-clearance
 * backstop. Junction dots are cosmetic: exactly the junctionPoints() of the sheet's items.
 */
import type { Circuit, Paper, SheetId } from "../ir/types.ts";
import type { BlockLayout, BlockSubgraph, Placement, Wire } from "./block-types.ts";
import { pinMarks, type PinMark } from "./pin-marks.ts";
import { placedNoConnects } from "./blocks.ts";
import { junctionPoints } from "./connectivity.ts";
import {
  blockContent, contentOffset, flagsContent, frameAt, frameSize, legendTexts, notesContent,
  translateLayout, translatePowers, translateTexts, type FrameContent,
} from "./frames.ts";
import { fmtMm, placeBox, pointKey, type Point, type Um } from "./geometry.ts";
import type { SymbolResolver } from "./library.ts";
import { packFrames } from "./pack.ts";
import { assertSheetSafe, sheetItems, type SheetBlock } from "./sheet-check.ts";
import { blockFields } from "./field-placement.ts";
import { anchorsToSymbols, valuesAlong } from "./power-text.ts";
import { assertTextClear, textScene } from "./text-scene.ts";
import type { Frame, GlobalLabel, PlacedSymbol, PowerSymbol, SheetDrawing, SheetText } from "./sheet-types.ts";

export { powerRotation } from "./frames.ts";

/** Landscape paper sizes. */
export const PAPER: Record<Paper, { readonly w: Um; readonly h: Um }> = {
  A4: { w: 297_000, h: 210_000 },
  A3: { w: 420_000, h: 297_000 },
  A2: { w: 594_000, h: 420_000 },
  A1: { w: 841_000, h: 594_000 },
};

/** Power symbols have their single pin at the origin, so any rotation keeps it on the anchor. */
function assertPowerSymbol(symbols: SymbolResolver, libId: string, what: string): void {
  const sym = symbols.resolve(libId);
  const [pin, ...rest] = sym.pins;
  if (!sym.isPower || pin === undefined || rest.length > 0 || pin.x !== 0 || pin.y !== 0) {
    throw new Error(`${what} ${libId} must be a power symbol with one pin at its origin`);
  }
}

interface Arranged {
  readonly blocks: SheetBlock[];
  readonly frames: Frame[];
  readonly powers: PowerSymbol[];
  readonly labels: GlobalLabel[];
  readonly texts: SheetText[];
}

function arrange(c: Circuit, contents: readonly FrameContent[], at: readonly Point[]): Arranged {
  const out: Arranged = { blocks: [], frames: [], powers: [], labels: [], texts: [] };
  contents.forEach((f, i) => {
    const pos = at[i];
    if (pos === undefined) throw new Error(`packer placed ${at.length} of ${contents.length} frames`);
    const d = contentOffset(f, pos);
    out.frames.push(frameAt(f, pos));
    out.texts.push(...legendTexts(f, pos), ...translateTexts(f.texts, d));
    out.powers.push(...translatePowers(f.powers, d));
    if (f.block !== null) {
      const layout = translateLayout(f.block.layout, d);
      out.blocks.push({ g: f.block.g, layout });
      const { powers, labels } = anchorsToSymbols(f.block.g, layout.anchors, valuesAlong(f.block.g.block.rendering));
      out.powers.push(...powers);
      out.labels.push(...labels);
    }
  });
  return out;
}

function marksOf(g: BlockSubgraph, pl: Placement): PinMark[] {
  const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
  if (u === undefined) throw new Error(`block ${g.block.id}: no unit ${pl.part}#${pl.unit}`);
  return pinMarks(u, pl);
}

function placedSymbols(g: BlockSubgraph, layout: BlockLayout, symbols: SymbolResolver): PlacedSymbol[] {
  const fields = blockFields(g, layout, symbols);
  return layout.placements.map((pl, i) => {
    const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    const box = u?.symbol.boxes.get(pl.unit);
    const t = fields[i];
    if (u === undefined || box === undefined || t === undefined) throw new Error(`block ${g.block.id}: no body box for ${pl.part}#${pl.unit}`);
    return { part: pl.part, unit: pl.unit, at: pl.at, rot: pl.rot, box: placeBox(pl.at, pl.rot, box), body: t.body, fields: t.fields };
  });
}

/** The end of every NC pin of every placed unit that takes an X (unitPins.noConnectEnds), once per point. */
function noConnects(blocks: readonly SheetBlock[]): Point[] {
  const byKey = new Map<string, Point>();
  for (const { g, layout } of blocks) {
    for (const p of placedNoConnects(g, layout.placements)) byKey.set(pointKey(p.at), p.at);
  }
  return [...byKey.values()];
}

export function layoutSheet(c: Circuit, sheetId: SheetId, symbols: SymbolResolver, flagLibId: string): SheetDrawing {
  const sheet = c.sheets.find((s) => s.id === sheetId);
  if (sheet === undefined) throw new Error(`unknown sheet ${sheetId}`);
  const paper = PAPER[sheet.paper];
  const blocks = [...c.blocks.values()].filter((b) => b.sheet === sheetId).sort((a, b) => a.order - b.order);
  const flags = flagsContent([...c.rails.values()], sheetId, flagLibId, symbols);
  const notes = notesContent(sheet);
  const contents: FrameContent[] = [
    ...blocks.map((b) => blockContent(c, b.id, symbols)),
    ...(notes === null ? [] : [notes]),
    ...(flags === null ? [] : [flags]),
  ];
  const packed = packFrames(contents.map(frameSize), paper);
  if (!packed.ok) {
    throw new Error(
      `sheet ${sheetId}: blocks do not fit on ${sheet.paper}; give the sheet a larger paper in its SheetSpec ` +
        `(needed at least ${fmtMm(packed.needed.w)} × ${fmtMm(packed.needed.h)} mm)`,
    );
  }
  const a = arrange(c, contents, packed.at);
  const checked = new Set<string>();
  for (const p of a.powers) {
    const what = p.flag ? "PWR_FLAG symbol" : `rail ${p.net}: power symbol`;
    if (checked.has(`${what} ${p.libId}`)) continue;
    checked.add(`${what} ${p.libId}`);
    assertPowerSymbol(symbols, p.libId, what);
  }
  const scene = { sheet: sheetId, symbols, blocks: a.blocks, powers: a.powers, labels: a.labels };
  assertSheetSafe(scene);
  assertTextClear(textScene(`sheet ${sheetId}`, symbols, { blocks: a.blocks, powers: a.powers, labels: a.labels, texts: a.texts, frames: a.frames }));
  const wires: Wire[] = a.blocks.flatMap((b) => b.layout.wires);
  return {
    sheet,
    paper,
    symbols: a.blocks.flatMap((b) => placedSymbols(b.g, b.layout, symbols)),
    powers: a.powers,
    wires,
    junctions: junctionPoints(sheetItems(scene)),
    labels: a.labels,
    noConnects: noConnects(a.blocks),
    texts: a.texts,
    pinMarks: a.blocks.flatMap((b) => b.layout.placements.flatMap((pl) => marksOf(b.g, pl))),
    frames: a.frames,
  };
}
