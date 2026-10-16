/**
 * `A1`-`A4`: admissibility, and the four conditions reported INDIVIDUALLY.
 *
 * *"A layout that fails `A1` and a layout that merely misses an optimisation
 * target are not the same object and must not share a verdict."* So every test
 * here that spoils one condition asserts the OTHER three still hold - a
 * conjunction tested only through its conjunction passes while three of its
 * four terms are wired to each other.
 *
 * THE CASE THIS MODULE EXISTS FOR is CRITERIA section 5's worked one, which is
 * driven from `./stop.test.ts` because it is a statement about `Q2`: `A2` and
 * `A3` are differently normalised, so `A3` can hold while `A2` fails on one
 * candidate, and a stopping rule guarded by `A1` alone stops the run there.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { moduleRepoRoot } from "../../tools/perfboard/repo-root.ts"
import { CONSTRAINT_IDS, broken, holds } from "../../tools/stripboard/constraints-model.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import { FROZEN_MARK } from "../../tools/stripboard/seed-compare.ts"
import { admissible, fullyAdmissible, lowBoostBoardIn } from "../../tools/stripboard/verdict.ts"
import { bareLiteral } from "./bare-literal.ts"
import {
  LOW_BOOST,
  TARGETS,
  admissibilityInput,
  evaluation,
  failedResults,
  heldResults,
} from "./stop-fixtures.ts"

const rules = loadRules()
const MODULE = path.join(import.meta.dir, "..", "..", "tools", "stripboard", "verdict.ts")

/** A tau, used only to reach `A3`'s arithmetic. NOT a default - see `./stop.test.ts`. */
const toleranceRules: StripboardRules = { ...rules, tau: 0.05 }

/** The score of a candidate one cut above a floor of zero, with the clustering stated. */
function scoreWith(cuts: number, wires: number, clustering: number) {
  return evaluation({ cuts, wires, joins: 1, occupied: 9, clustering }).score
}

test("all four hold on a healthy candidate, and fullyAdmissible is their conjunction", () => {
  const result = admissible(admissibilityInput())
  expect([result.a1, result.a2, result.a4]).toEqual([true, true, true])
  // `a3` is three-valued and the committed rules leave `tau` unset, so it is
  // NEITHER held nor failed - which is the distinction a boolean erased.
  expect(result.a3).toBe("not-evaluated")
  expect(fullyAdmissible(result)).toBe(true)
  for (const key of ["a1", "a2", "a3", "a4"] as const) {
    expect(result.detail[key], key).not.toBe("")
  }
})

test("each condition failing alone is reported individually, the other three still holding", () => {
  // A1: one hard constraint broken.
  const one = admissible(admissibilityInput({ results: failedResults() }))
  expect([one.a1, one.a2, one.a3, one.a4]).toEqual([false, true, "not-evaluated", true])
  expect(one.detail.a1).toMatch(/HC4/)

  // A2: clustering above the committed bound of 0.05.
  const two = admissible(admissibilityInput({ score: scoreWith(1, 0, 0.2) }))
  expect([two.a1, two.a2, two.a3, two.a4]).toEqual([true, false, "not-evaluated", true])

  // A3: a gap of 1/40 against a tolerance below it.
  const three = admissible(
    admissibilityInput({ rules: { ...rules, tau: 0.001 }, initialObjective: 40 }),
  )
  expect([three.a1, three.a2, three.a3, three.a4]).toEqual([true, true, "failed", true])

  // A4: the frozen fixture one cut past B1-frozen's mark.
  const four = admissible(
    admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(6, 0, 0) }),
  )
  expect([four.a1, four.a2, four.a3, four.a4]).toEqual([true, true, "not-evaluated", false])

  for (const result of [one, two, three, four]) expect(fullyAdmissible(result)).toBe(false)
})

test("A1 is the grader's, so a result set that is not the ten is refused rather than folded", () => {
  const short = heldResults().slice(0, CONSTRAINT_IDS.length - 1)
  expect(() => admissible(admissibilityInput({ results: short }))).toThrow(/hard/)
  expect(admissible(admissibilityInput()).detail.a1).toMatch(/all ten/)
})

