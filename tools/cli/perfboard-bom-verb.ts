/**
 * Dispatch for the CLI's `bom` verb: compare this board's derived needs with its
 * bom.json and the shared catalog, print the report, rewrite BOM.md, and exit
 * non-zero unless the list is complete (tools/bom/run.ts).
 *
 * Split out of tools/cli/perfboard.ts to keep that file under the repository's
 * size ceiling. Like every other single-board verb, the directory you are
 * standing in (or -C) is the board. It needs no VeroRoute binary: it reads
 * only the circuit, the catalog and bom.json.
 */
import { boardHere, errorMessage, reportLines } from "./perfboard-support.ts"
import { runBom, type BomDeps } from "../bom/run.ts"

export async function dispatchBom(
  cwd: string,
  args: readonly string[],
  bomDeps: BomDeps | undefined,
  repoRoot: string | undefined,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const unknown = args[0]
  if (unknown !== undefined) {
    error(`unknown flag "${unknown}" for "bom". It takes no flags; run it from the board's directory.`)
    return 1
  }
  const declaration = boardHere(cwd, "bom", error)
  if (declaration === null) return 1
  try {
    const result = await runBom(declaration, { ...bomDeps, repoRoot: bomDeps?.repoRoot ?? repoRoot })
    for (const line of result.output.split("\n")) log(line)
    return result.exitCode
  } catch (caught) {
    error(`FAIL ${declaration.file}`)
    for (const line of reportLines(errorMessage(caught))) error(line)
    return 1
  }
}
