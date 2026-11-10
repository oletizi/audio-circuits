/**
 * **THE APPROVAL GATE AND THE MODEL MODULE FOR ONE TRIAL BOARD, AS JSON, FOR THE PYTHON RUNNER.**
 *
 * `run_attempt.py` calls this before any generation request for a board, and again when it writes
 * the manifest. `approvedSheetDigest` throws when the board's committed page's sha256 is not in
 * `docs/schematic/verdicts.md`, and this CLI then exits non-zero, so no request is ever sent for a
 * board whose page is not approved byte for byte.
 *
 * CLI: `bun tools/schgen-drawing-trial/board-info.ts BOARD` prints
 * `{"board", "approved_sheet_sha256", "model_module"}`; `--list` prints `TRIAL_BOARDS`, one per
 * line, in the order `run_all.sh` runs them.
 */
import { modelModuleFor } from "../../tests/circuits/sheet-model.ts"
import { approvedSheetDigest, TRIAL_BOARDS } from "./boards.ts"

export interface BoardInfo {
  readonly board: string
  readonly approved_sheet_sha256: string
  readonly model_module: string
}

export function boardInfo(board: string): BoardInfo {
  return { board, approved_sheet_sha256: approvedSheetDigest(board), model_module: modelModuleFor(board) }
}

function main(argv: readonly string[]): void {
  const [board] = argv
  if (board === "--list" && argv.length === 1) {
    process.stdout.write(`${TRIAL_BOARDS.join("\n")}\n`)
    return
  }
  if (board === undefined || argv.length !== 1) {
    throw new Error("usage: bun tools/schgen-drawing-trial/board-info.ts BOARD | --list")
  }
  process.stdout.write(`${JSON.stringify(boardInfo(board))}\n`)
}

if (import.meta.main) main(process.argv.slice(2))
