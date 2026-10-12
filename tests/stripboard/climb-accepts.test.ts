/**
 * Task 17: THE ACCEPTANCE RULE, on hand-built `Evaluation`s and no spawn at all.
 *
 * **SPLIT FROM `./climb.test.ts` FOR THE LINE CEILING, at the seam the brief
 * itself draws**: *"`accepts` is exported so the acceptance rule is testable
 * without a spawn"*. Everything here is a pure comparison of two records; every
 * test that drives a climb against an injected fork is in `./climb.test.ts`.
 *
 * **THE FIRST TEST IS THE ONE THIS WHOLE DESIGN RESTS ON.** A ranking term
 * cannot make the climb accept a worse `F`. If it ever passes while `F` rose,
 * `A_occ` - the occupied board area - has become an objective nobody
 * authorised, and every later run's number would be about a different quantity
 * than the one `OBJ1` names.
 *
 * Nothing here calls `evaluate`, so these test `accepts` against hand-written
 * numbers rather than `accepts` against the rest of its own module.
 */
import { expect, test } from "bun:test"
import { accepts, type Evaluation } from "../../tools/stripboard/climb.ts"
import type { StripboardRules } from "../../tools/stripboard/rules.ts"
import {
  BETTER_TUPLE,
  evaluation,
  rulesWithoutWorseAcceptance,
  rulesWithWorseAcceptance,
} from "./climb-fixtures.ts"

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

const base = evaluation()

/**
 * `accepts` against ONE board, where the predecessor and the incumbent
 * coincide.
 *
 * Every test below compares a candidate with a single other board, which is the
 * case the round's FIRST move is in - the base and the best are the same board
 * until something has been accepted. The case where they DIFFER is the one a
 * correctness bug lived in, and it has two tests of its own: the unit test at
 * the bottom of this file, and the sibling-order test in `./climb.test.ts`
 * which drives a real round.
 */
function against(current: Evaluation, candidate: Evaluation, rules: StripboardRules): boolean {
  return accepts({ predecessor: current, incumbent: current, candidate }, rules)
}

