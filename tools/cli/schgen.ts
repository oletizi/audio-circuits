/**
 * Generate a design's KiCad schematic project, or check the one on disk against the model.
 *
 *   bun run schgen check <design-module>
 *   bun run schgen generate <design-module> [--init] [--accept-toolchain]
 *
 * **`check` NEVER WRITES.** That is the property this file exists to preserve, and it is
 * structural rather than careful: the only writer is `writeGeneration`, it reaches this module as
 * an injected dependency (`SchgenDeps.write`), and `runSchgen` calls it on exactly one code path.
 * `generate` itself only reads - `tools/schgen/generate.ts`'s own header says so - so a refusal
 * anywhere in build, validation, the locks or the layout leaves every file on disk untouched.
 *
 * `check` reports staleness by CONTENT, never by mtime: git does not preserve mtimes, so a
 * timestamp comparison would call a stale file current on every fresh clone. `staleFiles` is what
 * makes that true and `tests/schgen/emit-byte-stable.test.ts` is what holds it to it.
 *
 * The shape - injected deps, an `isMain` guard, a `USAGE` string, a `runSchgen` that returns an
 * exit code instead of calling `process.exit` - follows `tools/cli/schematic-stub.ts`, for the
 * reason `tools/cli/entrypoint.ts` gives: a CLI that exits inside its own body cannot be asserted
 * on.
 */
import fs from "node:fs"
import path from "node:path"
import { loadDesign } from "../../lib/schgen/design.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { generate, staleFiles, writeGeneration, type GenerateEnv } from "../schgen/generate.ts"
import { kicadVersion } from "../schgen/kicad-run.ts"
import { isMain } from "./entrypoint.ts"

export interface SchgenDeps {
  readonly exists: (filePath: string) => boolean
  /**
   * The ONLY writer. It is injected rather than imported at the call site so that
   * "`check` writes nothing" is a claim a test can make by handing in a writer that refuses -
   * `fs.readdirSync` before and after proves only that this run wrote nothing where the test
   * looked.
   */
  readonly write: typeof writeGeneration
  readonly kicadVersion: () => string
  readonly stockDir: () => string
}

const VERBS = ["check", "generate"] as const

const USAGE =
  "usage: bun run schgen <verb> <design-module> [options]\n" +
  `  verbs: ${VERBS.join(", ")}\n` +
  "  check <design>     build, validate and report which generated files are stale; writes nothing\n" +
  "  generate <design>  the same, then write every generated file into the design's outDir\n" +
  "    --init               create refs.lock.json and schgen.lock.json when they are absent\n" +
  "    --accept-toolchain   record the current KiCad and stock-library versions as the baseline\n" +
  "  a relative design path resolves from the current directory"

const FLAGS = new Set(["--init", "--accept-toolchain"])

interface Parsed {
  readonly verb: (typeof VERBS)[number]
  readonly design: string
  readonly env: Pick<GenerateEnv, "initLock" | "acceptToolchain">
}

/** The parsed command line, or the message saying what is wrong with it. */
function parse(args: readonly string[]): Parsed | string {
  const [verb, design, ...rest] = args
  if (verb === undefined) return USAGE
  if (!VERBS.some((v) => v === verb)) {
    return `unknown verb "${verb}". The verbs are ${VERBS.join(" and ")}.\n\n${USAGE}`
  }
  if (design === undefined) return `${verb} needs a design module.\n\n${USAGE}`
  const unknown = rest.filter((a) => !FLAGS.has(a))
  if (unknown.length > 0) {
    return `unknown option(s) ${unknown.join(", ")}. The options are ${[...FLAGS].join(" and ")}.\n\n${USAGE}`
  }
  if (verb === "check" && rest.length > 0) {
    return `check takes no options: it only reads, so ${rest.join(" and ")} would have nothing to do.\n\n${USAGE}`
  }
  // `verb` is narrowed by the `some` guard above, which TypeScript does not carry across, so it is
  // re-found in VERBS rather than asserted with `as`.
  const found = VERBS.find((v) => v === verb)
  if (found === undefined) throw new Error(`unreachable: "${verb}" passed the verb guard and is not in VERBS`)
  return {
    verb: found,
    design,
    env: { initLock: rest.includes("--init"), acceptToolchain: rest.includes("--accept-toolchain") },
  }
}

export async function runSchgen(
  args: readonly string[],
  deps: SchgenDeps,
  log: (line: string) => void,
  error: (line: string) => void,
): Promise<number> {
  const parsed = parse(args)
  if (typeof parsed === "string") {
    error(parsed)
    return 1
  }
  const designPath = path.resolve(parsed.design)
  if (!deps.exists(designPath)) {
    error(`${designPath} does not exist. Pass the design module that exports \`design\` (a DesignSpec).`)
    return 1
  }
  try {
    const d = await loadDesign(designPath)
    const env: GenerateEnv = {
      kicadVersion: deps.kicadVersion(),
      stockDir: deps.stockDir(),
      initLock: parsed.env.initLock,
      acceptToolchain: parsed.env.acceptToolchain,
      // Task 12: the ELK pre-pass's input. A `DesignSpec` carries no authoring declaration (the
      // reason is on `GenerateEnv.authoring` and in docs/known-gaps.md G186), so a design whose
      // blocks reach ELK refuses here naming the block - it is not laid out without one.
      authoring: null,
    }
    const g = await generate(d, env)
    if (parsed.verb === "check") {
      const stale = staleFiles(d, g)
      log(`${d.spec.project}: ${g.files.size} generated file(s), ${g.drawings.length} sheet(s), compared by content against ${d.outDir}`)
      if (stale.length === 0) {
        log("every generated file on disk is what the model produces.")
        return 0
      }
      for (const line of stale) error(line)
      return 1
    }
    const written = deps.write(d, g)
    for (const file of written) log(`wrote ${file}`)
    log(`${d.spec.project}: ${written.length} file(s) in ${d.outDir}.`)
    return 0
  } catch (caught) {
    error(caught instanceof Error ? caught.message : String(caught))
    return 1
  }
}

if (isMain(import.meta.url)) {
  const deps: SchgenDeps = {
    exists: (filePath) => fs.existsSync(filePath),
    write: writeGeneration,
    kicadVersion,
    stockDir: stockSymbolDir,
  }
  process.exit(await runSchgen(process.argv.slice(2), deps, console.log, console.error))
}
