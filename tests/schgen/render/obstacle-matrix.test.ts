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
import { loadManifest } from "../../../tools/schgen/port-manifest.ts"

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
  namesOffset: "a field of the `PinTextStyle` interface (lib-graphics.ts:29), not a declaration of its own",
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
  // **BOTH ROWS ARE GONE, AND NEITHER WAS DELETED TO MAKE A TEST PASS.** Task 6b ported
  // `render/frames.ts` and `render/sheetCheck.ts`, this list's alarm rang naming
  // `["frames.ts", "sheet-check.ts"]` (both spellings worked, which is G132's fix firing for the
  // first time on a real arrival), the re-read was done, and the findings are in
  // `SETTLED_ARRIVALS` below, which asserts each module is PRESENT. So the claim moved from
  // "absent" to "arrived, re-read, and still here" rather than being dropped.
  //
  // It is deliberately left EMPTY rather than removed: the `citedPaths()` test consults it for
  // any `.ts` name a cell cites that is not under `lib/schgen/render/`, and a later task that
  // writes a cell about a module it has not ported needs the row to put it in. The test below
  // asserts the list is empty and says what to do when it is not, so an empty list is not a
  // check that cannot fail - it is one assertion in place of the other.
}

/**
 * The modules whose ARRIVAL this alarm was armed for and which have since
 * landed, each with what the forced re-read actually found. **This is not a
 * silencing list and it is not a NOT_IN_THIS_TREE row that was deleted.**
 * `blocks.ts` and `templates` were appended to the arrival filter by Task 5
 * as bare names, with no `NOT_IN_THIS_TREE` entry and no `why` - an alarm
 * aimed at Task 7 with no cell family recorded behind it. Task 7 landed both,
 * the alarm rang, the re-read was done, and these are its findings. The test
 * below asserts each one is PRESENT, so the entry still has teeth in the
 * other direction: a module disappearing from the tree fails here instead of
 * leaving a settled re-read resting on code that is gone.
 *
 * `docs/known-gaps.md` **G134** carries the re-read cell family by cell
 * family, including the one reason whose enumeration it did falsify.
 */
