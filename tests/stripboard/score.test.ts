/**
 * `F`, and the three checks that ride on every evaluation of it.
 *
 * HOW EVERY EXPECTATION HERE IS DERIVED INDEPENDENTLY OF THE CODE, which for
 * a three-term sum is the whole difficulty: `expect(score.objective)
 * .toBeCloseTo(cuts + rules.rhoWire * wires + rules.rhoSolder * solder)`
 * evaluates the expression `objectiveOf` evaluates and passes however wrong
 * both are. It LOOKS like a derivation. It is not, and Task 11's review
 * caught the same shape in `expect(floor).toBe(Math.max(0, n - r))`.
 *
 * So every figure below comes from one of four places, named at its
 * assertion:
 *
 * 1. **A hand-counted fixture** - `TEXT`, whose one `CUT`, one `WIRE` and one
 *    `SOLDER` line are visible in the literal above, and whose `F` is written
 *    as the single number the arithmetic comes to rather than as the sum.
 * 2. **COST's recorded tables** - §1.6's per-board `C`, `N`, `S_occ` and `J`,
 *    §2.2's wire and solder columns, §5's κ fractions - carried in
 *    `./targets-oracle.ts` with their provenance, and the objective hand-added
 *    from them.
 * 3. **The committed fixture dumps, counted with a different spelling** -
 *    `grep`-equivalent filters over the raw text, which is not how
 *    `countLines` reads them.
 * 4. **The identity run backwards**: `C`, `N` and `S_occ` are read off a dump
 *    and `J` is checked against COST's own derived figure.
 *
 * REFUSALS ANCHOR ON THEIR OPENING CLAUSE with `toStartWith`, and each was
 * driven by breaking the clause that raises it, running this file, and
 * copying the REAL output into the comment beside the assertion.
 */
import { test, expect } from "bun:test"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { boardGeometry, copperGraph } from "../../tools/stripboard/copper.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { deriveTargets, type BoardTargets } from "../../tools/stripboard/targets.ts"
import {
  countLines,
  objectiveOf,
  requireCountsAgree,
  scoreDump,
  scoreDumpText,
} from "../../tools/stripboard/score.ts"
import { BOARDS, refusalFrom } from "./targets-oracle.ts"

const FROZEN_DUMP = "tests/fixtures/stripboard/pultec-low-boost-frozen.dump"
const PT2399_DUMP = "tests/fixtures/stripboard/pt2399-core.dump"

/**
 * The hand-counted fixture. Three by four holes, horizontal strips, with
 * exactly one of each costed line so every term of `F` is exercised and every
 * count is visible in the text:
 *
 * - `C = 1` (one `CUT` line), `W = 1` (one `WIRE`), `B = 1` (one `SOLDER`).
 * - `N = 2` (two `NODE` lines), `P = 4` (four `PIN` lines).
 * - `S_occ = 2`: the four pins sit on rows 0 and 2, and the strip axis is
 *   rows because `VERTICAL_STRIPS` is 0.
 * - so `J = C - N + S_occ = 1 - 2 + 2 = 1` and `κ = J/(P - N) = 1/2`.
 */
const TEXT = [
  "GRID 3 4", "VERO_TRACKS 1", "VERTICAL_STRIPS 0", "CUT_STATE COMPUTED",
  "PART R1 RESISTOR4 1k AT 0,0 SPAN 1",
  "PIN R1 1 AT 0,0", "PIN R1 2 AT 2,0",
  "PART R2 RESISTOR4 2k AT 0,1 SPAN 1",
  "PIN R2 1 AT 0,1", "PIN R2 2 AT 2,1",
  "WIRE w1 AT 0,3 ENDS 0,3,3,30 2,3,5,30",
  "SOLDER 0,2 1,2",
  "CUT 0,1,1 0,2,2",
  "NODE 1 NAME a R1.1 R2.1", "NODE 2 NAME b R1.2 R2.2",
].join("\n")

/**
 * What the fixture is graded against. The scorer reads only `board` and
 * `cutFloor` from this - see the module comment in `score.ts` - and the
 * `netCount`/`pinCount` here are set to the dump's own 2 and 4 so the fixture
 * states nothing false; the test below proves they are not what is read by
 * changing them to numbers that are.
 */
