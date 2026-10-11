/**
 * `V1`: the second code path, and the witness that makes it unskippable.
 *
 * `./score-fixtures.ts` says where every expectation here comes from. The
 * other two checks are in `./score-identity.test.ts` (`V2`) and
 * `./score-floor.test.ts` (`K5`), and the objective itself in
 * `./score-objective.test.ts`.
 */
import { test, expect } from "bun:test"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import {
  countLines,
  requireCountsAgree,
  scoreDump,
  scoreDumpText,
} from "../../tools/stripboard/score.ts"
import { refusalFrom } from "./targets-oracle.ts"
import {
  FIXTURE_TARGETS,
  FROZEN_DUMP,
  PT2399_DUMP,
  TEXT,
  grepCount,
  lowBoostTargets,
} from "./score-fixtures.ts"

test("V1: the counts are reproduced by a second code path over the same text", async () => {
  // Driven on a committed dump as well as the hand fixture, because the only
  // interesting disagreement is one a real dump provokes.
  //
  // MUTATION RUN, AND IT IS THE MOST INSTRUCTIVE ONE IN THE SET. With
  // `countLines` replaced by `countParsed(parseBoardDump(dumpText))` - a
  // second CALL into the one parser rather than a second PATH - all four score
  // files still read '19 pass, 0 fail'. THIS TEST CANNOT TELL THE DIFFERENCE,
  // and that is why the grep-equivalent below it is a separate test:
  // agreement between a function and itself is free. With the parser then also
  // made to drop its last `CUT` line, this test STILL passed while ten others
  // failed. With the parser dropping that line and `countLines` left alone,
  // this failed with 'error: score-count-disagreement: fixture's two line
  // counts disagree - CUT: the parsed dump has 0 and the raw text has 1. ...'
  // - twelve tests refusing, which is the second path working. All reverted.
  const rules = loadRules()
  const frozen = await Bun.file(FROZEN_DUMP).text()
  for (const [name, text, targets] of [
    ["fixture", TEXT, FIXTURE_TARGETS],
    ["low-boost", frozen, lowBoostTargets()],
  ] as const) {
    const score = scoreDumpText(text, targets, rules)
    const counted = countLines(text)
    expect([score.cuts, score.wires, score.solder], name)
      .toEqual([counted.cuts, counted.wires, counted.solder])
  }
})

test("V1's second path counts the raw lines, so it would catch a parser that dropped one", async () => {
  // The scorer must not be the only thing that can read its own input. The
  // grep-equivalent is spelled out rather than reusing the parsed dump, and it
  // is run over the committed fixtures as well as the hand one.
  //
  // MUTATION RUN: with `countLines` delegating to `parseBoardDump` AND the
  // parser made to drop its last `CUT` line - the pair the agreement test
  // above cannot see - this failed with 'Expected: 1 / Received: 0'. It is the
  // assertion that holds `countLines` to the text rather than to the parser.
  // Reverted.
  for (const text of [TEXT, await Bun.file(FROZEN_DUMP).text(), await Bun.file(PT2399_DUMP).text()]) {
    const counted = countLines(text)
    expect(counted.cuts).toBe(grepCount(text, "CUT "))
    expect(counted.wires).toBe(grepCount(text, "WIRE "))
    expect(counted.solder).toBe(grepCount(text, "SOLDER "))
  }
})

test("CUT_STATE is not a cut, which a bare-prefix count would get wrong", async () => {
  // THE DISCRIMINATOR, and it is live in a committed fixture rather than
  // hypothetical: the frozen low-boost dump carries five `CUT` lines and one
  // `CUT_STATE` line, so a second path matching `startsWith("CUT")` without
  // the space reports six. Both numbers are hand-counted from the fixture
  // (grep -c '^CUT ' is 5, grep -c '^CUT' is 6).
  //
  // MUTATION RUN: with `countLines` matching the bare prefix "CUT" this failed
  // with 'error: a CUT_STATE line is not a cut / Expected: 5 / Received: 6',
  // and fourteen of the nineteen tests across the four score files failed with
  // it - V1's live cross-check refusing 'score-count-disagreement:
  // pultec-low-boost's two line counts disagree - CUT: the parsed dump has 5
  // and the raw text has 6.' Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  expect(grepCount(text, "CUT")).toBe(6)
  expect(countLines(text).cuts, "a CUT_STATE line is not a cut").toBe(5)
})

