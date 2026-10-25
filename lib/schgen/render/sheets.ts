/**
 * Ported from digital-pedal-platform's `tools/schgen/render/sheets.ts`, and DIVERGED from it by
 * Task 12 of the M1 schematic-authoring plan: `layoutSheet` takes the ELK `Backend` and hands it
 * to `blockContent`. **Diverged further by Task 15**: it takes a second optional parameter, the
 * `SheetPacking` a sheet-packing pre-pass produced, and uses the shelf packer when there is none.
 * Two parameters are now the whole divergence.
 *
 * It no longer re-derives from the pedals source. `tests/schgen/port-fidelity.test.ts` does not
 * byte-check it, re-running `tools/schgen/port.ts` will NOT refresh it: **edit this file**. Its
 * `diverged` entry in `tools/schgen/port-manifest.json` carries the reason; see
 * `lib/schgen/README.md` and `docs/known-gaps.md` **G139** and **G186**.
 */

/**
 * Sheet arrangement: every block of a sheet realised, framed and titled, frames shelf-packed on the
 * sheet's declared paper **or the smallest larger one they fit on** - this said *"never a larger
 * one"* until 2026-10-25, and `fittingPaper` below says why that changed and whose decision it
 * was - anchors turned into power symbols (rails) or global
 * labels (everything else), NC pins marked, then a sheet-wide wire-safety and body-clearance
 * backstop. Junction dots are cosmetic: exactly the junctionPoints() of the sheet's items.
 */
import type { Circuit, Paper, SheetId, SheetSpec } from "../ir/types.ts";
import type { Backend, BlockLayout, BlockSubgraph, Placement, Wire } from "./block-types.ts";
import { pinMarks, type PinMark } from "./pin-marks.ts";
import { placedNoConnects } from "./blocks.ts";
import { junctionPoints } from "./connectivity.ts";
import {
  blockContent, contentOffset, flagsContent, frameAt, frameSize, legendTexts, notesContent,
  translateLayout, translatePowers, translateTexts, type FrameContent,
} from "./frames.ts";
import { fmtMm, placeBox, pointKey, type Point, type Um } from "./geometry.ts";
import type { SymbolResolver } from "./library.ts";
import { shelfPacking, type SheetPacking } from "../elk/sheet-graph.ts";

/** What a sheet-packing pre-pass hands in: the packing AND the paper it is on. */
export interface PrePacked {
  readonly paper: Paper;
  readonly packing: SheetPacking;
}
import { assertSheetSafe, sheetItems, type SheetBlock } from "./sheet-check.ts";
import { blockFields, type FieldFallback } from "./field-placement.ts";
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

/**
 * The placed symbols of one block, and the field pairs its placer could not keep clear.
 *
 * **BOTH COME OUT OF ONE CALL, which is the point.** `blockFields` is deterministic, so calling it
 * twice would agree - but then the drawing and its report would be two runs, and a reader comparing
 * them would be comparing two measurements of one thing. One call, two values.
 */
function placedSymbols(g: BlockSubgraph, layout: BlockLayout, symbols: SymbolResolver): { symbols: PlacedSymbol[]; fallbacks: FieldFallback[] } {
  const fields = blockFields(g, layout, symbols);
  const placed = layout.placements.map((pl, i) => {
    const u = g.units.find((x) => x.part.label === pl.part && x.unit === pl.unit);
    const box = u?.symbol.boxes.get(pl.unit);
    const t = fields[i];
    if (u === undefined || box === undefined || t === undefined) throw new Error(`block ${g.block.id}: no body box for ${pl.part}#${pl.unit}`);
    return { part: pl.part, unit: pl.unit, at: pl.at, rot: pl.rot, box: placeBox(pl.at, pl.rot, box), body: t.body, fields: t.fields };
  });
  return { symbols: placed, fallbacks: fields.flatMap((f) => (f.fallback === null ? [] : [f.fallback])) };
}

