/**
 * Tests for `tools/cli/perfboard-stripboard-verbs.ts`: the `place` verb as it
 * is dispatched from `runCli`.
 *
 * **EVERY TEST HERE INJECTS, so none of them spawns the fork or runs a
 * search.** What the real run does is `tests/stripboard/benchmark.test.ts`'s
 * and `tests/stripboard/checkpoint-2.test.ts`'s; what is checked here is the
 * verb: which flags it accepts, what it refuses, where its exit code comes
 * from, and that a refusal from the chain is printed whole rather than
 * swallowed.
 *
 * `--seed-arm` IS THE ONE THAT MATTERS. There is no default arm, and a verb
 * that picked the control would make Task 16's comparison a choice nobody
 * named.
 */
import { test, expect } from "bun:test"
import { runCli } from "../../tools/cli/perfboard.ts"
import type { PlaceRun, SeedSweep } from "../../tools/stripboard/place.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { LOW_BOOST } from "../stripboard/stop-fixtures.ts"
import { BOUNDED_RULES, clusteredCandidate, runResult } from "../stripboard/report-fixtures.ts"

/**
 * A `PlaceRun` built from the report fixtures' own run, so the verb is driven
 * over a candidate whose score, results and ranking are a whole `Evaluation`
 * rather than a shape cast into place.
 */
function placeRun(overrides: Partial<PlaceRun> = {}): PlaceRun {
  const search = runResult()
  return {
    search,
    best: search.best,
    rule: "Q3",
    targets: LOW_BOOST,
    rules: loadRules(),
    frozen: false,
    // The fixture candidate's one cut is its own necessary count: these tests
    // drive the verb's exit codes and output, and never the `cuts:` line.
    necessaryCuts: search.best.score.cuts,
    runDir: "/tmp/place-verb-test",
    manifest: {
      canonical: {
        inputs: {
          candidateSha256: "a".repeat(64),
          rulesSha256: "b".repeat(64),
          netlistSha256: "c".repeat(64),
          spanClosureSha256: "d".repeat(64),
          pinPatternClosureSha256: "e".repeat(64),
          seeds: [0],
          seed: 0,
          seedArm: "import",
          verorouteCommit: "f".repeat(40),
          builtCommit: "9".repeat(40),
          pipelineCommit: "8".repeat(40),
        },
        metrics: {
          cuts: 1,
          wires: 0,
          solder: 0,
          objective: 1,
          netCount: 2,
          joins: 0,
          occupied: 1,
          clustering: 0,
          occupiedArea: 1,
          constraints: {},
          ranking: [1, 0, 0, 1, 0],
          stoppingRule: "Q3",
          bound: "search-exhausted",
          outcome: "valid-below-target",
          restartBoundaries: [],
        },
        hash: "0".repeat(64),
      },
      provenance: {
        stamp: "stamp",
        startedAt: "2026-10-13T00:00:00.000Z",
        durationMs: 1,
        host: "test",
        msPerInvocation: 1,
        invocations: 1,
        evaluations: 1,
      },
    },
    outcome: "valid-below-target",
    metClause: false,
    ...overrides,
  }
}

test("place refuses with no --seed-arm, lists the three, and runs nothing", async () => {
  // THE REFUSAL THAT MATTERS. A verb that chose an arm would make the arm
  // comparison a choice nobody named, so this checks both halves: the wording
  // names the three, and the injected run was never called.
  const errors: string[] = []
  let called = 0
  const code = await runCli(["place"], {
    cwd: "/tmp",
    log: () => {},
    error: (line) => errors.push(line),
    placeDeps: {
      place: async () => {
        called += 1
        return placeRun()
      },
      loadRules,
    },
  })
  expect(code).toBe(1)
  expect(called, "nothing ran").toBe(0)
  const joined = errors.join("\n")
  expect(joined).toContain("--seed-arm")
  expect(joined).toContain("NO DEFAULT ARM")
  for (const arm of ["constructed", "import", "random"]) expect(joined).toContain(arm)
})

test("place refuses an arm that is not one of the three, by name", async () => {
  const errors: string[] = []
  const code = await runCli(["place", "--seed-arm", "clever"], {
    cwd: "/tmp",
    log: () => {},
    error: (line) => errors.push(line),
    placeDeps: { place: async () => placeRun(), loadRules },
  })
  expect(code).toBe(1)
  expect(errors.join("\n")).toContain("parseSeedArm")
})

test("place refuses --frozen without --netlist, and an unknown flag", async () => {
  for (const args of [["place", "--seed-arm", "import", "--frozen", "x.vrt"], ["place", "--seed-arm", "import", "--nonsense"]]) {
    const errors: string[] = []
    const code = await runCli(args, {
      cwd: "/tmp",
      log: () => {},
      error: (line) => errors.push(line),
      placeDeps: { place: async () => placeRun(), loadRules },
    })
    expect(code, args.join(" ")).toBe(1)
    expect(errors.join("\n"), args.join(" ")).not.toBe("")
  }
})

