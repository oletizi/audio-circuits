/**
 * Write the template-applicability census to `docs/schematic/template-parity.md`.
 *
 *   bun run schgen-parity            writes the file
 *   bun run schgen-parity --print    prints it and writes nothing
 *
 * **WHAT THE NUMBERS ARE, because the file is the thing people will quote out of context:** they
 * are M1's **template-applicability** measurement - one of the four spec §5.1 revision 4
 * separates, and **the one with no target**. They are not the port-parity regression (Task 7,
 * against the source project's fixtures), not ELK coverage (Tasks 12-14), and not integrated
 * correctness (Tasks 11 and 18, the only verdict of the four). `tools/schgen/parity.ts` carries
 * the table and the document repeats it at the top.
 *
 * The verb exists so the document is regenerated rather than hand-maintained;
 * `tests/schgen/parity.test.ts` compares the committed copy against a fresh run by content.
 */
import fs from "node:fs"
import path from "node:path"
import { PARITY_CASES, parityResolver } from "../schgen/authoring-census.ts"
import { CENSUS_DOC, censusOf, renderCensus } from "../schgen/parity.ts"
import { isMain } from "./entrypoint.ts"

export interface SchgenParityDeps {
  readonly write: (filePath: string, text: string) => void
}

const USAGE = "usage: bun run schgen-parity [--print]"

export function runSchgenParity(
  args: readonly string[],
  deps: SchgenParityDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  const unknown = args.filter((a) => a !== "--print")
  if (unknown.length > 0) {
    error(`unknown argument${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}\n${USAGE}`)
    return 1
  }
  const text = renderCensus(censusOf(PARITY_CASES, parityResolver()))
  if (args.includes("--print")) {
    log(text)
    return 0
  }
  const out = path.join(path.resolve(import.meta.dir, "..", ".."), CENSUS_DOC)
  deps.write(out, text)
  log(`wrote ${CENSUS_DOC}`)
  return 0
}

if (isMain(import.meta.url)) {
  const code = runSchgenParity(
    process.argv.slice(2),
    { write: (filePath, text) => fs.writeFileSync(filePath, text) },
    (line) => console.log(line),
    (line) => console.error(line),
  )
  process.exit(code)
}
