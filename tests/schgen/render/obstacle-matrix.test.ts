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
import {
  OBSTACLE_CATEGORIES, PAIR_COVERAGE, partiallyCoveredPairs, uncoveredPairs,
} from "../../../lib/schgen/render/obstacle-matrix.ts"

const RENDER_DIR = path.resolve(import.meta.dir, "../../../lib/schgen/render")

/** Every `.ts` under `lib/schgen/render/` that is not the matrix itself, as one string. */
function renderSources(): string {
  return fs
    .readdirSync(RENDER_DIR)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("obstacle-"))
    .map((f) => fs.readFileSync(path.join(RENDER_DIR, f), "utf8"))
    .join("\n")
}

/** All three prose fields of one cell, for the guards below to read. */
function cellText(p: (typeof PAIR_COVERAGE)[number]): string {
  return `${p.checkedBy ?? ""} ${p.meaninglessBecause ?? ""} ${p.asymmetric ?? ""}`
}

/**
 * Every plain identifier the matrix cites in backticks, plus the bare name a
 * `checkedBy` clause opens with. **The extraction is TOTAL over that shape**,
 * which is the whole point: an earlier version took an identifier only at the
 * start of a clause, after `AND ` or after `→ `, which captured 8 of the 89
 * the cells actually cite and left about thirty unverified while the test's
 * name claimed all of them. A guard whose reach is a fraction of its claimed
 * reach is the look-like-it-passes shape this file exists to prevent.
 *
 * Dotted references (`LibSymbol.boxes`) and expressions
 * (`boxesOverlap(p.box, q.box)`) do not match, by design: the identifier
 * inside them is cited elsewhere on its own.
 */
