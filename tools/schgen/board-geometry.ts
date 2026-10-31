/**
 * **THE GEOMETRY BASELINE, AS A TOOL, FOR EVERY BOARD IN `boards/`.** `CLAUDE.md`: *"a figure in
 * prose is a transcription with a date on it."* The board figure in this repository read `0`, `1`,
 * `2`, `5`, `6` and `7` inside five days, with three files disagreeing at once. This tool is the
 * answer to the question - no count it produces is written into a document as the authority; a
 * document only ever carries the command that reproduces it.
 *
 *   bun run tools/schgen/board-geometry.ts
 *
 * **IT MUST NOT PRODUCE A SCORE, AND NEVER WILL.** `crossings`, `corners` and `segments`
 * (`lib/schgen/render/fan-geometry.ts`) plus the fallback count stay independent. They are never
 * combined, weighted, averaged, ranked or thresholded into anything resembling a quality number.
 * Three such proxies were invented here in two days and each pointed the opposite way to the
 * owner's judgement on a specific occasion. A tool that prints four numbers per board is correct;
 * one that prints a verdict is the defect this module exists to refuse.
 *
 * **A REFUSED OR UNDECLARED BOARD PRINTS ITS REASON IN PLACE OF THE NUMBERS, NEVER BESIDE ZEROS.**
 * A row of zeros for a board that drew nothing reads as a clean drawing, and this project's rule is
 * that a skipped check must never look like a passing one.
 *
 * **THE PER-BOARD ROW IS STILL THE AUTHORITY; A PER-BLOCK BREAKDOWN IS CARRIED BESIDE IT, NOT
 * INSTEAD OF IT.** The owner's test is the board - what he builds - so the totals above stay folded
 * per board, exactly as before, and a per-block table alone would let five clean blocks hide one
 * unreadable one. But the work this tool steers is per block (a selector bank's fan, say), and a
 * per-board number alone cannot answer "did the bank get better" - only "did the board." So each
 * generated row also carries a `blocks` breakdown of the same three independent quantities, folded
 * per `BlockId` rather than per board, from the SAME wires and crossing points the board row sums -
 * see `wiresByBlock`/`crossingsByBlock` below for how a wire or a crossing point is attributed to a
 * block from `SheetDrawing` alone, with no attribution invented for whatever cannot be.
 *
 * **CROSSINGS ARE NO LONGER TAKEN FROM `wireGeometry` DIRECTLY.** They used to be, and
 * `lib/schgen/readability/measures.ts` already measures crossings and bends over a CANONICAL
 * topology for exactly the reason stated there: this generator's own geometry carries duplicate and
 * contained wire segments, and a measure taken over the raw segment list double-counts a crossing
 * once per duplicate. `wireGeometry` takes `SheetDrawing.wires` raw and cannot refuse an ambiguous
 * overlap the way `lib/schgen/elk/junctions.ts`'s `canonicalTopology` does. Measured today the two
 * agree exactly on every board this tool generates (zero duplicate segments on the corpus in hand),
 * so this was LATENT rather than live - but it would go live the moment a future block introduces an
 * overlap, and this tool is exactly the one that would then publish a crossing figure for a drawing
 * `measures.ts` would refuse to publish one for. Fixed by taking `crossings` from
 * `canonicalTopology`/`crossings` in `lib/schgen/elk/junctions.ts` - the same two functions
 * `sheetMeasuresOf` itself calls, not a reimplementation of them - rather than from `wireGeometry`.
 * Calling them directly here, instead of calling `sheetMeasuresOf` and discarding its other three
 * measures, is deliberate: this tool also needs the canonicalised wire list for the per-block
 * crossing breakdown above, and canonicalising twice for one drawing would be the "two checks for
 * one question" `CLAUDE.md` forbids. **`segments` and `corners` are UNCHANGED**: they still come
 * from `wireGeometry` over the raw wire list, because `measures.ts` has no corner measure to defer
 * to and a segment count is not affected by canonicalisation's own concern (duplicate CROSSINGS,
 * not duplicate segments as such). This cost nothing on the two boards it was measured against
 * before and after - `pultec-low-boost` stayed 4 and `pultec-low-cut` stayed 8 - see
 * `docs/superpowers/plans/2026-10-27-schematic-in-the-build-guide.md`'s Baseline table.
 *
 * **A THROW NAMES THE BOARD IT CAME FROM.** `wireGeometry` (a diagonal or zero-length wire) and
 * `canonicalTopology` (an ambiguous overlap) both throw without saying which board they were
 * measuring - their messages name a net and a pair of wires, which is the right amount of detail for
 * `lib/schgen/render/fan-geometry.ts` and `lib/schgen/elk/junctions.ts` to carry, since neither module
 * knows what a "board" is. `boardGeometry` below catches exactly around the measurement of one
 * board's drawings and re-throws with the board name prepended, rather than leaving a caller to infer
 * it from which `boardSheets` call was on the stack when eleven boards' measurement is one `for`
 * loop with no board-scoped stack frame of its own. It still loses the rows after the one that threw
 * - this is a per-board MESSAGE fix, not a resilience one - so a bad wire on board six still ends the
 * run; the message says which board to go fix.
 *
 * Built on `boardRefs` and `boardSheets` from `tools/schgen/board-sheets.ts`, which is the model for
 * this whole structure and the exported per-board resolver - this tool does not re-walk `boards/`
 * or re-build a `GenerateEnv` of its own. `pdf: false` throughout: this tool measures, it does not
 * export.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { moduleRepoRoot } from "../perfboard/repo-root.ts";
import { boardRefs, boardSheets, type BoardRef } from "./board-sheets.ts";
import { wireGeometry } from "../../lib/schgen/render/fan-geometry.ts";
import type { Wire } from "../../lib/schgen/render/block-types.ts";
import { canonicalTopology, crossings } from "../../lib/schgen/elk/junctions.ts";
import type { Point } from "../../lib/schgen/render/geometry.ts";
import type { Box } from "../../lib/schgen/render/lib-pins.ts";
import type { SheetDrawing } from "../../lib/schgen/render/sheet-types.ts";

/** One block's geometry, folded over every sheet of its board it appears on (ordinarily one). */
export interface BlockGeometry {
  readonly blockId: string;
  readonly segments: number;
  readonly crossings: number;
  readonly corners: number;
}

