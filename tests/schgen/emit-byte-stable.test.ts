/**
 * The two properties the Task 6b brief says this task must not lose, as checks that can fail:
 * **`generate` is byte-stable** and **`generate` writes nothing**.
 *
 * `generate` only reads; `writeGeneration` is the only writer, *"so any refusal leaves every file
 * untouched"* - and the files it produces are compared by CONTENT on every run
 * (`CLAUDE.md`: *"Derived artifacts are regenerated every run and compared by content, never by
 * timestamp"*). Both would pass silently if broken in the usual way - a uuid, a timestamp or a
 * `Date.now()` in a title block makes two runs differ, and a stray `writeFileSync` in an emitter
 * makes `generate` a writer - so each is asserted here over the whole generated file set rather
 * than over one file.
 *
 * The design is the PORTED pedals fixture (`__fixtures__/designs/mini/index.ts`): ten blocks over
 * two sheets on stock KiCad symbols. Nothing in this repository arranged it, which is the point -
 * see that file's `diverged` entry in `tools/schgen/port-manifest.json`.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { cleanUpTempScratch } from "../support/temp-scratch.ts"
import { miniInScratch } from "./__fixtures__/designs/mini/run.ts"
import type { LoadedDesign } from "../../lib/schgen/design.ts"
import { stockSymbolDir } from "../../lib/schgen/render/library.ts"
import { generate, staleFiles, writeGeneration, type GenerateEnv, type Generation } from "../../tools/schgen/generate.ts"
import { kicadVersion, runErc } from "../../tools/schgen/kicad-run.ts"

afterAll(cleanUpTempScratch)

/** `--init`: the scratch outDir has no reference or version lock, so the first run records one. */
const env = (): GenerateEnv => ({
  kicadVersion: kicadVersion(),
  stockDir: stockSymbolDir(),
  initLock: true,
  acceptToolchain: false,
})

describe("generate over the ported mini design", () => {
  let d: LoadedDesign
  let a: Generation
  beforeAll(() => {
    d = miniInScratch()
    a = generate(d, env())
  })

  it("produces the whole declared file set", () => {
    // Named one by one rather than counted: a count passes when a file is renamed, and the lock
    // files and lib tables are what make the output reproducible on another machine.
    expect([...a.files.keys()].sort()).toEqual([
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
    ])
  })

  it("generating twice gives identical bytes", () => {
    const b = generate(d, env())
    expect([...b.files.keys()].sort()).toEqual([...a.files.keys()].sort())
    for (const [name, text] of a.files) expect(b.files.get(name), name).toBe(text)
  })

  it("generate writes nothing", () => {
    const before = fs.readdirSync(d.outDir)
    generate(d, env())
    expect(fs.readdirSync(d.outDir)).toEqual(before)
  })

  it("every sheet it emits is a non-empty s-expression naming its own blocks' parts", () => {
    // Not a byte claim: the one above would hold just as well over two empty files.
    for (const sheet of d.spec.circuit.sheets) {
      const text = a.files.get(sheet.file)
      expect(text, sheet.file).toBeDefined()
      expect(text ?? "", sheet.file).toStartWith("(kicad_sch")
      expect((text ?? "").length, sheet.file).toBeGreaterThan(1000)
    }
  })
})

describe("writeGeneration is the only writer", () => {
  it("writes every generated file, and staleFiles then reports none", () => {
    const d = miniInScratch()
    const g = generate(d, env())
    expect(staleFiles(d, g).length, "a fresh scratch outDir holds none of them yet").toBe(g.files.size)
    const written = writeGeneration(d, g)
    expect(written.map((f) => path.basename(f)).sort()).toEqual([...g.files.keys()].sort())
    expect(staleFiles(d, g), "written and then immediately compared by content").toEqual([])
  })

  it("reports a file stale when its CONTENT differs, not when its mtime does", () => {
    // This is the claim the Step 7 perturbation drives red: `staleFiles` compares content. Here it
    // is asserted the way a reader would want it - the file is rewritten with different bytes and
    // nothing is said about time.
    const d = miniInScratch()
    const g = generate(d, env())
    writeGeneration(d, g)
    expect(staleFiles(d, g)).toEqual([])
    const victim = "REFMAP.md"
    fs.writeFileSync(path.join(d.outDir, victim), "edited by hand\n")
    const stale = staleFiles(d, g)
    expect(stale.length, "exactly the one file whose content changed").toBe(1)
    expect(stale[0] ?? "").toContain(victim)
  })

  /**
   * **KiCad IS A COMPILER HERE, SO THIS RUNS IT AND DOES NOT SKIP** - the precedent is
   * `tests/kicad/symbol-names.test.ts`, which fails rather than skipping when KiCad is absent.
   *
   * It is also the only thing in the suite that reaches `tools/schgen/kicad-config.ts`:
   * `runErc` -> `runKicadCli` -> `hermeticConfig` seeds a fresh `KICAD_CONFIG_HOME` from the
   * install's own template tables and `usedConfig` then **throws** unless KiCad wrote its settings
   * there. Without this the module was loaded (`kicad-run.ts` imports it) and no function in it
   * ran - 0.0% - so a hermetic configuration that silently stopped being hermetic would have
   * failed nothing. `docs/known-gaps.md` **G124**.
   */
  it("runs ERC on a generated sheet through the hermetic KiCad configuration", () => {
    const d = miniInScratch()
    const g = generate(d, env())
    writeGeneration(d, g)
    const erc = runErc(path.join(d.outDir, "mini.kicad_sch"), "error")
    expect(erc.errors, `ERC errors on the generated project:\n${erc.report}`).toBe(0)
    expect(erc.report, "a report with no totals line means parseErcCounts guessed").toContain("ERC messages:")
  })

  it("refuses a generated name that would escape outDir, and writes nothing when it does", () => {
    const d = miniInScratch()
    const g = generate(d, env())
    const escaping = { files: new Map([["../escaped.kicad_sch", "(kicad_sch)"]]) }
    expect(() => writeGeneration(d, escaping)).toThrow(/would be written outside/)
    expect(fs.existsSync(path.resolve(d.outDir, "..", "escaped.kicad_sch"))).toBe(false)
  })
})
