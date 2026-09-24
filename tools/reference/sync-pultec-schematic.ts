#!/usr/bin/env bun
/**
 * Entry point for `make pultec-schematic-agrees`.
 *
 * Thin on purpose, exactly like every recipe in `make/board.mk`: the logic
 * lives in `pultec-schematic-sync.ts` where `bun test` can reach it, and this
 * file only turns a result into an exit code and a line of output.
 *
 * IT EXITS 0 EVEN WHEN IT REWRITES. The schematic is the authority and the
 * export is derived, so a difference is not a failure - it is the export being
 * brought up to date, and what the operator must then do is read the diff. A
 * non-zero exit here would stop `make check` before it ever reached the boards
 * whose agreement with that circuit is the actual question.
 */
import { syncPultecSchematic } from "./pultec-schematic-sync.ts"

function main(): number {
  try {
    const result = syncPultecSchematic()
    console.log(result.message)
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

process.exit(main())