test("place prints the report and takes its exit code from the verdict it printed", async () => {
  // A CANDIDATE THAT FAILS A2 AND NOTHING ELSE: valid-below-target, exit 1 -
  // from the table and not from a comparison with "admissible".
  //
  // THE OUTCOME COMES FROM THE VERDICT THE REPORT PRINTED, which is what this
  // test found: an earlier draft of the verb took the exit code from
  // `PlaceRun.outcome` while the report recomputed the verdict from the
  // candidate, so a run whose recorded field disagreed with its own candidate
  // printed one outcome and exited on another. The fixture here carries that
  // disagreement deliberately - `outcome` says valid-below-target and the
  // candidate is clustered, which grades to the same thing - and the assertions
  // hold the printed line and the code together.
  //
  // THE BOUND IS THE FIXTURE'S. The committed `kappa_bench` is unset on the
  // owner's ruling of 2026-10-16, so A2 does not fire there and no candidate
  // can reach `valid-below-target` through it - and this test is about where
  // the exit code comes from, not about what the committed bound is. So the run
  // and the verb's own `loadRules` both carry `BOUNDED_RULES`: a bound in only
  // one of them would be the very disagreement the verb was fixed to prevent.
  const search = { ...runResult(), best: clusteredCandidate() }
  const lines: string[] = []
  const code = await runCli(["place", "--seed-arm", "import"], {
    cwd: "/tmp",
    log: (line) => lines.push(line),
    error: () => {},
    placeDeps: {
      place: async () =>
        placeRun({ search, best: search.best, rule: "Q3", rules: BOUNDED_RULES }),
      loadRules: () => BOUNDED_RULES,
    },
  })
  expect(code).toBe(1)
  const joined = lines.join("\n")
  expect(joined).toMatch(/^outcome: valid-below-target$/m)
  expect(joined).toMatch(/^bound: search-exhausted, from the stopping rule Q3 that fired$/m)
  expect(joined).toContain("run: /tmp/place-verb-test")
})

test("an admissible candidate under a rule that did not fail exits 0", async () => {
  // The other side of the table, so the test above is not asserting a constant.
  // The fixtures' default candidate holds all ten constraints and kappa = 0.
  const lines: string[] = []
  const code = await runCli(["place", "--seed-arm", "random"], {
    cwd: "/tmp",
    log: (line) => lines.push(line),
    error: () => {},
    placeDeps: { place: async () => placeRun({ outcome: "admissible" }), loadRules },
  })
  expect(code).toBe(0)
  expect(lines.join("\n")).toMatch(/^outcome: admissible$/m)
})

test("--sweep runs the sweep and the report carries the per-seed diagnostic", async () => {
  const lines: string[] = []
  let sweeps = 0
  const first = placeRun()
  const sweep: SeedSweep = {
    perSeed: [
      { seed: 0, cuts: 1, wires: 0, bound: "search-exhausted", outcome: "valid-below-target" },
      { seed: 1, cuts: 2, wires: 0, bound: "search-exhausted", outcome: "invalid" },
    ],
    reached: 1,
    singleRunVerdict: first.outcome,
    reportedOutcome: first.outcome,
    first,
  }
  const code = await runCli(["place", "--seed-arm", "import", "--sweep"], {
    cwd: "/tmp",
    log: (line) => lines.push(line),
    error: () => {},
    placeDeps: {
      place: async () => {
        throw new Error("the sweep must not call the single-run path")
      },
      placeAcrossSeeds: async () => {
        sweeps += 1
        return sweep
      },
      loadRules,
    },
  })
  // EXIT 0, BECAUSE THE FIRST SEED'S CANDIDATE IS ADMISSIBLE AND `Q3` IS NOT A
  // RUN FAILURE - and one of the two seeds being `invalid` did not change it,
  // which is the point: the exit code is the judged run's, not the sweep's.
  expect(code).toBe(0)
  expect(sweeps).toBe(1)
  const joined = lines.join("\n")
  expect(joined).toMatch(/^seed set: 1 of 2 /m)
  expect(joined).toMatch(/DIAGNOSTIC/)
  expect(joined).toMatch(/^seed 1: C = 2, W = 0, bound = search-exhausted, outcome = invalid$/m)
  // The verdict is still the first run's, and the first run's candidate is
  // admissible - so a rate of one in two changed nothing about it.
  expect(joined).toMatch(/^outcome: admissible$/m)
})

test("a refusal from the chain is printed whole and exits 1", async () => {
  // Every throw in this pipeline names what is missing, where to fix it and why
  // it is not defaulted; a verb that printed one line of that would hide the
  // fix. The message here is multi-line on purpose.
  const errors: string[] = []
  const code = await runCli(["place", "--seed-arm", "import"], {
    cwd: "/tmp",
    log: () => {},
    error: (line) => errors.push(line),
    placeDeps: {
      place: async () => {
        throw new Error("place-target-unstated: first line.\nsecond line.\nthird line.")
      },
      loadRules,
    },
  })
  expect(code).toBe(1)
  const joined = errors.join("\n")
  expect(joined).toContain("place-target-unstated")
  expect(joined).toContain("second line")
  expect(joined).toContain("third line")
})
