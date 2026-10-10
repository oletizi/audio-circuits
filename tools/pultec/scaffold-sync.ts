/**
 * Keep `circuits/pultec/generated/scaffold.json` honest with the derivation it comes
 * from.
 *
 * THE ELECTRICAL MODEL IS THE AUTHORITY HERE, not a schematic: there is no scaffold
 * schematic to export from (the former scaffold board was perfboard, like the five
 * sections it served, and has since been deleted - see "Task 4: Delete the separate
 * scaffold board"), so the dependency this guard tracks is
 *
 *   THREE_BAND_REFERENCE + allStandIns()   (lib/board/scaffold/*)
 *     -> circuits/pultec/generated/scaffold.json
 *
 * Every step is DERIVED, so the only way this file goes wrong is by being stale.
 * Mirrors `tools/pultec/schematic-sync.ts`: regenerate on every run, decide from
 * content, never a timestamp - git does not preserve mtimes, so a checked-out stale
 * file would otherwise read as current.
 *
 * WHAT A CLEAN DIFF HERE DOES NOT COVER. The artifact serialises the DERIVATION - each
 * section's boundary nets and its reduced components - and stops there. It says
 * nothing about board wiring; that was true even back when a board existed to wire,
 * and remains true now that the scaffolding is build-time part population on each
 * section board instead of a separate board with removable links.
 */
import fs from "node:fs"
import { allStandIns, REFERENCE_FLAT } from "../../lib/board/scaffold/index.ts"
import { partitionReference } from "../../circuits/pultec/partition.ts"

/** Repository-relative, so a clone at any path reads the same. */
export const SCAFFOLD_JSON = "circuits/pultec/generated/scaffold.json"

/**
 * The derived artifact's content: every section's stand-in (its boundary nets, its
 * resolved components and the isolation points `isolate()` in `scaffold.ts` breaks),
 * under the frequency state the board emulates.
 *
 * Ends with a trailing newline, like every other generated text fixture in this
 * repository, so a byte-for-byte diff shows only genuine content changes.
 */
export function freshScaffoldArtifact(): string {
  const modules = partitionReference().modules
  const standIns = allStandIns(modules, REFERENCE_FLAT)
  return `${JSON.stringify(standIns, null, 2)}\n`
}

export interface ScaffoldSyncResult {
  readonly changed: boolean
  /** Always set, so no caller has to invent wording for either outcome. */
  readonly message: string
}

/**
 * Regenerate the artifact and rewrite it only if its content has changed.
 *
 * EXITS CLEAN EVEN WHEN IT REWRITES, same as `syncPultecSchematic`: the derivation is
 * the authority and the JSON is derived, so a difference is not a failure, it is the
 * artifact being brought up to date. What the operator does next is read the diff.
 */
export function syncPultecScaffold(): ScaffoldSyncResult {
  const fresh = freshScaffoldArtifact()
  const existing = fs.existsSync(SCAFFOLD_JSON) ? fs.readFileSync(SCAFFOLD_JSON, "utf8") : undefined

  if (existing === fresh) {
    return { changed: false, message: `${SCAFFOLD_JSON} is current.` }
  }

  fs.writeFileSync(SCAFFOLD_JSON, fresh)
  return {
    changed: true,
    message:
      existing === undefined
        ? `${SCAFFOLD_JSON} created from the stand-in derivation: no fixture was checked in yet.`
        : `${SCAFFOLD_JSON} DID NOT MATCH the stand-in derivation and has been rewritten.\n` +
          "  The scaffold board is built from the same derivation, so read the diff before trusting " +
          "any layout built against the previous content.",
  }
}
