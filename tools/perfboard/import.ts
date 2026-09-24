/**
 * `import`: create a board's FIRST layout from its circuit.
 *
 * `update` reconciles an existing .vrt; a new board has none. The fork's
 * `--import <net> -o <out>` builds a fresh board with every part unplaced. The
 * netlist comes through `exportNetlistFor`, the same single lowering path every
 * other verb uses, and the result lands through `replaceAtomically` from a
 * same-directory temp file, as every other write does.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { exportNetlistFor } from "./check.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { replaceAtomically } from "./mutate.ts"
import { cleanupProduced, runnerFor, tempPathAlongside } from "./verbs.ts"
import type { VerbDeps, VerbRun } from "./verbs.ts"

export async function runImport(declaration: PerfboardDeclaration, deps: VerbDeps = {}): Promise<string> {
  if (fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath} already exists. "import" creates a board's first layout; to bring ` +
        'an existing layout up to date with its circuit, use "update".',
    )
  }
  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const runVeroroute = runnerFor(deps)
  const producedPath = tempPathAlongside(declaration.vrtPath, "import")
  const text = await exportNetlist(declaration)

  const netDir = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-import-"))
  let run: VerbRun
  try {
    const netPath = path.join(netDir, `${path.basename(declaration.vrtPath, ".vrt")}.net`)
    fs.writeFileSync(netPath, text)
    try {
      run = runVeroroute(["--import", netPath, "-o", producedPath])
    } catch (error) {
      cleanupProduced(producedPath)
      throw error
    }
  } finally {
    fs.rmSync(netDir, { recursive: true, force: true })
  }

  if (run.status !== 0) {
    cleanupProduced(producedPath)
    throw new Error(
      `veroroute --import for ${declaration.vrtPath} exited ${run.status}; no layout was written.\n` +
        run.output,
    )
  }
  replaceAtomically(declaration.vrtPath, producedPath)
  return (
    `${declaration.vrtPath} created from the circuit with every part unplaced. Commit it, then ` +
    'arrange it with "edit".'
  )
}
