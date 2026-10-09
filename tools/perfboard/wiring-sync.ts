/**
 * Keep a board's wiring guide honest with the circuit it describes.
 *
 * The guide (`lib/board/wiring.ts`) tells a builder which pad is 20Hz, which
 * pot lug is the wiper, and which board each terminal reaches. It is derived,
 * so the only way it can be wrong is by being STALE - and a stale wiring guide
 * is worse than none, because it is confidently wrong in a way the layout
 * cannot contradict.
 *
 * So it is regenerated on every run and rewritten ONLY when the content
 * differs, exactly as `netlist-sync.ts` treats the KiCad netlist fixture. An
 * unchanged circuit leaves `git status` clean; a changed one leaves a diff the
 * operator has to look at. There is no timestamp anywhere in the document, so
 * "differs" always means the wiring actually differs.
 *
 * A BOARD WITH NOTHING OFF IT GETS NO GUIDE. `pt2399-core` has no panel parts
 * and no terminal block, so a document for it would say "None" twice. Absence
 * is reported as `not-applicable` rather than written out as noise.
 */
import fs from "node:fs"
import path from "node:path"
import { wiringDocument } from "../../lib/board/wiring.ts"
import { physicalOnly } from "../../lib/board/physicalize.ts"
import { assertDesignators, assertOffBoardIds, assertPadOrder } from "./check.ts"
import { boardName } from "./declaration.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { isRecord } from "./guards.ts"
import { loadCircuit } from "./load.ts"
import { repoRelativePath } from "./netlist-sync.ts"
import { moduleRepoRoot } from "./repo-root.ts"

/** The file a board's guide lives in, beside its declaration. */
export function wiringPath(declaration: PerfboardDeclaration): string {
  return path.join(declaration.dir, "wiring.md")
}

/**
 * Validate `SHARED_BY`: absent means none, otherwise net -> array of board names.
 *
 * Absent is legitimate - a board that crosses to nothing has no table to build -
 * so it defaults to empty. A wrong SHAPE does not: it would silently produce a
 * terminal table claiming every net reaches no other board, which is a
 * statement about the harness, not a missing field.
 */
export function assertSharedBy(
  value: unknown,
  declaration: PerfboardDeclaration,
): Readonly<Record<string, readonly string[]>> {
  if (value === undefined) return {}
  if (!isRecord(value)) {
    throw new Error(
      `${declaration.file}: ${declaration.circuitPath} exports SHARED_BY, but it must be an ` +
        `object mapping net names to board names, got ${typeof value}.`,
    )
  }
  const shared: Record<string, readonly string[]> = {}
  for (const [netName, owners] of Object.entries(value)) {
    if (!Array.isArray(owners) || owners.some(owner => typeof owner !== "string")) {
      throw new Error(
        `${declaration.file}: SHARED_BY["${netName}"] must be an array of board-name strings.`,
      )
    }
    shared[netName] = owners
  }
  return shared
}

export interface WiringSyncResult {
  readonly status: "written" | "unchanged" | "not-applicable"
  readonly file: string
  /** What to tell the operator. Always set, so a caller never invents wording. */
  readonly message: string
}

/** Build the guide for one declared board, without touching the filesystem. */
export async function wiringDocumentFor(
  declaration: PerfboardDeclaration,
): Promise<string | undefined> {
  const network = await loadCircuit(declaration)
  const imported: unknown = await import(declaration.circuitPath)
  if (!isRecord(imported)) {
    throw new Error(
      `${declaration.file}: the module at ${declaration.circuitPath} did not import as an object`,
    )
  }
  const offBoard = assertOffBoardIds(imported["OFF_BOARD_IDS"], declaration)
  const hasPanelParts = network.components.some(
    component => offBoard.has(component.id) || physicalOnly(component),
  )
  if (!hasPanelParts) return undefined

  return wiringDocument({
    boardName: boardName(declaration),
    circuitPath: repoRelativePath(moduleRepoRoot(), declaration.circuitPath),
    network,
    designators: assertDesignators(imported["DESIGNATORS"], declaration),
    offBoard,
    padOrder: assertPadOrder(imported["PAD_ORDER"], declaration),
    sharedBy: assertSharedBy(imported["SHARED_BY"], declaration),
  })
}

export async function syncWiringDoc(
  declaration: PerfboardDeclaration,
): Promise<WiringSyncResult> {
  const file = wiringPath(declaration)
  const fresh = await wiringDocumentFor(declaration)

  if (fresh === undefined) {
    return {
      status: "not-applicable",
      file,
      message: `${boardName(declaration)}: nothing is off this board, so there is nothing to wire.`,
    }
  }

  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined
  if (existing === fresh) {
    return { status: "unchanged", file, message: `${file} is current.` }
  }

  fs.writeFileSync(file, fresh)
  return {
    status: "written",
    file,
    message: existing === undefined
      ? `Wrote ${file}.`
      : `${file} DID NOT MATCH the circuit and has been rewritten. Read the diff: the panel ` +
        "wiring has changed, and anything already wired to this board may now be wrong.",
  }
}