test("A2's detail names kappa, kappa_bench and what bound the clustering", () => {
  const result = admissible(
    admissibilityInput({
      score: scoreWith(1, 0, 0.2),
      binding: {
        kind: "span",
        board: "pultec-mid",
        nets: ["VBIAS", "OUT"],
        bound: "maxSpanHoles",
      },
    }),
  )
  expect(result.detail.a2).toMatch(/kappa_bench/)
  expect(result.detail.a2).toMatch(/0\.05/)
  expect(result.detail.a2).toMatch(/maxSpanHoles/)
  expect(result.detail.a2).toMatch(/VBIAS/)
})

test("A2's detail may report the search having stopped, said plainly as that", () => {
  // REP2: where neither a span bound nor a packing infeasibility applies, the
  // stopping rule is said plainly AS THE SEARCH HAVING STOPPED rather than as
  // a constraint - and K3 then refuses to move the bound on that evidence.
  const stopped = admissible(
    admissibilityInput({
      score: scoreWith(1, 0, 0.2),
      binding: { kind: "search-stopped", rule: "Q5" },
    }),
  )
  expect(stopped.detail.a2).toMatch(/search/)
  expect(stopped.detail.a2).toMatch(/Q5/)
  expect(stopped.detail.a2).not.toMatch(/binding constraint/)
  // A packing infeasibility IS a constraint and is worded as one.
  const packed = admissible(
    admissibilityInput({
      score: scoreWith(1, 0, 0.2),
      binding: { kind: "packing", board: "pultec-mid", detail: "no arrangement fits 23 nets" },
    }),
  )
  expect(packed.detail.a2).toMatch(/binding constraint/)
  expect(packed.detail.a2).toMatch(/packing/)
})

test("an A2 failure with no binding constraint stated says so, rather than refusing", () => {
  // A verdict that threw here could not report the failure, and REP2 requires
  // it reported. What it may not do is let K3 move the bound on it.
  const result = admissible(admissibilityInput({ score: scoreWith(1, 0, 0.2), binding: undefined }))
  expect(result.a2).toBe(false)
  expect(result.detail.a2).toMatch(/No binding constraint was stated/)
  expect(result.detail.a2).toMatch(/K3/)
})

test("A2 cannot refuse a layout at the floor, whatever kappa_bench is", () => {
  // C = C_floor requires kappa = 0, which is inside ANY positive kappa_bench.
  // This is what bounds the damage an aggressive value can do, and is all it
  // bounds.
  for (const kappaBench of [0.05, 0.01, 0.001]) {
    const atFloor = admissible(
      admissibilityInput({ rules: { ...rules, kappaBench }, score: scoreWith(0, 0, 0) }),
    )
    expect(atFloor.a2, String(kappaBench)).toBe(true)
  }
})

test("A3 does not fire while tau is unset, and claims no target met", () => {
  expect(rules.tau).toBeNull()
  const result = admissible(admissibilityInput())
  expect(result.a3).toBe("not-evaluated")
  expect(result.detail.a3).toMatch(/tau is UNSET/)
  expect(result.detail.a3).toMatch(/DOES NOT FIRE/)
  expect(result.detail.a3).toMatch(/reported rather than graded/)
  // The gap is in the detail, which is what K4 asks a valid run to report.
  expect(result.detail.a3).toMatch(/derived floor of 0/)
})

test("A3 fires on the tolerance when tau is set, both ways", () => {
  // F = 1 against a floor of 0 and F_0 = 40 is a gap of 1/40 = 0.025.
  const inside = admissible(admissibilityInput({ rules: toleranceRules, initialObjective: 40 }))
  expect(inside.a3).toBe("held")
  expect(inside.detail.a3).toMatch(/inside it/)
  // The same candidate against a run that started nearer the floor: F_0 = 2
  // gives a gap of 1/2, outside it.
  const outside = admissible(admissibilityInput({ rules: toleranceRules, initialObjective: 2 }))
  expect(outside.a3).toBe("failed")
  expect(outside.detail.a3).toMatch(/outside it/)
})

test("A3 refuses a candidate below the floor rather than passing with room to spare", () => {
  expect(() =>
    admissible(
      admissibilityInput({
        rules: toleranceRules,
        targets: { ...TARGETS, cutFloor: 3 },
        score: scoreWith(0, 0, 0),
      }),
    ),
  ).toThrow(/verdict-negative-gap/)
})

