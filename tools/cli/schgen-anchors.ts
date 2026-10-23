/**
 * Write the anchor sweep - the SECOND column of the template-applicability measurement - to
 * `docs/schematic/template-parity-anchors.md`.
 *
 *   bun run schgen-anchors            writes the file
 *   bun run schgen-anchors --print    prints it and writes nothing
 *
 * **WHAT IT MEASURES, because the two documents must be read together.** `bun run schgen-parity`
 * measures the templates **as these circuits are declared** - every block `{kind:"auto"}` with no
 * anchor, so the four anchor-driven templates are never offered one and half its verdicts say only
 * *"needs an anchor"*. This verb supplies an anchor mechanically over each block's own members and
 * reports what the template then says. Both are **template applicability, a measurement with no
 * target**; neither is port parity, ELK coverage or integrated correctness.
 *
 * **It writes no declaration and emits no schematic.** See `tools/schgen/anchor-sweep.ts`.
 */
import fs from "node:fs"
import path from "node:path"
import { ANCHOR_DOC, anchorSweepOf, renderAnchorSweep } from "../schgen/anchor-sweep.ts"
import { PARITY_CASES, parityResolver } from "../schgen/authoring-census.ts"
import { isMain } from "./entrypoint.ts"

export interface SchgenAnchorsDeps {
  readonly write: (filePath: string, text: string) => void
}

const USAGE = "usage: bun run schgen-anchors [--print]"

export function runSchgenAnchors(
  args: readonly string[],
  deps: SchgenAnchorsDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): number {
  const unknown = args.filter((a) => a !== "--print")
  if (unknown.length > 0) {
    error(`unknown argument${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}\n${USAGE}`)
    return 1
  }
  const text = renderAnchorSweep(anchorSweepOf(PARITY_CASES, parityResolver()))
  if (args.includes("--print")) {
    log(text)
    return 0
  }
  const out = path.join(path.resolve(import.meta.dir, "..", ".."), ANCHOR_DOC)
  deps.write(out, text)
  log(`wrote ${ANCHOR_DOC}`)
  return 0
}

if (isMain(import.meta.url)) {
  const code = runSchgenAnchors(
    process.argv.slice(2),
    { write: (filePath, text) => fs.writeFileSync(filePath, text) },
    (line) => console.log(line),
    (line) => console.error(line),
  )
  process.exit(code)
}
