/**
 * `bun run schgen`'s two verbs, and the one property the Task 6b brief says this task must not
 * lose: **`check` writes nothing.**
 *
 * The writer is injected, so that claim is asserted directly - `check` runs against a
 * `SchgenDeps.write` that THROWS, so a write would fail the test by name rather than by a
 * directory listing that happens to look the same. The `generate` verb then proves the injection
 * is live by writing through the real one.
 */
import { afterAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch, freshTempScratch } from "../support/temp-scratch.ts"
import { MINI_DESIGN_FILE } from "../schgen/__fixtures__/designs/mini/run.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { writeGeneration } from "../../tools/schgen/generate.ts"
import { kicadVersion } from "../../tools/schgen/kicad-run.ts"
import { runSchgen, type SchgenDeps } from "../../tools/cli/schgen.ts"

afterAll(cleanUpTempScratch)

interface Run {
  readonly code: number
  readonly out: string[]
  readonly err: string[]
}

/**
 * A `SchgenDeps` whose writer refuses. Every verb that is not `generate` must get through without
 * touching it.
 */
function refusingDeps(): SchgenDeps {
  return {
    exists: (filePath) => fs.existsSync(filePath),
    write: () => {
      throw new Error("the injected writer was called")
    },
    kicadVersion,
    stockDir: stockSymbolDir,
  }
}

async function run(args: readonly string[], deps: SchgenDeps = refusingDeps()): Promise<Run> {
  const out: string[] = []
  const err: string[] = []
  const code = await runSchgen(args, deps, (l) => out.push(l), (l) => err.push(l))
  return { code, out, err }
}

describe("the schgen CLI's argument handling", () => {
  it("refuses an unknown verb, naming the verbs it has", async () => {
    const r = await run(["emit", MINI_DESIGN_FILE])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain('unknown verb "emit"')
    expect(r.err.join("\n")).toContain("check and generate")
    expect(r.out).toEqual([])
  })

  it("prints the usage when given no arguments at all", async () => {
    const r = await run([])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("usage: bun run schgen")
  })

  it("refuses a verb with no design module", async () => {
    const r = await run(["check"])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("check needs a design module")
  })

  it("refuses an unknown option rather than ignoring it", async () => {
    const r = await run(["generate", MINI_DESIGN_FILE, "--force"])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("unknown option(s) --force")
  })

  it("refuses options on check, because check only reads", async () => {
    const r = await run(["check", MINI_DESIGN_FILE, "--init"])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("check takes no options")
  })

  it("refuses a design module that is not on disk", async () => {
    const missing = path.join(freshTempScratch("schgen-cli-"), "no-such-design.ts")
    const r = await run(["check", missing])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("does not exist")
  })
})

const GENERATED = [
  // Task 16: spec 2.1's generation manifest, produced last because it hashes the rest.
  "MANIFEST.json",
  "REFMAP.md",
  "RENDER-REPORT.md",
  "fp-lib-table",
  "mini.kicad_pro",
  "mini.kicad_sch",
  "power.kicad_sch",
  "refs.lock.json",
  "schgen.lock.json",
  "signal.kicad_sch",
  "sym-lib-table",
]

/**
 * A design module that re-exports the ported mini design with its `outDir` pointed at a scratch
 * directory, so the CLI can be driven end to end on its own terms: it takes a FILE and resolves
 * `outDir` from that file's own spec, so redirecting the output any other way would be testing
 * something the CLI does not do. Nothing about the design changes but where it writes.
 *
 * **IT HAS TO LIVE INSIDE THIS REPOSITORY, not under TMPDIR**, and finding that out is worth a
 * sentence: `generatedFiles` puts the design's path relative to its own repository root in the
 * title block, through `repoRoot(d.dir)`, which walks up for a `.git` entry and **throws** rather
 * than guessing. A design module in a temp directory therefore fails with
 * `no .git directory found in any ancestor of ...`. So the module goes under `build/`, which is
 * gitignored, and is removed in `afterAll`; the generated FILES still go to scratch.
 */
const MODULE_DIRS: string[] = []

function redirectedDesign(): { readonly file: string; readonly outDir: string } {
  const dir = fs.mkdtempSync(path.join(path.resolve(import.meta.dir, "../../build"), "schgen-cli-"))
  MODULE_DIRS.push(dir)
  const outDir = freshTempScratch("schgen-cli-out-")
  const file = path.join(dir, "design.ts")
  fs.writeFileSync(
    file,
    `import { design as mini } from ${JSON.stringify(MINI_DESIGN_FILE)}\n` +
      `export const design = { ...mini, outDir: ${JSON.stringify(outDir)} }\n`,
  )
  return { file, outDir }
}

