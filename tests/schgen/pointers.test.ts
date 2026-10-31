/**
 * **A POINTER THAT NAMES A TEST FILE MUST FAIL WHEN IT GOES STALE, RATHER THAN ROT QUIETLY.**
 *
 * **NARROWED 2026-10-27 WHEN `docs/known-gaps.md` WAS FROZEN AND CUT FROM 273 ENTRIES TO 31.**
 * This guard had **18 rows, 14 of them citations inside the register**, and the register was the
 * failure it was built for: entries cited test files as the evidence for their figures, and when an
 * assertion moved the citation kept pointing at the old file and nothing went red. **Those 14 rows
 * are deleted with the entries that held them** - `CLAUDE.md`: a row citing text that is gone checks
 * nothing, and supersede means delete.
 *
 * **What is left is the part that was never about the register**: two module comments and two
 * documents that name a test file as their own re-run instructions. The failure mode is identical -
 * the cited file still exists and still passes, so a reader following the pointer verifies nothing
 * and gets a green - and those four citers are still live.
 *
 * **THE ORIGINAL FAILURE, MEASURED TWICE IN TWO ROUNDS, is kept because it is why the remaining
 * rows are worth having.** Round 1 split the pinning assertions out of `remeasure.test.ts`; round
 * 2's review then drove the consequence: **perturb `SCALE_UNSTABLE_FROM` to 7 and run the file
 * `BLOCK_SIZE.evidence` named, and it is 23 pass / 0 fail.** A reader was being instructed to verify
 * a pinned constant against a file that does not pin it.
 *
 * **WHAT THIS CHECKS.** For each declared pointer it asserts three things: the citing file still
 * contains the citation; the cited test file EXISTS; and the cited file contains a MARKER - a
 * fragment of the assertion's own `it(...)` title. The marker is what makes this more than an
 * existence check: moving an assertion to another file leaves the path valid and the marker absent,
 * which is exactly the case that went green.
 *
 * **IT IS STILL A WHITELIST AND NOT AN INVENTORY.** `CLAUDE.md`: *an empty whitelist that refuses
 * loudly beats a general rule that quietly accepts a guess* - this is the whitelist, and `POINTERS`
 * is where a later task adds to it. **The sample-fraction assertion this file used to carry is
 * gone**: it measured the guard's coverage against the register's citation population, and that
 * population no longer exists.
 */
import { describe, expect, it } from "bun:test"
import fs from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dir, "..", "..")
const read = (p: string): string => fs.readFileSync(path.join(repoRoot, p), "utf8")

interface Pointer {
  /** The file that makes the citation. */
  readonly citedBy: string
  /** The line or phrase in `citedBy` that names the test file - asserted still present. */
  readonly citation: string
  /** The test file the citation names. */
  readonly test: string
  /** A fragment of the cited assertion's own title, which must be IN `test`. */
  readonly marker: string
  readonly why: string
}

/**
 * The pointers whose staleness would make a module comment or a document cite evidence that does
 * not exist.
 *
 * **THE TWO THAT PIN A CONSTANT ARE FIRST**, because those are the ones the review drove green.
 */
const POINTERS: readonly Pointer[] = [
  {
    citedBy: "tools/schgen/remeasure.ts",
    citation: "tests/schgen/remeasure-ceiling.test.ts pins every",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "pins both scale constants to the sweep they were measured from",
    why: "BLOCK_SIZE.evidence tells a reader which file verifies both bounds. Round 2 found it naming a file where a broken SCALE_UNSTABLE_FROM gives 23 pass / 0 fail.",
  },
  {
    citedBy: "tools/schgen/remeasure-ceiling.ts",
    citation: "`tests/schgen/remeasure-ceiling.test.ts` asserts exactly that",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "gives order 0 the same crossing count as the unsuffixed block",
    why: "orderSweep's doc comment for the per-order block-id control - repaired at fix round 2 item A and uncovered until fix round 3.",
  },
  {
    citedBy: "docs/schematic/m1-remeasurement.md",
    citation: "bun test tests/schgen/remeasure-ceiling.test.ts  BOTH BOUNDS",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "names the ceiling 3 and the floor unmeasured",
    why: "The document's own re-run instructions, which a reader follows to check the bounds.",
  },
  {
    citedBy: "docs/schematic/reference-graph-checks.md",
    citation: "bun test tests/schgen/gates/reference-graph.kicad.test.ts   THE FIGURES ABOVE",
    test: "tests/schgen/gates/reference-graph.kicad.test.ts",
    marker: "pin-to-pin pairs, built from a real kicad-cli export",
    why: "The document's own re-run instructions for the table a reader checks the figures against.",
  },
]

/**
 * **THE COVERAGE CLAIM, MADE CHECKABLE - fix round 3, item 4, NARROWED 2026-10-27.** Round 2
 * repaired seven pointers and put five of them under this guard; the other two could have rotted
 * again at the next split, which is exactly what the guard is for.
 *
 * **Four of the seven were citations inside `docs/known-gaps.md` and went with the register cut.**
 * The three that survive are the ones in a module comment or a document. The count below is
 * asserted at three rather than seven, and that is a narrowing of the claim rather than a repair of
 * it: nothing now guards the four deleted citations, because there is nothing left for them to cite.
 */