test("an unevaluated A3 satisfies admissibility without reading as a target met", () => {
  // K4: while tau is unset "the admissibility verdict rests on A1, A2 and A4",
  // so A3 may not block a layout - AND REP5 must still be able to tell a held
  // A3 from one that never ran, which a boolean could not. Both halves here.
  const unset = admissible(admissibilityInput())
  expect(unset.a3).toBe("not-evaluated")
  expect(fullyAdmissible(unset)).toBe(true)
  const held = admissible(admissibilityInput({ rules: toleranceRules, initialObjective: 40 }))
  expect(held.a3).toBe("held")
  expect(fullyAdmissible(held)).toBe(true)
  // The two are distinguishable WITHOUT reading a string, which is the fix.
  expect(unset.a3).not.toBe(held.a3)
  const failed = admissible(admissibilityInput({ rules: toleranceRules, initialObjective: 2 }))
  expect(failed.a3).toBe("failed")
  expect(fullyAdmissible(failed)).toBe(false)
})

test("A3 refuses a missing F_0 when tau is set, and does not ask for one when it is unset", () => {
  expect(() =>
    admissible(admissibilityInput({ rules: toleranceRules, initialObjective: undefined })),
  ).toThrow(/verdict-no-initial-objective/)
  expect(admissible(admissibilityInput({ initialObjective: undefined })).a3).toBe(
    "not-evaluated",
  )
})

test("A3 needs no F_0 at the floor, so a first-climb at-floor candidate is graded", () => {
  // THE NUMERATOR IS ZERO THERE, so the tolerance is zero for any F_0 and the
  // denominator is never reached. This used to throw, on the pipeline's best
  // outcome: see stop.test.ts's first-climb Q1 test.
  const atFloor = admissible(
    admissibilityInput({
      rules: toleranceRules,
      initialObjective: undefined,
      score: scoreWith(0, 0, 0),
    }),
  )
  expect(atFloor.a3).toBe("held")
  expect(atFloor.detail.a3).toMatch(/a gap of 0 /)
})

test("A4's board name is tied to boards/, so a rename refuses rather than going vacuous", () => {
  // A NAME-ONLY WHITELIST FAILS SILENTLY IN THE WORST DIRECTION: the name stops
  // matching, A4 is vacuously true everywhere, and the externally authored
  // benchmark quietly stops applying. So the name is checked against a
  // directory that has to exist.
  expect(lowBoostBoardIn(moduleRepoRoot())).toBe("pultec-low-boost")
  expect(fs.existsSync(path.join(moduleRepoRoot(), "boards", "pultec-low-boost"))).toBe(true)
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-verdict-"))
  try {
    expect(() => lowBoostBoardIn(empty)).toThrow(/verdict-low-boost-board-missing/)
    // The refusal says what to do, and a failing check is NOT cached: asking
    // twice refuses twice.
    expect(() => lowBoostBoardIn(empty)).toThrow(/LOW_BOOST_BOARD/)
    // A file where the directory should be is not a board either.
    fs.mkdirSync(path.join(empty, "boards"))
    fs.writeFileSync(path.join(empty, "boards", "pultec-low-boost"), "not a directory\n")
    expect(() => lowBoostBoardIn(empty)).toThrow(/verdict-low-boost-board-missing/)
  } finally {
    fs.rmSync(empty, { recursive: true, force: true })
  }
})

test("A4 is vacuous off low-boost, and says that rather than reading as a benchmark met", () => {
  const result = admissible(admissibilityInput())
  expect(result.a4).toBe(true)
  expect(result.detail.a4).toMatch(/stop-fixture/)
  expect(result.detail.a4).toMatch(/vacuous/)
  expect(result.detail.a4).toMatch(/NOT a benchmark this board met/)
})

test("A4 refuses when the run did not say which low-boost board it ran", () => {
  expect(() => admissible(admissibilityInput({ targets: LOW_BOOST, frozen: undefined }))).toThrow(
    /verdict-board-unstated/,
  )
  // The refusal names both clauses and the fix, so a reader knows what to state.
  expect(() => admissible(admissibilityInput({ targets: LOW_BOOST }))).toThrow(/B1-frozen/)
  expect(() => admissible(admissibilityInput({ targets: LOW_BOOST }))).toThrow(/B1-current/)
})

test("A4 says which board ran, and a scaffolded run may not claim B1-frozen", () => {
  const scaffolded = admissible(admissibilityInput({ targets: LOW_BOOST, frozen: false }))
  expect(scaffolded.detail.a4).toMatch(/B1-current/)
  expect(scaffolded.detail.a4).not.toMatch(/B1-frozen/)
  const frozen = admissible(admissibilityInput({ targets: LOW_BOOST, frozen: true }))
  expect(frozen.detail.a4).toMatch(/B1-frozen/)
  expect(frozen.detail.a4).not.toMatch(/B1-current/)
})

