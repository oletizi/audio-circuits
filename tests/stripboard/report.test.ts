/**
 * `renderReport`: what one run says about itself, and what it may not say.
 *
 * SPLIT FROM `./report-taxonomy.test.ts` BY CONCERN - that file drives the
 * three outcomes, the five bound statuses and the two phrasing tables, and this
 * one drives the lines - over the shared `./report-fixtures.ts`. The refusals
 * are in `./report-refusals.test.ts` for the same reason and the line ceiling.
 *
 * **EVERY ASSERTION HERE IS OVER THE RENDERED LINES AND NOT OVER THE SOURCE.**
 * The earlier form of `REP3`'s check asserted the module CONTAINS the strings
 * `WORDING[` and `OUTCOME_WORDING[`, which a file can do and still write a
 * sentence of its own on the next line. So the quality claims are located by
 * their prefix and each one is matched against the tables.
 */
import { expect, test } from "bun:test"
import { floorNote } from "../../tools/stripboard/stop.ts"
import {
  BOUND_STATUSES,
  OUTCOMES,
  OUTCOME_WORDING,
  QUALITY_PREFIX,
  RUN_FAILURE_NOTE,
  WORDING,
  exitCodeFor,
  renderReport,
  type Outcome,
} from "../../tools/stripboard/report.ts"
import { CONSTRAINT_IDS, broken, holds } from "../../tools/stripboard/constraints-model.ts"
import { TARGETS, evaluation } from "./stop-fixtures.ts"
import {
  a1Failure,
  a2OnlyFailure,
  clusteredCandidate,
  divergentCutsRun,
  reportInput,
  runResult,
  runWith,
  runWithWorseAcceptance,
  runWithoutWorseAcceptance,
  underBudgetedRun,
  withinToleranceRun,
} from "./report-fixtures.ts"

/**
 * The quality-line prefix, WRITTEN OUT HERE rather than imported into the
 * pattern.
 *
 * A regex built from `QUALITY_PREFIX` would follow the module wherever it moved
 * the prefix to, and a report whose claims became unmarked would still pass. So
 * the literal is stated and pinned against the export by the first test below.
 */
const QUALITY_LINE = /^quality: /

/** Every quality claim in a report, stripped of its prefix. */
function qualityClaims(lines: readonly string[]): readonly string[] {
  return lines.filter((line) => QUALITY_LINE.test(line)).map((line) => line.replace(QUALITY_LINE, ""))
}

test("the quality prefix the tests look for is the one the module marks claims with", () => {
  expect(QUALITY_PREFIX).toBe("quality: ")
  expect(QUALITY_LINE.test(`${QUALITY_PREFIX}anything`)).toBe(true)
})

test("REP2: the report names the rule, the bound, the outcome and A1-A4 one by one", () => {
  const lines = renderReport(a2OnlyFailure())
  const joined = lines.join("\n")
  expect(joined).toMatch(/A1 /)
  expect(joined).toMatch(/A2 /)
  expect(joined).toMatch(/A3 /)
  expect(joined).toMatch(/A4 /)
  expect(joined).not.toMatch(/^not admissible$/m)
  // The rule that fired and the bound derived from it, both named.
  expect(joined).toMatch(/the stopping rule Q3 that fired/)
  expect(joined).toMatch(/^bound: search-exhausted/m)
  expect(joined).toMatch(/^outcome: valid-below-target$/m)
  // And the gap remaining, which REP2 requires beside the verdict.
  expect(joined).toMatch(/gap above the floor = 1/)
})

test("REP2: which conditions FAILED is legible, not only that one did", () => {
  const joined = renderReport(a2OnlyFailure()).join("\n")
  // A2 PRINTS BY ITS OWN THREE-VALUED NAME, as A3 does, since the owner unset
  // kappa_bench: "failed" rather than "FAILED", because the word has to come
  // from the verdict's own value and "not-evaluated" has no shouty spelling.
  // What REP2 asks is that the failing condition be named, and it is.
  expect(joined).toMatch(/^A2 failed: /m)
  expect(joined).not.toMatch(/^A2 held/m)
  expect(joined).not.toMatch(/^A2 not-evaluated/m)
  expect(joined).toMatch(/^A1 held: /m)
  expect(joined).toMatch(/^A4 held: /m)
})