/** The end of every NC pin of every placed unit that takes an X (unitPins.noConnectEnds), once per point. */
function noConnects(blocks: readonly SheetBlock[]): Point[] {
  const byKey = new Map<string, Point>();
  for (const { g, layout } of blocks) {
    for (const p of placedNoConnects(g, layout.placements)) byKey.set(pointKey(p.at), p.at);
  }
  return [...byKey.values()];
}

/**
 * **`elk` IS TASK 12's ADDITION AND IT IS WHY THIS FILE IS DIVERGED** (`docs/known-gaps.md`
 * **G186**). It is the last link of the chain `generate` -> `layoutSheet` -> `blockContent` ->
 * `renderBlock` -> `realiseBlock`, which is how the asynchronous ELK pre-pass's result reaches a
 * synchronous realise dispatch (plan decision **D2**). It defaults to `null` for **G146**'s
 * reason: an `auto` block that reaches ELK with no backend REFUSES, naming the block, and the
 * default is what keeps every ported caller of this function unchanged.
 *
 * **`packing` IS TASK 15's ADDITION, AND IT DEFAULTS TO `null` FOR THE SAME REASON.** `elkjs` has
 * no synchronous layout entry point (decision **D2**), so a connectivity-aware sheet packing must
 * be computed before this function is called, exactly as a block's ELK layout is - see
 * `sheetPackPrePass` in `tools/schgen/elk/sheet-layout.ts`, which is also where the
 * shelf-versus-ELK selection rule is stated once. **`null` is not a fallback: it is the state
 * "no sheet-packing pre-pass ran"**, which is true of every ported caller of this function and of
 * every test that calls it directly, and in that state the packer is the shelf packer this file has
 * always used. A pre-pass that ran and chose the shelf packer passes a `SheetPacking` whose `by` is
 * `"shelf"`, so the two cases are distinguishable in a report rather than conflated.
 */
export function sheetOf(c: Circuit, sheetId: SheetId): SheetSpec {
  const sheet = c.sheets.find((s) => s.id === sheetId);
  if (sheet === undefined) throw new Error(`unknown sheet ${sheetId}`);
  return sheet;
}

/**
 * ONE SHEET's FRAME CONTENTS, IN THE ORDER THEY ARE PACKED - **extracted from `layoutSheet` by
 * Task 15 and called by both it and the sheet-packing pre-pass.**
 *
 * It is extracted rather than duplicated because a pre-pass that packed a different content list
 * from the one that gets placed would hand `layoutSheet` positions for frames it does not have -
 * and the order is load-bearing: `arrange` reads the packer's positions by index, so blocks in
 * declaration order, then the notes frame, then the power-flag frame, is the contract between the
 * packer and the arranger.
 */
export function sheetContents(c: Circuit, sheetId: SheetId, symbols: SymbolResolver, flagLibId: string, elk: Backend | null): FrameContent[] {
  const sheet = sheetOf(c, sheetId);
  const blocks = [...c.blocks.values()].filter((b) => b.sheet === sheetId).sort((a, b) => a.order - b.order);
  const flags = flagsContent([...c.rails.values()], sheetId, flagLibId, symbols);
  const notes = notesContent(sheet);
  return [
    ...blocks.map((b) => blockContent(c, b.id, symbols, elk)),
    ...(notes === null ? [] : [notes]),
    ...(flags === null ? [] : [flags]),
  ];
}

/**
 * Paper sizes smallest first, which is the order `fittingPaper` walks. Declared here rather than
 * read off `PAPER`'s key order, because an object's key order is not a stated sequence and this
 * one is load-bearing: it decides which sheet a drawing lands on.
 */
export const PAPER_LADDER: readonly Paper[] = ["A4", "A3", "A2", "A1"];