test("A4's frozen clause is B1-frozen's own mark, read through seed-compare's one copy", () => {
  // The mark is not restated here: FROZEN_MARK is cuts = 5, wires = 0, every
  // net complete, and it carries the owner's commits as its provenance.
  const met = admissible(
    admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(5, 0, 0) }),
  )
  expect(met.a4).toBe(true)
  expect(met.detail.a4).toContain(FROZEN_MARK.source)
  // One cut past it, one wire on it, or a net incomplete: each alone fails.
  const tooManyCuts = admissible(
    admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(6, 0, 0) }),
  )
  expect(tooManyCuts.a4).toBe(false)
  const wired = admissible(
    admissibilityInput({ targets: LOW_BOOST, frozen: true, score: scoreWith(5, 1, 0) }),
  )
  expect(wired.a4).toBe(false)
  const incomplete = CONSTRAINT_IDS.map((id) =>
    id === "HC1" ? broken(id, "fixture: a net is incomplete") : holds(id, "fixture: held"),
  )
  const unfinished = admissible(
    admissibilityInput({
      targets: LOW_BOOST,
      frozen: true,
      score: scoreWith(5, 0, 0),
      results: incomplete,
    }),
  )
  expect(unfinished.a4).toBe(false)
  expect(unfinished.detail.a4).toMatch(/every net complete = false/)
})

test("A4's scaffolded clause grades nothing while tau is unset, and says so", () => {
  const scaffolded = admissible(admissibilityInput({ targets: LOW_BOOST, frozen: false }))
  expect(scaffolded.a4).toBe(true)
  expect(scaffolded.detail.a4).toMatch(/does not fire while tau is unset/)
  expect(scaffolded.detail.a4).toMatch(/no absolute cut count/)
})

test("A4's scaffolded clause is A3's arithmetic once tau is set", () => {
  const inside = admissible(
    admissibilityInput({
      targets: LOW_BOOST,
      frozen: false,
      rules: toleranceRules,
      initialObjective: 40,
    }),
  )
  expect([inside.a3, inside.a4]).toEqual(["held", true])
  // B1-current carries NO absolute cut count, so six cuts inside the tolerance
  // still meets it - which is exactly what distinguishes it from B1-frozen.
  const sixCuts = admissible(
    admissibilityInput({
      targets: LOW_BOOST,
      frozen: false,
      rules: toleranceRules,
      initialObjective: 400,
      score: scoreWith(6, 0, 0),
    }),
  )
  expect(sixCuts.a4).toBe(true)
  // And the same six cuts on the FROZEN fixture do not.
  const frozenSix = admissible(
    admissibilityInput({
      targets: LOW_BOOST,
      frozen: true,
      rules: toleranceRules,
      initialObjective: 400,
      score: scoreWith(6, 0, 0),
    }),
  )
  expect(frozenSix.a4).toBe(false)
})

test("fullyAdmissible is the conjunction and nothing more", () => {
  // It is NOT outcomeOf: Task 20's taxonomy has three outcomes, and the
  // distinction between the two non-admissible ones is REP5's whole point.
  const invalid = admissible(admissibilityInput({ results: failedResults() }))
  const belowTarget = admissible(admissibilityInput({ score: scoreWith(1, 0, 0.2) }))
  expect(fullyAdmissible(invalid)).toBe(false)
  expect(fullyAdmissible(belowTarget)).toBe(false)
  // Both are false here, and which one is which is read off the four fields.
  expect([invalid.a1, belowTarget.a1]).toEqual([false, true])
})

test("a literal scan finds no bare threshold in verdict.ts - a scan, not a proof", async () => {
  // The per-module half of V9, with the same pattern Task 22 sweeps the tree
  // with. The behavioural half is above: kappa_bench, tau and B1-frozen's mark
  // all move this module's verdict when their own source moves.
  const text = await Bun.file(MODULE).text()
  expect([...text.matchAll(bareLiteral())].map((match) => match[0])).toEqual([])
})

test("verdict.ts is within this repository's line ceiling", async () => {
  const text = await fs.promises.readFile(MODULE, "utf8")
  expect(text.split("\n").length).toBeLessThan(501)
})