const FIXTURE_TARGETS: BoardTargets = {
  board: "fixture",
  netCount: 2,
  pinCount: 4,
  strips: 3,
  cutFloor: 0,
  netGraph: { nets: ["a", "b"], edges: [["a", "b"]], maxDegree: 1, bandwidthLowerBound: 1 },
  ordering: ["a", "b"],
  orderingBandwidth: 1,
}

/** The fixture with seven more nets declared and nothing else changed: `J = 1 - 9 + 2`. */
const NINE_NETS = [
  TEXT,
  "NODE 3 NAME c", "NODE 4 NAME d", "NODE 5 NAME e", "NODE 6 NAME f",
  "NODE 7 NAME g", "NODE 8 NAME h", "NODE 9 NAME i",
].join("\n")

/** `grep -c '^<keyword> '` over raw text: a third spelling of the count. */
function grepCount(text: string, prefix: string): number {
  return text.split("\n").filter((line) => line.startsWith(prefix)).length
}

/** low-boost's targets, as P0 derives them from the model and HC6's stock. */
function lowBoostTargets(): BoardTargets {
  return deriveTargets(physicalBoard("low-boost"), loadRules().stockRows, "pultec-low-boost")
}

// --- The objective ----------------------------------------------------------

test("F is C + rho_w*W + rho_s*B over the dump's own line counts", () => {
  // The counts are hand-read off TEXT: one CUT, one WIRE, one SOLDER line.
  //
  // 2.25 IS HAND ARITHMETIC AND NOT THE CODE'S EXPRESSION RE-EVALUATED:
  // 1 + 0.25 + 1, written as the one number it comes to. The two guards above
  // it say which rules values it is right at, so a change to either weight
  // fails by naming the weight rather than by leaving 2.25 unexplained.
  //
  // WHAT THIS FIXTURE CANNOT SEE, worked out rather than discovered by
  // mutation: at `W = B = 1` the two weights are interchangeable, so swapping
  // them leaves 1 + 1 + 0.25 = 2.25 unchanged. The asymmetric case is the
  // test below, and it is a separate test for that reason.
  //
  // MUTATION RUN: with the solder term dropped from `objectiveOf` this failed
  // with 'Expected: 2.25 / Received: 1.25'. Reverted.
  const rules = loadRules()
  expect([rules.rhoWire, rules.rhoSolder], "2.25 below is right only at these weights")
    .toEqual([0.25, 1])
  const score = scoreDumpText(TEXT, FIXTURE_TARGETS, rules)
  expect([score.cuts, score.wires, score.solder]).toEqual([1, 1, 1])
  expect(score.objective).toBe(2.25)
})

test("a wire and a solder bridge are priced differently, which W = B cannot show", async () => {
  // THE ASYMMETRIC CASE, and the reason it is a separate test: at W = B the
  // two weights are interchangeable and a swapped pair passes. pt2399-core's
  // committed dump has four WIRE lines and six SOLDER lines, so
  // 12 + 0.25*4 + 1*6 = 19 while the swap gives 12 + 1*4 + 0.25*6 = 17.5.
  //
  // THE THREE COUNTS ARE grep-COUNTED off the fixture here rather than
  // restated, so the 19 is the only number written, and it is hand-added.
  //
  // MUTATION RUN: with the weights swapped in `objectiveOf` this failed with
  // 'error: pt2399-core / Expected: 19 / Received: 17.5'. Reverted.
  const text = await Bun.file(PT2399_DUMP).text()
  const counts = {
    cuts: grepCount(text, "CUT "),
    wires: grepCount(text, "WIRE "),
    solder: grepCount(text, "SOLDER "),
  }
  expect(counts).toEqual({ cuts: 12, wires: 4, solder: 6 })
  expect(objectiveOf(counts, loadRules()), "pt2399-core").toBe(19)
})