test("V1 refuses when the two paths disagree, naming both counts and the board", () => {
  // THE REFUSAL IS DRIVEN DIRECTLY rather than through a broken parser,
  // because no text makes the two paths disagree while both are correct -
  // a disagreement IS the defect, and `requireCountsAgree` is the seam where
  // it is reachable. The parser mutations above drove it the other way.
  //
  // MUTATION RUN: with the comparison reduced to the `cuts` term alone this
  // failed with 'Expected to start with: "score-count-disagreement:" /
  // Received: ""' on the wires case - the cuts case still refusing, which is
  // how a one-term check looks like a three-term one. Reverted.
  const agreed = { cuts: 1, wires: 1, solder: 1 }
  expect(refusalFrom(() => requireCountsAgree(agreed, agreed, "fixture"))).toBe("")
  for (const disagreeing of [
    { cuts: 0, wires: 1, solder: 1 },
    { cuts: 1, wires: 2, solder: 1 },
    { cuts: 1, wires: 1, solder: 9 },
  ]) {
    const message = refusalFrom(() => requireCountsAgree(agreed, disagreeing, "fixture"))
    expect(message).toStartWith("score-count-disagreement:")
    expect(message).toContain("fixture")
  }
})

test("the scorer cannot be reached without the second path having run", () => {
  // THE STRUCTURAL GUARD, and this test is what says out loud what the type
  // system is enforcing - round 1's review finding, and the bypass the single
  // score test file previously demonstrated by calling `scoreDump` with three
  // arguments.
  //
  // `scoreDump`'s fourth parameter is an `IndependentCount`, whose brand is a
  // `unique symbol` that `score.ts` does not export, so `countLines` is the
  // only thing in the repository that can produce one without a cast. The two
  // lines below are therefore the shape a caller must write, and
  // `bun run typecheck` is the gate. WHAT THE BRAND DOES AND DOES NOT CLOSE -
  // including the deliberate cast it cannot stop - is stated on
  // `IndependentCount` itself, measured, and is not re-argued here.
  //
  // DRIVEN, so it is not a claim about the type system. In a throwaway probe
  // file, each attack run against `bun run typecheck` and `bun test`:
  //   - three-argument call: 'error TS2554: Expected 4 arguments, but got 3.'
  //   - `{ cuts: 1, wires: 1, solder: 1 }`: 'error TS2345: Argument of type
  //     "{ cuts: number; wires: number; solder: number; }" is not assignable
  //     to parameter of type "IndependentCount".' Typecheck only - under
  //     `bun test` alone that probe PASSED, which is why the gate is the
  //     typecheck step and the comment on `IndependentCount` says so.
  //   - `as unknown as IndependentCount`: typecheck CLEAN and the probe
  //     passed. The residual, recorded rather than hidden.
  // Probe removed.
  const counted = countLines(TEXT)
  expect(scoreDump(boardGeometry(TEXT), FIXTURE_TARGETS, loadRules(), counted).objective)
    .toBe(2.25)
  // And the witness is held against the dump rather than taken on trust: a
  // count of some OTHER text in that position is refused, not believed. This
  // is the runtime half, and it is what makes the brand's residual narrow -
  // a forged witness still has to agree with the dump being scored.
  const otherText = TEXT.replace("CUT 0,1,1 0,2,2", "CUT 0,1,1 0,2,2\nCUT 1,1,1 1,2,2")
  const message = refusalFrom(
    () => scoreDump(boardGeometry(TEXT), FIXTURE_TARGETS, loadRules(), countLines(otherText)),
  )
  expect(message).toStartWith("score-count-disagreement:")
  expect(message).toContain("the parsed dump has 1 and the raw text has 2")
})
