/**
 * The build packet's schematic resolution: `resolveSchematic` is what
 * `tools/guide/packet.ts`'s `writeGuidePacket` calls to decide what goes in
 * the Schematic row and whether page `SCHEMATIC_PAGE` exists.
 *
 * **THIS FILE USED TO OFFER A BOARD WITH NO DECLARED `"sch"` TO `schgen` FOR
 * GENERATION, AND THAT PATH IS DELETED.** All eleven boards under `boards/`
 * now declare a schematic, so the generate path was dead in practice; it is
 * removed here rather than left live-but-unreachable, per
 * `docs/superpowers/plans/2026-10-30-remove-schgen.md`. `resolveSchematic`
 * keeps the two outcomes that remain real: a board that declares `"sch"`
 * gets that sheet printed, exactly as before, and a board that declares none
 * gets `kind: "none"` - the notice `tools/guide/schematic-notice.ts`'s
 * `noSchematicNotice` already prints. There is no longer a `"generated"` or
 * `"withheld"` outcome: both belonged to the `schgen` offer, and the
 * classifier call, the temp directory, and the `boardRefs`/`boardSheets`
 * dependencies that supported them are gone with it. The deleted reasoning -
 * five outcomes, a `worstClass` gate, the owner's instruction to stop passing
 * judgement on layout - is history now; it is in this file's git history
 * (and `docs/superpowers/plans/2026-10-30-remove-schgen-execution/`) for
 * anyone who needs it, not duplicated here.
 */
import path from "node:path"
import type { PerfboardDeclaration } from "../perfboard/declaration.ts"
import type { GuideSchematic } from "./guide.ts"

/** What `resolveSchematic` found: the `GuideSchematic` the page prints. */
export interface SchematicResolution {
  readonly schematic: GuideSchematic
}

/**
 * The packet's schematic source: a board that declares `"sch"` prints that
 * sheet; a board that declares none gets `kind: "none"`, naming the
 * declaration and the circuit model the pages were checked against instead -
 * `tools/guide/schematic-notice.ts`'s `noSchematicNotice` is what prints it.
 */
export function resolveSchematic(
  declaration: PerfboardDeclaration,
  schPath: string | undefined,
  repoRoot: string,
): SchematicResolution {
  if (schPath !== undefined) {
    return { schematic: { kind: "printed", path: path.relative(repoRoot, schPath) } }
  }
  return {
    schematic: {
      kind: "none",
      declarationPath: path.relative(repoRoot, declaration.file),
      circuitPath: path.relative(repoRoot, declaration.circuitPath),
    },
  }
}
