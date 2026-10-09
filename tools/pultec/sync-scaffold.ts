#!/usr/bin/env bun
/**
 * Entry point for `make pultec-scaffold-agrees`.
 *
 * Thin on purpose, exactly like `tools/pultec/sync-schematic.ts`: the logic lives in
 * `scaffold-sync.ts` where `bun test` can reach it, and this file only turns a result
 * into an exit code and a line of output.
 *
 * IT EXITS 0 EVEN WHEN IT REWRITES, for the same reason `sync-schematic.ts` does: the
 * derivation is the authority and the JSON is derived, so a non-zero exit here would
 * stop `make check` before it ever reached whatever else depends on this artifact.
 */
import { syncPultecScaffold } from "./scaffold-sync.ts"

function main(): number {
  try {
    const result = syncPultecScaffold()
    console.log(result.message)
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    return 1
  }
}

process.exit(main())
