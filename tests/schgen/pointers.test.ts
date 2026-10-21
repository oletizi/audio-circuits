/**
 * **A POINTER THAT NAMES A TEST FILE MUST FAIL WHEN IT GOES STALE, RATHER THAN ROT QUIETLY.**
 *
 * Hand-written for Task 17 of the M1 schematic-authoring plan, fix round 2 item A.
 *
 * **THE FAILURE THIS EXISTS FOR, MEASURED TWICE IN TWO ROUNDS.** `docs/known-gaps.md` and the
 * modules cite test files as the evidence for their figures - *"`tests/schgen/X.test.ts` pins every
 * figure"*. When an assertion moves to another file the citation keeps pointing at the old one, and
 * **nothing goes red, because the cited file still exists and still passes.** Round 1 split the
 * pinning assertions out of `remeasure.test.ts`; round 2's review then drove the consequence:
 * **perturb `SCALE_UNSTABLE_FROM` to 7 and run the file `G101` and `BLOCK_SIZE.evidence` named, and
 * it is 23 pass / 0 fail.** The register was instructing a reader to verify a pinned constant
 * against a file that does not pin it. The same shape cost a drive run in round 1, when the
 * perturbation harness named the stale file and reported two false greens.
 *
 * **WHAT THIS CHECKS, AND WHAT IT DELIBERATELY DOES NOT.** For each declared pointer it asserts
 * three things: the citing file still contains the citation; the cited test file EXISTS; and the
 * cited file contains a MARKER - a fragment of the assertion's own `it(...)` title. The marker is
 * what makes this more than an existence check: moving an assertion to another file leaves the path
 * valid and the marker absent, which is exactly the case that went green.
 *
 * **IT IS NOT A COMPLETE INVENTORY OF THE REPOSITORY'S POINTERS AND DOES NOT CLAIM TO BE.** It
 * covers the pointers that cite a MEASUREMENT a register entry rests on - the ones where a false
 * green is a false evidentiary claim. A citation to a test that merely exists is not worth a row
 * here, and a complete inventory would be a different and much larger thing. **`CLAUDE.md`: an
 * empty whitelist that refuses loudly beats a general rule that quietly accepts a guess** - this is
 * the whitelist, and `POINTERS` is where a later task adds to it.
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
 * The pointers whose staleness would make a register entry cite evidence that does not exist.
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
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure-ceiling.test.ts` pins the twelve-row sweep",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "pins both scale constants to the sweep they were measured from",
    why: "G101's Evidence, which is where the ceiling and floor are asserted to be checked.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure-ceiling.test.ts` asserts all twelve sweep rows",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "is these twelve sweep rows",
    why: "G95's Evidence for the re-taken sweep and its order-0 control.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure-edges.test.ts` asserts both circuits' flat and blocked",
    test: "tests/schgen/remeasure-edges.test.ts",
    marker: "so the decomposition ADDS 3 edges",
    why: "G100's Evidence for the corrected edge counts - the entry's headline figure.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure.test.ts` pins both ends",
    test: "tests/schgen/remeasure.test.ts",
    marker: "has a FLAT side that refuses, at the junction obligation",
    why: "G105's Evidence for the integrated experiment's two ends.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "asserted in `tests/schgen/remeasure.test.ts`; and",
    test: "tests/schgen/remeasure.test.ts",
    marker: "is these twelve rows of figures",
    why: "G230's Evidence for the four separately-named size counts.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure.test.ts`, so it recomputes on every run",
    test: "tests/schgen/remeasure.test.ts",
    marker: "classifies every checkLayout problem of every declared block",
    why: "G232's Evidence for the leverage figure going to the owner.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure.test.ts` asserts the four legs' placement lists",
    test: "tests/schgen/remeasure.test.ts",
    marker: "gives the four legs identical placements and identical anchor positions",
    why: "G97's Evidence for the congruence re-take.",
  },
  {
    citedBy: "docs/known-gaps.md",
    citation: "`tests/schgen/remeasure.test.ts` including the coordinate and the net name",
    test: "tests/schgen/remeasure.test.ts",
    marker: "has a FLAT side that refuses, at the junction obligation",
    why: "G229's Evidence for the obligation-2 refusal, quoted verbatim in that entry.",
  },
  {
    citedBy: "docs/schematic/m1-remeasurement.md",
    citation: "bun test tests/schgen/remeasure-ceiling.test.ts  BOTH BOUNDS",
    test: "tests/schgen/remeasure-ceiling.test.ts",
    marker: "names the ceiling 3 and the floor unmeasured",
    why: "The document's own re-run instructions, which a reader follows to check the bounds.",
  },
]

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

describe("the two pointers that pin a constant name the file that actually pins it", () => {
  /**
   * **THE NARROWEST STATEMENT OF ROUND 2's ITEM A, as its own check.** Both `BLOCK_SIZE.evidence`
   * and G101 tell a reader which file verifies the two scale bounds. If either ever names a file
   * that does not hold `pins both scale constants`, a perturbed constant verified against it comes
   * back green - which is what happened.
   */
  it("is remeasure-ceiling.test.ts in both, and that file holds the pin", () => {
    const pin = "pins both scale constants to the sweep they were measured from"
    const ceiling = read("tests/schgen/remeasure-ceiling.test.ts")
    expect(ceiling).toContain(pin)
    // And the file they used to name does NOT hold it, which is why naming it was a false green.
    expect(read("tests/schgen/remeasure.test.ts")).not.toContain(pin)
    for (const citing of ["tools/schgen/remeasure.ts", "docs/known-gaps.md"]) {
      const text = read(citing)
      const at = text.indexOf("pins the twelve-row sweep") >= 0 ? "pins the twelve-row sweep" : "pins every"
      const before = text.slice(Math.max(0, text.indexOf(at) - 200), text.indexOf(at))
      expect(before, `${citing} must name remeasure-ceiling.test.ts beside "${at}"`).toContain(
        "remeasure-ceiling.test.ts",
      )
    }
  })
})