/**
 * The papers a sheet declaring `declared` may be drawn on, smallest first - `declared` and every
 * larger one. **Exported because the sheet-packing PRE-PASS must walk the same sequence with its
 * own packer** (`tools/schgen/elk/sheet-layout.ts`): the pre-pass packs with ELK and this module
 * packs with the shelf packer, so the two cannot share a walk, but they must not disagree about
 * the ladder. One stated sequence, two users.
 */
export function papersFrom(declared: Paper): readonly Paper[] {
  const i = PAPER_LADDER.indexOf(declared);
  if (i === -1) throw new Error(`paper ${declared} is not in PAPER_LADDER, which must name every Paper`);
  return PAPER_LADDER.slice(i);
}

/**
 * The smallest paper from `declared` upwards that `contents` fit on, with whether it grew.
 *
 * **THE DECLARED PAPER IS A FLOOR, NOT A CEILING, AND THAT IS A CHANGE.** This used to refuse -
 * *"blocks do not fit on A3; give the sheet a larger paper in its SheetSpec"* - which made a
 * person do arithmetic the tool had already done: the refusal named the size needed, so the
 * answer was derivable from the message that withheld it. `CLAUDE.md`: *"A first solution that
 * technically works but leaves a person doing fiddly remedial work is a failure, not a
 * delivery."*
 *
 * **The owner, 2026-10-25, asked for this directly.** Told that two boards needed more than A3
 * and asked which way he wanted it resolved, his reply was *"why are you asking?"* - a paper
 * size large enough to hold a drawing is a measurement, not a preference, and standard paper is
 * a known ladder. `docs/known-gaps.md` **G292** records the exchange.
 *
 * **It still refuses when NOTHING fits**, because then there is a real decision to make and no
 * ladder step to take. And it never SHRINKS below the declaration: a sheet declared A3 that
 * would fit on A4 stays A3, because the declared size is somebody's statement about the artifact
 * and only the overflow is this function's business.
 */
function fittingPaper(
  declared: Paper,
  contents: readonly FrameContent[],
): { readonly paper: Paper; readonly packed: SheetPacking; readonly grewFrom: Paper | null } {
  let last: SheetPacking | null = null;
  for (const paper of papersFrom(declared)) {
    const packed = shelfPacking(contents, PAPER[paper]);
    last = packed;
    if (packed.ok) return { paper, packed, grewFrom: paper === declared ? null : declared };
  }
  const needed = last !== null && !last.ok ? last.needed : null;
  throw new Error(
    `sheet contents do not fit on any paper size up to ${PAPER_LADDER[PAPER_LADDER.length - 1]}` +
      (needed === null ? "" : ` (needed at least ${fmtMm(needed.w)} × ${fmtMm(needed.h)} mm)`) +
      "; the drawing has to get smaller, which is not something this function can do",
  );
}

export function layoutSheet(c: Circuit, sheetId: SheetId, symbols: SymbolResolver, flagLibId: string, elk: Backend | null = null, packing: PrePacked | null = null): SheetDrawing {
  const sheet = sheetOf(c, sheetId);
  const contents = sheetContents(c, sheetId, symbols, flagLibId, elk);
  // A pre-pass has already walked the ladder with its own packer and says which paper it landed
  // on; without one, walk it here with the shelf packer. Either way the paper used is the paper
  // the frames were packed against, which is the thing that must not drift.
  const fitted =
    packing === null
      ? fittingPaper(sheet.paper, contents)
      : { paper: packing.paper, packed: packing.packing, grewFrom: packing.paper === sheet.paper ? null : sheet.paper };
  const paper = PAPER[fitted.paper];
  const packed = fitted.packed;
  if (!packed.ok) {
    throw new Error(
      `sheet ${sheetId}: blocks do not fit on ${fitted.paper}; give the sheet a larger paper in its SheetSpec ` +
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
  const placed = a.blocks.map((b) => placedSymbols(b.g, b.layout, symbols));
  return {
    sheet,
    paper,
    symbols: placed.flatMap((p) => p.symbols),
    fieldFallbacks: placed.flatMap((p) => p.fallbacks),
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