test("A2's third state reaches the report by its own name, and carries the measured kappa", () => {
  // THE SAME GUARD A3 HAS, FOUND BY MUTATION. With the A2 line printed as a
  // boolean - `verdict.a2 !== "failed" ? "held" : "FAILED"` - every run under
  // the committed rules printed "A2 held" against a bound the owner unset, a
  // clustering target reported as met that nothing graded, and only the FAILED
  // case was asserted anywhere. The default fixture's kappa is 0 and this run's
  // is 0.2, so the line also proves the measurement survives the withdrawal.
  const joined = renderReport(reportInput({ run: runResult({ best: clusteredCandidate() }) }))
    .join("\n")
  expect(joined).toMatch(/^outcome: admissible$/m)
  expect(joined).toMatch(/^A2 not-evaluated: /m)
  expect(joined).not.toMatch(/^A2 held/m)
  expect(joined).toMatch(/kappa_bench is UNSET/)
  expect(joined).toMatch(/no clustering target was met or missed here/)
  // UNSETTING THE BOUND TOOK THE GRADING AND NOT THE MEASUREMENT.
  expect(joined).toMatch(/kappa = 0\.2, measured and reported rather than graded/)
})

test("A3's third state reaches the report by its own name, never as held", () => {
  // THE WHOLE REASON A3 IS THREE-VALUED. The run below is admissible with tau
  // unset, so A3 was never graded - and a report that printed "A3 held" there
  // would report a target met that nobody set. The outcome line and the
  // condition line say different things on purpose.
  const joined = renderReport(reportInput()).join("\n")
  expect(joined).toMatch(/^outcome: admissible$/m)
  expect(joined).toMatch(/^A3 not-evaluated: /m)
  expect(joined).not.toMatch(/^A3 held/m)
  expect(joined).toMatch(/tau is UNSET/)
  expect(joined).toMatch(/no target was met or missed here/)
  // A run with a tolerance set and inside it says held instead, so the two
  // states are distinguishable in the report and not only in the type.
  expect(renderReport(withinToleranceRun()).join("\n")).toMatch(/^A3 held: /m)
})

test("V10: an under-budgeted run reports budget-exhausted and claims nothing", () => {
  const lines = renderReport(underBudgetedRun())
  const joined = lines.join("\n")
  expect(joined).toMatch(/budget-exhausted/)
  expect(joined).toMatch(/where the search stopped/)
  expect(qualityClaims(lines).join("\n")).not.toMatch(
    /optimal|minimal|lowest possible|cannot be improved/i,
  )
  // THE ONE LINE IN THE WHOLE REPORT THAT MAY CARRY THE WORD, and it is
  // `floorNote`'s verbatim caveat rather than a claim about this run: an
  // at-floor stop would be optimal against THIS strip count and says nothing
  // about another. Pinned to the exact line, so a new optimality word anywhere
  // else in a report fails this test.
  expect(lines.filter((line) => /optimal|minimal|lowest possible/i.test(line))).toEqual([
    `floor: ${floorNote(TARGETS)}`,
  ])
})