/** One board's wire geometry, or the blocker in full when it did not generate. */
export interface BoardGeometry {
  readonly board: string;
  /**
   * Whether this tool had geometry to measure, and if not why.
   *
   * **IT IS NOT `BoardSheets.outcome` AND MUST NOT BE READ AS A RATIFICATION CLASS.** That field
   * carries the spec's four classes (`lib/schgen/findings.ts`); this one answers the narrower
   * question this census asks - *was there a drawing to measure* - so a board whose gates
   * complained and whose drawing was written anyway reads `generated` here. Read `STATUS.md` in
   * `build/schgen-boards/<board>/`, or `tools/schgen/board-sheets.ts`, for the class.
   */
  readonly outcome: "generated" | "refused" | "no-declaration";
  /** The blocker in full for `refused`, the reason for `no-declaration`, empty for `generated`. */
  readonly blocker: string;
  readonly segments: number;
  readonly crossings: number;
  readonly corners: number;
  /** Field placements the placer could not make clear, over every sheet of this board. */
  readonly fallbacks: number;
  /** Per-block breakdown of the three measures above, folded by `BlockId`. Empty for a non-"generated" outcome. */
  readonly blocks: readonly BlockGeometry[];
  /**
   * Wires, and crossing points, that `SheetDrawing` alone does not let this tool attribute to
   * exactly one block - counted rather than guessed at or silently dropped. Zero on every board
   * measured so far: every block's own wires sit inside its own frame, by construction of
   * `lib/schgen/render/frames.ts`'s `blockContent`/`frameSize`, and frames on one sheet never
   * overlap. A non-zero count here is a finding about THAT, not about the board's drawing.
   */
  readonly unattributed: { readonly wires: number; readonly crossingPoints: number };
}

/** A point strictly or exactly within `box`'s closed extent. */
function inside(box: Box, p: Point): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
}

/** `d`'s frames that belong to a real block, keyed by `BlockId`: what a wire or point can be attributed to. */
function blockFrames(d: SheetDrawing): ReadonlyMap<string, Box> {
  const out = new Map<string, Box>();
  for (const f of d.frames) if (f.blockId !== null) out.set(f.blockId, f.box);
  return out;
}

/** The one block frame containing `p`, or `undefined` when none does or more than one does. */
function blockContaining(frames: ReadonlyMap<string, Box>, p: Point): string | undefined {
  let found: string | undefined;
  for (const [blockId, box] of frames) {
    if (!inside(box, p)) continue;
    if (found !== undefined) return undefined;
    found = blockId;
  }
  return found;
}

/**
 * The block a wire belongs to: the one frame whose box contains BOTH its endpoints.
 *
 * **WHY BOTH ENDPOINTS, RATHER THAN EITHER.** A wire that touches two different blocks' frames
 * would not be one block's own geometry, and this corpus has none - every sheet wire comes from
 * exactly one block's `BlockLayout.wires`, translated into its own frame
 * (`lib/schgen/render/sheets.ts`'s `layoutSheet`: `a.blocks.flatMap((b) => b.layout.wires)`) - but
 * requiring both rather than assuming it keeps a future violation visible as `undefined` (counted in
 * `unattributed.wires`) instead of silently attributed to whichever endpoint was checked first.
 */