const REPAIRED_AT_ROUND_2: readonly { readonly citedBy: string; readonly citation: string }[] = [
  { citedBy: "tools/schgen/remeasure-ceiling.ts", citation: "`tests/schgen/remeasure-ceiling.test.ts` asserts exactly that" },
  { citedBy: "tools/schgen/remeasure.ts", citation: "tests/schgen/remeasure-ceiling.test.ts pins every" },
  { citedBy: "docs/schematic/m1-remeasurement.md", citation: "bun test tests/schgen/remeasure-ceiling.test.ts  BOTH BOUNDS" },
]

describe("the guard declares what it covers, and covers only live citers", () => {
  it("is four rows: two module comments and two documents, and no register row", () => {
    const byFile = new Map<string, number>()
    for (const p of POINTERS) byFile.set(p.citedBy, (byFile.get(p.citedBy) ?? 0) + 1)
    expect(POINTERS.length).toBe(4)
    // COUNTED RATHER THAN SUBTRACTED FROM THE TOTAL. An earlier version asserted
    // `POINTERS.length - 9 - 1 === 2`, which is arithmetic on literals: swapping a module row for a
    // document row left it green while "2 module comments" became false.
    expect(POINTERS.filter((p) => p.citedBy.endsWith(".ts")).length, "2 module comments").toBe(2)
    expect(POINTERS.filter((p) => p.citedBy.endsWith(".md")).length, "2 documents").toBe(2)
    // THE REGISTER IS FROZEN AND CARRIES NO MEASUREMENT CITATIONS. A row added back for it would be
    // a row citing text nobody may write, so this fails rather than letting one in quietly.
    expect(byFile.get("docs/known-gaps.md"), "the register is frozen - no row may cite it").toBe(undefined)
  })
})

describe("every pointer that cites a measurement names the file that holds it", () => {
  it("has pointers to check, so the suite below is not vacuous", () => {
    expect(POINTERS.length).toBeGreaterThan(0)
  })

  for (const p of POINTERS) {
    it(`${p.citedBy} -> ${p.test}: ${p.marker.slice(0, 48)}`, () => {
      expect(
        read(p.citedBy).includes(p.citation),
        `${p.citedBy} no longer contains the citation this row is about (${p.citation}). Either the ` +
          "prose was reworded - update this row - or the citation was deleted, in which case the row " +
          "goes too. It is not skipped: a row citing text that is gone checks nothing.",
      ).toBe(true)
      expect(
        fs.existsSync(path.join(repoRoot, p.test)),
        `${p.citedBy} cites ${p.test} and that file does not exist. ${p.why}`,
      ).toBe(true)
      expect(
        read(p.test).includes(p.marker),
        `${p.citedBy} cites ${p.test} for a check whose title contains "${p.marker}", and that ` +
          `file does not contain it. The assertion has MOVED and the citation now points at a file ` +
          `that still exists and still passes - so a reader following it verifies nothing and gets a ` +
          `green. ${p.why}`,
      ).toBe(true)
    })
  }
})

describe("every surviving pointer fix round 2 repaired is under this guard", () => {
  it("covers all three, by citation", () => {
    expect(REPAIRED_AT_ROUND_2.length).toBe(3)
    for (const repaired of REPAIRED_AT_ROUND_2) {
      const covered = POINTERS.some((p) => p.citedBy === repaired.citedBy && p.citation === repaired.citation)
      expect(
        covered,
        `the pointer in ${repaired.citedBy} citing "${repaired.citation}" was repaired at fix round 2 ` +
          "and is not in POINTERS, so it can go stale again without anything failing - the specific " +
          "failure this guard was built for.",
      ).toBe(true)
    }
  })
})

describe("the pointer that pins a constant names the file that actually pins it", () => {
  /**
   * **THE NARROWEST STATEMENT OF ROUND 2's ITEM A, as its own check.** `BLOCK_SIZE.evidence` tells
   * a reader which file verifies the two scale bounds. If it ever names a file that does not hold
   * `pins both scale constants`, a perturbed constant verified against it comes back green - which
   * is what happened.
   *
   * **`docs/known-gaps.md` WAS THE SECOND CITER AND IS GONE** with the register cut, so this is one
   * citer rather than two.
   */
  it("is remeasure-ceiling.test.ts, and that file holds the pin", () => {
    const pin = "pins both scale constants to the sweep they were measured from"
    const ceiling = read("tests/schgen/remeasure-ceiling.test.ts")
    expect(ceiling).toContain(pin)
    // And the file it used to name does NOT hold it, which is why naming it was a false green.
    expect(read("tests/schgen/remeasure.test.ts")).not.toContain(pin)
    const text = read("tools/schgen/remeasure.ts")
    const at = "pins every"
    const before = text.slice(Math.max(0, text.indexOf(at) - 200), text.indexOf(at))
    expect(before, `tools/schgen/remeasure.ts must name remeasure-ceiling.test.ts beside "${at}"`).toContain(
      "remeasure-ceiling.test.ts",
    )
  })
})