test("F reproduces COST section 2.2's recorded objective on all five Pultec boards", () => {
  // EVERY INPUT IS COST's, carried in ./targets-oracle.ts with its provenance:
  // §1.6's cut count and §2.2's wire and solder columns. The expected F is
  // hand-added from them at the committed weights, one line per board:
  //
  //   mid       65 + 0.25*0 + 1*3 = 68
  //   hi-boost  40 + 0.25*0 + 1*0 = 40
  //   hi-cut    32 + 0.25*0 + 1*3 = 35
  //   low-cut   23 + 0.25*0 + 1*0 = 23
  //   low-boost  5 + 0.25*0 + 1*1 = 6
  //
  // All five have W = 0, which is why the two tests above exist: this oracle
  // cannot see rho_w on its own.
  //
  // MUTATION RUN: with `objectiveOf` dropping the solder term this failed with
  // 'error: mid / Expected: 68 / Received: 65'. With the two weights swapped it
  // failed with 'error: mid / Expected: 68 / Received: 65.75' - so W = 0 does
  // not make this oracle blind to the swap, it makes it blind only to rho_w's
  // VALUE. Both runs stop at mid, the first board in the loop, so nothing may
  // be concluded here about the other four. Reverted.
  const rules = loadRules()
  const recorded: readonly (readonly [string, number])[] = [
    ["mid", 68], ["hi-boost", 40], ["hi-cut", 35], ["low-cut", 23], ["low-boost", 6],
  ]
  for (const [section, expectedF] of recorded) {
    const board = BOARDS.find((measured) => measured.section === section)
    if (board === undefined) {
      throw new Error(`no measured board named "${section}" in ./targets-oracle.ts`)
    }
    const counts = { cuts: board.cuts, wires: board.wires, solder: board.solder }
    expect(objectiveOf(counts, rules), section).toBe(expectedF)
  }
})

test("the scorer carries no threshold of its own: every weight comes from the rules", () => {
  // PAR3: nothing the pipeline is graded against is written in the code that
  // grades. Doubling and quadrupling the two weights moves F by exactly the
  // two terms, so 1 + 2 + 4 = 7 - hand arithmetic again.
  //
  // MUTATION RUN: with `rhoWire` replaced by a literal 0.25 in `objectiveOf`
  // this failed with 'Expected: 7 / Received: 5.25'. Reverted.
  const doubled = { ...loadRules(), rhoWire: 2, rhoSolder: 4 }
  expect(scoreDumpText(TEXT, FIXTURE_TARGETS, doubled).objective).toBe(7)
})

test("the Score reports nine counts and no verdict, because tau is unset", () => {
  // K4: tau is null in the committed rules, so Q2 and A3 do not fire and
  // there is no tolerance for the scorer to report. The shape is pinned so a
  // later `withinTolerance` or `verdict` field cannot arrive here unnoticed -
  // the scorer is the search's number, and the grader is the product.
  expect(loadRules().tau).toBeNull()
  expect(Object.keys(scoreDumpText(TEXT, FIXTURE_TARGETS, loadRules())).sort()).toEqual([
    "clustering", "cuts", "joins", "netCount", "objective", "occupied", "pinCount",
    "solder", "wires",
  ])
})

// --- V1: the second code path -----------------------------------------------

test("V1: the counts are reproduced by a second code path over the same text", async () => {
  // Driven on a committed dump as well as the hand fixture, because the only
  // interesting disagreement is one a real dump provokes.
  //
  // MUTATION RUN, AND IT IS THE MOST INSTRUCTIVE ONE IN THIS FILE. With
  // `countLines` replaced by `countParsed(parseBoardDump(dumpText))` - a
  // second CALL into the one parser rather than a second PATH - the whole file
  // still read '19 pass, 0 fail'. THIS TEST CANNOT TELL THE DIFFERENCE, and
  // that is why the grep-equivalent below it is a separate test: agreement
  // between a function and itself is free. With the parser then also made to
  // drop its last `CUT` line, this test STILL passed while ten others failed.
  // With the parser dropping that line and `countLines` left alone, this
  // failed with 'error: score-count-disagreement: fixture's two line counts
  // disagree - CUT: the parsed dump has 0 and the raw text has 1. ...' -
  // twelve tests refusing, which is the second path working. All reverted.
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
  // and fourteen of the nineteen tests in this file failed with it - V1's live
  // cross-check refusing 'score-count-disagreement: pultec-low-boost's two
  // line counts disagree - CUT: the parsed dump has 5 and the raw text has 6.'
  // Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  expect(grepCount(text, "CUT")).toBe(6)
  expect(countLines(text).cuts, "a CUT_STATE line is not a cut").toBe(5)
})

