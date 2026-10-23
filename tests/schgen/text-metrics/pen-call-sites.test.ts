/**
 * **`kicadTextBoxExtentAtPen` MAY BE CALLED WITH A PEN OTHER THAN `boxPenWidth` IN EXACTLY ONE
 * PLACE, AND THIS IS WHAT SAYS SO.**
 *
 * `tools/schgen/text-metrics/metrics.ts` says of that function: *"It exists for ONE counterfactual
 * and is not an invitation to pick a pen … nothing else calls it with anything but
 * `boxPenWidth`."* That was true when it was written and **nothing enforced it** - a claim in prose
 * that nothing tests, which is the same shape as the dead cross-check that fix round 1's I-1
 * closed.
 *
 * **WHY THE INVARIANT MATTERS RATHER THAN BEING TIDINESS.** `GetTextBox` sizes its box with
 * `GetPenSizeForNormal(size)` while eeschema PLOTS with 152.4 um (`docs/known-gaps.md` **G265**
 * clause 2). A second call site passing the plotted pen would silently produce a *different Q3*
 * from the one every figure in `docs/schematic/text-handling-research.md` is computed with, and
 * nothing downstream would say which pen a number came from.
 *
 * The scan is over source text, which `docs/known-gaps.md` **G256** warns can become a check of a
 * literal against itself. It does not here: the expectation is a COUNT and a SET of pen arguments
 * derived from the files, and the red drive below adds a synthetic call site to prove the count
 * moves.
 */

import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../../../tools/perfboard/repo-root.ts"

const repoRoot = moduleRepoRoot()
const ROOTS = ["lib", "tools", "tests"] as const
const FUNCTION = "kicadTextBoxExtentAtPen"
const FIXED_PEN = "boxPenWidth"

export interface CallSite {
  readonly file: string
  readonly line: number
  /** The pen argument as written, third of four. */
  readonly pen: string
}

/** Every call of `FUNCTION` in `sources`, with the pen it passes. Definitions are not calls. */
export function penCallSites(sources: ReadonlyMap<string, string>): readonly CallSite[] {
  const out: CallSite[] = []
  for (const [file, text] of sources) {
    text.split("\n").forEach((line, i) => {
      const m = new RegExp(`(?<!function )${FUNCTION}\\(([^)]*)\\)`).exec(line)
      if (m === null) return
      const args = (m[1] ?? "").split(",").map((a) => a.trim())
      if (args.length < 3) throw new Error(`${file}:${i + 1} calls ${FUNCTION} with ${args.length} argument(s); the pen is the third`)
      out.push({ file, line: i + 1, pen: args[2] ?? "" })
    })
  }
  return out
}

function treeSources(): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name !== "node_modules") walk(p)
      } else if (e.name.endsWith(".ts")) {
        out.set(path.relative(repoRoot, p), fs.readFileSync(p, "utf8"))
      }
    }
  }
  for (const r of ROOTS) walk(path.join(repoRoot, r))
  return out
}

describe("the box-pen counterfactual has exactly one call site", () => {
  const sites = penCallSites(treeSources())

  test("every call passes either boxPenWidth or the ONE measured plotted pen", () => {
    expect(sites.length).toBeGreaterThan(0)
    const loose = sites.filter((s) => !s.pen.startsWith(FIXED_PEN))
    expect(loose.map((s) => `${s.file}:${s.line} ${s.pen}`)).toEqual(["tools/schgen/text-metrics/probe.ts:377 m.drawnPen"])
  })

  test("and the fixed-pen calls are the two the design intends", () => {
    const fixed = sites.filter((s) => s.pen.startsWith(FIXED_PEN)).map((s) => s.file).sort()
    expect(fixed).toEqual(["tools/schgen/text-metrics/metrics.ts", "tools/schgen/text-metrics/probe.ts"])
  })

  /**
   * **RED against a synthetic source, so the check is shown to move.** A second call passing some
   * other pen is exactly the drift the prose claimed could not happen, and nothing on disk is
   * written.
   */
  test("RED: a second call site with another pen is caught", () => {
    const synthetic = new Map(treeSources())
    synthetic.set("tools/schgen/text-metrics/invented.ts", `const x = ${FUNCTION}(glyphs, "R100", 999, TEXT_SIZE)\n`)
    const loose = penCallSites(synthetic).filter((s) => !s.pen.startsWith(FIXED_PEN))
    expect(loose.length).toBe(2)
    expect(loose.map((s) => s.pen).sort()).toEqual(["999", "m.drawnPen"])
  })

  test("RED: the scan finds nothing when the function is renamed, so a green is not vacuous", () => {
    const renamed = new Map([["x.ts", "const x = somethingElse(glyphs, \"R100\", 999, TEXT_SIZE)\n"]])
    expect(penCallSites(renamed)).toEqual([])
  })
})
