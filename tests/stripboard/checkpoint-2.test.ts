/**
 * CHECKPOINT 2, as a standing test: the chain end to end on one board.
 *
 * **IT IS TASK 20'S CHECKPOINT AND IT RAN IN TASK 23, BY CONTROLLER RULING AND
 * FOR A DEPENDENCY REASON.** Its own instruction is *"run `place` against one
 * Pultec board"*, and `place` did not exist until Task 23 - so Task 20 recorded
 * it as deferred rather than running something else and calling it the
 * checkpoint. What it is for: *"a chain that is correct in every link and wrong
 * when joined - a `StoppingRule` that never fires in a real run, a `bound` that
 * reports a rule the search did not reach, an `outcome` that disagrees with the
 * verdict its own grader produced."*
 *
 * **IT IS ITS OWN FILE, IT SPAWNS THE REAL FORK AND IT IS NEVER SKIPPED**, both
 * because the plan says so and because a skipped integration check looks exactly
 * like a passing one. The cap is reduced through the injected rules - the plan's
 * own remedy - and what a reduced cap changes is what the search FINDS, not
 * whether the chain runs.
 *
 * **THE RECORD OF THE READ RUN IS `docs/stripboard/pipeline-verification.md`
 * section 8.2**, with the full report, the three findings and the one figure
 * that is provisional. This file holds what can fail on every run.
 */
import { expect, test } from "bun:test"
import { place, reportInputOf } from "../../tools/stripboard/place.ts"
import { renderReport } from "../../tools/stripboard/report.ts"
import { STOPPING_RULES } from "../../tools/stripboard/stop.ts"
import { readManifest } from "../../tools/stripboard/run-dir.ts"
import { LOW_BOOST_BOARD, reducedRules } from "./benchmark-fixtures.ts"

const SLOW = 600_000

test(
  "CHECKPOINT 2: the chain runs, and the bound, the outcome and the verdict agree",
  async () => {
    // ONE RUN, THREE CONDITIONS, each of which is a wiring defect the per-link
    // tests cannot see. Measured at this cap on 2026-10-13: outcome `invalid`
    // (A1 fails on HC1, HC6, HC8 and HC10), bound `budget-exhausted` from Q5,
    // exit 1. Section 8.2 has the whole report.
    const run = await place({ board: LOW_BOOST_BOARD, rules: reducedRules(64), arm: "import" })
    const lines = renderReport(reportInputOf(run))
    const report = lines.join("\n")

    // 1. THE CHAIN DID NOT THROW - which is the `await` above having returned.
    //    Stated as an assertion anyway, over the thing a thrown chain could not
    //    have produced.
    expect(run.manifest.canonical.hash).not.toBe("")

    // 2. NO `admissible` OUTCOME WHILE A CONSTRAINT FAILS. The condition is
    //    written as the implication rather than as the measured outcome, so it
    //    keeps its teeth on a future run that grades better: a run with every
    //    constraint holding is free to be admissible here.
    const failing = run.best.results.filter((result) => !result.held).map((result) => result.id)
    if (failing.length > 0) {
      expect(run.outcome, `${failing.join(", ")} do not hold`).not.toBe("admissible")
    }

    // 3. THE BOUND NAMES THE RULE THAT FIRED. `place` refuses a run where
    //    `evaluateStop` returned null, so the rule here is one the stop
    //    actually returned; what this holds is that the report and the manifest
    //    carry THAT rule and not another.
    expect(STOPPING_RULES).toContain(run.rule)
    expect(run.manifest.canonical.metrics.stoppingRule).toBe(run.rule)
    expect(report).toMatch(new RegExp(`^bound: [a-z-]+, from the stopping rule ${run.rule} `, "m"))

    // AND THE MANIFEST IS ON DISK, both blocks, readable back. `writeManifest`
    // refuses a manifest whose recorded hash disagrees with its own inputs, so
    // reading it back is reading a hash that was checked at the write.
    const written = readManifest(run.runDir)
    expect(written.canonical.hash).toBe(run.manifest.canonical.hash)
    expect(written.provenance.evaluations).toBeGreaterThan(0)

    // 4. `msPerInvocation` IS A MEASUREMENT AND ITS DIVISOR IS IN THE RECORD.
    //    It was durationMs / (evaluations * 4) - a prediction from the
    //    four-per-evaluation cost model, under a name that reads as a
    //    measurement - and the divisor was wrong four ways: `evaluations`
    //    excludes unscoreable candidates, climb.ts's fifth invocation fires for
    //    every candidate once the base board carries a wire, the start
    //    evaluation is three, and the import, the arm gestures and the final
    //    --dump-board are uncounted. This holds the two properties a counted
    //    figure has and the predicted one did not: invocations STRICTLY EXCEEDS
    //    four per evaluation on this run (the import and the arm gestures alone
    //    put it over), and the recorded rate is exactly durationMs over it.
    const { invocations, evaluations, durationMs, msPerInvocation } = written.provenance
    expect(invocations).toBeGreaterThan(evaluations * 4)
    expect(msPerInvocation).toBe(durationMs / invocations)
  },
  SLOW,
)

test(
  "Q6 cannot fire in a real run, and this is the guard on the day that changes",
  async () => {
    // THE CHECKPOINT'S OWN FIRST DEFECT - *"a StoppingRule that never fires in
    // a real run"* - found, and left standing rather than patched: `Q6`'s
    // signature is specified over a dump per evaluation, and `ClimbResult`
    // keeps none, so `tools/stripboard/place.ts` builds an empty signature list
    // and `Q6` is false on every run it makes. Approximating it from the
    // failing-constraint ids would be a different signature than the one Q6 is
    // stated over.
    //
    // WHAT THIS TEST IS FOR: the day a climb starts recording signatures, this
    // fails - and the fix is to carry them into `stopStateOf` rather than to
    // delete the assertion. It is asserted over the shape of the climb's own
    // result, which is where the data would have to appear.
    const run = await place({ board: LOW_BOOST_BOARD, rules: reducedRules(8), arm: "import" })
    const climb = run.search.climbs[0]
    expect(climb, "a run reports at least one climb").toBeDefined()
    expect(Object.keys(climb!), "ClimbResult carries no signature list").not.toContain("signatures")
    expect(run.rule).not.toBe("Q6")
  },
  SLOW,
)