test("a ranking term cannot make the climb accept a worse F", () => {
  // OBJ3. The candidate below has a strictly better ranking tuple - zero in
  // every one of RANKING's five positions against the base's ones - and a worse
  // F. It must be rejected. If this test ever passes while F rose, the search is
  // optimising something nobody authorised.
  const worseF = {
    ...base,
    score: { ...base.score, objective: base.score.objective + 1 },
    ranking: [0, 0, 0, 0, 0],
  }
  expect(against(base, worseF, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a strictly better F is accepted", () => {
  const better = { ...base, score: { ...base.score, objective: base.score.objective - 1 } }
  expect(against(base, better, rulesWithoutWorseAcceptance())).toBe(true)
})

test("an equal F with a strictly better ranking is accepted, and an equal tuple is not", () => {
  const plateauBetter = { ...base, ranking: BETTER_TUPLE }
  const plateauSame = { ...base }
  expect(against(base, plateauBetter, rulesWithoutWorseAcceptance())).toBe(true)
  expect(against(base, plateauSame, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a candidate failing any hard constraint is rejected whatever its F", () => {
  // The base board holds all ten, so HC1 failing here is a REGRESSION this
  // move caused, and no F is cheap enough to buy it.
  //
  // **`openNets` IS LEFT AT THE BASE'S ZERO ON PURPOSE**, so the rejection is
  // attributable to the no-regression clause and to nothing else: a candidate
  // with MORE open nets than the incumbent is also rejected, by the ordering's
  // first key, and a fixture that broke both at once would survive the deletion
  // of either. The board this fixture describes is the one
  // `tools/stripboard/constraints-electrical.ts` names - `--check` exits
  // non-zero while naming no incomplete net, so HC1 fails on the status alone.
  const cheapAndBroken = {
    ...base,
    admissibleA1: false,
    score: { ...base.score, objective: 0 },
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  expect(against(base, cheapAndBroken, rulesWithoutWorseAcceptance())).toBe(false)
})

test("a constraint already broken before the move does not by itself reject the candidate", () => {
  // THE DEADLOCK THIS RULE EXISTS TO BREAK. Every starting arm begins from a
  // board with incomplete nets, so HC1 fails on the start; under an
  // A1-gates-every-step rule no single gesture could ever be accepted, because
  // no one gesture flips the conjunction of ten. Here HC1 is broken on BOTH
  // sides and the candidate is strictly cheaper, so it is accepted.
  //
  // **BOTH SIDES CARRY THE SAME OPEN-NET COUNT, which is what the deadlock
  // actually looks like**: one net open before the move and the same net open
  // after it. The ordering's first key is then tied and `F` decides, so this
  // test says what its name says - and a candidate that CLOSED that net would
  // be accepted by the key instead, which is the test below.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    openNets: 1,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const stillBrokenButCheaper = {
    ...brokenBefore,
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(against(brokenBefore, stillBrokenButCheaper, rulesWithoutWorseAcceptance())).toBe(true)
  // And it is still rejected if it breaks a SECOND constraint on the way.
  const alsoBreaksHC3 = {
    ...stillBrokenButCheaper,
    results: stillBrokenButCheaper.results.map((result) =>
      result.id === "HC3" ? { ...result, held: false } : result,
    ),
  }
  expect(against(brokenBefore, alsoBreaksHC3, rulesWithoutWorseAcceptance())).toBe(false)
})

test("repairing a constraint other than HC1 is not an acceptance of its own: F still decides", () => {
  // Fitting the stock is not itself a cheaper board. A candidate that repairs
  // HC6 while F rises is rejected like any other worse candidate - otherwise
  // "repair" would be a second objective nobody declared.
  //
  // **THIS TEST WAS WRITTEN ON `HC1` AND IS NOW WRITTEN ON `HC6`**, because the
  // claim it makes is no longer true of `HC1`: the open-net count is the
  // ordering's FIRST KEY, so closing a net IS an acceptance of its own, at any
  // `F`. The test below is that case. Nine of the ten constraints are unchanged
  // and `HC6` is one of them, so the old claim keeps a test rather than being
  // deleted along with the reading that made it false.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  const repairedButDearer = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective + 1 },
  }
  expect(against(brokenBefore, repairedButDearer, rulesWithoutWorseAcceptance())).toBe(false)
  const repairedAndCheaper = {
    ...base,
    score: { ...base.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(against(brokenBefore, repairedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

/**
 * The open-net count: one board with a net open, and the same board with it
 * closed at a HIGHER `F` and a WORSE ranking tuple.
 *
 * Every test in this group is built from these two, so the only difference
 * between them is the fact under test.
 */
const oneNetOpen = {
  ...base,
  admissibleA1: false,
  openNets: 1,
  results: base.results.map((result) =>
    result.id === "HC1" ? { ...result, held: false } : result,
  ),
}

test("a candidate that closes a net is accepted although F rises and the ranking worsens", () => {
  // THE CHANGE'S WHOLE CONTENT. CRITERIA section 2 on the ten hard
  // constraints: "nothing in them is tradeable", and A1 repeats it - "Nothing
  // is tradeable." HC1's own reason is the clause that settles the direction:
  // "a board that does not conduct has no cost worth reporting". So closing a
  // net is not bought at a price, and the figure it would have been bought
  // against is deliberately made as unfavourable as the fixture can: F rises by
  // 100 and every ranking position is worse.
  //
  // The measurement this exists to answer is `docs/stripboard/
  // pipeline-verification.md` section 6.9: 63 rounds removed six cuts and
  // closed ONE net of fourteen, because nothing the search optimised mentioned
  // completeness.
  const closedButDearer = {
    ...base,
    openNets: 0,
    score: { ...base.score, objective: oneNetOpen.score.objective + 100 },
    ranking: oneNetOpen.ranking.map((position) => position + 10),
  }
  expect(against(oneNetOpen, closedButDearer, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a candidate that opens a net is rejected however much cheaper the board is", () => {
  // THE OTHER HALF OF DOMINANCE, and the half a weighted term would get wrong:
  // under any finite weight there is a cut count cheap enough to buy an open
  // net, and that is the trade section 2 forbids. Here the candidate breaks
  // NOTHING its predecessor held - HC1 is broken on both sides - so the
  // no-regression clause permits it and only the first key refuses it.
  const twoNetsOpen = {
    ...oneNetOpen,
    openNets: 2,
    score: { ...oneNetOpen.score, objective: oneNetOpen.score.objective - 100 },
    ranking: [0, 0, 0, 0, 0],
  }
  expect(against(oneNetOpen, twoNetsOpen, rulesWithoutWorseAcceptance())).toBe(false)
})

test("E3's bound buys a worse F and never an open net", () => {
  // PAR3 leaves the bound unset, so this is the mechanism rather than a
  // committed run. A bound large enough to swallow the difference in F must
  // still not accept a candidate with a net more open than the incumbent's:
  // the bound is a bound on F, and an open net is not priced in F at all.
  const opensANetWithinTheBound = {
    ...oneNetOpen,
    openNets: 2,
    score: { ...oneNetOpen.score, objective: oneNetOpen.score.objective + 1 },
  }
  expect(against(oneNetOpen, opensANetWithinTheBound, rulesWithWorseAcceptance(2))).toBe(false)
  // And the bound still works where the key is tied, which is what makes the
  // assertion above about the key rather than about a broken bound.
  const dearerWithinTheBound = {
    ...oneNetOpen,
    score: { ...oneNetOpen.score, objective: oneNetOpen.score.objective + 1 },
  }
  expect(against(oneNetOpen, dearerWithinTheBound, rulesWithWorseAcceptance(2))).toBe(true)
})

test("an Evaluation claiming open nets beside an HC1 that holds is refused", () => {
  // Both fields are readings of one --check report, so no measurement produces
  // this pair: it is a record built by hand with the search's first key saying
  // one thing and the hard constraint saying the other. It is not reconciled to
  // either side.
  const incoherent = { ...base, openNets: 3 }
  const refusal = refusalFrom(() => against(base, incoherent, rulesWithoutWorseAcceptance()))
  expect(refusal).toContain("records openNets = 3")
  expect(refusal).toContain("beside an HC1 that HOLDS")
  // The reverse is NOT refused, and that is deliberate: HC1 reads the exit
  // status as well as the net lines, so it can fail while naming no incomplete
  // net.
  expect(() =>
    against(base, { ...base, admissibleA1: false, openNets: 0, results: base.results.map(
      (result) => (result.id === "HC1" ? { ...result, held: false } : result),
    ) }, rulesWithoutWorseAcceptance()),
  ).not.toThrow()
})

test("a regression is matched by constraint id, never by position in the list", () => {
  // Comparing the two result lists index by index would be a claim about
  // gradeHardConstraints' ordering rather than about the constraints, and would
  // compare HC3 against HC4 the moment anything reordered the table.
  //
  // THE FIXTURE HAS TO DISCRIMINATE IN THE ACCEPT DIRECTION, and the first
  // version of this test did not - a survivor in the mutation run proved it.
  // It reversed the candidate's ten with HC10 broken, where the positional
  // reading finds HC1 held in the base at that index and rejects too: both
  // readings said no, for different reasons, and the test passed either way.
  //
  // So: HC1 is broken on BOTH sides, the candidate's ten are REVERSED (HC1 now
  // last), and the candidate is cheaper. By id this is no regression and the
  // move is accepted. By POSITION the candidate's index 9 is broken HC1 against
  // the base's index 9, held HC10 - so a positional reading invents a
  // regression and rejects.
  const brokenBefore = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  const reversedAndCheaper = {
    ...brokenBefore,
    results: [...brokenBefore.results].reverse(),
    score: { ...brokenBefore.score, objective: brokenBefore.score.objective - 1 },
  }
  expect(reversedAndCheaper.results[9]?.id).toBe("HC1")
  expect(reversedAndCheaper.results[9]?.held).toBe(false)
  expect(brokenBefore.results[9]?.id).toBe("HC10")
  expect(brokenBefore.results[9]?.held).toBe(true)
  expect(against(brokenBefore, reversedAndCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a move that newly breaks HC6 is rejected, however much cheaper the board is", () => {
  // HC6 IS THE ONE WHOSE REGRESSION WOULD BE EASIEST TO MISS AND WORST TO SHIP:
  // it is "does this fit the stock the owner owns", so a candidate that broke it
  // would be a board that cannot be cut at all. The raw-import climb ends with
  // HC6 already failing, which the no-regression rule permits; what it must
  // never permit is a climb that had HC6 and spent it.
  //
  // It is asserted on HC6 BY NAME rather than left to the generic clause,
  // because the generic clause is tested on HC1 and a reader checking "is the
  // stock protected" should find the answer rather than infer it.
  const spendsTheStock = {
    ...base,
    admissibleA1: false,
    score: { ...base.score, objective: base.score.objective - 100 },
    ranking: [0, 0, 0, 0, 0],
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  expect(against(base, spendsTheStock, rulesWithoutWorseAcceptance())).toBe(false)
  // And the other side of it: a board that ALREADY did not fit is not forbidden
  // from moving, which is the raw-import climb's own case.
  const neverFitted = {
    ...base,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  const stillDoesNotFitButCheaper = {
    ...neverFitted,
    score: { ...neverFitted.score, objective: neverFitted.score.objective - 1 },
  }
  expect(against(neverFitted, stillDoesNotFitButCheaper, rulesWithoutWorseAcceptance())).toBe(true)
})

test("a configured worseAcceptance changes the rule and does not refuse", () => {
  // THIS TEST ASSERTED A REFUSAL UNTIL TASK 18, AND IT IS REWRITTEN RATHER THAN
  // DELETED so the change is visible: while E3 was unimplemented, a bound
  // present in the rules had to refuse, because a configured search behaviour
  // that did not run would make the run record claim something that did not
  // happen. E3 is implemented now, so the bound runs - and what it buys is in
  // `./escapes-search.test.ts`, which holds the bound's own arithmetic.
  //
  // What is held HERE is the half this file is about: the bound does not reach
  // past the no-regression clause. A candidate within the bound that breaks a
  // constraint its predecessor held is still rejected.
  const withinTheBound = {
    ...base,
    score: { ...base.score, objective: base.score.objective + 1 },
  }
  expect(against(base, withinTheBound, rulesWithWorseAcceptance(2))).toBe(true)
  const withinTheBoundButBroken = {
    ...withinTheBound,
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC1" ? { ...result, held: false } : result,
    ),
  }
  expect(against(base, withinTheBoundButBroken, rulesWithWorseAcceptance(2))).toBe(false)
  // And with the committed rules, which leave the bound unset, the same
  // candidate is rejected on F alone.
  expect(against(base, withinTheBound, rulesWithoutWorseAcceptance())).toBe(false)
})

test("an Evaluation whose admissibleA1 disagrees with its own results refuses", () => {
  // Neither field is preferred: admissibleA1 true beside a broken constraint
  // would certify a board against a check that failed.
  const forged = {
    ...base,
    admissibleA1: true,
    results: base.results.map((result) =>
      result.id === "HC8" ? { ...result, held: false } : result,
    ),
  }
  const refusal = refusalFrom(() => against(base, forged, rulesWithoutWorseAcceptance()))
  expect(refusal).toContain("records admissibleA1 = true")
  expect(refusal).toContain("comes to false")
})


test("a regression is measured against the predecessor, never against the incumbent", () => {
  // THE BUG THIS NAMES, AND IT WAS A CORRECTNESS BUG IN THE ACCEPTANCE RULE.
  // Every move in a round is applied to ONE base board, so "the regressions
  // this move caused" is a statement about that board and no other. When the
  // comparison was made against the INCUMBENT, a sibling that incidentally
  // repaired a constraint and became the incumbent made every LATER sibling in
  // the same round - none of which ever had that repair - look like it had
  // BROKEN the constraint. Each was then rejected for a regression it did not
  // cause, so acceptance depended on the order siblings happened to be swept
  // in: irreproducibility that Task 13's canonical hash cannot see, because the
  // hash is over inputs and outcomes and not over a round's internal order.
  //
  // predecessor: HC1 already broken, F = 4. The board the move was applied to.
  // incumbent:   all ten hold, F = 2. An earlier sibling that repaired HC1.
  // candidate:   HC1 broken (as the predecessor had it), F = 1 - the best F of
  //              the three, and it broke nothing.
  const predecessor = {
    ...base,
    admissibleA1: false,
    results: base.results.map((r) => (r.id === "HC1" ? { ...r, held: false } : r)),
  }
  const incumbent = { ...base, score: { ...base.score, objective: 2 } }
  const candidate = {
    ...predecessor,
    score: { ...predecessor.score, objective: 1 },
  }
  expect(accepts({ predecessor, incumbent, candidate }, rulesWithoutWorseAcceptance())).toBe(true)
  // And measuring the regression against the incumbent - the bug - rejects it,
  // which is what this test would have reported before the fix.
  expect(
    accepts(
      { predecessor: incumbent, incumbent, candidate },
      rulesWithoutWorseAcceptance(),
    ),
  ).toBe(false)
  // F is still measured against the INCUMBENT, so a candidate that breaks
  // nothing and beats its predecessor while LOSING to the incumbent is
  // rejected - which is what keeps `best` monotone.
  const worseThanIncumbent = {
    ...predecessor,
    score: { ...predecessor.score, objective: 3 },
  }
  expect(
    accepts({ predecessor, incumbent, candidate: worseThanIncumbent }, rulesWithoutWorseAcceptance()),
  ).toBe(false)
})
