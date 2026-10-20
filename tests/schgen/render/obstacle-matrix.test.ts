/**
 * The up-front obstacle-category matrix, held to account.
 *
 * `docs/known-gaps.md` **G85** records that the pedals generator's ~160
 * clearance refusals accreted one pair at a time over eleven steps, and that
 * every new check found the previous checks' blind spot in the same shape:
 * category A had been modelled as an obstacle for category B but not for
 * category C. Its CRITERION is that the clearance system here is specified as
 * a matrix of obstacle-category pairs enumerated up front, so a new refusal is
 * a cell being filled rather than a category being discovered.
 *
 * These three tests are that criterion as checks that can fail. The assertions
 * are the Task 5 brief's, verbatim; `lib/schgen/render/obstacle-matrix.ts` and
 * its five `obstacle-pairs-*.ts` data modules are what they measure.
 */
import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { OBSTACLE_CATEGORIES, PAIR_COVERAGE, uncoveredPairs } from "../../../lib/schgen/render/obstacle-matrix.ts"

const RENDER_DIR = path.resolve(import.meta.dir, "../../../lib/schgen/render")

describe("the obstacle-category matrix", () => {
  test("every ordered-independent pair of obstacle categories is accounted for", () => {
    expect(uncoveredPairs()).toEqual([])
  })

  test("a pair with no check carries a reason, and a reason is never blank", () => {
    // THE NON-EMPTY GUARD IS NOT DECORATION. The brief's loop passes without
    // asserting anything at all if every cell carries a check, which is the
    // shape `CLAUDE.md` forbids: "no test that iterates zero items; no guard
    // that cannot fail". 47 of the 105 cells have no check, so the loop below
    // runs 47 times; if a later task fills them all in, this line fails and
    // whoever did it deletes the whole test deliberately.
    const noCheck = PAIR_COVERAGE.filter((p) => p.checkedBy === null)
    expect(noCheck.length, "a reason loop that iterates nothing is a passing test that checked nothing").toBeGreaterThan(0)
    for (const p of PAIR_COVERAGE) {
      if (p.checkedBy === null) expect(p.meaninglessBecause?.trim(), `${p.a}/${p.b}`).toBeTruthy()
    }
  })

  test("the matrix covers each pair exactly once", () => {
    const keys = PAIR_COVERAGE.map((p) => [p.a, p.b].sort().join("|"))
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.length).toBe((OBSTACLE_CATEGORIES.length * (OBSTACLE_CATEGORIES.length + 1)) / 2)
  })

  /**
   * **ANTI-FABRICATION, AND IT IS THE POINT OF THE WHOLE MODULE.** A matrix
   * whose `checkedBy` names a plausible function that does not exist is worse
   * than an empty matrix: it reads as coverage. `CLAUDE.md` - "Verify names
   * against the thing itself … this repository has twice shipped a footprint
   * that does not exist" - and the Task 5 brief both say so. These two tests
   * are that rule as checks that could fail.
   */
  test("every lib/schgen/render path the matrix names is a file on disk", () => {
    const paths = new Set<string>()
    for (const p of PAIR_COVERAGE) {
      const text = `${p.checkedBy ?? ""} ${p.meaninglessBecause ?? ""} ${p.asymmetric ?? ""}`
      for (const m of text.matchAll(/lib\/schgen\/render\/([a-z][a-z0-9-]*\.ts)/g)) {
        const file = m[1]
        if (file !== undefined) paths.add(file)
      }
    }
    expect(paths.size, "a path check over no paths is a check that cannot fail").toBeGreaterThan(5)
    const missing = [...paths].filter((f) => !fs.existsSync(path.join(RENDER_DIR, f)))
    expect(missing, "the matrix names these files under lib/schgen/render/ and they do not exist").toEqual([])
  })

  /**
   * **THE OTHER HALF OF THE SAME RULE.** Several cells rest on a module this
   * tree does not contain - `render/frames.ts`, which sizes a frame from the
   * block extent, and `render/sheetCheck.ts`, which runs the clearance checks
   * over a whole sheet - and say so in the cell text. The moment either one
   * ports, those cells' reasons must be re-read against the real code rather
   * than left standing. This test is what makes that happen: it fails on the
   * commit that ports them, naming them, instead of letting a stale reason
   * pass as a verified one.
   */
  test("the modules whose absence several cells rest on are still absent", () => {
    const notHere = ["frames.ts", "sheet-check.ts", "blocks.ts", "templates"]
    const arrived = notHere.filter((f) => fs.existsSync(path.join(RENDER_DIR, f)))
    expect(
      arrived,
      "these have ported, so every cell whose reason names them (the FRAME_DERIVED and " +
        "within-one-block cells of obstacle-pairs-*.ts) must be re-read against the real code and " +
        "this list updated in the same change",
    ).toEqual([])
  })

  test("every function the matrix names in checkedBy is defined under lib/schgen/render", () => {
    const sources = fs
      .readdirSync(RENDER_DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => fs.readFileSync(path.join(RENDER_DIR, f), "utf8"))
      .join("\n")
    const named = new Set<string>()
    for (const p of PAIR_COVERAGE) {
      if (p.checkedBy === null) continue
      // A clause names its deciding function first: at the start, after "AND ",
      // or after the "entry point → function" arrow.
      for (const m of p.checkedBy.matchAll(/(?:^|AND |→ )([a-zA-Z][a-zA-Z0-9]*)(?= \()/g)) {
        const fn = m[1]
        if (fn !== undefined) named.add(fn)
      }
    }
    expect(named.size, "a name check over no names is a check that cannot fail").toBeGreaterThan(5)
    const undefinedNames = [...named].filter(
      (fn) => !new RegExp(String.raw`(?:export )?(?:function|const) ${fn}\b`).test(sources),
    )
    expect(
      undefinedNames,
      "checkedBy names these as deciding functions and nothing under lib/schgen/render defines them - " +
        "a name taken from memory rather than traced to a line of code",
    ).toEqual([])
  })
})
