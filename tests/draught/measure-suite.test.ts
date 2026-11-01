// tests/draught/measure-suite.test.ts
//
// Task 4 of .superpowers/sdd/2026-10-30-institutionalise-draughting: the
// measurement scripts that used to be copied forward from run directory to
// run directory now have one home, draughting/measure/. This test drives
// that home's own positive-control suite rather than re-asserting any of its
// individual numbers - selftest.py is itself the thing that proves the
// shared KiCad-sheet reader works, by perturbing real committed sheets and
// checking the count moves. See docs/research/2026-10-30-lying-checks.md for
// why a script that cannot fail is the defect class this exists to prevent.
import { expect, test } from "bun:test"
import { execFileSync } from "node:child_process"

test("the measurement suite's own selftest reports every control moved or fired", () => {
  const out = execFileSync("python3", ["draughting/measure/selftest.py"], { encoding: "utf8" })
  expect(out).toContain("every one moved or fired")
  expect(out).toMatch(/\d+ controls/)
})
