/**
 * Write a circuit's KiCad schematic stub, once.
 *
 *   bun run schematic-stub <circuit-module> <export> <out.kicad_sch>
 *
 * The module must export the named circuit function, DESIGNATORS, PIN_NUMBERS
 * and schematicNotes(). The stub is a starting point: it refuses to overwrite
 * an existing schematic, because once written the schematic belongs to the
 * operator, and the board's netlist-sync keeps it electrically honest.
 */
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { writeSchematicStub } from "../../lib/kicad/schematic.ts"
import { assertDesignators, assertPinNumbers } from "../perfboard/check.ts"
import { isRecord } from "../perfboard/guards.ts"
import { isNetwork } from "../perfboard/load.ts"
import { isMain } from "./entrypoint.ts"

export interface SchematicStubDeps {
  readonly exists: (filePath: string) => boolean
  readonly write: (filePath: string, text: string) => void
  readonly newUuid: () => string
}

const USAGE =
  "usage: bun run schematic-stub <circuit-module> <export> <out.kicad_sch>\n" +
  "  a relative path resolves from the repository root, since that is bun run's cwd"

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

export async function runSchematicStub(
  args: readonly string[],
  deps: SchematicStubDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const [moduleArg, exportName, outArg] = args
  if (args.length !== 3 || moduleArg === undefined || exportName === undefined || outArg === undefined) {
    error(USAGE)
    return 1
  }
  const modulePath = path.resolve(moduleArg)
  const outPath = path.resolve(outArg)
  if (deps.exists(outPath)) {
    error(
      `${outPath} already exists. The stub is written once; after that the schematic is yours, ` +
        "and netlist-sync keeps it electrically honest. Delete it first only if you mean to " +
        "throw your arrangement away.",
    )
    return 1
  }
  try {
    const imported: unknown = await import(modulePath)
    if (!isRecord(imported)) throw new Error(`${modulePath} did not import as an object`)
    const build = imported[exportName]
    if (typeof build !== "function") {
      throw new Error(`${modulePath} has no function export named "${exportName}"`)
    }
    const network: unknown = build()
    if (!isNetwork(network)) throw new Error(`"${exportName}" in ${modulePath} did not return a Network`)
    // assertDesignators/assertPinNumbers' messages read "<file>: <circuitPath> ...",
    // so passing modulePath for both would print it twice ("/abs/x.ts: /abs/x.ts
    // does not export..."). There is no perfboard.json here, only the module
    // itself, so `file` names this verb instead - the message then reads once.
    const where = { file: "schematic-stub", circuitPath: modulePath }
    const designators = assertDesignators(imported["DESIGNATORS"], where)
    const pinNumbers = assertPinNumbers(imported["PIN_NUMBERS"], where)
    const notesOf = imported["schematicNotes"]
    if (typeof notesOf !== "function") {
      throw new Error(`${modulePath} does not export schematicNotes(); the stub's settings text comes from it`)
    }
    const notes: unknown = notesOf()
    if (!isStringArray(notes)) throw new Error(`schematicNotes() in ${modulePath} did not return strings`)
    deps.write(outPath, writeSchematicStub({
      network, designators, pinNumbers, notes,
      projectName: path.basename(outPath, ".kicad_sch"),
      newUuid: deps.newUuid,
    }))
    log(`wrote ${outPath}. Arrange it in KiCad; from here on it is yours.`)
    return 0
  } catch (caught) {
    error(caught instanceof Error ? caught.message : String(caught))
    return 1
  }
}

if (isMain(import.meta.url)) {
  const deps: SchematicStubDeps = {
    exists: (filePath) => fs.existsSync(filePath),
    write: (filePath, text) => fs.writeFileSync(filePath, text),
    newUuid: () => randomUUID(),
  }
  process.exit(await runSchematicStub(process.argv.slice(2), deps, console.log, console.error))
}
