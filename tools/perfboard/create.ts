/**
 * Bring a declared board into existence from its circuit.
 *
 * THIS VERB REFUSES RATHER THAN OVERWRITING, and that is the whole difference
 * between it and `update`. A `.vrt` holds placement and routing that a person
 * did by hand; `--import` builds a fresh board with neither. Overwriting one
 * would discard that work with no way back short of git, and would do it
 * silently, because the new file is perfectly valid. `update` is how an
 * existing layout changes.
 */
import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { exportNetlistFor, verorouteBinary } from "./check.ts"
import type { CheckRun } from "./check.ts"
import type { PerfboardDeclaration } from "./declaration.ts"
import { replaceAtomically } from "./mutate.ts"
import { moduleRepoRoot } from "./repo-root.ts"

export interface CreateDeps {
  readonly exportNetlist?: (declaration: PerfboardDeclaration) => Promise<string>
  readonly runImport?: (netPath: string, outPath: string) => CheckRun
  readonly repoRoot?: string
}

function runVerorouteImport(netPath: string, outPath: string, repoRoot: string): CheckRun {
  const binary = verorouteBinary(process.env, repoRoot)
  const result = spawnSync(binary, ["--import", netPath, "-o", outPath], { encoding: "utf8" })
  if (result.error) {
    throw new Error(`could not run veroroute at ${binary}: ${result.error.message}`)
  }
  if (result.status === null) {
    throw new Error(`veroroute at ${binary} was killed by a signal; no board was created.`)
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : ""
  const stderr = typeof result.stderr === "string" ? result.stderr : ""
  return { status: result.status, output: `${stdout}${stderr}` }
}

export async function createBoard(
  declaration: PerfboardDeclaration,
  deps: CreateDeps = {},
): Promise<string> {
  if (fs.existsSync(declaration.vrtPath)) {
    throw new Error(
      `${declaration.vrtPath} already exists.\n` +
        "create builds a board with no placement and no routing, so running it over a layout " +
        "somebody authored would discard that work silently. Use `update` to apply the circuit " +
        "to an existing layout, or delete this file first if it really is disposable.",
    )
  }

  const exportNetlist = deps.exportNetlist ?? exportNetlistFor
  const text = await exportNetlist(declaration)

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "perfboard-create-"))
  try {
    const netPath = path.join(scratch, "circuit.net")
    fs.writeFileSync(netPath, text)

    // UNIQUELY NAMED, because `replaceAtomically` decides the binary succeeded by
    // testing that the produced file exists. A fixed name such as
    // "<layout>.creating" survives an interrupted run, and the next run would then
    // find that stale file, take it for this run's output, and install a layout
    // built from a netlist nobody exported - reporting success. The name is
    // produced beside the declared layout so the rename that puts it in place
    // stays within one directory, and therefore atomic.
    const producedPath = `${declaration.vrtPath}.creating-${randomUUID()}`
    if (fs.existsSync(producedPath)) {
      throw new Error(`${producedPath} already exists, which should be impossible for a fresh name.`)
    }

    const runImport = deps.runImport
      ?? ((net: string, out: string) => runVerorouteImport(net, out, deps.repoRoot ?? moduleRepoRoot()))
    const run = runImport(netPath, producedPath)

    if (run.status !== 0) {
      if (fs.existsSync(producedPath)) fs.rmSync(producedPath)
      throw new Error(
        `veroroute --import exited ${run.status}; no board was created at ${declaration.vrtPath}.\n` +
          run.output,
      )
    }

    replaceAtomically(declaration.vrtPath, producedPath)
    return run.output
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
}