const SETTLED_ARRIVALS: Readonly<Record<string, string>> = {
  "frames.ts": [
    "Task 6b. The alarm rang and the re-read CHANGED eleven cells' shared reason rather than",
    "confirming it. FRAME_DERIVED said a frame is sized from `drawn-extent.ts`'s `drawnBoxes`;",
    "nothing sizes a frame from that function. `frames.ts` has a second, private `drawnBoxes`",
    "unioning `scene.texts` and `scene.bodies` ONLY, and `blockContent` unions that with the placed",
    "`LibSymbol.boxes` and every wire end. So `pinTexts`, `strokes` and `crosses` are in no extent a",
    "frame is sized from, and what puts them inside the border is the margin: `frameSize` grows the",
    "extent by `4 * GRID` and `contentOffset` insets by `2 * GRID`, leaving 2.54 mm clear on every",
    "side against a 1.905 mm pin-number box, a 0.635 mm no-connect marker and a 0.762 mm DNP cross",
    "overhang. That SETTLES the frame-border/dnp-cross cell, which round 1 recorded as uncovered by",
    "either of its two reasons. NO_FLAG_PRODUCER also lost its conclusion, not just its enumeration:",
    "`flagsContent` is the `flag: true` producer it said did not exist here.",
  ].join(" "),
  "sheet-check.ts": [
    "Task 6b, and it is the kebab-case spelling G132's `portedAs` fix exists for - the first real",
    "arrival that fix has caught. The within-one-block caveat it was armed for is now about which",
    "check catches the cross-block case rather than about a gap: `bodyOverlaps` places every block's",
    "`LibSymbol.boxes` in sheet coordinates and runs `boxesOverlap` over all pairs across blocks, and",
    "`assertSheetSafe` throws on one. It also falsified the pin-line/pwr-flag-glyph cell's second",
    "half: `clearance` passes the sheet's powers as `ClearanceScene.anchors`, so a `flag: true`",
    "symbol does now reach `sceneClearanceProblems` - what survives is that no BLOCK anchor becomes",
    "a flag.",
  ].join(" "),
  "blocks.ts": [
    "Task 7. NO cell's reason rests on its absence: every cell citing `checkLayout` cites it at",
    "`lib/schgen/render/layout-check.ts`, which Task 5 ported, and `blocks.ts` only re-exports it.",
  ].join(" "),
  templates: [
    "Task 7 (the directory, eight registered ids in seven modules). No cell's reason rests on its",
    "absence either. It falsified ONE reason's ENUMERATION and not its conclusion:",
    "`NO_FLAG_PRODUCER` named `anchorsToSymbols` as the one site hard-coding `flag: false`, and",
    "`fanout-rows.ts` is a second such site - still no `flag: true` producer anywhere, so the",
    "conclusion holds and the enumeration was widened to name both.",
  ].join(" "),
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
    // 21 cited today (20 until Task 7, which added `fanout-rows.ts` to
    // NO_FLAG_PRODUCER's enumeration - see SETTLED_ARRIVALS and G134). Pinned
    // so that a cell losing its file citation, or the extraction regex
    // narrowing, fails here instead of quietly shrinking the guard's reach -
    // which is the defect this test had in round 1. Both pins DID fire on the
    // Task 7 edit, which is the evidence that they still bite.
    expect(paths.length, `cited .ts names: ${paths.join(" ")}`).toBe(21)
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
   * **THE OTHER HALF OF THE SAME RULE, AND IT HAS NOW RUNG TWICE AND EMPTIED
   * ITSELF.** Several cells used to rest on a module this tree did not contain
   * - `render/frames.ts`, which sizes a frame from the block extent, and
   * `render/sheetCheck.ts`, which runs the clearance checks over a whole sheet.
   * Task 6b ported both; the alarm fired naming
   * `["frames.ts", "sheet-check.ts"]`, the re-read was done, and the findings
   * are in `SETTLED_ARRIVALS`. `NOT_IN_THIS_TREE` is now empty.
   *
   * **The assertion is inverted rather than deleted.** An empty list cannot
   * ring, so this test holds the list to BEING empty: a later task that writes
   * a cell resting on a module it has not ported must add a row, and that fails
   * here until the row carries both spellings and the arrival check above is
   * re-armed for it. The arrival teeth now live in the settled-arrivals test
   * below, which asserts each module is PRESENT.
   */
  test("no cell's reason rests on a module this tree does not contain", () => {
    const declared = Object.entries(NOT_IN_THIS_TREE)
    expect(
      declared.map(([cited]) => cited),
      "NOT_IN_THIS_TREE is empty since Task 6b, so adding a row is adding a cell reason that rests " +
        "on an absence. That is allowed - but the row must carry `portedAs` (the kebab-case name the " +
        "port writes, see G132), and the arrival filter must be re-armed to look for BOTH spellings, " +
        "or the rename hides the arrival the way it did for sheetCheck.ts.",
    ).toEqual([])
  })

  /**
   * **G132's FIRST OPEN ITEM, CLOSED FOR THE NAMES THAT REMAIN.** That entry
   * records that nothing checked an absence row's two names against
   * `port-manifest.json`, which is the authority for what the port writes - a
   * typo in `portedAs` restored the original defect silently. The rows are gone,
   * but the same hazard applies to `SETTLED_ARRIVALS`: its keys are the names
   * `fs.existsSync` looks for, and a key spelt the pedals way would make the
   * presence check below unable to fail. So each `.ts` key is required to be a
   * name the manifest actually writes under `lib/schgen/render/`.
   */
  test("every settled arrival is spelt the way the port manifest writes it", () => {
    const manifest = loadManifest()
    const written = new Set(
      [...manifest.files, ...manifest.diverged]
        .map((e) => e.to)
        .filter((to) => to.startsWith("lib/schgen/render/"))
        .map((to) => path.posix.basename(to)),
    )
    expect(written.size, "no render modules in the manifest, so this check proves nothing").toBeGreaterThan(10)
    const keys = Object.keys(SETTLED_ARRIVALS)
    // `templates` is a DIRECTORY, not a module, so no manifest entry's basename equals it. Pinned
    // at one so a second non-module key cannot be waved through with it.
    const notModules = keys.filter((k) => !k.endsWith(".ts"))
    expect(notModules, "non-module settled arrivals, which the manifest cannot name").toEqual(["templates"])
    const misspelt = keys.filter((k) => k.endsWith(".ts") && !written.has(k))
    expect(
      misspelt,
      "these settled-arrival keys are not names tools/schgen/port-manifest.json writes under " +
        "lib/schgen/render/, so the presence check below is looking for a file the port never " +
        "creates and could not fail - which is exactly the defect G132 records for the absence list",
    ).toEqual([])
  })

  /**
   * **THE SAME ALARM, AFTER IT RANG.** Task 5 armed the arrival filter for
   * `blocks.ts` and `templates` as bare names appended to it; Task 7 landed
   * both and the test above went red naming them. The re-read is recorded in
   * `SETTLED_ARRIVALS` and in `docs/known-gaps.md` **G134**, and what is left
   * to check is that the code those findings were read off is still here.
   * Deleting an entry fails the pinned count; a module vanishing fails the
   * existence check.
   */
  test("the arrivals this alarm already rang for are still in the tree, with their re-read recorded", () => {
    const entries = Object.entries(SETTLED_ARRIVALS)
    expect(entries.length, "a settled-arrival list nothing iterates is a check that cannot fail").toBe(4)
    const missing = entries.filter(([f]) => !fs.existsSync(path.join(RENDER_DIR, f))).map(([f]) => f)
    expect(
      missing,
      "a settled re-read rests on code that is no longer under lib/schgen/render/ - either the " +
        "module moved, in which case this entry's finding must be re-derived, or it was removed, in " +
        "which case the cells it settled go back to NOT_IN_THIS_TREE",
    ).toEqual([])
    for (const [f, finding] of entries) expect(finding.trim().length, f).toBeGreaterThan(80)
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
    // 102 cited today. 89 until Task 7 added `anchorExtent` with
    // NO_FLAG_PRODUCER's second hard-coded site, then 90 -> 91 at round 2 when
    // the `pin-line`/`pwr-flag-glyph` cell said why it is deliberately
    // narrower than that constant and cited `PowerSymbol` by name. **91 -> 102
    // at Task 6b**, when `render/frames.ts` and `render/sheet-check.ts` landed
    // and the eleven FRAME_DERIVED cells plus three others were re-read against
    // them: the new names are the ones that actually decide those pairs -
    // `blockContent`, `frameSize`, `contentOffset`, `flagsContent`,
    // `drawnBoxes`'s second definition, `assertSheetSafe`, `bodyOverlaps`,
    // `clearance`, `layoutSheet`, `sceneClearanceProblems`'s `ClearanceScene`
    // and `AnchorPoint`, and `inner`. Pinned so that narrowing the extraction
    // fails here.
    expect(cited.length, `cited identifiers: ${cited.join(" ")}`).toBe(102)
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