function citedIdentifiers(): ReadonlySet<string> {
  const out = new Set<string>()
  for (const p of PAIR_COVERAGE) {
    const text = cellText(p)
    for (const m of text.matchAll(/`([a-zA-Z][a-zA-Z0-9]*)`/g)) if (m[1] !== undefined) out.add(m[1])
    for (const m of text.matchAll(/(?:^|AND |→ )([a-zA-Z][a-zA-Z0-9]*)(?= \()/g)) if (m[1] !== undefined) out.add(m[1])
  }
  return out
}

/** Every `*.ts` file name the matrix cites, with or without a directory prefix. */
function citedPaths(): ReadonlySet<string> {
  const out = new Set<string>()
  for (const p of PAIR_COVERAGE) {
    for (const m of cellText(p).matchAll(/(?<![A-Za-z0-9.-])([a-zA-Z][a-zA-Z0-9.-]*\.ts)\b/g)) {
      if (m[1] !== undefined) out.add(m[1])
    }
  }
  return out
}

const declaredIn = (sources: string, id: string): boolean =>
  new RegExp(String.raw`(?:export )?(?:async )?(?:function|const|interface|type|class|let) ${id}\b`).test(sources)

/**
 * The only cited identifiers that are NOT a declaration under
 * `lib/schgen/render/`, each with what it is instead. **This list is the
 * guard's teeth, not its hole**: the test below requires every cited
 * identifier to be either a declaration or an entry here, so a new name in a
 * cell's prose fails until somebody classifies it, and an entry that stops
 * being cited fails too.
 */
const NOT_A_RENDER_DECLARATION: Readonly<Record<string, string>> = {
  flag: "a field of the `PowerSymbol` interface (sheet-types.ts), not a declaration of its own",
  interiorBoxes: "a field of the `UnitText` interface (unit-text.ts), not a declaration of its own",
  decoration: "English prose - the singular of `unitText`'s `decorations` list, used as a noun",
  null: "a TypeScript keyword, cited when a cell talks about a null net",
}

/**
 * The modules several cells' reasons rest on NOT being in this tree, with the
 * task that brings each. **This list doubles as the staleness alarm**: the
 * test below fails on the commit that ports any of them, naming it, so the
 * cells whose reasons assume their absence are re-read against real code
 * rather than left standing.
 *
 * **EACH ENTRY CARRIES TWO NAMES, AND THAT IS A FIX, NOT A FLOURISH.** The key
 * is the name the CELLS cite - the pedals spelling, because a cell quotes the
 * module it read (`render/sheetCheck.ts` at `obstacle-pairs-body.ts:32`), and
 * `citedPaths()` above extracts exactly that. `portedAs` is the name
 * `tools/schgen/port-manifest.json` writes it under here, because
 * `lib/schgen/README.md`'s rename convention is kebab-case while the pedals
 * source is camelCase.
 *
 * **Round 1 of this list had only the cited name, and for `sheetCheck.ts` that
 * made the alarm unable to ring.** The arrival test is an `fs.existsSync`
 * under `lib/schgen/render/`, so it was looking for a file name the port never
 * writes: porting the module lands `sheet-check.ts`, the lookup for
 * `sheetCheck.ts` keeps failing, the entry keeps "covering" it, and the guard
 * written to force a re-read of the within-one-block cells silently does not
 * fire. `frames.ts` was never exposed to this - kebab-case leaves a
 * single-word name alone - so the defect sat behind a name that happened to
 * survive the convention. Both spellings are now checked, so whichever one
 * lands rings the bell. Settled in Task 6; `docs/known-gaps.md` **G132**.
 */
const NOT_IN_THIS_TREE: Readonly<Record<string, { readonly portedAs: string; readonly why: string }>> = {
  "frames.ts": {
    portedAs: "frames.ts",
    why: "Task 8 - sizes a frame from the block extent; 11 cells' FRAME_DERIVED reason assumes it is absent",
  },
  "sheetCheck.ts": {
    portedAs: "sheet-check.ts",
    why: "Task 7+ - runs the clearance checks over a whole sheet; the within-one-block caveats assume it is absent",
  },
}

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
  test("every .ts file the matrix names is either under lib/schgen/render or declared absent", () => {
    const paths = [...citedPaths()].sort()
    // 20 cited today. Pinned so that a cell losing its file citation, or the
    // extraction regex narrowing, fails here instead of quietly shrinking the
    // guard's reach - which is the defect this test had in round 1.
    expect(paths.length, `cited .ts names: ${paths.join(" ")}`).toBe(20)
    const unaccounted = paths.filter(
      (f) => !fs.existsSync(path.join(RENDER_DIR, f)) && NOT_IN_THIS_TREE[f] === undefined,
    )
    expect(
      unaccounted,
      "the matrix names these .ts files and they are neither under lib/schgen/render/ nor declared " +
        "absent in NOT_IN_THIS_TREE - a path taken from memory rather than checked against disk",
    ).toEqual([])
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
    // BOTH SPELLINGS, deliberately: the cited (pedals, camelCase) name and the
    // name the port writes here (kebab-case). Checking only the cited one is
    // what made this guard unable to fire for `sheetCheck.ts` - see
    // NOT_IN_THIS_TREE's own comment and `docs/known-gaps.md` G132.
    const declared = Object.entries(NOT_IN_THIS_TREE).flatMap(([cited, { portedAs }]) =>
      cited === portedAs ? [cited] : [cited, portedAs],
    )
    expect(declared.length, "an absence list nothing iterates is a check that cannot fail").toBeGreaterThan(0)
    expect(
      declared,
      "every declared absence must be looked for under both the name the cells cite and the name " +
        "the port writes it under, or the kebab-case rename hides the arrival",
    ).toContain("sheet-check.ts")
    const arrived = [...declared, "blocks.ts", "templates"].filter((f) => fs.existsSync(path.join(RENDER_DIR, f)))
    expect(
      arrived,
      "these have ported, so every cell whose reason names them (the FRAME_DERIVED and " +
        "within-one-block cells of obstacle-pairs-*.ts) must be re-read against the real code and " +
        "NOT_IN_THIS_TREE updated in the same change",
    ).toEqual([])
  })

  /**
   * **TOTAL over every identifier the cells cite**, which is the fix for the
   * round-1 defect Controller item I2 names: the old regex took a name only at
   * the start of a clause, after `AND ` or after `→ `, so it checked 8 of 89
   * while its name claimed all of them. The sharpest miss was the
   * `pin-number`/`pin-number` cell, which opens *"symbolTextOverlaps and
   * placedSymbolTextOverlaps (…)"* and contributed ZERO names because "and" is
   * lowercase.
   *
   * The reach and the claim now agree: every backticked plain identifier and
   * every bare leading `checkedBy` name must be a declaration under
   * `lib/schgen/render/` or carry a classification in
   * `NOT_A_RENDER_DECLARATION`. It asserts existence, not that each is a
   * function - several cited names are interface fields and module-local
   * consts, and the test says so rather than overstating.
   */
  test("every identifier the matrix cites exists under lib/schgen/render, or is classified", () => {
    const sources = renderSources()
    const cited = [...citedIdentifiers()].sort()
    // 89 cited today. Pinned so that narrowing the extraction fails here.
    expect(cited.length, `cited identifiers: ${cited.join(" ")}`).toBe(89)
    const unaccounted = cited.filter((id) => !declaredIn(sources, id) && NOT_A_RENDER_DECLARATION[id] === undefined)
    expect(
      unaccounted,
      "the matrix cites these and nothing under lib/schgen/render declares them, and they are not " +
        "classified in NOT_A_RENDER_DECLARATION - a name taken from memory rather than traced to a " +
        "line of code",
    ).toEqual([])
    const stale = Object.keys(NOT_A_RENDER_DECLARATION).filter((id) => !cited.includes(id))
    expect(stale, "classified as not-a-declaration and no longer cited by any cell - delete these").toEqual([])
  })

  /**
   * The narrower claim `checkedBy` actually makes: a cell that says a function
   * decides the pair names at least one real FUNCTION, not only a type or a
   * field. Kept separate from the total existence check above so that neither
   * one overstates the other.
   */
  test("every cell with a check names at least one function defined under lib/schgen/render", () => {
    const sources = renderSources()
    const withCheck = PAIR_COVERAGE.filter((p) => p.checkedBy !== null)
    expect(withCheck.length, "a check over no cells is a check that cannot fail").toBe(58)
    const nameless = withCheck
      .filter((p) => {
        const names = [...(p.checkedBy ?? "").matchAll(/`?([a-zA-Z][a-zA-Z0-9]*)`?(?= \()/g)].flatMap((m) =>
          m[1] === undefined ? [] : [m[1]],
        )
        return !names.some((n) => new RegExp(String.raw`(?:export )?function ${n}\b`).test(sources))
      })
      .map((p) => `${p.a}/${p.b}`)
    expect(nameless, "these cells claim a check and name no function this tree defines").toEqual([])
  })

  /**
   * **CONTROLLER RULING R11.** `uncoveredPairs()` returning `[]` is not the
   * whole state of the matrix: 44 cells carry a check AND a recorded gap in
   * it, and before this test a re-grading of that set was a silent diff -
   * every test would still pass. The count is pinned to a literal so that
   * clearing an `asymmetric`, or adding one to a cell that had none, fails
   * here naming the new number.
   *
   * The second assertion stops `asymmetric` from quietly becoming the fourth
   * field the matrix deliberately does not have (`docs/known-gaps.md`
   * **G128** item 1): a gap recorded with no check beside it would be an
   * uncovered pair wearing a caveat's clothes. Measured at zero exceptions.
   */
  test("a recorded gap always sits beside a check, and the partially-covered set is pinned", () => {
    // THE INVARIANT IS ASSERTED FIRST, DELIBERATELY. With the count pinned
    // ahead of it, adding an `asymmetric` to a cell with no check fails on the
    // COUNT (44 -> 45) and short-circuits before the invariant runs, so the
    // invariant could never be seen to fail on its own. Driven in that order
    // and found unprovable; reordered so each failure names its own cause.
    const gapWithoutCheck = PAIR_COVERAGE.filter((p) => p.asymmetric !== null && p.checkedBy === null).map(
      (p) => `${p.a}/${p.b}`,
    )
    expect(
      gapWithoutCheck,
      "asymmetric records what a check does not reach, so it may not stand alone - a cell with a gap " +
        "and no check is an uncovered pair wearing a caveat's clothes, and belongs in " +
        "meaninglessBecause or in a check",
    ).toEqual([])
    expect(partiallyCoveredPairs().length, "the recorded-gap set has been re-graded").toBe(44)
    expect(partiallyCoveredPairs().length, "no cell may be both uncovered and partially covered").toBeLessThan(
      PAIR_COVERAGE.length,
    )
  })
})
