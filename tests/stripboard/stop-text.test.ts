/**
 * WHAT THE STOPPING MODULE'S TEXT MUST NOT CONTAIN, and the limits of asking.
 *
 * **SPLIT FROM `./stop.test.ts` FOR THE LINE CEILING**, at the seam that file
 * already had: that one drives the six rules through `evaluateStop`, and this
 * one reads the two source files as TEXT. Every check here is a scan or a
 * measurement over characters, which is a weaker thing than a behavioural test
 * and is named as one in each case - the behavioural half, *every threshold
 * must MOVE when the rules file's value moves*, stays beside the rules it is
 * about.
 */
import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { evaluateStop } from "../../tools/stripboard/stop.ts"
import { bareLiteral } from "./bare-literal.ts"
import { TARGETS, candidate, freshState } from "./stop-fixtures.ts"

const rules = loadRules()
const targets = TARGETS

/** The two halves of the module under test: the rules, and their vocabulary. */
const MODULE_FILES = ["stop.ts", "stop-model.ts"].map((name) =>
  path.join(import.meta.dir, "..", "..", "tools", "stripboard", name),
)

test("Q4's step count and Q6's minimum run length stay independent - a scan", async () => {
  // THEY SHARED ONE CONSTANT AND A Q4 MUTATION BROKE A Q6 REFUSAL. Re-coupling
  // them is invisible behaviourally, because both are two: measured, a build
  // with `run < REQUIRED_STEPS` back in q6 passes every behavioural test here.
  // So this is a SCAN, named as one - it reads the two declarations and the one
  // comparison that regressed, and it would miss a coupling spelled any other
  // way.
  const text = await Bun.file(MODULE_FILES[0] ?? "").text()
  expect(text).toMatch(/\nconst REQUIRED_STEPS = \d+\n/)
  expect(text).toMatch(/\nconst MINIMUM_SIGNATURE_RUN = \d+\n/)
  expect(text).toContain("run < MINIMUM_SIGNATURE_RUN")
  expect(text).not.toContain("run < REQUIRED_STEPS")
  expect(text).not.toMatch(/MINIMUM_SIGNATURE_RUN\s*=\s*REQUIRED_STEPS/)
  expect(text).not.toMatch(/REQUIRED_STEPS\s*=\s*MINIMUM_SIGNATURE_RUN/)
  // And the behavioural half, which holds whatever the spelling: moving Q6's
  // run length to two does not give Q4 a second step.
  const twoClimbs = {
    ...freshState(),
    climbHistory: [10, 10],
    climbEvaluations: [4000, 4000],
    signatures: ["s", "s"],
  }
  expect(evaluateStop(twoClimbs, candidate(), targets, { ...rules, signatureRun: 2 })).toBe("Q6")
})

test("a literal scan finds no bare threshold in stop.ts - a scan, not a proof", async () => {
  // THE NAME THIS REPLACES was "every threshold comes from the rules file and
  // none is written here", over a scan for three specific literals. A scan
  // cannot establish "every": a threshold written 5e-2, or assembled from two
  // small integers, or imported from a module that is not the rules file, all
  // pass it.
  //
  // So this is the cheap per-module version of V9's scan, named as a scan, and
  // it uses V9's OWN REGEX rather than a private list of three numbers - one
  // pattern in one place, so a module cannot be clean here and dirty under V9.
  // The stronger half is behavioural and is the test below it: every threshold
  // this module applies must MOVE when the rules file's value moves.
  // BOTH FILES, because the module was split for the line ceiling and a
  // threshold could be written in either half.
  for (const file of MODULE_FILES) {
    const text = await Bun.file(file).text()
    expect([...text.matchAll(bareLiteral())].map((match) => match[0]), file).toEqual([])
  }
})

test("the scan is not vacuous, and the shared pattern does not carry state", () => {
  // A scan that matched nothing anywhere would pass the test above while
  // looking at nothing, so the pattern is shown to match the two shapes it
  // claims. These are V9's own cases.
  expect([..."const tau = 0.05".matchAll(bareLiteral())].map((match) => match[0])).toEqual([
    "0.05",
  ])
  expect([..."const cap = 2000".matchAll(bareLiteral())].map((match) => match[0])).toEqual([
    "2000",
  ])
})

test("the pattern carries no state, and this test can tell - measured", () => {
  // THE TEST THIS REPLACES scanned the same text twice through the shared
  // instance and asserted both runs agreed. It could not fail: `matchAll`
  // clones, so two matchAll loops never advance each other. Measured: with the
  // accessor returning one cached regex, that test passed 48/0 - a test named
  // for a guard it could not provide, which tells the next reader the ground is
  // covered.
  //
  // What breaks a shared g-regex is `test`/`exec`, which DO advance lastIndex,
  // and `matchAll` then READS it. So this drives the accessor the scans use,
  // through `test`, and asserts the next instance starts at zero and the next
  // scan is whole. Measured: with a cached instance, both of the last three
  // lines fail.
  const text = "a = 0.05\nb = 2000\n"
  const scan = (): readonly string[] => [...text.matchAll(bareLiteral())].map((m) => m[0])
  expect(scan()).toEqual(["0.05", "2000"])
  const used = bareLiteral()
  expect(used.test(text)).toBe(true)
  expect(used.lastIndex).toBeGreaterThan(0)
  expect(bareLiteral().lastIndex).toBe(0)
  expect(scan()).toEqual(["0.05", "2000"])
})

test("the scan's blind spots are the ones its own documentation claims", () => {
  // Written down rather than asserted in prose: each of these IS missed, so the
  // scan is never read as a proof. Measured here, not reasoned about.
  for (const missed of ["const tau = 5e-2", "const run = 3", "const cap = 2 * 1000"]) {
    expect([...missed.matchAll(bareLiteral())].map((match) => match[0]), missed).toEqual([])
  }
})

test("both halves of the module are within this repository's line ceiling", async () => {
  for (const file of MODULE_FILES) {
    const text = await fs.promises.readFile(file, "utf8")
    expect(text.split("\n").length, file).toBeLessThan(501)
  }
})