test("V1 refuses when the two paths disagree, naming both counts and the board", () => {
  // THE REFUSAL IS DRIVEN DIRECTLY rather than through a broken parser,
  // because no text makes the two paths disagree while both are correct -
  // a disagreement IS the defect, and `requireCountsAgree` is the seam where
  // it is reachable. Step 4's mutation drove it the other way as well.
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

// --- V2: the identity, and its J >= 0 reading -------------------------------

test("V2: the identity closes on the frozen dump with COST section 1.6's own terms", async () => {
  // COST §1.6 derives low-boost BY HAND from its forty-line dump: nets on
  // rows 3, 5, 7, 9 and 10 give S_occ = 5, only `lo_boost_in` occupies two
  // segments so J = 1, and N + J - S_occ = 9 + 1 - 5 = 5 is the reported cut
  // count. §5 records κ = 1/18. Every one of those four figures is COST's,
  // and the objective 6 = 5 + 0.25*0 + 1*1 is hand-added from §2.2's row.
  //
  // THIS TEST IS ALSO THE PROOF THAT N AND P ARE DUMP-SOURCED. low-boost's
  // model-sourced targets carry N = 14 (COST §2.3) and P = 50 (§2.3's forty
  // on-board pins plus the fixture's ten PAD lines), while the stale frozen
  // layout has nine NODE and twenty-seven PIN lines. Were the scorer to take
  // the identity's N from the targets it would compute J = 5 - 14 + 5 = -4
  // and REFUSE this board, and at the targets' P it would report κ = 1/41
  // rather than §5's 1/18.
  //
  // MUTATION RUN, WHICH IS WHERE THE PREVIOUS PARAGRAPH'S FIGURES COME FROM
  // rather than from reasoning: with `netCount` taken from the targets this
  // failed with 'error: negative-joins: C = 5, N = 14, S_occ = 5 gives
  // J = C - N + S_occ = -4. J = sum over nets of (segments - 1) and every term
  // is at least zero, so a negative J describes no layout whatsoever. ...' -
  // a board COST §1.6 derives by hand, refused as impossible. With `pinCount`
  // taken from them instead it failed on the first assertion, 'expect(received)
  // .toEqual(expected) / - Expected - 1 / + Received + 1'. Both reverted.
  const targets = lowBoostTargets()
  const score = scoreDumpText(await Bun.file(FROZEN_DUMP).text(), targets, loadRules())
  expect([score.netCount, score.pinCount, score.occupied, score.cuts]).toEqual([9, 27, 5, 5])
  expect(score.joins).toBe(1)
  expect(score.clustering).toBeCloseTo(1 / 18, 10)
  expect(score.objective).toBe(6)
  expect([targets.netCount, targets.pinCount], "the model's N and P, which are NOT these")
    .toEqual([14, 50])
})

test("N is the NODE count and not the copper graph's component count", async () => {
  // THE NAMED HAZARD: `copperGraph(...).componentCount` counts connected
  // regions of the WHOLE CANVAS - every empty strip is one - so it is a fact
  // about the drawing area and not about the circuit. On the frozen dump the
  // canvas is fourteen rows by thirty-two columns and its component count is
  // nowhere near the nine nets the board has.
  //
  // MUTATION RUN: with `netCount` taken from the targets this failed with
  // 'error: negative-joins: C = 5, N = 14, S_occ = 5 gives J = C - N + S_occ =
  // -4. ...' before reaching either assertion. Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  const dump = boardGeometry(text)
  const score = scoreDump(dump, lowBoostTargets(), loadRules(), countLines(text))
  expect(score.netCount, "COST §1.6's N for low-boost").toBe(9)
  expect(copperGraph(dump).componentCount).toBeGreaterThan(score.netCount)
})

test("the identity's terms come off the dump, not off the model-sourced targets", () => {
  // Changing the targets' N and P to numbers the dump contradicts changes
  // NOTHING in the Score. Only `board` and `cutFloor` are read from it.
  //
  // MUTATION RUN: with `netCount` taken from the targets this failed with
  // 'error: negative-joins: C = 1, N = 7, S_occ = 2 gives J = C - N + S_occ =
  // -4. ...' - the lying N is impossible against this dump's own cuts and
  // strips, so it does not even reach the assertion. With `pinCount` taken
  // from them it failed with 'error: pinCount / Expected: 4 / Received: 99'.
  // Both reverted.
  const rules = loadRules()
  const honest = scoreDumpText(TEXT, FIXTURE_TARGETS, rules)
  const lying = scoreDumpText(TEXT, { ...FIXTURE_TARGETS, netCount: 7, pinCount: 99 }, rules)
  expect(lying.netCount, "netCount").toBe(2)
  expect(lying.pinCount, "pinCount").toBe(4)
  expect(lying).toEqual(honest)
  expect(honest.joins).toBe(1)
  expect(honest.clustering).toBe(1 / 2)
})

test("V2: a dump whose CUT_STATE is not COMPUTED refuses before it scores", () => {
  // HC2 and COST H2: under UNRESOLVED the cut list is ABSENT rather than
  // empty, so C is not the count a derivation produced and the identity
  // cannot describe the board. `transistor-preamp-lab` is this case live, and
  // it is the board whose J = -1 the refusal below was modelled on.
  //
  // MUTATION RUN, AND IT SETTLES WHETHER THIS CHECK IS REDUNDANT: with the
  // cutState clause deleted this failed with 'Expected to start with:
  // "score-cuts-not-computed:" / Received: ""' - NO refusal at all, the board
  // scoring happily. The negative-J reading did not catch it, because this
  // fixture's C, N and S_occ still give J = 1 - 2 + 2 = 1 under UNRESOLVED;
  // what CRITERIA HC2 calls the cheap second reading of the same condition
  // only fires when the absent cut list happens to make J negative, as it does
  // on transistor-preamp-lab. So the state is read directly. Reverted.
  //
  // AND HC2 IS READ FIRST ON BOTH ENTRY POINTS, which is checkable rather than
  // asserted: with the parser made to drop a `CUT` line - so this fixture is
  // both UNRESOLVED and mis-parsed, and has a count disagreement as well -
  // twelve tests failed on `score-count-disagreement` and THIS ONE PASSED,
  // because `scoreDumpText` does no checking of its own and `scoreDump` reads
  // `cutState` before it compares. Reverted.
  const unresolved = TEXT.replace("CUT_STATE COMPUTED", "CUT_STATE UNRESOLVED")
  const message = refusalFrom(() => scoreDumpText(unresolved, FIXTURE_TARGETS, loadRules()))
  expect(message).toStartWith("score-cuts-not-computed:")
  expect(message).toContain("CUT_STATE")
  expect(message).toContain("UNRESOLVED")
  expect(message).toContain("H2")
})

test("V2: a negative J refuses, for a different reason, and says which", () => {
  // Nine nets declared over one cut and two occupied strips gives
  // J = 1 - 9 + 2 = -6, and J = sum(k - 1) cannot be below zero. The refusal
  // is `targets.ts`'s, which is the point: the identity has ONE
  // implementation, and a second copy here would make V2 a comparison of a
  // module against a copy of itself.
  //
  // MUTATION RUN: with `scoreDump` computing `Math.max(0, C - N + S_occ)`
  // inline instead of calling `segmentJoins` this failed with 'Expected to
  // start with: "negative-joins:" / Received: "clustering-undefined: J = 0,
  // P = 4, N = 9 gives P - N = -5. ..."' - the clamp does not score happily,
  // it lands on a NEIGHBOURING refusal that names the wrong term and points at
  // the wrong fix. That is why the assertion is anchored on the opening clause
  // rather than written `toThrow(/J/)`, which this mutant passes. Reverted.
  const message = refusalFrom(() => scoreDumpText(NINE_NETS, FIXTURE_TARGETS, loadRules()))
  expect(message).toStartWith("negative-joins:")
  expect(message).toContain("J = C - N + S_occ = -6")
})

// --- K5: the floor invariant ------------------------------------------------

test("K5: a candidate scoring below its declared floor refuses, naming both numbers", () => {
  // F_floor is a LOWER bound, so a candidate beneath it proves one of the two
  // numbers is not the quantity it claims. The alternative is a pipeline that
  // reports beating a bound it derived itself, which is the most convincing
  // wrong answer available to it: (F - F_floor)/max(1, F_0 - F_floor) goes
  // negative and Q2 and A3 both pass with room to spare.
  //
  // MUTATION RUN: with the floor comparison deleted this failed with 'Expected
  // to start with: "score-below-floor:" / Received: ""', and so did the two
  // K5 tests below it - three failures and sixteen passes. Reverted.
  const overstated = { ...FIXTURE_TARGETS, cutFloor: 99 }
  const message = refusalFrom(() => scoreDumpText(TEXT, overstated, loadRules()))
  expect(message).toStartWith("score-below-floor:")
  expect(message).toContain("99")
  expect(message).toContain("fixture")
  expect(message).toContain("2.25")
  expect(message).toContain("floor")
})

test("K5 compares F against the floor, so a candidate AT its floor is kept", async () => {
  // THE BOUNDARY, which `F < F_floor` and `F <= F_floor` disagree about and
  // which a single overstated-floor test cannot see. low-boost's F is 6, from
  // COST §2.2's row, so a declared floor of 6 is met and 7 is not.
  //
  // MUTATION RUN: with the comparison written `objective <= targets.cutFloor`
  // the at-floor case failed with 'Expected: "" / Received: "score-below-
  // floor: pultec-low-boost scores F = 6, below its declared floor of 6
  // (C = 5, W = 0, B = 1). ..."' - a board provably AT its floor refused as
  // impossible, which is the one candidate K5 must not reject, and the only
  // one Q1 may report as `at-floor`. Reverted.
  const text = await Bun.file(FROZEN_DUMP).text()
  const targets = lowBoostTargets()
  const rules = loadRules()
  expect(refusalFrom(() => scoreDumpText(text, { ...targets, cutFloor: 6 }, rules))).toBe("")
  expect(refusalFrom(() => scoreDumpText(text, { ...targets, cutFloor: 7 }, rules)))
    .toStartWith("score-below-floor:")
})

test("K5's refusal fires rather than a negative gap reaching the report", () => {
  // The distinction the whole check exists for: a below-floor score is a
  // VERIFICATION FAILURE, not an unexpectedly good result. Nothing is
  // returned, so there is no Score carrying a negative gap for a report to
  // present as success.
  //
  // MUTATION RUN: with the floor comparison deleted this failed with
  // 'expect(received).toThrow() / Received function did not throw / Received
  // value: {' followed by the Score it should never have produced. Reverted.
  const overstated = { ...FIXTURE_TARGETS, cutFloor: 99 }
  expect(() => scoreDumpText(TEXT, overstated, loadRules())).toThrow()
  expect(() => scoreDump(boardGeometry(TEXT), overstated, loadRules(), countLines(TEXT)))
    .toThrow()
})

test("the scorer cannot be reached without the second path having run", () => {
  // THE STRUCTURAL GUARD, and this test is what says out loud what the type
  // system is enforcing - the review's I1, and the bypass this file previously
  // demonstrated by calling `scoreDump` with three arguments.
  //
  // `scoreDump`'s fourth parameter is an `IndependentCount`, whose brand is a
  // `unique symbol` that `score.ts` does not export, so `countLines` is the
  // only thing in the repository that can produce one. There is therefore no
  // three-argument call to make and no way to score a candidate with V1
  // skipped. It is checked HERE AS A COMPILE-TIME FACT rather than as a
  // runtime assertion, because that is what it is: the two lines below are the
  // shape a caller must write, and `bun run typecheck` is the gate.
  //
  // DRIVEN, so it is not a claim about the type system: a plain
  // `{ cuts: 1, wires: 1, solder: 1 }` in that position fails typecheck with
  // 'error TS2345: Argument of type "{ cuts: number; wires: number; solder:
  // number; }" is not assignable to parameter of type "IndependentCount".
  // Property "[COUNTED_FROM_TEXT]" is missing in type "{ cuts: number; wires:
  // number; solder: number; }" but required in type "IndependentCount".' -
  // and `COUNTED_FROM_TEXT` cannot be named here to supply it, because
  // `score.ts` does not export it. Reverted.
  const counted = countLines(TEXT)
  expect(scoreDump(boardGeometry(TEXT), FIXTURE_TARGETS, loadRules(), counted).objective)
    .toBe(2.25)
  // And the witness is held against the dump rather than taken on trust: a
  // count of some OTHER text in that position is refused, not believed.
  const otherText = TEXT.replace("CUT 0,1,1 0,2,2", "CUT 0,1,1 0,2,2\nCUT 1,1,1 1,2,2")
  const message = refusalFrom(
    () => scoreDump(boardGeometry(TEXT), FIXTURE_TARGETS, loadRules(), countLines(otherText)),
  )
  expect(message).toStartWith("score-count-disagreement:")
  expect(message).toContain("the parsed dump has 1 and the raw text has 2")
})

test("the floor is read from the targets and no floor is defaulted when scoring", () => {
  // P0 derives the floor; the scorer only compares against it. Every Pultec
  // section's floor is zero at HC6's 34 strips (COST §2.3), so the fixture's
  // own zero is the realistic case rather than a convenience, and F = 2.25
  // clears it.
  expect(lowBoostTargets().cutFloor).toBe(0)
  expect(scoreDumpText(TEXT, FIXTURE_TARGETS, loadRules()).objective).toBeGreaterThan(0)
})
