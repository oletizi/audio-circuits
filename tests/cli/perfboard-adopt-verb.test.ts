/**
 * Tests for `tools/cli/perfboard-stripboard-verbs.ts`: the `adopt` verb as it
 * is dispatched from `runCli`.
 *
 * **EVERY TEST HERE INJECTS `adoptDeps`, so none of them spawns git or `make`,
 * reads the real `veroroute.pin` or the real build stamp, or - the one that
 * matters - writes under the repository's own `boards/`.** The board every test
 * acts on is a scratch directory from `tests/stripboard/adopt-fixtures.ts`.
 * What the gate itself refuses is `tests/stripboard/adopt.test.ts`'s; what is
 * checked here is the VERB: which flags it accepts, what it refuses, where its
 * exit code comes from, and that a refusal from the gate is printed whole
 * rather than swallowed.
 *
 * `--run` IS THE ONE THAT MATTERS. There is no default run, and a verb that
 * picked the most recent directory would adopt off whatever the clock last
 * named.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { runCli } from "../../tools/cli/perfboard.ts"
import {
  ADOPTED_RELATIVE_PATH,
  healthyAdoption,
  withOutcome,
} from "../stripboard/adopt-fixtures.ts"
import { boardsDigest } from "../stripboard/run-dir-fixtures.ts"

const BOARDS_BEFORE = boardsDigest()

test("adopt refuses with no --run, says why there is no default, and writes nothing", async () => {
  const scenario = healthyAdoption("verb-no-run")
  const errors: string[] = []
  const code = await runCli(["adopt"], {
    cwd: scenario.input.boardDir,
    log: () => {},
    error: (line) => errors.push(line),
    adoptDeps: scenario.deps,
  })
  expect(code).toBe(1)
  expect(fs.existsSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH)), "nothing was adopted").toBe(
    false,
  )
  const joined = errors.join("\n")
  expect(joined).toContain("--run")
  expect(joined).toContain("NO DEFAULT RUN")
})

test("adopt refuses an unknown flag and a flag with no value", async () => {
  const scenario = healthyAdoption("verb-flags")
  for (const args of [
    ["adopt", "--run", scenario.input.runDir, "--nonsense"],
    ["adopt", "--run"],
    ["adopt", "--run", "--allow-dirty"],
  ]) {
    const errors: string[] = []
    const code = await runCli(args, {
      cwd: scenario.input.boardDir,
      log: () => {},
      error: (line) => errors.push(line),
      adoptDeps: scenario.deps,
    })
    expect(code, args.join(" ")).toBe(1)
    expect(errors.join("\n"), args.join(" ")).not.toBe("")
  }
  // AND NOTHING WAS ADOPTED BY ANY OF THE THREE. A flag parser that refused and
  // then fell through would pass every assertion above.
  expect(fs.existsSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH))).toBe(false)
})

test("adopt refuses a --run that is not there, naming both the typed and the resolved path", async () => {
  // MEASURED ON THE FIRST REAL RUN, against a real run directory: a relative
  // --run was resolved against the BOARD directory, so
  // "build/stripboard/<board>/<stamp>" became
  // "boards/<board>/build/stripboard/<board>/<stamp>" and the gate refused with
  // `candidate-hash: ... run.json did not read back: ENOENT` - a refusal about a
  // candidate for what was a path mistake, printing only the resolved path so
  // the difference from the typed one was invisible. Both halves are asserted:
  // the two paths, and that it is NOT reported as one of the gate's refusals.
  const scenario = healthyAdoption("verb-missing-run")
  const errors: string[] = []
  const code = await runCli(["adopt", "--run", "build/stripboard/nowhere/never"], {
    cwd: scenario.input.boardDir,
    log: () => {},
    error: (line) => errors.push(line),
    adoptDeps: scenario.deps,
  })
  expect(code).toBe(1)
  const joined = errors.join("\n")
  expect(joined, "the path as typed").toContain('"build/stripboard/nowhere/never"')
  expect(joined, "and where it resolved to").toContain("REPOSITORY ROOT")
  expect(joined, "and it is not a candidate-hash refusal").not.toContain("candidate-hash")
})

test("adopt finds the candidate by its recorded hash when --candidate is omitted", async () => {
  // THE FRICTION THIS REMOVES IS REAL: `place` prints the run DIRECTORY, and a
  // run holds one .vrt per gesture and per climb, so a required --candidate
  // would leave the operator hashing files by hand. run.json already says which
  // bytes the candidate is.
  const scenario = healthyAdoption("verb-happy")
  const lines: string[] = []
  const errors: string[] = []
  const code = await runCli(["adopt", "--run", scenario.input.runDir], {
    cwd: scenario.input.boardDir,
    log: (line) => lines.push(line),
    error: (line) => errors.push(line),
    adoptDeps: scenario.deps,
  })
  expect(errors.join("\n")).toBe("")
  expect(code).toBe(0)
  expect(lines.join("\n")).toContain(scenario.input.candidate)
  expect(fs.readFileSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH))).toEqual(
    fs.readFileSync(scenario.input.candidate),
  )
})

test("adopt takes an explicit --candidate", async () => {
  const scenario = healthyAdoption("verb-explicit")
  const code = await runCli(
    ["adopt", "--run", scenario.input.runDir, "--candidate", scenario.input.candidate],
    {
      cwd: scenario.input.boardDir,
      log: () => {},
      error: () => {},
      adoptDeps: scenario.deps,
    },
  )
  expect(code).toBe(0)
  expect(fs.existsSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH))).toBe(true)
})

test("adopt prints a refusal whole, exits 1, and adopts nothing", async () => {
  // The refusals are the gate's and are tested there; what is asserted here is
  // that the verb does not summarise one. The last line of every refusal names
  // CRITERIA and the module, so a verb printing only the first line would fail
  // the second assertion.
  const scenario = withOutcome("valid-below-target")
  const errors: string[] = []
  const code = await runCli(["adopt", "--run", scenario.input.runDir], {
    cwd: scenario.input.boardDir,
    log: () => {},
    error: (line) => errors.push(line),
    adoptDeps: scenario.deps,
  })
  expect(code).toBe(1)
  const joined = errors.join("\n")
  expect(joined).toContain("FAIL adopt in")
  expect(joined).toContain("failing-check")
  expect(joined, "the refusal is printed whole").toContain("tools/stripboard/adopt.ts")
  expect(fs.existsSync(path.join(scenario.root, ADOPTED_RELATIVE_PATH))).toBe(false)
})

test("adopt is listed in the usage, with its two flags and its exit code", async () => {
  const lines: string[] = []
  const code = await runCli(["--help"], { cwd: "/tmp", log: (line) => lines.push(line), error: () => {} })
  expect(code).toBe(0)
  const usage = lines.join("\n")
  for (const expected of ["adopt", "--run <dir>", "--candidate <vrt>", "ten refusals"]) {
    expect(usage, expected).toContain(expected)
  }
})

test("this whole file left the repository's own boards/ byte-identical", () => {
  expect(boardsDigest()).toBe(BOARDS_BEFORE)
})