function blockOfWire(frames: ReadonlyMap<string, Box>, w: Wire): string | undefined {
  const a = blockContaining(frames, w.a);
  const b = blockContaining(frames, w.b);
  return a !== undefined && a === b ? a : undefined;
}

interface BlockTotals {
  segments: number;
  crossings: number;
  corners: number;
}

/** One drawing's wires, already-canonicalised crossing points, and its frames, bundled for attribution. */
interface MeasuredDrawing {
  readonly d: SheetDrawing;
  readonly crossingPoints: readonly Point[];
}

/**
 * `d`'s crossing points, over its CANONICAL topology - the same two functions
 * `lib/schgen/readability/measures.ts`'s `sheetMeasuresOf` calls on the same inputs, not a
 * reimplementation of them. **Refuses, rather than returning a figure, when the topology is
 * ambiguous** - exactly `measures.ts`'s own rule (see this module's comment): a crossing count
 * taken over a geometry with more than one reading is a figure about a drawing nobody picked.
 */
function canonicalCrossingPoints(d: SheetDrawing): readonly Point[] {
  const t = canonicalTopology({ placements: [], wires: d.wires, anchors: [] }, []);
  if (!t.ok) {
    throw new Error(
      `sheet ${d.sheet.id}: the canonical topology of its wires was refused (${t.ambiguous.length} ` +
        "ambiguous overlap(s)), so its crossing count would be taken over a geometry with more than " +
        `one reading: ${t.ambiguous.join("; ")}`,
    );
  }
  return crossings(t);
}

/**
 * The per-block breakdown of `measured`'s wires and canonical crossing points, plus what could not
 * be attributed. **`wireGeometry` is run once per block's own wire bucket** for `segments`/
 * `corners` - cheap, because it is pure, and because a block's wires are already its own geometry
 * once bucketed. **Crossing points are the ones `canonicalCrossingPoints` already computed** for
 * the board-level total, attributed here by which block's frame contains the point, so the
 * per-block crossing figures sum to exactly the board's.
 */
function blockGeometryOf(measured: readonly MeasuredDrawing[]): {
  readonly blocks: readonly BlockGeometry[];
  readonly unattributedWires: number;
  readonly unattributedCrossingPoints: number;
} {
  const totals = new Map<string, BlockTotals>();
  const bump = (blockId: string, add: Partial<BlockTotals>): void => {
    const t = totals.get(blockId) ?? { segments: 0, crossings: 0, corners: 0 };
    totals.set(blockId, {
      segments: t.segments + (add.segments ?? 0),
      crossings: t.crossings + (add.crossings ?? 0),
      corners: t.corners + (add.corners ?? 0),
    });
  };
  let unattributedWires = 0;
  let unattributedCrossingPoints = 0;

  for (const { d, crossingPoints } of measured) {
    const frames = blockFrames(d);

    const byBlock = new Map<string, Wire[]>();
    for (const w of d.wires) {
      const blockId = blockOfWire(frames, w);
      if (blockId === undefined) {
        unattributedWires += 1;
        continue;
      }
      const list = byBlock.get(blockId);
      if (list === undefined) byBlock.set(blockId, [w]);
      else list.push(w);
    }
    for (const [blockId, wires] of byBlock) {
      const g = wireGeometry(wires);
      bump(blockId, { segments: g.segments, corners: g.corners });
    }

    for (const p of crossingPoints) {
      const blockId = blockContaining(frames, p);
      if (blockId === undefined) {
        unattributedCrossingPoints += 1;
        continue;
      }
      bump(blockId, { crossings: 1 });
    }
  }

  const blocks = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([blockId, t]) => ({ blockId, ...t }));
  return { blocks, unattributedWires, unattributedCrossingPoints };
}

