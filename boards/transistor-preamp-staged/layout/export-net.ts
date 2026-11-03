/**
 * Print this board's netlist export - the OrCAD-style text the VeroRoute fork
 * reads - on stdout.
 *
 * It is the repository's own lowering, not a second one: loadDeclaration()
 * reads this board's perfboard.json and exportNetlistFor() is the function
 * `make check`, `make import` and `make update` all call. The replay imports
 * the board from exactly what `make check` will later compare it against.
 *
 * The export's header carries the time it ran (`created <timestamp>`); the
 * fork's reader ignores it, so it does not reach the .vrt.
 */
import path from "node:path"
import { exportNetlistFor } from "../../../tools/perfboard/check.ts"
import { loadDeclaration } from "../../../tools/perfboard/declaration.ts"

const declarationFile = path.resolve(import.meta.dir, "..", "perfboard.json")
const text = await exportNetlistFor(loadDeclaration(declarationFile))
process.stdout.write(text)
