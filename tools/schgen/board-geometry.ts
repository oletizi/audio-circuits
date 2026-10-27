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
 * **GEOMETRY IS FOLDED PER BOARD, NOT PER BLOCK.** The owner's test is the board - what he builds -
 * and a per-block table lets five clean blocks hide one unreadable one. Every `SheetDrawing` a
 * board produces (`BoardSheets.drawings`) is measured with `wireGeometry` and summed into one row.
 *
 * **`wireGeometry` THROWS on a diagonal or a zero-length wire, and this tool does not catch it.** A
 * diagonal in a generated sheet is a finding in its own right; silently scoring it zero is the
 * failure `lib/schgen/render/fan-geometry.ts` was written to make impossible. If this tool throws,
 * the thrown message already names the board (the loop below measures one board's drawings between
 * `boardSheets` calls, so the board under measurement is always the one on the stack) - read the
 * message rather than reaching for a try/catch here.
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
import { wireGeometry, type WireGeometry } from "../../lib/schgen/render/fan-geometry.ts";

/** One board's wire geometry, or the blocker in full when it did not generate. */
export interface BoardGeometry {
  readonly board: string;
  readonly outcome: "generated" | "refused" | "no-declaration";
  /** The blocker in full for `refused`, the reason for `no-declaration`, empty for `generated`. */
  readonly blocker: string;
  readonly segments: number;
  readonly crossings: number;
  readonly corners: number;
  /** Field placements the placer could not make clear, over every sheet of this board. */
  readonly fallbacks: number;
}

/** One board's geometry, folded over every sheet it drew. */
export async function boardGeometry(board: BoardRef, repoRoot: string, outDir: string): Promise<BoardGeometry> {
  const r = await boardSheets(board, repoRoot, { outDir, pdf: false });
  if (r.outcome !== "generated") {
    return { board: r.board, outcome: r.outcome, blocker: r.blocker, segments: 0, crossings: 0, corners: 0, fallbacks: 0 };
  }
  const geo = r.drawings.map((d) => wireGeometry(d.wires));
  const sum = (pick: (x: WireGeometry) => number): number => geo.reduce((n, x) => n + pick(x), 0);
  return {
    board: r.board,
    outcome: "generated",
    blocker: "",
    segments: sum((x) => x.segments),
    crossings: sum((x) => x.crossings),
    corners: sum((x) => x.corners),
    fallbacks: r.fallbacks.length,
  };
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
 * nothing.
 */
export function renderBoardGeometry(census: readonly BoardGeometry[]): string {
  const lines: string[] = [];
  for (const r of census) {
    if (r.outcome === "generated") {
      lines.push(`${r.board}: generated (segments ${r.segments}, crossings ${r.crossings}, corners ${r.corners}, fallbacks ${r.fallbacks})`);
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