/** One board's geometry, folded over every sheet it drew. */
export async function boardGeometry(board: BoardRef, repoRoot: string, outDir: string): Promise<BoardGeometry> {
  const r = await boardSheets(board, repoRoot, { outDir, pdf: false });
  // **THE TEST IS WHETHER A DRAWING EXISTS, NOT WHETHER THE GATES RATIFIED IT**, and the two
  // stopped being the same thing in Task 4 of the gates-classify plan: `boardSheets` now reports
  // one of four CLASSES and hands back the drawing of a board whose gates complained. This tool
  // measures GEOMETRY - segments, crossings, corners - and an unratified drawing has geometry to
  // measure, so excluding it would be this tool declining to measure exactly the boards the reform
  // exists to make visible. `boardSheets`'s own `outcome` carries the class; this census keeps its
  // own three-value vocabulary, which says only whether it had geometry in hand.
  if (r.drawings.length === 0) {
    return {
      board: r.board,
      outcome: r.declared ? "refused" : "no-declaration",
      blocker: r.blocker,
      segments: 0,
      crossings: 0,
      corners: 0,
      fallbacks: 0,
      blocks: [],
      unattributed: { wires: 0, crossingPoints: 0 },
    };
  }
  try {
    const geo = r.drawings.map((d) => wireGeometry(d.wires));
    const segments = geo.reduce((n, x) => n + x.segments, 0);
    const corners = geo.reduce((n, x) => n + x.corners, 0);
    // CROSSINGS COME FROM THE CANONICAL TOPOLOGY, NOT FROM `geo` ABOVE - see this module's comment
    // on why `wireGeometry`'s own (uncanonicalised) crossing count is no longer what is published.
    // Computed once per drawing here, and the same per-drawing result is handed to
    // `blockGeometryOf` below rather than recomputed.
    const measured: readonly MeasuredDrawing[] = r.drawings.map((d) => ({ d, crossingPoints: canonicalCrossingPoints(d) }));
    const crossingTotal = measured.reduce((n, m) => n + m.crossingPoints.length, 0);
    const { blocks, unattributedWires, unattributedCrossingPoints } = blockGeometryOf(measured);
    return {
      board: r.board,
      outcome: "generated",
      blocker: "",
      segments,
      crossings: crossingTotal,
      corners,
      fallbacks: r.fallbacks.length,
      blocks,
      unattributed: { wires: unattributedWires, crossingPoints: unattributedCrossingPoints },
    };
  } catch (caught) {
    // NAME THE BOARD: `wireGeometry` and `canonicalTopology` both throw naming a net or a wire pair,
    // never a board - neither module knows what a "board" is - and this loop is the only place that
    // does. See this module's comment on why this is a message fix, not a resilience one: the board
    // after this one still goes unmeasured on this run.
    const message = caught instanceof Error ? caught.message : String(caught);
    throw new Error(`board ${r.board}: ${message}`);
  }
}

export async function boardGeometryCensus(repoRoot: string, outDir: string): Promise<readonly BoardGeometry[]> {
  const out: BoardGeometry[] = [];
  for (const board of boardRefs(repoRoot)) out.push(await boardGeometry(board, repoRoot, outDir));
  return out;
}

/**
 * The census as lines. **The three geometry quantities and the fallback count are printed
 * side by side and never folded into each other** - see the module comment's "must not produce a
 * score" clause. A `refused` or `no-declaration` row carries no numbers at all, by the same rule
 * that keeps `tools/schgen/board-sheets.ts` from printing fallback zeros for a board that drew
 * nothing. A generated row's per-block breakdown follows, indented, and any unattributed wire or
 * crossing point is named rather than folded silently into a block it may not belong to.
 */
export function renderBoardGeometry(census: readonly BoardGeometry[]): string {
  const lines: string[] = [];
  for (const r of census) {
    if (r.outcome === "generated") {
      lines.push(`${r.board}: generated (segments ${r.segments}, crossings ${r.crossings}, corners ${r.corners}, fallbacks ${r.fallbacks})`);
      for (const b of r.blocks) {
        lines.push(`    block ${b.blockId}: segments ${b.segments}, crossings ${b.crossings}, corners ${b.corners}`);
      }
      if (r.unattributed.wires > 0 || r.unattributed.crossingPoints > 0) {
        lines.push(
          `    UNATTRIBUTED: ${r.unattributed.wires} wire(s), ${r.unattributed.crossingPoints} crossing ` +
            "point(s) could not be assigned to exactly one block from this sheet's frames",
        );
      }
    } else {
      lines.push(`${r.board}: ${r.outcome}`);
      for (const line of r.blocker.split("\n")) lines.push(`    ${line}`);
    }
  }
  const generated = census.filter((r) => r.outcome === "generated");
  const notGenerated = census.length - generated.length;
  lines.push("");
  if (generated.length === 0) {
    lines.push("totals: NOT MEASURED - no board produced a sheet, so there is no geometry to sum");
  } else {
    lines.push(
      `totals over ${generated.length} of ${census.length} board(s) that generated: ` +
        `${generated.reduce((n, r) => n + r.segments, 0)} segments, ` +
        `${generated.reduce((n, r) => n + r.crossings, 0)} crossings, ` +
        `${generated.reduce((n, r) => n + r.corners, 0)} corners, ` +
        `${generated.reduce((n, r) => n + r.fallbacks, 0)} fallback field placement(s)`,
    );
  }
  lines.push(`${notGenerated} of ${census.length} board(s) did not produce a sheet (refused or no authoring declaration)`);
  return lines.join("\n");
}

if (import.meta.main) {
  const repoRoot = moduleRepoRoot();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "schgen-board-geometry-"));
  console.log(`writing generations under ${outDir}`);
  console.log(renderBoardGeometry(await boardGeometryCensus(repoRoot, outDir)));
}