afterAll(() => {
  for (const d of MODULE_DIRS.splice(0)) fs.rmSync(d, { recursive: true, force: true })
})

describe("check against the ported mini design", () => {
  it("refuses a design whose outDir holds no reference lock, naming the file and --init", async () => {
    // The design's own outDir is "out" beside the fixture and does not exist here, so the FIRST
    // thing generate needs - the reference lock - is missing. check has to say so without creating
    // the directory: a check verb that initialises a lock would be a writer.
    const r = await run(["check", MINI_DESIGN_FILE])
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("refs.lock.json not found")
    expect(r.err.join("\n")).toContain("--init")
    const outDir = path.resolve(path.dirname(MINI_DESIGN_FILE), "out")
    expect(fs.existsSync(outDir), `check created ${outDir}`).toBe(false)
  })

  it("reports exactly the generated file that is missing, and does not put it back", async () => {
    // The staleness path needs a generated outDir to compare against - both locks have to be there
    // or `generate` refuses before it reaches `staleFiles`, and the version lock cannot be written
    // by hand because it pins this machine's KiCad and stock-library digest. So: generate, remove
    // one sheet, and check. A `check` that re-created it would be a writer.
    const { file, outDir } = redirectedDesign()
    const gen = await run(["generate", file, "--init"], { ...refusingDeps(), write: writeGeneration })
    expect(gen.code).toBe(0)
    fs.rmSync(path.join(outDir, "signal.kicad_sch"))

    const r = await run(["check", file])
    expect(r.code, "a stale file means a non-zero exit").toBe(1)
    expect(r.out.join("\n")).toContain("generated file(s), 2 sheet(s), compared by content")
    const stale = r.err.filter((l) => l.includes("is stale"))
    expect(stale.length, "one file removed, one file stale").toBe(1)
    expect(stale[0] ?? "").toStartWith("signal.kicad_sch is stale")
    expect(fs.existsSync(path.join(outDir, "signal.kicad_sch")), "check put the file back").toBe(false)
    expect(fs.readdirSync(outDir).sort()).toEqual(GENERATED.filter((f) => f !== "signal.kicad_sch"))
  })

  it("reports a hand-edited generated file stale by CONTENT, with its mtime newer than the rest", async () => {
    // The mtime is deliberately made the NEWEST in the directory: a staleness check that compared
    // timestamps would read this file as the current one. `CLAUDE.md`: compared by content, never
    // by timestamp. The Step 7 perturbation drives the same claim from the other side.
    const { file, outDir } = redirectedDesign()
    expect((await run(["generate", file, "--init"], { ...refusingDeps(), write: writeGeneration })).code).toBe(0)
    const victim = path.join(outDir, "power.kicad_sch")
    fs.writeFileSync(victim, "(kicad_sch (version 20250114))\n")
    const future = new Date(Date.now() + 60_000)
    fs.utimesSync(victim, future, future)

    const r = await run(["check", file])
    expect(r.code).toBe(1)
    const stale = r.err.filter((l) => l.includes("is stale"))
    expect(stale.length).toBe(1)
    expect(stale[0] ?? "").toStartWith("power.kicad_sch is stale")
  })
})

describe("generate against the ported mini design", () => {
  it("writes the whole file set, after which check is clean and still writes nothing", async () => {
    const { file, outDir } = redirectedDesign()
    const real: SchgenDeps = { ...refusingDeps(), write: writeGeneration }
    const gen = await run(["generate", file, "--init"], real)
    expect(gen.err).toEqual([])
    expect(gen.code).toBe(0)
    expect(fs.readdirSync(outDir).sort()).toEqual(GENERATED)

    const check = await run(["check", file])
    expect(check.err).toEqual([])
    expect(check.code).toBe(0)
    expect(check.out.join("\n")).toContain("every generated file on disk is what the model produces")
    expect(fs.readdirSync(outDir).sort(), "check changed outDir").toEqual(GENERATED)
  })

  it("refuses without --init when there is no reference lock, and writes nothing", async () => {
    const { file, outDir } = redirectedDesign()
    const r = await run(["generate", file], { ...refusingDeps(), write: writeGeneration })
    expect(r.code).toBe(1)
    expect(r.err.join("\n")).toContain("refs.lock.json")
    expect(r.err.join("\n")).toContain("--init")
    expect(fs.readdirSync(outDir)).toEqual([])
  })
})
