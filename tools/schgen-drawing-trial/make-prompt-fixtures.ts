/**
 * **WRITES THE FIXTURES THE IN-CONTAINER PROMPT TESTS READ, FROM THE TWO PLACES THEY MUST COME FROM.**
 *
 *   bun tools/schgen-drawing-trial/make-prompt-fixtures.ts
 *
 * For each trial board, under `runtime/tests/fixtures/<board>/`:
 *
 * - `request.json`: written by `./request.ts`'s own `buildRequest`, the same object its CLI writes,
 *   so the prompt tests read exactly what Task 5 will send.
 * - `page_data.json`: every UUID and every `(at x y` pair in the board's APPROVED page, with that
 *   page's sha256. `runtime/tests/test_prompt.py` reads it to prove the rendered prompt carries
 *   none of them. This file is the only place the prompt side touches the approved page, and it is
 *   read by a test only: `prompt.py` never opens it.
 *
 * The container tests cannot reach `drafted/` (only `runtime/` is mounted), which is why the page's
 * coordinates and UUIDs are copied into a fixture rather than read in place. Re-run this after any
 * change to `./request.ts` or to an approved page, and commit what it writes.
 */
import fs from "node:fs"
import path from "node:path"
import { draftedSheet, sha256OfFile } from "../../tests/circuits/drafted-sheet.ts"
import { TRIAL_BOARDS, TRIAL_CIRCUIT } from "./boards.ts"
import { buildRequest } from "./request.ts"

const FIXTURES = path.join(import.meta.dir, "runtime", "tests", "fixtures")
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const AT_PAIR = /\(at (-?[0-9.]+) (-?[0-9.]+)/g

function pageData(board: string): { sheet_sha256: string; uuids: string[]; at_pairs: string[] } {
  const sheet = draftedSheet(TRIAL_CIRCUIT, board)
  const text = fs.readFileSync(sheet, "utf8")
  const uuids = [...new Set(text.match(UUID) ?? [])].sort()
  const atPairs = [...new Set([...text.matchAll(AT_PAIR)].map((m) => `(at ${m[1]} ${m[2]}`))].sort()
  if (uuids.length === 0 || atPairs.length === 0) {
    throw new Error(
      `${sheet} yielded ${uuids.length} UUIDs and ${atPairs.length} "(at x y" pairs; an approved ` +
        "page has both, so a zero means the patterns no longer match the file and the no-page-data " +
        "test would pass vacuously",
    )
  }
  return { sheet_sha256: sha256OfFile(sheet), uuids, at_pairs: atPairs }
}

for (const board of TRIAL_BOARDS) {
  const dir = path.join(FIXTURES, board)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "request.json"), `${JSON.stringify(buildRequest(board), null, 2)}\n`)
  fs.writeFileSync(path.join(dir, "page_data.json"), `${JSON.stringify(pageData(board), null, 2)}\n`)
}