test("V12: a run failing only A2 reports valid, below target and not a malfunction", () => {
  const joined = renderReport(a2OnlyFailure()).join("\n")
  expect(joined).toMatch(/valid, below target/)
  expect(joined).not.toMatch(/malfunction|broken|bug/i)
  expect(joined).not.toMatch(/kappa_bench should|relax the bound|loosen/i)
  // K2 predicts this as the expected early outcome, and K3 refuses to move the
  // bound on a search that stopped - so the report says the ratchet may not.
  expect(joined).toMatch(/K3's ratchet may not move kappa_bench/)
})

test("V12: a run failing A1 reports invalid and does not produce the A2 wording", () => {
  const joined = renderReport(a1Failure()).join("\n")
  expect(joined).toMatch(/invalid/)
  expect(joined).not.toMatch(/valid, below target/)
  expect(joined).toMatch(/HC4/)
})

test("REP3: every rendered quality sentence comes from a table entry, verbatim", () => {
  // A phrasing table keyed by the field means an exhausted run cannot be
  // described as optimal by an author who was feeling good about the number.
  // Rendering every combination is what establishes it: a report that indexed
  // both tables and then wrote one sentence of its own would pass a source
  // scan and fail here.
  const entries = new Set([...Object.values(WORDING), ...Object.values(OUTCOME_WORDING)])
  for (const bound of BOUND_STATUSES) {
    for (const outcome of OUTCOMES) {
      const claims = qualityClaims(renderReport(runWith({ bound, outcome })))
      expect(claims.length, `${bound}/${outcome} rendered no quality line`).toBeGreaterThan(0)
      for (const claim of claims) {
        expect(
          entries.has(claim),
          `${bound}/${outcome}: "${claim}" is not a WORDING or OUTCOME_WORDING entry`,
        ).toBe(true)
      }
    }
  }
})

test("REP3: the claims rendered are the ones the bound and the outcome select", () => {
  // The loop above proves every claim is SOME entry; this proves it is the
  // RIGHT one, which a set membership check cannot see.
  for (const bound of BOUND_STATUSES) {
    for (const outcome of OUTCOMES) {
      expect(qualityClaims(renderReport(runWith({ bound, outcome }))), `${bound}/${outcome}`)
        .toEqual([OUTCOME_WORDING[outcome], WORDING[bound]])
    }
  }
})

test("a proposed default that decided the outcome is reported as proposed (OB3)", () => {
  // tau is not a value the owner set. NOT /proposed/i: tau's own note reads
  // "PIPELINE'S PROPOSED DEFAULT ... IS WITHDRAWN", so a search for "proposed"
  // matches the NEGATION of what it is checking for and passes against text
  // saying the opposite. Measured in Task 10's review. Anchor on the claim.
  const joined = renderReport(withinToleranceRun()).join("\n")
  expect(joined).toMatch(/not (the owner's|settled)/i)
  expect(joined).toMatch(/^parameter: tau = 0\.05 decided this stop \(Q2\)/m)
  // And the provenance comes out of the committed note rather than being
  // restated here, so a note that changes changes the report.
  expect(joined).toMatch(/\[owner\] 2026-10-10, CRITERIA K4\./)
})

test("a list-valued parameter prints as a list a person reads", () => {
  // `String` on an array renders 0,1,2,3,4 - a machine's spelling in a line
  // meant for a person. seeds is the one list in the table.
  expect(renderReport(reportInput({ rule: "Q3" })).join("\n")).toMatch(
    /^parameter: seeds = 0, 1, 2, 3, 4 decided this stop \(Q3\)/m,
  )
})

test("a stop no rules parameter decided says that, rather than naming one anyway", () => {
  // Q1 turns on C_floor, which is derived and may come from a board's own
  // declaration rather than from stockRows - so naming a parameter there would
  // name the wrong number on the boards that declare one.
  const joined = renderReport(reportInput({ rule: "Q1" })).join("\n")
  expect(joined).toMatch(/^parameter: no stripboard\/rules\.json parameter decided this stop/m)
  expect(joined).toMatch(/floor's own provisionality/)
})

test("E3 not running is stated in the report, and so is its running", () => {
  expect(renderReport(runWithoutWorseAcceptance()).join("\n")).toMatch(/worse-acceptance|E3/)
  expect(renderReport(runWithoutWorseAcceptance()).join("\n")).toMatch(
    /^E3: worse-acceptance DID NOT RUN/m,
  )
  const ran = renderReport(runWithWorseAcceptance()).join("\n")
  expect(ran).toMatch(/^E3: worse-acceptance was IN EFFECT with a bound of 1/m)
  // It reports the MECHANISM and not a firing, which is what RunResult's own
  // field means.
  expect(ran).toMatch(/not a firing/)
})

test("the floor is never printed without the owner's provisionality caveat", () => {
  // floorNote is stop-model.ts's, written beside Q1 so the two cannot drift,
  // and it quotes the owner verbatim. C_floor = max(0, N - R) takes R from
  // today's stock, so a floor printed bare is a provisional figure printed as a
  // fact. Every report prints a floor, so every report prints the note.
  for (const input of [reportInput(), underBudgetedRun(), a1Failure(), withinToleranceRun()]) {
    const lines = renderReport(input)
    expect(lines).toContain(`floor: ${floorNote(input.targets)}`)
    const cost = lines.filter((line) => line.startsWith("cost: "))
    expect(cost.length).toBe(1)
  }
  // The caveat is the owner's words and not a paraphrase of them.
  expect(floorNote(TARGETS)).toMatch(/The dimensions are ALWAYS provisional/)
})

test("the report's exit line carries REP5's own exit code for each outcome", () => {
  // THE EXPECTED CODES ARE WRITTEN OUT rather than read back from
  // exitCodeFor: a report line compared against the same function that
  // produced it agrees however wrong both are. REP5's exit column is the
  // source - non-zero for invalid, non-zero for valid-below-target (G2.5
  // refuses it), zero for admissible - and this test also pins the exported
  // function to those three, so a stop cannot become a pass in either place.
  const expected: Readonly<Record<Outcome, 0 | 1>> = {
    invalid: 1,
    "valid-below-target": 1,
    admissible: 0,
  }
  for (const outcome of OUTCOMES) {
    const joined = renderReport(runWith({ bound: "search-exhausted", outcome })).join("\n")
    expect(joined, outcome).toMatch(new RegExp(`^exit: ${expected[outcome]}$`, "m"))
    expect(exitCodeFor(outcome, "Q3"), outcome).toBe(expected[outcome])
  }
})

test("a Q5 run exits non-zero although its candidate is admissible, and says why", () => {
  // THE CASE WHERE A STOP WOULD OTHERWISE READ AS A PASS. CRITERIA states twice
  // that a run stopping on Q5 is reported as a failure rather than as a result,
  // and the candidate here earns admissible on its own merits - so the two
  // facts are reported separately: the outcome is about the CANDIDATE and the
  // exit code is about the RUN.
  const lines = renderReport(underBudgetedRun())
  const joined = lines.join("\n")
  expect(joined).toMatch(/^outcome: admissible$/m)
  expect(joined).toMatch(/^bound: budget-exhausted/m)
  expect(joined).toMatch(/^exit: 1 - /m)
  expect(joined).toMatch(/the RUN is reported as a failure although the candidate is not/)
  expect(joined).toMatch(/CRITERIA states twice/)
  // The reason is the fixed note rather than a sentence assembled here, and it
  // is NOT a quality claim: it says nothing about the layout's cost.
  expect(lines).toContain(`exit: 1 - ${RUN_FAILURE_NOTE}`)
  expect(qualityClaims(lines)).not.toContain(RUN_FAILURE_NOTE)
  // Q4 SHARES THE budget-exhausted BOUND AND EXITS ZERO on the same candidate,
  // so this is Q5's own clause rather than a severity applied to every weak
  // bound.
  const q4 = renderReport(reportInput({ rule: "Q4" })).join("\n")
  expect(q4).toMatch(/^bound: budget-exhausted/m)
  expect(q4).toMatch(/^exit: 0$/m)
})

test("the report grades the run's own best candidate rather than being told a verdict", () => {
  // ReportInput carries no AdmissibilityResult and no bound: the verdict is
  // computed from run.best and the bound derived from the fired rule, so a
  // report cannot name a candidate its verdict was not about. Spoiling the
  // candidate alone moves the outcome.
  expect(renderReport(reportInput()).join("\n")).toMatch(/^outcome: admissible$/m)
  expect(renderReport(a1Failure()).join("\n")).toMatch(/^outcome: invalid$/m)
  expect(renderReport(a2OnlyFailure()).join("\n")).toMatch(/^outcome: valid-below-target$/m)
})

test("the open-net count the acceptance rule orders by appears in the report", () => {
  // IT DID NOT, AND THAT WAS THE GAP. Route 1 made `Evaluation.openNets` the
  // acceptance ordering's FIRST KEY, so it decided every acceptance in a run -
  // and no line of this report carried it. A reader could see `F` fall and `A1`
  // fail with nothing saying how far from conducting the board was.
  //
  // THE EXPECTED COUNTS ARE THE FIXTURES' OWN, written out rather than read back
  // off the same field the line prints. `./stop-fixtures.ts`'s builder sets
  // openNets to one where the caller broke `HC1` and to zero where every result
  // holds, so `reportInput()` is zero and `a1Failure()` is one.
  const healthy = renderReport(reportInput()).join("\n")
  expect(healthy).toMatch(/^completeness: 0 net\(s\) still open, /m)
  // AND A CANDIDATE WITH HC1 BROKEN REPORTS THE COUNT, NOT THE BOOLEAN. It is
  // built here rather than taken from `a1Failure()`, whose fixture breaks HC4:
  // openNets is a reading of HC1 alone, so a candidate failing a different
  // constraint legitimately carries zero and would have proved nothing.
  const incomplete = reportInput({
    run: runResult({
      best: evaluation(
        { cuts: 1 },
        CONSTRAINT_IDS.map((id) =>
          id === "HC1" ? broken(id, "fixture: one net is incomplete") : holds(id, "fixture: held"),
        ),
      ),
    }),
    rule: "Q3",
  })
  const rendered = renderReport(incomplete)
  expect(rendered.join("\n")).toMatch(/^completeness: 1 net\(s\) still open, /m)
  // AND IT CARRIES NO ADJECTIVE: every quality claim in this report comes from
  // WORDING or OUTCOME_WORDING under the quality prefix, and a completeness line
  // calling a board nearly finished would be this module writing one of its own.
  const line = rendered.find((text) => text.startsWith("completeness: "))
  expect(line?.startsWith(QUALITY_PREFIX)).toBe(false)
  expect(line).toContain("the count --check reports as incomplete")
})

test("the report names the board and the candidate file it is about", () => {
  const joined = renderReport(reportInput()).join("\n")
  expect(joined).toMatch(/^board: stop-fixture, candidate stop-fixture\.vrt$/m)
  expect(joined).toMatch(/^run: 2 climb\(s\), 200 evaluation\(s\) spent, restarts at/m)
})

test("both cut counts reach the report, and a disagreement between them is stated", () => {
  // THE HALF OF THE OWNER'S "OPTION C" THAT OUTLIVED THE SCORER: *"Both. Score
  // on real cuts so the search can act, keep VeroRoute's number in the report
  // so you always see both. If they ever disagree badly, you'd spot it."* The
  // scoring half was withdrawn after measuring inert (tools/stripboard/
  // score.ts); this line is what is left, and it is what tells him a candidate
  // is priced for cuts its copper does not need. So the assertion is not that
  // the two numbers appear somewhere - a reader who has to subtract one from the
  // other to notice a divergence cannot spot it - but that the line NAMES the
  // disagreement and its size.
  //
  // THE FIGURES ARE THE FIXTURE'S OWN, 7 and 5, and the 2 is written out here
  // rather than computed from them: `expect(line).toContain(`by ${7 - 5}`)`
  // would be this test evaluating the expression the module evaluates.
  const lines = renderReport(divergentCutsRun())
  const cuts = lines.filter((line) => line.startsWith("cuts: "))
  expect(cuts.length).toBe(1)
  const line = cuts[0] ?? ""
  expect(line).toContain("F charges 7 reported CUT line(s)")
  expect(line).toContain("finds 5 of them necessary")
  expect(line).toContain("DISAGREE by 2")
  expect(line).toContain("REDUNDANT")
  // AND THE COST LINE CHARGES THE REPORTED COUNT, so the two lines cannot say
  // different things about which number F is: F = 7 beside C = 7 on a board
  // five of whose seven cuts the drop test could not remove.
  const cost = lines.filter((entry) => entry.startsWith("cost: "))
  expect(cost.length).toBe(1)
  expect(cost[0] ?? "").toContain("F = 7")
  expect(cost[0] ?? "").toContain("C = 7")
  expect(cost[0] ?? "").not.toContain("C_necessary")
})

test("the agreeing case says so in words rather than printing a zero", () => {
  // An undisturbed board is the common case and the only one this pipeline has
  // ever measured - 5 of 5 on the owner's hand-laid low-boost, 38 of 38 on the
  // import-placed start, zero disagreements over 2,267 scored candidates - and
  // "DISAGREE by 0" would be a reader's problem to interpret.
  // `./report-fixtures.ts` derives the default input's necessary count from the
  // candidate's own `cuts` for exactly that reason, so this is that case.
  const line = renderReport(reportInput()).filter((entry) => entry.startsWith("cuts: "))[0] ?? ""
  expect(line).toContain("F charges 1 reported CUT line(s)")
  expect(line).toContain("finds 1 of them necessary")
  expect(line).toContain("AGREE")
  expect(line).not.toContain("DISAGREE")
  expect(line).not.toContain("REDUNDANT")
})

test("a necessary count above the reported one is refused rather than described", () => {
  // THE GUARD THAT TOOK OVER FROM THE SCORER'S OWN CROSS-CHECK. While `F`
  // charged the necessary count, `scoreDump` held the classifier's reading of
  // VeroRoute's number against the dump's and refused a mismatch
  // (`score-necessity-count-disagreement`), because both ran on one candidate.
  // The report is now where the two figures meet, and the subset relation is
  // the one thing checkable there: the necessary cuts are a subset of the
  // reported ones, so the impossible order means the two are about different
  // boards. The fixture's candidate reports one cut, so two necessary of one
  // reported is that condition.
  expect(() => renderReport(reportInput({ necessaryCuts: 2 })))
    .toThrow(/^necessity-count-exceeds-reported:/)
  expect(() => renderReport(reportInput({ necessaryCuts: 2 }))).toThrow(/2 necessary cut\(s\)/)
  expect(() => renderReport(reportInput({ necessaryCuts: 2 }))).toThrow(/1 reported CUT line\(s\)/)
  expect(() => renderReport(reportInput({ necessaryCuts: 2 }))).toThrow(/place\.ts/)
})
